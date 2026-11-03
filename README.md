# Punjabi Kutub Khana · پنجابی کتب خانہ

A walkable digital library of Punjabi literature in Shahmukhi. Every book is free to read.

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

1. Add the book to the tracking spreadsheet first (rights checked, Shahmukhi edition, Internet Archive link).
2. Add an entry to `src/books.json`:

```json
{
  "id": "PKK-006",
  "titleShahmukhi": "…",
  "titleEnglish": "…",
  "author": "…",
  "authorShahmukhi": "…",
  "room": "Sufi Shrines",
  "year": "1930",
  "archiveId": "the-part-after-archive.org/details/",
  "credit": "Who scanned or edited it"
}
```

`room` decides which shelf it goes on. A new room name gets its own shelf automatically.
Add its Shahmukhi name to `ROOM_NAMES` in `src/main.js`.

## Project layout

- `index.html`: page structure (welcome screen, list view, reader)
- `src/main.js`: the 3D room, shelves, walking and clicking
- `src/books.json`: the catalogue
- `src/style.css`: colours, fonts and layout

## License

Code: MIT. Each book keeps its own rights status; see the credit shown in the reader.
