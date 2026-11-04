// Punjabi Kutub Khana — walkable library starter
// Three.js draws the room; books come from books.json; clicking a book opens
// it in Internet Archive's reader inside an overlay.

import * as THREE from 'three';
import { mat } from './materials.js';
import { createReader } from './reader.js';
import { inject as injectAnalytics } from '@vercel/analytics';

// Vercel Web Analytics: counts visits and where visitors come from. No cookies,
// no personal data. It only records anything on the live site, once Analytics is
// switched on in the Vercel dashboard (it stays quiet on your own computer).
injectAnalytics();
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import books from './books.json';
import { buildDecor } from './decor.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOM = { width: 14, depth: 14, height: 4.6 };   // metres
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 3.2;                              // metres per second
const WALL_MARGIN = 1.2;                             // keeps you off the shelves

// Shahmukhi names for each room/theme in the spreadsheet.
const ROOM_NAMES = {
  'Sufi Shrines': 'صوفی کلام',
  'Qissa Hall': 'قصے',
  'Religious Verse': 'دینی کلام',
  'Lahore': 'لاہور',
  'Lahore (pre-1947)': 'پرانا لاہور',
  'Amritsar (pre-1947)': 'پرانا امرتسر',
  'Folk & Culture': 'لوک ورثہ',
  'Pothohar': 'پوٹھوہار',
  'Majha': 'ماجھا',
  'Modern (post-1947)': 'نواں ادب',
  'Other': 'ہور',
};

// Cover colours inspired by truck art and phulkari.
const COVER_COLORS = ['#b5342b', '#1f6f6b', '#2f4b8f', '#7b2d5b', '#c4761b', '#3d6b2f'];

// ---------------------------------------------------------------------------
// Basic three.js setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
// Performance notes: on high-density (Retina) screens the browser would draw 4x the pixels,
// so we cap the resolution, skip antialiasing when the screen is already sharp, ask laptops
// for their faster graphics chip, and drop to a lower resolution if frames come in slowly.
const MAX_PIXEL_RATIO = 1.5;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: window.devicePixelRatio < 1.5,
  powerPreference: 'high-performance',
});
let pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a1a10');
scene.fog = new THREE.Fog('#2a1a10', 14, 30);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, EYE_HEIGHT, ROOM.depth / 2 - 2.5);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object ?? camera);

// ---------------------------------------------------------------------------
// Helpers: canvas textures (for patterned floor, covers and signs)
// ---------------------------------------------------------------------------
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

// Wrap right-to-left text into lines that fit maxWidth.
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const NASTALIQ = '"Noto Nastaliq Urdu", serif';
const SERIF = '"Fraunces", Georgia, serif';

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------
function buildRoom() {
  // Floor: terracotta and cream tiles
  const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#a65a3a' : '#e9d6b4';
        ctx.fillRect(i * s, j * s, s, s);
        // little star in each tile
        ctx.fillStyle = (i + j) % 2 ? '#e9d6b4' : '#1f6f6b';
        ctx.beginPath();
        const cx = i * s + s / 2, cy = j * s + s / 2, r = s * 0.18;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const rr = k % 2 ? r * 0.45 : r;
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.fill();
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(ROOM.width / 2, ROOM.depth / 2);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    mat({ map: floorTex, roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Walls, windows, ceiling, lanterns, rug and props live in decor.js
  const decor = buildDecor({ scene, ROOM, canvasTexture });
  hoverables.push(...decor.hoverables);
}

// ---------------------------------------------------------------------------
// Book covers and shelves
// ---------------------------------------------------------------------------
// Covers are drawn at 384x540 (about 45% fewer pixels than before) using the original
// 512x720 layout scaled down, so every cover uses less memory and builds faster.
const COVER_SCALE = 0.75;
function coverTexture(book, color) {
  return canvasTexture(512 * COVER_SCALE, 720 * COVER_SCALE, (ctx) => {
    ctx.scale(COVER_SCALE, COVER_SCALE);
    const w = 512, h = 720;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    // Gold double border
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 10;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, w - 88, h - 88);

    // Small diamond ornament
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.moveTo(w / 2, 90); ctx.lineTo(w / 2 + 22, 112); ctx.lineTo(w / 2, 134); ctx.lineTo(w / 2 - 22, 112);
    ctx.fill();

    // Shahmukhi title
    ctx.fillStyle = '#fff6e6';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    // Long titles get a smaller font so they never run into the author's name.
    let size = 64, lines;
    for (;;) {
      ctx.font = `700 ${size}px ${NASTALIQ}`;
      lines = wrapLines(ctx, book.titleShahmukhi, w - 120);
      if (lines.length <= 2 || size <= 40) break;
      size -= 8;
    }
    const lineH = size * 1.85;
    const startY = 290 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineH));

    // Author
    ctx.font = `400 40px ${NASTALIQ}`;
    ctx.fillText(book.authorShahmukhi, w / 2, 520);

    // English title
    ctx.direction = 'ltr';
    let enSize = 26;
    ctx.font = `400 ${enSize}px ${SERIF}`;
    while (ctx.measureText(book.titleEnglish).width > w - 110 && enSize > 15) {
      enSize -= 1;
      ctx.font = `400 ${enSize}px ${SERIF}`;
    }
    ctx.fillStyle = 'rgba(255,246,230,0.85)';
    ctx.fillText(book.titleEnglish, w / 2, 640);
  });
}

