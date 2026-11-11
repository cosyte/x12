# Examples

Small runnable programs, at least one for every transaction set family the package reads and
builds. Each one imports `@cosyte/x12` by its published name, so it runs against the built package
exactly as a consumer installs it, prints what it read or built, and checks its own output: a
mismatch exits non-zero. Every interchange in them is synthetic, with fabricated payers, providers,
patients and amounts.

Build once, then run them all:

```bash
pnpm install
pnpm build
pnpm examples
```

| File                                                                             | What it shows                                                                                                                                                         | Run                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`read-835-remittance.ts`](read-835-remittance.ts)                               | Read the money out of an 835: the payment, each claim's charged, paid and patient-owes split, and the adjustment reasons, then check it balances with exact decimals. | `pnpm tsx examples/read-835-remittance.ts`                |
| [`read-837p-claim.ts`](read-837p-claim.ts)                                       | Read a professional claim: the variant resolved from the declared guide, the billing provider, diagnoses with their code system, and each service line.               | `pnpm tsx examples/read-837p-claim.ts`                    |
| [`build-837-institutional-and-dental.ts`](build-837-institutional-and-dental.ts) | Build an institutional and a dental claim and read each back, checking the line's variant before reading its own fields.                                              | `pnpm tsx examples/build-837-institutional-and-dental.ts` |
| [`build-271-response.ts`](build-271-response.ts)                                 | Read a 270 eligibility inquiry, then build a 271 response that echoes its trace, serialize it, and read it back.                                                      | `pnpm tsx examples/build-271-response.ts`                 |
| [`route-claim-status.ts`](route-claim-status.ts)                                 | Ask about a claim with a 276, answer with a 277 that echoes the trace, and route the rejections in a 277CA.                                                           | `pnpm tsx examples/route-claim-status.ts`                 |
| [`review-278-services.ts`](review-278-services.ts)                               | Build a 278 services review request and the response that certifies it, and read the decision back.                                                                   | `pnpm tsx examples/review-278-services.ts`                |
| [`read-834-enrollment.ts`](read-834-enrollment.ts)                               | Build an 834 roster, then read the header and each member, acting on the maintenance type code.                                                                       | `pnpm tsx examples/read-834-enrollment.ts`                |
| [`build-820-premium-payment.ts`](build-820-premium-payment.ts)                   | Build an 820 premium payment, read it back, and reconcile the open items against the deposit with exact decimals.                                                     | `pnpm tsx examples/build-820-premium-payment.ts`          |
| [`acknowledge-with-999.ts`](acknowledge-with-999.ts)                             | Acknowledge a received claim batch with a 999 built from its envelope, then read the acknowledgment the way the submitter will.                                       | `pnpm tsx examples/acknowledge-with-999.ts`               |
| [`reject-interchange-with-ta1.ts`](reject-interchange-with-ta1.ts)               | Reject an interchange whose trailer does not match its header with a TA1, then read the TA1 back.                                                                     | `pnpm tsx examples/reject-interchange-with-ta1.ts`        |
| [`acknowledge-from-parse.ts`](acknowledge-from-parse.ts)                         | Derive the TA1 and the 999 for a received claim batch from what the parser found, build them, and read them back.                                                     | `pnpm tsx examples/acknowledge-from-parse.ts`             |
| [`answer-attachment-request.ts`](answer-attachment-request.ts)                   | Read a 277 request for additional information and answer it with a 275 attachment whose length is checked on the way back in.                                         | `pnpm tsx examples/answer-attachment-request.ts`          |

The two files under `data/` are inputs, copied from the repository's synthetic test fixtures:
`835-remittance.edi` (one payment, two claims) and `837p-claim.edi` (one professional claim). An
example that reads neither builds its input in code with the package's own builders.

CI runs `pnpm typecheck:examples`, `pnpm lint:examples`, `pnpm examples` and
`pnpm phi-scan:examples` after `pnpm build` on every pull request, so an example that drifts from
the package fails the build.
