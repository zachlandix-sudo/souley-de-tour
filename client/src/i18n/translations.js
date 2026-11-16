// English (en), Filipino (fil), Bisaya / Cebuano (ceb). Missing keys fall back to English.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fil', label: 'Filipino' },
  { code: 'ceb', label: 'Bisaya' },
];

export const translations = {
  en: {
    'nav.spots': 'Spots', 'nav.map': 'Map', 'nav.food': 'Food', 'nav.experience': 'Experience', 'nav.ask': 'Ask AI',
    'nav.login': 'Login', 'nav.register': 'Register', 'nav.saved': 'Saved spots', 'nav.trips': 'My trips',
    'nav.account': 'Account', 'nav.admin': 'Admin', 'nav.logout': 'Logout', 'nav.language': 'Language', 'nav.menu': 'Menu', 'nav.signedIn': 'Signed in as',
    'spots.title': 'Spots in Southern Leyte', 'spots.count': '{n} spots',
    'map.title': 'Spot map', 'map.subtitle': 'Pick a spot to see where it sits on the map.',
    'map.filter': 'Filter by name or town', 'map.foodShown': 'Food: shown', 'map.foodHidden': 'Food: hidden',
    'food.title': 'Eat & Drink', 'food.subtitle': 'Restaurants, eateries and food stops across Southern Leyte. Confirm opening hours and menu before you go.',
    'food.search': 'Search food places', 'food.all': 'All municipalities', 'food.count': '{n} places',
    'near.off': 'Near me', 'near.on': 'Near me: on', 'near.locating': 'Locating…',
    'common.prev': 'Previous', 'common.next': 'Next', 'common.page': 'Page {p} of {n}',
    'reviews.title': 'Reviews', 'reviews.none': 'No reviews yet.', 'reviews.write': 'Write a review',
    'reviews.signin': 'Sign in to write a review.', 'reviews.submit': 'Submit review', 'reviews.addPhotos': 'Add photos',
  },
  fil: {
    'nav.spots': 'Mga Lugar', 'nav.map': 'Mapa', 'nav.food': 'Pagkain', 'nav.experience': 'Karanasan', 'nav.ask': 'Tanungin ang AI',
    'nav.login': 'Mag-login', 'nav.register': 'Mag-register', 'nav.saved': 'Mga naka-save', 'nav.trips': 'Aking mga biyahe',
    'nav.account': 'Account', 'nav.admin': 'Admin', 'nav.logout': 'Mag-logout', 'nav.language': 'Wika', 'nav.menu': 'Menu', 'nav.signedIn': 'Naka-login bilang',
    'spots.title': 'Mga Lugar sa Southern Leyte', 'spots.count': '{n} lugar',
    'map.title': 'Mapa ng mga lugar', 'map.subtitle': 'Pumili ng lugar para makita kung nasaan ito sa mapa.',
    'map.filter': 'I-filter ayon sa pangalan o bayan', 'map.foodShown': 'Pagkain: ipinapakita', 'map.foodHidden': 'Pagkain: nakatago',
    'food.title': 'Kainan at Inuman', 'food.subtitle': 'Mga restawran, kainan at tigil-kainan sa buong Southern Leyte. Kumpirmahin ang oras ng bukas at menu bago pumunta.',
    'food.search': 'Maghanap ng kainan', 'food.all': 'Lahat ng bayan', 'food.count': '{n} lugar',
    'near.off': 'Malapit sa akin', 'near.on': 'Malapit sa akin: naka-on', 'near.locating': 'Hinahanap ang lokasyon…',
    'common.prev': 'Nakaraan', 'common.next': 'Susunod', 'common.page': 'Pahina {p} ng {n}',
    'reviews.title': 'Mga Review', 'reviews.none': 'Wala pang review.', 'reviews.write': 'Magsulat ng review',
    'reviews.signin': 'Mag-sign in para magsulat ng review.', 'reviews.submit': 'Isumite ang review', 'reviews.addPhotos': 'Magdagdag ng larawan',
  },
  ceb: {
    'nav.spots': 'Mga Lugar', 'nav.map': 'Mapa', 'nav.food': 'Pagkaon', 'nav.experience': 'Kasinatian', 'nav.ask': 'Pangutana sa AI',
    'nav.login': 'Mag-login', 'nav.register': 'Mag-register', 'nav.saved': 'Mga gi-save', 'nav.trips': 'Akong mga biyahe',
    'nav.account': 'Account', 'nav.admin': 'Admin', 'nav.logout': 'Mag-logout', 'nav.language': 'Pinulongan', 'nav.menu': 'Menu', 'nav.signedIn': 'Naka-login isip',
    'spots.title': 'Mga Lugar sa Southern Leyte', 'spots.count': '{n} ka lugar',
    'map.title': 'Mapa sa mga lugar', 'map.subtitle': 'Pili og lugar aron makita asa kini sa mapa.',
    'map.filter': 'Pagsala pinaagi sa ngalan o lungsod', 'map.foodShown': 'Pagkaon: gipakita', 'map.foodHidden': 'Pagkaon: gitago',
    'food.title': 'Kaon ug Inom', 'food.subtitle': 'Mga restawran, kan-anan ug tiguman sa pagkaon sa tibuok Southern Leyte. Kumpirmaha una ang oras ug menu sa dili pa moadto.',
    'food.search': 'Pangita og kan-anan', 'food.all': 'Tanang lungsod', 'food.count': '{n} ka lugar',
    'near.off': 'Duol nako', 'near.on': 'Duol nako: gipaandar', 'near.locating': 'Gipangita ang lokasyon…',
    'common.prev': 'Sa nanglabay', 'common.next': 'Sunod', 'common.page': 'Panid {p} sa {n}',
    'reviews.title': 'Mga Review', 'reviews.none': 'Wala pay review.', 'reviews.write': 'Pagsulat og review',
    'reviews.signin': 'Mag-sign in aron makasulat og review.', 'reviews.submit': 'Isumite ang review', 'reviews.addPhotos': 'Pagdugang og hulagway',
  },
};