function signTexture(roomName) {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#fff6e6';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.font = `700 76px ${NASTALIQ}`;
    ctx.fillText(ROOM_NAMES[roomName] ?? roomName, w / 2, 125);
    ctx.direction = 'ltr';
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillStyle = '#d9a441';
    ctx.fillText(roomName, w / 2, 215);
  });
}

const bookMeshes = [];

// Shared by every book, instead of new copies per book.
const BOOK_W = 0.52, BOOK_H = 0.72, BOOK_D = 0.07;
const bookGeometry = new THREE.BoxGeometry(BOOK_W, BOOK_H, BOOK_D);
const pageMaterial = mat({ color: '#f1e4c8' });
const colourMaterials = new Map();
const colourMaterial = (color) => {
  if (!colourMaterials.has(color)) colourMaterials.set(color, mat({ color }));
  return colourMaterials.get(color);
};

// ---- Covers are built only when their shelf comes into view ----------------
// Until then a book shows a plain cover in its own colour. Building happens a few
// covers per frame so walking never stutters, and shelves you never look at cost nothing.
const shelfUnits = [];
const coverQueue = [];
const COVERS_PER_FRAME = 3;
const frustum = new THREE.Frustum();
const viewMatrix = new THREE.Matrix4();
const shelfSphere = new THREE.Sphere();

function queueVisibleShelves() {
  camera.updateMatrixWorld();
  viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(viewMatrix);
  for (const unit of shelfUnits) {
    if (unit.userData.coversQueued) continue;
    unit.getWorldPosition(shelfSphere.center);
    shelfSphere.center.y = 1.5;
    shelfSphere.radius = 2.6;
    if (frustum.intersectsSphere(shelfSphere)) {
      unit.userData.coversQueued = true;
      coverQueue.push(...unit.userData.books);
    }
  }
}

// Returns true if any cover was built (so the frame needs redrawing).
function buildQueuedCovers() {
  let built = 0;
  while (coverQueue.length && built < COVERS_PER_FRAME) {
    const mesh = coverQueue.shift();
    const { book, color } = mesh.userData;
    const faces = mesh.material.slice();
    faces[4] = mat({ map: coverTexture(book, color) }); // face 4 = front cover
    mesh.material = faces;
    built++;
  }
  return built > 0;
}
const hoverables = []; // windows and props that show a caption when you look at them

