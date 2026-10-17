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
- status bar (`b`): epub shows `p.123 / 410 · 31%`, pdf shows `page / pages`. there is no slider; jump with `:42%`, `:ch 3`, contents, search, or `B` to go back
- real page count: every chapter is rendered once in a hidden copy of the reader with the current styles and its columns counted. shows `counting 12/40` until done, cached per style+size in the book's metadata. scroll mode has no pages, so it shows percent only
- night theme is oled-friendly: pure black, text `#bdbdbd`, dimmed images/pdf/highlights, dark hover states, bars (and library header) drift 0-2px every minute, the top bar hides itself 8s after it appears
- dictionary import keeps every entry per word (noun, verb, ...) and merges with what is stored, so re-importing is safe
- search in book (`/`): jumping to a result flashes the matched words for ~2s (epub and pdf), then they fade; offline word definitions (`d` or select a word in an epub), epub highlights
- library states: unread / reading / finished (`e`, or automatic at 98%), filter (`f`) and sort (`o`), synced
- saved words (`s` on a definition, `W` for the list): keeps the definition, the sentence and the book, exports a tsv for Anki, synced
- flashcard review (`R`): spaced schedule (again / good / easy), keyboard or touch, progress synced with the words
- appearance reset (`0` or the button): type, spacing, margins, justify, bold and scroll mode back to defaults; theme is kept
- command prompt (`:`): `:42` `:42%` `:/text` `:ch 3` `:theme night` `:size 22` `:open title` `:filter reading` `:sync` and more; tab completes, up/down recalls history, an empty prompt lists every command
- pdf: fit to width or whole page, zoom (`+ -`, `:zoom 150`, ctrl+wheel, pinch, double-tap), `j`/`k`/space scroll the page and roll over to the next one, contents from the pdf outline, selectable words (define, save with the sentence), search hits highlighted (`:nohl` clears)
- highlights on epubs and pdfs: select text, then press `H` or tap the highlight button that appears next to the selection (also in the define popup); `v` lists them, tap a highlight to open the list
- anonymous books (`p`): alias + plain cover on screen, synced across devices
- share target (android, installed pwa only): share an epub/pdf from any app to reader and it is added
- android back button: closes popups first, then returns to the library, then leaves the app
- footnotes open in place (tap the note, `show in book` to go there); tap an image to zoom; `B` jumps back to where you were before a search / contents / link jump; the screen stays on while a book is open (`K` toggles)
- the mouse cursor hides after 2.5s without movement while reading (not while bars or popups are open); any move or click brings it back
- swipe to turn pages, tap shows or hides the bars; every action has a key, `?` lists them
- phone layout under 760px (one-row bar, overflow menu, bottom sheets)
- auto-sync: on load, on closing a book, when the tab hides/shows, when back online, every 5 min

## data
IndexedDB `books` v3: `m` (metadata: id, type, title, author, cover, pct, pos, `hl` highlights, `anon`/`alias`, `pc` cached page count, sync fields), `d` (file bytes), `dict` (dictionary), `words` (saved words).
Repo: `books/<id>.<ext>`, `progress.json`, `highlights.json`, `words.json`.

## sync rules
- progress: prompt only if both devices moved since the last sync, otherwise newest wins
- highlights and anonymous setting: per item, newest wins, deletes are tombstones, no prompt
- the page count cache (`pc`) is local only, never synced
- downloads use GitHub's raw media type (the JSON endpoint returns empty content over 1 MB)

## gotchas
- epub.js paginates with CSS columns and turns pages by sliding exactly `width` px. the book box is one integer, even-sized `div` (`measureBox` / `applyBox`), positioned with a left margin, not flex centering. half pixels or a stale height show slivers of the neighbouring page or hide lines. never set max-width or padding on the book body.
- the bottom status bar overlays the stage (`position:absolute`) instead of resizing it. `measureBox` reserves its height up front so text never sits under it.
- resize events make epub.js re-anchor to the start of the current page. `relocated` is ignored while `laying` is true, and the position anchor (`ANCH`) only updates on a real page turn, so resizing and changing styles never walk the saved position backwards. `relayout()` = remember anchor once, resize, display anchor.
- the page counter renders a hidden `ePub.Rendition` offscreen. it is stale-guarded with `PCTOK` and restarts whenever size or style changes. it can be off by a page or two if embedded fonts or images load late.
- epub images are capped to the page height (`max-height:92vh`) so tall images cannot push text out of the column.
- epub.js draws highlights before our styles apply, so they are redrawn after render (`hlSoon`).
- the define popup header is a no-wrap flex row (`word` + highlight/save/close). keep it at 300px+ or the close button wraps.
- pdf text: pdf.js only names a generic fallback font for its text layer, so words drift when justified. we build one selectable span per word from the raw items (`disableCombineTextItems`) in the page's own embedded font (`item.fontName`). measured on a test pdf: every word within 0.5px at 50% and 250% zoom. pdf highlights are stored per page as rectangles in fractions of the page size (so they sit on the same words at any zoom) and sync like epub highlights.
- oled pixel shift uses the CSS `translate` property (separate from `transform`, so it composes with the bars' slide-in).
- a GitHub 404 on a private repo usually means the token cannot see that repo.
- share target is registered at install time: after changing `manifest.json`, reinstall the app (or wait for chrome to update it)
- `sw.js` refreshes the app files in the background and never caches api.github.com.

## not done
- import books already in the repo; files over ~50 MB (no LFS); backup zip
- same book added on two devices syncs as two books
- page count is not synced, each device counts for itself
- ideas: panic key, more themes, stats, read aloud, more formats

## working on it
- Sections are marked `/* library */`, `/* dictionary */`, `/* sync */`, `/* highlights */`, `/* search in book */`, `/* layout */`, `/* oled care */`.
- After edits, syntax-check the inline script (extract it, run `node --check`).
- Real-browser tests: `npm i puppeteer-core @sparticuz/chromium epubjs@0.3.93 jszip@3.10.1 pdfjs-dist@3.11.174`, serve the folder on localhost, and answer the CDN script requests from `node_modules`. Serve `pdf.worker.min.js` from a second localhost port (a worker's request can't be intercepted). A real epub: `futurepress/epub.js` `test/fixtures/alice.epub`.
- Still untested in a real browser: the integer box, `relayout`, and the page counter. Test resize-and-back, tap-to-show-bar, and a few page turns on a phone before trusting them.