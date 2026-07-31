---
"@cosyte/x12": patch
---

The README now opens with the Cosyte brand lockup, which follows the reader's light or dark colour scheme.

It is a `<picture>` element: a `<source>` carrying the on-dark cut for `prefers-color-scheme: dark`, and an `<img>` carrying the on-light cut as the fallback. On GitHub a dark-mode reader gets the dark cut. On npm the `<img>` is lifted out of the `<picture>` by the surrounding anchor, so the light cut renders, which is the right one there because npmjs.com has no dark mode. Both images were confirmed to return `200` and `image/png` before this landed.

The alt text describes the artwork rather than the package, since it is what a screen reader announces on the npm page and what a reader gets if the image fails to load. The heading and the blockquote under it are unchanged: the lockup reads "Cosyte" while the heading reads `@cosyte/x12`, so the two strings do not collide.

This supersedes a decision recorded in the other changeset in this release, and the correction is stated here rather than left implicit. That changeset put a per-package banner on the README as a plain markdown image, and it chose that construct over an `<img>` or a `<picture>` pair on the explicit ground that whether npm's markdown sanitizer preserves `<picture>` was unverified. That was an accurate statement of what was known when it was written. It has since been measured on a published package page: the sanitizer keeps the `<picture>`, and the anchor wrapper hoists the `<img>` out of it, so the light cut is what renders on npm. The reason was not wrong so much as untested, and it is now tested. Because both changes fall inside the same unreleased window, no consumer ever had the intermediate banner, so this ships as one change rather than an addition followed by a replacement.

Documentation only. No runtime behaviour and no public API changed.
