---
"@cosyte/x12": patch
---

`WARNING_MESSAGES.X12_PRE_005010` stops asserting what ISA-12 declares. The message a consumer reads
off `w.message` said "ISA-12 declares a version other than the HIPAA baseline `00501`, so the input
may diverge from 005010 semantics. The declared version is preserved verbatim on the model." The
guard behind it tests the twelfth element of the ISA split, so both the assertion about ISA-12 and
the phrase "the declared version" presuppose a header that framed.

This is a runtime value rather than a comment, so `dist/index.mjs` and `dist/index.cjs` change. No
guard, no code, no position and no control flow moved: the same interchanges raise the same codes at
the same positions as before.

Measured on one interchange per row, reading ISA-12 at its own fixed byte offset and again off the
split:

```text
construction             ISA-12 at its fixed offset  elements[12]  X12_PRE_005010  other codes
spec-clean               "00501"                     "00501"       silent          -
ISA-12 declares 00401    "00401"                     "00401"       FIRES           -
ISA-05 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-06 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-08 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-13 carries `*`       "00501"                     "00501"       silent          X12_ISA_EXTRA_ELEMENT_SEPARATOR
```

The replacement names the element the guard read, states that raising the code does not establish
that the header split into `ISA` plus 16 elements, and points at `isa.raw`. It echoes no value, so
the message stays a static table lookup with no consumer bytes in it. `pre005010`'s docblock twin of
the same clause moves with it. The shipped troubleshooting table carried a third spelling of the
same assertion and is corrected too.
