# Himal Interactive — company website

The zero-budget marketing site for the software company, and the A6
deliverable ("initial website ideas / design prototypes") for CET257
Assessment 1.

**Live:** https://kushalthewave.github.io/interprize-project/company/

## What it is

One static HTML file plus screenshots taken from the running game. No build
step, no framework, no CDN, no analytics, no cookies — the page makes zero
third-party requests once it has loaded, which is the whole point of a
zero-budget launch: hosting is free and there is nothing to keep patched.

The palette, type scale and the reticle motif are lifted from
`src/ui/styles.css`, so the company site and the product read as one thing.

## Running it locally

    python -m http.server 8899 --bind 127.0.0.1

then open <http://127.0.0.1:8899/>.

## Deployment

`.github/workflows/deploy.yml` copies this folder into `dist/company/` on
every push to `main`, so it publishes alongside the game with no separate
hosting account.

## Images

`img/*.jpg` are real screenshots of the built game, captured with
`ppt/capture-server.mjs`. They are not concept art and are not stock.
