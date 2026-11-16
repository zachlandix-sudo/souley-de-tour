// Writes the reply to a visitor's question from the spot records, in the language the question was asked in
// (English, Filipino or Bisaya). Used when no AI model is connected, and for questions where the exact facts matter
// (fees, opening days, how long...), which are always answered from the records and never from a model.
// Pure functions: no database, no network. Filipino and Bisaya texts are first drafts for native-speaker review.
//
// A "spot" here is a plain object built by aiService (factsOf):
//   { id, name, town, barangay, address, short, kind: 'spot'|'food', entryType, activities[], fee, budget, duration, bestTime,
//     openDays, bestMonths, hours, difficulty, accessibility, bring[], safety[], contact:{name,phone,email}, lat, lng, hits[], km }

const L = {
  en: {
    greeting: "Hi! I'm SOULEY, your guide to Southern Leyte. Ask me about waterfalls, beaches, diving or food, or tell me how many days you have and I'll plan the trip.",
    thanks: "You're welcome! Ask me anything else about Southern Leyte, or tell me your dates and I'll plan a trip.",
    bye: 'Safe travels! Come back any time you need ideas for Southern Leyte.',
    aboutBot: "I'm SOULEY, the guide on this site. I answer from the places listed here: I can recommend spots by town, activity or budget, tell you fees, opening days, best months and what to bring, and plan trips from 1 to 50 days. Just type your question.",
    offtopic: "That one is outside what I can help with. I know Southern Leyte's places, food and trip planning. Try one of these:",
    offarea: "I only cover Southern Leyte, so I can't help with that place. If you're coming to Southern Leyte, try one of these:",
    unclear: "I'm not sure what you're after yet, so here are a few favourites to start with. Tell me what you like (beaches, waterfalls, food, history) or how many days you have, and I'll narrow it down.",
    samples: ['Best waterfalls in Southern Leyte', 'A relaxed 2-day trip around Maasin', 'Where can I eat in Sogod?', 'Family-friendly beaches under ₱1,000'],
    acts: { waterfall: 'waterfalls', cave: 'caves', snorkeling: 'snorkeling', diving: 'diving', swimming: 'swimming', beach: 'beaches', island: 'islands', 'whale shark': 'whale shark watching', hiking: 'hiking', kayaking: 'kayaking', camping: 'camping', surfing: 'surfing', heritage: 'heritage and churches', photography: 'scenic views', relaxing: 'a relaxing time', adventure: 'adventure', wildlife: 'nature and wildlife', 'hot spring': 'hot springs' },
    groups: { family: 'families', couple: 'couples', solo: 'solo travelers', friends: 'friends', senior: 'seniors', pwd: 'easy access' },
    groupChip: { family: 'Family', couple: 'Couple', solo: 'Solo', friends: 'Friends', senior: 'Seniors', pwd: 'Easy access' },
    diff: { easy: 'easy', moderate: 'moderate', hard: 'challenging' },
    askChip: { cost: 'Prices', hours: 'Opening days', season: 'Best time', duration: 'How long', howto: 'Getting there', bring: 'What to bring', safety: 'Safety', contact: 'Contact', difficulty: 'Difficulty', accessibility: 'Accessibility', stay: 'Where to stay', about: 'About' },
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    chip: { trip: 'Trip plan', days: (n) => `${n} day${n === 1 ? '' : 's'}`, relaxed: 'Relaxed', balanced: 'Balanced', packed: 'Packed', up: (n) => `Up to ₱${fmt(n)}`, cheap: 'Budget-friendly', food: 'Food', people: (n) => `${n} people`, rank: { best: 'Top picks', cheap: 'Cheapest first', hidden: 'Hidden gems' } },
    kinds: { restaurant: 'Restaurant', cafe: 'Café', bakery: 'Bakery', fast_food: 'Fast food', food_shop: 'Food shop', restobar: 'Resto-bar', eatery: 'Eatery', food_stall: 'Food stall', market: 'Market' },
    what: (n, o) => (o.food ? (o.foodKind === 'cafe' ? 'cafés' : o.foodKind === 'bakery' ? 'bakeries' : 'places to eat') : o.acts ? `places for ${o.acts}` : 'places to visit'),
    lead: (n) => (n === 1 ? 'Here is 1' : `Here are ${n}`),
    leadWhat: (n, w) => (n === 1 ? w.replace(/^places/, 'place').replace(/^cafés/, 'café').replace(/^bakeries/, 'bakery') : w),
    where: (town, area) => (town ? ` in ${town}` : area ? ` around ${area}` : ''),
    who: (g) => (g ? `, good for ${g}` : ''),
    limit: (b, d, m) => [b ? `within ₱${fmt(b)}` : '', d === 'easy' ? 'easy to do' : d === 'hard' ? 'for a challenge' : '', m ? `best in ${m}` : ''].filter(Boolean).map((x) => `, ${x}`).join(''),
    top: (name, town, extra) => `My top pick is ${name}${town ? ` (${town})` : ''}${extra ? `: ${extra}` : '.'}`,
    also: (names) => `Also worth a look: ${names}.`,
    noAct: (acts, town) => `I couldn't find ${acts} listed in ${town}, so these are the closest matches I have.`,
    noTown: (town) => `I don't have places listed in ${town} yet, so here are good options nearby.`,
    fewOnly: 'That is everything I have listed for that right now.',
    noPriceData: 'Most places have no listed price yet, so I cannot rank them by cost. Please confirm costs on arrival.',
    budgetNote: 'Places with no listed price are included, so please confirm the cost on arrival.',
    foodNote: 'Food places come from a basic listing: please confirm opening hours before you go.',
    nextPlan: 'Want a day-by-day plan? Tell me how many days you have.',
    perCard: 'The details you asked about are on each card below.',
    moreNone: "I've shown you everything that fits. Try changing the town, the activity or the budget.",
    needs: 'Needs',
    // facts
    f: { fee: 'Entrance', budget: 'Estimated budget', duration: 'Time needed', bestTime: 'Best time', bestMonths: 'Best months', openDays: 'Open', hours: 'Hours', difficulty: 'Difficulty', accessibility: 'Access', address: 'Where', bring: 'Bring', safety: 'Safety', contact: 'Contact', about: 'About', activities: 'Things to do', distance: 'Distance', map: 'Directions', listing: 'From the listing', none: 'not listed yet', daily: 'every day (no closing days listed)', allYear: 'all year (no best months listed)' },
    factsLead: (n, name) => (n === 1 ? `Here is what I have on ${name}:` : 'Here is what I have on these places:'),
    confirm: 'Fees, hours and conditions can change, so please confirm with the local tourism office before you go.',
    asListed: '(as listed, please confirm on arrival)',
    straight: (km, from) => `roughly ${km} km in a straight line from ${from} (approximate, and the road is longer)`,
    transport: "I don't have bus, van or ferry schedules. Open the map link and tap Directions for the road route from where you are.",
    cmpLead: (a, b) => `${a} vs ${b}:`,
    cmpCheaper: (n, a, b) => `Cheaper: ${n} (₱${fmt(a)} vs ₱${fmt(b)})`,
    cmpEasier: (n, a, b) => `Easier: ${n} (${a} vs ${b})`,
    cmpShorter: (n, a, b) => `Quicker visit: ${n} (${a} vs ${b})`,
    cmpSame: 'On the details I have, they are very close, so it comes down to what you want to do there.',
    stayNone: "I don't have hotel or resort listings yet, so I can't recommend where to stay. Places that mention an overnight stay or camping:",
    stayNone2: "I don't have hotel or resort listings yet, and no place in my list mentions an overnight stay. Please check with the local tourism office.",
    nearLead: (name) => `Closest to ${name}:`,
    nearNone: (name) => `I don't have a location for ${name}, so I can't tell what is close by.`,
    nearTown: (name, town) => `I only have the town centre of ${town} as the location of ${name}, so I can't measure what is closest. Other places in ${town}:`,
    // trips
    tripLead: (days, pace, where, who) => `Here's a ${pace} ${days}-day plan${where}${who}.`,
    tripDay: (n, names) => `Day ${n}: ${names}.`,
    tripMore: (n) => `…and ${n} more day${n === 1 ? '' : 's'} on the board.`,
    tripSpend: (total, budget) => (budget ? (total <= budget ? `Estimated spend is about ₱${fmt(total)}, within your ₱${fmt(budget)}.` : `Estimated spend is about ₱${fmt(total)}, a little over your ₱${fmt(budget)}. Ask me to make it cheaper if you like.`) : `Estimated spend is about ₱${fmt(total)} (places with no listed price count as 0).`),
    tripNoPrice: 'No prices are listed for these places yet, so please confirm costs on arrival.',
    tripNoPriceB: (b) => `No prices are listed for these places yet, so I can't check them against your ₱${fmt(b)}. Please confirm costs on arrival.`,
    tripShort: (planned, asked) => `I could only fill ${planned} of ${asked} days without repeating a place. More places are added over time.`,
    tripPace: { relaxed: 'relaxed', balanced: 'balanced', packed: 'packed' },
    tripEnd: 'You can change the pace, budget or dates below.',
    meal: 'meal stop',
    // reasons
    matches: (labels) => `Matches your search for ${labels}.`,
    inTown: (t) => `In ${t}.`,
    aroundBudget: (n) => `Around ₱${fmt(n)}.`,
    takes: (d) => `Plan about ${d}.`,
    // suggestions
    s: {
      cost: (n) => `How much is ${n}?`, bring: (n) => `What should I bring to ${n}?`, best: (n) => `Best time to visit ${n}?`, eat: (n) => `Where can I eat near ${n}?`,
      plan: (d, t) => `Plan ${d} days${t ? ` in ${t}` : ''}`, near: (n) => `What else is near ${n}?`, cmp: (a, b) => `Compare ${a} and ${b}`, cheaper: 'Show me cheaper options', more: 'Show me more',
      relaxed: 'Make it more relaxed', food: 'Add more food stops', how: (n) => `How do I get to ${n}?`,
    },
  },

  fil: {
    greeting: 'Kumusta! Ako si SOULEY, gabay mo sa Southern Leyte. Itanong mo ang tungkol sa talon, dalampasigan, diving o pagkain, o sabihin kung ilang araw ang meron ka at ako na ang magplano ng biyahe.',
    thanks: 'Walang anuman! Magtanong lang ulit tungkol sa Southern Leyte, o sabihin ang petsa mo at ipaplano ko ang biyahe.',
    bye: 'Ingat sa biyahe! Balik ka lang kapag kailangan mo ng ideya sa Southern Leyte.',
    aboutBot: 'Ako si SOULEY, ang gabay ng website na ito. Sumasagot ako mula sa mga lugar na nakalista rito: puwede akong magrekomenda ayon sa bayan, aktibidad o badyet, magsabi ng bayad, araw ng bukas, pinakamagandang buwan at dadalhin, at magplano ng biyaheng 1 hanggang 50 araw. I-type lang ang tanong mo.',
    offtopic: 'Hindi ko iyan matutulungan. Ang alam ko ay ang mga lugar, pagkain at plano ng biyahe sa Southern Leyte. Subukan ang isa sa mga ito:',
    offarea: 'Southern Leyte lang ang saklaw ko, kaya hindi ko matutulungan ang lugar na iyan. Kung pupunta ka sa Southern Leyte, subukan ang isa sa mga ito:',
    unclear: 'Hindi ko pa sigurado ang hinahanap mo, kaya narito ang ilang paborito para magsimula. Sabihin mo kung ano ang gusto mo (dalampasigan, talon, pagkain, kasaysayan) o ilang araw ang meron ka, at paliliitin ko ang listahan.',
    samples: ['Pinakamagagandang talon sa Southern Leyte', 'Relaxed na 2-araw na biyahe sa Maasin', 'Saan puwedeng kumain sa Sogod?', 'Dalampasigan para sa pamilya, hanggang ₱1,000'],
    acts: { waterfall: 'talon', cave: 'yungib', snorkeling: 'snorkeling', diving: 'diving', swimming: 'paglangoy', beach: 'dalampasigan', island: 'isla', 'whale shark': 'butanding', hiking: 'pag-hiking', kayaking: 'kayaking', camping: 'camping', surfing: 'surfing', heritage: 'simbahan at kasaysayan', photography: 'magagandang tanawin', relaxing: 'pagpapahinga', adventure: 'adventure', wildlife: 'kalikasan at wildlife', 'hot spring': 'mainit na bukal' },
    groups: { family: 'pamilya', couple: 'magkasintahan', solo: 'mag-isang bumibiyahe', friends: 'barkada', senior: 'senior', pwd: 'madaling puntahan' },
    groupChip: { family: 'Pamilya', couple: 'Magkasintahan', solo: 'Mag-isa', friends: 'Barkada', senior: 'Senior', pwd: 'Madaling puntahan' },
    diff: { easy: 'madali', moderate: 'katamtaman', hard: 'mahirap' },
    askChip: { cost: 'Presyo', hours: 'Araw ng bukas', season: 'Pinakamagandang panahon', duration: 'Gaano katagal', howto: 'Paano pumunta', bring: 'Dadalhin', safety: 'Kaligtasan', contact: 'Contact', difficulty: 'Hirap', accessibility: 'Accessibility', stay: 'Matutuluyan', about: 'Tungkol dito' },
    months: ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'],
    chip: { trip: 'Plano ng biyahe', days: (n) => `${n} araw`, relaxed: 'Hindi minamadali', balanced: 'Katamtaman', packed: 'Puno ang iskedyul', up: (n) => `Hanggang ₱${fmt(n)}`, cheap: 'Mura', food: 'Pagkain', people: (n) => `${n} katao`, rank: { best: 'Pinakamaganda', cheap: 'Pinakamura muna', hidden: 'Tagong yaman' } },
    kinds: { restaurant: 'Restawran', cafe: 'Café', bakery: 'Panaderya', fast_food: 'Fast food', food_shop: 'Tindahan ng pagkain', restobar: 'Resto-bar', eatery: 'Kainan', food_stall: 'Puwesto ng pagkain', market: 'Palengke' },
    what: (n, o) => (o.food ? (o.foodKind === 'cafe' ? 'café' : o.foodKind === 'bakery' ? 'panaderya' : 'lugar na makakainan') : o.acts ? `lugar para sa ${o.acts}` : 'lugar na puwedeng puntahan'),
    lead: (n) => `Narito ang ${n}`,
    leadWhat: (n, w) => w,
    where: (town, area) => (town ? ` sa ${town}` : area ? ` sa paligid ng ${area}` : ''),
    who: (g) => (g ? `, bagay sa ${g}` : ''),
    limit: (b, d, m) => [b ? `hanggang ₱${fmt(b)}` : '', d === 'easy' ? 'madaling gawin' : d === 'hard' ? 'para sa hamon' : '', m ? `maganda tuwing ${m}` : ''].filter(Boolean).map((x) => `, ${x}`).join(''),
    top: (name, town, extra) => `Ang una kong pinipili ay ang ${name}${town ? ` (${town})` : ''}${extra ? `: ${extra}` : '.'}`,
    also: (names) => `Sulit ding silipin: ${names}.`,
    noAct: (acts, town) => `Wala akong nakitang ${acts} sa ${town}, kaya ito ang pinakamalapit na tugma na meron ako.`,
    noTown: (town) => `Wala pa akong nakalistang lugar sa ${town}, kaya narito ang magagandang opsyon sa malapit.`,
    fewOnly: 'Iyan na ang lahat ng nakalista ko para riyan sa ngayon.',
    noPriceData: 'Karamihan sa mga lugar ay wala pang nakalistang presyo, kaya hindi ko sila maisaayos ayon sa gastos. Pakikumpirma ang gastos pagdating.',
    budgetNote: 'Kasama ang mga lugar na walang nakalistang presyo, kaya pakikumpirma ang gastos pagdating.',
    foodNote: 'Basic na listahan lang ang meron ako sa mga kainan: pakikumpirma ang oras ng bukas bago pumunta.',
    nextPlan: 'Gusto mo ng plano kada araw? Sabihin kung ilang araw ang meron ka.',
    perCard: 'Nasa bawat card sa ibaba ang mga detalyeng itinanong mo.',
    moreNone: 'Naipakita ko na ang lahat ng angkop. Subukang palitan ang bayan, aktibidad o badyet.',
    needs: 'Kailangan',
    f: { fee: 'Bayad sa pagpasok', budget: 'Tinatayang gastos', duration: 'Oras na kailangan', bestTime: 'Pinakamagandang oras', bestMonths: 'Pinakamagandang buwan', openDays: 'Bukas', hours: 'Oras', difficulty: 'Hirap', accessibility: 'Access', address: 'Saan', bring: 'Dalhin', safety: 'Kaligtasan', contact: 'Contact', about: 'Tungkol dito', activities: 'Puwedeng gawin', distance: 'Layo', map: 'Direksyon', listing: 'Mula sa paglalarawan', none: 'wala pang nakalista', daily: 'araw-araw (walang nakalistang araw ng sarado)', allYear: 'buong taon (walang nakalistang buwan)' },
    factsLead: (n, name) => (n === 1 ? `Narito ang meron ako tungkol sa ${name}:` : 'Narito ang meron ako tungkol sa mga lugar na ito:'),
    confirm: 'Puwedeng magbago ang bayad, oras at kondisyon, kaya pakikumpirma sa lokal na tourism office bago pumunta.',
    asListed: '(ayon sa listahan, pakikumpirma pagdating)',
    straight: (km, from) => `humigit-kumulang ${km} km nang tuwid na linya mula sa ${from} (tantiya lang, at mas mahaba ang daan)`,
    transport: 'Wala akong iskedyul ng bus, van o ferry. Buksan ang link ng mapa at pindutin ang Directions para sa daan mula sa kinaroroonan mo.',
    cmpLead: (a, b) => `${a} laban sa ${b}:`,
    cmpCheaper: (n, a, b) => `Mas mura: ${n} (₱${fmt(a)} kumpara sa ₱${fmt(b)})`,
    cmpEasier: (n, a, b) => `Mas madali: ${n} (${a} kumpara sa ${b})`,
    cmpShorter: (n, a, b) => `Mas maikling pagbisita: ${n} (${a} kumpara sa ${b})`,
    cmpSame: 'Sa mga detalyeng meron ako, halos magkapareho sila, kaya nasa gusto mong gawin doon ang pagpili.',
    stayNone: 'Wala pa akong listahan ng hotel o resort, kaya hindi ako makapagrekomenda kung saan tutuloy. Mga lugar na may nabanggit na overnight o camping:',
    stayNone2: 'Wala pa akong listahan ng hotel o resort, at walang lugar sa listahan ko na may overnight. Pakitanong sa lokal na tourism office.',
    nearLead: (name) => `Pinakamalapit sa ${name}:`,
    nearNone: (name) => `Wala akong lokasyon ng ${name}, kaya hindi ko masabi kung ano ang malapit.`,
    nearTown: (name, town) => `Sentro lang ng bayan ng ${town} ang meron akong lokasyon ng ${name}, kaya hindi ko masukat kung ano ang pinakamalapit. Iba pang lugar sa ${town}:`,
    tripLead: (days, pace, where, who) => `Narito ang ${pace} na planong ${days} araw${where}${who}.`,
    tripDay: (n, names) => `Araw ${n}: ${names}.`,
    tripMore: (n) => `…at ${n} pang araw sa board.`,
    tripSpend: (total, budget) => (budget ? (total <= budget ? `Tinatayang gastos: ₱${fmt(total)}, pasok sa ₱${fmt(budget)} mo.` : `Tinatayang gastos: ₱${fmt(total)}, medyo lampas sa ₱${fmt(budget)} mo. Sabihin mo lang kung gusto mong paliitin.`) : `Tinatayang gastos: ₱${fmt(total)} (zero ang mga lugar na walang nakalistang presyo).`),
    tripNoPrice: 'Wala pang nakalistang presyo sa mga lugar na ito, kaya pakikumpirma ang gastos pagdating.',
    tripNoPriceB: (b) => `Wala pang nakalistang presyo sa mga lugar na ito, kaya hindi ko masusuri laban sa ₱${fmt(b)} mo. Pakikumpirma ang gastos pagdating.`,
    tripShort: (planned, asked) => `${planned} sa ${asked} araw lang ang napunan ko nang hindi inuulit ang lugar. Dumarami ang mga lugar sa paglipas ng panahon.`,
    tripPace: { relaxed: 'relaxed', balanced: 'katamtamang', packed: 'siksik' },
    tripEnd: 'Puwede mong baguhin ang bilis, badyet o petsa sa ibaba.',
    meal: 'kainan',
    matches: (labels) => `Tugma sa hinahanap mong ${labels}.`,
    inTown: (t) => `Sa ${t}.`,
    aroundBudget: (n) => `Mga ₱${fmt(n)}.`,
    takes: (d) => `Maglaan ng mga ${d}.`,
    s: {
      cost: (n) => `Magkano sa ${n}?`, bring: (n) => `Ano ang dadalhin sa ${n}?`, best: (n) => `Kailan ang pinakamagandang bumisita sa ${n}?`, eat: (n) => `Saan puwedeng kumain malapit sa ${n}?`,
      plan: (d, t) => `Magplano ng ${d} araw${t ? ` sa ${t}` : ''}`, near: (n) => `Ano pa ang malapit sa ${n}?`, cmp: (a, b) => `Ihambing ang ${a} at ${b}`, cheaper: 'Ipakita ang mas murang opsyon', more: 'Magpakita pa ng iba',
      relaxed: 'Gawing mas relaxed', food: 'Dagdagan ng kainan', how: (n) => `Paano pumunta sa ${n}?`,
    },
  },

  ceb: {
    greeting: 'Kumusta! Ako si SOULEY, imong giya sa Southern Leyte. Pangutan-a ko bahin sa busay, baybayon, diving o pagkaon, o isulti kung pila ka adlaw ang naa nimo ug ako nay magplano sa biyahe.',
    thanks: 'Walay sapayan! Pangutana lang usab bahin sa Southern Leyte, o isulti ang imong petsa ug akong planohon ang biyahe.',
    bye: 'Amping sa biyahe! Balik lang kung kinahanglan nimo og ideya sa Southern Leyte.',
    aboutBot: 'Ako si SOULEY, ang giya sa website nga kini. Motubag ko base sa mga lugar nga nalista dinhi: makarekomendar ko base sa lungsod, buhat o badyet, makasulti sa bayad, adlaw nga bukas, labing maayong bulan ug dad-on, ug makaplano sa biyahe nga 1 hangtod 50 ka adlaw. I-type lang imong pangutana.',
    offtopic: 'Dili nako kana matabangan. Ang akong nahibaloan mao ang mga lugar, pagkaon ug plano sa biyahe sa Southern Leyte. Sulayi ang usa niini:',
    offarea: 'Southern Leyte ra ang akong sakop, mao nga dili nako matabangan ang maong lugar. Kung moadto ka sa Southern Leyte, sulayi ang usa niini:',
    unclear: 'Wala pa ko sigurado sa imong gipangita, mao nga ania ang pipila ka paborito aron makasugod. Isulti kung unsa imong gusto (baybayon, busay, pagkaon, kasaysayan) o pila ka adlaw ang naa nimo, ug akong pakitidon ang lista.',
    samples: ['Labing nindot nga busay sa Southern Leyte', 'Dili apurahan nga 2-ka-adlaw nga biyahe sa Maasin', 'Asa ko makakaon sa Sogod?', 'Baybayon para sa pamilya, hangtod ₱1,000'],
    acts: { waterfall: 'busay', cave: 'langub', snorkeling: 'snorkeling', diving: 'diving', swimming: 'paglangoy', beach: 'baybayon', island: 'isla', 'whale shark': 'butanding', hiking: 'pag-hiking', kayaking: 'kayaking', camping: 'camping', surfing: 'surfing', heritage: 'simbahan ug kasaysayan', photography: 'nindot nga talan-awon', relaxing: 'pagpahulay', adventure: 'adventure', wildlife: 'kinaiyahan ug mananap', 'hot spring': 'init nga tubod' },
    groups: { family: 'pamilya', couple: 'magtiayon', solo: 'nag-inusara', friends: 'mga higala', senior: 'tigulang', pwd: 'dali adtoan' },
    groupChip: { family: 'Pamilya', couple: 'Magtiayon', solo: 'Nag-inusara', friends: 'Mga higala', senior: 'Tigulang', pwd: 'Dali adtoan' },
    diff: { easy: 'sayon', moderate: 'medyo lisod', hard: 'lisod' },
    askChip: { cost: 'Presyo', hours: 'Adlaw nga bukas', season: 'Labing maayong panahon', duration: 'Unsa ka taas', howto: 'Unsaon pag-adto', bring: 'Dad-on', safety: 'Kaluwasan', contact: 'Contact', difficulty: 'Kalisod', accessibility: 'Accessibility', stay: 'Tuluganan', about: 'Bahin niini' },
    months: ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'],
    chip: { trip: 'Plano sa biyahe', days: (n) => `${n} ka adlaw`, relaxed: 'Dili apurahan', balanced: 'Katamtaman', packed: 'Puno ang iskedyul', up: (n) => `Hangtod ₱${fmt(n)}`, cheap: 'Barato', food: 'Pagkaon', people: (n) => `${n} ka tawo`, rank: { best: 'Labing maayo', cheap: 'Pinakabarato una', hidden: 'Tinagong bahandi' } },
    kinds: { restaurant: 'Restaurant', cafe: 'Café', bakery: 'Panaderya', fast_food: 'Fast food', food_shop: 'Tindahan sa pagkaon', restobar: 'Resto-bar', eatery: 'Kan-anan', food_stall: 'Pwesto sa pagkaon', market: 'Merkado' },
    what: (n, o) => (o.food ? (o.foodKind === 'cafe' ? 'café' : o.foodKind === 'bakery' ? 'panaderya' : 'lugar nga kan-anan') : o.acts ? `lugar para sa ${o.acts}` : 'lugar nga mahimong adtoan'),
    lead: (n) => `Ania ang ${n} ka`,
    leadWhat: (n, w) => w,
    where: (town, area) => (town ? ` sa ${town}` : area ? ` libot sa ${area}` : ''),
    who: (g) => (g ? `, angay sa ${g}` : ''),
    limit: (b, d, m) => [b ? `hangtod ₱${fmt(b)}` : '', d === 'easy' ? 'sayon buhaton' : d === 'hard' ? 'para sa hagit' : '', m ? `maayo kung ${m}` : ''].filter(Boolean).map((x) => `, ${x}`).join(''),
    top: (name, town, extra) => `Ang akong unang pili mao ang ${name}${town ? ` (${town})` : ''}${extra ? `: ${extra}` : '.'}`,
    also: (names) => `Angay usab tan-awon: ${names}.`,
    noAct: (acts, town) => `Wala koy nakita nga ${acts} sa ${town}, mao nga kini ang labing duol nga motugma nga naa nako.`,
    noTown: (town) => `Wala pa koy nalistang lugar sa ${town}, mao nga ania ang maayong kapilian sa duol.`,
    fewOnly: 'Mao na tanan ang nalista nako para ana karon.',
    noPriceData: 'Kadaghanan sa mga lugar wala pay nalistang presyo, mao nga dili nako sila maorder base sa gasto. Palihug kumpirma ang gasto pag-abot.',
    budgetNote: 'Apil ang mga lugar nga walay nalistang presyo, busa palihug kumpirma ang gasto pag-abot.',
    foodNote: 'Basic ra nga lista ang naa nako sa mga kan-anan: palihug kumpirma ang oras sa bukas sa dili pa moadto.',
    nextPlan: 'Gusto ka og plano matag adlaw? Isulti kung pila ka adlaw ang naa nimo.',
    perCard: 'Naa sa matag card sa ubos ang mga detalye nga imong gipangutana.',
    moreNone: 'Gipakita na nako ang tanan nga angay. Sulayi ug usba ang lungsod, buhat o badyet.',
    needs: 'Kinahanglan',
    f: { fee: 'Bayad sa pagsulod', budget: 'Gibanabana nga gasto', duration: 'Oras nga kinahanglan', bestTime: 'Labing maayong higayon', bestMonths: 'Labing maayong bulan', openDays: 'Bukas', hours: 'Oras', difficulty: 'Kalisod', accessibility: 'Access', address: 'Asa', bring: 'Dad-on', safety: 'Kaluwasan', contact: 'Contact', about: 'Bahin niini', activities: 'Mga buhaton', distance: 'Gilay-on', map: 'Direksyon', listing: 'Gikan sa paghulagway', none: 'wala pa nalista', daily: 'matag adlaw (walay nalistang adlaw nga sarado)', allYear: 'tibuok tuig (walay nalistang bulan)' },
    factsLead: (n, name) => (n === 1 ? `Ania ang naa nako bahin sa ${name}:` : 'Ania ang naa nako bahin niining mga lugara:'),
    confirm: 'Mahimong mausab ang bayad, oras ug kahimtang, busa palihug kumpirma sa lokal nga tourism office sa dili pa moadto.',
    asListed: '(sumala sa lista, palihug kumpirma pag-abot)',
    straight: (km, from) => `mga ${km} km nga tul-id nga linya gikan sa ${from} (banabana lang, ug mas dugay ang dalan)`,
    transport: 'Wala koy iskedyul sa bus, van o ferry. Ablihi ang link sa mapa ug i-tap ang Directions para sa dalan gikan sa imong gibutangan.',
    cmpLead: (a, b) => `${a} batok sa ${b}:`,
    cmpCheaper: (n, a, b) => `Mas barato: ${n} (₱${fmt(a)} kumpara sa ₱${fmt(b)})`,
    cmpEasier: (n, a, b) => `Mas sayon: ${n} (${a} kumpara sa ${b})`,
    cmpShorter: (n, a, b) => `Mas mubo nga pagbisita: ${n} (${a} kumpara sa ${b})`,
    cmpSame: 'Sa mga detalye nga naa nako, hapit managsama sila, busa naa sa imong gusto buhaton ang pagpili.',
    stayNone: 'Wala pa koy lista sa hotel o resort, mao nga dili ko makarekomendar kung asa magpuyo. Mga lugar nga naay gihisgotan nga overnight o camping:',
    stayNone2: 'Wala pa koy lista sa hotel o resort, ug walay lugar sa akong lista nga naay overnight. Palihug pangutana sa lokal nga tourism office.',
    nearLead: (name) => `Labing duol sa ${name}:`,
    nearNone: (name) => `Wala koy lokasyon sa ${name}, mao nga dili nako masulti kung unsa ang duol.`,
    nearTown: (name, town) => `Sentro ra sa ${town} ang naa nako nga lokasyon sa ${name}, mao nga dili nako masukod kung unsa ang pinakaduol. Uban pang lugar sa ${town}:`,
    tripLead: (days, pace, where, who) => `Ania ang ${pace} nga plano nga ${days} ka adlaw${where}${who}.`,
    tripDay: (n, names) => `Adlaw ${n}: ${names}.`,
    tripMore: (n) => `…ug ${n} pa ka adlaw sa board.`,
    tripSpend: (total, budget) => (budget ? (total <= budget ? `Gibanabana nga gasto: ₱${fmt(total)}, pasok sa imong ₱${fmt(budget)}.` : `Gibanabana nga gasto: ₱${fmt(total)}, medyo sobra sa imong ₱${fmt(budget)}. Isulti lang kung gusto nimo nga pakubsan.`) : `Gibanabana nga gasto: ₱${fmt(total)} (zero ang mga lugar nga walay nalistang presyo).`),
    tripNoPrice: 'Wala pay nalistang presyo sa kini nga mga lugar, busa palihug kumpirma ang gasto pag-abot.',
    tripNoPriceB: (b) => `Wala pay nalistang presyo sa kini nga mga lugar, mao nga dili nako masusi batok sa imong ₱${fmt(b)}. Palihug kumpirma ang gasto pag-abot.`,
    tripShort: (planned, asked) => `${planned} lang sa ${asked} ka adlaw ang napuno nako nga walay balik-balik nga lugar. Mudaghan ang mga lugar sa paglabay sa panahon.`,
    tripPace: { relaxed: 'dili apurahan', balanced: 'katamtaman', packed: 'siksik' },
    tripEnd: 'Mahimo nimong usbon ang kapaspas, badyet o petsa sa ubos.',
    meal: 'kan-anan',
    matches: (labels) => `Motugma sa imong gipangita nga ${labels}.`,
    inTown: (t) => `Sa ${t}.`,
    aroundBudget: (n) => `Mga ₱${fmt(n)}.`,
    takes: (d) => `Maglaan og mga ${d}.`,
    s: {
      cost: (n) => `Pila sa ${n}?`, bring: (n) => `Unsay dad-on sa ${n}?`, best: (n) => `Kanus-a ang labing maayong moadto sa ${n}?`, eat: (n) => `Asa ko makakaon duol sa ${n}?`,
      plan: (d, t) => `Magplano og ${d} ka adlaw${t ? ` sa ${t}` : ''}`, near: (n) => `Unsa pa ang duol sa ${n}?`, cmp: (a, b) => `Itandi ang ${a} ug ${b}`, cheaper: 'Ipakita ang mas barato', more: 'Pakita pa og uban',
      relaxed: 'Himoong dili apurahan', food: 'Dugangi og kan-anan', how: (n) => `Unsaon pag-adto sa ${n}?`,
    },
  },
};

