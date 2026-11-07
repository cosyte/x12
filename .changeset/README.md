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

The package is on the `0.1.x` line. Pick the bump from what the change does to the published
package:

- **minor** for anything a consumer gains (a new export, option, transaction set or warning code),
  and for a break. Below `1.0.0` a break ships as a minor, and the summary has to spell it out with
  its migration, because the number alone tells a consumer on a `0.x` release nothing.
- **patch** for a fix, for documentation of a surface that already ships, and for a change nobody
  installing the package can observe.
- **major** only with a deliberate decision to declare `1.0.0`.

The standards every Cosyte repository follows are in `plans/standards.md` in the umbrella repository.
