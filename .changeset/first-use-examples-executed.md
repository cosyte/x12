---
"@cosyte/x12": patch
---

Docs: the quickstart's first example now reads the same committed synthetic 835 fixture as the README usage example, byte for byte, and the test suite executes it with every claimed value asserted.

A changed value in that example's interchange or in one of its claimed results now fails the suite, the README gate is pinned to the first block under `## Usage` and shown able to go red on a changed claim, and every install command the README and the installation page print is checked against the package's own name.

The README usage example did not compile in a strict TypeScript project: `get835` returns `undefined` for a transaction set that is not an 835, and the example read `remit.payment` without checking. It now throws on `undefined` first, as the quickstart already did, and the suite compiles both first examples with the settings `tsc --init` writes for a new project, so an example that does not compile fails it.
