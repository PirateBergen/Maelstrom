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

function renderResults() {
  const submissions = readSubmissions();
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
    : `<article class="submission-card"><strong>No local submissions yet.</strong><span>Submit a test tier list first.</span></article>`;
}

document.querySelector("#clearLocalResults")?.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderResults();
});

renderResults();