// One shelf unit: 3 shelves, books displayed face-out.
function buildShelf(roomName, roomBooks, position, rotationY) {
  const unit = new THREE.Group();
  const wood = mat({ color: '#6b3f22', roughness: 0.7 });
  const W = 4.4, H = 2.9, D = 0.45;

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.05), wood);
  back.position.set(0, H / 2, -D / 2);
  unit.add(back);
  for (const x of [-W / 2, W / 2]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, H, D), wood);
    side.position.set(x, H / 2, 0);
    unit.add(side);
  }
  const shelfHeights = [0.15, 1.05, 1.95, H];
  for (const y of shelfHeights) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), wood);
    plank.position.set(0, y, 0);
    unit.add(plank);
  }

  // Sign above the shelf
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.65),
    new THREE.MeshBasicMaterial({ map: signTexture(roomName) })
  );
  sign.position.set(0, H + 0.55, -D / 2 + 0.03);
  unit.add(sign);

  // Books: up to 5 per shelf, 3 shelves
  const perShelf = 5;
  const bookW = BOOK_W, bookH = BOOK_H;
  unit.userData.books = [];
  roomBooks.slice(0, perShelf * 3).forEach((book, i) => {
    const shelfIndex = 2 - Math.floor(i / perShelf);      // fill top shelf first (eye level)
    const slot = i % perShelf;
    const color = COVER_COLORS[books.indexOf(book) % COVER_COLORS.length];
    const side = colourMaterial(color);
    // Box faces: +x, -x, +y, -y, +z (front cover), -z. The cover starts plain.
    const mesh = new THREE.Mesh(bookGeometry, [side, pageMaterial, pageMaterial, pageMaterial, side, side]);
    mesh.userData.color = color;
    unit.userData.books.push(mesh);
    // Centre the books on each shelf, however many there are.
    const onThisShelf = Math.min(perShelf, roomBooks.length - Math.floor(i / perShelf) * perShelf);
    // Right to left, the way Shahmukhi reads: the first book sits on the right.
    const x = ((onThisShelf - 1) / 2 - slot) * (bookW + 0.28);
    const y = shelfHeights[shelfIndex] + 0.03 + bookH / 2;
    mesh.position.set(x, y, 0);
    mesh.rotation.x = -0.08; // lean back slightly against the shelf
    mesh.userData.book = book;
    unit.add(mesh);
    bookMeshes.push(mesh);
  });

  unit.position.copy(position);
  unit.rotation.y = rotationY;
  scene.add(unit);
  shelfUnits.push(unit);
}

// Shelf order, like a real Punjabi library: books grouped by poet (poets in Shahmukhi
// alphabetical order, unknown authors last), and each poet's books oldest first.
const yearOf = (b) => { const y = parseInt(b.year, 10); return Number.isNaN(y) ? Infinity : y; };
const isUnknown = (b) => !b.authorShahmukhi || b.author === 'Unknown';
function shelfOrder(a, b) {
  if (isUnknown(a) !== isUnknown(b)) return isUnknown(a) ? 1 : -1;
  const byPoet = (a.authorShahmukhi || a.author).localeCompare(b.authorShahmukhi || b.author, 'ur');
  if (byPoet) return byPoet;
  return yearOf(a) - yearOf(b) || a.id.localeCompare(b.id);
}

function buildShelves() {
  // Group books by room, in the order rooms first appear.
  const rooms = new Map();
  for (const book of books) {
    if (!rooms.has(book.room)) rooms.set(book.room, []);
    rooms.get(book.room).push(book);
  }
  for (const roomBooks of rooms.values()) roomBooks.sort(shelfOrder);

  // Shelf spots around the walls. More rooms → more spots used.
  // 7 spots: three on the back wall, one on each side wall, two on the front wall
  // (the front wall's centre is kept for the phulkari hanging).
  const spots = [
    { pos: new THREE.Vector3(-4.6, 0, -ROOM.depth / 2 + 0.3), rot: 0 },
    { pos: new THREE.Vector3(0, 0, -ROOM.depth / 2 + 0.3), rot: 0 },
    { pos: new THREE.Vector3(4.6, 0, -ROOM.depth / 2 + 0.3), rot: 0 },
    { pos: new THREE.Vector3(-ROOM.width / 2 + 0.3, 0, 0), rot: Math.PI / 2 },
    { pos: new THREE.Vector3(ROOM.width / 2 - 0.3, 0, 0), rot: -Math.PI / 2 },
    { pos: new THREE.Vector3(-4.4, 0, ROOM.depth / 2 - 0.3), rot: Math.PI },
    { pos: new THREE.Vector3(4.4, 0, ROOM.depth / 2 - 0.3), rot: Math.PI },
  ];

  if (rooms.size > spots.length) {
    console.warn(`${rooms.size} rooms but only ${spots.length} shelf spots: some shelves will overlap.`);
  }
  [...rooms.entries()].forEach(([roomName, roomBooks], i) => {
    const spot = spots[i % spots.length];
    buildShelf(roomName, roomBooks, spot.pos, spot.rot);
  });
  return rooms;
}

