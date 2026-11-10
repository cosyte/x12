---
"@cosyte/x12": patch
---

Every builder now refuses an ISA value longer than its fixed width, with the builder's own `INVALID_SPEC` code and a message naming the field, instead of cutting it to fit. Before, `buildInterchange({ ...spec, interchangeDate: "20250101" })` wrote ISA-09 as `202501`, and an over-long sender or receiver id, qualifier, time or ISA-12 version was cut the same way with no warning. A short value still pads with spaces. A value that is not a string in one of these slots now refuses with the same typed code, where it used to throw an untyped `TypeError`.
