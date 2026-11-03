// Minimal .xlsx reader: returns each sheet as rows of plain-text cells.
// An .xlsx file is a zip of XML files; we only need the cell values, so this
// avoids heavy spreadsheet libraries that break on notes, styles or new Excel features.

import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

// Join every <t> inside a fragment (handles rich text with several runs).
function allText(xml) {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += decode(m[1]);
  return out;
}

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function readXlsx(path) {
  const files = unzipSync(readFileSync(path));
  const read = (name) => (files[name] ? strFromU8(files[name]) : '');

  const shared = [];
  for (const m of read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(allText(m[1]));

  // Map sheet names to their XML files
  const rels = {};
  for (const m of read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    rels[attr(m[1], 'Id')] = attr(m[1], 'Target');
  }
  const sheets = {};
  for (const m of read('xl/workbook.xml').matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decode(attr(m[1], 'name'));
    let target = rels[attr(m[1], 'r:id')];
    if (!target) continue;
    target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
    sheets[name] = `xl/${target}`;
  }

  const result = {};
  for (const [name, file] of Object.entries(sheets)) {
    const rows = [];
    for (const rm of read(file).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rowNum = parseInt(attr(rm[1], 'r'), 10) - 1;
      const cells = [];
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(cm[1], 'r');
        if (!ref) continue;
        const type = attr(cm[1], 't');
        const body = cm[2] ?? '';
        const v = body.match(/<v>([\s\S]*?)<\/v>/);
        let value = '';
        if (type === 's') value = v ? shared[parseInt(v[1], 10)] ?? '' : '';
        else if (type === 'inlineStr') value = allText(body);
        else if (type === 'e') value = '';
        else value = v ? decode(v[1]) : '';
        cells[colIndex(ref)] = value.trim();
      }
      rows[rowNum] = cells;
    }
    result[name] = rows;
  }
  return result;
}
