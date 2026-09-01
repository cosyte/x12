---
"@cosyte/x12": patch
---

`README.md` is rewritten to the house package-page standard, and a test now holds it there. No
library behaviour changes: this is the npm package page and the repository landing page, nothing
under `src/` moved.

**What the page gains.** `Why this exists`, `Status`, `Install`, `PHI and safety` and
`Contributing` are all new sections, and `API` and `Compatibility` now hold the accuracy the old
`What's inside` had buried in one very long list. The tagline is a one-line hook inside the
120-character ceiling instead of a 200-character sentence, and the banner carries the declared alt
text for the light tile rather than a hand-written description of the mark.

**What the page keeps, deliberately.** Four claims this page had already earned survive the rewrite
and are asserted by name, because a standardization sweep is exactly what deletes them: that only
four structural failures are ever fatal, that `serialize(parse(s)) === s` is not guaranteed in
general, that no EDI amount is ever handed to `parseFloat`, and that `X12ParseError.snippet` is a
bounded copy of the input that can carry PHI and is not redacted. The `Trademarks` section stays.

**The usage example is now executed.** The `## Usage` block is extracted, compiled and run against
a build of this package on every `pnpm test`, and the values it shows as output are asserted, so a
reader (or an agent) lifting it verbatim gets working code. It declares its own input rather than
opening on an undeclared variable, and the interchange in it is a byte-for-byte copy of a synthetic
fixture the PHI gate already sweeps.

**The page now follows `package.json` rather than restating it independently.** The description
paragraph, the version named in `Status` and the Node engine floor named in `Install` are each
pinned to the manifest by a drift check that names both values when they diverge, so changing
`description`, `version` or `engines.node` without updating the page fails the suite instead of
publishing a page that contradicts the manifest beside it. Relative links are checked to resolve,
and a repo-root markdown file cited from the page must be in `files`, because an installed tarball
cannot open one that is not.
