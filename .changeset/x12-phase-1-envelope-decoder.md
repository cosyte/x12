---
"@cosyte/x12": patch
---

Phase 1 envelope decoder: `parseX12()` decodes ISA / GS / GE / IEA, detects
all four delimiters from fixed ISA byte positions (never assumed), surfaces 8
stable Tier-2 warning codes (control-number/group/transaction-count
mismatches, pre-005010, missing IEA/GE/SE, trailing garbage) + 4 locked
Tier-3 fatal codes (empty input, no ISA header, ISA too short, invalid
delimiters), and round-trips the ISA byte-exact. Transaction-set bodies
inside ST..SE are opaque at this phase — Phase 2 adds segment / element /
composite / repetition decode on top. Includes 4 Tier-1 envelope fixtures,
lenient never-throw + round-trip property tests, warning-codes snapshot,
and a byte-flip envelope fuzz target.
