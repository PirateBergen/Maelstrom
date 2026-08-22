const logbookButtons = document.querySelectorAll("[data-logbook-next]");
const logbookPrevButtons = document.querySelectorAll("[data-logbook-prev]");
const logbookStatus = document.querySelector("[data-logbook-status]");
const logbookSheet = document.querySelector("[data-logbook-sheet]");

const LOGBOOK_PAGES = [
  {
    cover: true,
  },
  {
    date: "May 3, 1717",
    text: `If I had known this morning where this day would take me, I surely would not have believed it. Yet here I am, leaving my homeland, and I would be lying if I said I felt no excitement about this new chapter. Everyone knows Captain Frank. So I was somewhat surprised when he came to me at the tavern, carrying two mugs of rum, one of them meant for me. Many people had given him my name, as he was looking to form a crew worthy of his new quest. It is true that I have a good reputation across many lands for being a skilled sailor. Still, I am only a merchant, and stories of pirates have never really interested me. I cannot say exactly what convinced me, but after a few hours sitting around that table with him, I agreed to join his fleet. After all, there is no one here keeping me, and I often find myself wondering what meaning my life truly has.`,
    illustration: {
      src: "assets/logbook-entry-one-frank.webp",
      alt: "Captain Frank sketch",
      variant: "portrait",
    },
  },
  {
    date: "May 4, 1717",
    text: `The morning was rough, and so was the night, but I had little time to think about it. I took a few belongings and hurried to the magnificent ship that would be my home for an unknown amount of time. I did not truly realize what I was about to do, and perhaps it was better that way. No man needs to think too much at the beginning of a new life. I quickly met my fellow travellers. Some were locals, others foreigners who had joined the crew before me during earlier stops. The captain introduced me to the others as the man in charge of the sails. It was an honorable role, and without delay, I gave my first orders. The anchor was raised, and I climbed into the rigging to release one of the folded sails. The sea wind hit my face; the air was cold, almost freezing up there. I watched my homeland slowly fade into the distance while my men worked around me. The coast stretched behind us. The pale houses of the town stood close together behind the walls, while the fort, standing at the water's edge, seemed to watch over me one last time. Farewell, my beautiful homeland. I took out my flask, filled with my best wine, and drank a farewell sip. It had never tasted so sweet as it did in that moment.`,
    illustration: {
      src: "assets/logbook-entry-two-coast.webp",
      alt: "Watercolor coast sketch",
    },
  },
  {
    date: "May 8, 1717",
    text: `Everyone knows Frank. It feels rather strange to find myself aboard his ship. Many have walked these planks before me; some have died, others have fled, and a few veterans are still here by my side. His reputation precedes him. He is not afraid to make sacrifices to get what he wants, and one must admit that it works. That is surely why, despite the obvious risks, so many choose to join him, myself included. The promise of adventure and treasure is a powerful motivation. That said, the quest that led him to recruit me is as surprising as it is fascinating: the love of a woman. If there is one thing the legends never tell, it is that the Captain is a romantic. And yet, his heart is already taken. He met her years ago in France. He did not give me her name, but told me she came from a small town in the northeast, where a delicious sparkling drink is made. Those were his words. I have never tasted such a drink, but he praised it enough to make me very eager to try it one day. Still, if you ask me, his love for this drink is probably tied to the feelings he has for this young woman. He admitted that he has been searching for her for years, and recently, a woman gifted with visions gave him information that makes him believe his beloved is now within reach. I am not sure I believe in such sorcery, but who knows? Perhaps time will prove me wrong. A man who has seen as much as he has is probably in a better position to know that this world is full of mysteries and things that cannot be explained.`,
  },
  {
    date: "May 12, 1717",
    text: `It has now been several days since we set out to sea. The weather has been kind to us, and the waters peaceful. I am beginning to realize what I have left behind, and although fear sometimes finds its way into my thoughts, deep down, I believe I do not regret my choice. We sail peacefully with the wind aboard this spectacular ship, The Shard. I would be curious to know where the name comes from, for there is nothing about this vessel that resembles a fragment.

As I write these words, I am sitting on deck. The air is fresh and salty. The ship rocks gently over the waves while the wood creaks endlessly beneath me. When you listen closely, you realize that true silence does not really exist. Yet there is something strangely hypnotic about this symphony. It is a strange life, that of a sailor. No amount of comfort could ever keep us away from the sea and its changing moods. Tonight, I may fall asleep soaked and cold, but even the comfort of a warm bed could never replace the joy that fills me when I look towards the horizon and see nothing but the vastness of the world.`,
  },
  {
    date: "May 18, 1717",
    text: `For our first stop, we were heading towards Italy, Naples to be more precise, in search of an alchemist who called himself "the King" and who had apparently crossed paths with the young woman not long ago.

As the ship approached the coast, we could see large clouds of grey smoke rising high into the sky. I had never been to Naples, although I had spent some time in Italy before, but I had heard of the enormous volcano, "il Vesuvio", always smoking and towering over the city. Stories of its eruption a century ago could often be heard around the tables of Italian taverns. The port was very busy with merchants and travellers. We asked around as best we could, despite the language barrier. Sometimes, the King's name caused an immediate reaction, bringing looks of surprise and sudden secrecy. Other times, people simply had no idea who we were talking about. Somehow, we were eventually led into narrow streets, through stone buildings and laundry hanging between the walls, until we reached a four-storey house, yellowed with age and in poor condition.

Nothing could have suggested that such a laboratory was hidden inside. The room was filled with bottles of strange-coloured liquids crowded onto the shelves, open books, dried plants, alembics, and a few objects whose origins I preferred not to know. A small man stood there, looking strange and lost, as though he had not even noticed us. He was stirring a liquid of an unnatural green. "Are you the King?" asked the Captain.

The question made the man smile. He took a drink from his strange mixture before confirming his identity and welcoming us inside.

Of course, he knew Frank. Like everyone else.`,
  },
  {
    date: "May 19, 1717",
    text: `When we entered the King's home, he invited us to explain why we had come. The Captain then admitted that he was searching for a woman and that, according to his sources, the alchemist had been seen with her not long ago. The King wore a wide smile as he listened, and there was a strange light in his eyes. "Frank needs the King's help... Il Re in persona! Che privilegio!" He laughed and chuckled. Our entire group felt uneasy with his excessive behavior, but after all, until then, there had been no real reason to worry. He stood up and invited us to drink, revealing that he knew we would come, as he knew very well how Frank felt about this woman. The news shocked the Captain. He had only spoken of his feelings to very few people, and there seemed to be no reasonable way for this alchemist to know anything about them. "I see beyond appearances, il mio capitano." He poured strange ingredients into a large cauldron as he explained that he was the one who had brought the young woman to Naples, hoping to lure the Captain there. He claimed to have received a vision, and that his mission was to help him in his quest. However, according to him, the young woman had refused to stay with the alchemist and had returned to sea aboard a merchant fleet leaving the continent. The Captain fell silent, saddened by the news. The King handed us glasses filled with a strange mixture that carried a rather pleasant smell of almonds. One of our companions reached for his glass faster than the rest of us and quickly began to choke. Everyone jumped to their feet, but it was already too late. Poison! The King held back a laugh and shouted: "Your mission is to die, Frank! The gods no longer want you on their seas! Long live the King!" He then made something explode, filling the room with smoke, and escaped in the confusion. We were still in shock, but the Captain quickly pulled himself together and headed back towards his ship without even worrying about his fallen sailor. "Who is he to speak for the gods? My fate belongs to me, and this King will not stand in my way." And so we returned to sea, in silence. It seems this quest will be less gentle than I first thought...`,
  },
];

