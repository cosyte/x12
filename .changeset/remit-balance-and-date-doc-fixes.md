---
"@cosyte/x12": patch
---

Fixed two doc errors: three type comments gave the 835 remit balance with the PLB amounts added, where the parser and `build835` subtract them, and the README named `parseDocumentDate`, which the package does not export.

The remit balance now reads BPR-02 equals the sum of the claim payments (CLP-04) minus the sum of the PLB amounts, each in its raw sign, on `X12Decimal`, `X12RemitPaymentHeader` and `X12RemitProviderAdjustment`. The claim and service-line balances on `X12Decimal` and `X12RemitServiceLine` now match the checks too. The README, the cookbook and the date conversion comments now name `checkCarcValidity` and `checkRarcValidity`, the exported date-aware queries that throw an `X12CodeListError` on a document date they refuse. No code, type or behaviour changes.
