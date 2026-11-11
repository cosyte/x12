---
"@cosyte/x12": patch
---

The README now states plainly that this package does not validate a document against its implementation guide (TR3): it checks the ASC X12 base standard, the few guide facts each typed reader needs to build its model, and one CAQH CORE rule (the CORE 360 Code Combinations, through `checkCoreCodeCombination` with a table you supply), not TR3 usage such as required, situational and not-used segments and elements or the code values a guide allows. It also lists what you can check yourself with the typed readers. Nothing you call changes.
