// Ethiopian Orthodox Tewahedo liturgical calendar: monthly commemorations,
// annual feasts, movable feasts and Sundays of Lent, fasting periods and seasons.
// Selected entries from EOTC Mahibere Kidusan and St. Mary EOTC Toronto.
// This is not a complete daily Synaxarium; see README for coverage limitations.

import { jdnToEthiopic, ethiopicToJdn, isEthiopicLeapYear, jdnToGregorian, gregorianToJdn, weekdayFromJdn } from './ethiopic.js';
import { fasikaJdn, timketJdn } from './holidays.js';

// --- Monthly commemorations (same day every month) ----------------------------
export const MONTHLY = {
  1: { am: 'ልደታ ለማርያም፣ ራጉኤል፣ ኤልያስ', en: 'Lideta (Nativity of Mary), Raguel, Elijah' },
  2: { am: 'ታዴዎስ ሐዋርያ፣ አባ ጉባ', en: 'Thaddeus the Apostle, Abba Guba' },
  3: { am: 'በዓታ ለማርያም፣ ፋኑኤል፣ አቡነ ዜና ማርቆስ', en: "Ba'eta (Presentation of Mary), Phanuel, Abune Zena Markos" },
  4: { am: 'ዮሐንስ ወልደ ነጎድጓድ፣ እንድርያስ', en: 'John the Son of Thunder, Andrew' },
  5: { am: 'ጴጥሮስ ወጳውሎስ፣ አቡነ ገብረ መንፈስ ቅዱስ', en: 'Peter & Paul, Abune Gebre Menfes Kidus' },
  6: { am: 'ኢየሱስ፣ ቁስቋም ማርያም፣ ቅድስት አርሴማ', en: 'Iyesus, Qusquam Mariam, St Arsema' },
  7: { am: 'አጋዕዝተ ዓለም ሥላሴ', en: 'Holy Trinity (Sillassie)' },
  8: { am: 'ኪሩቤል (አርባዕቱ እንስሳ)፣ ማትያስ፣ አባ ኪሮስ፣ አባ ባኑዳ', en: 'Cherubim (Four Living Creatures), Matthias, Abba Kiros, Abba Banuda' },
  9: { am: 'ቶማስ ሐዋርያ፣ ሠለስቱ ምእት', en: 'Thomas the Apostle, the 318 Fathers of Nicaea' },
  10: { am: 'መስቀለ ክርስቶስ፣ ፀደንያ ማርያም፣ ስምዖን ቀኖናዊ', en: 'Holy Cross, Tsedenia Mariam, Simon the Zealot' },
  11: { am: 'ሐና ወኢያቄም፣ ቅዱስ ያሬድ፣ አቡነ ሐራ', en: 'Hanna & Joachim, St Yared, Abune Hara' },
  12: { am: 'ቅዱስ ሚካኤል፣ ማቴዎስ፣ አባ ሳሙኤል ዘዋልድባ', en: 'Archangel Michael, Matthew, Abba Samuel of Waldeba' },
  13: { am: 'እግዚአብሔር አብ፣ ቅዱስ ሩፋኤል፣ አቡነ ዘርዐ ብሩክ', en: 'God the Father, Archangel Raphael, Abune Zera Buruk' },
  14: { am: 'አቡነ አረጋዊ፣ ገብረ ክርስቶስ', en: 'Abune Aregawi, Gebre Kristos' },
  15: { am: 'ቂርቆስ ወኢየሉጣ', en: 'Kirkos & Iyeluta (Cyriacus & Julitta)' },
  16: { am: 'ኪዳነ ምሕረት', en: 'Kidane Mihret (Covenant of Mercy)' },
  17: { am: 'ቅዱስ እስጢፋኖስ፣ ያዕቆብ ወልደ ዘብዴዎስ፣ አባ ገሪማ', en: 'St Stephen, James son of Zebedee, Abba Gerima' },
  18: { am: 'ፊልጶስ ሐዋርያ፣ አቡነ ኤዎስጣቴዎስ', en: 'Philip the Apostle, Abune Ewostatewos' },
  19: { am: 'ቅዱስ ገብርኤል', en: 'Archangel Gabriel' },
  20: { am: 'ሕንፀተ ቤተ ክርስቲያን', en: 'Hintsete Bete Kristiyan (Founding of the Church of Mary)' },
  21: { am: 'ቅድስት ድንግል ማርያም', en: 'Holy Virgin Mary, Mother of God' },
  22: { am: 'ቅዱስ ኡራኤል፣ ደቅስዮስ፣ ሉቃስ', en: 'Archangel Uriel, Daqsyos, Luke' },
  23: { am: 'ቅዱስ ጊዮርጊስ', en: 'St George (Giyorgis)' },
  24: { am: 'አቡነ ተክለ ሃይማኖት፣ ክርስቶስ ሠምራ፣ ፳፬ቱ ካህናተ ሰማይ', en: 'Abune Tekle Haymanot, Kristos Semra, 24 Heavenly Priests' },
  25: { am: 'ቅዱስ መርቆሬዎስ፣ አቡነ ሀቢብ (አባ ቡላ)', en: 'St Merkorios, Abune Habib (Abba Bula)' },
  26: { am: 'አረጋዊው ዮሴፍ፣ አባ ሰላማ ከሣቴ ብርሃን፣ ቶማስ ዘህንደኬ', en: 'St Joseph, Abba Selama (Frumentius), Thomas of India' },
  27: { am: 'መድኃኔዓለም፣ አቡነ መባዓ ጽዮን', en: 'Medhane Alem (Saviour of the World), Abune Mebaa Tsion' },
  28: { am: 'አማኑኤል', en: 'Emmanuel' },
  29: { am: 'በዓለ ወልድ፣ ቅዱስ ላሊበላ', en: "Ba'ale Wold (God the Son), St Lalibela" },
  30: { am: 'ዮሐንስ መጥምቅ፣ ቅዱስ ማርቆስ', en: 'John the Baptist, St Mark' },
};

