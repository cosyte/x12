# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). Changesets drives
the **version bump** and **publish** for `@cosyte/x12`; the human-readable release notes live in
`CHANGELOG.md` (`changelog` generation is disabled in `config.json`).

Add a changeset for every meaningful change:

```bash
pnpm changeset
```

During pre-alpha, pick **patch**. That keeps the package on the `0.0.x` ladder until its first
alpha. See the cosyte version ladder in the meta-repo's `documentation/conventions.md`.
