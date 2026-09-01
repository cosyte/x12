---
"@cosyte/x12": patch
---

The package description now names both halves of what this library does and the
scope it covers. It changes no parse and no emit behaviour: only the
`description` metadata field moves.

The previous wording, "parser and utility library", described the read half
alone, while a matching domain builder ships for every transaction that has a
reader, beside the general serializer and interchange builder. It also omitted
"healthcare", which is the scope actually implemented (HIPAA 005010);
non-healthcare EDI is out of scope, so the old sentence invited the wrong
installer. The new wording states the audience as "Node.js and TypeScript",
which is how the rest of this family spells it.

The registry copy for a published version cannot be edited afterwards, so this
takes effect for versions published from here on, not retroactively.