// --- Annual feasts fixed to the Ethiopian calendar ----------------------------
// major: true → shown in the month footer and marked in the grid.
const A = (month, day, am, en, major = false, id) => ({ month, day, am, en, major, id });
export const ANNUAL = [
  // መስከረም
  A(1, 1, 'ቅዱስ ዮሐንስ (ርእሰ ዓውደ ዓመት)', 'Kidus Yohannes (New Year)', true, 'enkutatash'),
  A(1, 1, 'ራጉኤል', 'Raguel', true),
  A(1, 2, 'ክብረ በዓል ዮሐንስ መጥምቅ (ርእሰ ክብሩ)', 'Beheading of John the Baptist'),
  A(1, 10, 'ፀደንያ ማርያም', 'Tsedenia Mariam (Icon of Mary)'),
  A(1, 15, 'ፍልሰተ ዐፅሙ ለቅዱስ እስጢፋኖስ', 'Translation of the relics of St Stephen'),
  A(1, 16, 'ደመራ (ዋዜማ መስቀል)', 'Demera (Meskel Eve)', true),
  A(1, 17, 'መስቀል (ዓመታዊ)', 'Meskel – Finding of the True Cross', true, 'meskel'),
  A(1, 18, 'አቡነ ኤዎስጣቴዎስ', 'Abune Ewostatewos'),
  A(1, 21, 'ግሸን ማርያም (ግማደ መስቀል)', 'Gishen Mariam (True Cross at Gishen Debre Kerbe)', true),
  A(1, 29, 'ቅድስት አርሴማ (ዓመታዊ)', 'St Arsema – martyrdom'),
  // ጥቅምት
  A(2, 5, 'አቡነ ገብረ መንፈስ ቅዱስ (ቃል ኪዳን)', 'Abune Gebre Menfes Kidus receives covenant'),
  A(2, 9, 'ቶማስ ሐዋርያ', 'Thomas the Apostle'),
  A(2, 14, 'አቡነ አረጋዊ (ዕረፍት)፣ ገብረ ክርስቶስ', 'Departure of Abune Aregawi, Gebre Kristos'),
  A(2, 17, 'ቅዱስ እስጢፋኖስ (ሢመት)', 'Ordination of St Stephen'),
  A(2, 22, 'ቅዱስ ማርቆስ (ዕረፍት)', 'Departure of St Mark'),
  A(2, 25, 'አቡነ ሀቢብ (ዕረፍት)', 'Departure of Abune Habib'),
  A(2, 27, 'መድኃኔዓለም (ዓመታዊ)፣ አቡነ መባዓ ጽዮን', 'Medhane Alem – annual feast', true),
  A(2, 28, 'አማኑኤል (ዓመታዊ)', 'Emmanuel – annual feast'),
  A(2, 30, 'ልደተ ቅዱስ ማርቆስ', 'Birth of St Mark'),
  // ኅዳር
  A(3, 6, 'ቁስቋም ማርያም (ዓመታዊ)', 'Qusquam Mariam – return of the Holy Family', true),
  A(3, 7, 'ቅዱስ ጊዮርጊስ (ቅዳሴ ቤቱ)', 'St George – consecration of his first church'),
  A(3, 8, 'አርባዕቱ እንስሳ (ዓመታዊ)፣ አባ ኪሮስ', 'Four Living Creatures – annual feast, Abba Kiros', true),
  A(3, 11, 'ቅድስት ሐና (ዕረፍት)', 'Departure of St Hanna'),
  A(3, 12, 'ቅዱስ ሚካኤል (ዓመታዊ)', 'Archangel Michael – annual feast', true),
  A(3, 13, 'እግዚአብሔር አብ፣ አእላፍ መላእክት', 'God the Father, Thousands of Angels'),
  A(3, 15, 'ጾመ ነቢያት መግቢያ', 'Fast of the Prophets (Advent) begins', true),
  A(3, 16, 'አባ ኢየሱስ ሞዐ (ሐይቅ)', 'Abba Iyesus Moa of Hayq'),
  A(3, 18, 'ፊልጶስ ሐዋርያ (ዕረፍት)', 'Departure of Philip the Apostle'),
  A(3, 21, 'ኅዳር ጽዮን', 'Hidar Tsion – Ark of the Covenant arrives in Ethiopia', true),
  A(3, 24, '፳፬ቱ ካህናተ ሰማይ (ዓመታዊ)', '24 Heavenly Priests – annual feast'),
  A(3, 25, 'ቅዱስ መርቆሬዎስ (ሰማዕትነት)', 'Martyrdom of St Merkorios'),
  A(3, 26, 'አቡነ ሀብተ ማርያም፣ አባ ኢየሱስ ሞዐ (ዕረፍት)', 'Departure of Abune Habte Mariam & Abba Iyesus Moa'),
  A(3, 27, 'ያዕቆብ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of St James'),
  // ታኅሣሥ
  A(4, 1, 'ልደተ ኤልያስ ነቢይ', 'Birth of Elijah the Prophet'),
  A(4, 3, 'በዓታ ለማርያም (ዓመታዊ)፣ አቡነ ዜና ማርቆስ', "Ba'eta – Presentation of Mary in the Temple", true),
  A(4, 4, 'እንድርያስ ሐዋርያ (ዕረፍት)', 'Departure of Andrew the Apostle'),
  A(4, 6, 'ፍልሰተ ዐፅማ ለቅድስት አርሴማ', 'Translation of the relics of St Arsema'),
  A(4, 12, 'አባ ሳሙኤል ዘዋልድባ (ዕረፍት)', 'Departure of Abba Samuel of Waldeba'),
  A(4, 13, 'ቅዱስ ሩፋኤል', 'Archangel Raphael'),
  A(4, 19, 'ቅዱስ ገብርኤል (ዓመታዊ – ሠለስቱ ደቂቅ)', 'Archangel Gabriel – annual feast (the Three Youths)', true),
  A(4, 22, 'ብስራተ ገብርኤል፣ ደቅስዮስ', 'Bisrate Gabriel (Annunciation), Daqsyos'),
  A(4, 24, 'ልደተ አቡነ ተክለ ሃይማኖት', 'Birth of Abune Tekle Haymanot'),
  // ጥር
  A(5, 1, 'ቅዱስ እስጢፋኖስ (ዓመታዊ)', 'St Stephen – annual feast'),
  A(5, 4, 'ዮሐንስ ወልደ ነጎድጓድ (ዕርገት)', 'John the Son of Thunder taken to heaven'),
  A(5, 6, 'ግዝረት፣ ኤልያስ (ዕርገት)', 'Circumcision of Our Lord (Gizret), Elijah taken up'),
  A(5, 7, 'ሥላሴ (ዓመታዊ)', 'Holy Trinity – annual feast', true),
  A(5, 13, 'አቡነ ዘርዐ ብሩክ (ዕረፍት)', 'Departure of Abune Zera Buruk'),
  A(5, 15, 'ቂርቆስ ወኢየሉጣ (ዓመታዊ)', 'Kirkos & Iyeluta – annual feast'),
  A(5, 18, 'ቅዱስ ጊዮርጊስ (ፍልሰተ ዐፅሙ)', 'St George – scattering of his relics'),
  A(5, 21, 'አስተርእዮ ማርያም (ዕረፍታ)', 'Asterio Mariam – Dormition of Mary', true),
  A(5, 22, 'ቅዱስ ኡራኤል (ሢመት)', 'Archangel Uriel – ordination'),
  A(5, 23, 'ጢሞቴዎስ (ዕረፍት)', 'Departure of St Timothy'),
  A(5, 24, 'አቡነ ተክለ ሃይማኖት (ስብረተ እግር)', 'Abune Tekle Haymanot – breaking of his leg'),
  A(5, 28, 'አማኑኤል (ተአምረ ኅብስት)', 'Emmanuel – Multiplication of the loaves'),
  // የካቲት
  A(6, 8, 'ልደተ ስምዖን (በዓለ ስምዖን)', 'Presentation in the Temple (Simeon)'),
  A(6, 16, 'ኪዳነ ምሕረት (ዓመታዊ)', 'Kidane Mihret – annual feast', true),
  A(6, 23, 'ቅዱስ ጊዮርጊስ (ዓድዋ)', 'St George – Adwa'),
  // መጋቢት
  A(7, 5, 'አቡነ ገብረ መንፈስ ቅዱስ (ዕረፍት)', 'Departure of Abune Gebre Menfes Kidus', true),
  A(7, 8, 'ማትያስ ሐዋርያ', 'Matthias the Apostle'),
  A(7, 10, 'መስቀል (መገኘት)', 'Finding of the True Cross (Megabit Meskel)', true),
  A(7, 22, 'ሆሣዕና (የመጀመሪያው ቀን)', 'Original day of Palm Sunday'),
  A(7, 27, 'ተንተነ ስቅለቱ (መድኃኔዓለም)', 'Original day of the Crucifixion – Medhane Alem'),
  A(7, 29, 'በዓለ ወልድ – ጽንሰት (ብሥራት)', "Ba'ale Wold – Annunciation / Incarnation", true),
  // ሚያዝያ
  A(8, 7, 'ኢያቄም (ዕረፍት)', 'Departure of Joachim'),
  A(8, 17, 'ያዕቆብ ሐዋርያ', 'James the Apostle'),
  A(8, 23, 'ቅዱስ ጊዮርጊስ (ሰማዕትነት – ዓመታዊ)', 'St George – martyrdom (annual feast)', true),
  A(8, 30, 'ቅዱስ ማርቆስ (ሰማዕትነት)', 'Martyrdom of St Mark'),
  // ግንቦት
  A(9, 1, 'ልደታ ለማርያም (ዓመታዊ)', 'Lideta – Nativity of Mary (annual)', true),
  A(9, 11, 'ቅዱስ ያሬድ (ዕርገት)', 'St Yared taken to heaven'),
  A(9, 12, 'አቡነ ተክለ ሃይማኖት (ፍልሰተ ዐፅም)፣ ክርስቶስ ሠምራ', 'Translation of Tekle Haymanot, Kristos Semra', true),
  A(9, 14, 'ገብረ ክርስቶስ', 'Gebre Kristos'),
  A(9, 21, 'ደብረ ምጥማቅ ማርያም', 'Debre Mitmaq Mariam', true),
  A(9, 24, 'ስደተ ማርያም (መግቢያ ግብጽ)', 'Entry of the Holy Family into Egypt'),
  A(9, 25, 'ተአምረ ማርያም (ደረቅ በትር)', 'Miracle of the dry staff'),
  A(9, 26, 'ቶማስ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of Thomas the Apostle'),
  A(9, 28, 'አማኑኤል', 'Emmanuel'),
  A(9, 29, 'አባ ጉባ (ዕረፍት)', 'Departure of Abba Guba'),
  // ሰኔ
  A(10, 8, 'ተአምረ ማርያም (ውኃ ከዓለት)', 'Miracle of water from the rock'),
  A(10, 12, 'ቅዱስ ሚካኤል (ዓመታዊ)፣ ቅዱስ ላሊበላ (ዕረፍት)', 'Archangel Michael – annual feast, Departure of Lalibela', true),
  A(10, 20, 'ሕንፀተ ቤተ ክርስቲያን (ዓመታዊ)', 'Founding of the first Church of Mary (Philippi)', true),
  A(10, 21, 'ሰኔ ጎልጎታ', 'Sene Golgota', true),
  A(10, 25, 'ይሁዳ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of Jude the Apostle'),
  A(10, 30, 'ልደተ ዮሐንስ መጥምቅ', 'Birth of John the Baptist', true),
  // ሐምሌ
  A(11, 2, 'ታዴዎስ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of Thaddeus'),
  A(11, 5, 'ጴጥሮስ ወጳውሎስ (ዓመታዊ)፣ አባ ገሪማ', 'Peter & Paul – annual feast (end of Apostles’ Fast), Abba Gerima', true),
  A(11, 7, 'ሥላሴ (ዓመታዊ – አብርሃም)', 'Holy Trinity – annual feast (visit to Abraham)', true),
  A(11, 8, 'አባ ኪሮስ (ዕረፍት)', 'Departure of Abba Kiros'),
  A(11, 10, 'በርተሎሜዎስ (ሰማዕትነት)', 'Martyrdom of Bartholomew'),
  A(11, 15, 'ቂርቆስ ወኢየሉጣ (ሰማዕትነት)', 'Martyrdom of Kirkos & Iyeluta'),
  A(11, 16, 'ዮሐንስ ወልደ ነጎድጓድ', 'John the Son of Thunder'),
  A(11, 18, 'ያዕቆብ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of James the Apostle'),
  A(11, 19, 'ቅዱስ ገብርኤል (ዓመታዊ – ቂርቆስ)', 'Archangel Gabriel – annual feast (rescue of Kirkos)', true),
  A(11, 22, 'ቅዱስ ኡራኤል (ዓመታዊ)', 'Archangel Uriel – annual feast'),
  A(11, 26, 'ዮሴፍ፣ አባ ሰላማ ከሣቴ ብርሃን (ዕረፍት)', 'Departure of St Joseph & Abba Selama'),
  A(11, 30, 'እንድርያስ ሐዋርያ (ሰማዕትነት)', 'Martyrdom of Andrew'),
  // ነሐሴ
  A(12, 1, 'ጾመ ፍልሰታ መግቢያ', 'Fast of Filseta (Assumption) begins', true),
  A(12, 7, 'ጽንሰታ ለማርያም', 'Conception of Mary by St Hanna'),
  A(12, 12, 'ቅዱስ ሚካኤል', 'Archangel Michael'),
  A(12, 13, 'ደብረ ታቦር (ቡሄ)', 'Debre Tabor – Transfiguration (Buhe)', true),
  A(12, 14, 'ዕረፍተ ሥጋዋ ለማርያም (ጎልጎታ)', 'Burial of the Virgin at Golgotha'),
  A(12, 16, 'ፍልሰታ ለማርያም', 'Filseta – Assumption of Mary', true),
  A(12, 24, 'አቡነ ተክለ ሃይማኖት (ዕረፍት)፣ ክርስቶስ ሠምራ', 'Departure of Abune Tekle Haymanot & Kristos Semra', true),
  // ጳጉሜን
  A(13, 2, 'ቲቶ (ሰማዕትነት)', 'Martyrdom of Titus'),
  A(13, 3, 'ቅዱስ ሩፋኤል (ዓመታዊ)፣ መልከ ጼዴቅ', 'Archangel Raphael – annual feast, Melchizedek', true),
];

