const STORAGE_KEY = "maelstrom-tasting-submissions-v1";
const VISITOR_KEY = "maelstrom-tasting-visitor-v1";
const SUBMITTED_KEY = "maelstrom-tasting-submitted-v1";
const RESULT_ENDPOINT = window.MAELSTROM_RESULTS_ENDPOINT || "";
const TIERS = ["S", "A", "B", "C", "D"];
const TIER_POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };

const COCKTAILS = [
  {
    id: "up-is-down",
    name: "Meeting at the Tavern",
    nameKey: "cocktailOfferTitle",
    notes: "Dark rum, lime, ginger, abyss bitters.",
    notesKey: "cocktailUpNotes",
    descriptionKey: "cocktailOfferTasting",
  },
  {
    id: "black-current",
    name: "The Departure",
    nameKey: "cocktailSailsTitle",
    notes: "Spiced rum, blackcurrant, sea salt.",
    notesKey: "cocktailBlackNotes",
    descriptionKey: "cocktailDepartureTasting",
  },
  {
    id: "dead-mans-compass",
    name: "Captain Frank",
    nameKey: "cocktailFrankTitle",
    notes: "Bourbon, maple, orange smoke.",
    notesKey: "cocktailCompassNotes",
    descriptionKey: "cocktailFrankTasting",
  },
  {
    id: "siren-sour",
    name: "A Day at Sea",
    nameKey: "cocktailShardTitle",
    notes: "Aquavit, lemon, vanilla foam.",
    notesKey: "cocktailSirenNotes",
    descriptionKey: "cocktailSeaTasting",
  },
  {
    id: "harbor-curse",
    name: "The King",
    nameKey: "cocktailHarborTitle",
    notes: "Mezcal, pineapple, chili, charred citrus.",
    notesKey: "cocktailHarborNotes",
    descriptionKey: "cocktailKingTasting",
  },
];

const state = Object.fromEntries(COCKTAILS.map((cocktail) => [cocktail.id, null]));

function t(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function cocktailDisplayName(cocktail) {
  const translatedName = cocktail.nameKey ? t(cocktail.nameKey) : "";
  return translatedName && translatedName !== cocktail.nameKey ? translatedName : cocktail.name;
}

function readSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeSubmissions(submissions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function getVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  return visitorId;
}

function hasAlreadySubmitted() {
  return localStorage.getItem(SUBMITTED_KEY) === "true";
}

function markSubmitted() {
  localStorage.setItem(SUBMITTED_KEY, "true");
}

function showVoteThanks() {
  const thanks = document.querySelector("#voteThanks");
  const shell = document.querySelector(".tasting-shell");

  if (!thanks) {
    return;
  }

  thanks.hidden = false;
  shell?.setAttribute("aria-hidden", "true");
  document.body.classList.add("vote-confirmed");
}

function lockForm(form, status) {
  form.classList.add("is-locked");
  document.querySelectorAll(".tier-cocktail, #tasterForm input, #tasterForm textarea, #tasterForm button").forEach((control) => {
    control.disabled = true;
  });

  if (status) {
    status.textContent = t("alreadySubmitted");
  }
}

function cocktailToken(cocktail) {
  return `
    <button class="tier-cocktail" type="button" draggable="true" data-cocktail="${cocktail.id}" aria-pressed="false">
      <span>${cocktailDisplayName(cocktail)}</span>
    </button>
  `;
}

function renderTierBoard() {
  const summary = document.querySelector("#tierSummary");
  const list = document.querySelector("#cocktailList");
  if (!summary || !list) return;

  const unranked = COCKTAILS.filter((cocktail) => !state[cocktail.id]);
  list.innerHTML = `
    <div class="unranked-heading">${t("unrankedCocktails")}</div>
    <div class="unranked-drop-zone tier-drop-zone" data-tier-drop="" tabindex="0">
      ${unranked.length ? unranked.map(cocktailToken).join("") : `<span class="empty-tier">${t("allCocktailsRanked")}</span>`}
    </div>
  `;

  summary.innerHTML = TIERS.map((tier) => {
    const items = COCKTAILS.filter((cocktail) => state[cocktail.id] === tier);
    const content = items.length
      ? items.map(cocktailToken).join("")
      : `<span class="empty-tier">${t("noCocktailsYet")}</span>`;

    return `
      <div class="tier-row tier-drop-zone" data-tier="${tier}" data-tier-drop="${tier}" tabindex="0">
        <div class="tier-label">${tier}</div>
        <div class="tier-items">${content}</div>
      </div>
    `;
  }).join("");
}

let pointerDrag = null;
let suppressClick = false;

function clearDropTargets() {
  document.querySelectorAll(".tier-drop-zone.is-drop-target").forEach((zone) => zone.classList.remove("is-drop-target"));
}

function setCocktailTier(cocktailId, tier) {
  if (!Object.prototype.hasOwnProperty.call(state, cocktailId)) return;
  state[cocktailId] = TIERS.includes(tier) ? tier : null;
  renderTierBoard();
}

function openCocktailDetails(cocktailId) {
  const cocktail = COCKTAILS.find((item) => item.id === cocktailId);
  const modal = document.querySelector("#cocktailDetailsModal");
  if (!cocktail || !modal) return;
  modal.dataset.cocktail = cocktail.id;
  modal.querySelector("#cocktailDetailsTitle").textContent = cocktailDisplayName(cocktail);
  modal.querySelector("#cocktailDetailsDescription").textContent = t(cocktail.descriptionKey);
  modal.querySelector("#cocktailDetailsRecipe").textContent = t(cocktail.notesKey);
  modal.hidden = false;
  document.body.classList.add("cocktail-modal-open");
  modal.querySelector(".cocktail-details-close")?.focus();
}

function closeCocktailDetails() {
  const modal = document.querySelector("#cocktailDetailsModal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("cocktail-modal-open");
}

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".tier-cocktail");
  if (!card || card.disabled) return;
  event.dataTransfer.setData("text/plain", card.dataset.cocktail);
  event.dataTransfer.effectAllowed = "move";
  card.classList.add("is-dragging");
});