// ---------------------------------------------------------------------------
// UI: welcome, list view, reader
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const welcome = $('welcome');
const listView = $('list-view');
const reader = $('reader');
const crosshair = $('crosshair');
const hoverLabel = $('hover-label');
const hint = $('hint');
// Phones and tablets: pointer lock isn't available, so lead with the list.
const isTouch = matchMedia('(pointer: coarse)').matches;
const pause = $('pause');
let readerOpen = false;
// Where to go back to when a book is closed: 'walk' or 'list'.
let returnTo = 'walk';

// Show the light "click to keep walking" screen instead of the welcome screen.
function showPause() {
  welcome.hidden = true;
  listView.hidden = true;
  pause.hidden = false;
}

function setWalkingHud(on) {
  crosshair.hidden = !on;
  hint.hidden = !on;
  if (!on) hoverLabel.hidden = true;
}

function openBook(book) {
  returnTo = listView.hidden ? 'walk' : 'list';
  readerOpen = true;
  if (controls.isLocked) controls.unlock();
  listView.hidden = true;
  welcome.hidden = true;
  pause.hidden = true;
  $('reader-title-sm').textContent = book.titleShahmukhi;
  $('reader-meta').textContent = `${book.titleEnglish} · ${book.author}${book.year && book.year !== 'n.d.' ? ` · ${book.year}` : ''}`;
  showLoading();
  const link = `https://archive.org/details/${encodeURIComponent(book.archiveId)}`;
  $('reader-footer').innerHTML =
    `${book.credit ? `${escapeHtml(book.credit)}. ` : ''}Scans hosted on Internet Archive · ` +
    `<a href="${link}" target="_blank" rel="noopener">open there</a> to search or download.`;
  reader.hidden = false;
  bookReader.open(book);
}

// Loading animation: shown when a book opens, hidden once the reader has loaded.
const loading = $('reader-loading');
let loadingTimer = null;
function showLoading() {
  loading.classList.remove('done');
  clearTimeout(loadingTimer);
  // Safety net: never leave the spinner up forever.
  loadingTimer = setTimeout(hideLoading, 20000);
}
function hideLoading() {
  clearTimeout(loadingTimer);
  loading.classList.add('done');
}
// Our own right-to-left reader (src/reader.js). It hides the loading animation
// as soon as the first page image has arrived.
const bookReader = createReader({ onFirstPage: hideLoading, isOpen: () => readerOpen });

