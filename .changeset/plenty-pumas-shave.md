---
"@cosyte/x12": patch
---

The packaging gate that runs before publish now fails when the tarball carries no type declarations, where it used to pass.

- `@arethetypeswrong/cli` returns 0 whenever its analysis found no types at all, before it reads the problem list. An untyped package is a legitimate npm package, so the CLI treats that as a description rather than a problem.
- For a package that ships types, the same result means the declarations never made it into the tarball. That is a broken publish, and it was being reported as a pass.
- Reproduced against this package with no concurrency involved: with `dist/` removed, and with only the two declaration files removed, the CLI printed "This package does not contain types." and exited 0 in both cases.
- The second state is one every build passes through. `tsup` writes the JS in one pass and the declarations in a later one, measured 1.92 seconds apart on one clean build here, so a concurrent build or a `clean` in the same working tree lands the gate inside that interval.
- The gate now checks that every relative path `package.json` promises exists and is non-empty before it invokes the CLI, and names the missing file rather than leaving you to infer it. It also fails afterwards if the CLI still reports an untyped package, which is the case the file check structurally cannot see: declarations present on disk but excluded from the tarball by `files` or `.npmignore`.
- Options that would hide the CLI's own output are refused by name rather than tolerated, because the second check reads that output.
- No library code changed, and no published type changed. This is a release-safety change only.