// Merge extra key files (kept separate so each file stays small).
import { more } from './translationsMore';
for (const code of Object.keys(more)) Object.assign(translations[code], more[code]);
import { more2 } from './translationsMore';
for (const code of Object.keys(more2)) Object.assign(translations[code], more2[code]);
import { more3 } from './translationsMore2';
for (const code of Object.keys(more3)) Object.assign(translations[code], more3[code]);
import { more4 } from './translationsMore3';
for (const code of Object.keys(more4)) Object.assign(translations[code], more4[code]);
import { more5 } from './translationsMore4';
for (const code of Object.keys(more5)) Object.assign(translations[code], more5[code]);
import { more6 } from './translationsMore5';
for (const code of Object.keys(more6)) Object.assign(translations[code], more6[code]);
import { more7 } from './translationsMore6';
for (const code of Object.keys(more7)) Object.assign(translations[code], more7[code]);
import { more8 } from './translationsMore7';
for (const code of Object.keys(more8)) Object.assign(translations[code], more8[code]);
import { more9 } from './translationsMore8';
for (const code of Object.keys(more9)) Object.assign(translations[code], more9[code]);
import { more10 } from './translationsMore9';
for (const code of Object.keys(more10)) Object.assign(translations[code], more10[code]);
import { moreAsk } from './translationsAsk';
for (const code of Object.keys(moreAsk)) Object.assign(translations[code], moreAsk[code]);
import { moreJourney } from './translationsJourney';
for (const code of Object.keys(moreJourney)) Object.assign(translations[code], moreJourney[code]);
import { moreAbout } from './translationsAbout';
for (const code of Object.keys(moreAbout)) Object.assign(translations[code], moreAbout[code]);
