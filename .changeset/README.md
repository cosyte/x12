# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). Changesets drives
the **version bump**, the **publish**, and the **release section in `CHANGELOG.md`**: a release
writes its own version heading there from the changesets it consumed. So **the changeset summary
is the changelog entry**. Write it there and do not hand-edit `CHANGELOG.md`, whose sections above
`## Released before this file was generated` are generated output. The first sentence of a summary
also becomes the release headline, so write it for a consumer, with no internal identifier.

Add a changeset for every meaningful change:

```bash
pnpm changeset
```

The package is on the `0.1.x` line, and **every changeset is a `patch`**: the operator's rule of
2026-11-07 is patch versions only, and a minor or a major waits for the operator's okay in their
own words. Below 1.0 every release is a patch, and a breaking or narrowing change ships as a patch
whose changeset states the change and what a caller must do. A patch that adds something a consumer
can call says so in its summary too, because the version number does not say which kind of change
it is.

The standards every Cosyte repository follows are in `plans/standards.md` in the umbrella repository.
