(() => {
  const isPreview = new URLSearchParams(window.location.search).get("julebordPreview") === "1";
  const config = window.MAELSTROM_JULEBORD_TIER;
  const currentBoard = document.querySelector(".tasting-board");
  const shell = document.querySelector(".tasting-shell");
  if ((!isPreview && !config?.active) || !currentBoard || !shell) return;

  const tiers = ["S", "A", "B", "C", "D"];
  const chapterOneResults = [
    { name: "The King", average: "4.14", tier: "A" },
    { name: "Meeting at the Tavern", average: "3.84", tier: "A" },
    { name: "Captain Frank", average: "3.64", tier: "A" },
    { name: "The King’s Poison", average: "3.11", tier: "B" },
    { name: "The Departure", average: "2.91", tier: "B" },
    { name: "A Day at Sea", average: "2.09", tier: "C" },
  ];

  const archiveRows = tiers.map((tier) => {
    const cocktails = chapterOneResults.filter((cocktail) => cocktail.tier === tier);
    const content = cocktails.length
      ? cocktails.map((cocktail) => `
          <article class="result-tier-cocktail">
            <div class="result-tier-cocktail-copy"><strong>${cocktail.name}</strong><span>${cocktail.average}</span></div>
          </article>`).join("")
      : '<span class="empty-tier">No cocktail in this tier</span>';
    return `<div class="tier-row results-tier-row" data-tier="${tier}"><div class="tier-label">${tier}</div><div class="tier-items">${content}</div></div>`;
  }).join("");

  const chapters = document.createElement("section");
  chapters.className = "julebord-tier-preview";
  chapters.innerHTML = `
    <section class="tier-chapter-section tier-chapter-two">
      <div class="tier-chapter-heading"><span>Chapter II</span><h2>Julebord</h2><p>The new signature ranking</p></div>
      <div class="tier-chapter-two-content"></div>
    </section>
    <section class="tier-chapter-section tier-chapter-one">
      <div class="tier-chapter-heading"><span>Chapter I</span><h2>The First Voyage</h2><p>Previous signature ranking archive</p></div>
      <button class="tier-archive-button" type="button" aria-expanded="false" aria-controls="chapterOnePodium">
        <img src="../assets/up-is-down-vote.webp" alt="" />
        <span><strong>Open Chapter I Podium</strong><small>Consult the final previous ranking</small></span>
      </button>
      <div class="tier-chapter-one-content" id="chapterOnePodium" hidden>
        <div class="tasting-board"><div class="results-tier-board">${archiveRows}</div></div>
      </div>
    </section>`;

  const title = document.querySelector(".tier-results-title");
  const intro = document.querySelector(".tasting-hero-content > p");
  if (title) title.innerHTML = "<span>Julebord Tier List</span><span>Results</span>";
  if (intro) intro.textContent = "Rank the four new signatures. The final podium from Chapter I remains available below.";

  shell.insertBefore(chapters, currentBoard);
  const chapterTwoContent = chapters.querySelector(".tier-chapter-two-content");

  if (config.active) {
    chapterTwoContent.appendChild(currentBoard);
  } else {
    currentBoard.hidden = true;
    chapterTwoContent.innerHTML = `
      <div class="tasting-board julebord-new-ranking">
        <div class="julebord-ranking-heading"><h3>Julebord Signature Tier List</h3><span>Four new signatures</span></div>
        <div class="julebord-cocktail-pool">${config.cocktails.map((cocktail) => `<span>${cocktail.name}</span>`).join("")}</div>
        <div class="results-tier-board julebord-empty-board">${tiers.map((tier) => `<div class="tier-row results-tier-row" data-tier="${tier}"><div class="tier-label">${tier}</div><div class="tier-items"><span class="empty-tier">Awaiting your ranking</span></div></div>`).join("")}</div>
        <a class="primary-link julebord-vote-preview-link" href="tasting.html?julebordPreview=1">Preview the new voting board</a>
      </div>`;
  }

  const archive = chapters.querySelector(".tier-chapter-one-content");
  const button = chapters.querySelector(".tier-archive-button");
  button.addEventListener("click", () => {
    const willOpen = archive.hidden;
    archive.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) archive.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
