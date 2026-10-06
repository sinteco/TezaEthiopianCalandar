import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const context = createContext({ Intl, Date, Math, Number, Map });
const src = async (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const modules = {
  './ethiopic.js': new SourceTextModule(await src('ethiopic.js'), { context }),
  './holidays.js': new SourceTextModule(await src('holidays.js'), { context }),
};
const orthodoxModule = new SourceTextModule(await src('orthodox.js'), { context });
await orthodoxModule.link((spec) => modules[spec]);
await orthodoxModule.evaluate();
const { gregorianToJdn, ethiopicToJdn } = modules['./ethiopic.js'].namespace;
const o = orthodoxModule.namespace;

const day = (y, m, d, lang = 'en') => o.orthodoxDay(gregorianToJdn(y, m, d), lang);
const feastNames = (...a) => Array.from(day(...a).feasts, (f) => f.name);

test('monthly commemorations cover every day 1–30 in both languages', () => {
  for (let d = 1; d <= 30; d++) {
    assert.ok(o.MONTHLY[d]?.am && o.MONTHLY[d]?.en, `day ${d}`);
  }
  assert.equal(day(2026, 11, 21).monthly, 'Archangel Michael, Matthew, Abba Samuel of Waldeba'); // Hidar 12
  assert.equal(day(2026, 11, 30, 'am').monthly, 'ቅድስት ድንግል ማርያም'); // Hidar 21
  assert.equal(o.orthodoxDay(ethiopicToJdn(2019, 13, 3)).monthly, null); // Pagume has no monthly cycle
});

test('annual fixed feasts land on the published Ethiopian dates', () => {
  assert.ok(feastNames(2026, 11, 21).includes('Archangel Michael – annual feast')); // Hidar 12
  assert.ok(feastNames(2026, 11, 30).includes('Hidar Tsion – Ark of the Covenant arrives in Ethiopia')); // Hidar 21
  assert.ok(feastNames(2026, 12, 28).includes('Archangel Gabriel – annual feast (the Three Youths)')); // Tahsas 19
  assert.ok(feastNames(2026, 8, 19).includes('Debre Tabor – Transfiguration (Buhe)')); // Nehase 13
  assert.ok(feastNames(2026, 8, 22).includes('Filseta – Assumption of Mary')); // Nehase 16
  assert.ok(feastNames(2027, 2, 23).includes('Kidane Mihret – annual feast')); // Yekatit 16
  assert.ok(feastNames(2027, 4, 7).some((n) => n.startsWith("Ba'ale Wold"))); // Megabit 29
  assert.ok(feastNames(2026, 9, 7).includes('Martyrdom of Titus')); // Pagume 2
  assert.ok(feastNames(2026, 9, 8, 'am').includes('ቅዱስ ሩፋኤል (ዓመታዊ)፣ መልከ ጼዴቅ')); // Pagume 3
  // Genna follows the Julian date: Tahsas 29 normally, Tahsas 28 (8 Jan → 7 Jan) after a 6-day Pagume.
  assert.ok(feastNames(2024, 1, 7).some((n) => n.startsWith('Lidet (Genna)')));
  assert.ok(!feastNames(2024, 1, 8).some((n) => n.startsWith('Lidet (Genna)')));
  assert.ok(feastNames(2024, 1, 20).includes('Timket – Baptism of Our Lord'));
  assert.ok(feastNames(2026, 1, 20).some((n) => n.startsWith('Kana ze Gelila')));
});

test('movable feasts, Lenten Sundays and Holy Week follow Fasika', () => {
  // Fasika 2026-04-12
  assert.ok(feastNames(2026, 2, 2).includes('Fast of Nineveh – day 1'));
  assert.ok(feastNames(2026, 2, 15).includes('Zewerede – 1st Sunday of Lent'));
  assert.ok(feastNames(2026, 2, 16).includes('Abiy Tsom (Great Lent) begins'));
  assert.ok(feastNames(2026, 3, 15).includes('Debre Zeit – 5th Sunday of Lent'));
  assert.ok(feastNames(2026, 4, 5).includes('Hosanna (Palm Sunday)'));
  assert.ok(feastNames(2026, 4, 9).includes('Tselote Hamus (Maundy Thursday)'));
  assert.ok(feastNames(2026, 4, 11).includes("Kedame Si'ur (Holy Saturday)"));
  assert.ok(feastNames(2026, 4, 12).includes('Tinsae – Fasika (Easter)'));
  assert.ok(feastNames(2026, 4, 19).includes('Dagma Tinsae (Thomas Sunday)'));
  assert.ok(feastNames(2026, 5, 21).includes('Erget (Ascension)'));
  assert.ok(feastNames(2026, 5, 31).includes('Paraclete (Pentecost)'));
  assert.ok(feastNames(2026, 6, 1).includes('Fast of the Apostles begins'));
});

test('fasting periods: Lent, Nineveh, Apostles, Filseta, Nebiyat, Gahad and Wednesday/Friday', () => {
  const f = (y, m, d) => day(y, m, d);
  assert.deepEqual([f(2026, 2, 16).fastDay, f(2026, 2, 16).fastTotal], [1, 55]);
  assert.deepEqual([f(2026, 4, 10).fastDay, f(2026, 4, 10).fastTotal], [54, 55]);
  assert.equal(f(2026, 4, 11).fastDay, 55);
  assert.equal(f(2026, 2, 3).fastName, 'Fast of Nineveh');
  // Apostles' fast: Monday after Pentecost (Jun 1) through Hamle 4 (Jul 11); Hamle 5 is the feast.
  assert.deepEqual([f(2026, 6, 1).fastDay, f(2026, 6, 1).fastTotal], [1, 41]);
  assert.equal(f(2026, 7, 11).fastDay, 41);
  assert.equal(f(2026, 7, 12).fasting, false);
  // Filseta Nehase 1–15, feast Nehase 16.
  assert.equal(f(2026, 8, 7).fastName, 'Fast of Filseta (Assumption)');
  assert.equal(f(2026, 8, 21).fastDay, 15);
  assert.equal(f(2026, 8, 22).fasting, false);
  // Nebiyat Hidar 15 – 6 January (Gahad). In 2023/24 Gahad is Tahsas 27 (shifted year).
  assert.equal(f(2026, 11, 24).fastDay, 1);
  assert.equal(f(2027, 1, 6).fastDay, 44);
  assert.equal(f(2027, 1, 7).fasting, false); // Genna
  assert.equal(f(2024, 1, 6).fastName, 'Fast of the Prophets (Advent)');
  assert.equal(f(2024, 1, 7).fasting, false);
  assert.equal(f(2027, 1, 18).fastName, 'Gahad – Timket Eve fast');
  assert.equal(f(2024, 1, 19).fastName, 'Gahad – Timket Eve fast');
  assert.equal(f(2024, 1, 18).fasting, false);
  assert.equal(f(2027, 1, 19).fasting, false); // Timket is a Tuesday in 2027
  // Ordinary Wednesday & Friday fast; Tuesday not.
  assert.equal(f(2026, 10, 7).fastName, 'Wednesday fast (Tsome Dihnet)');
  assert.equal(f(2026, 10, 9).fastName, 'Friday fast (Tsome Dihnet)');
  assert.equal(f(2026, 10, 6).fasting, false);
  // No Wednesday/Friday fasting during the 50 days of Easter.
  assert.equal(f(2026, 4, 15).fasting, false);
  assert.equal(f(2026, 5, 29).fasting, false);
  // Apostles' fast must not leak into the next Ethiopian year.
  assert.notEqual(f(2026, 11, 21).fastName, 'Fast of the Apostles');
});

test('Genna and Timket on a Wednesday/Friday cancel the weekday fast', () => {
  // 2026-01-07 is a Wednesday; 2022-01-19 is a Wednesday.
  assert.equal(new Date(Date.UTC(2026, 0, 7)).getUTCDay(), 3);
  assert.equal(day(2026, 1, 7).fasting, false);
  assert.equal(new Date(Date.UTC(2022, 0, 19)).getUTCDay(), 3);
  assert.equal(day(2022, 1, 19).fasting, false);
  assert.equal(day(2024, 1, 19).fasting, true);
});

test('Timket-related feasts, fasting and season boundaries shift together', () => {
  for (const [year, timket] of [[2024, 20], [2026, 19], [2028, 20]]) {
    assert.ok(feastNames(year, 1, timket - 1).includes('Ketera – Timket Eve'));
    assert.ok(feastNames(year, 1, timket).includes('Timket – Baptism of Our Lord'));
    assert.ok(feastNames(year, 1, timket + 1).some(n => n.startsWith('Kana ze Gelila')));
    assert.ok(!feastNames(year, 1, timket - 1).some(n => n.startsWith('Timket –')));
    assert.equal(day(year, 1, timket - 1).fastName, 'Gahad – Timket Eve fast');
    assert.equal(day(year, 1, timket).fasting, false);
    assert.equal(day(year, 1, timket).season, 'Christmas – Epiphany season');
    assert.equal(day(year, 1, timket + 1).season, null);
  }
  assert.equal(day(2026, 9, 15).season, null);
});

test('monthly day 8 includes Abba Banuda from the Toronto guide', () => {
  assert.match(o.MONTHLY[8].en, /Abba Banuda/);
  assert.match(o.MONTHLY[8].am, /አባ ባኑዳ/);
});

test('seasons and evangelist years', () => {
  assert.equal(day(2026, 10, 7).season, 'Zemene Tsige (Season of Flowers – Flight into Egypt)');
  assert.equal(day(2026, 12, 25).season, 'Birhan (Light)'); // Tahsas 16
  assert.equal(day(2027, 1, 3).season, 'Nolawi (The Shepherd)'); // Tahsas 25
  assert.equal(day(2026, 4, 20).season, 'Zemene Tinsae (Eastertide)');
  assert.equal(day(2026, 3, 1).season, 'Great Lent');
  assert.equal(o.evangelistOfYear(2019).en, 'Year of Luke');
  assert.equal(o.evangelistOfYear(2016).am, 'ዘመነ ዮሐንስ');
  assert.equal(o.evangelistOfYear(2017).en, 'Year of Matthew');
  assert.equal(o.evangelistOfYear(2018).en, 'Year of Mark');
});

test('major feasts are flagged for the grid; minor ones are not', () => {
  const major = Array.from(o.majorOrthodoxFeasts(gregorianToJdn(2026, 11, 21)));
  assert.deepEqual(major, ['Archangel Michael – annual feast']);
  assert.equal(o.majorOrthodoxFeasts(gregorianToJdn(2026, 10, 19)).length, 0); // Tikimt 9 Thomas – minor
  const roughly = Array.from({ length: 365 }, (_, i) => gregorianToJdn(2026, 1, 1) + i)
    .filter((j) => o.orthodoxDay(j).fasting).length;
  assert.ok(roughly > 170 && roughly < 230, `fast days in 2026: ${roughly}`);
});