const dict = (lang) => L[lang] || L.en;
const cut = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1).replace(/\s+\S*$/, '')}…` : String(s));
const firstSentence = (s = '', n = 150) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  const m = t.match(/^.+?[.!?](?=\s|$)/);
  return cut(m && m[0].length >= 25 ? m[0] : t, n);
};
const fmt = (n) => Number(n).toLocaleString('en-US');
const money = (n) => `₱${fmt(n)}`;
let AND = 'and';
const join = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} ${AND} ${list[list.length - 1]}` : list.join(', '));
const joinIn = (lang, list) => { AND = { fil: 'at', ceb: 'ug' }[lang] || 'and'; const out = join(list); AND = 'and'; return out; };
const plural = (n, one, many) => (n === 1 ? one : many);

// ---------- what was understood, as short labels ----------
function chips(u, lang = 'en', extra = {}) {
  const d = dict(lang);
  const out = [];
  if (extra.mode === 'trip') out.push(d.chip.trip);
  if (extra.days) out.push(d.chip.days(extra.days));
  if (extra.mode === 'trip' && extra.pace) out.push(d.chip[extra.pace] || extra.pace);
  (u.municipality ? [u.municipality] : u.towns).forEach((t) => out.push(t));
  u.areas.forEach((a) => out.push(a));
  if (u.food) out.push(d.chip.food);
  u.activities.forEach((a) => out.push(cap(d.acts[a] || a)));
  u.groups.forEach((g) => out.push(d.groupChip[g]));
  if (u.travelers) out.push(d.chip.people(u.travelers));
  if (extra.budget) out.push(d.chip.up(extra.budget)); else if (u.cheap) out.push(d.chip.cheap);
  if (u.difficulty) out.push(d.diff[u.difficulty] ? cap(d.diff[u.difficulty]) : u.difficulty);
  if (u.month) out.push(d.months[u.month - 1]);
  if (u.rank) out.push(d.chip.rank[u.rank]);
  (extra.facts || u.asks).filter((a) => a !== 'nearby' && a !== 'about').forEach((a) => out.push(d.askChip[a]));
  return [...new Set(out.filter(Boolean))].slice(0, 8);
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ---------- chat lines ----------
function chat(kind, lang = 'en') {
  const d = dict(lang);
  return d[kind === 'about' ? 'aboutBot' : kind] || d.unclear;
}
const samples = (lang = 'en') => dict(lang).samples.slice();

// ---------- recommendations ----------
const actLabels = (u, d, lang) => joinIn(lang, u.activities.map((a) => d.acts[a] || a));

// short fact lines for a card, for the things the question asked about
function askBits(f, asks, d) {
  const bits = [];
  if (asks.includes('cost') && (f.fee || f.budget != null)) bits.push(`${d.f.fee}: ${f.fee || d.f.none}${f.budget != null ? `, ${money(f.budget)}` : ''}.`);
  if (asks.includes('hours')) bits.push(`${d.f.openDays}: ${f.openDays || d.f.daily}.`);
  if (asks.includes('season') && (f.bestMonths || f.bestTime)) bits.push(`${d.f.bestMonths}: ${f.bestMonths || f.bestTime}.`);
  if (asks.includes('duration') && f.duration) bits.push(`${d.f.duration}: ${f.duration}.`);
  if (asks.includes('bring') && f.bring && f.bring.length) bits.push(`${d.f.bring}: ${join(f.bring.slice(0, 4))}.`);
  if ((asks.includes('difficulty') || asks.includes('accessibility')) && f.difficulty) bits.push(`${d.f.difficulty}: ${d.diff[f.difficulty] || f.difficulty}.`);
  return bits;
}

function reasonFor(f, u, lang = 'en') {
  const d = dict(lang);
  const parts = [];
  const hit = (f.hits || []).filter((h) => u.activities.includes(h));
  if (hit.length) parts.push(d.matches(joinIn(lang, hit.map((a) => d.acts[a] || a))));
  else if (f.kind === 'food' && f.entryType) parts.push(`${d.kinds[f.entryType] || cap(f.entryType)}${f.town ? ` · ${f.town}` : ''}.`);
  else if (u.municipality && f.town === u.municipality) parts.push(d.inTown(f.town));
  if (f.short) parts.push(firstSentence(f.short, 150));
  const bits = askBits(f, u.asks || [], d);
  parts.push(...bits);
  if ((u.cheap || u.budget || u.rank === 'cheap') && f.budget != null && !bits.length) parts.push(d.aroundBudget(f.budget));
  if (f.duration && f.kind !== 'food' && !(u.asks || []).includes('duration')) parts.push(d.takes(f.duration));
  if (u.month && f.bestMonths && !(u.asks || []).includes('season')) parts.push(`${d.f.bestMonths}: ${f.bestMonths}.`);
  if ((u.groups.some((g) => ['family', 'senior', 'pwd'].includes(g)) || u.difficulty) && f.difficulty && !bits.some((b) => b.startsWith(d.f.difficulty))) parts.push(`${d.f.difficulty}: ${d.diff[f.difficulty] || f.difficulty}.`);
  return cut(parts.join(' '), 480);
}

function recommendAnswer({ lang = 'en', u, picks, relaxed = {}, budget = null }) {
  const d = dict(lang);
  const n = picks.length;
  if (!n) return `${chat('unclear', lang)}`;
  const o = { food: u.food, foodKind: u.foodKind, acts: actLabels(u, d, lang) };
  const month = u.month ? d.months[u.month - 1] : '';
  const group = u.groups.length ? joinIn(lang, u.groups.filter((g) => d.groups[g]).slice(0, 2).map((g) => d.groups[g])) : '';
  const area = u.areas[0];
  const intro = `${d.lead(n)} ${d.leadWhat(n, d.what(n, o))}${d.where(relaxed.town ? '' : u.municipality, relaxed.town ? '' : area)}${d.who(group)}${d.limit(budget, u.difficulty, month)}.`;
  const top = picks[0];
  const extra = firstSentence(top.short || '', 140);
  const lines = [intro, d.top(top.name, top.town, extra)];
  if (n > 1) lines.push(d.also(joinIn(lang, picks.slice(1, 4).map((p) => p.name))));
  if (relaxed.act) lines.unshift(d.noAct(actLabels(u, d, lang), relaxed.town || u.municipality));
  else if (relaxed.town) lines.unshift(d.noTown(relaxed.town));
  if (budget) lines.push(d.budgetNote);
  else if ((u.cheap || u.rank === 'cheap') && picks.every((p) => p.budget == null)) lines.push(d.noPriceData);
  if (picks.some((p) => p.kind === 'food')) lines.push(d.foodNote);
  if (n < 3 && !relaxed.act && !relaxed.town) lines.push(d.fewOnly);
  if ((u.asks || []).some((a) => ['cost', 'hours', 'season', 'duration', 'bring', 'difficulty', 'accessibility'].includes(a))) lines.push(d.perCard);
  if (!u.trip) lines.push(d.nextPlan);
  return cut(lines.join(' '), 1900);
}

// ---------- facts about named places ----------
const diffRank = { easy: 0, moderate: 1, hard: 2 };
// a pin that is only the town centre must not become "directions": search the place by name instead
const mapLink = (f) => (f.lat != null && f.lng != null && !f.approx
  ? `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.name} ${f.town || ''} Southern Leyte Philippines`.replace(/\s+/g, ' '))}`);

function factLines(f, asks, d) {
  const lines = [];
  const none = d.f.none;
  const row = (k, v) => lines.push(`• ${d.f[k]}: ${v || none}`);
  const want = (a) => asks.includes(a);
  if (want('cost')) {
    row('fee', f.fee ? `${f.fee} ${d.asListed}` : '');
    row('budget', f.budget != null ? `${money(f.budget)}` : '');
  }
  if (want('hours')) { row('openDays', f.openDays || d.f.daily); if (f.hours) row('hours', f.hours); else row('hours', ''); }
  if (want('season')) { row('bestMonths', f.bestMonths || d.f.allYear); if (f.bestTime) row('bestTime', f.bestTime); }
  if (want('duration')) row('duration', f.duration);
  if (want('howto')) {
    const where = [f.address, f.barangay].filter(Boolean).join(', ');
    row('address', [where, f.town && !where.toLowerCase().includes(String(f.town).toLowerCase()) ? f.town : ''].filter(Boolean).join(', '));
    if (f.km != null && !f.approx) lines.push(`• ${d.f.distance}: ${d.straight(f.km, f.kmFrom)}`);
    lines.push(`• ${d.f.map}: ${mapLink(f)}`);
  }
  if (want('bring')) row('bring', f.bring && f.bring.length ? join(f.bring) : '');
  if (want('safety')) row('safety', f.safety && f.safety.length ? join(f.safety) : '');
  if (want('contact')) row('contact', f.contact && (f.contact.phone || f.contact.email || f.contact.name) ? join([f.contact.name, f.contact.phone, f.contact.email].filter(Boolean)) : '');
  if (want('difficulty') || want('accessibility')) {
    row('difficulty', f.difficulty ? `${d.diff[f.difficulty] || f.difficulty} ${d.asListed}` : '');
    if (want('accessibility') || f.accessibility) row('accessibility', f.accessibility);
  }
  if (want('about')) {
    lines.push(`• ${d.f.about}: ${cut(f.short || f.name, 260)}`);
    if (f.activities && f.activities.length) lines.push(`• ${d.f.activities}: ${join(f.activities.slice(0, 6))}`);
  }
  return lines;
}

// sentences of the place's own description that speak to what was asked (opening times, fees, how to get there...), quoted from the record
const SNIP = {
  cost: /\b(fees?|entrance|admission|tickets?|donations?|pesos?|php|₱|free of charge|for free|free)\b/i,
  hours: /\b(open|opens|opening|closed|closes|hours|daily|mass|schedule|a\.m\.|p\.m\.|\d\s?(?:am|pm))\b/i,
  season: /\b(season|best time|best months?|dry|rainy|summer|holy week|weekends?|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  duration: /\b(hours?|minutes?|mins?|takes|half[- ]day|overnight)\b/i,
  howto: /\b(road|boat|jeepney|habal|van|tricycle|ferry|bus|trek|walk|reached|reach|access|km)\b/i,
  bring: /\b(bring|wear|pack)\b/i,
  safety: /\b(safe|safety|caution|careful|slippery|current|danger|risk|guide|life jacket)\b/i,
};
function snippets(f, asks, d) {
  const sentences = String(f.description || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((x) => x.length > 15);
  const used = new Set();
  const out = [];
  asks.filter((a) => SNIP[a]).forEach((a) => {
    sentences.filter((x) => SNIP[a].test(x) && !used.has(x)).slice(0, 2).forEach((x) => { used.add(x); out.push(`• ${d.f.listing}: ${cut(x, 220)}`); });
  });
  return out.slice(0, 3);
}

function factsAnswer({ lang = 'en', spots, asks }) {
  const d = dict(lang);
  const want = asks.length ? asks : ['about'];
  const blocks = spots.map((f) => {
    const extra = asks.length ? [] : [['cost'], ['duration'], ['season']].flatMap((a) => factLines(f, a, d));
    return [`${f.name}${f.town ? ` (${f.town})` : ''}`, ...factLines(f, want, d), ...extra, ...snippets(f, want, d)].join('\n');
  });
  const tail = [];
  if (want.some((a) => ['cost', 'hours', 'howto', 'season'].includes(a))) tail.push(d.confirm);
  if (want.includes('howto')) tail.push(d.transport);
  if (spots.some((f) => f.kind === 'food') && want.includes('hours')) tail.push(d.foodNote);
  return cut([d.factsLead(spots.length, spots[0].name), ...blocks, ...tail].join('\n\n'), 1950);
}

function compareAnswer({ lang = 'en', spots }) {
  const d = dict(lang);
  const [a, b] = spots;
  const rows = [a, b].map((f) => [
    `${f.name}${f.town ? ` (${f.town})` : ''}`,
    ...factLines(f, ['cost', 'duration', 'difficulty', 'season'], d),
    f.activities && f.activities.length ? `• ${d.f.activities}: ${join(f.activities.slice(0, 5))}` : '',
  ].filter(Boolean).join('\n'));
  const notes = [];
  if (a.budget != null && b.budget != null && a.budget !== b.budget) { const [lo, hi] = a.budget < b.budget ? [a, b] : [b, a]; notes.push(d.cmpCheaper(lo.name, lo.budget, hi.budget)); }
  if (a.difficulty && b.difficulty && a.difficulty !== b.difficulty) { const [lo, hi] = diffRank[a.difficulty] < diffRank[b.difficulty] ? [a, b] : [b, a]; notes.push(d.cmpEasier(lo.name, d.diff[lo.difficulty], d.diff[hi.difficulty])); }
  if (!notes.length) notes.push(d.cmpSame);
  return cut([d.cmpLead(a.name, b.name), ...rows, notes.join('\n'), d.confirm].join('\n\n'), 1950);
}

function nearbyAnswer({ lang = 'en', base, picks, townOnly = false }) {
  const d = dict(lang);
  if (!picks.length) return d.nearNone(base.name);
  if (townOnly) return [d.nearTown(base.name, base.town), ...picks.map((p) => `• ${p.name}`)].join('\n');
  const lines = picks.map((p) => `• ${p.name}${p.town ? ` (${p.town})` : ''}${p.km != null ? ` · ${p.km < 1 ? '<1' : Math.round(p.km * 10) / 10} km` : ''}`);
  return [d.nearLead(base.name), ...lines].join('\n');
}

function stayAnswer({ lang = 'en', picks }) {
  const d = dict(lang);
  if (!picks.length) return d.stayNone2;
  return [d.stayNone, ...picks.map((p) => `• ${p.name}${p.town ? ` (${p.town})` : ''}`)].join('\n');
}

// ---------- trips ----------
// plan = { days: [{ dayNumber, stops: [{ name, kind, cost }] }], requested, planned, total, budget, pace }
function tripAnswer({ lang = 'en', u, plan, town }) {
  const d = dict(lang);
  const group = u && u.groups.length ? joinIn(lang, u.groups.filter((g) => d.groups[g]).slice(0, 2).map((g) => d.groups[g])) : '';
  const area = u && u.areas[0];
  const lines = [d.tripLead(plan.planned, d.tripPace[plan.pace] || plan.pace, d.where(town, area), d.who(group))];
  plan.days.slice(0, 4).forEach((day) => {
    if (!day.stops.length) return;
    lines.push(d.tripDay(day.dayNumber, joinIn(lang, day.stops.map((s) => (s.kind === 'food' && !plan.foodTrail ? `${s.name} (${d.meal})` : s.name)))));
  });
  if (plan.days.length > 4) lines.push(d.tripMore(plan.days.length - 4));
  lines.push(plan.total > 0 ? d.tripSpend(plan.total, plan.budget) : plan.budget ? d.tripNoPriceB(plan.budget) : d.tripNoPrice);
  if (plan.planned < plan.requested) lines.push(d.tripShort(plan.planned, plan.requested));
  lines.push(d.tripEnd);
  return cut(lines.join('\n'), 1950);
}

// ---------- next questions to offer ----------
// kind: 'places' (a list), 'facts' (about named places), 'trip'
function suggestions({ lang = 'en', kind, spots = [], u, town }) {
  const s = dict(lang).s;
  const a = spots[0];
  const b = spots[1];
  const asked = new Set(u ? u.asks : []);
  const out = [];
  if (kind === 'trip') {
    out.push(s.cheaper, s.relaxed, s.food);
    if (a) out.push(s.cost(a.name));
  } else if (kind === 'facts') {
    if (a && !asked.has('howto')) out.push(s.how(a.name));
    if (a && !asked.has('bring')) out.push(s.bring(a.name));
    if (a) out.push(s.near(a.name));
    if (a && b) out.push(s.cmp(a.name, b.name));
    else out.push(s.plan(2, town || (a && a.town)));
  } else {
    if (a && !asked.has('cost')) out.push(s.cost(a.name));
    if (a && !asked.has('season')) out.push(s.best(a.name));
    if (a && !(u && u.food)) out.push(s.eat(a.name));
    out.push(s.plan(2, town || (a && a.town)));
    if (a && b) out.push(s.cmp(a.name, b.name));
    out.push(s.more);
  }
  return [...new Set(out)].slice(0, 4);
}

module.exports = { chips, chat, samples, reasonFor, recommendAnswer, factsAnswer, compareAnswer, nearbyAnswer, stayAnswer, tripAnswer, suggestions, firstSentence, L };
