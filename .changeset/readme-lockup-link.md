---
"@cosyte/x12": patch
---

The README lockup now links to cosyte.com (`ASSETS`).

The `<picture>` block above the H1 is wrapped in an anchor to https://cosyte.com, per the founder
requirement of 2026-08-06. Nothing inside the block moved: the `<source>`, the `<img>`, the alt text
and both tile URLs are byte-identical.

What the anchor does was measured on both surfaces by `fhir`, not assumed, because fourteen READMEs
carry this shape. On GitHub the anchor works and the colour-scheme switch keeps working, because the
`<img>` stays a direct child of `<picture>`, which is the condition the HTML spec puts on `<source>`
applying at all. On an npm package page the anchor is lost: npm wraps a README image in its own
anchor to the image file, a nested anchor is not representable, so the parser closes ours early and
the image ends up linked to the image file rather than to cosyte.com. Shipped anyway by founder
decision of 2026-08-07: on npm that is no worse than the unlinked lockup it replaces, and GitHub is
where these READMEs are read.
