---
"@cosyte/x12": patch
---

Fixed three doc errors: three type comments gave the 835 remit balance with the PLB amounts added, where the parser and `build835` subtract them, the PLB adjustment type said its reason code held the whole composite, and the README named `parseDocumentDate`, which the package does not export.

The remit balance now reads BPR-02 equals the sum of the claim payments (CLP-04) minus the sum of the PLB amounts, each in its raw sign, on `X12Decimal`, `X12RemitPaymentHeader`, and `X12RemitProviderAdjustment`. The claim and service-line balances on `X12Decimal` and `X12RemitServiceLine` now match the checks too. `X12RemitProviderAdjustment` now says `reasonCode` is the first component of the PLB reason composite (`WO`) and `subCode` the second (`123456`), as the parser stores them. The README, the cookbook, and the date conversion comments now name `checkCarcValidity` and `checkRarcValidity`, the exported date-aware queries that throw an `X12CodeListError` on a document date they refuse. No code, type, or behavior changes.
