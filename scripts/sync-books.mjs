// Rebuild src/books.json from the tracking spreadsheet.
//
//   npm run sync                      (uses ../Punjabi Kutub Khana.xlsx)
//   npm run sync -- path/to/file.xlsx (any other location)
//
// A row goes on the website only when:
//   - Script is "Shahmukhi"
//   - Rights status is "Public domain" or "Permission granted"
//   - Source link is an archive.org/details/... link
// Every other row is skipped, and the script tells you why.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readXlsx } from './read-xlsx.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sheetPath = resolve(process.argv[2] ?? resolve(projectRoot, '..', 'Punjabi Kutub Khana.xlsx'));
const outPath = resolve(projectRoot, 'src', 'books.json');

const ALLOWED_RIGHTS = ['public domain', 'permission granted'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const c = { green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' };

const text = (v) => (v ?? '').toString().trim();

// Header row -> { 'column name in lowercase': index }
function headerMap(rows) {
  const map = {};
  (rows[0] ?? []).forEach((name, i) => {
    if (name) map[text(name).toLowerCase()] = i;
  });
  return map;
}

function need(map, name, sheetName) {
  const col = map[name.toLowerCase()];
  if (col === undefined) {
    console.error(`${c.red}Column "${name}" is missing from the ${sheetName} tab.${c.off} Don't rename the header row.`);
    process.exit(1);
  }
  return col;
}

// Room names that already have a Shahmukhi sign in src/main.js
async function knownRooms() {
  try {
    const src = await readFile(resolve(projectRoot, 'src', 'main.js'), 'utf8');
    const block = src.slice(src.indexOf('const ROOM_NAMES'), src.indexOf('};', src.indexOf('const ROOM_NAMES')));
    return new Set([...block.matchAll(/'([^']+)':/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (!existsSync(sheetPath)) {
  console.error(`${c.red}Can't find the spreadsheet at:${c.off} ${sheetPath}`);
  console.error('Pass its location like this:  npm run sync -- "/path/to/Punjabi Kutub Khana.xlsx"');
  process.exit(1);
}

let workbook;
try {
  workbook = readXlsx(sheetPath);
} catch (err) {
  console.error(`${c.red}Couldn't read the spreadsheet.${c.off} Make sure it's saved as .xlsx. (${err.message})`);
  process.exit(1);
}
const booksRows = workbook['Books'];
const authorRows = workbook['Authors'];
if (!booksRows || !authorRows) {
  console.error(`${c.red}The spreadsheet needs tabs named "Books" and "Authors".${c.off}`);
  process.exit(1);
}

// Authors tab: English name -> Shahmukhi name
const aCols = headerMap(authorRows);
const aName = need(aCols, 'Name (English)', 'Authors');
const aShah = need(aCols, 'Name (Shahmukhi)', 'Authors');
const authors = new Map();
authorRows.slice(1).forEach((row) => {
  const name = text(row?.[aName]);
  if (name) authors.set(name.toLowerCase(), text(row[aShah]));
});

// Books tab
const b = headerMap(booksRows);
const col = {
  id: need(b, 'ID', 'Books'),
  titleShahmukhi: need(b, 'Title (Shahmukhi)', 'Books'),
  titleEnglish: need(b, 'Title (English)', 'Books'),
  author: need(b, 'Author', 'Books'),
  year: need(b, 'Edition year', 'Books'),
  script: need(b, 'Script', 'Books'),
  room: need(b, 'Room / theme', 'Books'),
  link: need(b, 'Source link', 'Books'),
  rights: need(b, 'Rights status', 'Books'),
  credit: b['credit (shown on site)'] ?? null,
};

const books = [];
const skipped = [];
const warnings = [];
const seenIds = new Set();
const rooms = await knownRooms();

booksRows.slice(1).forEach((row) => {
  if (!row) return;
  const get = (k) => (col[k] === null ? '' : text(row[col[k]]));
  const id = get('id');
  if (!id || id.toUpperCase() === 'EX') return; // empty or example row

  const label = `${id} ${get('titleEnglish') || get('titleShahmukhi')}`.trim();
  const reasons = [];
  if (get('script').toLowerCase() !== 'shahmukhi') reasons.push(`script is "${get('script') || 'blank'}", not Shahmukhi`);
  if (!ALLOWED_RIGHTS.includes(get('rights').toLowerCase())) reasons.push(`rights status is "${get('rights') || 'blank'}"`);
  const archive = get('link').match(/archive\.org\/details\/([^/?#\s]+)/i);
  if (!archive) reasons.push('source link is not an archive.org/details/ link');
  if (!get('titleShahmukhi')) reasons.push('Shahmukhi title is blank');
  if (!get('author')) reasons.push('author is blank');
  if (seenIds.has(id)) reasons.push('this ID is used twice');
  if (reasons.length) {
    skipped.push({ label, reasons });
    return;
  }
  seenIds.add(id);

  const author = get('author');
  const authorShahmukhi = authors.get(author.toLowerCase()) ?? '';
  if (!authorShahmukhi) warnings.push(`${label}: "${author}" has no Shahmukhi name on the Authors tab.`);

  const room = get('room') || 'Other';
  if (!get('room')) warnings.push(`${label}: no Room / theme, so it goes on the "Other" shelf.`);
  else if (rooms.size && !rooms.has(room)) warnings.push(`${label}: room "${room}" has no Shahmukhi sign yet. Add it to ROOM_NAMES in src/main.js.`);

  books.push({
    id,
    titleShahmukhi: get('titleShahmukhi'),
    titleEnglish: get('titleEnglish'),
    author,
    authorShahmukhi,
    room,
    year: get('year') || 'n.d.',
    archiveId: decodeURIComponent(archive[1]),
    credit: get('credit'),
  });
});

// ---------------------------------------------------------------------------
// Page counts for the reader. Reused from the last books.json when we already know
// them; otherwise looked up on Internet Archive (needs an internet connection).
// ---------------------------------------------------------------------------
const knownPages = new Map();
try {
  for (const old of JSON.parse(await readFile(outPath, 'utf8'))) {
    if (old.pages) knownPages.set(old.archiveId, old.pages);
  }
} catch { /* first run */ }

async function lookUpPages(id) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(`https://iiif.archive.org/iiif/3/${encodeURIComponent(id)}/manifest.json`, { signal: ctrl.signal });
    if (!r.ok) return 0;
    const j = await r.json();
    return (j.items || []).length;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

const missing = books.filter((bk) => !knownPages.has(bk.archiveId));
if (missing.length) console.log(`${c.dim}Looking up page counts for ${missing.length} new book(s) on Internet Archive…${c.off}`);
await Promise.all(missing.map(async (bk) => {
  const n = await lookUpPages(bk.archiveId);
  if (n) knownPages.set(bk.archiveId, n);
  else warnings.push(`${bk.id}: couldn't get its page count from Internet Archive. The reader will look it up when the book is opened (slower). Run npm run sync again later.`);
}));
for (const bk of books) {
  const n = knownPages.get(bk.archiveId);
  if (n) bk.pages = n;
}

if (!books.length) {
  console.error(`${c.red}No rows are ready for the website, so books.json was left unchanged.${c.off}`);
  for (const s of skipped) console.error(`  ${s.label}: ${s.reasons.join('; ')}`);
  process.exit(1);
}

await writeFile(outPath, JSON.stringify(books, null, 2) + '\n', 'utf8');

console.log(`${c.green}${c.bold}✓ ${books.length} book${books.length === 1 ? '' : 's'} written to ${relative(process.cwd(), outPath)}${c.off}`);
const byRoom = {};
for (const bk of books) byRoom[bk.room] = (byRoom[bk.room] ?? 0) + 1;
for (const [room, n] of Object.entries(byRoom)) console.log(`  ${room}: ${n}`);

if (warnings.length) {
  console.log(`\n${c.yellow}Check these:${c.off}`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (skipped.length) {
  console.log(`\n${c.dim}Not on the website yet (${skipped.length}):${c.off}`);
  for (const s of skipped) console.log(`  ${s.label}: ${s.reasons.join('; ')}`);
}