// --- Christmas dates using the current January 7 convention -------------------
const G = A;
export const GREGORIAN_ANNUAL = [
  G(1, 6, 'ገሃድ (ዋዜማ ልደት)', 'Gahad – Christmas Eve fast', true),
  G(1, 7, 'ልደት (ገና)', 'Lidet (Genna)', true, 'genna'),
  G(1, 7, 'ልደተ ላሊበላ፣ ልደተ ገብረ መንፈስ ቅዱስ', 'Birth of Lalibela & Gebre Menfes Kidus', true),
];

// --- Movable days relative to Fasika (Easter Sunday, offset 0) -----------------
const M = (offset, am, en, major = false, id) => ({ offset, am, en, major, id });
const TIMKET_RELATIVE = [
  M(-1, 'ከተራ (ዋዜማ ጥምቀት)', 'Ketera – Timket Eve', true),
  M(0, 'ጥምቀት', 'Timket – Baptism of Our Lord', true, 'timket'),
  M(1, 'ቃና ዘገሊላ፣ ቅዱስ ሚካኤል', 'Kana ze Gelila (Wedding at Cana), Archangel Michael', true),
];
export const MOVABLE = [
  M(-69, 'ጾመ ነነዌ (፩ኛ ቀን)', 'Fast of Nineveh – day 1', true),
  M(-68, 'ጾመ ነነዌ (፪ኛ ቀን)', 'Fast of Nineveh – day 2'),
  M(-67, 'ጾመ ነነዌ (፫ኛ ቀን)', 'Fast of Nineveh – day 3'),
  M(-56, 'ዘወረደ (፩ኛ ሰንበት)', 'Zewerede – 1st Sunday of Lent'),
  M(-55, 'ዐቢይ ጾም (ሁዳዴ) መግቢያ', 'Abiy Tsom (Great Lent) begins', true),
  M(-49, 'ቅድስት (፪ኛ ሰንበት)', 'Qidist – 2nd Sunday of Lent'),
  M(-42, 'ምኵራብ (፫ኛ ሰንበት)', 'Mikurab – 3rd Sunday of Lent'),
  M(-35, 'መጻጉዕ (፬ኛ ሰንበት)', 'Metsagu – 4th Sunday of Lent'),
  M(-28, 'ደብረ ዘይት (፭ኛ ሰንበት)', 'Debre Zeit – 5th Sunday of Lent', true),
  M(-21, 'ገብር ኄር (፮ኛ ሰንበት)', 'Gebr Her – 6th Sunday of Lent'),
  M(-14, 'ኒቆዲሞስ (፯ኛ ሰንበት)', 'Nikodimos – 7th Sunday of Lent'),
  M(-7, 'ሆሣዕና', 'Hosanna (Palm Sunday)', true),
  M(-6, 'ሰሙነ ሕማማት – ሰኞ', 'Holy Week – Monday'),
  M(-5, 'ሰሙነ ሕማማት – ማክሰኞ', 'Holy Week – Tuesday'),
  M(-4, 'ሰሙነ ሕማማት – ረቡዕ', 'Holy Week – Wednesday'),
  M(-3, 'ጸሎተ ሐሙስ', 'Tselote Hamus (Maundy Thursday)', true),
  M(-2, 'ስቅለት', 'Siklet (Good Friday)', true, 'siklet'),
  M(-1, 'ቀዳም ሥዑር', "Kedame Si'ur (Holy Saturday)", true),
  M(0, 'ትንሣኤ (ፋሲካ)', 'Tinsae – Fasika (Easter)', true, 'fasika'),
  M(7, 'ዳግም ትንሣኤ', 'Dagma Tinsae (Thomas Sunday)', true),
  M(39, 'ዕርገት', 'Erget (Ascension)', true),
  M(49, 'ጰራቅሊጦስ', 'Paraclete (Pentecost)', true),
  M(50, 'ጾመ ሐዋርያት መግቢያ', 'Fast of the Apostles begins', true),
];

