---
"@cosyte/x12": patch
---

A new check answers whether an 835 adjustment's group, reason and remark codes
are a combination a CORE Code Combinations table lists for a CORE-defined
business scenario you name, instead of only whether each code exists. Nothing
about what this package parses or emits moves with it: `get835`, `build835`,
the decoded 835 model and the warning codes are unchanged.

**You supply the table and name its version.** No copy, excerpt or default of
the CORE Code Combinations table ships in this package. CAQH CORE revises it
several times a year and publishes it under its own notice, so the version a
posting system follows is that system's to load. `checkCoreCodeCombination`
takes your table (a `version` label of your choosing and one row per scenario,
group code, reason code and optional remark code), one of the four
CORE-defined business scenarios in `CORE_BUSINESS_SCENARIOS`, one adjustment,
and the remarks you pair with it. The 835 carries remarks per claim and per
service line rather than per adjustment, so which remarks accompany an
adjustment is your choice.

**Three answers, and `unevaluated` is never permission.** `in-table` means the
table has a row for that scenario, group code and reason code and lists every
remark you passed with them; with no remarks, a row for the pair suffices.
`not-in-table` means the table has rows for the scenario and the combination
is not among them, including one it lists only under another scenario.
`unevaluated` names its reason: no table, a scenario outside the four, no rows
for that scenario, an empty group or reason code, or a remark whose code system
is not `HE`. Your table's version label comes back beside every answer given
against it, exactly as you supplied it.

**Exact, and safe on odd codes.** Codes are compared exactly as written, with
no case folding and no trimming, and a code named after an `Object.prototype`
property is an ordinary code that the table lists only when a row names it.

**A malformed table is refused.** A missing or empty version label, a row
naming an unknown scenario, a row with a missing or empty group or reason code,
or a non-string remark code throws the new `CoreCodeCombinationTableError`
with the code `X12_CORE_COMBINATION_TABLE_INVALID`. Its message names the
field and the row index and never a value from your table.

Exported alongside the check: `CORE_BUSINESS_SCENARIOS`,
`CORE_CODE_COMBINATION_OUTCOMES`, `CORE_CODE_COMBINATION_UNEVALUATED_REASONS`,
`CORE_CODE_COMBINATION_ERROR_CODES`, `CoreCodeCombinationTableError`, and the
types `CoreBusinessScenario`, `CoreCodeCombinationTable`,
`CoreCodeCombinationRow`, `CoreCodeCombinationQuery`,
`CoreCodeCombinationResult`, `CoreCodeCombinationOutcome`,
`CoreCodeCombinationUnevaluatedReason`, `CoreCodeCombinationErrorCode` and
`CoreCodeCombinationTableField`.
