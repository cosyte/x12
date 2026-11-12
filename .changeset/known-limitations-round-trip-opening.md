---
"@cosyte/x12": patch
---

`KNOWN-LIMITATIONS.md` now opens by naming all five constructs a round trip does not reproduce (line breaks between segments, a doubled segment terminator, a missing final segment terminator, a TA1 that followed a functional group, and bytes after the IEA), matching its own `serialize(parse(s)) === s` entry and the troubleshooting page, where it named only the first two. No code changes.
