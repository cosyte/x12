---
"@cosyte/x12": patch
---

`serializeX12` no longer adds a final terminator that the last segment would not end at. When an interchange ended without its final terminator on a segment closing with a dangling release character (`REF*EA*A?`) or on a BDS or BIN whose declared octet count ran past the end, the terminator the emit supplied was released or read as data, so the segment read back changed (`A?` became the value `A~`) and every further parse and emit added another terminator. That segment is now written as it was read, unterminated, so serializing a parsed interchange a second time gives the same bytes. Bytes after the IEA that end the same way keep no added terminator in `trailingBytes` either. Every other interchange serializes as before.
