// Right-to-left book reader.
//
// Shows the page scans from Internet Archive, but turns pages the way a Shahmukhi
// book does: the first page is on the right and you move leftwards.
//   - Computer: two-page spread (lower page number on the right), cover shown alone.
//   - Phone / narrow window: one page at a time.
//   - Next page: ← key, the left arrow button, clicking the left side, or swiping right.
//   - Previous page: → key, the right arrow button, clicking the right side, or swiping left.
// Page images come from archive.org/download/<id>/page/n<k>_w<width>.jpg, sized to the screen.

const $ = (id) => document.getElementById(id);
const IMG_WIDTHS = [600, 900, 1200, 1600, 2200, 3000];
// Zoom levels, as multiples of "whole page fits on screen".
const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

const pageUrl = (id, n, w) =>
  `https://archive.org/download/${encodeURIComponent(id)}/page/n${n}_w${w}.jpg`;

// Page count: stored in books.json by the sync script; looked up live if missing.
async function fetchPageCount(id) {
  const r = await fetch(`https://iiif.archive.org/iiif/3/${encodeURIComponent(id)}/manifest.json`);
  const j = await r.json();
  return (j.items || []).length;
}

const store = {
  get(id) { try { return Number(localStorage.getItem(`pkk-page:${id}`)) || 0; } catch { return 0; } },
  set(id, n) { try { localStorage.setItem(`pkk-page:${id}`, String(n)); } catch { /* private mode */ } },
};

