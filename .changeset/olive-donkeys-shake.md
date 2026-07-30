---
"@cosyte/x12": patch
---

Put the brand banner at the top of the README, and correct four claims on the package pages that were no longer true (ASSETS-P8).

The README now opens with the `@cosyte/x12` banner: a plain markdown image pointing at the absolute HTTPS URL published by the `assets` repo (`https://cosyte.com/social/cosyte-banner-x12-1200x300.png`, verified `200` and `image/png` before landing). It is a self-grounded PNG rather than an `<img>` or a `<picture>` pair, because a markdown image with an absolute URL is the construct we are willing to assert renders on both npm and GitHub, and whether npm's markdown sanitizer preserves `<picture>` is unverified. The alt text names the package and what it does, since it is what a screen reader on the npm page reads out.

Four corrections came with it, all on public pages.

The version was wrong. `README.md`, `KNOWN-LIMITATIONS.md`, and the `docs-content` pages said the package was published at `0.0.1`. It is at `0.0.2`. That literal was pinned by an earlier documentation pass and went stale on the very next release, so it is removed rather than re-pinned: the npm badge renders the live version on the README, and each page now points at `npm view @cosyte/x12 version` as the source of truth.

The scope claim was wrong. The status line said the full v1 read and emit scope, named as `270/271, 276/277/277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1`, was complete. There is no `get270` or `get276` reader and no `build270` or `build276` builder: `get271Eligibility` and `get277Status` return `undefined` for any other `ST-01`, and no 270 or 276 dispatch exists anywhere in the source. The 270 and 276 inquiry directions parse into segments and dot-paths like any other X12 input, but decode into no typed model. The claim is corrected on every page that made it, including the transaction-set list on the introduction page, the reader/builder map, and a cookbook line that called the 270 "a read-only surface" when it has no reader either. The gap is recorded in `KNOWN-LIMITATIONS.md` and on the troubleshooting page.

The serializer description implied the wrong defaults. It read as a strict, spec-clean serializer with recomputed envelope counts, which is not what you get unless you ask. `serializeX12` is byte-faithful by default, `{ specClean: true }` reconciles the envelope, and the corrected counts need `{ specClean: true, recomputeCounts: true }` together, since `recomputeCounts` does nothing on its own. A mismatch is always warned and never silently corrected.

The PHI claim was broader than the library guarantees. The README said warnings and errors carry codes and positions but never patient data. Warning messages and builder refusals are PHI-free by construction, but `X12ParseError.snippet` is a bounded copy of up to 64 characters of the offending input, so on real traffic it can carry PHI, and the library does not redact it. That was documented in the source and nowhere a consumer reads. The exception is now stated on the README, in `KNOWN-LIMITATIONS.md`, and on the troubleshooting page, with the guidance to log `err.code` and `err.position` and drop `err.snippet`.

Documentation only. No runtime behaviour and no public API changed.
