// Decor for the library room: painted walls, truck-art border, khatamband
// ceiling, phulkari rug and hanging, coloured lanterns, a charpai corner,
// and jharoka windows that look out on scenes from Punjabi life.

import * as THREE from 'three';
import { mat } from './materials.js';

const PALETTE = {
  red: '#c7362b',
  deepRed: '#8e1f1a',
  teal: '#14706a',
  deepTeal: '#0e4a47',
  gold: '#e3a72f',
  saffron: '#f2a93b',
  pink: '#e0487a',
  green: '#3f8f3a',
  blue: '#2a5aa8',
  cream: '#f6ead2',
  wood: '#5a3520',
};

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------
function star(ctx, cx, cy, r, points = 8, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * inner : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function flower(ctx, cx, cy, r, petal, centre) {
  ctx.fillStyle = petal;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.45, r * 0.25, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = centre;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function gradient(ctx, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([at, c]) => g.addColorStop(at, c));
  return g;
}

// ---------------------------------------------------------------------------
// Window scenes (512 × 768 canvases, arch-shaped windows)
// ---------------------------------------------------------------------------
const SCENES = [
  {
    caption: 'Badshahi Masjid, Lahore',
    shahmukhi: 'بادشاہی مسجد، لاہور',
    glow: '#ff9a5c',
    draw(ctx, w, h) {
      ctx.fillStyle = gradient(ctx, h, [[0, '#2b1b5a'], [0.45, '#c2486b'], [0.7, '#ff9a5c'], [1, '#ffc27a']]);
      ctx.fillRect(0, 0, w, h);
      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % w, (i * 53) % (h * 0.35), 2, 2);
      // crescent moon
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(390, 150, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2063';
      ctx.beginPath(); ctx.arc(402, 142, 27, 0, Math.PI * 2); ctx.fill();
      // minarets
      const minaret = (x, top) => {
        ctx.fillStyle = '#b4523a';
        ctx.fillRect(x - 14, top, 28, 620 - top);
        ctx.fillStyle = '#f2e6d4';
        ctx.fillRect(x - 20, top - 6, 40, 10);
        ctx.fillRect(x - 20, top + 90, 40, 8);
        ctx.beginPath(); ctx.moveTo(x - 18, top - 6); ctx.lineTo(x + 18, top - 6); ctx.lineTo(x + 14, top - 30); ctx.lineTo(x - 14, top - 30); ctx.fill();
        ctx.beginPath(); ctx.arc(x, top - 30, 16, Math.PI, 0); ctx.fill();
      };
      minaret(60, 330); minaret(452, 330);
      // main hall
      ctx.fillStyle = '#a9472f';
      ctx.fillRect(90, 470, 332, 150);
      ctx.fillStyle = '#7d2f1f';
      ctx.beginPath(); ctx.moveTo(206, 620); ctx.lineTo(206, 520); ctx.quadraticCurveTo(256, 455, 306, 520); ctx.lineTo(306, 620); ctx.fill();
      // three marble domes
      ctx.fillStyle = '#f7efe2';
      const dome = (x, r, base) => {
        ctx.beginPath(); ctx.ellipse(x, base, r, r * 1.1, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(x - 2, base - r * 1.1 - 28, 4, 30);
        ctx.beginPath(); ctx.arc(x, base - r * 1.1 - 30, 5, 0, Math.PI * 2); ctx.fill();
      };
      dome(150, 42, 470); dome(256, 70, 470); dome(362, 42, 470);
      // courtyard & lamps
      ctx.fillStyle = '#5a2a1e';
      ctx.fillRect(0, 620, w, h - 620);
      ctx.fillStyle = '#ffd27a';
      for (let x = 30; x < w; x += 45) { ctx.beginPath(); ctx.arc(x, 640, 4, 0, Math.PI * 2); ctx.fill(); }
    },
  },
  {
    caption: 'Basant kites over Lahore',
    shahmukhi: 'بسنت',
    glow: '#ffe28a',
    draw(ctx, w, h) {
      ctx.fillStyle = gradient(ctx, h, [[0, '#3f9be0'], [0.7, '#bfe6ff'], [1, '#fff4c9']]);
      ctx.fillRect(0, 0, w, h);
      // sun
      ctx.fillStyle = 'rgba(255,240,170,0.9)';
      ctx.beginPath(); ctx.arc(110, 170, 46, 0, Math.PI * 2); ctx.fill();
      // kites with strings
      const kites = [
        [300, 150, '#e0487a', '#ffd23f'], [180, 300, '#ffd23f', '#14706a'], [400, 300, '#2a5aa8', '#ffffff'],
        [260, 420, '#c7362b', '#ffd23f'], [430, 470, '#3f8f3a', '#e0487a'], [120, 450, '#f2a93b', '#7a2a8f'],
        [350, 80, '#7a2a8f', '#f2a93b'],
      ];
      for (const [x, y, c1, c2] of kites) {
        const s = 34;
        ctx.strokeStyle = 'rgba(60,60,60,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y + s); ctx.quadraticCurveTo(x + 40, y + 200, x - 20, h); ctx.stroke();
        ctx.fillStyle = c1;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.fill();
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x - 8, y + s + 12); ctx.lineTo(x + 8, y + s + 12); ctx.fill();
      }
      // old Lahore rooftops and havelis
      const roofs = [[0, 560, 110], [100, 600, 90], [180, 540, 120], [290, 590, 100], [380, 550, 140]];
      const colours = ['#d98c5f', '#e8b87a', '#c46a4a', '#e0a46a', '#b85c40'];
      roofs.forEach(([x, y, wd], i) => {
        ctx.fillStyle = colours[i];
        ctx.fillRect(x, y, wd, h - y);
        ctx.fillStyle = 'rgba(60,30,20,0.45)';
        for (let wx = x + 14; wx < x + wd - 20; wx += 30) {
          ctx.beginPath(); ctx.moveTo(wx, y + 70); ctx.lineTo(wx, y + 40); ctx.arc(wx + 9, y + 40, 9, Math.PI, 0); ctx.lineTo(wx + 18, y + 70); ctx.fill();
        }
        // parapet
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, wd, 6);
      });
      // a kite-flyer on a roof
      ctx.fillStyle = '#2b1d14';
      ctx.beginPath(); ctx.arc(230, 505, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(224, 514, 12, 26);
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(234, 518); ctx.lineTo(258, 495); ctx.stroke();
    },
  },
  {
    caption: 'Mustard fields in bloom',
    shahmukhi: 'سرہوں دے کھیت',
    glow: '#ffe066',
    draw(ctx, w, h) {
      ctx.fillStyle = gradient(ctx, h, [[0, '#5fb3f0'], [0.55, '#cdeeff'], [0.56, '#7fae4a'], [1, '#7fae4a']]);
      ctx.fillRect(0, 0, w, h);
      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [x, y] of [[120, 150], [360, 110], [300, 250]]) {
        ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.arc(x + 30, y - 10, 32, 0, Math.PI * 2); ctx.arc(x + 62, y, 24, 0, Math.PI * 2); ctx.fill();
      }
      // distant tree line and a village
      ctx.fillStyle = '#3e6b2f';
      for (let x = -20; x < w + 40; x += 46) { ctx.beginPath(); ctx.arc(x, 420, 30, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#d9a774';
      ctx.fillRect(330, 395, 70, 30); ctx.fillRect(405, 405, 50, 20);
      // kikar tree
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(84, 330, 12, 110);
      ctx.fillStyle = '#4f7d35';
      ctx.beginPath(); ctx.ellipse(90, 330, 70, 30, 0, 0, Math.PI * 2); ctx.fill();
      // mustard field: rows of yellow flowers
      for (let y = 440; y < h; y += 14) {
        const size = 3 + (y - 440) / 50;
        for (let x = (y % 28); x < w; x += 10 + size * 1.5) {
          ctx.fillStyle = (x + y) % 3 ? '#ffd21f' : '#f2b705';
          ctx.beginPath(); ctx.arc(x, y + Math.sin(x) * 3, size, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Persian wheel (harat) by the well
      ctx.strokeStyle = '#6b3f22'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(410, 520, 50, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(410, 520); ctx.lineTo(410 + Math.cos(a) * 50, 520 + Math.sin(a) * 50); ctx.stroke();
        ctx.fillStyle = '#b4523a';
        ctx.beginPath(); ctx.arc(410 + Math.cos(a) * 58, 520 + Math.sin(a) * 58, 8, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    caption: 'Sohni crossing the Chenab on her clay pot',
    shahmukhi: 'سوہنی تے چناں',
    glow: '#8fb7ff',
    draw(ctx, w, h) {
      ctx.fillStyle = gradient(ctx, h, [[0, '#0b1636'], [0.55, '#23407a'], [0.56, '#132a52'], [1, '#0a1a38']]);
      ctx.fillRect(0, 0, w, h);
      // stars and full moon
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 60; i++) ctx.fillRect((i * 71) % w, (i * 37) % 380, 2, 2);
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath(); ctx.arc(256, 210, 62, 0, Math.PI * 2); ctx.fill();
      // far bank: Mahiwal's hut with a lamp, and his buffalo
      ctx.fillStyle = '#07102a';
      ctx.fillRect(0, 410, w, 22);
      ctx.beginPath(); ctx.moveTo(360, 412); ctx.lineTo(420, 370); ctx.lineTo(480, 412); ctx.fill();
      ctx.fillRect(375, 395, 90, 20);
      ctx.fillStyle = '#ffcf6b';
      ctx.beginPath(); ctx.arc(420, 400, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#07102a';
      ctx.beginPath(); ctx.ellipse(110, 402, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(84, 400, 6, 18); ctx.fillRect(128, 400, 6, 18);
      ctx.beginPath(); ctx.arc(80, 392, 10, 0, Math.PI * 2); ctx.fill();
      // moonlight on the river
      for (let y = 440; y < h; y += 16) {
        ctx.strokeStyle = `rgba(255,246,216,${0.5 - (y - 440) / 800})`;
        ctx.lineWidth = 3;
        const span = 40 + (y - 440) * 0.4;
        ctx.beginPath(); ctx.moveTo(256 - span, y); ctx.quadraticCurveTo(256, y - 6, 256 + span, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120,160,230,0.35)';
      for (let y = 450; y < h; y += 22) {
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 6, x + 30, y); ctx.stroke();
        }
      }
      // Sohni holding her ghara
      ctx.fillStyle = '#b4523a';
      ctx.beginPath(); ctx.ellipse(230, 590, 26, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(222, 562, 16, 10);
      ctx.fillStyle = '#e0487a';
      ctx.beginPath(); ctx.moveTo(250, 585); ctx.quadraticCurveTo(275, 560, 300, 590); ctx.lineTo(250, 600); ctx.fill();
      ctx.fillStyle = '#2b1d14';
      ctx.beginPath(); ctx.arc(292, 572, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e0487a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(296, 566); ctx.quadraticCurveTo(330, 560, 340, 590); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,216,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(262, 605, 70, 8, 0, 0, Math.PI * 2); ctx.stroke();
    },
  },
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------
export function buildDecor({ scene, ROOM, canvasTexture }) {
  const hoverables = []; // windows you can point at for a caption

  // ---- Walls: teal dado, saffron plaster with stencilled flowers ----------
  const wallTexture = (width) => {
    const tex = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#efb862';
      ctx.fillRect(0, 0, w, h);
      // subtle lime-wash variation
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 20, 20);
      }
      // stencilled motif grid
      for (const [x, y] of [[128, 128], [384, 384]]) {
        flower(ctx, x, y, 34, 'rgba(199,54,43,0.28)', 'rgba(20,112,106,0.35)');
      }
      ctx.fillStyle = 'rgba(20,112,106,0.18)';
      star(ctx, 384, 128, 18); star(ctx, 128, 384, 18);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 1.6, ROOM.height / 1.6);
    return tex;
  };

  const dadoTexture = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = PALETTE.deepTeal;
    ctx.fillRect(0, 0, w, h);
    // arched panels
    for (let x = 16; x < w; x += 128) {
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, h - 20); ctx.lineTo(x, 90); ctx.quadraticCurveTo(x + 48, 20, x + 96, 90); ctx.lineTo(x + 96, h - 20); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = PALETTE.teal;
      ctx.fill();
      flower(ctx, x + 48, 140, 26, PALETTE.saffron, PALETTE.red);
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, 0, w, 8);
  });
  dadoTexture.wrapS = THREE.RepeatWrapping;

  const truckBand = canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = PALETTE.deepRed;
    ctx.fillRect(0, 0, w, h);
    // zigzag
    const colours = [PALETTE.gold, PALETTE.teal, PALETTE.pink, PALETTE.green, PALETTE.blue];
    for (let i = 0, x = 0; x < w; x += 64, i++) {
      ctx.fillStyle = colours[i % colours.length];
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x + 32, 50); ctx.lineTo(x + 64, 18); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, h - 18); ctx.lineTo(x + 32, h - 50); ctx.lineTo(x + 64, h - 18); ctx.fill();
    }
    // flowers and little mirrors
    for (let x = 32; x < w; x += 128) {
      flower(ctx, x, 64, 22, '#ffffff', PALETTE.red);
      ctx.fillStyle = '#d8e6ef';
      ctx.beginPath(); ctx.arc(x + 64, 64, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, 0, w, 6); ctx.fillRect(0, h - 6, w, 6);
  });
  truckBand.wrapS = THREE.RepeatWrapping;

  const DADO_H = 1.0;
  const BAND_H = 0.32;
  const walls = [
    { w: ROOM.width, pos: [0, 0, -ROOM.depth / 2], rot: 0 },
    { w: ROOM.width, pos: [0, 0, ROOM.depth / 2], rot: Math.PI },
    { w: ROOM.depth, pos: [-ROOM.width / 2, 0, 0], rot: Math.PI / 2 },
    { w: ROOM.depth, pos: [ROOM.width / 2, 0, 0], rot: -Math.PI / 2 },
  ];
  for (const wall of walls) {
    const group = new THREE.Group();
    group.position.set(...wall.pos);
    group.rotation.y = wall.rot;
    scene.add(group);

    const plaster = new THREE.Mesh(
      new THREE.PlaneGeometry(wall.w, ROOM.height),
      mat({ map: wallTexture(wall.w), roughness: 0.95 })
    );
    plaster.position.y = ROOM.height / 2;
    group.add(plaster);

    const dTex = dadoTexture.clone();
    dTex.needsUpdate = true;
    dTex.repeat.set(wall.w / 2, 1);
    const dado = new THREE.Mesh(
      new THREE.PlaneGeometry(wall.w, DADO_H),
      mat({ map: dTex, roughness: 0.6 })
    );
    dado.position.set(0, DADO_H / 2, 0.01);
    group.add(dado);

    const bTex = truckBand.clone();
    bTex.needsUpdate = true;
    bTex.repeat.set(wall.w / 2.5, 1);
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(wall.w, BAND_H),
      mat({ map: bTex, roughness: 0.5 })
    );
    band.position.set(0, ROOM.height - 0.45, 0.01);
    group.add(band);
  }

  // ---- Ceiling: painted khatamband (geometric wooden ceiling) -------------
  const ceilTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4a2714';
    ctx.fillRect(0, 0, w, h);
    const s = 128;
    for (let x = 0; x < w; x += s) {
      for (let y = 0; y < h; y += s) {
        ctx.fillStyle = ((x + y) / s) % 2 ? PALETTE.teal : PALETTE.deepRed;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
          ctx.lineTo(x + s / 2 + Math.cos(a) * 54, y + s / 2 + Math.sin(a) * 54);
        }
        ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        star(ctx, x + s / 2, y + s / 2, 30);
        ctx.fillStyle = PALETTE.cream;
        star(ctx, x + s / 2, y + s / 2, 10, 4);
      }
    }
  });
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(ROOM.width / 5, ROOM.depth / 5);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    mat({ map: ceilTex, roughness: 0.8 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  // ---- Phulkari: rug in the centre, hanging on the front wall --------------
  const phulkari = (w, h) => canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = PALETTE.deepRed;
    ctx.fillRect(0, 0, w, h);
    const cell = 64;
    for (let x = cell / 2; x < w; x += cell) {
      for (let y = cell / 2; y < h; y += cell) {
        const big = ((x + y) / cell) % 2 < 1;
        ctx.fillStyle = big ? PALETTE.saffron : '#f7c948';
        ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x + 28, y); ctx.lineTo(x, y + 28); ctx.lineTo(x - 28, y); ctx.fill();
        ctx.fillStyle = big ? PALETTE.pink : PALETTE.green;
        ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 12, y); ctx.fill();
      }
    }
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 6),
    mat({ map: phulkari(512, 768), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 0);
  scene.add(rug);

  const hanging = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.9),
    mat({ map: phulkari(640, 480), roughness: 1, side: THREE.DoubleSide })
  );
  hanging.position.set(0, 2.3, ROOM.depth / 2 - 0.03);
  hanging.rotation.y = Math.PI;
  scene.add(hanging);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2.9, 8),
    mat({ color: PALETTE.gold, metalness: 0.6, roughness: 0.4 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 3.27, ROOM.depth / 2 - 0.06);
  scene.add(rod);
  hanging.userData.caption = { en: 'Phulkari, Punjab’s flower embroidery', pnb: 'پھلکاری' };
  hoverables.push(hanging);

  // ---- Jharoka windows with scenes -----------------------------------------
  const arch = new THREE.Shape();
  const AW = 0.8, AH = 1.5;                 // half-width, straight height
  arch.moveTo(-AW, 0);
  arch.lineTo(-AW, AH);
  arch.absarc(0, AH, AW, Math.PI, 0, true);
  arch.lineTo(AW, 0);
  arch.lineTo(-AW, 0);
  const archGeo = new THREE.ShapeGeometry(arch, 32);
  // Remap UVs so the scene canvas fills the arch exactly.
  const uv = archGeo.attributes.uv;
  const pos = archGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + AW) / (AW * 2), pos.getY(i) / (AH + AW));
  }

  const frameMat = mat({ color: PALETTE.wood, roughness: 0.6 });
  const glassColours = [PALETTE.red, PALETTE.teal, PALETTE.gold, PALETTE.blue];
  const windowSpots = [
    { x: -ROOM.width / 2, z: -4.3, rot: Math.PI / 2 },
    { x: -ROOM.width / 2, z: 4.3, rot: Math.PI / 2 },
    { x: ROOM.width / 2, z: -4.3, rot: -Math.PI / 2 },
    { x: ROOM.width / 2, z: 4.3, rot: -Math.PI / 2 },
  ];
  windowSpots.forEach((spot, i) => {
    const sceneDef = SCENES[i % SCENES.length];
    const group = new THREE.Group();
    group.position.set(spot.x + Math.sign(-spot.x) * 0.02, 1.15, spot.z);
    group.rotation.y = spot.rot;

    // carved frame and a ring of coloured glass
    const frame = new THREE.Mesh(archGeo, frameMat);
    frame.scale.set(1.22, 1.1, 1);
    frame.position.set(0, -0.08, 0);
    group.add(frame);
    const ring = new THREE.Mesh(archGeo, new THREE.MeshBasicMaterial({ color: glassColours[i % glassColours.length] }));
    ring.scale.set(1.1, 1.05, 1);
    ring.position.set(0, -0.04, 0.005);
    group.add(ring);

    const view = new THREE.Mesh(
      archGeo,
      new THREE.MeshBasicMaterial({ map: canvasTexture(512, 768, sceneDef.draw) })
    );
    view.position.z = 0.01;
    view.userData.caption = { en: sceneDef.caption, pnb: sceneDef.shahmukhi };
    group.add(view);
    hoverables.push(view);

    // window bars (jaali-style) for depth
    const barMat = mat({ color: '#3b2416' });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, AH + AW * 0.95, 0.03), barMat);
    bar.position.set(0, (AH + AW) / 2, 0.03);
    group.add(bar);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(AW * 2, 0.035, 0.03), barMat);
    cross.position.set(0, AH, 0.03);
    group.add(cross);

    // sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(AW * 2.6, 0.08, 0.25), frameMat);
    sill.position.set(0, -0.12, 0.1);
    group.add(sill);

    // soft coloured light spilling in from outside
    // (The coloured light spilling in used to be four extra lamps. Each lamp makes every pixel
    // in the room cost more to draw, so the window scenes now just glow on their own.)

    scene.add(group);
  });

  // ---- Coloured glass lanterns ---------------------------------------------
  scene.add(new THREE.HemisphereLight('#ffe9c7', '#5a3520', 0.75));
  const lanterns = [
    [-3.2, -3.2, '#ff6b4a'], [3.2, -3.2, '#ffc04a'],
    [-3.2, 3.2, '#4ad1c0'], [3.2, 3.2, '#ff7ab0'], [0, 0, '#ffd27a'],
  ];
  for (const [x, z, colour] of lanterns) {
    const y = ROOM.height - 1.1;
    const light = new THREE.PointLight(colour, 7, 10, 1.6);
    light.position.set(x, y, z);
    scene.add(light);
    const glass = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({ color: colour })
    );
    glass.scale.set(1, 1.4, 1);
    glass.position.set(x, y, z);
    scene.add(glass);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.14, 8),
      mat({ color: PALETTE.gold, metalness: 0.7, roughness: 0.3 })
    );
    cap.position.set(x, y + 0.33, z);
    scene.add(cap);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.8, 6),
      new THREE.MeshBasicMaterial({ color: '#2a1a10' })
    );
    cord.position.set(x, ROOM.height - 0.4, z);
    scene.add(cord);
  }

  // ---- A reading corner: charpai and clay pots -----------------------------
  const corner = new THREE.Group();
  const legMat = mat({ color: PALETTE.wood, roughness: 0.6 });
  const weave = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8c98f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PALETTE.red; ctx.lineWidth = 6;
    for (let i = -h; i < w; i += 22) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.teal;
    for (let i = 0; i < w + h; i += 22) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - h, h); ctx.stroke();
    }
  });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.9), mat({ map: weave }));
  bed.position.y = 0.45;
  corner.add(bed);
  for (const [lx, lz] of [[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), legMat);
    leg.position.set(lx, 0.22, lz);
    corner.add(leg);
  }
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.12, 0.35),
    mat({ map: phulkari(256, 128) })
  );
  pillow.position.set(0, 0.54, -0.7);
  corner.add(pillow);
  const potMat = mat({ color: '#b4523a', roughness: 0.9 });
  for (const [px, s] of [[0.9, 1], [1.25, 0.75]]) {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 20, 14), potMat);
    pot.scale.y = 0.9;
    pot.position.set(px, 0.2 * s, -0.4);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.1 * s, 16), potMat);
    neck.position.set(px, 0.39 * s, -0.4);
    corner.add(pot, neck);
  }
  corner.position.set(ROOM.width / 2 - 1.2, 0, ROOM.depth / 2 - 2.6);
  corner.rotation.y = 0;
  scene.add(corner);
  bed.userData.caption = { en: 'A charpai, for reading in the shade', pnb: 'منجی' };
  hoverables.push(bed);

  return { hoverables };
}
