window.MAELSTROM_JULEBORD_MENU = {
  active: false,
  prices: { signature: 195, classic: 180, keelhauled: 180, unholyTrinity: 360, mocktail: 130 },
  tasting: {
    name: "The Keelhauled",
    description: "A tasting board featuring the four Julebord signature cocktails in shooter-sized versions.",
  },
  experience: {
    name: "The Unholy Trinity",
    eyebrow: "Hendrick’s Trail",
    description: "A three-course tasting of miniature Hendrick’s cocktails, accompanied by a short divination interlude during the experience.",
    cocktails: [
      {
        name: "The OJ Legend",
        description: "A twist on the original Hendrick’s Gin, highlighting its signature notes of rose and cucumber, balanced with fresh citrus and delicate Mediterranean botanicals.",
        recipe: "Hendrick’s Gin, fresh cucumber juice, house-made rose syrup, lime juice and Mediterranean tonic.",
      },
      {
        name: "Another Hendrick’s Eulogy",
        description: "A tribute to Another Hendrick’s, where delicate botanicals meet silky white chocolate, rich coffee and subtle orange notes, with a smooth, velvety cocoa finish.",
        recipe: "Another Hendrick’s Gin fat-washed with white chocolate, Cointreau tincture, coffee liqueur, heavy cream and Angostura Cocoa Bitters.",
        allergens: "MLK* · NUT* · SOY*",
      },
      {
        name: "Legend of the North Sea — Neptunia",
        description: "Inspired by the wild Scottish coast, this blend brings together Neptunia’s coastal botanicals, the delicate sweetness of apricot and the peppery freshness of arugula.",
        recipe: "Hendrick’s Neptunia Gin, apricot purée, house-made arugula syrup, fresh lime juice and egg white.",
        allergens: "EGG*",
      },
    ],
  },
  signatures: [
    {
      name: "Celebration Under the Star",
      description: "A medieval-inspired spiced wine, blending warm aromatic spices, delicate citrus notes and the sweetness of honey.",
      recipe: "Chardonnay infused with honey, cinnamon, ginger, nutmeg, orange and lemon zest, and cloves.",
      allergens: "SUL*",
    },
    {
      name: "Bad Omens",
      description: "A rich and velvety cocktail combining toasted hazelnut, creamy coconut and delicate pastry notes for a decadent dessert-like experience.",
      recipe: "Frangelico, vodka, Monin coconut syrup, coconut cream, Ancel pastry cream, egg white and shredded coconut.",
      allergens: "NUT* · MLK* · EGG*",
    },
    {
      name: "Kaptein Sabeltann",
      description: "Inspired by the Captain’s legendary ice cream, a playful twist on a childhood favourite, blending zesty lemon, sweet cola and warm spiced rum.",
      recipe: "House-made limoncello sorbet and house-made cola coulis infused with Sailor Jerry spiced rum.",
    },
    {
      name: "Desperate Measure",
      description: "A rich and indulgent twist on the classic Old Fashioned, blending roasted pecans, caramelized banana and subtle cocoa notes for a smooth, warming finish.",
      recipe: "Monkey Shoulder Old Fashioned infused with roasted pecans, butter-roasted banana, caramelized banana-peel powder and Angostura Cocoa Bitters.",
      allergens: "NUT* · MLK*",
    },
  ],
  classics: [
    { name: "The King", mocktail: true, recipe: "Vodka, lime cordial, yuzu syrup, Ancel pastry cream and house-made torched Swiss meringue.", allergens: "EGG* · MLK*" },
    { name: "Meeting at the Tavern", mocktail: true, recipe: "Sailor Jerry spiced rum, vanilla syrup, lime, cinnamon and ginger beer." },
    { name: "Bonny’s Red Kiss", mocktail: true, recipe: "Rose- and hibiscus-infused gin, house-made raspberry liqueur, lime, sugar, egg white and freeze-dried raspberries.", allergens: "EGG*" },
    {
      name: "The Velvet Cutlass",
      mocktail: true,
      description: "Sweet and seductive at first sip, this fiery temptation blends almond sweetness, vibrant citrus and a daring kick of spice. Beware, even a siren’s kiss can burn.",
      recipe: "Amaretto, spicy Cointreau, Tabasco, lime, sugar, egg white, Tajín and an orange rim.",
      allergens: "EGG*",
    },
    {
      name: "The Captain’s Forbidden Bite",
      description: "A tempting taste of the forbidden fruit. Crisp apple, delicate sweetness and a refreshing citrus twist—a sip worth breaking any curse for.",
      recipe: "Calvados Drouin, Bulmers apple cider, lime, sugar and egg white.",
      allergens: "EGG* · SUL*",
    },
    {
      name: "The Sailor’s Salvation",
      description: "A warm and comforting brew of spiced rum, golden honey and zesty lemon. A sailor’s comfort after a long, stormy night at sea.",
      recipe: "Sailor Jerry spiced rum, fresh lemon juice, honey, cinnamon and hot water.",
    },
    {
      name: "Big Deck Energy",
      recipe: "Monkey Shoulder whisky, lime, sugar, egg white and caramelized popcorn foam.",
      allergens: "EGG*",
    },
  ],
};

