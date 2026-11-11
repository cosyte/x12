# src/arbitraries

fast-check generators for ASC X12, at `@cosyte/x12/arbitraries`: delimiter sets, element
values, body segments, transaction set types, whole interchanges, specs for the interchange
builder, messy interchange text and hostile input. We use them to test this library, and you
can use them to test code you build on it.

`fast-check` is an optional peer dependency: install it to use this entry point. The main
entry point, `@cosyte/x12`, never loads it.

Every generated value is synthetic and random. Nothing in one looks like a patient's name,
date of birth, member id or address, or an amount from a real claim.

## Example

```ts
import fc from "fast-check";
import { parseX12, serializeX12 } from "@cosyte/x12";
import { interchange } from "@cosyte/x12/arbitraries";

fc.assert(
  fc.property(interchange(), (ix) => {
    const text = serializeX12(ix);
    return serializeX12(parseX12(text)) === text;
  }),
);
```

## Interfaces

### DelimitersOptions

Options for [delimiters](#delimiters-2).

#### Properties

##### delimiters?

> `readonly` `optional` **delimiters?**: `"standard"` \| `"any"`

`"standard"` gives only `*`, `^`, `:` and `~`; `"any"` gives any four distinct characters of
visible ASCII punctuation but `?`. Defaults to both, the standard set one time in four.

***

### HostileInputOptions

Options for [hostileInput](#hostileinput).

#### Properties

##### maxLength?

> `readonly` `optional` **maxLength?**: `number`

The longest random string or byte run. Defaults to 200.

***

### InterchangeOptions

Options for [interchange](#interchange), [interchangeText](#interchangetext) and [interchangeSpec](#interchangespec).

#### Properties

##### delimiters?

> `readonly` `optional` **delimiters?**: `Arbitrary`\<[`Delimiters`](../src.md#delimiters)\>

The delimiters to write with. Defaults to [delimiters](#delimiters-1).

##### maxElements?

> `readonly` `optional` **maxElements?**: `number`

The most elements in a body segment. Defaults to 8.

##### maxGroups?

> `readonly` `optional` **maxGroups?**: `number`

The most functional groups. Defaults to 2.

##### maxSegments?

> `readonly` `optional` **maxSegments?**: `number`

The most body segments in a transaction set. Defaults to 6.

##### maxTransactions?

> `readonly` `optional` **maxTransactions?**: `number`

The most transaction sets in a group. Defaults to 2.

***

### SegmentOptions

Options for [segment](#segment).

#### Properties

##### ids?

> `readonly` `optional` **ids?**: readonly `string`[]

The segment ids to draw from. Defaults to common 005010 healthcare segments.

##### maxElements?

> `readonly` `optional` **maxElements?**: `number`

The most elements after the id. Defaults to 8.

##### values?

> `readonly` `optional` **values?**: `Arbitrary`\<`string`\>

The element values. Defaults to [value](#value).

***

### TransactionSetType

A transaction set type: what ST-01, GS-01 and GS-08 (and ST-03) carry for it.

#### Properties

##### functionalIdCode

> `readonly` **functionalIdCode**: `string`

The functional identifier code, GS-01, such as `HP`.

##### id

> `readonly` **id**: `string`

The transaction set identifier, ST-01, such as `835`.

##### version

> `readonly` **version**: `string`

The implementation guide, GS-08 and ST-03, such as `005010X221A1`.

***

### ValueOptions

Options for [value](#value).

#### Properties

##### maxLength?

> `readonly` `optional` **maxLength?**: `number`

The most characters. Defaults to 12.

##### minLength?

> `readonly` `optional` **minLength?**: `number`

The fewest characters. Defaults to 1.

## Functions

### delimiters()

> **delimiters**(`options?`): `Arbitrary`\<[`Delimiters`](../src.md#delimiters)\>

Generate a delimiter set: the standard one, or any four distinct characters of visible ASCII
punctuation but the release character `?`. Every set frames an interchange the parser reads.

#### Parameters

##### options?

[`DelimitersOptions`](#delimitersoptions) = `{}`

Which sets to draw.

#### Returns

`Arbitrary`\<[`Delimiters`](../src.md#delimiters)\>

An arbitrary of a [Delimiters](../src.md#delimiters).

#### Example

```ts
import fc from "fast-check";
import { delimiters } from "@cosyte/x12/arbitraries";

const [d] = fc.sample(delimiters({ delimiters: "any" }), 1);
// d is like { element: "|", repetition: "&", component: "{", segment: "#" }
```

***

### hostileInput()

> **hostileInput**(`options?`): `Arbitrary`\<`string` \| `Buffer`\<`ArrayBufferLike`\>\>

Generate hostile input for a lenient parser: random strings, random bytes, text that opens
like an ISA and then falls apart, a whole ISA followed by random text, interchanges cut short
or with text inserted and deleted anywhere, ISA included, binary segments whose octet count
is wrong, negative or huge, and interchanges as bytes in UTF-8 or Latin-1. The parser must
turn each into an interchange with warnings, or refuse it with one of its four documented
fatal errors, and never throw anything else.

#### Parameters

##### options?

[`HostileInputOptions`](#hostileinputoptions) = `{}`

The longest random run.

#### Returns

`Arbitrary`\<`string` \| `Buffer`\<`ArrayBufferLike`\>\>

An arbitrary of a string or a `Buffer`.

#### Example

```ts
import fc from "fast-check";
import { X12ParseError, parseX12 } from "@cosyte/x12";
import { hostileInput } from "@cosyte/x12/arbitraries";

fc.assert(
  fc.property(hostileInput(), (raw) => {
    try {
      parseX12(raw);
    } catch (err) {
      return err instanceof X12ParseError;
    }
    return true;
  }),
);
```

***

### interchange()

> **interchange**(`options?`): `Arbitrary`\<[`X12Interchange`](../src.md#x12interchange)\>

Generate a spec-clean interchange, parsed: an ISA over generated delimiters, sometimes a TA1,
then one or more functional groups of one or more transaction sets, each a type the library
declares a guide for, with generated body segments whose elements carry repetitions,
components and values that need the release character. Every count and control number
agrees, so the parser warns about nothing, and the interchange serializes back to the exact
text it was parsed from. Every value is random: nothing in one looks like a name, a date of
birth, a member id or an amount from a real claim.

#### Parameters

##### options?

[`InterchangeOptions`](#interchangeoptions) = `{}`

The delimiters and the size.

#### Returns

`Arbitrary`\<[`X12Interchange`](../src.md#x12interchange)\>

An arbitrary of an `X12Interchange`.

#### Example

```ts
import fc from "fast-check";
import { parseX12, serializeX12 } from "@cosyte/x12";
import { interchange } from "@cosyte/x12/arbitraries";

fc.assert(
  fc.property(interchange(), (ix) => {
    const text = serializeX12(ix);
    return serializeX12(parseX12(text)) === text;
  }),
);
```

***

### interchangeSpec()

> **interchangeSpec**(`options?`): `Arbitrary`\<[`InterchangeSpec`](../src.md#interchangespec)\>

Generate a spec for `buildInterchange`: generated delimiters, sender and receiver ids, a date
and time, control numbers, and one or more functional groups of one or more transaction sets,
each with generated body segments from [segment](#segment). Values hold characters the builder
must release, so what it writes reads back as the values given.

#### Parameters

##### options?

[`InterchangeOptions`](#interchangeoptions) = `{}`

The delimiters and the size.

#### Returns

`Arbitrary`\<[`InterchangeSpec`](../src.md#interchangespec)\>

An arbitrary of an `InterchangeSpec`.

#### Example

```ts
import fc from "fast-check";
import { buildInterchange } from "@cosyte/x12";
import { interchangeSpec } from "@cosyte/x12/arbitraries";

fc.assert(
  fc.property(interchangeSpec(), (spec) => buildInterchange(spec).warnings.length === 0),
);
```

***

### interchangeText()

> **interchangeText**(`options?`): `Arbitrary`\<`string`\>

Generate raw interchange text the parser accepts, messy on purpose: line breaks of any kind
between segments, an ISA declaring a version before 005010, counts and control numbers that
disagree, a missing SE, GE or IEA, a TA1 inside a group, segments outside any transaction set,
a doubled terminator, a segment with no id, bytes after the IEA, no final terminator (and an
end on a dangling release character or inside a binary segment's declared span), and body
segments with trailing empty elements or components, a lower-case id, padding, a release
character before a character that is no delimiter or before the terminator itself, characters
outside the X12 character sets, and a binary segment framed by its octet count. The ISA is
always whole, so the parser reads every one of these, warning about what it must, and never
refuses one.

#### Parameters

##### options?

[`InterchangeOptions`](#interchangeoptions) = `{}`

The delimiters and the size.

#### Returns

`Arbitrary`\<`string`\>

An arbitrary of the interchange text.

#### Example

```ts
import fc from "fast-check";
import { parseX12 } from "@cosyte/x12";
import { interchangeText } from "@cosyte/x12/arbitraries";

fc.assert(
  fc.property(interchangeText(), (raw) => {
    parseX12(raw); // never throws for this text
  }),
);
```

***

### segment()

> **segment**(`options?`): `Arbitrary`\<[`SegmentSpec`](../src.md#segmentspec)\>

Generate a body segment as `buildInterchange` takes one: the segment id, then each element's
value as a reader sees it (the builder releases every delimiter in it). Elements before the
last may be empty; the last never is, as X12 writes no trailing empty element.

#### Parameters

##### options?

[`SegmentOptions`](#segmentoptions) = `{}`

The ids, the most elements, and the values.

#### Returns

`Arbitrary`\<[`SegmentSpec`](../src.md#segmentspec)\>

An arbitrary of a [SegmentSpec](../src.md#segmentspec).

#### Example

```ts
import fc from "fast-check";
import { segment } from "@cosyte/x12/arbitraries";

const [spec] = fc.sample(segment({ ids: ["REF"] }), 1);
// spec is like ["REF", "", "7Q:b"]
```

***

### transactionSetType()

> **transactionSetType**(): `Arbitrary`\<[`TransactionSetType`](#transactionsettype)\>

Generate a transaction set type: an ST-01 such as `835`, the GS-01 it travels under and the
implementation guide the library declares for it, one of the 270, 271, 275, 276, 277 (with
the 277CA and the request for additional information), 278, 820, 834, 835, 837 and 999 guides.

#### Returns

`Arbitrary`\<[`TransactionSetType`](#transactionsettype)\>

An arbitrary of a [TransactionSetType](#transactionsettype).

#### Example

```ts
import fc from "fast-check";
import { transactionSetType } from "@cosyte/x12/arbitraries";

const [type] = fc.sample(transactionSetType(), 1);
// type is like { id: "835", functionalIdCode: "HP", version: "005010X221A1" }
```

***

### value()

> **value**(`options?`): `Arbitrary`\<`string`\>

Generate the text of one element or component as a reader sees it, after the release
character is taken out: letters, digits, spaces and the special characters of the X12 basic
and extended character sets, `?` and every standard delimiter among them, so a value often
holds a character the writer has to release. Never a line break or a control character.

#### Parameters

##### options?

[`ValueOptions`](#valueoptions) = `{}`

The length bounds.

#### Returns

`Arbitrary`\<`string`\>

An arbitrary of the value's text.

#### Example

```ts
import fc from "fast-check";
import { value } from "@cosyte/x12/arbitraries";

const [text] = fc.sample(value(), 1);
// text is like "Q7*b:2"
```
