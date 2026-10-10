# reader

Offline epub + pdf reader. One `index.html`, vanilla JS, no build step. Terminal-style UI, works on phone and desktop, syncs to a private GitHub repo.

## files
- `index.html` the whole app
- `sw.js`, `manifest.json`, `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` install + offline
- `kaikki_to_ndjson.py` turns a Wiktionary dump into the offline dictionary file

## run
Put all files in one folder on any static host (https, or localhost). `index.html` loads at the bare address.
In a Claude artifact preview it runs, but sync and the service worker are blocked.

## stack
epub.js 0.3.93 (from jsdelivr: cdnjs only has the old 0.2.x), pdf.js 3.11.174, JSZip 3.10.1. Books live in IndexedDB; settings in localStorage. Sync uses the GitHub contents API with a fine-grained PAT (Contents: read and write, scoped to the one repo), stored in localStorage on the device.

## features
- library with covers and progress; epub (paged or scroll) and pdf; light / warm / night themes; typography settings
- dictionary import keeps every entry per word (noun, verb, ...) and merges with what is stored, so re-importing is safe
- search in book (`/`), offline word definitions (`d` or select a word in an epub), epub highlights
- library states: unread / reading / finished (`e`, or automatic at 98%), filter (`f`) and sort (`o`), synced
- saved words (`s` on a definition, `W` for the list): keeps the definition, the sentence and the book, exports a tsv for Anki, synced
- flashcard review (`R`): spaced schedule (again / good / easy), keyboard or touch, progress synced with the words
- appearance reset (`0` or the button): type, spacing, margins, justify, bold and scroll mode back to defaults; theme is kept
- anonymous books (`p`): alias + plain cover on screen, synced across devices
- share target (android, installed pwa only): share an epub/pdf from any app to reader and it is added
- android back button: closes popups first, then returns to the library, then leaves the app
- footnotes open in place (tap the note, `show in book` to go there); tap an image to zoom; `B` jumps back to where you were before a search / contents / link jump; the screen stays on while a book is open (`K` toggles)
- swipe to turn pages, tap shows or hides the bars; every action has a key, `?` lists them
- phone layout under 760px (one-row bar, overflow menu, bottom sheets)
- auto-sync: on load, on closing a book, when the tab hides/shows, when back online, every 5 min

## data
IndexedDB `books` v2: `m` (metadata: id, type, title, author, cover, pct, pos, `hl` highlights, `anon`/`alias`, sync fields), `d` (file bytes), `dict` (dictionary), `words` (saved words).
Repo: `books/<id>.<ext>`, `progress.json`, `highlights.json`, `words.json`.

## sync rules
- progress: prompt only if both devices moved since the last sync, otherwise newest wins
- highlights and anonymous setting: per item, newest wins, deletes are tombstones, no prompt
- downloads use GitHub's raw media type (the JSON endpoint returns empty content over 1 MB)

## gotchas
- epub.js paginates with CSS columns. Never set max-width or padding on the book body. Margins and width go on the outer container.
- epub.js draws highlights before our styles apply, so they are redrawn after render (`hlSoon`).
- pdf has no text layer (selection drifted on justified text), so no pdf highlights. pdf search reads cached page text.
- a GitHub 404 on a private repo usually means the token cannot see that repo.
- share target is registered at install time: after changing `manifest.json`, reinstall the app (or wait for chrome to update it)
- `sw.js` refreshes the app files in the background and never caches api.github.com.

## not done
- import books already in the repo; files over ~50 MB (no LFS); backup zip
- same book added on two devices syncs as two books
- ideas: panic key, `:` command line, more themes, stats, read aloud, more formats

## working on it
- Sections are marked `/* library */`, `/* dictionary */`, `/* sync */`, `/* highlights */`, `/* search in book */`.
- After edits, syntax-check the inline script (extract it, run `new Function`).
- Real-browser tests: `npm i puppeteer-core @sparticuz/chromium epubjs@0.3.93 jszip@3.10.1 pdfjs-dist@3.11.174`, serve the folder on localhost, and answer the CDN script requests from `node_modules`. Serve `pdf.worker.min.js` from a second localhost port (a worker's request can't be intercepted). A real epub: `futurepress/epub.js` `test/fixtures/alice.epub`.