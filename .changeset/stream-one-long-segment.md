---
"@cosyte/x12": patch
---

`readTransactionSets` now reads a segment that spans many chunks, such as a large binary attachment, in time that grows with the segment's length, and a transaction set sealed before its first read keeps a value written to its `segments`.

- The stream searched a segment that had not ended yet again from its start on each new chunk, so a multi-megabyte attachment read in small chunks took time that grew with the square of its size. It now remembers how far it has searched and reads only each new chunk, joining the chunks of the segment once its end has arrived. What it yields and the warnings it reports are unchanged.
- In 0.1.16, writing `segments` on a transaction set sealed with `Object.seal` before its first read threw a `TypeError`, though a sealed set had always taken the write. The write succeeds again, and every later read answers the value written. A frozen set still refuses the write.
- The documentation now says that a transaction set the stream yields keeps a reference to about one chunk of input for as long as it is held: its segments are slices of the text they arrived in.

Nothing a caller must change.
