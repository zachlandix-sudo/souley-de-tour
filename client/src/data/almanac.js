// The Southern Leyte Almanac: the "Did you know?" entries on the Experience page.
//
// Where the facts come from: the place facts (steps, depths, heights, names) are copied from this project's own spot data
// (server/src/seed/data/southern-leyte-spots.json, which keeps its source links); the province facts (dates, laws, numbers)
// were checked against the Wikipedia pages for Southern Leyte, Maasin and the First Mass, and a 2014 Philstar article on Sogod Bay.
// Where sources disagree (the highest peak) the entry says so instead of picking one.
// Keep every question under 95 characters and every answer under 240, so the flip cards never clip (almanac.test.js checks it).
// Text is plain English like the other data files; the page looks it up with tx() so a translation can be added later.

export const THEMES = {
  history: { label: 'History', tint: '#f0b56a' },
  sea: { label: 'Sea & diving', tint: '#3fb6c9' },
  falls: { label: 'Falls & caves', tint: '#5fd3a6' },
  peaks: { label: 'Peaks & lakes', tint: '#7f95c4' },
  faith: { label: 'Faith & heritage', tint: '#ff8a4c' },
  numbers: { label: 'By the numbers', tint: '#e9d28a' },
  tips: { label: 'Good to know', tint: '#d98bb8' },
};

// The six original cards stay first, so the page opens the way it always did.
const LEAD = [
  { theme: 'history', q: 'Where is the first Mass in the Philippines officially remembered?', a: 'On Limasawa Island. The government recognises it as the site of the first Mass in 1521, and the island keeps a shrine, a cross and a quiet lagoon.' },
  { theme: 'sea', q: 'Which bay is the diver’s playground of Southern Leyte?', a: 'Sogod Bay. Reefs, walls and marine sanctuaries line its shores around Padre Burgos and Pintuyan.' },
  { theme: 'faith', q: 'Which city is the provincial capital, and what is up the hill?', a: 'Maasin City. Its cathedral sits in town, and above it the Monte Cueva shrine, forest air and a bird park wait for a slow day.' },
  { theme: 'falls', q: 'Why pack swimwear for a waterfall day?', a: 'Because the chase ends at the sea: Kagut-an Falls, Tubod Falls and Cave, Seven Falls in Macrohon, then Silago Beach.' },
  { theme: 'peaks', q: 'Where do you find a mountain called Nacolod?', a: 'In Hinunangan, a town that also offers San Pedro Island and Golden Sand Beach on the same stretch of coast.' },
  { theme: 'tips', q: 'What is the golden rule at a marine sanctuary?', a: 'Look, do not touch. Bring a snorkel and reef-safe sunscreen, stay off the coral and take every bit of trash back with you.' },
];

