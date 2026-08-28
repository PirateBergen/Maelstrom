const logbookButtons = document.querySelectorAll("[data-logbook-next]");
const logbookPrevButtons = document.querySelectorAll("[data-logbook-prev]");
const logbookStatus = document.querySelector("[data-logbook-status]");
const logbookSheet = document.querySelector("[data-logbook-sheet]");
const logbookZoomIn = document.querySelector("[data-logbook-zoom-in]");
const logbookZoomOut = document.querySelector("[data-logbook-zoom-out]");
const logbookZoomReset = document.querySelector("[data-logbook-zoom-reset]");
const logbookZoomControls = document.querySelector(".logbook-zoom-controls");

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
      variant: "coast",
    },
  },
  {
    date: "May 8, 1717",
    text: `Everyone knows Frank. It feels rather strange to find myself aboard his ship. Many have walked these planks before me; some have died, others have fled, and a few veterans are still here by my side. His reputation precedes him. He is not afraid to make sacrifices to get what he wants, and one must admit that it works. That is surely why, despite the obvious risks, so many choose to join him, myself included. The promise of adventure and treasure is a powerful motivation. That said, the quest that led him to recruit me is as surprising as it is fascinating: the love of a woman. If there is one thing the legends never tell, it is that the Captain is a romantic. And yet, his heart is already taken. He met her years ago in France. He did not give me her name, but told me she came from a small town in the northeast, where a delicious sparkling drink is made. Those were his words. I have never tasted such a drink, but he praised it enough to make me very eager to try it one day. Still, if you ask me, his love for this drink is probably tied to the feelings he has for this young woman. He admitted that he has been searching for her for years, and recently, a woman gifted with visions gave him information that makes him believe his beloved is now within reach. I am not sure I believe in such sorcery, but who knows? Perhaps time will prove me wrong. A man who has seen as much as he has is probably in a better position to know that this world is full of mysteries and things that cannot be explained.`,
    illustration: {
      src: "assets/logbook-entry-three-frank-face.webp",
      alt: "Captain Frank portrait sketch",
      variant: "face",
    },
  },
  {
    date: "May 12, 1717",
    text: `It has now been several days since we set out to sea. The weather has been kind to us, and the waters peaceful. I am beginning to realize what I have left behind, and although fear sometimes finds its way into my thoughts, deep down, I believe I do not regret my choice. We sail peacefully with the wind aboard this spectacular ship, The Shard. I would be curious to know where the name comes from, for there is nothing about this vessel that resembles a fragment.

As I write these words, I am sitting on deck. The air is fresh and salty. The ship rocks gently over the waves while the wood creaks endlessly beneath me. When you listen closely, you realize that true silence does not really exist. Yet there is something strangely hypnotic about this symphony. It is a strange life, that of a sailor. No amount of comfort could ever keep us away from the sea and its changing moods. Tonight, I may fall asleep soaked and cold, but even the comfort of a warm bed could never replace the joy that fills me when I look towards the horizon and see nothing but the vastness of the world.`,
    illustration: {
      src: "assets/logbook-entry-four-boat.webp",
      alt: "The Shard ship sketch",
    },
  },
  {
    date: "May 18, 1717",
    text: `For our first stop, we were heading towards Italy, Naples to be more precise, in search of an alchemist who called himself "the King" and who had apparently crossed paths with the young woman not long ago.

As the ship approached the coast, we could see large clouds of grey smoke rising high into the sky. I had never been to Naples, although I had spent some time in Italy before, but I had heard of the enormous volcano, "il Vesuvio", always smoking and towering over the city. Stories of its eruption a century ago could often be heard around the tables of Italian taverns. The port was very busy with merchants and travellers. We asked around as best we could, despite the language barrier. Sometimes, the King's name caused an immediate reaction, bringing looks of surprise and sudden secrecy. Other times, people simply had no idea who we were talking about. Somehow, we were eventually led into narrow streets, through stone buildings and laundry hanging between the walls, until we reached a four-storey house, yellowed with age and in poor condition.

Nothing could have suggested that such a laboratory was hidden inside. The room was filled with bottles of strange-coloured liquids crowded onto the shelves, open books, dried plants, alembics, and a few objects whose origins I preferred not to know. A small man stood there, looking strange and lost, as though he had not even noticed us. He was stirring a liquid of an unnatural green. "Are you the King?" asked the Captain.

The question made the man smile. He took a drink from his strange mixture before confirming his identity and welcoming us inside.

Of course, he knew Frank. Like everyone else.`,
    illustration: {
      src: "assets/logbook-entry-five-naples.webp",
      alt: "Naples alchemist entry sketch",
      variant: "side",
    },
  },
  {
    date: "May 19, 1717",
    text: `When we entered the King's home, he invited us to explain why we had come. The Captain then admitted that he was searching for a woman and that, according to his sources, the alchemist had been seen with her not long ago. The King wore a wide smile as he listened, and there was a strange light in his eyes. "Frank needs the King's help... Il Re in persona! Che privilegio!" He laughed and chuckled. Our entire group felt uneasy with his excessive behavior, but after all, until then, there had been no real reason to worry. He stood up and invited us to drink, revealing that he knew we would come, as he knew very well how Frank felt about this woman. The news shocked the Captain. He had only spoken of his feelings to very few people, and there seemed to be no reasonable way for this alchemist to know anything about them. "I see beyond appearances, il mio capitano." He poured strange ingredients into a large cauldron as he explained that he was the one who had brought the young woman to Naples, hoping to lure the Captain there. He claimed to have received a vision, and that his mission was to help him in his quest. However, according to him, the young woman had refused to stay with the alchemist and had returned to sea aboard a merchant fleet leaving the continent. The Captain fell silent, saddened by the news. The King handed us glasses filled with a strange mixture that carried a rather pleasant smell of almonds. One of our companions reached for his glass faster than the rest of us and quickly began to choke. Everyone jumped to their feet, but it was already too late. Poison! The King held back a laugh and shouted: "Your mission is to die, Frank! The gods no longer want you on their seas! Long live the King!" He then made something explode, filling the room with smoke, and escaped in the confusion. We were still in shock, but the Captain quickly pulled himself together and headed back towards his ship without even worrying about his fallen sailor. "Who is he to speak for the gods? My fate belongs to me, and this King will not stand in my way." And so we returned to sea, in silence. It seems this quest will be less gentle than I first thought...`,
  },
];