function closeReader({ fromClick = false } = {}) {
  readerOpen = false;
  reader.hidden = true;
  bookReader.close();
  if (returnTo === 'list') {
    listView.hidden = false;
  } else if (fromClick && !isTouch) {
    // A click counts as permission to grab the mouse again, so walk straight back in.
    controls.lock();
  } else {
    showPause();
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
// Make searches forgiving: ignore case, accents and Arabic-script diacritics,
// and treat common letter variants (Arabic vs Urdu forms) as the same letter.
function normalize(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')                 // Latin accents
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // zabar, zer, pesh, etc.
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ھةه]/g, 'ہ')
    .replace(/ۂ/g, 'ہ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[\u200c\u200d]/g, '')                  // invisible joiners
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const listEntries = []; // { tile, block, haystack }

function buildListView(rooms) {
  const container = $('list-rooms');
  container.innerHTML = '';
  listEntries.length = 0;
  for (const [roomName, roomBooks] of rooms) {
    const block = document.createElement('div');
    block.className = 'room-block';
    block.innerHTML = `<h3>${escapeHtml(roomName)}<span class="shahmukhi" lang="pnb" dir="rtl">${escapeHtml(ROOM_NAMES[roomName] ?? '')}</span></h3>`;
    const grid = document.createElement('div');
    grid.className = 'book-grid';
    for (const book of roomBooks) {
      const tile = document.createElement('button');
      tile.className = 'book-tile';
      tile.innerHTML =
        `<span class="shahmukhi" lang="pnb" dir="rtl">${escapeHtml(book.titleShahmukhi)}</span>` +
        `<span class="en">${escapeHtml(book.titleEnglish)} · ${escapeHtml(book.author)}</span>`;
      tile.addEventListener('click', () => openBook(book));
      grid.appendChild(tile);
      const haystack = normalize([
        book.titleShahmukhi, book.titleEnglish, book.author, book.authorShahmukhi,
        book.room, ROOM_NAMES[book.room], book.year,
      ].join(' '));
      listEntries.push({ tile, block, haystack });
    }
    block.appendChild(grid);
    container.appendChild(block);
  }
  applySearch();
}

function applySearch() {
  const words = normalize($('search').value).split(' ').filter(Boolean);
  let shown = 0;
  const blocksWithResults = new Set();
  for (const { tile, block, haystack } of listEntries) {
    // Every word typed must appear somewhere in the book's details.
    const match = words.every((w) => haystack.includes(w));
    tile.hidden = !match;
    if (match) {
      shown++;
      blocksWithResults.add(block);
    }
  }
  for (const { block } of listEntries) block.hidden = !blocksWithResults.has(block);
  $('no-results').hidden = shown > 0;
  $('search-count').textContent = words.length
    ? `${shown} ${shown === 1 ? 'book' : 'books'} found`
    : `${listEntries.length} books in the library`;
}

$('search').addEventListener('input', applySearch);
// Enter opens the book straight away when the search narrows to one result.
$('search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const visible = listEntries.filter((x) => !x.tile.hidden);
  if (visible.length === 1) visible[0].tile.click();
});

function openList() {
  welcome.hidden = true;
  pause.hidden = true;
  listView.hidden = false;
  if (!isTouch) $('search').focus(); // phones: don't pop the keyboard up uninvited
}

// ---------------------------------------------------------------------------
// About page: opens over whatever screen you were on and returns you there.
// ---------------------------------------------------------------------------
const about = $('about');
let aboutReturn = null;
function openAbout(e) {
  e?.stopPropagation();
  aboutReturn = [welcome, pause, listView].find((el) => !el.hidden) ?? welcome;
  aboutReturn.hidden = true;
  about.hidden = false;
}
function closeAbout() {
  about.hidden = true;
  (aboutReturn ?? welcome).hidden = false;
}
document.querySelectorAll('[data-about]').forEach((btn) => btn.addEventListener('click', openAbout));

$('enter-btn').addEventListener('click', () => controls.lock());
$('list-btn').addEventListener('click', openList);
$('pause-list-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  openList();
});
// Clicking anywhere on the pause screen (except its button) resumes walking.
pause.addEventListener('click', () => controls.lock());

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.close;
    if (target === 'about') closeAbout();
    else if (target === 'reader') closeReader({ fromClick: true });
    else if (isTouch) {
      // Phones can't walk, so closing the list just reopens it.
      listView.hidden = false;
    } else {
      // Closing the list on a computer takes you into the room.
      listView.hidden = true;
      controls.lock();
    }
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && readerOpen) closeReader();
  else if (e.key === 'Escape' && !about.hidden) closeAbout();
});

controls.addEventListener('lock', () => {
  welcome.hidden = true;
  pause.hidden = true;
  listView.hidden = true;
  setWalkingHud(true);
});
// If the browser refuses to grab the mouse again, show the pause screen.
document.addEventListener('pointerlockerror', () => {
  if (!readerOpen) showPause();
});
controls.addEventListener('unlock', () => {
  setWalkingHud(false);
  if (hovered) { hovered.scale.setScalar(1); hovered = null; }
  requestRender();
  if (!readerOpen) showPause();
});

if (isTouch) $('enter-btn').hidden = true;

// ---------------------------------------------------------------------------
// Movement and picking
// ---------------------------------------------------------------------------
const keys = new Set();
document.addEventListener('keydown', (e) => keys.add(e.code));
document.addEventListener('keyup', (e) => keys.delete(e.code));

