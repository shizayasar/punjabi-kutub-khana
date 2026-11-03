# Punjabi Kutub Khana · پنجابی کتب خانہ

A walkable digital library of Punjabi literature in Shahmukhi. Every book is free to read at
[punjabikutubkhana.org](https://punjabikutubkhana.org).

> **© 2026 Shiza Yasar. All rights reserved.** This code is shared here for viewing only.
> You may not copy, modify, reuse or deploy it without written permission. See [LICENSE](LICENSE).

Built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev). Books are hosted on
[Internet Archive](https://archive.org) and open in its reader.

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 18 or newer).

```
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173).

## Controls

- **Walk into the library**: WASD or arrow keys to walk, mouse to look, click a book to read, Esc to pause.
- **Browse the shelves**: a plain list of every book, which is the way in on phones.

## Adding a book

Books come from the tracking spreadsheet, `Punjabi Kutub Khana.xlsx`, which lives in the folder
*above* this project.

1. Add the book as a row on the spreadsheet's **Books** tab (and its author on the **Authors** tab).
2. Save the spreadsheet, then run:

```
npm run sync
```

This rebuilds `src/books.json`. A row goes on the website only when **Script** is Shahmukhi,
**Rights status** is Public domain or Permission granted, and **Source link** is an
`archive.org/details/...` link. The script lists every row it skipped and why.

If the spreadsheet is somewhere else: `npm run sync -- "/path/to/Punjabi Kutub Khana.xlsx"`

`Room / theme` decides which shelf a book goes on. A new room gets its own shelf automatically;
add its Shahmukhi name to `ROOM_NAMES` in `src/main.js` (the script reminds you).

## Project layout

- `index.html`: page structure (welcome screen, list view, reader)
- `src/main.js`: the 3D room, shelves, walking and clicking
- `src/books.json`: the catalogue
- `src/style.css`: colours, fonts and layout
- `scripts/sync-books.mjs`: builds `src/books.json` from the spreadsheet

## License

© 2026 Shiza Yasar. All rights reserved. The code and design of this website may not be copied,
modified, redistributed or used to run another website without written permission. See [LICENSE](LICENSE).

The books shown in the library are not covered by this notice. Each keeps its own rights status;
see the credit shown in the reader.