document.addEventListener("dragend", (event) => {
  event.target.closest(".tier-cocktail")?.classList.remove("is-dragging");
  clearDropTargets();
});

document.addEventListener("dragover", (event) => {
  const zone = event.target.closest(".tier-drop-zone");
  if (!zone) return;
  event.preventDefault();
  clearDropTargets();
  zone.classList.add("is-drop-target");
});

document.addEventListener("drop", (event) => {
  const zone = event.target.closest(".tier-drop-zone");
  if (!zone) return;
  event.preventDefault();
  const cocktailId = event.dataTransfer.getData("text/plain");
  clearDropTargets();
  setCocktailTier(cocktailId, zone.dataset.tierDrop);
});

document.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".tier-cocktail");
  if (!card || card.disabled || event.button !== 0) return;
  pointerDrag = { id: card.dataset.cocktail, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, card };
  card.setPointerCapture?.(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
  if (distance < 8 && !pointerDrag.moved) return;
  pointerDrag.moved = true;
  pointerDrag.card.classList.add("is-dragging");
  clearDropTargets();
  document.elementFromPoint(event.clientX, event.clientY)?.closest(".tier-drop-zone")?.classList.add("is-drop-target");
});

function finishPointerDrag(event) {
  if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
  const drag = pointerDrag;
  pointerDrag = null;
  drag.card.classList.remove("is-dragging");
  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tier-drop-zone");
  clearDropTargets();
  if (drag.moved) {
    suppressClick = true;
    if (zone) setCocktailTier(drag.id, zone.dataset.tierDrop);
    setTimeout(() => { suppressClick = false; }, 0);
  }
}

document.addEventListener("pointerup", finishPointerDrag);
document.addEventListener("pointercancel", finishPointerDrag);

document.addEventListener("click", (event) => {
  if (suppressClick) return;
  const card = event.target.closest(".tier-cocktail");
  if (card) {
    openCocktailDetails(card.dataset.cocktail);
    return;
  }
  if (event.target.matches("[data-close-cocktail-modal]")) closeCocktailDetails();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCocktailDetails();
});

async function submitToEndpoint(payload) {
  if (!RESULT_ENDPOINT) return { skipped: true };

  await fetch(RESULT_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  return { ok: true };
}

function setupForm() {
  const form = document.querySelector("#tasterForm");
  const status = document.querySelector("#saveStatus");
  if (!form) return;

  if (hasAlreadySubmitted()) {
    lockForm(form, status);
    showVoteThanks();
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (hasAlreadySubmitted()) {
      lockForm(form, status);
      return;
    }

    const missing = COCKTAILS.filter((cocktail) => !state[cocktail.id]);

    if (missing.length) {
      status.textContent = t("rankEveryCocktail");
      return;
    }

    const data = new FormData(form);
    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      visitorId: getVisitorId(),
      createdAt: new Date().toISOString(),
      taster: data.get("taster"),
      note: data.get("note"),
      rankings: { ...state },
    };

    const submissions = readSubmissions();
    submissions.push(payload);
    writeSubmissions(submissions);

    try {
      await submitToEndpoint(payload);
      markSubmitted();
      lockForm(form, status);
      status.textContent = RESULT_ENDPOINT
        ? t("savedThanks")
        : t("savedLocal");
      showVoteThanks();
    } catch {
      status.textContent = t("savedRemoteFailed");
    }

    form.reset();
  });
}

renderTierBoard();
setupForm();

window.addEventListener("maelstrom:languagechange", () => {
  renderTierBoard();
  const modal = document.querySelector("#cocktailDetailsModal");
  if (modal && !modal.hidden && modal.dataset.cocktail) openCocktailDetails(modal.dataset.cocktail);
});
