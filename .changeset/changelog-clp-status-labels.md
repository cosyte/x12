---
"@cosyte/x12": patch
---

The `CHANGELOG.md` in the package no longer names three `CLP_STATUS` labels: the `0.1.0` entry that introduced the bundled `CLP_STATUS` list now gives the codes `1`, `4` and `22` without a label, matching the list itself, which has carried no descriptions since 0.1.14. One quoted sample segment in an older entry also drops its made-up id value, with the sentence still saying what was measured. Nothing you call changes. A new test reads every file the package publishes, its source and its docs for the descriptions the bundled lists no longer carry, so they cannot return.
