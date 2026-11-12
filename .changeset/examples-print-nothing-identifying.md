---
"@cosyte/x12": patch
---

No example prints a value that identifies a person any more. The README usage example printed the claim's patient account number; it now prints the claim count and asserts on the account number instead, so its printed output changed from `claim PT-ACCT-001 charged 500.00` to `claims 1 charged 500.00`. The doc comments that show a person's name, a member or claim number, a date of birth, an address, a phone number or a trace in a comment now mark each value as synthetic. The docs gain a section, What is safe to log, naming the fields of this package's errors that hold raw input: `X12ParseError.snippet`, `X12CodeListError.rejectedValue`, a builder refusal's `message`, and `X12ProfileError.profileName`. Nothing in the package's behavior changes, and a caller changes nothing.