const LOGBOOK_TRANSLATIONS = {
  fr: {
    1: {
      date: "3 mai 1717",
      text: `Si j'avais su ce matin où m'emmènerait cette journée, sûrement n'y aurais-je cru. Pourtant me voilà, je quitte ma terre natale et je mentirais si je disais que je ne sens aucune excitation quant à ce nouveau chapitre.

Tout le monde connaît le capitaine Frank. Aussi fus-je quelque peu étonné qu'il vienne à moi à la taverne, deux chopes de rhum à la main dont une m'était destinée. Mon nom lui avait été donné par de nombreux manants, car il cherchait à former un équipage digne de sa nouvelle quête. Il est vrai que j'ai bonne réputation à travers multiples terres pour être un marin de qualité. Ceci dit je ne suis que marchand, et les histoires de pirates ne m'ont jamais intéressé. Je ne saurais dire exactement ce qui m'a convaincu, mais après quelques heures autour de cette table en sa compagnie, j'ai accepté de rejoindre sa flotte. Après tout je n'ai personne ici qui me retient, et je me surprends souvent à me demander quel sens a ma vie.`,
    },
    2: {
      date: "4 mai 1717",
      text: `Le réveil fut rude, la nuit le fut tout autant, mais je n'eus guère le temps d'y penser. Je pris quelques affaires et m'empressai de rejoindre ce magnifique navire qui serait ma résidence pour un temps indéterminé. Je ne réalisais pas vraiment ce que je m'apprêtais à faire, et c'était sûrement mieux ainsi. Nul n'a besoin de raisonner à l'aube d'une nouvelle vie. Je fis rapidement connaissance avec mes compagnons de route. Des locaux, mais aussi des étrangers, embarqués avant moi au gré des escales. Le capitaine me présenta aux autres comme responsable de la manœuvre des voiles. C'était un rôle honorable et, sans tarder, je donnai mes premiers ordres. L'ancre fut levée et je montai dans le gréement pour libérer une voile ferlée. Le vent marin frappait mon visage ; l'air était frais, presque glacé là-haut. Je regardais mon pays s'éloigner tandis que mes hommes s'affairaient. La côte s'étirait derrière nous. Les maisons claires de la ville se resserraient derrière les murailles, tandis que le fort, dressé au bord de l'eau, semblait veiller une dernière fois sur moi. Au revoir, mon beau pays. Je sortis ma flasque, pleine de mon meilleur vin, et bus une gorgée d'adieu. Cette boisson ne m'avait jamais semblé si douce qu'à cet instant.`,
    },
    3: {
      date: "8 mai 1717",
      text: `Tout le monde connaît Frank. C'est assez étrange de se retrouver sur son navire. Beaucoup ont foulé ses planches, certains ont péri, d'autres ont fui, et quelques vétérans sont encore là, à mes côtés. Sa réputation le précède. Il n'a pas peur de faire des sacrifices pour arriver à ses fins, et il faut reconnaître que cela fonctionne. C'est sûrement pour cela que, malgré les risques évidents, beaucoup se joignent à lui, y compris moi. La promesse d'aventure et de trésors est une motivation redoutable. Cela dit, la quête qui l'a mené à me recruter est aussi surprenante que fascinante : l'amour d'une femme. S'il y a une chose que les légendes ne disent pas, c'est que le capitaine est un romantique. Pourtant, son cœur est pris. Il l'a rencontrée des années auparavant, en France. Il ne m'a pas donné son nom, mais il m'a dit qu'elle venait d'une petite ville du nord-est, au cœur de laquelle est produit un délicieux breuvage pétillant. Ce sont ses mots. Je ne connais pas cette boisson, mais il en a fait assez d'éloges pour me donner grande envie d'y goûter un jour. Tout de même, son amour pour ce breuvage est probablement lié aux sentiments qu'il porte à cette jeune femme, si vous voulez mon avis. Il m'a avoué être à sa recherche depuis des années et, récemment, une femme dotée de dons de voyance lui a donné des informations qui le poussent à penser que sa bien-aimée est à portée de main. Je ne suis pas sûr de croire à ces sorcelleries, mais qui sait ? Peut-être que le temps me donnera tort. Un homme qui en a vu autant que lui est sans doute mieux placé pour savoir que ce monde regorge de mystères et de choses inexplicables.`,
    },
    4: {
      date: "12 mai 1717",
      text: `Cela fait maintenant plusieurs jours que nous sommes en mer. Le temps est propice au voyage, la mer est clémente. Je commence à réaliser ce que j'ai laissé derrière, et même si par instant la peur me monte, je crois qu'au fond je ne regrette pas mon choix. Nous avançons calmement au gré du vent sur ce bâtiment spectaculaire. “The Shard”. Je serais curieux de connaître l'origine de ce nom car ce navire n'a rien d'un fragment.

À l'heure où j'écris, je suis sur le pont. L'air est frais et iodé. Le bateau tangue sur les vagues, le bois craque de manière continue. Quand on tend l'oreille on réalise que le silence n'existe pas vraiment, mais cette symphonie a quelque chose de particulièrement hypnotisant. C'est une étrange vie que celle de marin. Aucun confort ne réussit jamais à nous faire rester loin de la mer et de ses humeurs. Ce soir, je m'endormirai peut-être trempé et froid, mais la douceur d'un lit chaud ne suffirait pas à combler la joie qui m'envahit lorsque je regarde l'horizon et que je n'y vois que l'immensité du monde.`,
    },
    5: {
      date: "18 mai 1717",
      text: `Pour notre première escale, nous faisions cap vers l'Italie, à Naples plus précisément, à la recherche d'un alchimiste qui se ferait appeler “le King” et qui aurait croisé la route de la jeune femme il y a peu. Quand le navire s'approchait des côtes, on pouvait apercevoir de larges fumées grises montant haut dans le ciel. Je ne m'étais jamais rendu à Naples, bien que j'aie séjourné en Italie, mais j'avais entendu parler de cet immense volcan “el Vesuvio”, toujours fumant et surplombant la ville. Les histoires de son éruption un siècle auparavant se font souvent entendre autour des tables des tavernes italiennes. Le port était très animé par les marchands et les voyageurs. Nous avons questionné comme l'on pouvait, malgré la barrière de la langue. Parfois le nom du King faisait réagir instantanément, provoquant des réactions de surprise et de cachotteries, et d'autres c'était simplement l'ignorance. Tant bien que mal, nous fûmes guidés jusque dans des ruelles étroites, à travers les bâtisses de pierre et le linge étendu entre les façades, jusqu'à une maison jaunie de quatre étages, dans un mauvais état. Rien n'aurait pu indiquer qu'à l'intérieur se trouvait un laboratoire pareil. Une pièce pleine de fioles aux couleurs douteuses qui s'entassaient sur les étagères, des livres ouverts, des plantes séchées, des alambics et quelques objets dont je préférais ignorer l'origine. Un petit monsieur se tenait là, l'air étrange et perdu comme s'il ne nous avait même pas remarqués. Il était en train de remuer un liquide d'un vert surnaturel. “Êtes-vous le King ?” demanda le capitaine, ce qui fit sourire l'homme qui se mit à boire sa mixture avant de confirmer son identité et de nous souhaiter la bienvenue. Évidemment, il connaissait Frank, comme tout le monde.`,
    },
    6: {
      date: "19 mai 1717",
      text: `Lorsque nous sommes entrés chez le King, il nous a invités à expliquer notre venue. Le capitaine lui a alors avoué être à la recherche d'une femme et que, d'après ses sources, l'alchimiste aurait été vu en sa compagnie peu de temps auparavant. Le King arborait un large sourire en écoutant cela, et son regard brillait étrangement. « Frank a besoin de l'aide du King… Il Re in persona! Che privilegio! » Il riait et ricanait. Tout notre groupe était mal à l'aise face à cette attitude excessive mais, après tout, jusqu'alors, il n'y avait aucune raison de s'inquiéter. Il se leva et nous invita à boire, nous révélant qu'il savait que nous viendrions, car il connaissait bien les sentiments que Frank avait pour cette femme. Cette nouvelle choqua le capitaine, car il n'en avait parlé qu'à très peu de personnes et il semblait hautement improbable que cet alchimiste soit au courant de quoi que ce soit de manière rationnelle. « Je vois au-delà des apparences, il mio capitano. » Il versait d'étranges ingrédients dans un grand chaudron, tout en expliquant que c'était lui qui avait fait venir la jeune femme à Naples pour attirer le capitaine. Il avait reçu une vision, disait-il, et sa mission était de l'aider dans sa quête. Seulement, d'après ses dires, la jeune femme n'avait pas voulu rester auprès de l'alchimiste et avait repris la mer sur une flotte marchande qui quittait le continent. Le capitaine se referma, attristé par la nouvelle. Le King nous tendit des verres remplis d'une concoction à l'agréable odeur d'amande. L'un de nos camarades se jeta sur son verre plus vite que nous autres et commença rapidement à s'étouffer. Tout le monde se releva aussitôt, mais c'était trop tard. Du poison ! Le King étouffa un rire et cria : « Ta mission est de mourir, Frank ! Les dieux ne veulent plus de toi sur leurs mers ! Long live the King! » Il fit alors exploser quelque chose qui emplit la pièce de fumée et en profita pour s'enfuir. Nous étions sous le choc, mais le capitaine se ressaisit vite et partit en direction de son bateau sans même se soucier de son matelot. « Qui est-il pour parler au nom des dieux ? Mon destin m'appartient, et ce King ne viendra pas me barrer la route. » Nous reprîmes ainsi la mer, dans le silence. Il semble que cette quête sera moins douce que je ne le pensais…`,
    },
  },
  no: {
    1: {
      date: "3. mai 1717",
      text: `Hvis jeg hadde visst i morges hvor denne dagen skulle føre meg, ville jeg neppe ha trodd det. Likevel står jeg her nå, på vei bort fra mitt hjemland, og jeg ville lyve om jeg sa at jeg ikke kjente en viss spenning ved tanken på dette nye kapittelet. Alle kjenner kaptein Frank. Derfor ble jeg noe overrasket da han kom bort til meg på vertshuset med to krus rom i hendene, hvorav det ene var til meg. Mange hadde gitt ham navnet mitt, ettersom han ønsket å samle et mannskap verdig hans nye ferd. Det er sant at jeg har et godt rykte i mange land som en dyktig sjømann. Likevel er jeg bare en handelsmann, og historier om pirater har aldri interessert meg særlig. Jeg kan ikke si nøyaktig hva som overbeviste meg, men etter noen timer rundt bordet i hans selskap gikk jeg med på å slutte meg til flåten hans. Tross alt er det ingen her som holder meg tilbake, og jeg tar meg ofte i å undre på hvilken mening livet mitt egentlig har.`,
    },
    2: {
      date: "4. mai 1717",
      text: `Morgenen var hard, og det hadde natten også vært, men jeg hadde liten tid til å tenke over det. Jeg tok med meg noen få eiendeler og skyndte meg mot det praktfulle skipet som skulle bli mitt hjem på ubestemt tid. Jeg forsto ikke helt hva jeg var i ferd med å gjøre, og kanskje var det like greit. Ingen mann trenger å tenke for mye ved begynnelsen på et nytt liv. Jeg ble raskt kjent med mine reisefeller. Noen var lokale, andre var utlendinger som hadde sluttet seg til mannskapet før meg under tidligere stopp. Kapteinen presenterte meg for de andre som mannen med ansvar for seilene. Det var en ærefull rolle, og uten å nøle ga jeg mine første ordre. Ankeret ble hevet, og jeg klatret opp i riggen for å løsne et av de sammenrullede seilene. Sjøvinden traff ansiktet mitt; luften var kald, nesten iskald der oppe. Jeg så hjemlandet mitt sakte forsvinne i det fjerne mens mennene mine arbeidet rundt meg. Kysten strakte seg bak oss. De lyse husene i byen sto tett bak murene, mens fortet ved vannkanten så ut til å våke over meg en siste gang. Farvel, mitt vakre hjemland. Jeg tok frem flasken min, fylt med min beste vin, og drakk en siste slurk til avskjed. Den hadde aldri smakt så godt som i det øyeblikket.`,
    },
    3: {
      date: "8. mai 1717",
      text: `Alle kjenner Frank. Det føles ganske merkelig å befinne meg om bord på skipet hans. Mange har gått på disse plankene før meg; noen har mistet livet, andre har flyktet, og noen få veteraner er fortsatt her ved min side. Ryktet hans går foran ham. Han er ikke redd for å ofre noe for å få det han vil ha, og man må innrømme at det virker. Det er nok derfor så mange velger å slutte seg til ham til tross for de åpenbare farene, meg selv inkludert. Løftet om eventyr og skatter er en sterk motivasjon. Når det er sagt, er oppdraget som fikk ham til å rekruttere meg, like overraskende som det er fascinerende: kjærligheten til en kvinne. Hvis det er én ting legendene aldri forteller, er det at kapteinen er en romantiker. Og likevel er hjertet hans allerede tatt. Han møtte henne for flere år siden i Frankrike. Han fortalte meg ikke navnet hennes, men sa at hun kom fra en liten by i nordøst, hvor det lages en deilig musserende drikk. Det var hans egne ord. Jeg har aldri smakt noe slikt, men han skrøt nok av den til å gi meg stor lyst til å prøve den en dag. Likevel, spør du meg, er kjærligheten hans til denne drikken sannsynligvis knyttet til følelsene han har for denne unge kvinnen. Han innrømmet at han har lett etter henne i flere år, og nylig ga en kvinne med evnen til å se syner ham opplysninger som får ham til å tro at hans elskede nå er innen rekkevidde. Jeg er ikke sikker på om jeg tror på slik trolldom, men hvem vet? Kanskje tiden vil vise at jeg tar feil. En mann som har sett så mye som ham, er nok bedre egnet til å vite at denne verden er full av mysterier og ting som ikke kan forklares.`,
    },
    4: {
      date: "12. mai 1717",
      text: `Det har nå gått flere dager siden vi la ut på havet. Været har vært godt mot oss, og sjøen rolig. Jeg begynner å forstå hva jeg har forlatt, og selv om frykten av og til sniker seg inn i tankene mine, tror jeg innerst inne at jeg ikke angrer på valget mitt. Vi seiler fredelig med vinden om bord på dette praktfulle skipet, The Shard. Jeg skulle gjerne visst hvor navnet kommer fra, for det er ingenting ved dette skipet som minner om et fragment.

Mens jeg skriver disse ordene, sitter jeg på dekk. Luften er frisk og salt. Skipet gynger rolig over bølgene mens treverket knirker uendelig under meg. Når man lytter nøye, innser man at ekte stillhet egentlig ikke finnes. Likevel er det noe merkelig hypnotiserende ved denne symfonien. Det er et merkelig liv, livet som sjømann. Ingen form for komfort kunne noen gang holde oss borte fra havet og dets skiftende humør. I natt sovner jeg kanskje gjennomvåt og kald, men selv komforten av en varm seng kunne aldri erstatte gleden som fyller meg når jeg ser mot horisonten og ikke ser annet enn verdens uendelighet.`,
    },
    5: {
      date: "18. mai 1717",
      text: `På vårt første stopp satte vi kursen mot Italia, nærmere bestemt Napoli, på jakt etter en alkymist som kalte seg «Kongen», og som visstnok hadde krysset den unge kvinnens vei for ikke lenge siden. Da skipet nærmet seg kysten, kunne vi se store skyer av grå røyk stige høyt opp mot himmelen. Jeg hadde aldri vært i Napoli, selv om jeg hadde tilbrakt en del tid i Italia tidligere, men jeg hadde hørt om den enorme vulkanen, «il Vesuvio», som alltid røykte og raget over byen. Historier om utbruddet et århundre tidligere kunne ofte høres rundt bordene på italienske vertshus. Havnen var full av liv, med handelsmenn og reisende overalt. Vi spurte oss rundt så godt vi kunne, til tross for språkbarrieren. Noen ganger fikk navnet til Kongen en umiddelbar reaksjon, med overraskede blikk og en plutselig trang til hemmelighold. Andre ganger hadde folk rett og slett ingen anelse om hvem vi snakket om. På et eller annet vis ble vi til slutt ledet inn i trange gater, mellom steinbygninger og klesvask som hang mellom fasadene, helt til vi kom frem til et fireetasjes hus, gulnet av tid og i dårlig stand. Ingenting kunne ha antydet at et slikt laboratorium skjulte seg innenfor. Rommet var fylt med flasker med væsker i merkelige farger, tett i tett på hyllene, åpne bøker, tørkede planter, destillasjonsapparater og noen få gjenstander jeg helst ikke ville vite opprinnelsen til. En liten mann sto der og så merkelig og fortapt ut, som om han ikke engang hadde lagt merke til oss. Han sto og rørte i en unaturlig grønn væske. «Er du Kongen?» spurte kapteinen. Spørsmålet fikk mannen til å smile. Han tok en slurk av den merkelige blandingen før han bekreftet hvem han var og ønsket oss velkommen inn. Selvfølgelig kjente han Frank. Som alle andre.`,
    },
    6: {
      date: "19. mai 1717",
      text: `Da vi kom inn i Kongens hjem, ba han oss forklare hvorfor vi hadde kommet. Kapteinen innrømmet da at han lette etter en kvinne, og at alkymisten, ifølge kildene hans, hadde blitt sett sammen med henne for ikke lenge siden. Kongen hadde et bredt smil om munnen mens han lyttet, og det var et merkelig lys i øynene hans. «Frank trenger Kongens hjelp … Il Re in persona! Che privilegio!» Han lo og smålo. Hele gruppen vår følte seg ukomfortabel med den overdrevne oppførselen hans, men frem til da hadde vi tross alt ingen virkelig grunn til å være bekymret. Han reiste seg og inviterte oss på noe å drikke, samtidig som han avslørte at han visste at vi ville komme, fordi han visste svært godt hva Frank følte for denne kvinnen. Nyheten sjokkerte kapteinen. Han hadde bare snakket om følelsene sine med svært få mennesker, og det virket umulig at denne alkymisten kunne vite noe om dem på naturlig vis. «Jeg ser forbi det ytre, il mio capitano.» Han helte merkelige ingredienser i en stor gryte mens han forklarte at det var han som hadde fått den unge kvinnen til Napoli, i håp om å lokke kapteinen dit. Han hevdet at han hadde hatt et syn, og at hans oppdrag var å hjelpe ham i jakten. Men ifølge ham hadde den unge kvinnen nektet å bli hos alkymisten og reist til sjøs igjen om bord på en handelsflåte som forlot kontinentet. Kapteinen ble stille, tydelig trist over nyheten. Kongen rakte oss glass fylt med en merkelig blanding som hadde en ganske behagelig lukt av mandler. En av våre kamerater grep glasset sitt raskere enn resten av oss og begynte kort tid etter å kveles. Alle spratt opp, men det var allerede for sent.

Gift!

Kongen holdt tilbake en latter og ropte: «Ditt oppdrag er å dø, Frank! Gudene vil ikke lenger ha deg på sine hav! Long live the King!» Deretter fikk han noe til å eksplodere, slik at rommet ble fylt med røyk, og han flyktet i forvirringen. Vi var fortsatt i sjokk, men kapteinen tok seg raskt sammen og satte kursen tilbake mot skipet uten engang å bekymre seg for sin falne sjømann. «Hvem er han til å tale på vegne av gudene? Min skjebne tilhører meg, og denne Kongen skal ikke stå i veien for meg.» Og slik dro vi til sjøs igjen, i stillhet. Det virker som om denne jakten blir mindre fredelig enn jeg først hadde trodd …`,
    },
  },
};

