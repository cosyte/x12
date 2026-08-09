# `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05)

**RELOCATED IN FULL FROM `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED.** It paid for the
`X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` trap under that file's own ratchet: relocate first, lower
the entry as the relocation lands, never raise. The measurement, the sources and the refutation
history stay where they were, at
`documentation/agent-notes.md#x12-quantity-silent-defaults-2026-08-05`; this file carries the
imperatives that used to sit in `CLAUDE.md`.

## The imperatives, verbatim

- **🩺 A PRESENT decimal that does not decode emits `X12_UNPARSEABLE_DECIMAL` at its
  `position.elementIndex`, in all six readers; an ABSENT one emits nothing.** Both pinned.
- **🩺 THIS slice closed only the SILENCE; `X12-837-SV-UNDEFINED-DECIMAL` closed the `0`.**
- **🩺 NEVER INVERT IT INTO "an unwarned value is one the sender sent". A slot a reader never read
  cannot warn**; three shipped docs carried the bare form. Guarantee: unwarned **at an element a
  reader decoded**. The 837 instance of the other kind is the trap above.
- **PUBLISH NO CENSUS OF THE FALLBACK OUTCOMES.** The
  RULE holds: a property of the READ, not the USE.
- **ONE message, NO discriminant** (where a `ZERO`/`NOT_DECODED` pair was wrong: relocated narrative
  §8). **And assert nothing about what X12.6 type R permits;** nobody here has read it, so the
  message says "could not decode".
- **The 835 balance invariant is NOT a net: it names an equation, never an element, and exists in no
  other reader.**
- **The sink is an OPTIONAL 4th arg; the public helpers stay silent without one**, held by a source
  scan counting TOP-LEVEL ARGS, never a `, sink)` regex. **A green suite proved nothing: no fixture
  holds an unparseable decimal and a round trip CANNOT make one.**
