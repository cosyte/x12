---
"@cosyte/x12": patch
---

**The 271 reads and builds the procedure a benefit line applies to (EB-13).**

Dental payers send per-procedure coinsurance, frequency, age and maximum limits on 271 benefit lines,
keyed by a CDT code in EB-13, and the CAQH CORE eligibility data content rule calls for it. Until now
those lines read back with no procedure, and the 271 builder could not write one.

- Reading: each `X12EligibilityBenefit` now carries `procedure`, an `X12EligibilityProcedure` with the
  qualifier (EB-13-1), the code (EB-13-2), up to four modifiers in transmitted order (EB-13-3 to
  EB-13-6) and the description (EB-13-7) when the sender sent one. It is `undefined` when EB-13 is
  absent or has no qualifier. Components are split on the component separator the interchange
  declares in ISA-16, never an assumed `:`.
- Building: a 271 benefit takes an optional `procedure` (`Build271ProcedureSpec`: qualifier, code
  and modifiers) and writes it as one composite. The builder refuses an empty qualifier or code, an
  empty modifier, and more than four modifiers, because a fifth would land in the description
  position and an empty one would shift later modifiers on read. It does not write a description.
- The 270 reader's EQ-02 procedure decodes exactly as before; it now shares its decoder with the 271.

If you build an `X12EligibilityBenefit` object literal yourself, such as a test double, add
`procedure: undefined` to it. Code that reads benefits from `get271` needs no change.