const MORE = {
  history: [
    { q: 'On what day is the first Mass in the Philippines remembered?', a: 'March 31, 1521, an Easter Sunday, on Limasawa. Pigafetta, who chronicled Magellan’s voyage, called the island “Mazaua”. Limasawa marks the day every year with a program called Sinugdan, “the beginning”.' },
    { q: 'Which 1960 law made Limasawa a national shrine?', a: 'Republic Act 2733, nicknamed the “Limasawa Law”. It names the Magallanes site on the island as a national shrine for the first Mass.' },
    { q: 'Who reaffirmed Limasawa as the first Mass site in 2020?', a: 'The National Historical Commission of the Philippines. A panel led by historian Resil Mojares found the evidence for Butuan insufficient, and the commission’s position is dated August 19, 2020.' },
    { q: 'When did Southern Leyte become a province of its own?', a: 'Republic Act 2227 was signed on May 22, 1959 and the province was inaugurated on July 1, 1960. It was split from Leyte, started with sixteen towns and has had Maasin as its capital since.' },
    { q: 'When did Maasin become a city?', a: 'In 2000. Maasin celebrates its Charter Day on August 10, and the city today has 70 barangays.' },
    { q: 'How did Maasin get its name?', a: 'A local story says Spaniards looking for drinking water near the Canturing River asked what the place was called. Locals answered “maasin”, meaning salty, thinking they were asked about the taste.' },
    { q: 'What did Japanese soldiers use Pelada Rock for in World War II?', a: 'As a camp. The big rock just off the Silago coast, between Laguma and Salvacion, is now left to nesting birds.' },
    { q: 'What is left of the baluarte in Malitbog?', a: 'Two ruined 18th-century watchtowers, one north and one south of the town centre. The northern one, in Abgao, still has inscriptions on its stone walls.' },
  ],
  sea: [
    { q: 'Which sanctuary was the first marine protected area in Sogod Bay?', a: 'Napantao in San Francisco, set up in 2002 with Coral Cay Conservation. It is a reef wall across the bay from Padre Burgos, split into a north and a south section.' },
    { q: 'Where do whale sharks turn up, and when?', a: 'Most often at Son-ok Marine Sanctuary in Pintuyan, roughly October to April. Locals call them “tiki-tiki”. They are sometimes seen at Napantao and Tangka-an Point too.' },
    { q: 'How many kinds of hard coral live in Sogod Bay?', a: 'More than 150 species, according to a 2014 report on the bay. Hawksbill and green turtles, groupers and sweetlips share the reefs.' },
    { q: 'Which dive site is a working pier?', a: 'Padre Burgos Pier, 150 m long and regarded as one of the best night dives in the Philippines. Divers have it on Mondays, Wednesdays and Fridays, as listed; anglers use it on other days.' },
    { q: 'What is Little Lembeh?', a: 'A muck-diving site about 30 minutes by boat north of Padre Burgos: stilt huts above black sand, with pipefish, seahorses, pegasus fish and nudibranchs.' },
    { q: 'Where can you feed fish a few steps from the highway?', a: 'Molopolo Fish and Bird Sanctuary in Macrohon. You can also boat through mangroves and see a sea turtle hatching ground. It won third prize for Best Marine Protected Area in the Philippines in 2013.' },
    { q: 'Which sea cave do you enter by boat?', a: 'Naputjukan Underwater Cave in Hinundayan: about 200 square metres, with a white-sand beach and stalagmites inside. You enter by banca through an opening that faces the sea.' },
    { q: 'Which town is promoted as the surfing capital of Southern Leyte?', a: 'Silago. Its fine brown-sand beach runs about 1 km at the mouth of the Lanang River, and a surfing camp welcomes beginners and intermediates.' },
    { q: 'What can you see from Hinunangan’s Golden Sand Beach?', a: 'The twin islands of San Pedro and San Pablo, across about 6 km of powdery golden sand. Both islands have white beaches and coral.' },
    { q: 'What is the dive at Tangka-an Point like?', a: 'A marine protected area near the mouth of Sogod Bay: a soft-coral slope to about 27 m with barrel sponges and gorgonian fans, plus frogfish, turtles and the occasional whale shark.' },
    { q: 'Why do macro divers like Santa Sofia?', a: 'A gentle hard-coral slope runs down to a sandy bottom around 25 m, with nudibranchs, pygmy seahorses, scorpionfish and hawksbill turtles.' },
  ],
  falls: [
    { q: 'Where is the caving capital of Southern Leyte?', a: 'Cambaro Cave in Macrohon is billed as one: more than 100 caves with rock formations, cave corals and tunnels, reached after a mountain trek.' },
    { q: 'How many waterfalls can you see around Catbawan?', a: 'Seven different waterfalls within less than an hour, along green, challenging trails in Pintuyan.' },
    { q: 'Which falls drop about 60 metres in Sogod?', a: 'Lum-an Falls and Mahayhay Falls, close together beyond Magsuhot Park. Magsuhot itself is a forested park of about 500 hectares with 20 m falls into one basin.' },
    { q: 'Which waterfall has a cave on the opposite side?', a: 'Tubod Falls in Silago, a distinctively shaped fall that joins the Lanang River downstream.' },
    { q: 'Which falls trek uses rappelling and bamboo ladders?', a: 'Uwan-Uwanan Falls in Libagon, a gorge adventure of about two hours along cascades.' },
    { q: 'Where can you wade or swim into a cave with a waterfall inside?', a: 'Guinsohotan Cave in Maasin, about 15 km from the city centre, with bats and stalactites. Following the underground river from Cagnito-an Falls leads to it.' },
    { q: 'Which falls have waterslides built into the pools?', a: 'Hindag-an Falls and Forest Park in Saint Bernard: cascading falls feed man-made pools, with cottages and barbecue areas nearby.' },
    { q: 'What do “dako” and “gamay” mean in Kagut-an Dako and Gamay Falls?', a: 'Big and small in Cebuano. They are companions to Kagut-an Falls, which is about 1 km from the national highway in Silago.' },
    { q: 'Where is a cold-spring pool only 13 km from Maasin?', a: 'Banahaw Cold Spring in Macrohon, 20 to 30 minutes from the city. It has day cottages, a barbecue area and a restaurant.' },
  ],
  peaks: [
    { q: 'Where is the crater lake of Southern Leyte?', a: 'Lake Danao, near the top of Mt. Cabalian on the border of San Juan and Anahawan. A demanding forest trek leads to its blue-green volcanic water.' },
    { q: 'Where can you soak in a sulfur hot spring on a volcano?', a: 'Mainit Hot Spring in Anahawan, on Mt. Cabalian. The water measures about 63 to 64 °C, and locals believe it is medicinal.' },
    { q: 'How high is Mount Nacolod?', a: 'About 948 m, above Hinunangan. Some sources name Mount Bitanjuan, at 965 m, as the province’s highest point, so the title depends on who you ask.' },
    { q: 'What was Camp Danao before it was a forest park?', a: 'A Boy Scouts jamboree site. Today it covers 320 hectares at about 1,099 ft, with a lagoon, a cave, trails and a 360-degree viewing deck. A small zoo sits inside.' },
    { q: 'How high is the Agas-Agas Bridge?', a: 'About 89 m above the gorge and about 350 m long, on the Pan-Philippine Highway in Sogod. A twin zipline of about 880 m has glided above it since April 2011.' },
    { q: 'Which is the biggest river in the province?', a: 'The Subangdaku River in Sogod. Southern Leyte has 93 rivers, 18 of them major.' },
    { q: 'Which waters touch the coasts of Southern Leyte?', a: 'The Surigao Strait to the east, the Bohol Sea to the south and the Canigao Channel to the west. Leyte is the only land neighbour, to the north.' },
  ],
  faith: [
    { q: 'Which climb has the most steps: Monte Cueva, Magellan’s Cross or Mama Mary?', a: 'Monte Cueva, with about 550 concrete steps up to a chapel in a cave. The Magellan’s Cross replica on Limasawa takes 450, and the Mama Mary Shrine at Jalleca Hills just over 300.' },
    { q: 'What is the official name of Monte Cueva?', a: 'The Shrine of the Most Precious Blood. It is a chapel built inside a cave, with a 30 ft statue of Our Lady of the Assumption above the Via Crucis.' },
    { q: 'How old is Maasin Cathedral?', a: 'Its roots go back to the 17th century, and the current building was completed in 1968. It is the largest and oldest church in the city and the seat of the Diocese of Maasin.' },
    { q: 'When was the Diocese of Maasin created?', a: 'On August 14, 1968, with Vicente Ataviado as its first bishop. It covers all of Southern Leyte and six towns in Leyte.' },
    { q: 'Where is a shrine on a tiny islet reached by pumpboat?', a: 'The Sto. Niño Shrine on Pagatpat Islet in Maasin: a 10-minute walk from the national highway to Sitio Pangpang, then a short pumpboat ride.' },
    { q: 'What does Abiera’s Museum hold?', a: 'The private collection of Salvador “Boy” Abiera in Maasin: ancient artifacts, fossils, a burial jar, Chinese porcelain, old weapons, shells and preserved wildlife.' },
    { q: 'What is special inside Santo Niño Parish Church in Malitbog?', a: 'A ceiling painted with religious motifs, behind a facade in a local Filipino style.' },
    { q: 'Why is Guinsaugon a quiet stop?', a: 'It is the memorial site of the February 2006 landslide that buried the village, now a national park. Visitors light candles, and the last stretch is on foot.' },
  ],
  numbers: [
    { q: 'How many towns does Southern Leyte have?', a: '18 municipalities and one component city, Maasin, with 500 barangays in all.' },
    { q: 'How big is the province?', a: '1,798.61 square kilometres, which ranks 65th among the 82 provinces of the Philippines.' },
    { q: 'How many people live in Southern Leyte?', a: '434,372 at the 2024 census, which makes it the second least populous province in Eastern Visayas, after Biliran.' },
    { q: 'How big is Maasin City?', a: 'About 211.7 square kilometres, with 70 barangays and 85,486 people at the 2024 census. The town sits at about 77 m, and the city’s highest point is 704 m.' },
    { q: 'Which languages do people speak here?', a: 'Mostly a Boholano variant of Cebuano. Kinabalian is spoken in San Juan and Anahawan, and Baybayanon too. Tagalog and English are common second languages.' },
    { q: 'Which town is called the rice granary of the province?', a: 'Hinunangan. The province is also a notable producer of abaca fibre.' },
    { q: 'How long is the ferry from Liloan to Surigao del Norte?', a: 'About three hours. It is the sea link between Southern Leyte and Mindanao.' },
    { q: 'How much rain does Maasin get in a year?', a: 'About 2,339 mm on average (1991 to 2020), so a light rain jacket is never wasted.' },
  ],
  tips: [
    { q: 'What should you bring to Tangkaan Beach?', a: 'Your own food. It is a white coral-sand beach with rock formations and a view across to Limasawa, good for families and a frequent snorkel spot.' },
    { q: 'How far is Dakdak Beach from the port on Limasawa?', a: 'About 10 minutes from Triana port. It has cream-coloured sand, open-air huts and a small restaurant.' },
    { q: 'What do you need to arrange before El Paraiso Beach in Liloan?', a: 'A reservation. The beach rents out houses and asks guests to book first.' },
    { q: 'How do you reach Alejos Falls in Bontoc?', a: 'About 30 minutes by vehicle from the main road to Dao, then a 35-minute trek to falls with cold, bluish water.' },
    { q: 'What should you know before diving the house reef at Max Climax?', a: 'It is a wall from about 8 m down to 45 m. Currents can be strong and the shore entry is rough.' },
    { q: 'Where is a good spot to watch the sunset on Limasawa?', a: 'Totoy Peak, a viewpoint about 30 minutes from Triana, known for sunsets and views of the sea and nearby barangays.' },
  ],
};

// Entries are shown in one almanac order: the six originals, then one entry from each theme in turn, so neighbours differ.
function build() {
  const order = Object.keys(THEMES);
  const lists = order.map((theme) => (MORE[theme] || []).map((f) => ({ ...f, theme })));
  const out = [...LEAD];
  for (let i = 0; lists.some((l) => i < l.length); i += 1) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out.map((f, i) => ({ ...f, id: i + 1, no: String(i + 1).padStart(2, '0') }));
}

export const FACTS = build();

// Dates worth marking, with the year they happened. Used for the "On the calendar" list.
export const CALENDAR = [
  { m: 3, d: 31, y: 1521, text: 'The first Mass is remembered on Limasawa Island.' },
  { m: 5, d: 22, y: 1959, text: 'Republic Act 2227 is signed, creating the province.' },
  { m: 6, d: 19, y: 1960, text: 'The Limasawa Law (Republic Act 2733) is enacted.' },
  { m: 7, d: 1, y: 1960, text: 'Southern Leyte is inaugurated, with Maasin as its capital.' },
  { m: 8, d: 10, y: 2000, text: 'Maasin celebrates its Charter Day as a city.' },
  { m: 8, d: 14, y: 1968, text: 'The Diocese of Maasin is created.' },
];
