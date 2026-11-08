# AGENT.md

guide for ai agents (and humans) working on this repo. `README.md` has the full feature list, data model, sync rules and gotchas. read its **gotchas** section before touching layout, epub or pdf code. this file is the short version of how to work here without breaking things.

## what this is
offline epub + pdf reader. one `index.html`, vanilla js, no build step, no framework, no package.json. installable pwa with github-repo sync. terminal-style ui, phone and desktop.

## files
- `index.html` the whole app (css, markup, js inline)
- `sw.js` service worker: app-shell cache + cdn/font cache
- `manifest.json` pwa + android share target
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` icons
- `kaikki_to_ndjson.py` wiktionary dump -> offline dictionary (mentioned in the readme, not always in the zip)

## hard rules
- **no build step.** no bundlers, no npm deps in the shipped app, no typescript, no framework. keep it one static folder.
- **everything stays in `index.html`.** don't split into modules or extra files unless asked.
- **external scripts are pinned:** jszip 3.10.1, epub.js 0.3.93 (jsdelivr, cdnjs only has 0.2.x), pdf.js 3.11.174. never use `latest` or a range. if you change a version, bump `CACHE` in `sw.js`.
- **no new network hosts.** only the cdns above, google fonts, and `api.github.com` (sync). `sw.js` must never cache `api.github.com`.
- **github token stays on-device** (localStorage). never log it, never put it in a url, never sync it.
- **don't break offline.** books live in IndexedDB, so anything the reader needs after first load must work with no network.
- **don't change the IndexedDB schema** (`books` v3: `m`, `d`, `dict`, `words`) without a proper `onupgradeneeded` migration.

## ui and style
- fonts: **Geist** for ui, **Geist Mono** for status bar, command prompt, help and code. both via the `--sans` and `--mono` css vars on `:root`. use the vars, never hardcode a family.
- the book reader fonts (`FONTS` object: serif / literata / sans / mono) are separate from the ui font, they render inside epub iframes. don't merge them.
- the terminal look is enforced by an override block (starts at the `:root{--mono...}` line, near the end of the `<style>`). it sets `border-radius:0!important` and strips shadows and blur on everything. **edit the override block, not the older base rules above it**, or your change will lose.
- themes: `light`, `warm`, `calm`, `night`, `black` (keys `1`-`5`). `night` and `black` are oled themes (`data-oled`): pure blacks, pixel shift, auto-hiding bar. test any ui change in all five.
- phone layout kicks in under 760px. check both.
- every user action needs a **keyboard shortcut** and a **`:command`**. shortcuts live in `key()`, commands in the `CMDS` array, and the `?` help text must be updated to match.
- lowercase ui copy, terse. match the existing tone.

## code style
- dense, compact vanilla js: `const` arrows, short names, one-line helpers (`$`, `esc`, `tx`, `toast`). match what's there, don't reformat existing code.
- state is plain globals (`S` settings, `cur` open book, `rend` epub rendition, `PD` pdf state, `GH` sync config). `S` persists to localStorage key `rd`, `GH` to `gh`.
- some functions get wrapped after definition (`setTheme`, `lib`). if you change those, check the wrappers.
- always escape user or book text with `esc()` before it goes into `innerHTML`. book titles, dictionary entries and highlights are untrusted.
- sections are marked `/* library */`, `/* dictionary */`, `/* sync */`, `/* highlights */`, `/* search in book */`, `/* layout */`, `/* oled care */`. put new code in the right one.

## don't touch lightly
- **epub layout:** `measureBox` / `applyBox` / `relayout` / `ANCH` / `laying`. the book box must be one integer, even-sized div with a left margin. half pixels show slivers of the next page. never set max-width or padding on the book body.
- **page counter:** `runCount` / `PCTOK` renders a hidden rendition offscreen. keep the stale-guard.
- **pdf text layer:** one span per word in the page's own embedded font. highlights are rects stored as fractions of page size.
- **sync:** progress prompts only if both devices moved, highlights are per-item newest-wins with tombstones, `pc` (page count cache) is local only. read the readme's sync rules before changing `syncAll`, `syncHL`, `syncWords`.

## service worker
- shell files are stale-while-revalidate, so deploys show up on the second load.
- cdn and font requests are cache-first forever. **bump `CACHE` in `sw.js` whenever you change a pinned library version, the fonts link, or the shell file list.**
- share target is registered at install time. after editing `manifest.json`, the app has to be reinstalled.

## testing
no test suite. do this after every edit:
1. extract the inline `<script>` and run `node --check` on it.
2. serve the folder over localhost (https or localhost is required for the service worker) and open it.
3. real-browser checks: add an epub and a pdf, turn pages, resize and resize back, tap to show/hide bars, search, define a word, add a highlight, run `:sync` with a throwaway repo, go offline and reload.

full puppeteer setup is in the readme under "working on it". still untested in a real browser per the readme: the integer box, `relayout`, and the page counter. be honest about that if you touch them.

## before you finish
- syntax check passes
- all five themes look right, desktop and phone width
- `?` help and `CMDS` updated if you added an action
- `CACHE` bumped in `sw.js` if you touched fonts, cdn versions or the shell list
- readme updated if behavior, data or sync rules changed
