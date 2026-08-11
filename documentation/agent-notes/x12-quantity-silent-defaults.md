# `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, on that trap's THIRD relocation: the hook refused the first
> correction by 70 bytes and the second by 78, and the answer to that is another relocation, never a
> shorter claim. The narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-quantity-silent-defaults-2026-08-05`; this file is the imperative
> set that used to sit in `CLAUDE.md` and it is unchanged below.

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