const LOGBOOK_PAGE_POSITIONS = [
  ["50%", "50%"],
  ["48%", "47%"],
  ["52%", "51%"],
  ["46%", "54%"],
  ["54%", "49%"],
  ["50%", "56%"],
];
let logbookPage = 1;
let touchStartX = 0;
let touchStartY = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLogbookPage() {
  const page = LOGBOOK_PAGES[logbookPage - 1];

  if (logbookStatus) {
    logbookStatus.textContent = page.cover ? "Couverture" : `Page ${logbookPage - 1} sur ${LOGBOOK_PAGES.length - 1}`;
  }

  if (!logbookSheet || !page) {
    return;
  }

  logbookSheet.classList.toggle("is-logbook-cover", Boolean(page.cover));

  if (page.cover) {
    logbookSheet.innerHTML = `
      <article class="logbook-cover-content" aria-label="Long live the King">
        <img src="assets/logbook-chapter-one-emblem.webp" alt="Long live the King" draggable="false" />
      </article>
    `;
    return;
  }

  const [x, y] = LOGBOOK_PAGE_POSITIONS[logbookPage - 2] || LOGBOOK_PAGE_POSITIONS[0];
  const paragraphs = page.text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

  logbookSheet.style.setProperty("--logbook-page-x", x);
  logbookSheet.style.setProperty("--logbook-page-y", y);
  const illustration = page.illustration
    ? `<img class="logbook-entry-illustration ${page.illustration.variant ? `logbook-entry-illustration-${escapeHtml(page.illustration.variant)}` : ""}" src="${escapeHtml(page.illustration.src)}" alt="${escapeHtml(page.illustration.alt)}" draggable="false" />`
    : "";

  logbookSheet.innerHTML = `
    <article class="logbook-entry">
      <time>${escapeHtml(page.date)}</time>
      <div>${paragraphs}</div>
      ${illustration}
    </article>
  `;
}

logbookButtons.forEach((button) => {
  button.addEventListener("click", () => {
    changeLogbookPage(1);
  });
});

logbookPrevButtons.forEach((button) => {
  button.addEventListener("click", () => {
    changeLogbookPage(-1);
  });
});

function changeLogbookPage(direction) {
  logbookPage += direction;

  if (logbookPage > LOGBOOK_PAGES.length) {
    logbookPage = 1;
  }

  if (logbookPage < 1) {
    logbookPage = LOGBOOK_PAGES.length;
  }

  renderLogbookPage();
}

logbookSheet?.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  },
  { passive: true },
);

logbookSheet?.addEventListener(
  "touchend",
  (event) => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) {
      return;
    }

    changeLogbookPage(deltaX < 0 ? 1 : -1);
  },
  { passive: true },
);

renderLogbookPage();