export function createReader({ onFirstPage, isOpen }) {
  const stage = $('book-stage');
  const spread = $('spread');
  const slider = $('pg-slider');
  const count = $('pg-count');
  const zoomIn = $('zoom-in');
  const zoomOut = $('zoom-out');
  const zoomLabel = $('zoom-level');

  let book = null;
  let total = 0;
  let page = 0;          // lowest page number currently shown (0-based)
  let twoUp = false;
  let zoomIndex = 0;     // index into ZOOM_LEVELS
  const zoom = () => ZOOM_LEVELS[zoomIndex];
  const isZoomed = () => zoomIndex > 0;
  let firstShown = false;
  let token = 0;         // ignores late image loads after the book changes

  const layoutTwoUp = () => !isZoomed() && stage.clientWidth >= 720 && stage.clientWidth > stage.clientHeight * 1.05;

  // Pages shown together with `p`: cover alone, then [1,2], [3,4], ...
  function spreadOf(p) {
    if (!twoUp || p === 0) return [p];
    const first = p % 2 === 1 ? p : p - 1;
    return first + 1 < total ? [first, first + 1] : [first];
  }

  function imgWidth(pagesShown) {
    const perPage = Math.min(stage.clientWidth / pagesShown, stage.clientHeight * 0.8) * zoom();
    const need = perPage * Math.min(window.devicePixelRatio || 1, 2);
    return IMG_WIDTHS.find((w) => w >= need) ?? IMG_WIDTHS[IMG_WIDTHS.length - 1];
  }

  function preload(p) {
    if (p < 0 || p >= total) return;
    for (const n of spreadOf(p)) new Image().src = pageUrl(book.archiveId, n, imgWidth(spreadOf(p).length));
  }

  function render(direction = 0) {
    if (!book || !total) return;
    twoUp = layoutTwoUp();
    const shown = spreadOf(page);
    page = shown[0];
    const myToken = ++token;
    const w = imgWidth(shown.length);

    spread.className = `spread${twoUp && shown.length === 2 ? ' two' : ''}${direction ? (direction > 0 ? ' turn-next' : ' turn-prev') : ''}`;
    spread.replaceChildren();
    // Right-to-left: in a two-page spread the higher page number goes on the LEFT.
    const order = shown.length === 2 ? [shown[1], shown[0]] : shown;
    for (const n of order) {
      const img = document.createElement('img');
      img.className = 'page loading';
      img.alt = `Page ${n + 1}`;
      img.decoding = 'async';
      img.draggable = false;
      img.addEventListener('load', () => {
        if (myToken !== token) return;
        img.classList.remove('loading');
        if (isZoomed()) sizeZoomed(img, true);
        if (!firstShown) { firstShown = true; onFirstPage?.(); }
      });
      img.addEventListener('error', () => {
        if (myToken !== token) return;
        img.classList.remove('loading');
        img.classList.add('failed');
        if (!firstShown) { firstShown = true; onFirstPage?.(); }
      });
      img.src = pageUrl(book.archiveId, n, w);
      spread.appendChild(img);
    }


    const last = shown[shown.length - 1];
    count.textContent = shown.length === 2 ? `${shown[0] + 1}–${last + 1} / ${total}` : `${shown[0] + 1} / ${total}`;
    slider.max = String(total - 1);
    slider.value = String(page);
    $('pg-next').disabled = last >= total - 1;
    $('pg-prev').disabled = page <= 0;
    store.set(book.archiveId, page);

    // Warm up the next and previous spreads so turning feels instant.
    preload(last + 1);
    preload(page - 1);
  }

  function next() {
    const shown = spreadOf(page);
    const target = shown[shown.length - 1] + 1;
    if (target < total) { page = target; render(+1); }
  }
  function prev() {
    if (page <= 0) return;
    page = twoUp ? spreadOf(page - 1)[0] : page - 1;
    render(-1);
  }

  // ---- Controls -------------------------------------------------------------
  $('pg-next').addEventListener('click', next);
  $('pg-prev').addEventListener('click', prev);
  slider.addEventListener('input', () => { page = Number(slider.value); render(0); });

  // ---- Zoom -----------------------------------------------------------------
  // At 100% the whole page (or spread) fits. Above that, one page is shown at
  // that multiple of its fitted size and you scroll around it.
  function sizeZoomed(img, startAtTopRight) {
    if (!img.naturalWidth) return;
    const availW = spread.clientWidth - 8, availH = spread.clientHeight - 16;
    const fit = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    img.style.width = `${Math.round(img.naturalWidth * fit * zoom())}px`;
    if (startAtTopRight) {
      // Shahmukhi starts at the top right of the page.
      spread.scrollTop = 0;
      spread.scrollLeft = spread.scrollWidth;
    }
  }

  function setZoom(index) {
    index = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
    if (index === zoomIndex) return;
    const wasZoomed = isZoomed();
    // Keep the same spot in the middle of the screen when changing between zoom levels.
    const cx = (spread.scrollLeft + spread.clientWidth / 2) / (spread.scrollWidth || 1);
    const cy = (spread.scrollTop + spread.clientHeight / 2) / (spread.scrollHeight || 1);
    zoomIndex = index;
    stage.classList.toggle('zoomed', isZoomed());
    updateZoomUi();
    const img = spread.querySelector('.page');
    if (wasZoomed && isZoomed() && img && img.complete && img.naturalWidth) {
      sizeZoomed(img, false);
      spread.scrollLeft = cx * spread.scrollWidth - spread.clientWidth / 2;
      spread.scrollTop = cy * spread.scrollHeight - spread.clientHeight / 2;
      // Swap in a sharper image if this level needs more pixels.
      const w = imgWidth(1);
      const sharper = pageUrl(book.archiveId, page, w);
      if (img.src !== sharper) {
        const hi = new Image();
        hi.onload = () => { if (img.isConnected) img.src = sharper; };
        hi.src = sharper;
      }
    } else {
      render(0);
    }
  }

  function updateZoomUi() {
    zoomLabel.textContent = `${Math.round(zoom() * 100)}%`;
    zoomOut.disabled = zoomIndex === 0;
    zoomIn.disabled = zoomIndex === ZOOM_LEVELS.length - 1;
  }

  zoomIn.addEventListener('click', () => setZoom(zoomIndex + 1));
  zoomOut.addEventListener('click', () => setZoom(zoomIndex - 1));
  zoomLabel.addEventListener('click', () => setZoom(0));   // tap the number to fit the page again
  // Ctrl/Cmd + scroll wheel or a trackpad pinch also zooms.
  spread.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(zoomIndex + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  spread.addEventListener('dblclick', (e) => { e.preventDefault(); clearTimeout(clickTimer); setZoom(isZoomed() ? 0 : 2); });

  document.addEventListener('keydown', (e) => {
    if (!isOpen() || !book) return;
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoomIndex + 1); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(zoomIndex - 1); return; }
    if (e.key === '0') { e.preventDefault(); setZoom(0); return; }
    if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  });

  // Click the left half to go forward, the right half to go back (not while zoomed).
  let swiped = false;
  // A short wait tells a single click apart from a double-click (which zooms).
  let clickTimer = null;
  spread.addEventListener('click', (e) => {
    if (isZoomed() || swiped) return;
    clearTimeout(clickTimer);
    if (e.detail > 1) return;
    const r = spread.getBoundingClientRect();
    const forward = e.clientX < r.left + r.width / 2;
    clickTimer = setTimeout(() => (forward ? next() : prev()), 230);
  });

  // Swipe: finger moving to the right turns forward, like pulling a Shahmukhi page over.
  let sx = 0, sy = 0;
  spread.addEventListener('touchstart', (e) => {
    swiped = false;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  spread.addEventListener('touchend', (e) => {
    if (isZoomed()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      setTimeout(() => { swiped = false; }, 400);
      if (dx > 0) next(); else prev();
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!book) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(0), 150);
  });

  // ---- Public API -------------------------------------------------------------
  return {
    async open(b) {
      book = b;
      total = b.pages || 0;
      firstShown = false;
      zoomIndex = 0;
      stage.classList.remove('zoomed');
      updateZoomUi();
      spread.replaceChildren();
      count.textContent = '';
      const myBook = b;
      if (!total) {
        try { total = await fetchPageCount(b.archiveId); } catch { total = 0; }
        if (book !== myBook) return;
        if (!total) { onFirstPage?.(); spread.innerHTML = '<p class="reader-error">This book couldn’t be loaded. Try opening it on Internet Archive below.</p>'; return; }
      }
      page = Math.min(store.get(b.archiveId), total - 1);
      // Wait a frame so the stage has its size before choosing image widths.
      requestAnimationFrame(() => { if (book === myBook) render(0); });
    },
    close() {
      book = null;
      token++;
      spread.replaceChildren();
    },
  };
}
