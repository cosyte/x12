---
"@cosyte/x12": patch
---

Typed read and emit support for the two claims attachments guides 45 CFR
162.920 now incorporates, at (a)(19) and (a)(20), and 45 CFR 162.2002 adopts for
the period on and after May 26, 2028: the 277 Health Care Claim Request for
Additional Information (`006020X313`) and the 275 Additional Information to
Support a Health Care Claim or Encounter (`006020X314`).

**The 277 request for additional information.**
`get277RequestForAdditionalInformation` reads a 277 declaring `006020X313` into
a model labelled `"request-for-additional-information"`, which is neither
assignable to nor from the claim status response type and carries no claim
status label: every hierarchical level with its NM1 names, and under it each
claim-level request with its TRN, STC, REF, DTP, QTY and AMT segments and its SVC
service lines. Where an STC composite's C043-04 is present, C043-02 is not
looked up in the claim status code list, because C043-04 names its code source
(a LOINC code naming the attachment requested, say). It returns nothing for a
277 of any other guide, and `get277Status` still labels a `006020X313` document
`"unrecognized-guide"`. `build277RequestForAdditionalInformation` writes one,
GS-01 `HN`, refusing no level, no claim-level request, a request with no trace,
an empty C043-01 or C043-02, and a service line with no SVC.

**The 275.** `get275Attachments` returns each BDS as one attachment in document
order, with BDS-01, BDS-02 and BDS-03 as sent and the LX line it was sent under.
The data is never decoded, and it is held in `X12AttachmentData`, whose string,
JSON and `util.inspect` forms say how many octets it holds and nothing else;
`readOctets()` returns them verbatim. An attachment whose length the parser
could not verify carries its framing warning on the reading and
`lengthVerified: false`. `build275` writes GS-01 `PI`, BDS-03 as exactly the
caller's octets with no release escaping, and BDS-02 as their count, refusing no
attachment, empty data, a filter code that is not three characters, and data
holding a character that is not one octet.

**Additions only.** Two `X12_TR3_CONFORMANCE` rows, `006020X313` for the 277
(variant `RFAI`) and `006020X314` for the 275, each incorporated by reference.
Four warning codes, each with a position-only factory:
`X12_277_RFAI_HEADER_ABSENT`, `X12_277_RFAI_LEVEL_ABSENT`,
`X12_277_RFAI_REQUEST_ABSENT` and `X12_275_ATTACHMENT_ABSENT`. No refusal of
either builder carries an attachment octet or any other document value. No
existing reader, builder, code or message changes.