const raycaster = new THREE.Raycaster();
raycaster.far = 4;
const center = new THREE.Vector2(0, 0);
let hovered = null;

let captioned = null;

function updateHover() {
  raycaster.setFromCamera(center, camera);

  // Books (within arm's reach) take priority.
  raycaster.far = 4;
  const bookHit = raycaster.intersectObjects(bookMeshes, false)[0]?.object ?? null;

  // Otherwise, windows and props show a caption from further away.
  let captionHit = null;
  if (!bookHit) {
    raycaster.far = 12;
    captionHit = raycaster.intersectObjects(hoverables, false)[0]?.object ?? null;
  }

  if (bookHit === hovered && captionHit === captioned) return;
  if (hovered) hovered.scale.setScalar(1);
  hovered = bookHit;
  captioned = captionHit;

  if (hovered) {
    hovered.scale.setScalar(1.06);
    const b = hovered.userData.book;
    hoverLabel.innerHTML =
      `<span class="shahmukhi" lang="pnb" dir="rtl">${escapeHtml(b.titleShahmukhi)}</span>${escapeHtml(b.author)} · click to read`;
    hoverLabel.hidden = false;
  } else if (captioned) {
    const c = captioned.userData.caption;
    hoverLabel.innerHTML =
      `<span class="shahmukhi" lang="pnb" dir="rtl">${escapeHtml(c.pnb)}</span>${escapeHtml(c.en)}`;
    hoverLabel.hidden = false;
  } else {
    hoverLabel.hidden = true;
  }
}

document.addEventListener('mousedown', () => {
  if (controls.isLocked && hovered) openBook(hovered.userData.book);
});

const clock = new THREE.Clock();

// Only draw when something can change. While a book, the list or a menu is open the room is
// hidden or frozen behind it, so the graphics chip gets to rest instead of redrawing it 60x a second.
let needsRender = true;
const requestRender = () => { needsRender = true; };

// If walking is slow (under ~45 frames a second), lower the resolution once.
let slowFrames = 0, sampledFrames = 0;
function adaptQuality(dt) {
  if (pixelRatio <= 1 || sampledFrames > 240) return;
  sampledFrames++;
  if (dt > 1 / 45) slowFrames++;
  if (sampledFrames === 240 && slowFrames > 120) {
    pixelRatio = 1;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

let frameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!readerOpen) {
    if (frameCount++ % 10 === 0) queueVisibleShelves();
    if (buildQueuedCovers()) requestRender();
  }
  if (controls.isLocked) {
    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const right = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const len = Math.hypot(forward, right) || 1;
    controls.moveForward((forward / len) * WALK_SPEED * dt);
    controls.moveRight((right / len) * WALK_SPEED * dt);

    const p = camera.position;
    p.x = THREE.MathUtils.clamp(p.x, -ROOM.width / 2 + WALL_MARGIN, ROOM.width / 2 - WALL_MARGIN);
    p.z = THREE.MathUtils.clamp(p.z, -ROOM.depth / 2 + WALL_MARGIN, ROOM.depth / 2 - WALL_MARGIN);
    p.y = EYE_HEIGHT;
    updateHover();
    adaptQuality(dt);
    renderer.render(scene, camera);
  } else if (needsRender && !readerOpen) {
    renderer.render(scene, camera);
    needsRender = false;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestRender();
});

// ---------------------------------------------------------------------------
// Start: wait for fonts so the Shahmukhi on covers and signs draws correctly
// ---------------------------------------------------------------------------
async function start() {
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${NASTALIQ}`, 'پنجابی'),
      document.fonts.load(`400 40px ${NASTALIQ}`, 'پنجابی'),
      document.fonts.load(`400 26px ${SERIF}`, 'Punjabi'),
    ]);
  } catch {
    // Fonts failed to load (offline?) — fall back to system fonts.
  }
  buildRoom();
  const rooms = buildShelves();
  buildListView(rooms);
  requestRender();
  animate();
}
start();

// Handy for testing in the browser console: window.pkk.camera.position.set(...)
window.pkk = { requestRender, camera, scene, renderer };
