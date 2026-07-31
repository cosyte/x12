---
"@cosyte/x12": patch
---

The README now opens with the shared Cosyte lockup, which follows the reader's light or dark colour scheme, in place of the per-package banner image.

The old banner baked the package name and the tagline into pixels, and the two lines directly beneath the image repeated both. The shared lockup reads "Cosyte" while the heading still reads `@cosyte/x12`, so the wording no longer collides and the heading and the blockquote stay exactly as they were.

It is a `<picture>` element: a `<source>` carrying the on-dark cut for `prefers-color-scheme: dark`, and an `<img>` carrying the on-light cut as the fallback. On GitHub the dark cut is what a dark-mode reader gets. On npm the `<img>` is lifted out of the `<picture>` by the surrounding anchor, so the light cut renders, which is the right one there because npmjs.com has no dark mode. Both images were confirmed to return `200` and `image/png` before this landed.

The alt text describes the artwork rather than the package, since it is what a screen reader announces on the npm page and what a reader sees if the image fails to load.

This supersedes the banner note in the other pending changeset in this release, which described the per-package markdown image that this replaces. That image never reached the registry.

Documentation only. No runtime behaviour and no public API changed.
