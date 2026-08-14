# End-to-end suite

133 browser checks over all four pages: language switching, dark/light mode,
keyboard navigation, responsive layouts, cart and form behaviour, and
console/network errors.

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

The symlink can stay. `node --test` and this suite run from the same working
state: the runner ignores `node_modules`, and the repository scanners skip it by
name before they look at what kind of entry it is (see `tools/lib/html.mjs`).

## Notes for whoever edits this next

- **Every page gets its own browser context.** A shared context shares
  `localStorage`, so the language a page boots into depends on whatever the
  previous test last clicked. That silently invalidated four assertions before
  it was fixed.
- **An open `<dialog>` makes the rest of the document inert.** Close it before
  clicking anything in the header, or the click lands on nothing and the test
  fails for a reason that has nothing to do with the bug it was written to catch.
- The untranslated-text check strips `pre`/`code` — code samples are meant to
  stay in English — and also `[lang="en"]`, because every brand or technology
  name inside an Arabic sentence is deliberately wrapped in one. What is left is
  Latin nobody translated, so the gate is zero rather than a character budget. A
  loose budget is not a gate: the old one allowed 220 characters, which the home
  page nearly filled with legitimate names while leaving room on the demo pages
  for a whole forgotten paragraph.
