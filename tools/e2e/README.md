# End-to-end suite

110 browser checks over all four pages: language switching, dark/light mode,
keyboard navigation, responsive layouts, form validation, and console/network
errors.

This is a **development tool and is never served**. The site itself still ships
with zero dependencies — there is no `package.json` here, and this script is not
picked up by `node --test` (it is not named `*.test.mjs`).

## Running it

Playwright is not vendored. Point Node at an existing install:

```bash
ln -sfn /path/to/any/project/node_modules node_modules   # must contain playwright
DISPLAY=:0 node tools/e2e/e2e.mjs                        # headed, watchable
HEADLESS=1 node tools/e2e/e2e.mjs                        # headless
node tools/e2e/e2e.mjs "D. keyboard"                     # one group only
```

The script serves the site itself on port 8765, so no separate server is needed.

## Notes for whoever edits this next

- **Every page gets its own browser context.** A shared context shares
  `localStorage`, so the language a page boots into depends on whatever the
  previous test last clicked. That silently invalidated four assertions before
  it was fixed.
- **An open `<dialog>` makes the rest of the document inert.** Close it before
  clicking anything in the header, or the click lands on nothing and the test
  fails for a reason that has nothing to do with the bug it was written to catch.
- The untranslated-text check strips `pre`/`code` — code samples are meant to
  stay in English.
