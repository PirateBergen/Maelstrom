const STORAGE_KEY = "maelstrom-tasting-submissions-v1";
const VISITOR_KEY = "maelstrom-tasting-visitor-v1";
const SUBMITTED_KEY = "maelstrom-tasting-submitted-v1";
const RESULT_ENDPOINT = window.MAELSTROM_RESULTS_ENDPOINT || "";
const TIERS = ["S", "A", "B", "C", "D"];
const TIER_POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };

const COCKTAILS = [
  {
    id: "up-is-down",
    name: "Up Is Down",
    notes: "Dark rum, lime, ginger, abyss bitters.",
  },
  {
    id: "black-current",
    name: "The Black Current",
    notes: "Spiced rum, blackcurrant, sea salt.",
  },
  {
    id: "dead-mans-compass",
    name: "Dead Man's Compass",
    notes: "Bourbon, maple, orange smoke.",
  },
  {
    id: "siren-sour",
    name: "Siren Sour",
    notes: "Aquavit, lemon, vanilla foam.",
  },
  {
    id: "harbor-curse",
    name: "Harbor Curse",
    notes: "Mezcal, pineapple, chili, charred citrus.",
  },
  {
    id: "north-sea-fog",
    name: "North Sea Fog",
    notes: "Gin, elderflower, bergamot, saline mist.",
  },
];

const state = Object.fromEntries(COCKTAILS.map((cocktail) => [cocktail.id, null]));

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

function lockForm(form, status) {
  form.classList.add("is-locked");
  document.querySelectorAll(".tier-buttons button, #tasterForm input, #tasterForm textarea, #tasterForm button").forEach((control) => {
    control.disabled = true;
  });

  if (status) {
    status.textContent = "Your tier list has already been submitted from this device.";
  }
}

function getCocktailName(id) {
  return COCKTAILS.find((cocktail) => cocktail.id === id)?.name || id;
}

function renderTierSummary() {
  const summary = document.querySelector("#tierSummary");
  if (!summary) return;

  summary.innerHTML = TIERS.map((tier) => {
    const items = COCKTAILS.filter((cocktail) => state[cocktail.id] === tier);
    const content = items.length
      ? items.map((item) => `<span class="tier-pill">${item.name}</span>`).join("")
      : "<span>No cocktails yet</span>";

    return `
      <div class="tier-row">
        <div class="tier-label">${tier}</div>
        <div class="tier-items">${content}</div>
      </div>
    `;
  }).join("");
}

function renderCocktails() {
  const list = document.querySelector("#cocktailList");
  if (!list) return;

  list.innerHTML = COCKTAILS.map((cocktail) => `
    <article class="cocktail-card">
      <div>
        <h3>${cocktail.name}</h3>
        <p>${cocktail.notes}</p>
      </div>
      <div class="tier-buttons" aria-label="Rank ${cocktail.name}">
        ${TIERS.map((tier) => `
          <button type="button" data-cocktail="${cocktail.id}" data-tier="${tier}">
            ${tier}
          </button>
        `).join("")}
      </div>
    </article>
  `).join("");

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cocktail][data-tier]");
    if (!button) return;

    const { cocktail, tier } = button.dataset;
    state[cocktail] = tier;

    document
      .querySelectorAll(`[data-cocktail="${cocktail}"]`)
      .forEach((tierButton) => tierButton.classList.toggle("active", tierButton.dataset.tier === tier));

    renderTierSummary();
  });
}

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
      status.textContent = "Rank every cocktail before submitting.";
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
        ? "Saved. Thank you."
        : "Saved on this device. Backend sync is not connected yet.";
    } catch {
      status.textContent = "Saved on this device, but remote sync failed.";
    }

    form.reset();
  });
}

renderCocktails();
renderTierSummary();
setupForm();
