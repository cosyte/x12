---
"@cosyte/x12": patch
---

Parsing, reading and building X12 now allocate far less and run faster, with every result unchanged. A segment is split into elements once instead of twice, and each element is sliced from the input between release characters instead of built a character at a time, so a large attachment no longer holds many times its size while it is parsed. The element and component helpers read a value by its index without building a path string or splitting the element again, and `X12Decimal` keeps its state in private fields instead of a shared `WeakMap`. Every parse result, warning, typed read, decimal, error and built text is the same as before, held by an output-equivalence test over a synthetic corpus.
