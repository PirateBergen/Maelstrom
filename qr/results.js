function scoreSubmissions(submissions) {
  const scores = Object.fromEntries(
    COCKTAILS.map((cocktail) => [
      cocktail.id,
      { id: cocktail.id, name: cocktail.name, points: 0, votes: 0 },
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

  const leaderboard = document.querySelector("#leaderboard");
  const log = document.querySelector("#submissionLog");
  const ranked = scoreSubmissions(submissions);

  leaderboard.innerHTML = ranked.map((item, index) => `
    <article class="leader-card">
      <span class="leader-rank">${index + 1}</span>
      <span class="leader-name">${item.name}</span>
      <span class="leader-score">${item.votes ? item.average.toFixed(2) : "No votes"}</span>
    </article>
  `).join("");

  log.innerHTML = submissions.length
    ? submissions.slice().reverse().map((submission) => `
      <article class="submission-card">
        <strong>${submission.taster}</strong>
        <small>${new Date(submission.createdAt).toLocaleString()}</small>
        <span>${Object.entries(submission.rankings)
          .map(([id, tier]) => `${getCocktailName(id)}: ${tier}`)
          .join(" / ")}</span>
        ${submission.note ? `<small>${submission.note}</small>` : ""}
      </article>
    `).join("")
    : `<article class="submission-card"><strong>No public votes yet.</strong><span>The live shared ranking will be connected before guest tastings begin.</span></article>`;

  if (remoteError) {
    log.insertAdjacentHTML(
      "afterbegin",
      `<article class="submission-card"><strong>Live results unavailable.</strong><span>Showing local data only.</span></article>`
    );
  }
}

document.querySelector("#clearLocalResults")?.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderResults();
});

renderResults();