const LOGBOOK_PAGE_POSITIONS = [
  ["50%", "50%"],
  ["48%", "47%"],
  ["52%", "51%"],
  ["46%", "54%"],
  ["54%", "49%"],
  ["50%", "56%"],
];

function getInitialLogbookPage() {
  const params = new URLSearchParams(window.location.search);
  const entry = Number.parseInt(params.get("entry") || "", 10);

  if (Number.isInteger(entry) && entry >= 1 && entry < LOGBOOK_PAGES.length) {
    return entry + 1;
  }

  return 1;
}

let logbookPage = getInitialLogbookPage();
let touchStartX = 0;
let touchStartY = 0;
let ignoreNextSheetClick = false;
let logbookZoom = 1;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLogbookLanguage() {
  const language = window.MaelstromI18n?.language;
  return language === "fr" || language === "no" ? language : "en";
}

function getLocalizedLogbookPage(page) {
  if (!page || page.cover) {
    return page;
  }

  const entryNumber = logbookPage - 1;
  const localizedPage = LOGBOOK_TRANSLATIONS[getLogbookLanguage()]?.[entryNumber];
  return localizedPage ? { ...page, ...localizedPage } : page;
}

function applyLogbookZoom() {
  const clampedZoom = Math.min(Math.max(logbookZoom, 0.85), 1.45);
  logbookZoom = clampedZoom;

  document.documentElement.style.setProperty("--logbook-zoom", clampedZoom.toFixed(2));

  if (logbookZoomReset) {
    logbookZoomReset.textContent = `${Math.round(clampedZoom * 100)}%`;
  }

  if (logbookZoomOut) {
    logbookZoomOut.disabled = clampedZoom <= 0.85;
  }

  if (logbookZoomIn) {
    logbookZoomIn.disabled = clampedZoom >= 1.45;
  }
}

