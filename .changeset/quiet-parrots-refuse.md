---
"@cosyte/x12": patch
---

Profile definition errors no longer grow with the value you passed in, and a builder handed something that is not an array now refuses instead of hanging.

- A bad profile name, quirk id, effect or fixture path used to be echoed whole: the worst error message measured 360,181 characters. The same refusal now measures 431.
- Every value a profile refusal names is capped at 63 characters, the same cap builder refusals already had. Both ceilings are exported, so you can assert them rather than trust them.
- Values whose type is the mistake stay readable as what they were: a `null` name still reports as `null`, not as the string `"null"`.
- Passing a builder a fake list, which a JSON-driven caller can do by accident, used to loop forever with no error at all. It now returns that builder's own typed, coded refusal.
- That covers every counted loop in every builder. A spec list read with `for...of` still throws a plain `TypeError` instead: it stops, but it carries no error code. See KNOWN-LIMITATIONS.md.
- Bounding a message redacts nothing, because you passed the value in and still hold it. What it buys is a fixed ceiling on anything reaching a log line or a JSON error envelope.
- Surviving characters are not escaped, and the cap counts UTF-16 code units rather than bytes, so an all-astral value is longer on the wire than the figure suggests.
- The profile name attached to the error object is deliberately left whole, so it still matches the definition you passed and you can find it.

Provenance: `renderCallerJson`, `requireCallerArray`, `BUILD_REFUSAL_VALUE_MAX_LENGTH`, `BUILD_REFUSAL_VALUE_MAX_RENDERED`, `X12ProfileError.profileName`.
