---
"@cosyte/x12": patch
---

The differential harness now reads the eligibility pair (270/271, 005010X279A1) and the claim
status pair (276/277, 005010X212) through a second independent open-source X12 reader,
LinuxForHealth x12, so the transactions pyx12 publishes no 005010 map for are compared element
position by element position instead of against nothing. Nothing about what this package parses or
emits moves with it, and its published runtime dependency set stays empty.

**What runs.** `pnpm run differential` now takes an ordered list of oracles, pyx12 first. A read-scope
transaction is compared against the first oracle that maps it and against no other, so every
transaction pyx12 compared before is still compared against pyx12 alone, with the same documents,
positions and divergences. The second oracle reads each document through its own transaction model
for the implementation guide the document declares, and a document that model refuses is recorded as
unevaluated with the oracle and its refusal kind, never counted as agreement; a transaction that no
document reaches both readers for still fails the run. Its requirement pins the oracle, every package
it runs on (Pydantic included, which its own metadata leaves free) and the Python version exactly,
and the harness refuses to run, writing no report, when any of those is not what the running oracle
reports or when the requirement leaves one free.

**What the report carries.** Each oracle's name, version and licence as the installed reader declares
them, and for the second also the Python version and the companion package versions it ran with. Each
compared transaction, divergence and oracle refusal names the oracle it belongs to, and each compared
transaction names the implementation guide and the map or model that oracle bound it to. The report's
`schemaVersion` is now 2. The transactions neither oracle maps (the 278 in both directions, the
dental claim, the two 006020 guides and the TA1) stay on the uncovered list, each with a reason naming
both oracles and their exact versions.

**How it is checked.** `pnpm run differential:check` runs the same comparison and exits 0 only when the
live report reproduces the committed one, divergences included, with the provenance block set aside.
The repository's CI job now provisions the pinned Python version and both oracles at their pins and
runs that one command.

**What it does not prove.** Agreement with either reader is not conformance to a Technical Report Type
3 and it is not a compliance statement, and the second oracle's model refuses a good part of the
synthetic corpus, so its comparisons cover only the documents it accepted. `KNOWN-LIMITATIONS.md` is
rewritten in the same change to say which reader compares what and where each stops. A synthetic 276
whose subscriber is the patient is added to the corpus, because the second oracle's 276 model refuses
every 276 fixture that carries a dependent level beside the subscriber's own claim.

Implements S0382-x12-21.