function renderLogbookPage() {
  const basePage = LOGBOOK_PAGES[logbookPage - 1];
  const page = getLocalizedLogbookPage(basePage);

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
        <img src="assets/logbook-chapter-one-emblem.webp" alt="Long live the King" decoding="async" draggable="false" />
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
  const illustrationClass = page.illustration?.variant
    ? ` logbook-entry-illustration-${escapeHtml(page.illustration.variant)}`
    : "";
  const entryClass = page.illustration?.variant === "side" ? " logbook-entry-with-side-art" : "";
  const illustration = page.illustration
    ? `<span class="logbook-entry-illustration-wrap${illustrationClass}" style="--illustration-mask: url('${escapeHtml(page.illustration.src)}');"><img class="logbook-entry-illustration" src="${escapeHtml(page.illustration.src)}" alt="${escapeHtml(page.illustration.alt)}" decoding="async" draggable="false" /></span>`
    : "";

  logbookSheet.innerHTML = `
    <article class="logbook-entry${entryClass}">
      <time>${escapeHtml(page.date)}</time>
      <div>${paragraphs}</div>
      ${illustration}
    </article>
  `;
}

logbookButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    changeLogbookPage(1);
  });
});

logbookPrevButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    changeLogbookPage(-1);
  });
});

logbookZoomControls?.addEventListener("click", (event) => {
  event.stopPropagation();
});

logbookZoomIn?.addEventListener("click", (event) => {
  event.stopPropagation();
  logbookZoom += 0.1;
  applyLogbookZoom();
});

logbookZoomOut?.addEventListener("click", (event) => {
  event.stopPropagation();
  logbookZoom -= 0.1;
  applyLogbookZoom();
});

logbookZoomReset?.addEventListener("click", (event) => {
  event.stopPropagation();
  logbookZoom = 1;
  applyLogbookZoom();
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

logbookSheet?.addEventListener("click", (event) => {
  if (ignoreNextSheetClick) {
    ignoreNextSheetClick = false;
    return;
  }

  const rect = logbookSheet.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  changeLogbookPage(clickX < rect.width / 2 ? -1 : 1);
});

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

    ignoreNextSheetClick = true;
    changeLogbookPage(deltaX < 0 ? 1 : -1);
  },
  { passive: true },
);

window.addEventListener("maelstrom:languagechange", renderLogbookPage);

applyLogbookZoom();
renderLogbookPage();
