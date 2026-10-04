function scoreSubmissions(submissions) {
  const scores = Object.fromEntries(
    COCKTAILS.map((cocktail) => [
      cocktail.id,
      { id: cocktail.id, name: cocktailDisplayName(cocktail), image: cocktail.image || "", points: 0, votes: 0 },
    ])
  );

  submissions.forEach((submission) => {
    Object.entries(submission.rankings || {}).forEach(([cocktailId, tier]) => {
      if (!scores[cocktailId] || !TIER_POINTS[tier]) return;
      scores[cocktailId].points += TIER_POINTS[tier];
      scores[cocktailId].votes += 1;
    });
  });

  return Object.values(scores)
    .map((item) => ({
      ...item,
      average: item.votes ? item.points / item.votes : 0,
    }))
    .sort((a, b) => b.average - a.average || b.votes - a.votes);
}

function averageToTier(average) {
  if (average >= 4.5) return "S";
  if (average >= 3.5) return "A";
  if (average >= 2.5) return "B";
  if (average >= 1.5) return "C";
  return "D";
}

function renderCollectiveTierBoard(ranked) {
  const voted = ranked.filter((item) => item.votes > 0);
  const rows = TIERS.map((tier) => {
    const items = voted.filter((item) => averageToTier(item.average) === tier);
    const content = items.length
      ? items.map((item) => `
          <article class="result-tier-cocktail">
            <div class="result-tier-cocktail-copy">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${item.average.toFixed(2)}</span>
            </div>
            ${item.image ? `
              <button class="result-cocktail-thumbnail" type="button" data-result-photo="${escapeHtml(item.image)}" data-result-photo-alt="${escapeHtml(item.name)}" aria-label="${escapeHtml(`${t("expandedPhoto")}: ${item.name}`)}">
                <img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" />
              </button>
            ` : ""}
          </article>
        `).join("")
      : `<span class="empty-tier">${t("noCocktailsYet")}</span>`;

    return `
      <div class="tier-row results-tier-row" data-tier="${tier}">
        <div class="tier-label">${tier}</div>
        <div class="tier-items">${content}</div>
      </div>
    `;
  }).join("");

  const unranked = ranked.filter((item) => item.votes === 0);
  const unrankedRow = unranked.length
    ? `<div class="results-unranked"><strong>${t("noVotes")}</strong><div>${unranked.map((item) => `<span>${escapeHtml(item.name)}</span>`).join("")}</div></div>`
    : "";

  return `<div class="results-tier-board">${rows}${unrankedRow}</div>`;
}

function t(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function fetchRemoteSubmissions() {
  if (!RESULT_ENDPOINT) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const callbackName = `maelstromResults${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const script = document.createElement("script");
    const separator = RESULT_ENDPOINT.includes("?") ? "&" : "?";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Remote results timed out"));
    }, 9000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(Array.isArray(payload?.submissions) ? payload.submissions : []);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Remote results failed"));
    };

    script.src = `${RESULT_ENDPOINT}${separator}callback=${encodeURIComponent(callbackName)}&cache=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function mergeSubmissions(localSubmissions, remoteSubmissions) {
  const byId = new Map();

  [...localSubmissions, ...remoteSubmissions].forEach((submission) => {
    if (submission?.id) {
      byId.set(submission.id, submission);
    }
  });

  return [...byId.values()];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSignature(submission) {
  const signature = String(submission?.taster || "").trim();
  return signature ? escapeHtml(signature) : t("anonymous");
}

function getComment(submission) {
  return String(submission?.note || "").trim();
}

function isAfterResultsReset(submission) {
  const resetTime = Date.parse(window.MAELSTROM_RESULTS_RESET_AT || "");
  if (!Number.isFinite(resetTime)) return true;

  const createdTime = Date.parse(submission?.createdAt || "");
  return Number.isFinite(createdTime) && createdTime >= resetTime;
}

async function renderResults() {
  const localSubmissions = readSubmissions();
  let submissions = localSubmissions;
  let remoteError = false;

  try {
    const remoteSubmissions = await fetchRemoteSubmissions();
    submissions = mergeSubmissions(localSubmissions, remoteSubmissions);
  } catch {
    remoteError = true;
  }

  submissions = submissions.filter(isAfterResultsReset);
  writeSubmissions(submissions);

  const leaderboard = document.querySelector("#leaderboard");
  const log = document.querySelector("#submissionLog");
  const ranked = scoreSubmissions(submissions);

  leaderboard.innerHTML = renderCollectiveTierBoard(ranked);

  const comments = submissions
    .filter((submission) => getComment(submission))
    .slice()
    .reverse();

  log.innerHTML = comments.length
    ? comments.map((submission) => `
      <article class="submission-card">
        <strong>${getSignature(submission)}</strong>
        <small>${new Date(submission.createdAt).toLocaleString()}</small>
        <span>${escapeHtml(getComment(submission))}</span>
      </article>
    `).join("")
    : `<article class="submission-card"><strong>${t("noCommentsYet")}</strong></article>`;

  if (remoteError) {
    log.insertAdjacentHTML(
      "afterbegin",
      `<article class="submission-card"><strong>${t("liveUnavailable")}</strong><span>${t("localOnly")}</span></article>`
    );
  }
}

document.querySelector("#clearLocalResults")?.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderResults();
});

function closeResultPhoto() {
  const lightbox = document.querySelector("#resultPhotoLightbox");
  if (!lightbox || lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove("result-photo-open");
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-result-photo]");
  if (trigger) {
    const lightbox = document.querySelector("#resultPhotoLightbox");
    const image = lightbox?.querySelector("#resultPhotoImage");
    if (!lightbox || !image) return;
    image.src = trigger.dataset.resultPhoto;
    image.alt = trigger.dataset.resultPhotoAlt || "";
    lightbox.hidden = false;
    document.body.classList.add("result-photo-open");
    lightbox.querySelector(".result-photo-close")?.focus();
    return;
  }

  if (event.target.matches("[data-close-result-photo], #resultPhotoImage")) closeResultPhoto();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeResultPhoto();
});

renderResults();

window.addEventListener("maelstrom:languagechange", renderResults);
