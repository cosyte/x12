---
"@cosyte/x12": patch
---

`parse999` and `parseTA1` no longer read an inherited object property name such as `toString` or `constructor` in IK3-04, IK4-03 or TA1-05 as a known code: IK3-04 and TA1-05 now narrow it to `undefined` (TA1-05 keeps the text on `noteCodeRaw`), and an IK4 carrying one is dropped as malformed, the same as any other unknown IK4-03 code.