(() => {
  const menu = window.MAELSTROM_JULEBORD_MENU;
  const previewEnabled = new URLSearchParams(window.location.search).get("julebordPreview") === "1";
  if (!menu.active && !previewEnabled) return;
  const panel = document.querySelector(".signature-menu-panel");
  if (!panel) return;

  const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const card = (cocktail, price, className = "signature-cocktail-card") => `
    <article class="${className}">
      <div class="signature-cocktail-heading"><h3>${esc(cocktail.name)}</h3>${price ? `<span class="signature-cocktail-price">${price} NOK</span>` : ""}</div>
      ${cocktail.mocktail ? `<p class="mocktail-availability">Mocktail available — ${menu.prices.mocktail} NOK</p>` : ""}
      ${cocktail.description ? `<p class="signature-cocktail-tasting">${esc(cocktail.description)}</p>` : ""}
      <p class="signature-cocktail-recipe">${esc(cocktail.recipe)}</p>
      ${cocktail.allergens ? `<p class="signature-cocktail-allergens">${esc(cocktail.allergens)}</p>` : ""}
    </article>`;

  panel.innerHTML = `
    <section class="signature-tasting-card">
      <h2>${esc(menu.tasting.name)}</h2><p class="menu-item-price">${menu.prices.keelhauled} NOK</p><p>${esc(menu.tasting.description)}</p>
    </section>
    <section class="signature-tasting-card julebord-trinity-card">
      <p class="classic-cocktails-kicker">${esc(menu.experience.eyebrow)}</p>
      <h2>${esc(menu.experience.name)}</h2><p class="menu-item-price">${menu.prices.unholyTrinity} NOK · 3 cocktails</p>
      <p>${esc(menu.experience.description)}</p>
      <div class="classic-cocktails-list">${menu.experience.cocktails.map((item) => card(item, "", "classic-cocktail-item")).join("")}</div>
    </section>
    <div class="signature-cocktail-grid">${menu.signatures.map((item) => card(item, menu.prices.signature)).join("")}</div>
    <section class="classic-cocktails-section"><div class="classic-cocktails-heading"><h2>Julebord Classics</h2><p class="menu-category-price">${menu.prices.classic} NOK</p></div>
      <div class="classic-cocktails-list">${menu.classics.map((item) => card(item, menu.prices.classic, "classic-cocktail-item")).join("")}</div>
    </section>
    <aside class="off-menu-note"><p>Looking for a cocktail or mocktail that is not on the menu? Just ask us.</p></aside>
    <section class="allergen-legend"><h3>Allergen key</h3><ul><li>EGG* — Eggs</li><li>MLK* — Milk</li><li>NUT* — Nuts</li><li>SOY* — Soy</li><li>SUL* — Sulphites</li></ul></section>`;
})();
