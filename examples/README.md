# Examples

Small runnable programs, one per job the package does. Each one imports `@cosyte/x12` by its
published name, so it runs against the built package exactly as a consumer installs it, prints what
it read or built, and checks its own output: a mismatch exits non-zero. Every interchange in them is
synthetic, with fabricated payers, providers, patients and amounts.

Build once, then run them all:

```bash
pnpm install
pnpm build
pnpm examples
```

| File                                                 | What it shows                                                                                                                                                         | Run                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`read-835-remittance.ts`](read-835-remittance.ts)   | Read the money out of an 835: the payment, each claim's charged, paid and patient-owes split, and the adjustment reasons, then check it balances with exact decimals. | `pnpm tsx examples/read-835-remittance.ts`  |
| [`read-837p-claim.ts`](read-837p-claim.ts)           | Read a professional claim: the variant resolved from the declared guide, the billing provider, diagnoses with their code system, and each service line.               | `pnpm tsx examples/read-837p-claim.ts`      |
| [`build-271-response.ts`](build-271-response.ts)     | Build a 271 eligibility response that echoes the inquiry's trace, serialize it, and read it back.                                                                     | `pnpm tsx examples/build-271-response.ts`   |
| [`acknowledge-with-999.ts`](acknowledge-with-999.ts) | Acknowledge a received claim batch with a 999 built from its envelope, then read the acknowledgment the way the submitter will.                                       | `pnpm tsx examples/acknowledge-with-999.ts` |

The two files under `data/` are the inputs, copied from the repository's synthetic test fixtures:
`835-remittance.edi` (one payment, two claims) and `837p-claim.edi` (one professional claim).

CI runs `pnpm typecheck:examples`, `pnpm lint:examples`, `pnpm examples` and
`pnpm phi-scan:examples` after `pnpm build` on every pull request, so an example that drifts from
the package fails the build.
