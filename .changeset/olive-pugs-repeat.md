---
"@cosyte/x12": patch
---

🩺 `Build837EnvelopeSpec.implementationConventionReference`: the caller now states the ST-03 / GS-08
implementation convention reference that `build837P` / `build837I` / `build837D` declares, one value
written to both elements (`X12-837-EMIT-IDENTIFIER-FIXED`).

The builders stamped `005010X222A2` / `005010X223A3` / `005010X224A2` with no way to change them,
and two of those are not what CMS and several state Medicaid companion guides require, so a partner
on `005010X222A1` or `005010X223A2` rejected every 837 this library built. **The defaults are
unchanged, deliberately:** which published guide identifier a partner accepts is a partner fact
rather than a spec fact, and re-stamping would silently move bytes this library already puts on the
wire. Omit the field and nothing about an existing call changes.

What the field refuses of its own, all `X12_837_BUILD_INVALID_SPEC` and none echoing the value
passed: an empty reference (it would delete ST-03 and GS-08 rather than send them empty), one
carrying an active delimiter or the release character, and one this library's own reader resolves to
a different 837 variant. Those sit on top of the element-type guard every string slot already has,
so read them as what this field adds rather than a closed account; no total is published. A
reference outside the read table is emitted as given, because nothing makes the published-errata set
provably exhaustive, and the length is not bounded.