// --- Fasts & seasons ----------------------------------------------------------
const WEEKDAY = { am: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'] };

function inEthiopicRange(eth, startM, startD, endM, endD) {
  const v = eth.month * 100 + eth.day;
  return v >= startM * 100 + startD && v <= endM * 100 + endD;
}

/**
 * Fasting status for a day.
 * Returns { fasting: boolean, name: {am,en}, dayNumber?, total? }
 */
export function fastingFor(jdn) {
  const eth = jdnToEthiopic(jdn);
  const greg = jdnToGregorian(jdn);
  const easter = fasikaJdn(greg.year);
  const off = jdn - easter;
  const wd = weekdayFromJdn(jdn);

  // Fifty days of Easter: no fasting at all, including Wednesdays and Fridays.
  if (off >= 0 && off <= 49) {
    return { fasting: false, name: { am: 'ዘመነ ትንሣኤ (ጾም የለም)', en: 'Zemene Tinsae – no fasting (50 days of Easter)' } };
  }
  if (off >= -55 && off <= -1) {
    return { fasting: true, name: { am: 'ዐቢይ ጾም (ሁዳዴ)', en: 'Abiy Tsom – Great Lent' }, dayNumber: off + 56, total: 55 };
  }
  if (off >= -69 && off <= -67) {
    return { fasting: true, name: { am: 'ጾመ ነነዌ', en: 'Fast of Nineveh' }, dayNumber: off + 70, total: 3 };
  }
  // Fast of the Apostles: Monday after Pentecost until Hamle 4 (Peter & Paul is Hamle 5),
  // in the Ethiopian year that contains this Easter.
  const hawariatEnd = ethiopicToJdn(jdnToEthiopic(easter).year, 11, 4);
  if (off >= 50 && jdn <= hawariatEnd) {
    return { fasting: true, name: { am: 'ጾመ ሐዋርያት', en: 'Fast of the Apostles' }, dayNumber: off - 49, total: hawariatEnd - (easter + 50) + 1 };
  }
  if (eth.month === 12 && eth.day <= 15) {
    return { fasting: true, name: { am: 'ጾመ ፍልሰታ', en: 'Fast of Filseta (Assumption)' }, dayNumber: eth.day, total: 15 };
  }
  // Fast of the Prophets: Hidar 15 until Christmas Eve (Gahad, 6 January Gregorian).
  const nebiyatStart = ethiopicToJdn(jdn >= ethiopicToJdn(eth.year, 3, 15) ? eth.year : eth.year - 1, 3, 15);
  const gennaYear = jdnToGregorian(nebiyatStart + 40).year;
  const gahadJdn = gregorianToJdn(gennaYear, 1, 6);
  if (jdn >= nebiyatStart && jdn <= gahadJdn) {
    return { fasting: true, name: { am: 'ጾመ ነቢያት (ገና ጾም)', en: 'Fast of the Prophets (Advent)' }, dayNumber: jdn - nebiyatStart + 1, total: gahadJdn - nebiyatStart + 1 };
  }
  const timket = timketJdn(eth.year);
  if (jdn === timket - 1) {
    return { fasting: true, name: { am: 'ገሃድ (ዋዜማ ጥምቀት)', en: 'Gahad – Timket Eve fast' } };
  }
  const feastNoFast = (greg.month === 1 && greg.day === 7) || jdn === timket;
  if ((wd === 3 || wd === 5) && !feastNoFast) {
    return {
      fasting: true,
      name: wd === 3
        ? { am: 'ጾመ ድኅነት – ረቡዕ', en: 'Wednesday fast (Tsome Dihnet)' }
        : { am: 'ጾመ ድኅነት – ዓርብ', en: 'Friday fast (Tsome Dihnet)' },
    };
  }
  return { fasting: false, name: null };
}

/** Liturgical season label for a day, if any. */
export function seasonFor(jdn) {
  const eth = jdnToEthiopic(jdn);
  const greg = jdnToGregorian(jdn);
  const off = jdn - fasikaJdn(greg.year);
  if (off >= 0 && off <= 49) return { am: 'ዘመነ ትንሣኤ', en: 'Zemene Tinsae (Eastertide)' };
  if (off >= -55 && off <= -1) return { am: 'ዐቢይ ጾም', en: 'Great Lent' };
  if (inEthiopicRange(eth, 1, 26, 3, 6)) return { am: 'ዘመነ ጽጌ', en: 'Zemene Tsige (Season of Flowers – Flight into Egypt)' };
  if (inEthiopicRange(eth, 3, 15, 4, 6)) return { am: 'ዘመነ ስብከት', en: 'Advent (Tsome Nebiyat)' };
  if (inEthiopicRange(eth, 4, 7, 4, 13)) return { am: 'ስብከት', en: 'Sibket (Proclamation)' };
  if (inEthiopicRange(eth, 4, 14, 4, 20)) return { am: 'ብርሃን', en: 'Birhan (Light)' };
  if (inEthiopicRange(eth, 4, 21, 4, 27)) return { am: 'ኖላዊ', en: 'Nolawi (The Shepherd)' };
  if (greg.month === 1 && greg.day >= 6 && jdn <= timketJdn(eth.year)) {
    return { am: 'ዘመነ ልደት – አስተርእዮ', en: 'Christmas – Epiphany season' };
  }
  if (eth.month === 12 && eth.day <= 16) return { am: 'ፍልሰታ', en: 'Filseta' };
  return null;
}

/** Evangelist of the Ethiopian year (Zemene Matewos / Markos / Lukas / Yohannes). */
export function evangelistOfYear(ethYear) {
  if (isEthiopicLeapYear(ethYear)) return { am: 'ዘመነ ሉቃስ', en: 'Year of Luke' };
  const r = ((ethYear % 4) + 4) % 4; // 0 → Yohannes, 1 → Matewos, 2 → Markos
  return [
    { am: 'ዘመነ ዮሐንስ', en: 'Year of John' },
    { am: 'ዘመነ ማቴዎስ', en: 'Year of Matthew' },
    { am: 'ዘመነ ማርቆስ', en: 'Year of Mark' },
  ][r];
}

/**
 * Full liturgical information for a day.
 */
export function orthodoxDay(jdn, lang = 'en') {
  const eth = jdnToEthiopic(jdn);
  const greg = jdnToGregorian(jdn);
  const off = jdn - fasikaJdn(greg.year);
  const pick = (x) => x[lang] ?? x.en;

  const feast = (a) => ({ id: a.id, name: pick(a), major: a.major });
  const annual = ANNUAL.filter((a) => a.month === eth.month && a.day === eth.day).map(feast);
  const gregorianFixed = GREGORIAN_ANNUAL.filter((a) => a.month === greg.month && a.day === greg.day).map(feast);
  const timket = TIMKET_RELATIVE.filter((a) => jdn === timketJdn(eth.year) + a.offset).map(feast);
  const movable = MOVABLE.filter((m) => m.offset === off).map(feast);
  const monthly = eth.month === 13 ? null : pick(MONTHLY[eth.day]);
  const fast = fastingFor(jdn);
  const season = seasonFor(jdn);

  return {
    feasts: [...movable, ...gregorianFixed, ...timket, ...annual],
    monthly,
    fasting: fast.fasting,
    fastName: fast.name ? pick(fast.name) : null,
    fastDay: fast.dayNumber ?? null,
    fastTotal: fast.total ?? null,
    season: season ? pick(season) : null,
    evangelist: pick(evangelistOfYear(eth.year)),
    weekday: WEEKDAY.am[weekdayFromJdn(jdn)],
  };
}

/** Major Orthodox feasts for grid/footer marking (annual + movable with major flag). */
export function majorOrthodoxFeasts(jdn, lang = 'en', excludedIds = []) {
  return orthodoxDay(jdn, lang).feasts
    .filter((f) => f.major && (!f.id || !excludedIds.includes(f.id))).map((f) => f.name);
}
