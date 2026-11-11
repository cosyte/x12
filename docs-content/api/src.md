# src

## Classes

### AckBuildError

Thrown by `build999` / `buildTA1` when the caller asks the library to
fabricate an inconsistent acknowledgment (most notably an accept paired
with errors). Carries a stable `code` for programmatic narrowing.

Throwing here is the documented contract for the cosyte ack archetype:
the library mechanically builds the disposition it is told; if the
disposition is internally inconsistent it refuses, surfacing the bug at
the call site rather than silently lying to the inbound sender.

`AckBuildError` deliberately does NOT extend `X12ParseError` - the
parser-vs-builder distinction matters at the type level (a parser catch
should never catch a builder bug, and vice versa).

#### Example

```ts
import { AckBuildError, ACK_BUILD_ERROR_CODES } from "@cosyte/x12";
try {
  build999({ ... ack: { ..., functional: { disposition: "A", ... } }, ... });
} catch (err) {
  if (err instanceof AckBuildError) {
    // err.code is one of ACK_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new AckBuildError**(`code`, `message`): [`AckBuildError`](#ackbuilderror)

**`Internal`**

Construct a new `AckBuildError`. Both fields required so every thrower
pins a stable code.

###### Parameters

###### code

[`AckBuildErrorCode`](#ackbuilderrorcode-1)

###### message

`string`

###### Returns

[`AckBuildError`](#ackbuilderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`AckBuildErrorCode`](#ackbuilderrorcode-1)

***

### Attachment275BuildError

Thrown by `build275` when a spec cannot be emitted as a 275 whose every BDS-02
is true of its BDS-03. No interchange is returned. The message carries no
attachment octet and no other document value.

#### Example

```ts
import { Attachment275BuildError } from "@cosyte/x12";
try {
  // build275(spec);
} catch (err) {
  if (err instanceof Attachment275BuildError) console.error(err.code);
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Attachment275BuildError**(`code`, `message`): [`Attachment275BuildError`](#attachment275builderror)

**`Internal`**

###### Parameters

###### code

[`Attachment275BuildErrorCode`](#attachment275builderrorcode-1)

###### message

`string`

###### Returns

[`Attachment275BuildError`](#attachment275builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Attachment275BuildErrorCode`](#attachment275builderrorcode-1)

***

### Claim837BuildError

Thrown by "./build-837.js".build837P / `build837I` / `build837D`
when the supplied claim spec cannot be emitted as a conformant,
self-consistent 837 - most importantly when the HL hierarchy spine is
structurally impossible. Carries a stable `code` for programmatic
narrowing. Messages are PHI-clean: they name structural positions
(indices, level codes) and counts, never patient names or member ids.

#### Example

```ts
import { Claim837BuildError } from "@cosyte/x12";
try {
  build837P(spec);
} catch (err) {
  if (err instanceof Claim837BuildError) {
    // err.code is one of CLAIM_837_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Claim837BuildError**(`code`, `message`): [`Claim837BuildError`](#claim837builderror)

**`Internal`**

###### Parameters

###### code

[`Claim837BuildErrorCode`](#claim837builderrorcode-1)

###### message

`string`

###### Returns

[`Claim837BuildError`](#claim837builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Claim837BuildErrorCode`](#claim837builderrorcode-1)

***

### ClaimStatus276BuildError

Thrown by "./build-276.js".build276 when the supplied request spec
cannot be emitted as a conformant, self-consistent 276. Carries a stable
`code` for programmatic narrowing. Deliberately does NOT extend
`X12ParseError` or `X12BuildError`: the domain-refusal distinction matters at
the type level.

#### Example

```ts
import { ClaimStatus276BuildError, build276 } from "@cosyte/x12";
try {
  build276(spec);
} catch (err) {
  if (err instanceof ClaimStatus276BuildError) {
    // err.code is one of CLAIM_STATUS_276_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ClaimStatus276BuildError**(`code`, `message`): [`ClaimStatus276BuildError`](#claimstatus276builderror)

**`Internal`**

###### Parameters

###### code

[`ClaimStatus276BuildErrorCode`](#claimstatus276builderrorcode-1)

###### message

`string`

###### Returns

[`ClaimStatus276BuildError`](#claimstatus276builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`ClaimStatus276BuildErrorCode`](#claimstatus276builderrorcode-1)

***

### ClaimStatus277BuildError

Thrown by "./build-277.js".build277 / "./build-277.js".build277CA when the supplied claim-status spec cannot be
emitted as a conformant, self-consistent 277 - most importantly when its
nested tree cannot form a valid HL hierarchy. Carries a stable `code` for
programmatic narrowing. Deliberately does NOT extend `X12ParseError` or
`X12BuildError` - the domain-refusal distinction matters at the type
level.

#### Example

```ts
import { ClaimStatus277BuildError } from "@cosyte/x12";
try {
  build277(spec);
} catch (err) {
  if (err instanceof ClaimStatus277BuildError) {
    // err.code is one of CLAIM_STATUS_277_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ClaimStatus277BuildError**(`code`, `message`): [`ClaimStatus277BuildError`](#claimstatus277builderror)

**`Internal`**

###### Parameters

###### code

[`ClaimStatus277BuildErrorCode`](#claimstatus277builderrorcode-1)

###### message

`string`

###### Returns

[`ClaimStatus277BuildError`](#claimstatus277builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`ClaimStatus277BuildErrorCode`](#claimstatus277builderrorcode-1)

***

### CoreCodeCombinationTableError

Thrown by "./core-code-combinations.js".checkCoreCodeCombination when
the supplied combination table is malformed. Carries a stable `code` for
programmatic narrowing, the `field` it refused and, for a row-level fault,
the zero-based `rowIndex`. Unlike "../../code-lists/errors.js".X12CodeListError
it carries no rendering of the refused value, on `message` or anywhere else.

Deliberately does NOT extend `X12ParseError` or `X12BuildError`: nothing here
parses a document or builds one, and the three stay tellable apart at the
type level.

#### Example

```ts
import { CoreCodeCombinationTableError, checkCoreCodeCombination } from "@cosyte/x12";
try {
  checkCoreCodeCombination({ table, scenario, adjustment });
} catch (err) {
  if (err instanceof CoreCodeCombinationTableError) {
    err.field; // e.g. "groupCode"
    err.rowIndex; // e.g. 3, or undefined for a table-level fault
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new CoreCodeCombinationTableError**(`code`, `message`, `field`, `rowIndex`): [`CoreCodeCombinationTableError`](#corecodecombinationtableerror)

**`Internal`**

###### Parameters

###### code

`"X12_CORE_COMBINATION_TABLE_INVALID"`

###### message

`string`

###### field

[`CoreCodeCombinationTableField`](#corecodecombinationtablefield)

###### rowIndex

`number` \| `undefined`

###### Returns

[`CoreCodeCombinationTableError`](#corecodecombinationtableerror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: `"X12_CORE_COMBINATION_TABLE_INVALID"`

##### field

> `readonly` **field**: [`CoreCodeCombinationTableField`](#corecodecombinationtablefield)

The part of the table that was refused.

##### rowIndex

> `readonly` **rowIndex**: `number` \| `undefined`

Zero-based index into `table.rows` of the refused row, or `undefined` when
the fault is in the table itself rather than in one row.

***

### Eligibility270BuildError

Thrown by "./build-270.js".build270 when the supplied inquiry spec
cannot be emitted as a conformant, self-consistent 270. Carries a stable
`code` for programmatic narrowing. Deliberately does NOT extend
`X12ParseError` or `X12BuildError`: the domain-refusal distinction matters
at the type level.

#### Example

```ts
import { Eligibility270BuildError, build270 } from "@cosyte/x12";
try {
  build270(spec);
} catch (err) {
  if (err instanceof Eligibility270BuildError) {
    // err.code is one of ELIGIBILITY_270_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Eligibility270BuildError**(`code`, `message`): [`Eligibility270BuildError`](#eligibility270builderror)

**`Internal`**

###### Parameters

###### code

[`Eligibility270BuildErrorCode`](#eligibility270builderrorcode-1)

###### message

`string`

###### Returns

[`Eligibility270BuildError`](#eligibility270builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Eligibility270BuildErrorCode`](#eligibility270builderrorcode-1)

***

### Eligibility271BuildError

Thrown by "./build-271.js".build271 when the supplied eligibility
spec cannot be emitted as a conformant, self-consistent 271 - most
importantly when its nested tree cannot form a valid HL hierarchy. Carries
a stable `code` for programmatic narrowing. Deliberately does NOT extend
`X12ParseError` or `X12BuildError` - the domain-refusal distinction
matters at the type level.

#### Example

```ts
import { Eligibility271BuildError } from "@cosyte/x12";
try {
  build271(spec);
} catch (err) {
  if (err instanceof Eligibility271BuildError) {
    // err.code is one of ELIGIBILITY_271_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Eligibility271BuildError**(`code`, `message`): [`Eligibility271BuildError`](#eligibility271builderror)

**`Internal`**

###### Parameters

###### code

[`Eligibility271BuildErrorCode`](#eligibility271builderrorcode-1)

###### message

`string`

###### Returns

[`Eligibility271BuildError`](#eligibility271builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Eligibility271BuildErrorCode`](#eligibility271builderrorcode-1)

***

### Enrollment834BuildError

Thrown by "./build-834.js".build834 when the supplied enrollment
spec cannot be emitted as a conformant, self-consistent 834 - most
importantly when a maintenance type code is outside the validated X12 875
subset. Carries a stable `code` for programmatic narrowing. Deliberately
does NOT extend `X12ParseError` or `X12BuildError` - the domain-refusal
distinction matters at the type level.

#### Example

```ts
import { Enrollment834BuildError } from "@cosyte/x12";
try {
  build834(spec);
} catch (err) {
  if (err instanceof Enrollment834BuildError) {
    // err.code is one of ENROLLMENT_834_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Enrollment834BuildError**(`code`, `message`): [`Enrollment834BuildError`](#enrollment834builderror)

**`Internal`**

###### Parameters

###### code

[`Enrollment834BuildErrorCode`](#enrollment834builderrorcode-1)

###### message

`string`

###### Returns

[`Enrollment834BuildError`](#enrollment834builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Enrollment834BuildErrorCode`](#enrollment834builderrorcode-1)

***

### LoopSpecDefinitionError

Thrown by [defineLoopSpec](#defineloopspec) when the supplied spec is structurally
invalid. Carries the offending path so a consumer fixing a typo doesn't
have to hunt: e.g. `"segments[3].id"` or `"children[0].trigger"`.

#### Example

```ts
import { defineLoopSpec, LoopSpecDefinitionError } from "@cosyte/x12";
try {
  defineLoopSpec({
    id: "2300",
    trigger: "clm",
    segments: [{ id: "clm", usage: "required", max: 1 }],
  });
} catch (err) {
  if (err instanceof LoopSpecDefinitionError) {
    // err.path === "trigger"
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new LoopSpecDefinitionError**(`path`, `message`): [`LoopSpecDefinitionError`](#loopspecdefinitionerror)

**`Internal`**

Construct a new `LoopSpecDefinitionError` with the offending path.

###### Parameters

###### path

`string`

###### message

`string`

###### Returns

[`LoopSpecDefinitionError`](#loopspecdefinitionerror)

###### Overrides

`Error.constructor`

#### Properties

##### path

> `readonly` **path**: `string`

***

### Premium820BuildError

Thrown by "./build-820.js".build820 when the supplied premium
spec cannot be emitted as a conformant, self-consistent 820. Carries a
stable `code` for programmatic narrowing. Deliberately does NOT extend
`X12ParseError` or `X12BuildError` - the domain-refusal distinction
matters at the type level.

#### Example

```ts
import { Premium820BuildError } from "@cosyte/x12";
try {
  build820(spec);
} catch (err) {
  if (err instanceof Premium820BuildError) {
    // err.code is one of PREMIUM_820_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Premium820BuildError**(`code`, `message`): [`Premium820BuildError`](#premium820builderror)

**`Internal`**

###### Parameters

###### code

`"X12_820_BUILD_INVALID_SPEC"`

###### message

`string`

###### Returns

[`Premium820BuildError`](#premium820builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: `"X12_820_BUILD_INVALID_SPEC"`

***

### Remit835BuildError

Thrown by "./build-835.js".build835 when the supplied remittance
spec cannot be emitted as a conformant, self-consistent 835 - most
importantly when it fails a §1.10.2 balance invariant. Carries a stable
`code` for programmatic narrowing. Deliberately does NOT extend
`X12ParseError` or `X12BuildError` - the domain-refusal distinction
matters at the type level.

#### Example

```ts
import { Remit835BuildError } from "@cosyte/x12";
try {
  build835(spec);
} catch (err) {
  if (err instanceof Remit835BuildError) {
    // err.code is one of REMIT_835_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Remit835BuildError**(`code`, `message`): [`Remit835BuildError`](#remit835builderror)

**`Internal`**

###### Parameters

###### code

[`Remit835BuildErrorCode`](#remit835builderrorcode-1)

###### message

`string`

###### Returns

[`Remit835BuildError`](#remit835builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Remit835BuildErrorCode`](#remit835builderrorcode-1)

***

### Rfai277BuildError

Thrown by `build277RequestForAdditionalInformation` when a spec cannot be
emitted as a 277 the base X12 006020 standard accepts. No interchange is
returned. The message carries no document value.

#### Example

```ts
import { Rfai277BuildError } from "@cosyte/x12";
try {
  // build277RequestForAdditionalInformation(spec);
} catch (err) {
  if (err instanceof Rfai277BuildError) console.error(err.code);
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new Rfai277BuildError**(`code`, `message`): [`Rfai277BuildError`](#rfai277builderror)

**`Internal`**

###### Parameters

###### code

[`Rfai277BuildErrorCode`](#rfai277builderrorcode-1)

###### message

`string`

###### Returns

[`Rfai277BuildError`](#rfai277builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`Rfai277BuildErrorCode`](#rfai277builderrorcode-1)

***

### ServicesReview278BuildError

Thrown by "./build-278.js".build278Request / "./build-278.js".build278Response when the supplied services-review spec
cannot be emitted as a conformant, self-consistent 278 - most importantly
when its nested tree cannot form a valid HL hierarchy, or when a response's
`HCR` certification action is missing the verbatim `actionCode` the builder
is forbidden to infer. Carries a stable `code` for programmatic narrowing.
Deliberately does NOT extend `X12ParseError` or `X12BuildError` - the
domain-refusal distinction matters at the type level.

#### Example

```ts
import { ServicesReview278BuildError } from "@cosyte/x12";
try {
  build278Request(spec);
} catch (err) {
  if (err instanceof ServicesReview278BuildError) {
    // err.code is one of AUTH_278_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ServicesReview278BuildError**(`code`, `message`): [`ServicesReview278BuildError`](#servicesreview278builderror)

**`Internal`**

###### Parameters

###### code

[`ServicesReview278BuildErrorCode`](#servicesreview278builderrorcode-1)

###### message

`string`

###### Returns

[`ServicesReview278BuildError`](#servicesreview278builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`ServicesReview278BuildErrorCode`](#servicesreview278builderrorcode-1)

***

### X12AttachmentData

Binary data from a BDS-03, held so that it cannot be printed by accident.

`String(data)`, a template literal, `JSON.stringify` and Node's `util.inspect`
(and so `console.log`) all render `[X12AttachmentData: <n> octets withheld]`.
The octets themselves are held in a private field that no enumeration,
spread or structured clone reaches, and are returned only by
[readOctets](#readoctets), exactly as the parser framed them: one character per
octet, no filter applied, no release unescape, no split.

#### Example

```ts
import { parseX12, get275Attachments } from "@cosyte/x12";
const ix = parseX12(buffer);
const tx = ix.groups[0]?.transactions[0];
const reading = tx === undefined ? undefined : get275Attachments(ix.delimiters, tx);
const data = reading?.attachments[0]?.data;
String(data);        // "[X12AttachmentData: 1336 octets withheld]"
data?.octetCount;    // 1336
data?.readOctets();  // the 1336 octets, one character each, verbatim
```

#### Constructors

##### Constructor

> **new X12AttachmentData**(`octets`): [`X12AttachmentData`](#x12attachmentdata)

**`Internal`**

Wrap `octets`, one character per octet. Readers construct these; a caller
building a 275 passes plain data to the builder instead.

###### Parameters

###### octets

`string`

###### Returns

[`X12AttachmentData`](#x12attachmentdata)

#### Accessors

##### octetCount

###### Get Signature

> **get** **octetCount**(): `number`

How many characters, one per octet, the data holds.

###### Returns

`number`

#### Methods

##### \[toPrimitive\]()

> **\[toPrimitive\]**(): `string`

The withheld form for every coercion hint.

###### Returns

`string`

##### readOctets()

> **readOctets**(): `string`

The data, verbatim: exactly the characters the parser framed as BDS-03,
one per octet. This is the only route to them.

###### Returns

`string`

###### Example

```ts
import type { X12AttachmentData } from "@cosyte/x12";
declare const data: X12AttachmentData;
const octets = data.readOctets();
Buffer.from(octets, "latin1"); // the bytes, where every character is at or below U+00FF
```

##### toJSON()

> **toJSON**(): `string`

The withheld form, so `JSON.stringify` carries no octet.

###### Returns

`string`

##### toString()

> **toString**(): `string`

The withheld form, never the data.

###### Returns

`string`

***

### X12BuildError

Thrown by "./build-interchange.js".buildInterchange when the
supplied envelope spec is structurally impossible. Carries a stable `code`
for programmatic narrowing. Deliberately does NOT extend `X12ParseError`
- the parser-vs-builder distinction matters at the type level.

#### Example

```ts
import { X12BuildError } from "@cosyte/x12";
try {
  buildInterchange({ ...spec, interchangeControlNumber: "0123456789" });
} catch (err) {
  if (err instanceof X12BuildError) {
    // err.code is one of X12_BUILD_ERROR_CODES
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new X12BuildError**(`code`, `message`): [`X12BuildError`](#x12builderror)

**`Internal`**

###### Parameters

###### code

`"X12_BUILD_INVALID_SPEC"`

###### message

`string`

###### Returns

[`X12BuildError`](#x12builderror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: `"X12_BUILD_INVALID_SPEC"`

***

### X12CodeListError

Thrown by the date-aware code-list queries when the supplied document date is
not a calendar day this package can read. Carries a stable `code` for
programmatic narrowing and the rejected value, so a caller can see WHICH
value was refused without re-deriving it from the message.

Deliberately does NOT extend `X12ParseError` or `X12BuildError`: nothing here
parses a document or builds one, and the three are meant to stay tellable
apart at the type level.

#### Example

```ts
import { X12CodeListError, checkRarcValidity } from "@cosyte/x12";
try {
  checkRarcValidity("N4", "not-a-date");
} catch (err) {
  if (err instanceof X12CodeListError) {
    err.rejectedValue; // '"not-a-date"'
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new X12CodeListError**(`code`, `message`, `rejectedValue`): [`X12CodeListError`](#x12codelisterror)

**`Internal`**

###### Parameters

###### code

`"X12_CODE_LIST_INVALID_DOCUMENT_DATE"`

###### message

`string`

###### rejectedValue

`string`

###### Returns

[`X12CodeListError`](#x12codelisterror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: `"X12_CODE_LIST_INVALID_DOCUMENT_DATE"`

##### rejectedValue

> `readonly` **rejectedValue**: `string`

The refused value as it appears in `message`: a BOUNDED rendering, not the
caller's own object. It goes through the same renderer and the same ceiling
every other refusal in this library uses, so an over-long value cannot make
an unbounded `Error.message`, and `null`, `"null"` and an absent value stay
tellable apart.

***

### X12Decimal

String-backed decimal for X12 R-type elements. Immutable; arithmetic
returns a new [X12Decimal](#x12decimal). Equality is mathematical (`"0.00"`
equals `"0"`), not lexical - use `toString()` for byte-exact comparison.

#### Example

```ts
import { X12Decimal } from "@cosyte/x12";
const charge = X12Decimal.fromString("500.00");
const paid   = X12Decimal.fromString("450.00");
const due    = charge?.subtract(paid!);
due?.toString();  // "50.00"
due?.isZero();    // false
```

#### Properties

##### ZERO

> `readonly` `static` **ZERO**: [`X12Decimal`](#x12decimal)

Canonical zero with `scale: 0` - `"0"`. Used as the additive identity
for balance reductions. Use `X12Decimal.fromBigInt(0n, n)` for a zero
at a specific scale.

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.ZERO.toString();      // "0"
X12Decimal.ZERO.isZero();        // true
```

#### Methods

##### abs()

> **abs**(): [`X12Decimal`](#x12decimal)

Absolute value. Scale and lexical form may change (canonical rendering
drops the leading `-`).

###### Returns

[`X12Decimal`](#x12decimal)

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("-50.00")?.abs().toString();  // "50.00"
```

##### add()

> **add**(`other`): [`X12Decimal`](#x12decimal)

Add two `X12Decimal` values exactly. Result scale is
`max(this.scale, other.scale)`; result lexical form is canonical.

###### Parameters

###### other

[`X12Decimal`](#x12decimal)

###### Returns

[`X12Decimal`](#x12decimal)

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
const a = X12Decimal.fromString("0.1")!;
const b = X12Decimal.fromString("0.2")!;
a.add(b).toString();  // "0.3" - exact, never 0.30000000000000004
```

##### compareTo()

> **compareTo**(`other`): `-1` \| `0` \| `1`

Three-way compare: `-1` if `this < other`, `0` if equal, `1` if
`this > other`. Mathematical compare across scales.

###### Parameters

###### other

[`X12Decimal`](#x12decimal)

###### Returns

`-1` \| `0` \| `1`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("10")!.compareTo(X12Decimal.fromString("9.99")!); // 1
```

##### equals()

> **equals**(`other`): `boolean`

Mathematical equality across scales (`"0.00"` equals `"0"`). For
byte-exact comparison use `a.toString() === b.toString()`.

###### Parameters

###### other

[`X12Decimal`](#x12decimal)

###### Returns

`boolean`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
const a = X12Decimal.fromString("0.00")!;
const b = X12Decimal.fromString("0")!;
a.equals(b);                  // true
a.toString() === b.toString();// false ("0.00" vs "0")
```

##### isZero()

> **isZero**(): `boolean`

True when this value is exactly zero (any scale).

###### Returns

`boolean`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("0.00")?.isZero();  // true
X12Decimal.fromString("-50")?.isZero();   // false
```

##### negate()

> **negate**(): [`X12Decimal`](#x12decimal)

Arithmetic negation. `abs() === negate()` for negative values; for
positive values flips sign; zero is its own negation.

###### Returns

[`X12Decimal`](#x12decimal)

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("50.00")?.negate().toString();   // "-50.00"
X12Decimal.fromString("-50.00")?.negate().toString();  // "50.00"
```

##### signum()

> **signum**(): `-1` \| `0` \| `1`

`-1` / `0` / `1` indicating the sign of the value. Zero values
(including `"0.00"` and `"-0.00"`) always return `0`.

###### Returns

`-1` \| `0` \| `1`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("-50")?.signum();   // -1
X12Decimal.fromString("0.00")?.signum();  // 0
X12Decimal.fromString("0.01")?.signum();  // 1
```

##### subtract()

> **subtract**(`other`): [`X12Decimal`](#x12decimal)

Subtract `other` from `this` exactly. Result scale is
`max(this.scale, other.scale)`.

###### Parameters

###### other

[`X12Decimal`](#x12decimal)

###### Returns

[`X12Decimal`](#x12decimal)

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("500.00")!.subtract(X12Decimal.fromString("50")!).toString();
// "450.00"
```

##### toNumber()

> **toNumber**(): `number`

Lossy conversion to JS `number`. **JSDoc warns:** `number` cannot
represent every X12 monetary value exactly (`0.1 + 0.2 !== 0.3`).
Helpers return `X12Decimal`, not `number`; use this only for display
or when the loss is acceptable. Magnitudes large enough to lose
precision (\> `Number.MAX_SAFE_INTEGER` after scaling) still convert
without throwing - silently lossy.

###### Returns

`number`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("1234.56")?.toNumber(); // 1234.56 (typically exact)
X12Decimal.fromString("0.1")?.toNumber();     // 0.1 (lossy at higher precision)
```

##### toString()

> **toString**(): `string`

Return the verbatim lexical form (for [X12Decimal.fromString](#fromstring))
or the canonical rendering (for arithmetic results / `fromBigInt`).
Round-trip is byte-exact when the value was produced by `fromString`.

###### Returns

`string`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("0050.00")?.toString();  // "0050.00" (verbatim)
X12Decimal.fromBigInt(5000n, 2).toString();    // "50.00" (canonical)
```

##### fromBigInt()

> `static` **fromBigInt**(`value`, `scale`): [`X12Decimal`](#x12decimal)

Construct an `X12Decimal` from a `BigInt` magnitude + scale (decimal
places). Useful when arithmetic produces a result whose lexical form
the caller wants to control. `raw` is rendered canonically (sign +
integer + optional `.fraction`).

###### Parameters

###### value

`bigint`

###### scale

`number`

###### Returns

[`X12Decimal`](#x12decimal)

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromBigInt(123456n, 2).toString();  // "1234.56"
X12Decimal.fromBigInt(-50n, 0).toString();     // "-50"
X12Decimal.fromBigInt(0n, 2).toString();       // "0.00"
```

##### fromString()

> `static` **fromString**(`raw`): [`X12Decimal`](#x12decimal) \| `undefined`

Decode an X12 R-type decimal element into an `X12Decimal`, or
`undefined` when the input is empty or does not match the shape
`[+-]?digits(.digits?)?`. **Empty string returns `undefined`, never
zero** - "not supplied" and "zero" are spec-distinct.

###### Parameters

###### raw

`string`

###### Returns

[`X12Decimal`](#x12decimal) \| `undefined`

###### Example

```ts
import { X12Decimal } from "@cosyte/x12";
X12Decimal.fromString("1234.56")?.toString(); // "1234.56"
X12Decimal.fromString("-50")?.signum();       // -1
X12Decimal.fromString("");                    // undefined
X12Decimal.fromString("1,234.56");            // undefined (X12 forbids thousands sep)
```

***

### X12ParseError

Thrown by `parseX12` when the input violates one of the 4 unrecoverable
Tier-3 structural rules (missing ISA, truncated ISA, invalid ISA
delimiters, or empty input). Carries positional context plus a short
snippet of the offending input so consumers can log actionable errors.

#### Remarks

`snippet` is the library's ONE deliberate PHI exception, and it exists for
the four Tier-3 structural fatals only. Those are raised before the
envelope is readable and are undebuggable without a few bytes of context.
It may contain PHI/PII when parsing real interchanges (member IDs appear in
ISA-06/08 only as trading-partner IDs, not patient identity, but a real
claim / eligibility body elsewhere in the input can carry PHI). Redact at
the call site if required by your compliance posture; the library does not
redact snippets itself.

A strict-mode escalation of a Tier-2 warning carries `snippet: ""`. That
error's `message` is the same frozen-registry entry the warning carried and
`position` locates it, so there is nothing to attach and nothing to
redact.

#### Example

```ts
import { parseX12, X12ParseError } from "@cosyte/x12";
try {
  parseX12("");
} catch (err) {
  if (err instanceof X12ParseError && err.code === "X12_EMPTY_INPUT") {
    // handle empty input - err.position, err.snippet available
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new X12ParseError**(`code`, `message`, `position`, `snippetText`): [`X12ParseError`](#x12parseerror)

**`Internal`**

Construct a new `X12ParseError`. All four fields are required so every
thrower populates full positional context.

###### Parameters

###### code

[`X12FatalCode`](#x12fatalcode)

###### message

`string`

###### position

[`X12Position`](#x12position)

###### snippetText

`string`

###### Returns

[`X12ParseError`](#x12parseerror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: [`X12FatalCode`](#x12fatalcode)

##### position

> `readonly` **position**: [`X12Position`](#x12position)

##### snippet

> `readonly` **snippet**: `string`

***

### X12ProfileError

Thrown by `defineProfile()` and profile-validation code when a profile
definition is structurally invalid. Carries the offending profile name
(when known) so consumers can pinpoint which definition failed.

#### Example

```ts
import { defineProfile, X12ProfileError } from "@cosyte/x12";
try {
  defineProfile({ name: "" });
} catch (err) {
  if (err instanceof X12ProfileError) {
    console.error(err.message, err.profileName);
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new X12ProfileError**(`message`, `profileName?`): [`X12ProfileError`](#x12profileerror)

**`Internal`**

Construct a new `X12ProfileError`. `profileName` is optional so the
name validator can throw before a usable name is available.

###### Parameters

###### message

`string`

###### profileName?

`string`

###### Returns

[`X12ProfileError`](#x12profileerror)

###### Overrides

`Error.constructor`

#### Properties

##### profileName

> `readonly` **profileName**: `string` \| `undefined`

## Interfaces

### AaaCodeListMeta

Provenance for a bundled AAA code list. The FOUR parts a shipped
description requires all live here, beside the codes they describe, so a
consumer or a conformance test can assert the record by reading the
artifact alone.

`source` and `snapshotDate` are the source and the capture date, exposed the
way every other bundled snapshot exposes its own. `maintainingOrganization`
and `redistributionTerms` are `undefined` where that part could not be
established, which is a different statement from an empty string and is
meant to be read as one.

#### Example

```ts
import { AAA_REJECT_REASON_CODES } from "@cosyte/x12";
AAA_REJECT_REASON_CODES.meta.maintainingOrganization; // "ASC X12"
AAA_REJECT_REASON_CODES.meta.redistributionPermitsBundledDescriptions; // false
```

#### Properties

##### description

> `readonly` **description**: `string`

##### id

> `readonly` **id**: `string`

##### maintainingOrganization

> `readonly` **maintainingOrganization**: `string` \| `undefined`

Part 3: who maintains the list, or `undefined` where unestablished.

##### redistributionPermitsBundledDescriptions

> `readonly` **redistributionPermitsBundledDescriptions**: `boolean`

Whether part 4, as recorded, permits these descriptions to ship inside
the published package. Recording terms is not the same as being allowed
to bundle under them, and this is the field that says which.

##### redistributionTerms

> `readonly` **redistributionTerms**: `string` \| `undefined`

Part 4: the terms, quoted or cited, or `undefined` where unestablished.

##### snapshotDate

> `readonly` **snapshotDate**: `string`

Part 2: the date this package captured the list.

##### source

> `readonly` **source**: `string`

Part 1: the canonical source the entries were captured from.

***

### AaaCodeListSnapshot

A bundled AAA code list: its four-part provenance record plus the codes it
was permitted to ship. `codes` is empty whenever the record is incomplete.

#### Example

```ts
import { AAA_FOLLOW_UP_ACTION_CODES } from "@cosyte/x12";
Object.keys(AAA_FOLLOW_UP_ACTION_CODES.codes).length; // 0
```

#### Properties

##### codes

> `readonly` **codes**: `Readonly`\<`Record`\<`string`, `string`\>\>

##### meta

> `readonly` **meta**: [`AaaCodeListMeta`](#aaacodelistmeta)

***

### Build270AddressSpec

A postal address (N3 + N4). Mirrors
"./inquiry-types.js".X12InquiryAddress.

#### Example

```ts
import type { Build270AddressSpec } from "@cosyte/x12";
const a: Build270AddressSpec = { lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH" };
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state or province.

***

### Build270DateSpec

A DTP date or date range. `formatQualifier` (DTP-02) says which: `D8` is a
single date, `RD8` a range. Mirrors
"./inquiry-types.js".X12InquiryDate.

#### Example

```ts
import type { Build270DateSpec } from "@cosyte/x12";
const d: Build270DateSpec = { qualifier: "291", formatQualifier: "D8", value: "20260601" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time period format qualifier.

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - the date or range.

***

### Build270DependentSpec

One dependent (Loop 2000D / 2100D / 2110D) - a patient who cannot be
identified as a subscriber in their own right. Carries its OWN name, traces
and inquiries. Mirrors "./inquiry-types.js".X12InquiryDependent.

#### Example

```ts
import type { Build270DependentSpec } from "@cosyte/x12";
const d: Build270DependentSpec = {
  name: { entityIdentifierCode: "03", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "BABY" },
  inquiries: [{ serviceTypeCodes: [{ code: "35" }] }],
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build270DateSpec`](#build270datespec)[]

Loop 2100D DTP dates.

##### inquiries

> `readonly` **inquiries**: readonly [`Build270InquirySpec`](#build270inquiryspec)[]

Loop 2110D inquiries. At least one is required.

##### name

> `readonly` **name**: [`Build270NameSpec`](#build270namespec)

Loop 2100D dependent name. Required: a level with no name is refused.

##### references?

> `readonly` `optional` **references?**: readonly [`Build270ReferenceSpec`](#build270referencespec)[]

Loop 2100D REF identifiers.

##### traces?

> `readonly` `optional` **traces?**: readonly [`Build270TraceSpec`](#build270tracespec)[]

Loop 2000D TRN reassociation traces.

***

### Build270EnvelopeSpec

Interchange, group and transaction identity for the built 270. Mirrors
"./build-271-types.js".Build271EnvelopeSpec; the builder fixes GS-01
to `"HS"` (Eligibility, Coverage or Benefit Inquiry) and the version and
release to `"005010X279A1"`, so the caller never hand-codes them.

#### Example

```ts
import type { Build270EnvelopeSpec } from "@cosyte/x12";
const env: Build270EnvelopeSpec = {
  senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build270HeaderSpec

The BHT beginning-of-hierarchical-transaction header. Every field has a
builder default so a caller that has nothing to say about the header can
omit it, and the defaults are library constants or values already on the
envelope: nothing is invented out of the inquiry's content.

#### Example

```ts
import type { Build270HeaderSpec } from "@cosyte/x12";
const h: Build270HeaderSpec = { referenceId: "REQ-0001" };
```

#### Properties

##### date?

> `readonly` `optional` **date?**: `string`

BHT-04 - creation date CCYYMMDD. Default: the group date.

##### hierarchicalStructureCode?

> `readonly` `optional` **hierarchicalStructureCode?**: `string`

BHT-01 - hierarchical structure code. Default `"0022"`.

##### purposeCode?

> `readonly` `optional` **purposeCode?**: `string`

BHT-02 - transaction set purpose code. Default `"13"` (request).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BHT-03 - submitter transaction identifier.

##### time?

> `readonly` `optional` **time?**: `string`

BHT-05 - creation time HHMM. Default: the group time.

***

### Build270InformationReceiverSpec

One information receiver (Loop 2000B / 2100B) - the provider asking.

#### Example

```ts
import type { Build270InformationReceiverSpec } from "@cosyte/x12";
const r: Build270InformationReceiverSpec = {
  name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
  subscribers: [],
};
```

#### Properties

##### name

> `readonly` **name**: [`Build270NameSpec`](#build270namespec)

Loop 2100B information-receiver name.

##### references?

> `readonly` `optional` **references?**: readonly [`Build270ReferenceSpec`](#build270referencespec)[]

Loop 2100B REF identifiers.

##### subscribers

> `readonly` **subscribers**: readonly [`Build270SubscriberSpec`](#build270subscriberspec)[]

Loop 2000C subscribers (at least one required - a receiver with none is refused).

***

### Build270InformationSourceSpec

One information source (Loop 2000A / 2100A) - the payer being asked.

#### Example

```ts
import type { Build270InformationSourceSpec } from "@cosyte/x12";
const src: Build270InformationSourceSpec = {
  name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE" },
  receivers: [],
};
```

#### Properties

##### name

> `readonly` **name**: [`Build270NameSpec`](#build270namespec)

Loop 2100A information-source name.

##### receivers

> `readonly` **receivers**: readonly [`Build270InformationReceiverSpec`](#build270informationreceiverspec)[]

Loop 2000B receivers (at least one required - a source with none is refused).

##### references?

> `readonly` `optional` **references?**: readonly [`Build270ReferenceSpec`](#build270referencespec)[]

Loop 2100A REF identifiers.

***

### Build270InquirySpec

One eligibility or benefit inquiry (`EQ`, Loop 2110C / 2110D) - a single
thing being asked. At least one Service Type Code or a procedure is
required: an EQ that asks nothing is refused rather than emitted. Mirrors
"./inquiry-types.js".X12InquiryRequest minus each service type's
derived description.

#### Example

```ts
import type { Build270InquirySpec } from "@cosyte/x12";
const q: Build270InquirySpec = {
  serviceTypeCodes: [{ code: "30" }], coverageLevelCode: "IND",
};
```

#### Properties

##### coverageLevelCode?

> `readonly` `optional` **coverageLevelCode?**: `string`

EQ-03 - coverage level code.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build270DateSpec`](#build270datespec)[]

DTP dates under this inquiry.

##### diagnosisCodePointers?

> `readonly` `optional` **diagnosisCodePointers?**: readonly `string`[]

EQ-05 - diagnosis code pointers, as separated components.

##### insuranceTypeCode?

> `readonly` `optional` **insuranceTypeCode?**: `string`

EQ-04 - insurance type code.

##### procedure?

> `readonly` `optional` **procedure?**: [`Build270ProcedureSpec`](#build270procedurespec)

EQ-02 - the requested procedure, as separated components.

##### references?

> `readonly` `optional` **references?**: readonly [`Build270ReferenceSpec`](#build270referencespec)[]

REF identifiers under this inquiry.

##### serviceTypeCodes?

> `readonly` `optional` **serviceTypeCodes?**: readonly [`Build270ServiceTypeSpec`](#build270servicetypespec)[]

EQ-01 - one or more requested Service Type Codes (a repeating element).

***

### Build270NameSpec

An NM1 name loop, with the N3 / N4 address and DMG demographics that follow
it. Mirrors "./inquiry-types.js".X12InquiryName. One type for every
level, for the reason the read model gives: NM1-03 is "name last or
organization name" and the same segment carries both.

#### Example

```ts
import type { Build270NameSpec } from "@cosyte/x12";
const m: Build270NameSpec = {
  entityIdentifierCode: "IL", entityTypeQualifier: "1",
  lastNameOrOrganizationName: "DOE", firstName: "JANE",
  idQualifier: "MI", idCode: "MBR0001",
};
```

#### Properties

##### address?

> `readonly` `optional` **address?**: [`Build270AddressSpec`](#build270addressspec)

N3 + N4 postal address.

##### dateOfBirth?

> `readonly` `optional` **dateOfBirth?**: `string`

DMG-02 - date of birth (emitted with DMG-01 = `D8`).

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`PR` payer, `1P` provider, `IL` insured, `03` dependent).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### genderCode?

> `readonly` `optional` **genderCode?**: `string`

DMG-03 - gender code.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier.

##### lastNameOrOrganizationName?

> `readonly` `optional` **lastNameOrOrganizationName?**: `string`

NM1-03 - last name, or the organization name for a non-person.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build270ProcedureSpec

The EQ-02 composite medical procedure identifier, supplied as its separated
components. The builder joins them with the declared component separator, so
a caller never hand-codes a delimiter. Mirrors
"./inquiry-types.js".X12InquiryProcedure.

#### Example

```ts
import type { Build270ProcedureSpec } from "@cosyte/x12";
const p: Build270ProcedureSpec = { qualifier: "HC", code: "99213", modifiers: ["25"] };
```

#### Properties

##### code?

> `readonly` `optional` **code?**: `string`

EQ-02-2 - the procedure code.

##### description?

> `readonly` `optional` **description?**: `string`

EQ-02-7 - procedure description.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

EQ-02-3 through EQ-02-6 - procedure modifiers, in order.

##### qualifier

> `readonly` **qualifier**: `string`

EQ-02-1 - product or service id qualifier.

***

### Build270ReferenceSpec

A REF supplemental identifier. Mirrors
"./inquiry-types.js".X12InquiryReference.

#### Example

```ts
import type { Build270ReferenceSpec } from "@cosyte/x12";
const r: Build270ReferenceSpec = { qualifier: "6P", value: "GROUP0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### Build270ServiceTypeSpec

One requested Service Type Code (EQ-01). Only the verbatim `code` is
supplied: the read side looks up its description from the bundled snapshot,
so the spec deliberately omits it.

#### Example

```ts
import type { Build270ServiceTypeSpec } from "@cosyte/x12";
const st: Build270ServiceTypeSpec = { code: "30" };
```

#### Properties

##### code

> `readonly` **code**: `string`

EQ-01 - a single Service Type Code.

***

### Build270Spec

The complete spec for "./build-270.js".build270: the envelope, an
optional BHT header, and the nested informationSources / receivers /
subscribers / (dependents) tree the builder walks depth-first to compute the
HL spine.

#### Example

```ts
import { build270, type Build270Spec } from "@cosyte/x12";
const spec: Build270Spec = {
  envelope: {
    senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
    receivers: [{
      name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
      subscribers: [{
        traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
        name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
        inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
      }],
    }],
  }],
};
const ix = build270(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build270EnvelopeSpec`](#build270envelopespec)

Interchange, group and transaction identity.

##### header?

> `readonly` `optional` **header?**: [`Build270HeaderSpec`](#build270headerspec)

The BHT header. Every field defaults; the whole object may be omitted.

##### informationSources

> `readonly` **informationSources**: readonly [`Build270InformationSourceSpec`](#build270informationsourcespec)[]

Loop 2000A information sources (at least one required).

***

### Build270SubscriberSpec

One subscriber (Loop 2000C / 2100C / 2110C). Mirrors
"./inquiry-types.js".X12InquirySubscriber.

#### Example

```ts
import type { Build270SubscriberSpec } from "@cosyte/x12";
const s: Build270SubscriberSpec = {
  traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
  name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE" },
  inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build270DateSpec`](#build270datespec)[]

Loop 2100C DTP dates.

##### dependents?

> `readonly` `optional` **dependents?**: readonly [`Build270DependentSpec`](#build270dependentspec)[]

Loop 2000D dependents (a non-empty list sets the subscriber HL-04 to `"1"`).

##### inquiries?

> `readonly` `optional` **inquiries?**: readonly [`Build270InquirySpec`](#build270inquiryspec)[]

Loop 2110C inquiries. At least one is required UNLESS this subscriber
carries dependents, in which case the inquiry may sit on the dependent
instead and the subscriber is the identifying level only.

##### name

> `readonly` **name**: [`Build270NameSpec`](#build270namespec)

Loop 2100C subscriber name. Required: a level with no name is refused.

##### references?

> `readonly` `optional` **references?**: readonly [`Build270ReferenceSpec`](#build270referencespec)[]

Loop 2100C REF identifiers.

##### traces?

> `readonly` `optional` **traces?**: readonly [`Build270TraceSpec`](#build270tracespec)[]

Loop 2000C TRN reassociation traces.

***

### Build270TraceSpec

A reassociation trace (TRN). TRN-02 is the value the answering 271 echoes
back verbatim. Mirrors "./inquiry-types.js".X12InquiryTrace.

#### Example

```ts
import type { Build270TraceSpec } from "@cosyte/x12";
const t: Build270TraceSpec = { traceTypeCode: "1", referenceId: "ELIG20260601001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification.

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### Build271AddressSpec

A postal address (N3 + N4) attached to a subscriber / dependent name.
Mirrors "./types.js".X12EligibilityAddress.

#### Example

```ts
import type { Build271AddressSpec } from "@cosyte/x12";
const a: Build271AddressSpec = {
  lines: ["123 MAIN ST"], city: "ANYTOWN", state: "CA", postalCode: "90001",
};
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state / province.

***

### Build271BenefitSpec

One eligibility-or-benefit line (EB, Loop 2110C/2110D). EB-01 is the
eligibility code; EB-03 carries one-or-more Service Type Codes (emitted
as a repeating simple element). Monetary + percent + quantity are
[X12Decimal](#x12decimal). Mirrors "./types.js".X12EligibilityBenefit
minus each service type's derived `description` and the procedure's
`description`.

#### Example

```ts
import type { Build271BenefitSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const b: Build271BenefitSpec = {
  eligibilityCode: "1", coverageLevelCode: "IND",
  serviceTypeCodes: [{ code: "30" }], inPlanNetwork: "Y",
  monetaryAmount: X12Decimal.fromString("1000.00")!,
};
```

#### Properties

##### authorizationRequired?

> `readonly` `optional` **authorizationRequired?**: `string`

EB-11 - authorization / certification indicator.

##### coverageLevelCode?

> `readonly` `optional` **coverageLevelCode?**: `string`

EB-02 - coverage level code (`IND`, `FAM`, …).

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build271DateSpec`](#build271datespec)[]

Loop 2120 benefit-related DTP dates.

##### eligibilityCode

> `readonly` **eligibilityCode**: `string`

EB-01 - eligibility or benefit information code.

##### inPlanNetwork?

> `readonly` `optional` **inPlanNetwork?**: `string`

EB-12 - in-plan-network indicator (`Y` / `N` / `U` / `W`).

##### insuranceTypeCode?

> `readonly` `optional` **insuranceTypeCode?**: `string`

EB-04 - insurance type code.

##### messages?

> `readonly` `optional` **messages?**: readonly `string`[]

MSG free-form benefit messages.

##### monetaryAmount?

> `readonly` `optional` **monetaryAmount?**: [`X12Decimal`](#x12decimal)

EB-07 - monetary amount.

##### percent?

> `readonly` `optional` **percent?**: [`X12Decimal`](#x12decimal)

EB-08 - percent.

##### planCoverageDescription?

> `readonly` `optional` **planCoverageDescription?**: `string`

EB-05 - plan coverage description.

##### procedure?

> `readonly` `optional` **procedure?**: [`Build271ProcedureSpec`](#build271procedurespec)

EB-13 - the procedure this benefit line applies to.

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

EB-10 - quantity.

##### quantityQualifier?

> `readonly` `optional` **quantityQualifier?**: `string`

EB-09 - quantity qualifier.

##### references?

> `readonly` `optional` **references?**: readonly [`Build271ReferenceSpec`](#build271referencespec)[]

Loop 2120 benefit-related REF identifiers.

##### relatedEntities?

> `readonly` `optional` **relatedEntities?**: readonly [`Build271EntitySpec`](#build271entityspec)[]

Loop 2120C/D benefit-related entities (NM1).

##### serviceTypeCodes?

> `readonly` `optional` **serviceTypeCodes?**: readonly [`Build271ServiceTypeSpec`](#build271servicetypespec)[]

EB-03 - one-or-more Service Type Codes (emitted as a repeating element).

##### timePeriodQualifier?

> `readonly` `optional` **timePeriodQualifier?**: `string`

EB-06 - time period qualifier.

***

### Build271DateSpec

A DTP date / date-range on a subscriber, dependent, or benefit line.
Mirrors "./types.js".X12EligibilityDate.

#### Example

```ts
import type { Build271DateSpec } from "@cosyte/x12";
const d: Build271DateSpec = { qualifier: "307", formatQualifier: "D8", value: "20260101" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time format qualifier (`D8` / `RD8`).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - date/time value.

***

### Build271DependentSpec

One dependent (Loop 2000D / 2100D) - a patient who is not the subscriber.
Same benefit-bearing shape as a subscriber minus the nested dependents.
Mirrors "./types.js".X12EligibilityDependent.

#### Example

```ts
import type { Build271DependentSpec } from "@cosyte/x12";
const d: Build271DependentSpec = {
  name: { entityIdentifierCode: "03", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
  benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
};
```

#### Properties

##### benefits?

> `readonly` `optional` **benefits?**: readonly [`Build271BenefitSpec`](#build271benefitspec)[]

Loop 2110D eligibility / benefit lines.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build271DateSpec`](#build271datespec)[]

Loop 2100D DTP dates.

##### name?

> `readonly` `optional` **name?**: [`Build271MemberSpec`](#build271memberspec)

Loop 2100D dependent name (NM1 + DMG + N3/N4).

##### references?

> `readonly` `optional` **references?**: readonly [`Build271ReferenceSpec`](#build271referencespec)[]

Loop 2100D REF identifiers.

##### traces?

> `readonly` `optional` **traces?**: readonly [`Build271TraceSpec`](#build271tracespec)[]

Loop 2000D TRN reassociation traces.

***

### Build271EntitySpec

A non-person entity (NM1) - the information-source payer (Loop 2100A) or
information-receiver provider (Loop 2100B), or a benefit-related entity
(Loop 2120C). Mirrors "./types.js".X12EligibilityEntity.

#### Example

```ts
import type { Build271EntitySpec } from "@cosyte/x12";
const payer: Build271EntitySpec = {
  entityIdentifierCode: "PR", entityTypeQualifier: "2",
  name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`PR` payer, `1P` provider, …).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier.

##### name

> `readonly` **name**: `string`

NM1-03 - organization / last name.

***

### Build271EnvelopeSpec

Interchange + group + transaction identity for the built 271. Mirrors the
"../remit/build-835-types.js".Build835EnvelopeSpec; the builder
fixes GS-01 to `"HB"` and the version/release to `"005010X279A1"` (the
271 functional group + TR3) so the caller never hand-codes them.

#### Example

```ts
import type { Build271EnvelopeSpec } from "@cosyte/x12";
const env: Build271EnvelopeSpec = {
  senderId: "MEDPAY", receiverId: "PROVIDER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build271HeaderSpec

The BHT Beginning of Hierarchical Transaction header, which 005010X279A1
requires right after the ST of every 271. Every element but BHT-03 has a
builder default, so a caller with nothing to say about the header can omit
it; the defaults are library constants or values already on the envelope.

BHT-03 has no default, because the only right value is one the caller
holds: the BHT-03 of the 270 being answered. Omitted, it is written empty
and nothing is invented in its place.

Refused via `X12_271_BUILD_INVALID_SPEC`: an empty BHT-01, BHT-02, BHT-04 or
BHT-05, whether given as `""` or reached through an empty default (an empty
`groupDate` or `groupTime` on the envelope). Codes are written as given and
not checked against the guide's code lists.

#### Example

```ts
import type { Build271HeaderSpec } from "@cosyte/x12";
const h: Build271HeaderSpec = { referenceId: "REQ-0001" };
```

#### Properties

##### date?

> `readonly` `optional` **date?**: `string`

BHT-04 - creation date CCYYMMDD. Default: the group date (GS-04).

##### hierarchicalStructureCode?

> `readonly` `optional` **hierarchicalStructureCode?**: `string`

BHT-01 - hierarchical structure code. Default `"0022"`.

##### purposeCode?

> `readonly` `optional` **purposeCode?**: `string`

BHT-02 - transaction set purpose code. Default `"11"` (response); `"06"` is confirmation.

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BHT-03 - submitter transaction identifier, the BHT-03 of the 270 being answered. No default.

##### time?

> `readonly` `optional` **time?**: `string`

BHT-05 - creation time HHMM. Default: the group time (GS-05).

***

### Build271InformationReceiverSpec

One information receiver (Loop 2000B / 2100B) - the provider that
requested eligibility. Carries the provider entity (NM1) and its
subscribers.

#### Example

```ts
import type { Build271InformationReceiverSpec } from "@cosyte/x12";
const r: Build271InformationReceiverSpec = {
  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
  subscribers: [],
};
```

#### Properties

##### entity

> `readonly` **entity**: [`Build271EntitySpec`](#build271entityspec)

Loop 2100B information-receiver provider entity (NM1).

##### subscribers

> `readonly` **subscribers**: readonly [`Build271SubscriberSpec`](#build271subscriberspec)[]

Loop 2000C subscribers (at least one required - a receiver with none is refused).

***

### Build271InformationSourceSpec

One information source (Loop 2000A / 2100A) - the payer answering the
eligibility request. Carries the payer entity (NM1) and its receivers.

#### Example

```ts
import type { Build271InformationSourceSpec } from "@cosyte/x12";
const src: Build271InformationSourceSpec = {
  entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
  receivers: [],
};
```

#### Properties

##### entity

> `readonly` **entity**: [`Build271EntitySpec`](#build271entityspec)

Loop 2100A information-source payer entity (NM1).

##### receivers

> `readonly` **receivers**: readonly [`Build271InformationReceiverSpec`](#build271informationreceiverspec)[]

Loop 2000B receivers (at least one required - a source with none is refused).

***

### Build271MemberSpec

A person (subscriber Loop 2100C / dependent Loop 2100D) decoded from
NM1 + the optional DMG demographics + N3/N4 address. `idCode` is the
member identifier (NM1-09) - synthetic-only in fixtures. Mirrors "./types.js".X12EligibilityMember.

#### Example

```ts
import type { Build271MemberSpec } from "@cosyte/x12";
const m: Build271MemberSpec = {
  entityIdentifierCode: "IL", entityTypeQualifier: "1",
  lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
  dateOfBirth: "19800101", genderCode: "F",
};
```

#### Properties

##### address?

> `readonly` `optional` **address?**: [`Build271AddressSpec`](#build271addressspec)

N3 + N4 postal address.

##### dateOfBirth?

> `readonly` `optional` **dateOfBirth?**: `string`

DMG-02 - date of birth (CCYYMMDD; emitted with DMG-01 = `D8`).

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`IL` insured / subscriber, `03` dependent).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### genderCode?

> `readonly` `optional` **genderCode?**: `string`

DMG-03 - gender code (`M` / `F` / `U`).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code (the member id).

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`MI` member id).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build271ProcedureSpec

The EB-13 composite medical procedure identifier, supplied as its separated
components. The builder joins them with the declared component separator, so
a caller never hand-codes a delimiter. Mirrors
"./types.js".X12EligibilityProcedure minus the description, which the
builder does not emit.

Refused via `X12_271_BUILD_INVALID_SPEC`: an empty `qualifier` or `code`, an
empty modifier, or more than four modifiers (C003 has four modifier
positions, and a fifth would land in the description position).

#### Example

```ts
import type { Build271ProcedureSpec } from "@cosyte/x12";
const p: Build271ProcedureSpec = { qualifier: "AD", code: "D2150" };
```

#### Properties

##### code

> `readonly` **code**: `string`

EB-13-2 - the procedure code.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

EB-13-3 through EB-13-6 - up to four procedure modifiers, in order.

##### qualifier

> `readonly` **qualifier**: `string`

EB-13-1 - product or service id qualifier (`AD` for CDT, `HC` for HCPCS, ...).

***

### Build271ReferenceSpec

A REF supplemental identifier on a subscriber, dependent, or benefit
line. Mirrors "./types.js".X12EligibilityReference.

#### Example

```ts
import type { Build271ReferenceSpec } from "@cosyte/x12";
const r: Build271ReferenceSpec = { qualifier: "6P", value: "GRP0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### Build271ServiceTypeSpec

One Service Type Code (EB-03, X12 external code source 1365). Only the
verbatim `code` is supplied - the read side looks up its `description`
from the bundled snapshot, so the spec deliberately omits it.

#### Example

```ts
import type { Build271ServiceTypeSpec } from "@cosyte/x12";
const st: Build271ServiceTypeSpec = { code: "30" };
```

#### Properties

##### code

> `readonly` **code**: `string`

EB-03 - a single Service Type Code.

***

### Build271Spec

The complete spec for "./build-271.js".build271: the envelope, the
optional BHT header, and the nested informationSources → receivers → subscribers → (dependents)
tree the builder walks depth-first to compute the HL spine.

#### Example

```ts
import { build271, X12Decimal, type Build271Spec } from "@cosyte/x12";
const spec: Build271Spec = {
  envelope: {
    senderId: "MEDPAY", receiverId: "PROVIDER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
    receivers: [{
      entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
      subscribers: [{
        traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
        name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
        benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND", serviceTypeCodes: [{ code: "30" }], monetaryAmount: X12Decimal.fromString("1000.00")! }],
      }],
    }],
  }],
};
const ix = build271(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build271EnvelopeSpec`](#build271envelopespec)

Interchange + group + transaction identity.

##### header?

> `readonly` `optional` **header?**: [`Build271HeaderSpec`](#build271headerspec)

The BHT header. Every element but BHT-03 defaults; the whole object may be omitted.

##### informationSources

> `readonly` **informationSources**: readonly [`Build271InformationSourceSpec`](#build271informationsourcespec)[]

Loop 2000A information sources (at least one required).

***

### Build271SubscriberSpec

One subscriber (Loop 2000C / 2100C). Holds the echoed TRN traces, the
subscriber name + demographics, the eligibility/benefit lines, and any
non-subscriber dependents. Mirrors "./types.js".X12EligibilitySubscriber.

#### Example

```ts
import type { Build271SubscriberSpec } from "@cosyte/x12";
const s: Build271SubscriberSpec = {
  traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
  name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
  benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
};
```

#### Properties

##### benefits?

> `readonly` `optional` **benefits?**: readonly [`Build271BenefitSpec`](#build271benefitspec)[]

Loop 2110C eligibility / benefit lines.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build271DateSpec`](#build271datespec)[]

Loop 2100C DTP dates.

##### dependents?

> `readonly` `optional` **dependents?**: readonly [`Build271DependentSpec`](#build271dependentspec)[]

Loop 2000D dependents (a non-empty list sets the subscriber HL-04 to `"1"`).

##### name?

> `readonly` `optional` **name?**: [`Build271MemberSpec`](#build271memberspec)

Loop 2100C subscriber name (NM1 + DMG + N3/N4).

##### references?

> `readonly` `optional` **references?**: readonly [`Build271ReferenceSpec`](#build271referencespec)[]

Loop 2100C REF identifiers.

##### traces?

> `readonly` `optional` **traces?**: readonly [`Build271TraceSpec`](#build271tracespec)[]

Loop 2000C TRN reassociation traces.

***

### Build271TraceSpec

A reassociation trace (TRN). **The verbatim echo of the requesting 270's
trace number** - `referenceId` (TRN-02) is the value a provider matches
against the trace it sent. Mirrors "./types.js".X12EligibilityTrace.

#### Example

```ts
import type { Build271TraceSpec } from "@cosyte/x12";
const t: Build271TraceSpec = { traceTypeCode: "2", referenceId: "ELIG20260627001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification (echoed verbatim from the 270).

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code (`2` referenced - added by the payer in the 271).

***

### Build275AttachmentSpec

One attachment, written as one BDS. `data` is the octets to carry: a
`Uint8Array` (a `Buffer` is one), or a string holding one character per
octet, every character at or below U+00FF. It is written verbatim and never
encoded; `filterCode` names the filter the caller already applied.

#### Example

```ts
import type { Build275AttachmentSpec } from "@cosyte/x12";
const a: Build275AttachmentSpec = { filterCode: "B64", data: "U1lOVEhFVElD" };
```

#### Properties

##### data

> `readonly` **data**: `string` \| `Uint8Array`\<`ArrayBufferLike`\>

BDS-03, at least one octet.

##### filterCode

> `readonly` **filterCode**: `string`

BDS-01, exactly three characters.

***

### Build275BeginningSpec

The BGN, each element written as given.

#### Example

```ts
import type { Build275BeginningSpec } from "@cosyte/x12";
const bgn: Build275BeginningSpec = { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001", date: "20260601" };
```

#### Properties

##### actionCode?

> `readonly` `optional` **actionCode?**: `string`

BGN-08.

##### date?

> `readonly` `optional` **date?**: `string`

BGN-03.

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BGN-02.

##### secondReferenceId?

> `readonly` `optional` **secondReferenceId?**: `string`

BGN-06.

##### securityLevelCode?

> `readonly` `optional` **securityLevelCode?**: `string`

BGN-09.

##### time?

> `readonly` `optional` **time?**: `string`

BGN-04.

##### timeCode?

> `readonly` `optional` **timeCode?**: `string`

BGN-05.

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string`

BGN-01.

##### transactionTypeCode?

> `readonly` `optional` **transactionTypeCode?**: `string`

BGN-07.

***

### Build275EntitySpec

One NM1 of the heading, every element written as given.

#### Example

```ts
import type { Build275EntitySpec } from "@cosyte/x12";
const payer: Build275EntitySpec = { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "PAYER ONE" };
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02.

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08.

##### lastOrOrganizationName?

> `readonly` `optional` **lastOrOrganizationName?**: `string`

NM1-03.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05.

##### namePrefix?

> `readonly` `optional` **namePrefix?**: `string`

NM1-06.

##### nameSuffix?

> `readonly` `optional` **nameSuffix?**: `string`

NM1-07.

***

### Build275EnvelopeSpec

The envelope. `interchangeControlVersion` is ISA-12: the builder writes the
package's default, `00501`, unless given one, because no carried source
states which ISA-12 a 006020 interchange carries.

#### Example

```ts
import type { Build275EnvelopeSpec } from "@cosyte/x12";
const envelope: Build275EnvelopeSpec = {
  senderId: "CLINIC", receiverId: "PAYER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001", groupControlNumber: "1",
  transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03, application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02, application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02, group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04, group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05, group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02, interchange control number (zero-padded to 9 on emit).

##### interchangeControlVersion?

> `readonly` `optional` **interchangeControlVersion?**: `string`

ISA-12, interchange control version number. Default `"00501"`.

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09, interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10, interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08, interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07, interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator. Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06, interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05, interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02, transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15, usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build275LineSpec

One LX line: its TRN, STC and REF segments, then one BDS per attachment.

#### Example

```ts
import type { Build275LineSpec } from "@cosyte/x12";
const line: Build275LineSpec = {
  trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
  references: [{ qualifier: "1K", value: "PCN0001" }],
  attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
};
```

#### Properties

##### attachments?

> `readonly` `optional` **attachments?**: readonly [`Build275AttachmentSpec`](#build275attachmentspec)[]

The line's attachments, one BDS each, written last.

##### references?

> `readonly` `optional` **references?**: readonly [`Build275ReferenceSpec`](#build275referencespec)[]

The line's REF segments.

##### status?

> `readonly` `optional` **status?**: [`Build275StatusSpec`](#build275statusspec)

The line's STC.

##### trace?

> `readonly` `optional` **trace?**: [`Build275TraceSpec`](#build275tracespec)

The line's TRN.

***

### Build275ReferenceSpec

One REF.

#### Example

```ts
import type { Build275ReferenceSpec } from "@cosyte/x12";
const pcn: Build275ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01.

##### value

> `readonly` **value**: `string`

REF-02.

***

### Build275Spec

The whole build request.

#### Example

```ts
import type { Build275Spec } from "@cosyte/x12";
const spec: Build275Spec = {
  envelope: {
    senderId: "CLINIC", receiverId: "PAYER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001", groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001" },
  lines: [{
    trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
    attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
  }],
};
```

#### Properties

##### beginning?

> `readonly` `optional` **beginning?**: [`Build275BeginningSpec`](#build275beginningspec)

The heading's BGN, written first where given.

##### entities?

> `readonly` `optional` **entities?**: readonly [`Build275EntitySpec`](#build275entityspec)[]

The heading's NM1 names, written before the first line.

##### envelope

> `readonly` **envelope**: [`Build275EnvelopeSpec`](#build275envelopespec)

The interchange, group and transaction set envelope.

##### lines

> `readonly` **lines**: readonly [`Build275LineSpec`](#build275linespec)[]

The LX lines, each carrying its attachments. At least one attachment in all.

***

### Build275StatusCodeSpec

One C043 composite.

#### Example

```ts
import type { Build275StatusCodeSpec } from "@cosyte/x12";
const code: Build275StatusCodeSpec = { categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" };
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string`

C043-01.

##### codeListQualifier?

> `readonly` `optional` **codeListQualifier?**: `string`

C043-04.

##### entityCode?

> `readonly` `optional` **entityCode?**: `string`

C043-03.

##### statusCode

> `readonly` **statusCode**: `string`

C043-02.

***

### Build275StatusSpec

One STC, its composites written to STC-01, STC-10 and STC-11 in order,
every component as given.

#### Example

```ts
import type { Build275StatusSpec } from "@cosyte/x12";
const status: Build275StatusSpec = {
  codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }],
};
```

#### Properties

##### actionCode?

> `readonly` `optional` **actionCode?**: `string`

STC-03.

##### codes

> `readonly` **codes**: readonly [`Build275StatusCodeSpec`](#build275statuscodespec)[]

One to three C043 composites.

##### message?

> `readonly` `optional` **message?**: `string`

STC-12.

##### statusEffectiveDate?

> `readonly` `optional` **statusEffectiveDate?**: `string`

STC-02.

***

### Build275TraceSpec

One TRN.

#### Example

```ts
import type { Build275TraceSpec } from "@cosyte/x12";
const trace: Build275TraceSpec = { traceTypeCode: "2", referenceId: "TRACE-0001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02.

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01.

***

### Build276AmountSpec

An AMT amount row on a claim (e.g. `AMT*T3` total submitted charges).
Mirrors "./status-inquiry-types.js".X12StatusInquiryAmount.

#### Example

```ts
import { X12Decimal, type Build276AmountSpec } from "@cosyte/x12";
const a: Build276AmountSpec = { qualifier: "T3", amount: X12Decimal.fromString("150.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02 - the monetary amount, NEVER a JavaScript `number`.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01 - amount qualifier code.

***

### Build276ClaimSpec

One claim the submitter is asking about (Loop 2200). The trace is REQUIRED:
a TRN is what opens the loop on read, so a claim without one would fold its
identifiers, amounts and dates into the claim before it.

#### Example

```ts
import type { Build276ClaimSpec } from "@cosyte/x12";
const c: Build276ClaimSpec = {
  trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
  references: [{ qualifier: "1K", value: "PCN0001" }],
};
```

#### Properties

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build276AmountSpec`](#build276amountspec)[]

Loop 2200 AMT amount rows.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build276DateSpec`](#build276datespec)[]

Loop 2200 DTP dates.

##### references?

> `readonly` `optional` **references?**: readonly [`Build276ReferenceSpec`](#build276referencespec)[]

Loop 2200 REF identifiers.

##### serviceLines?

> `readonly` `optional` **serviceLines?**: readonly [`Build276ServiceLineSpec`](#build276servicelinespec)[]

Loop 2210 service lines.

##### trace

> `readonly` **trace**: [`Build276TraceSpec`](#build276tracespec)

Loop 2200 TRN. Required: a claim with no trace is refused.

***

### Build276DateSpec

A DTP date or date range. `formatQualifier` (DTP-02) says which: `D8` is a
single date, `RD8` a range. Mirrors
"./status-inquiry-types.js".X12StatusInquiryDate.

#### Example

```ts
import type { Build276DateSpec } from "@cosyte/x12";
const d: Build276DateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260520" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time period format qualifier.

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - the date or range.

***

### Build276DependentSpec

One dependent (Loop 2000E / 2100E / 2200E) - a patient who cannot be
identified as a subscriber in their own right. Carries its OWN name and
claims. Mirrors
"./status-inquiry-types.js".X12StatusInquiryDependent.

#### Example

```ts
import type { Build276DependentSpec } from "@cosyte/x12";
const d: Build276DependentSpec = {
  name: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "BABY" },
  claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0002" } }],
};
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`Build276ClaimSpec`](#build276claimspec)[]

Loop 2200E claims. At least one is required.

##### name

> `readonly` **name**: [`Build276NameSpec`](#build276namespec)

Loop 2100E dependent name. Required: a level with no name is refused.

***

### Build276EnvelopeSpec

Interchange, group and transaction identity for the built 276. Mirrors
"./build-277-types.js".Build277EnvelopeSpec; the builder fixes the
version and release to `"005010X212"` and takes GS-01 from the cited data
element 479 table at `src/code-lists/functional-identifier.ts`, so the caller
never hand-codes either.

#### Example

```ts
import type { Build276EnvelopeSpec } from "@cosyte/x12";
const env: Build276EnvelopeSpec = {
  senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build276HeaderSpec

The BHT beginning-of-hierarchical-transaction header. Every field has a
builder default so a caller that has nothing to say about the header can omit
it, and the defaults are library constants or values already on the envelope:
nothing is invented out of the request's content.

#### Example

```ts
import type { Build276HeaderSpec } from "@cosyte/x12";
const h: Build276HeaderSpec = { referenceId: "STATUS-0001" };
```

#### Properties

##### date?

> `readonly` `optional` **date?**: `string`

BHT-04 - creation date CCYYMMDD. Default: the group date.

##### hierarchicalStructureCode?

> `readonly` `optional` **hierarchicalStructureCode?**: `string`

BHT-01 - hierarchical structure code. Default `"0010"`.

##### purposeCode?

> `readonly` `optional` **purposeCode?**: `string`

BHT-02 - transaction set purpose code. Default `"13"` (request).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BHT-03 - submitter transaction identifier.

##### time?

> `readonly` `optional` **time?**: `string`

BHT-05 - creation time HHMM. Default: the group time.

***

### Build276InformationReceiverSpec

One information receiver (Loop 2000B / 2100B) - the party the answer goes
back to.

#### Example

```ts
import type { Build276InformationReceiverSpec } from "@cosyte/x12";
const r: Build276InformationReceiverSpec = {
  name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
  providers: [],
};
```

#### Properties

##### name

> `readonly` **name**: [`Build276NameSpec`](#build276namespec)

Loop 2100B information-receiver name.

##### providers

> `readonly` **providers**: readonly [`Build276ProviderSpec`](#build276providerspec)[]

Loop 2000C service providers (at least one required - a receiver with none is refused).

***

### Build276InformationSourceSpec

One information source (Loop 2000A / 2100A) - the payer being asked.

#### Example

```ts
import type { Build276InformationSourceSpec } from "@cosyte/x12";
const src: Build276InformationSourceSpec = {
  name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE" },
  receivers: [],
};
```

#### Properties

##### name

> `readonly` **name**: [`Build276NameSpec`](#build276namespec)

Loop 2100A information-source name.

##### receivers

> `readonly` **receivers**: readonly [`Build276InformationReceiverSpec`](#build276informationreceiverspec)[]

Loop 2000B receivers (at least one required - a source with none is refused).

***

### Build276NameSpec

An NM1 name loop, with the DMG demographics that follow it. Mirrors
"./status-inquiry-types.js".X12StatusInquiryName. One type for every
level, for the reason the read model gives: NM1-03 is "name last or
organization name" and the same segment carries both.

#### Example

```ts
import type { Build276NameSpec } from "@cosyte/x12";
const m: Build276NameSpec = {
  entityIdentifierCode: "IL", entityTypeQualifier: "1",
  lastNameOrOrganizationName: "DOE", firstName: "JANE",
  idQualifier: "MI", idCode: "MBR0001",
};
```

#### Properties

##### dateOfBirth?

> `readonly` `optional` **dateOfBirth?**: `string`

DMG-02 - date of birth (emitted with DMG-01 = `D8`).

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`PR` payer, `41` receiver, `1P` provider, `IL` insured, `QC` patient).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### genderCode?

> `readonly` `optional` **genderCode?**: `string`

DMG-03 - gender code.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier.

##### lastNameOrOrganizationName?

> `readonly` `optional` **lastNameOrOrganizationName?**: `string`

NM1-03 - last name, or the organization name for a non-person.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build276ProcedureSpec

The SVC-01 composite medical procedure identifier, supplied as its separated
components. The builder joins them with the declared component separator, so
a caller never hand-codes a delimiter. Mirrors
"./status-inquiry-types.js".X12StatusInquiryProcedure.

#### Example

```ts
import type { Build276ProcedureSpec } from "@cosyte/x12";
const p: Build276ProcedureSpec = { qualifier: "HC", code: "99213", modifiers: ["25"] };
```

#### Properties

##### code?

> `readonly` `optional` **code?**: `string`

SVC-01-2 - the procedure code.

##### description?

> `readonly` `optional` **description?**: `string`

SVC-01-7 - procedure description.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SVC-01-3 through SVC-01-6 - procedure modifiers, in order.

##### qualifier

> `readonly` **qualifier**: `string`

SVC-01-1 - product or service id qualifier.

***

### Build276ProviderSpec

One service provider (Loop 2000C / 2100C) - the provider whose claim is being
asked about. This level is the one the 270's spine does not have.

#### Example

```ts
import type { Build276ProviderSpec } from "@cosyte/x12";
const p: Build276ProviderSpec = {
  name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
  subscribers: [],
};
```

#### Properties

##### name

> `readonly` **name**: [`Build276NameSpec`](#build276namespec)

Loop 2100C provider name.

##### subscribers

> `readonly` **subscribers**: readonly [`Build276SubscriberSpec`](#build276subscriberspec)[]

Loop 2000D subscribers (at least one required - a provider with none is refused).

***

### Build276ReferenceSpec

A REF supplemental identifier. Mirrors
"./status-inquiry-types.js".X12StatusInquiryReference.

#### Example

```ts
import type { Build276ReferenceSpec } from "@cosyte/x12";
const r: Build276ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### Build276ServiceLineSpec

One service line the request asks about (Loop 2210). A line that identifies
nothing - no procedure and no revenue code - is refused rather than emitted:
an SVC that names no service is a question no payer can answer.

#### Example

```ts
import { X12Decimal, type Build276ServiceLineSpec } from "@cosyte/x12";
const l: Build276ServiceLineSpec = {
  procedure: { qualifier: "HC", code: "99213" },
  lineChargeAmount: X12Decimal.fromString("150.00")!,
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build276DateSpec`](#build276datespec)[]

DTP dates under this service line.

##### lineChargeAmount?

> `readonly` `optional` **lineChargeAmount?**: [`X12Decimal`](#x12decimal)

SVC-02 - line item charge amount.

##### procedure?

> `readonly` `optional` **procedure?**: [`Build276ProcedureSpec`](#build276procedurespec)

SVC-01 - the billed procedure, as separated components.

##### references?

> `readonly` `optional` **references?**: readonly [`Build276ReferenceSpec`](#build276referencespec)[]

REF identifiers under this service line.

##### revenueCode?

> `readonly` `optional` **revenueCode?**: `string`

SVC-04 - revenue code.

##### unitsOfService?

> `readonly` `optional` **unitsOfService?**: [`X12Decimal`](#x12decimal)

SVC-07 - units of service count.

***

### Build276Spec

The complete spec for "./build-276.js".build276: the envelope, an
optional BHT header, and the nested informationSources / receivers /
providers / subscribers / (dependents) tree the builder walks depth-first to
compute the HL spine.

#### Example

```ts
import { build276, type Build276Spec } from "@cosyte/x12";
const spec: Build276Spec = {
  envelope: {
    senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
    receivers: [{
      name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "46", idCode: "RECVR01" },
      providers: [{
        name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
        subscribers: [{
          name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
          claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0001" } }],
        }],
      }],
    }],
  }],
};
const ix = build276(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build276EnvelopeSpec`](#build276envelopespec)

Interchange, group and transaction identity.

##### header?

> `readonly` `optional` **header?**: [`Build276HeaderSpec`](#build276headerspec)

The BHT header. Every field defaults; the whole object may be omitted.

##### informationSources

> `readonly` **informationSources**: readonly [`Build276InformationSourceSpec`](#build276informationsourcespec)[]

Loop 2000A information sources (at least one required).

***

### Build276SubscriberSpec

One subscriber (Loop 2000D / 2100D / 2200D). Mirrors
"./status-inquiry-types.js".X12StatusInquirySubscriber.

#### Example

```ts
import type { Build276SubscriberSpec } from "@cosyte/x12";
const s: Build276SubscriberSpec = {
  name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE" },
  claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0001" } }],
};
```

#### Properties

##### claims?

> `readonly` `optional` **claims?**: readonly [`Build276ClaimSpec`](#build276claimspec)[]

Loop 2200D claims. At least one is required UNLESS this subscriber carries
dependents, in which case the claim may sit on the dependent instead and
the subscriber is the identifying level only.

##### dependents?

> `readonly` `optional` **dependents?**: readonly [`Build276DependentSpec`](#build276dependentspec)[]

Loop 2000E dependents (a non-empty list sets the subscriber HL-04 to `"1"`).

##### name

> `readonly` **name**: [`Build276NameSpec`](#build276namespec)

Loop 2100D subscriber name. Required: a level with no name is refused.

***

### Build276TraceSpec

A reassociation trace (TRN). TRN-02 is the value the answering 277 echoes
back verbatim. Mirrors
"./status-inquiry-types.js".X12StatusInquiryTrace.

#### Example

```ts
import type { Build276TraceSpec } from "@cosyte/x12";
const t: Build276TraceSpec = { traceTypeCode: "1", referenceId: "STATUS20260601001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification.

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### Build277ClaimSpec

One claim status-tracking loop (Loop 2200). A claim opens on a TRN
(claim-level reassociation trace) or - in a 277CA provider-level batch
acknowledgment - on a standalone STC. Carries at most one trace, the
claim-level STC statuses, supplemental REF / DTP, and any service-line
statuses (Loop 2220). Mirrors "./types.js".X12ClaimStatus.

#### Example

```ts
import type { Build277ClaimSpec } from "@cosyte/x12";
const c: Build277ClaimSpec = {
  trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
  statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }],
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build277DateSpec`](#build277datespec)[]

Claim-level DTP dates.

##### references?

> `readonly` `optional` **references?**: readonly [`Build277ReferenceSpec`](#build277referencespec)[]

Claim-level REF identifiers.

##### serviceLines?

> `readonly` `optional` **serviceLines?**: readonly [`Build277ServiceLineSpec`](#build277servicelinespec)[]

Loop 2220 service lines.

##### statuses?

> `readonly` `optional` **statuses?**: readonly [`Build277StatusSpec`](#build277statusspec)[]

Claim-level STC statuses.

##### trace?

> `readonly` `optional` **trace?**: [`Build277TraceSpec`](#build277tracespec)

Loop 2200 TRN reassociation trace (opens the claim; at most one).

***

### Build277DateSpec

A DTP date / date-range on a claim or service-line status. Mirrors "./types.js".X12StatusDate.

#### Example

```ts
import type { Build277DateSpec } from "@cosyte/x12";
const d: Build277DateSpec = { qualifier: "472", formatQualifier: "RD8", value: "20260601-20260601" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time format qualifier (`D8` / `RD8`).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - date/time value.

***

### Build277DependentSpec

One dependent (Loop 2000E / 2100E) - a patient who is not the subscriber.
Carries the optional member NM1 and the claims tracked for that
dependent.

#### Example

```ts
import type { Build277DependentSpec } from "@cosyte/x12";
const d: Build277DependentSpec = {
  member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
  claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM002" } }],
};
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`Build277ClaimSpec`](#build277claimspec)[]

Loop 2200 claims tracked for the dependent (at least one required).

##### member?

> `readonly` `optional` **member?**: [`Build277MemberSpec`](#build277memberspec)

Loop 2100E dependent member (NM1).

***

### Build277EntitySpec

A non-person entity (NM1) - the information-source payer (Loop 2100A),
information receiver (2100B), or service provider (2100C). Mirrors "./types.js".X12StatusEntity.

#### Example

```ts
import type { Build277EntitySpec } from "@cosyte/x12";
const payer: Build277EntitySpec = {
  entityIdentifierCode: "PR", entityTypeQualifier: "2",
  name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`PR` payer, `41` receiver, `1P` provider).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier.

##### name

> `readonly` **name**: `string`

NM1-03 - organization name.

***

### Build277EnvelopeSpec

Interchange + group + transaction identity for the built 277 / 277CA.
Mirrors the "../remit/build-835-types.js".Build835EnvelopeSpec;
the builder fixes GS-01 to `"HN"` and ST-01 to `"277"`. ST-03 / GS-08 are
the version supplied by the builder entry point (`005010X212` for
"./build-277.js".build277, `005010X214` for
"./build-277.js".build277CA) so the caller never hand-codes them.

#### Example

```ts
import type { Build277EnvelopeSpec } from "@cosyte/x12";
const env: Build277EnvelopeSpec = {
  senderId: "MEDPAY", receiverId: "PROVIDER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build277InformationReceiverSpec

One information receiver (Loop 2000B / 2100B). Carries the receiver
entity (NM1) and its service providers.

#### Example

```ts
import type { Build277InformationReceiverSpec } from "@cosyte/x12";
const r: Build277InformationReceiverSpec = {
  entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
  providers: [],
};
```

#### Properties

##### entity

> `readonly` **entity**: [`Build277EntitySpec`](#build277entityspec)

Loop 2100B information-receiver entity (NM1).

##### providers

> `readonly` **providers**: readonly [`Build277ProviderSpec`](#build277providerspec)[]

Loop 2000C service providers (at least one required - a receiver with none is refused).

***

### Build277InformationSourceSpec

One information source (Loop 2000A / 2100A) - the payer answering the
claim-status request. Carries the payer entity (NM1) and its receivers.

#### Example

```ts
import type { Build277InformationSourceSpec } from "@cosyte/x12";
const src: Build277InformationSourceSpec = {
  entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
  receivers: [],
};
```

#### Properties

##### entity

> `readonly` **entity**: [`Build277EntitySpec`](#build277entityspec)

Loop 2100A information-source payer entity (NM1).

##### receivers

> `readonly` **receivers**: readonly [`Build277InformationReceiverSpec`](#build277informationreceiverspec)[]

Loop 2000B receivers (at least one required - a source with none is refused).

***

### Build277MemberSpec

A person (subscriber Loop 2100D / dependent Loop 2100E) decoded from an
NM1. `idCode` is the member identifier (NM1-09) - synthetic-only in
fixtures. Mirrors "./types.js".X12StatusMember.

#### Example

```ts
import type { Build277MemberSpec } from "@cosyte/x12";
const m: Build277MemberSpec = {
  entityIdentifierCode: "QC", entityTypeQualifier: "1",
  lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`QC` patient, `IL` insured).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code (the member id).

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`MI` member id).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build277ProviderSpec

One service provider (Loop 2000C / 2100C - HL level 19). Carries the
provider entity (NM1) and its subscribers.

#### Example

```ts
import type { Build277ProviderSpec } from "@cosyte/x12";
const p: Build277ProviderSpec = {
  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
  subscribers: [],
};
```

#### Properties

##### entity

> `readonly` **entity**: [`Build277EntitySpec`](#build277entityspec)

Loop 2100C service-provider entity (NM1).

##### subscribers

> `readonly` **subscribers**: readonly [`Build277SubscriberSpec`](#build277subscriberspec)[]

Loop 2000D subscribers (at least one required - a provider with none is refused).

***

### Build277ReferenceSpec

A REF supplemental identifier on a claim or service-line status. Mirrors
"./types.js".X12StatusReference.

#### Example

```ts
import type { Build277ReferenceSpec } from "@cosyte/x12";
const r: Build277ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### Build277RfaiAmountSpec

One AMT.

#### Example

```ts
import { X12Decimal, type Build277RfaiAmountSpec } from "@cosyte/x12";
const amount: Build277RfaiAmountSpec = { qualifier: "T3", amount: X12Decimal.fromString("150.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01.

***

### Build277RfaiDateSpec

One DTP, the value written exactly as given.

#### Example

```ts
import type { Build277RfaiDateSpec } from "@cosyte/x12";
const service: Build277RfaiDateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260501" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02.

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01.

##### value

> `readonly` **value**: `string`

DTP-03.

***

### Build277RfaiEntitySpec

One NM1. Every element written as given.

#### Example

```ts
import type { Build277RfaiEntitySpec } from "@cosyte/x12";
const patient: Build277RfaiEntitySpec = {
  entityIdentifierCode: "QC", entityTypeQualifier: "1",
  lastOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02.

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08.

##### lastOrOrganizationName?

> `readonly` `optional` **lastOrOrganizationName?**: `string`

NM1-03.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05.

##### namePrefix?

> `readonly` `optional` **namePrefix?**: `string`

NM1-06.

##### nameSuffix?

> `readonly` `optional` **nameSuffix?**: `string`

NM1-07.

***

### Build277RfaiEnvelopeSpec

The envelope. `interchangeControlVersion` is ISA-12: the builder writes the
package's default, `00501`, unless given one, because no carried source
states which ISA-12 a 006020 interchange carries.

#### Example

```ts
import type { Build277RfaiEnvelopeSpec } from "@cosyte/x12";
const envelope: Build277RfaiEnvelopeSpec = {
  senderId: "PAYER", receiverId: "CLINIC",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001", groupControlNumber: "1",
  transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03, application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02, application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02, group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04, group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05, group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02, interchange control number (zero-padded to 9 on emit).

##### interchangeControlVersion?

> `readonly` `optional` **interchangeControlVersion?**: `string`

ISA-12, interchange control version number. Default `"00501"`.

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09, interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10, interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08, interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07, interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator. Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06, interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05, interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02, transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15, usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build277RfaiHeaderSpec

The BHT, each element written as given; an omitted one is written empty.

#### Example

```ts
import type { Build277RfaiHeaderSpec } from "@cosyte/x12";
const header: Build277RfaiHeaderSpec = {
  hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08",
  referenceId: "RFAI-0001", date: "20260601", time: "1200",
};
```

#### Properties

##### date?

> `readonly` `optional` **date?**: `string`

BHT-04.

##### hierarchicalStructureCode

> `readonly` **hierarchicalStructureCode**: `string`

BHT-01.

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BHT-03.

##### time?

> `readonly` `optional` **time?**: `string`

BHT-05.

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string`

BHT-02.

##### transactionTypeCode?

> `readonly` `optional` **transactionTypeCode?**: `string`

BHT-06.

***

### Build277RfaiLevelSpec

One hierarchical level. HL-03 and HL-04 are written as given; HL-01 and HL-02
are computed from where the level sits in `levels`.

#### Example

```ts
import type { Build277RfaiLevelSpec } from "@cosyte/x12";
const level: Build277RfaiLevelSpec = { levelCode: "20", childCode: "1", children: [] };
```

#### Properties

##### childCode?

> `readonly` `optional` **childCode?**: `string`

HL-04, the hierarchical child code. Omitted from the HL when absent.

##### children?

> `readonly` `optional` **children?**: readonly [`Build277RfaiLevelSpec`](#build277rfailevelspec)[]

The levels subordinate to this one, written after it.

##### entities?

> `readonly` `optional` **entities?**: readonly [`Build277RfaiEntitySpec`](#build277rfaientityspec)[]

The NM1 of each name loop under this level, written before its requests.

##### levelCode

> `readonly` **levelCode**: `string`

HL-03, the hierarchical level code.

##### requests?

> `readonly` `optional` **requests?**: readonly [`Build277RfaiRequestSpec`](#build277rfairequestspec)[]

The claim-level requests under this level.

***

### Build277RfaiQuantitySpec

One QTY.

#### Example

```ts
import { X12Decimal, type Build277RfaiQuantitySpec } from "@cosyte/x12";
const quantity: Build277RfaiQuantitySpec = { qualifier: "90", quantity: X12Decimal.fromString("1")! };
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

QTY-01.

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal)

QTY-02.

***

### Build277RfaiReferenceSpec

One REF.

#### Example

```ts
import type { Build277RfaiReferenceSpec } from "@cosyte/x12";
const pcn: Build277RfaiReferenceSpec = { qualifier: "1K", value: "PCN0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01.

##### value

> `readonly` **value**: `string`

REF-02.

***

### Build277RfaiRequestSpec

One claim-level request: the TRN that opens it and what is sent under it.

#### Example

```ts
import type { Build277RfaiRequestSpec } from "@cosyte/x12";
const request: Build277RfaiRequestSpec = {
  trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
  references: [{ qualifier: "1K", value: "PCN0001" }],
  statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
};
```

#### Properties

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build277RfaiAmountSpec`](#build277rfaiamountspec)[]

Each AMT.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build277RfaiDateSpec`](#build277rfaidatespec)[]

Each DTP.

##### quantities?

> `readonly` `optional` **quantities?**: readonly [`Build277RfaiQuantitySpec`](#build277rfaiquantityspec)[]

Each QTY.

##### references?

> `readonly` `optional` **references?**: readonly [`Build277RfaiReferenceSpec`](#build277rfaireferencespec)[]

Each REF.

##### serviceLines?

> `readonly` `optional` **serviceLines?**: readonly [`Build277RfaiServiceLineSpec`](#build277rfaiservicelinespec)[]

Each service line, written after everything above.

##### statuses?

> `readonly` `optional` **statuses?**: readonly [`Build277RfaiStatusSpec`](#build277rfaistatusspec)[]

Each STC, written after the TRN.

##### trace

> `readonly` **trace**: [`Build277RfaiTraceSpec`](#build277rfaitracespec)

The TRN. Required: the base 006020 277 opens this loop with one.

***

### Build277RfaiServiceLineSpec

One service line: its SVC and the STC, REF and DTP segments sent under it.

#### Example

```ts
import type { Build277RfaiServiceLineSpec } from "@cosyte/x12";
const line: Build277RfaiServiceLineSpec = {
  service: { serviceIdQualifier: "HC", procedureCode: "99213" },
  statuses: [{ codes: [{ categoryCode: "R4", statusCode: "11506-3", codeListQualifier: "LOI" }] }],
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build277RfaiDateSpec`](#build277rfaidatespec)[]

Each DTP under the line.

##### references?

> `readonly` `optional` **references?**: readonly [`Build277RfaiReferenceSpec`](#build277rfaireferencespec)[]

Each REF under the line.

##### service

> `readonly` **service**: [`Build277RfaiServiceSpec`](#build277rfaiservicespec)

The SVC. Required: the base 006020 277 opens this loop with one.

##### statuses?

> `readonly` `optional` **statuses?**: readonly [`Build277RfaiStatusSpec`](#build277rfaistatusspec)[]

Each STC under the line.

***

### Build277RfaiServiceSpec

The SVC elements this builder writes. SVC-06 is not written.

#### Example

```ts
import type { Build277RfaiServiceSpec } from "@cosyte/x12";
const svc: Build277RfaiServiceSpec = { serviceIdQualifier: "HC", procedureCode: "99213", modifiers: ["25"] };
```

#### Properties

##### lineChargeAmount?

> `readonly` `optional` **lineChargeAmount?**: [`X12Decimal`](#x12decimal)

SVC-02.

##### linePaymentAmount?

> `readonly` `optional` **linePaymentAmount?**: [`X12Decimal`](#x12decimal)

SVC-03.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SVC-01-3 to SVC-01-6.

##### procedureCode

> `readonly` **procedureCode**: `string`

SVC-01-2.

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

SVC-05.

##### revenueCode?

> `readonly` `optional` **revenueCode?**: `string`

SVC-04.

##### serviceIdQualifier

> `readonly` **serviceIdQualifier**: `string`

SVC-01-1.

##### unitsOfService?

> `readonly` `optional` **unitsOfService?**: [`X12Decimal`](#x12decimal)

SVC-07.

***

### Build277RfaiSpec

The whole build request.

#### Example

```ts
import type { Build277RfaiSpec } from "@cosyte/x12";
const spec: Build277RfaiSpec = {
  envelope: {
    senderId: "PAYER", receiverId: "CLINIC",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001", groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
  levels: [{
    levelCode: "20",
    entities: [{ entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "PAYER ONE" }],
    requests: [{
      trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
      statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
    }],
  }],
};
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build277RfaiEnvelopeSpec`](#build277rfaienvelopespec)

The interchange, group and transaction set envelope.

##### header

> `readonly` **header**: [`Build277RfaiHeaderSpec`](#build277rfaiheaderspec)

The BHT, every element written as given.

##### levels

> `readonly` **levels**: readonly [`Build277RfaiLevelSpec`](#build277rfailevelspec)[]

The top-level hierarchical levels, each with its subordinate levels nested. At least one.

***

### Build277RfaiStatusCodeSpec

One C043 composite, all four components written verbatim.

#### Example

```ts
import type { Build277RfaiStatusCodeSpec } from "@cosyte/x12";
const code: Build277RfaiStatusCodeSpec = {
  categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI",
};
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string`

C043-01. Refused when empty.

##### codeListQualifier?

> `readonly` `optional` **codeListQualifier?**: `string`

C043-04, naming the code source of C043-02.

##### entityCode?

> `readonly` `optional` **entityCode?**: `string`

C043-03.

##### statusCode

> `readonly` **statusCode**: `string`

C043-02. Refused when empty.

***

### Build277RfaiStatusSpec

One STC. `codes` are written to STC-01, STC-10 and STC-11 in that order, so
it holds one to three composites.

#### Example

```ts
import type { Build277RfaiStatusSpec } from "@cosyte/x12";
const status: Build277RfaiStatusSpec = {
  codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }],
  statusEffectiveDate: "20260601",
};
```

#### Properties

##### actionCode?

> `readonly` `optional` **actionCode?**: `string`

STC-03.

##### checkIssueDate?

> `readonly` `optional` **checkIssueDate?**: `string`

STC-08.

##### checkNumber?

> `readonly` `optional` **checkNumber?**: `string`

STC-09.

##### codes

> `readonly` **codes**: readonly [`Build277RfaiStatusCodeSpec`](#build277rfaistatuscodespec)[]

The C043 composites, STC-01 first. At least one.

##### message?

> `readonly` `optional` **message?**: `string`

STC-12.

##### paymentAmount?

> `readonly` `optional` **paymentAmount?**: [`X12Decimal`](#x12decimal)

STC-05.

##### paymentDate?

> `readonly` `optional` **paymentDate?**: `string`

STC-06.

##### paymentMethodCode?

> `readonly` `optional` **paymentMethodCode?**: `string`

STC-07.

##### statusEffectiveDate?

> `readonly` `optional` **statusEffectiveDate?**: `string`

STC-02.

##### totalChargeAmount?

> `readonly` `optional` **totalChargeAmount?**: [`X12Decimal`](#x12decimal)

STC-04.

***

### Build277RfaiTraceSpec

One TRN.

#### Example

```ts
import type { Build277RfaiTraceSpec } from "@cosyte/x12";
const trace: Build277RfaiTraceSpec = { traceTypeCode: "1", referenceId: "TRACE-0001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02.

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01.

***

### Build277ServiceLineSpec

One service-line status (Loop 2220). Triggered by an SVC; carries the
procedure / revenue identification, line amounts, and its own STC
statuses + REF / DTP. Mirrors "./types.js".X12ServiceLineStatus.

#### Example

```ts
import type { Build277ServiceLineSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const l: Build277ServiceLineSpec = {
  serviceIdQualifier: "HC", procedureCode: "99213", modifiers: ["25"],
  lineChargeAmount: X12Decimal.fromString("150.00")!,
  // SVC-07 is required in 005010X212, so `build277` refuses a line without it.
  unitsOfService: X12Decimal.fromString("1")!,
  statuses: [{ statuses: [{ categoryCode: "F2", statusCode: "65" }] }],
};
```

#### Properties

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build277DateSpec`](#build277datespec)[]

Loop 2220 DTP dates.

##### lineChargeAmount?

> `readonly` `optional` **lineChargeAmount?**: [`X12Decimal`](#x12decimal)

SVC-02 - line charge amount.

##### linePaymentAmount?

> `readonly` `optional` **linePaymentAmount?**: [`X12Decimal`](#x12decimal)

SVC-03 - line payment amount.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SVC-01 components 3..6 - procedure modifiers.

##### procedureCode?

> `readonly` `optional` **procedureCode?**: `string`

SVC-01 component 2 - procedure code.

##### references?

> `readonly` `optional` **references?**: readonly [`Build277ReferenceSpec`](#build277referencespec)[]

Loop 2220 REF identifiers.

##### revenueCode?

> `readonly` `optional` **revenueCode?**: `string`

SVC-04 - revenue code.

##### serviceIdQualifier?

> `readonly` `optional` **serviceIdQualifier?**: `string`

SVC-01 component 1 - product/service id qualifier (`HC`, `NU`, …).

##### statuses?

> `readonly` `optional` **statuses?**: readonly [`Build277StatusSpec`](#build277statusspec)[]

Loop 2220 STC statuses.

##### unitsOfService?

> `readonly` `optional` **unitsOfService?**: [`X12Decimal`](#x12decimal)

SVC-07 - units of service count (data element 380).

**Usage differs by TR3 and so does the builder.** In `005010X212` the
element is REQUIRED, so "./build-277.js".build277 REFUSES a
service line that omits it rather than emit a document short a required
element. In `005010X214` it is SITUATIONAL, so
"./build-277.js".build277CA emits it when supplied and omits it
otherwise. Nothing is ever defaulted: a count the caller did not supply
is a count nobody sent, and inventing one would put a quantity on the
wire that no submitter stands behind.

***

### Build277Spec

The complete spec for "./build-277.js".build277 / "./build-277.js".build277CA: the envelope plus the nested
informationSources → receivers → providers → subscribers → (dependents)
tree the builder walks depth-first to compute the HL spine.

#### Example

```ts
import { build277, X12Decimal, type Build277Spec } from "@cosyte/x12";
const spec: Build277Spec = {
  envelope: {
    senderId: "MEDPAY", receiverId: "PROVIDER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
    receivers: [{
      entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
      providers: [{
        entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
        subscribers: [{
          member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
          claims: [{
            trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
            statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }], totalChargeAmount: X12Decimal.fromString("150.00")! }],
          }],
        }],
      }],
    }],
  }],
};
const ix = build277(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build277EnvelopeSpec`](#build277envelopespec)

Interchange + group + transaction identity.

##### informationSources

> `readonly` **informationSources**: readonly [`Build277InformationSourceSpec`](#build277informationsourcespec)[]

Loop 2000A information sources (at least one required).

***

### Build277StatusCodeSpec

One Health Care Claim Status composite (C043 - STC-01 / STC-10 / STC-11).
Pairs a CSCC (category, source 507) with a CSC (status, source 508) and
the responsible entity. Only the verbatim codes are supplied - the read
side resolves the descriptions. Mirrors "./types.js".X12StatusCode
minus the derived descriptions.

#### Example

```ts
import type { Build277StatusCodeSpec } from "@cosyte/x12";
const c: Build277StatusCodeSpec = { categoryCode: "A2", statusCode: "20", entityCode: "PR" };
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string`

C043-01 - Claim Status Category Code (CSCC). Required on the first composite.

##### entityCode?

> `readonly` `optional` **entityCode?**: `string`

C043-03 - responsible entity code.

##### statusCode?

> `readonly` `optional` **statusCode?**: `string`

C043-02 - Claim Status Code (CSC).

***

### Build277StatusSpec

One decoded STC segment - the headline status fields plus the up-to-three
[Build277StatusCodeSpec](#build277statuscodespec) composites (STC-01, STC-10, STC-11). The
first composite (STC-01) is required and must carry a category code.
Mirrors "./types.js".X12StatusInfo.

#### Example

```ts
import type { Build277StatusSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const s: Build277StatusSpec = {
  statuses: [{ categoryCode: "A2", statusCode: "20" }],
  statusEffectiveDate: "20260627",
  totalChargeAmount: X12Decimal.fromString("150.00")!,
};
```

#### Properties

##### actionCode?

> `readonly` `optional` **actionCode?**: `string`

STC-03 - action code.

##### adjudicationDate?

> `readonly` `optional` **adjudicationDate?**: `string`

STC-06 - adjudication / payment date.

##### message?

> `readonly` `optional` **message?**: `string`

STC-12 - free-form message.

##### paymentAmount?

> `readonly` `optional` **paymentAmount?**: [`X12Decimal`](#x12decimal)

STC-05 - claim payment amount.

##### statusEffectiveDate?

> `readonly` `optional` **statusEffectiveDate?**: `string`

STC-02 - status information effective date.

##### statuses

> `readonly` **statuses**: readonly [`Build277StatusCodeSpec`](#build277statuscodespec)[]

STC-01 / STC-10 / STC-11 - 1..3 status composites (first is required).

##### totalChargeAmount?

> `readonly` `optional` **totalChargeAmount?**: [`X12Decimal`](#x12decimal)

STC-04 - total claim charge amount.

***

### Build277SubscriberSpec

One subscriber (Loop 2000D / 2100D). Carries the optional member NM1, the
subscriber-level claims, and any non-subscriber dependents.

#### Example

```ts
import type { Build277SubscriberSpec } from "@cosyte/x12";
const s: Build277SubscriberSpec = {
  member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
  claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM001" } }],
};
```

#### Properties

##### claims?

> `readonly` `optional` **claims?**: readonly [`Build277ClaimSpec`](#build277claimspec)[]

Loop 2200 subscriber-level claims.

##### dependents?

> `readonly` `optional` **dependents?**: readonly [`Build277DependentSpec`](#build277dependentspec)[]

Loop 2000E dependents (a non-empty list sets the subscriber HL-04 to `"1"`).

##### member?

> `readonly` `optional` **member?**: [`Build277MemberSpec`](#build277memberspec)

Loop 2100D subscriber member (NM1).

***

### Build277TraceSpec

A reassociation trace (TRN). For a 277 claim status, **`referenceId`
(TRN-02) echoes the requesting 276's trace number verbatim**. A claim
opens on its trace, so a claim carries at most one trace. Mirrors "./types.js".X12StatusTrace.

#### Example

```ts
import type { Build277TraceSpec } from "@cosyte/x12";
const t: Build277TraceSpec = { traceTypeCode: "2", referenceId: "CLAIM20260627001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification (echoed verbatim from the 276).

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### Build278DateSpec

A DTP date / date-range on a review. Mirrors "./types.js".X12AuthDate.

#### Example

```ts
import type { Build278DateSpec } from "@cosyte/x12";
const d: Build278DateSpec = { qualifier: "472", formatQualifier: "RD8", value: "20260601-20260605" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time format qualifier (`D8` / `RD8`).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier (`435` admission, `472` service).

##### value

> `readonly` **value**: `string`

DTP-03 - date/time value.

***

### Build278DecisionSpec

The HCR Health Care Services Review decision (RESPONSE ONLY). **`actionCode`
(HCR-01) is the certification outcome and is emitted VERBATIM** - the
builder never infers or upgrades it, so the response round-trips the exact
decision the caller supplied. A request spec carrying a decision is
REFUSED. Mirrors "./types.js".X12ReviewDecision.

#### Example

```ts
import type { Build278DecisionSpec } from "@cosyte/x12";
const d: Build278DecisionSpec = { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" };
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string`

HCR-01 - action code (`A1` certified, `A3` not certified, `A4` pended, `A6` modified).

##### reasonCode?

> `readonly` `optional` **reasonCode?**: `string`

HCR-03 - reason code.

##### reviewIdentificationNumber?

> `readonly` `optional` **reviewIdentificationNumber?**: `string`

HCR-02 - review / authorization identification number.

##### secondSurgicalOpinionCode?

> `readonly` `optional` **secondSurgicalOpinionCode?**: `string`

HCR-04 - second surgical opinion code.

***

### Build278DependentSpec

One dependent (Loop 2000D / 2010D - HL level 23) - a patient who is not the
subscriber. Carries the optional member NM1 + DMG and the reviews tracked
for that dependent (at least one required).

#### Example

```ts
import type { Build278DependentSpec } from "@cosyte/x12";
const d: Build278DependentSpec = {
  member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
  reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I" }],
};
```

#### Properties

##### member?

> `readonly` `optional` **member?**: [`Build278MemberSpec`](#build278memberspec)

Loop 2010D dependent member (NM1 + DMG).

##### reviews

> `readonly` **reviews**: readonly [`Build278ReviewSpec`](#build278reviewspec)[]

Loop 2000E/2000F reviews tracked for the dependent (at least one required).

***

### Build278DiagnosisSpec

One diagnosis composite emitted into the review's HI segment. Only the
verbatim `qualifier` (HI-0x-01) + `code` (HI-0x-02) are supplied - the read
side resolves the `codeSystem`. Mirrors "./types.js".X12AuthDiagnosis minus the derived `codeSystem`.

#### Example

```ts
import type { Build278DiagnosisSpec } from "@cosyte/x12";
const dx: Build278DiagnosisSpec = { qualifier: "ABK", code: "E1165" };
```

#### Properties

##### code

> `readonly` **code**: `string`

HI-0x-02 - diagnosis code.

##### qualifier

> `readonly` **qualifier**: `string`

HI-0x-01 - diagnosis code-source qualifier (`ABK` ICD-10-CM principal).

***

### Build278EntitySpec

A non-person entity (NM1) - the UMO (Loop 2010A), the requester (Loop
2010B), or a provider attached to a review. Mirrors "./types.js".X12AuthEntity.

#### Example

```ts
import type { Build278EntitySpec } from "@cosyte/x12";
const umo: Build278EntitySpec = {
  entityIdentifierCode: "X3", entityTypeQualifier: "2",
  name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`X3` UMO, `1P` requester, `71` attending).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier.

##### name

> `readonly` **name**: `string`

NM1-03 - name (organization or last name).

***

### Build278EnvelopeSpec

Interchange + group + transaction identity for the built 278. The builder
fixes GS-01 to `"HI"` and ST-01 to `"278"`; ST-03 / GS-08 is `005010X217`,
the one guide for both directions, written by "./build-278.js".build278Request and "./build-278.js".build278Response alike, so the caller never hand-codes
them.

#### Example

```ts
import type { Build278EnvelopeSpec } from "@cosyte/x12";
const env: Build278EnvelopeSpec = {
  senderId: "SUBMITTER", receiverId: "UMOPAYER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build278HeaderSpec

The BHT beginning-of-hierarchical-transaction header. Mirrors "./types.js".X12AuthHeader; `structurePurposeCode` (BHT-01, `"0078"` for
a 278) is required.

#### Example

```ts
import type { Build278HeaderSpec } from "@cosyte/x12";
const h: Build278HeaderSpec = {
  structurePurposeCode: "0078", purposeCode: "13",
  referenceId: "AUTHREQ-202606", date: "20260601", time: "1200",
};
```

#### Properties

##### date?

> `readonly` `optional` **date?**: `string`

BHT-04 - transaction set creation date (CCYYMMDD).

##### purposeCode?

> `readonly` `optional` **purposeCode?**: `string`

BHT-02 - transaction set purpose code (`13` request / `11` response).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BHT-03 - submitter transaction reference (re-association key).

##### structurePurposeCode

> `readonly` **structurePurposeCode**: `string`

BHT-01 - hierarchical structure code (`0078` services review).

##### time?

> `readonly` `optional` **time?**: `string`

BHT-05 - transaction set creation time (HHMM).

##### transactionTypeCode?

> `readonly` `optional` **transactionTypeCode?**: `string`

BHT-06 - transaction type code.

***

### Build278MemberSpec

A person (subscriber Loop 2010C / dependent Loop 2010D) - NM1 plus the
optional DMG demographics. `idCode` (NM1-09) is the member identifier -
synthetic-only in fixtures. Mirrors "./types.js".X12AuthMember.

#### Example

```ts
import type { Build278MemberSpec } from "@cosyte/x12";
const m: Build278MemberSpec = {
  entityIdentifierCode: "IL", entityTypeQualifier: "1",
  lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
  dateOfBirth: "19850515", genderCode: "F",
};
```

#### Properties

##### dateOfBirth?

> `readonly` `optional` **dateOfBirth?**: `string`

DMG-02 - date of birth (CCYYMMDD). A DMG is emitted only when this or `genderCode` is set.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`IL` insured, `QC` patient).

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### genderCode?

> `readonly` `optional` **genderCode?**: `string`

DMG-03 - gender code (`M` / `F` / `U`).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code (the member id).

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`MI` member id).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build278ReferenceSpec

A REF supplemental identifier on a review. Mirrors "./types.js".X12AuthReference.

#### Example

```ts
import type { Build278ReferenceSpec } from "@cosyte/x12";
const r: Build278ReferenceSpec = { qualifier: "BB", value: "PRIORAUTH-1" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### Build278ReviewSpec

One services-review item - a patient-event (`EV`, Loop 2000E) or service
(`SS`, Loop 2000F) HL. Carries the UM review information, the optional HCR
decision (response only), echoed TRN traces, HI diagnoses, attached
provider NM1s, and the supplemental REF / DTP / MSG. Nested `reviews` become
child HLs (an `SS` service under an `EV` event) parented to this review.
Mirrors "./types.js".X12ServiceReview.

#### Example

```ts
import type { Build278ReviewSpec } from "@cosyte/x12";
const r: Build278ReviewSpec = {
  levelCode: "EV", requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1",
  traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" }],
  diagnoses: [{ qualifier: "ABK", code: "E1165" }],
  dates: [{ qualifier: "472", formatQualifier: "RD8", value: "20260601-20260605" }],
};
```

#### Properties

##### certificationTypeCode?

> `readonly` `optional` **certificationTypeCode?**: `string`

UM-02 - certification type code (`I` initial / `R` renewal).

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build278DateSpec`](#build278datespec)[]

Supplemental DTP dates.

##### decision?

> `readonly` `optional` **decision?**: [`Build278DecisionSpec`](#build278decisionspec)

HCR decision - RESPONSE ONLY (a request review carrying one is refused).

##### diagnoses?

> `readonly` `optional` **diagnoses?**: readonly [`Build278DiagnosisSpec`](#build278diagnosisspec)[]

HI diagnosis composites (emitted as one HI segment).

##### levelCode?

> `readonly` `optional` **levelCode?**: `"EV"` \| `"SS"`

HL-03 - review level code (`EV` patient event / `SS` service). Default
`"EV"`.

The only caller-supplied HL-03 in the library; every other level on every
builder's spine is a module constant selected by tree position. A value
outside `EV` / `SS` is **refused** (`X12_278_BUILD_INVALID_SPEC`) rather
than emitted: it produces a well-formed document whose review loop no
reader opens, so the review and its HCR-01 certification decision would
fail to decode. An absent value still defaults to `EV`.

##### levelOfServiceCode?

> `readonly` `optional` **levelOfServiceCode?**: `string`

UM-06 - level of service code.

##### messages?

> `readonly` `optional` **messages?**: readonly `string`[]

MSG free-form messages.

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build278EntitySpec`](#build278entityspec)[]

Attached provider NM1s (rendering / attending / operating).

##### references?

> `readonly` `optional` **references?**: readonly [`Build278ReferenceSpec`](#build278referencespec)[]

Supplemental REF identifiers.

##### requestCategoryCode

> `readonly` **requestCategoryCode**: `string`

UM-01 - request category code (required; a review with none is refused).

##### reviews?

> `readonly` `optional` **reviews?**: readonly [`Build278ReviewSpec`](#build278reviewspec)[]

Nested service (`SS`) reviews parented to this review.

##### serviceTypeCode?

> `readonly` `optional` **serviceTypeCode?**: `string`

UM-03 - service type code.

##### traces?

> `readonly` `optional` **traces?**: readonly [`Build278TraceSpec`](#build278tracespec)[]

Loop 2000E/2000F TRN traces.

***

### Build278Spec

The complete spec for "./build-278.js".build278Request / "./build-278.js".build278Response: the envelope + BHT header plus the
UMO → requester → subscriber → (dependent) → reviews tree the builder
walks depth-first to compute the HL spine.

#### Example

```ts
import { build278Request, type Build278Spec } from "@cosyte/x12";
const spec: Build278Spec = {
  envelope: {
    senderId: "SUBMITTER", receiverId: "UMOPAYER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
  utilizationManagementOrganization: { entityIdentifierCode: "X3", entityTypeQualifier: "2", name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001" },
  requester: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "RENDERING CLINIC", idQualifier: "XX", idCode: "1234567893" },
  subscriber: {
    member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
    reviews: [{
      requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1",
      traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" }],
      diagnoses: [{ qualifier: "ABK", code: "E1165" }],
    }],
  },
};
const ix = build278Request(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build278EnvelopeSpec`](#build278envelopespec)

Interchange + group + transaction identity.

##### header

> `readonly` **header**: [`Build278HeaderSpec`](#build278headerspec)

BHT header.

##### requester

> `readonly` **requester**: [`Build278EntitySpec`](#build278entityspec)

Loop 2010B requester (HL level 21).

##### subscriber

> `readonly` **subscriber**: [`Build278SubscriberSpec`](#build278subscriberspec)

Loop 2000C subscriber (HL level 22).

##### utilizationManagementOrganization

> `readonly` **utilizationManagementOrganization**: [`Build278EntitySpec`](#build278entityspec)

Loop 2010A utilization management organization (HL level 20).

***

### Build278SubscriberSpec

One subscriber (Loop 2000C / 2010C - HL level 22). Carries the optional
member NM1 + DMG, the subscriber-level reviews, and an optional dependent.
A subscriber with neither a review nor a dependent is REFUSED.

#### Example

```ts
import type { Build278SubscriberSpec } from "@cosyte/x12";
const s: Build278SubscriberSpec = {
  member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
  reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
};
```

#### Properties

##### dependent?

> `readonly` `optional` **dependent?**: [`Build278DependentSpec`](#build278dependentspec)

Loop 2000D dependent (sets the subscriber HL-04 to `"1"`).

##### member?

> `readonly` `optional` **member?**: [`Build278MemberSpec`](#build278memberspec)

Loop 2010C subscriber member (NM1 + DMG).

##### reviews?

> `readonly` `optional` **reviews?**: readonly [`Build278ReviewSpec`](#build278reviewspec)[]

Loop 2000E/2000F subscriber-level reviews.

***

### Build278TraceSpec

A reassociation trace (TRN) on a review. A 278 request carries a trace the
response echoes VERBATIM so the requester can re-associate the
certification outcome. Mirrors "./types.js".X12AuthTrace.

#### Example

```ts
import type { Build278TraceSpec } from "@cosyte/x12";
const t: Build278TraceSpec = { traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" };
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification (echoed verbatim between request/response).

##### supplementalReferenceId?

> `readonly` `optional` **supplementalReferenceId?**: `string`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### Build820AddressSpec

N3 + N4 address block on a party. Mirrors "./types.js".X12PremiumAddress.

#### Example

```ts
import type { Build820AddressSpec } from "@cosyte/x12";
const a: Build820AddressSpec = {
  lines: ["500 CORPORATE BLVD"], city: "COLUMBUS", state: "OH", postalCode: "43004",
};
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state / province.

***

### Build820AdjustmentSpec

ADX adjustment to a premium remittance. Mirrors "./types.js".X12PremiumAdjustment.

#### Example

```ts
import type { Build820AdjustmentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const a: Build820AdjustmentSpec = {
  amount: X12Decimal.fromString("-25.00")!, reasonCode: "53",
};
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

ADX-01 - signed monetary adjustment.

##### reasonCode

> `readonly` **reasonCode**: `string`

ADX-02 - adjustment reason code (`52` credit memo, `53` debit memo, …).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

ADX-04 - reference id (situational).

##### referenceQualifier?

> `readonly` `optional` **referenceQualifier?**: `string`

ADX-03 - reference qualifier (situational).

***

### Build820DateSpec

DTM date attached to a remittance loop. Mirrors "./types.js".X12PremiumDate. The 820 carries dates only inside a
remittance loop - a header-level DTM is not part of the typed surface.

#### Example

```ts
import type { Build820DateSpec } from "@cosyte/x12";
const d: Build820DateSpec = { qualifier: "582", value: "20260601" };
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

DTM-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTM-02 - verbatim CCYYMMDD date.

***

### Build820EntitySpec

ENT entity - opens an organization-summary remittance loop (Loop 2000A).
Mirrors "./types.js".X12PremiumEntity. All elements optional; the
ENT's role is to open the loop.

#### Example

```ts
import type { Build820EntitySpec } from "@cosyte/x12";
const e: Build820EntitySpec = {
  assignedNumber: "1", entityIdentifierCode: "2J", idQualifier: "94", idCode: "GRP-0001",
};
```

#### Properties

##### assignedNumber?

> `readonly` `optional` **assignedNumber?**: `string`

ENT-01 - assigned number.

##### entityIdentifierCode?

> `readonly` `optional` **entityIdentifierCode?**: `string`

ENT-02 - entity identifier code.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

ENT-04 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

ENT-03 - identification code qualifier.

***

### Build820EnvelopeSpec

Interchange + group + transaction identity for the built 820. The builder
fixes GS-01 to `"RA"` (Payment Order / Remittance Advice) and the
version/release to `"005010X218"` (the 820 functional group + TR3) so the
caller never hand-codes them.

#### Example

```ts
import type { Build820EnvelopeSpec } from "@cosyte/x12";
const env: Build820EnvelopeSpec = {
  senderId: "EMPLOYERCO", receiverId: "MEDPAY",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build820OpenItemSpec

RMR open item - the premium line unit: a policy / invoice reference plus
the amount paid and (optionally) the amount due. Mirrors "./types.js".X12PremiumOpenItem. At least one of `qualifier` /
`referenceId` must be non-empty (an RMR with no identity is dropped on the
read side, so the builder refuses it).

#### Example

```ts
import type { Build820OpenItemSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const o: Build820OpenItemSpec = {
  qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")!,
};
```

#### Properties

##### amountDue?

> `readonly` `optional` **amountDue?**: [`X12Decimal`](#x12decimal)

RMR-05 - amount due / original (situational).

##### amountPaid

> `readonly` **amountPaid**: [`X12Decimal`](#x12decimal)

RMR-04 - amount paid.

##### paymentActionCode?

> `readonly` `optional` **paymentActionCode?**: `string`

RMR-03 - payment action code (situational).

##### qualifier

> `readonly` **qualifier**: `string`

RMR-01 - reference id qualifier (`11`, `IK`, `AZ`, …).

##### referenceId

> `readonly` **referenceId**: `string`

RMR-02 - reference id (policy / invoice number).

***

### Build820PartySpec

Loop 1000A premium receiver (`N1*PE`) or Loop 1000B premium payer /
remitter (`N1*PR` / `N1*RM`). Mirrors "./types.js".X12PremiumParty.

#### Example

```ts
import type { Build820PartySpec } from "@cosyte/x12";
const remitter: Build820PartySpec = {
  entityIdentifierCode: "PR", name: "EMPLOYER CO", idQualifier: "FI", idCode: "FEIN123",
};
```

#### Properties

##### address?

> `readonly` `optional` **address?**: [`Build820AddressSpec`](#build820addressspec)

N3 + N4 address block.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

N1-01 - entity identifier code (`PE` receiver / `PR` / `RM` remitter).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

N1-04 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

N1-03 - identification code qualifier.

##### name

> `readonly` **name**: `string`

N1-02 - party name.

##### references?

> `readonly` `optional` **references?**: readonly [`Build820ReferenceSpec`](#build820referencespec)[]

REF supplemental identifiers.

***

### Build820PaymentSpec

BPR financial-information / payment header. `totalPremiumAmount` is the
aggregate premium the bank moved (BPR-02). Identical segment shape to the
835 - but the 820 carries no balance equation, so this total is emitted
verbatim, never reconciled against the remittance open items.

#### Example

```ts
import type { Build820PaymentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const bpr: Build820PaymentSpec = {
  transactionHandlingCode: "I",
  totalPremiumAmount: X12Decimal.fromString("12500.00")!,
  creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
};
```

#### Properties

##### creditDebitFlag

> `readonly` **creditDebitFlag**: `string`

BPR-03 - credit/debit flag (`C` credit, `D` debit).

##### method

> `readonly` **method**: `string`

BPR-04 - payment method (`ACH`, `CHK`, `NON`, …).

##### paymentDate

> `readonly` **paymentDate**: `string`

BPR-16 - payment effective date (CCYYMMDD).

##### paymentFormatCode?

> `readonly` `optional` **paymentFormatCode?**: `string`

BPR-05 - payment format code (situational).

##### totalPremiumAmount

> `readonly` **totalPremiumAmount**: [`X12Decimal`](#x12decimal)

BPR-02 - total premium amount the bank moved.

##### transactionHandlingCode

> `readonly` **transactionHandlingCode**: `string`

BPR-01 - transaction handling code (`I` remittance + payment, `H` notification, …).

***

### Build820PersonSpec

NM1 individual (member) inside a remittance loop. Mirrors "./types.js".X12PremiumPerson. PHI surface: every field carries PHI. The
builder emits NM1-02 (entity type qualifier) as `"1"` (person); the read
side does not interpret it.

#### Example

```ts
import type { Build820PersonSpec } from "@cosyte/x12";
const p: Build820PersonSpec = {
  entityIdentifierCode: "IL", lastName: "DOE", firstName: "JANE",
  idQualifier: "34", idCode: "MBR0001",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`IL` insured, …).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code (verbatim member id).

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`34` SSN, `ZZ` mutually defined, …).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build820ReferenceSpec

REF supplemental identifier on a party or remittance loop. Mirrors "./types.js".X12PremiumReference. `description` (REF-03) is emitted only
when supplied.

#### Example

```ts
import type { Build820ReferenceSpec } from "@cosyte/x12";
const ref: Build820ReferenceSpec = { qualifier: "38", value: "POL-0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description (situational).

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification value.

***

### Build820RemittanceSpec

One Loop 2000 remittance - an organization summary (`entity`), an
individual (`individual`), or both. Mirrors "./types.js".X12PremiumRemittance. Structural preconditions the builder
enforces so the loop round-trips through `get820Payments`:
- at least one of `entity` / `individual` must be present (a remittance
  needs an `ENT` or `NM1` to open its loop), and
- at least one `openItems` entry must be present (a premium remittance
  always carries an `RMR` line; an item-less loop would also merge into a
  following individual remittance on the read side).

#### Example

```ts
import type { Build820RemittanceSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const r: Build820RemittanceSpec = {
  individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
  openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
};
```

#### Properties

##### adjustments?

> `readonly` `optional` **adjustments?**: readonly [`Build820AdjustmentSpec`](#build820adjustmentspec)[]

ADX adjustments for the loop.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build820DateSpec`](#build820datespec)[]

DTM dates for the loop.

##### entity?

> `readonly` `optional` **entity?**: [`Build820EntitySpec`](#build820entityspec)

ENT entity (Loop 2000A organization summary).

##### individual?

> `readonly` `optional` **individual?**: [`Build820PersonSpec`](#build820personspec)

NM1 individual (member).

##### openItems

> `readonly` **openItems**: readonly [`Build820OpenItemSpec`](#build820openitemspec)[]

RMR open items (≥ 1 required).

##### references?

> `readonly` `optional` **references?**: readonly [`Build820ReferenceSpec`](#build820referencespec)[]

REF supplemental identifiers for the loop.

***

### Build820Spec

The full input to "./build-820.js".build820: the envelope, the
payment header, ≥ 1 trace, optional receiver / remitter parties, and ≥ 1
remittance loop. A well-formed spec round-trips through `get820Payments`
field-for-field; a structurally impossible one is REFUSED with a "./build-errors.js".Premium820BuildError.

#### Example

```ts
import { build820, X12Decimal, type Build820Spec } from "@cosyte/x12";
const spec: Build820Spec = {
  envelope: {
    senderId: "EMPLOYERCO", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: X12Decimal.fromString("250.00")!,
    creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
  remitter: { entityIdentifierCode: "PR", name: "EMPLOYER CO" },
  receiver: { entityIdentifierCode: "PE", name: "MEDPAY INSURANCE" },
  remittances: [
    {
      individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
      openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
    },
  ],
};
const ix = build820(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build820EnvelopeSpec`](#build820envelopespec)

Interchange / group / transaction identity.

##### payment

> `readonly` **payment**: [`Build820PaymentSpec`](#build820paymentspec)

BPR payment header.

##### receiver?

> `readonly` `optional` **receiver?**: [`Build820PartySpec`](#build820partyspec)

Loop 1000A premium receiver (N1*PE).

##### remittances

> `readonly` **remittances**: readonly [`Build820RemittanceSpec`](#build820remittancespec)[]

Loop 2000 remittance detail (≥ 1 required).

##### remitter?

> `readonly` `optional` **remitter?**: [`Build820PartySpec`](#build820partyspec)

Loop 1000B premium payer / remitter (N1*PR / N1*RM).

##### traces

> `readonly` **traces**: readonly [`Build820TraceSpec`](#build820tracespec)[]

TRN traces (≥ 1 required).

***

### Build820TraceSpec

TRN reassociation trace - pairs the 820 to the originating ACH / check so
the receiver can reconcile the premium deposit. At least one is required
(TR3 005010X218 mandates the header TRN).

#### Example

```ts
import type { Build820TraceSpec } from "@cosyte/x12";
const trn: Build820TraceSpec = {
  traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678",
};
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### originatingCompanySupplementalCode?

> `readonly` `optional` **originatingCompanySupplementalCode?**: `string`

TRN-04 - originating company supplemental code.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification (the trace / check number).

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code (`1` current transaction trace numbers).

***

### Build834AddressSpec

N3 + N4 address block on a member. Mirrors "./types.js".X12EnrollmentAddress.

#### Example

```ts
import type { Build834AddressSpec } from "@cosyte/x12";
const a: Build834AddressSpec = {
  lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH", postalCode: "43004",
};
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state / province.

***

### Build834AmountSpec

AMT amount on a health-coverage loop. Mirrors "./types.js".X12EnrollmentAmount.

#### Example

```ts
import type { Build834AmountSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const a: Build834AmountSpec = { qualifier: "P3", amount: X12Decimal.fromString("125.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02 - monetary amount.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01 - amount qualifier code (`P3` premium, `B9` co-insurance, …).

***

### Build834CoordinationOfBenefitsSpec

Loop 2320 coordination of benefits (`COB`). Mirrors "./types.js".X12CoordinationOfBenefits.

#### Example

```ts
import type { Build834CoordinationOfBenefitsSpec } from "@cosyte/x12";
const c: Build834CoordinationOfBenefitsSpec = {
  payerResponsibility: "P", referenceId: "OTHERGRP-1", coordinationOfBenefitsCode: "1",
};
```

#### Properties

##### coordinationOfBenefitsCode?

> `readonly` `optional` **coordinationOfBenefitsCode?**: `string`

COB-03 - coordination of benefits code.

##### payerResponsibility?

> `readonly` `optional` **payerResponsibility?**: `string`

COB-01 - payer responsibility (`P` primary, `S` secondary, `T` tertiary).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

COB-02 - the other payer's group / policy number.

***

### Build834CoverageSpec

Loop 2300 health coverage (`HD`) plus its dates (`DTP`) and amounts
(`AMT`). Mirrors "./types.js".X12HealthCoverage.
`maintenanceTypeCode` (HD-01, X12 875) is validated when present - an
unknown code is REFUSED.

#### Example

```ts
import type { Build834CoverageSpec } from "@cosyte/x12";
const c: Build834CoverageSpec = {
  maintenanceTypeCode: "021", insuranceLineCode: "HLT",
  planCoverageDescription: "GOLD PPO", coverageLevelCode: "FAM",
  dates: [{ qualifier: "348", value: "20260101" }],
};
```

#### Properties

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build834AmountSpec`](#build834amountspec)[]

AMT coverage amounts.

##### coverageLevelCode?

> `readonly` `optional` **coverageLevelCode?**: `string`

HD-05 - coverage level code (`IND`, `FAM`, `EMP`, …).

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build834DateSpec`](#build834datespec)[]

DTP coverage dates.

##### insuranceLineCode?

> `readonly` `optional` **insuranceLineCode?**: `string`

HD-03 - insurance line code (`HLT`, `DEN`, `VIS`, …).

##### maintenanceTypeCode?

> `readonly` `optional` **maintenanceTypeCode?**: `string`

HD-01 - maintenance type code (X12 875; validated when present).

##### planCoverageDescription?

> `readonly` `optional` **planCoverageDescription?**: `string`

HD-04 - plan coverage description.

***

### Build834DateSpec

DTP date on a member or a health-coverage loop. Mirrors "./types.js".X12EnrollmentDate. `value` (DTP-03) is the verbatim
CCYYMMDD or range; `formatQualifier` (DTP-02) defaults to `"D8"` (single
date) - pass `"RD8"` for a range. The read model surfaces only the
qualifier + value, so the format qualifier does not affect a round-trip.

#### Example

```ts
import type { Build834DateSpec } from "@cosyte/x12";
const d: Build834DateSpec = { qualifier: "356", value: "20260101" };
```

#### Properties

##### formatQualifier?

> `readonly` `optional` **formatQualifier?**: `string`

DTP-02 - date/time format qualifier. Default `"D8"`.

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier (`356` eligibility begin, `357` end, …).

##### value

> `readonly` **value**: `string`

DTP-03 - verbatim CCYYMMDD or range.

***

### Build834EnvelopeSpec

Interchange + group + transaction identity for the built 834. The builder
fixes GS-01 to `"BE"` (Benefit Enrollment and Maintenance) and the
version/release to `"005010X220A1"` (the 834 functional group + TR3) so
the caller never hand-codes them.

#### Example

```ts
import type { Build834EnvelopeSpec } from "@cosyte/x12";
const env: Build834EnvelopeSpec = {
  senderId: "EMPLOYERCO", receiverId: "MEDPAY",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build834HeaderSpec

The 834 header - BGN beginning segment + sponsor (`N1*P5`) + payer
(`N1*IN`) + header REF / DTP. Mirrors "./types.js".X12EnrollmentHeader minus the read-only `warnings`.

#### Example

```ts
import type { Build834HeaderSpec } from "@cosyte/x12";
const header: Build834HeaderSpec = {
  transactionSetPurposeCode: "00", referenceId: "FILE-202606", date: "20260601",
  sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
  payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
};
```

#### Properties

##### actionCode?

> `readonly` `optional` **actionCode?**: `string`

BGN-08 - action code (`2` change / `4` verify / `RX` replace, …).

##### date?

> `readonly` `optional` **date?**: `string`

BGN-03 - transaction set creation date (CCYYMMDD).

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build834DateSpec`](#build834datespec)[]

Header DTP dates.

##### payer?

> `readonly` `optional` **payer?**: [`Build834PartySpec`](#build834partyspec)

Loop 1000B payer (N1*IN).

##### referenceId?

> `readonly` `optional` **referenceId?**: `string`

BGN-02 - reference identification (the file / batch id).

##### references?

> `readonly` `optional` **references?**: readonly [`Build834ReferenceSpec`](#build834referencespec)[]

Header REF identifiers.

##### sponsor?

> `readonly` `optional` **sponsor?**: [`Build834PartySpec`](#build834partyspec)

Loop 1000A sponsor (N1*P5).

##### time?

> `readonly` `optional` **time?**: `string`

BGN-04 - transaction set creation time (HHMM).

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string`

BGN-01 - transaction set purpose code (`00` original, `15` re-submission, …).

***

### Build834MemberNameSpec

Loop 2100A member name (`NM1*IL`) + demographics (`DMG`) + address
(`N3`/`N4`). Mirrors "./types.js".X12EnrollmentMember. PHI
surface: every field carries PHI. `entityIdentifierCode` defaults to
`"IL"` (insured) - the read side captures only the IL member name, so a
different qualifier would not round-trip.

#### Example

```ts
import type { Build834MemberNameSpec } from "@cosyte/x12";
const m: Build834MemberNameSpec = {
  lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001",
  dateOfBirth: "19850515", genderCode: "F",
};
```

#### Properties

##### address?

> `readonly` `optional` **address?**: [`Build834AddressSpec`](#build834addressspec)

N3 + N4 address block.

##### dateOfBirth?

> `readonly` `optional` **dateOfBirth?**: `string`

DMG-02 - date of birth (CCYYMMDD).

##### entityIdentifierCode?

> `readonly` `optional` **entityIdentifierCode?**: `string`

NM1-01 - entity identifier code. Default `"IL"` (insured).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### genderCode?

> `readonly` `optional` **genderCode?**: `string`

DMG-03 - gender code (`M` / `F` / `U`).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code (verbatim member id).

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`34` SSN, `ZZ` mutually defined, …).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build834MemberSpec

One Loop 2000 member-level detail (`INS`) - a single member's enrollment
action. Mirrors "./types.js".X12Enrollment minus the looked-up
`maintenanceTypeDescription`. `maintenanceTypeCode` (INS-03, X12 875) is
REQUIRED and safety-critical - it is emitted verbatim and an unknown code
is REFUSED.

#### Example

```ts
import type { Build834MemberSpec } from "@cosyte/x12";
const member: Build834MemberSpec = {
  subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
  member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
  healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
};
```

#### Properties

##### benefitStatusCode?

> `readonly` `optional` **benefitStatusCode?**: `string`

INS-05 - benefit status code (`A` active, `C` COBRA, …).

##### coordinationOfBenefits?

> `readonly` `optional` **coordinationOfBenefits?**: readonly [`Build834CoordinationOfBenefitsSpec`](#build834coordinationofbenefitsspec)[]

Loop 2320 coordination of benefits.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build834DateSpec`](#build834datespec)[]

DTP member-level dates (eligibility begin / end).

##### employmentStatusCode?

> `readonly` `optional` **employmentStatusCode?**: `string`

INS-08 - employment status code (`FT`, `PT`, …).

##### healthCoverages?

> `readonly` `optional` **healthCoverages?**: readonly [`Build834CoverageSpec`](#build834coveragespec)[]

Loop 2300 health coverages.

##### maintenanceReasonCode?

> `readonly` `optional` **maintenanceReasonCode?**: `string`

INS-04 - maintenance reason code.

##### maintenanceTypeCode

> `readonly` **maintenanceTypeCode**: `string`

INS-03 - maintenance type code (X12 875; required, validated).

##### member?

> `readonly` `optional` **member?**: [`Build834MemberNameSpec`](#build834membernamespec)

Loop 2100A member name + DMG + address.

##### references?

> `readonly` `optional` **references?**: readonly [`Build834ReferenceSpec`](#build834referencespec)[]

REF supplemental identifiers (subscriber id, group/policy).

##### relationshipCode?

> `readonly` `optional` **relationshipCode?**: `string`

INS-02 - relationship code (`18` self, `01` spouse, `19` child, …).

##### subscriberIndicator?

> `readonly` `optional` **subscriberIndicator?**: `string`

INS-01 - subscriber indicator (`Y` subscriber / `N` dependent).

***

### Build834PartySpec

N1 party - sponsor (Loop 1000A, `N1*P5`) or payer (Loop 1000B, `N1*IN`).
Mirrors "./types.js".X12EnrollmentParty.

#### Example

```ts
import type { Build834PartySpec } from "@cosyte/x12";
const sponsor: Build834PartySpec = {
  entityIdentifierCode: "P5", name: "EMPLOYER CO", idQualifier: "FI", idCode: "FEIN123",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

N1-01 - entity identifier code (`P5` sponsor / `IN` payer).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

N1-04 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

N1-03 - identification code qualifier.

##### name

> `readonly` **name**: `string`

N1-02 - party name.

***

### Build834ReferenceSpec

REF supplemental identifier on the header or a member. Mirrors "./types.js".X12EnrollmentReference. `description` (REF-03) is emitted
only when supplied.

#### Example

```ts
import type { Build834ReferenceSpec } from "@cosyte/x12";
const ref: Build834ReferenceSpec = { qualifier: "0F", value: "MBR0001" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description (situational).

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification value.

***

### Build834Spec

The full input to "./build-834.js".build834: the envelope, the
header, and ≥ 1 member loop. A well-formed spec round-trips through
`get834Header` / `get834Enrollments` field-for-field; a spec with an
unknown maintenance type or a missing member loop is REFUSED with an
"./build-errors.js".Enrollment834BuildError.

#### Example

```ts
import { build834, type Build834Spec } from "@cosyte/x12";
const spec: Build834Spec = {
  envelope: {
    senderId: "EMPLOYERCO", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  header: {
    transactionSetPurposeCode: "00", referenceId: "FILE-202606", date: "20260601",
    sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
    payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
  },
  members: [
    {
      subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
      healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
    },
  ],
};
const ix = build834(spec);
```

#### Properties

##### envelope

> `readonly` **envelope**: [`Build834EnvelopeSpec`](#build834envelopespec)

Interchange / group / transaction identity.

##### header

> `readonly` **header**: [`Build834HeaderSpec`](#build834headerspec)

BGN header + sponsor / payer parties.

##### members

> `readonly` **members**: readonly [`Build834MemberSpec`](#build834memberspec)[]

Loop 2000 member-level detail (≥ 1 required).

***

### Build835AddressSpec

N3 + N4 address block on a party. Mirrors "./types.js".X12RemitAddress.

#### Example

```ts
import type { Build835AddressSpec } from "@cosyte/x12";
const a: Build835AddressSpec = {
  lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244",
};
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state / province.

***

### Build835AdjustmentSpec

One CAS adjustment (one reason / amount / quantity triple under a group
code). Mirrors "./types.js".X12RemitAdjustment minus the
looked-up `reasonDescription`. The builder re-chunks adjustments that
share a `groupCode` into CAS segments (≤ 6 triples each).

#### Example

```ts
import type { Build835AdjustmentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const cas: Build835AdjustmentSpec = {
  groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")!,
};
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

Adjustment amount.

##### groupCode

> `readonly` **groupCode**: `string`

CAS-01 - claim adjustment group code (`CO`, `PR`, `OA`, `PI`).

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

Adjustment quantity (situational).

##### reasonCode

> `readonly` **reasonCode**: `string`

Adjustment reason code (CARC).

***

### Build835AmountSpec

AMT supplemental amount on a claim / service line. Mirrors "./types.js".X12RemitAmount.

#### Example

```ts
import type { Build835AmountSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const amt: Build835AmountSpec = { qualifier: "B6", amount: X12Decimal.fromString("450.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02 - monetary amount.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01 - amount qualifier code (`AU`, `B6`, …).

***

### Build835ClaimSpec

Loop 2100 claim-payment spec. Subject to the claim balance invariant
`CLP-03 == CLP-04 + Σ(claim CAS + line CAS)` - the builder REFUSES an
out-of-balance claim. Mirrors "./types.js".X12RemitClaim minus
the looked-up `claimStatusDescription`.

#### Example

```ts
import type { Build835ClaimSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const claim: Build835ClaimSpec = {
  patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
  totalChargeAmount: X12Decimal.fromString("500.00")!,
  totalPaymentAmount: X12Decimal.fromString("450.00")!,
  patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
};
```

#### Properties

##### adjustments?

> `readonly` `optional` **adjustments?**: readonly [`Build835AdjustmentSpec`](#build835adjustmentspec)[]

Claim-level CAS adjustments.

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build835AmountSpec`](#build835amountspec)[]

Claim-level AMT amounts.

##### claimFilingIndicatorCode?

> `readonly` `optional` **claimFilingIndicatorCode?**: `string`

CLP-06 - claim filing indicator code.

##### claimFrequencyCode?

> `readonly` `optional` **claimFrequencyCode?**: `string`

CLP-08-3 - claim frequency code.

##### claimStatusCode

> `readonly` **claimStatusCode**: `string`

CLP-02 - claim status code.

##### correctedPatient?

> `readonly` `optional` **correctedPatient?**: [`Build835PersonSpec`](#build835personspec)

NM1*74 corrected patient.

##### facilityTypeCode?

> `readonly` `optional` **facilityTypeCode?**: `string`

CLP-08-1 - facility type code.

##### patient?

> `readonly` `optional` **patient?**: [`Build835PersonSpec`](#build835personspec)

NM1*QC patient.

##### patientControlNumber

> `readonly` **patientControlNumber**: `string`

CLP-01 - patient control number.

##### patientResponsibilityAmount

> `readonly` **patientResponsibilityAmount**: [`X12Decimal`](#x12decimal)

CLP-05 - patient responsibility amount (informational, not balanced).

##### payerClaimControlNumber?

> `readonly` `optional` **payerClaimControlNumber?**: `string`

CLP-07 - payer claim control number.

##### references?

> `readonly` `optional` **references?**: readonly [`Build835ReferenceSpec`](#build835referencespec)[]

Claim-level REF identifiers.

##### remarks?

> `readonly` `optional` **remarks?**: readonly [`Build835RemarkSpec`](#build835remarkspec)[]

Claim-level LQ remarks.

##### renderingProvider?

> `readonly` `optional` **renderingProvider?**: [`Build835ProviderSpec`](#build835providerspec)

A second NM1*82 (rendering provider).

##### serviceLines?

> `readonly` `optional` **serviceLines?**: readonly [`Build835ServiceLineSpec`](#build835servicelinespec)[]

Loop 2110 service lines.

##### servicePeriodEnd?

> `readonly` `optional` **servicePeriodEnd?**: `string`

DTM*233 statement-to date.

##### servicePeriodStart?

> `readonly` `optional` **servicePeriodStart?**: `string`

DTM*232 statement-from date.

##### serviceProvider?

> `readonly` `optional` **serviceProvider?**: [`Build835ProviderSpec`](#build835providerspec)

NM1*82 service provider.

##### subscriber?

> `readonly` `optional` **subscriber?**: [`Build835PersonSpec`](#build835personspec)

NM1*IL subscriber.

##### totalChargeAmount

> `readonly` **totalChargeAmount**: [`X12Decimal`](#x12decimal)

CLP-03 - total submitted charge amount.

##### totalPaymentAmount

> `readonly` **totalPaymentAmount**: [`X12Decimal`](#x12decimal)

CLP-04 - total claim payment amount.

***

### Build835ContactSpec

PER contact on a party (Loop 1000A/1000B). Each contact may carry up to
three communication channels. Mirrors "./types.js".X12RemitContact.

#### Example

```ts
import type { Build835ContactSpec } from "@cosyte/x12";
const per: Build835ContactSpec = {
  contactFunctionCode: "BL",
  name: "JANE COORDINATOR",
  communications: [{ qualifier: "TE", value: "5551234567" }],
};
```

#### Properties

##### communications?

> `readonly` `optional` **communications?**: readonly `object`[]

Up to 3 communication channels (PER-03/04, 05/06, 07/08).

##### contactFunctionCode

> `readonly` **contactFunctionCode**: `string`

PER-01 - contact function code (`BL` technical, `CX` claim office, …).

##### name?

> `readonly` `optional` **name?**: `string`

PER-02 - contact name.

***

### Build835EnvelopeSpec

Interchange + group + transaction identity for the built 835. Mirrors
the `build999` envelope spec; the builder fixes GS-01 to `"HP"` and the
version/release to `"005010X221A1"` (the 835 functional group + TR3) so
the caller never hand-codes them.

#### Example

```ts
import type { Build835EnvelopeSpec } from "@cosyte/x12";
const env: Build835EnvelopeSpec = {
  senderId: "MEDICARE", receiverId: "SUBMITTER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build835PartySpec

N1 party - payer (Loop 1000A, `entityIdentifierCode: "PR"`) or payee
(Loop 1000B, `"PE"`). Mirrors "./types.js".X12RemitParty.

#### Example

```ts
import type { Build835PartySpec } from "@cosyte/x12";
const payer: Build835PartySpec = {
  entityIdentifierCode: "PR", name: "MEDICARE PART A",
  address: { lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244" },
};
```

#### Properties

##### additionalIdentifiers?

> `readonly` `optional` **additionalIdentifiers?**: readonly [`Build835ReferenceSpec`](#build835referencespec)[]

REF additional identifiers.

##### address?

> `readonly` `optional` **address?**: [`Build835AddressSpec`](#build835addressspec)

N3 + N4 address block.

##### contacts?

> `readonly` `optional` **contacts?**: readonly [`Build835ContactSpec`](#build835contactspec)[]

PER contacts.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

N1-01 - entity identifier code (`PR` payer / `PE` payee).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

N1-04 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

N1-03 - identification code qualifier.

##### name

> `readonly` **name**: `string`

N1-02 - party name.

***

### Build835PaymentSpec

BPR financial-information / payment header. `totalActualPayment` is the
sum the bank moved - it is the right-hand side of the top-of-remit
balance invariant `BPR-02 == Σ(CLP-04) − Σ(PLB)` the builder enforces.

#### Example

```ts
import type { Build835PaymentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const bpr: Build835PaymentSpec = {
  transactionHandlingCode: "I",
  totalActualPayment: X12Decimal.fromString("450.00")!,
  creditDebitFlag: "C",
  method: "ACH",
  paymentDate: "20260601",
};
```

#### Properties

##### creditDebitFlag

> `readonly` **creditDebitFlag**: `string`

BPR-03 - credit/debit flag (`C` credit, `D` debit).

##### method

> `readonly` **method**: `string`

BPR-04 - payment method (`ACH`, `CHK`, `NON`, `BOP`, `FWT`).

##### paymentDate

> `readonly` **paymentDate**: `string`

BPR-16 - payment effective date (CCYYMMDD).

##### paymentFormatCode?

> `readonly` `optional` **paymentFormatCode?**: `string`

BPR-05 - payment format code (situational).

##### totalActualPayment

> `readonly` **totalActualPayment**: [`X12Decimal`](#x12decimal)

BPR-02 - total actual provider payment amount.

##### transactionHandlingCode

> `readonly` **transactionHandlingCode**: `string`

BPR-01 - transaction handling code (`I` remittance + payment, `H` notification, …).

***

### Build835PersonSpec

NM1 person on a claim - patient (`QC`), subscriber (`IL`), or corrected
patient (`74`). Mirrors "./types.js".X12RemitPerson. NM1-02
(entity type qualifier) is emitted as `"1"` (person).

#### Example

```ts
import type { Build835PersonSpec } from "@cosyte/x12";
const patient: Build835PersonSpec = {
  entityIdentifierCode: "QC", lastName: "PATIENT", firstName: "TEST",
  idQualifier: "MI", idCode: "MEMBER001",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`QC` patient / `IL` insured / `74` corrected).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name.

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`MI`, `34`, …).

##### lastName?

> `readonly` `optional` **lastName?**: `string`

NM1-03 - last name / organization name.

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix.

***

### Build835ProviderAdjustmentSpec

PLB provider-level adjustment. **Sign convention (raw EDI):** a POSITIVE
amount REDUCES the provider payment (take-back / recoupment); a NEGATIVE
amount ADDS to it (interest / advance). The top-of-remit invariant
`BPR-02 == Σ(CLP-04) − Σ(PLB)` relies on this sign. Mirrors "./types.js".X12RemitProviderAdjustment.

#### Example

```ts
import type { Build835ProviderAdjustmentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const plb: Build835ProviderAdjustmentSpec = {
  providerId: "1234567890", fiscalPeriodDate: "20261231",
  reasonCode: "WO", subCode: "PRIOR-CLAIM-X", amount: X12Decimal.fromString("50.00")!,
};
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

Adjustment amount (raw EDI sign).

##### fiscalPeriodDate

> `readonly` **fiscalPeriodDate**: `string`

PLB-02 - fiscal period date (CCYYMMDD).

##### providerId

> `readonly` **providerId**: `string`

PLB-01 - provider identifier.

##### reasonCode

> `readonly` **reasonCode**: `string`

Adjustment reason code (PLB composite component 1).

##### subCode?

> `readonly` `optional` **subCode?**: `string`

Adjustment reference / sub code (PLB composite component 2).

***

### Build835ProviderSpec

NM1 provider on a claim - service provider (`82`). Mirrors "./types.js".X12RemitProvider. NM1-02 is emitted as `"2"`
(non-person / organization).

#### Example

```ts
import type { Build835ProviderSpec } from "@cosyte/x12";
const prov: Build835ProviderSpec = {
  entityIdentifierCode: "82", name: "RENDERING PROVIDER INC",
  idQualifier: "XX", idCode: "1234567890",
};
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code (`82` service provider).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`XX` NPI).

##### name?

> `readonly` `optional` **name?**: `string`

NM1-03 - organization name.

***

### Build835ReferenceSpec

REF additional identifier on a party / claim / service line. Mirrors
"./types.js".X12RemitReference. `description` (REF-03) is
emitted only when supplied.

#### Example

```ts
import type { Build835ReferenceSpec } from "@cosyte/x12";
const ref: Build835ReferenceSpec = { qualifier: "TJ", value: "123456789" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description (situational).

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification value.

***

### Build835RemarkSpec

One remark (LQ). Mirrors "./types.js".X12RemitRemark minus the
looked-up `description`. Emitted as `LQ*{system}*{code}`. Note: the read
side also surfaces MIA/MOA remark codes as `system: "HE"` remarks - the
builder emits all remarks via LQ, so a round-trip reproduces the
`{ system, code }` pair (the equivalent model), not the original
MIA/MOA segment.

#### Example

```ts
import type { Build835RemarkSpec } from "@cosyte/x12";
const lq: Build835RemarkSpec = { system: "HE", code: "N4" };
```

#### Properties

##### code

> `readonly` **code**: `string`

LQ-02 - industry code value.

##### system

> `readonly` **system**: `string`

LQ-01 - code list qualifier code (`HE` healthcare remark / RARC, …).

***

### Build835ServiceLineSpec

Loop 2110 service-line spec. Subject to the per-line balance invariant
`SVC-02 == SVC-03 + Σ(line CAS)` - the builder REFUSES an out-of-balance
line. Mirrors "./types.js".X12RemitServiceLine.

#### Example

```ts
import type { Build835ServiceLineSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const line: Build835ServiceLineSpec = {
  productServiceIdQualifier: "HC", productServiceId: "99213",
  chargeAmount: X12Decimal.fromString("500.00")!,
  paymentAmount: X12Decimal.fromString("450.00")!,
  adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
};
```

#### Properties

##### adjustments?

> `readonly` `optional` **adjustments?**: readonly [`Build835AdjustmentSpec`](#build835adjustmentspec)[]

Line-level CAS adjustments.

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build835AmountSpec`](#build835amountspec)[]

Line-level AMT amounts.

##### chargeAmount

> `readonly` **chargeAmount**: [`X12Decimal`](#x12decimal)

SVC-02 - line item charge amount.

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SVC-01-3..6 - procedure modifiers.

##### originalServiceId?

> `readonly` `optional` **originalServiceId?**: `string`

SVC-06-2 - original (submitted) product/service ID.

##### originalServiceIdQualifier?

> `readonly` `optional` **originalServiceIdQualifier?**: `string`

SVC-06-1 - original product/service ID qualifier.

##### originalUnitsOfService?

> `readonly` `optional` **originalUnitsOfService?**: [`X12Decimal`](#x12decimal)

SVC-07 - Original Units of Service Count: the units as SUBMITTED, sent
only when they differ from the paid count in SVC-05.

##### paidUnitsOfService?

> `readonly` `optional` **paidUnitsOfService?**: [`X12Decimal`](#x12decimal)

SVC-05 - Units of Service Paid Count. The count the payer actually
adjudicated. Distinct from [Build835ServiceLineSpec.originalUnitsOfService](#originalunitsofservice),
which is what was submitted.

##### paymentAmount

> `readonly` **paymentAmount**: [`X12Decimal`](#x12decimal)

SVC-03 - line item provider payment amount.

##### productServiceId

> `readonly` **productServiceId**: `string`

SVC-01-2 - product/service ID (the procedure code).

##### productServiceIdQualifier

> `readonly` **productServiceIdQualifier**: `string`

SVC-01-1 - product/service ID qualifier (`HC`, `AD`, `N4`, `WK`, `IV`).

##### references?

> `readonly` `optional` **references?**: readonly [`Build835ReferenceSpec`](#build835referencespec)[]

Line-level REF identifiers.

##### remarks?

> `readonly` `optional` **remarks?**: readonly [`Build835RemarkSpec`](#build835remarkspec)[]

Line-level LQ remarks.

##### revenueCode?

> `readonly` `optional` **revenueCode?**: `string`

SVC-04 - NUBC revenue code (institutional).

##### serviceDateEnd?

> `readonly` `optional` **serviceDateEnd?**: `string`

Service date end (DTM*151).

##### serviceDateStart?

> `readonly` `optional` **serviceDateStart?**: `string`

Service date start (DTM*150, or single DTM*472 when start == end).

***

### Build835Spec

The full input to "./build-835.js".build835: the envelope, the
payment header, ≥ 1 trace, optional payer/payee parties, the claims, and
optional provider-level adjustments. A balanced spec round-trips through
`get835` field-for-field; an imbalanced one is REFUSED with a "./build-errors.js".Remit835BuildError.

#### Example

```ts
import { build835, X12Decimal, type Build835Spec } from "@cosyte/x12";
const spec: Build835Spec = {
  envelope: {
    senderId: "MEDICARE", receiverId: "SUBMITTER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: X12Decimal.fromString("450.00")!,
    creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
  claims: [
    {
      patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
      totalChargeAmount: X12Decimal.fromString("500.00")!,
      totalPaymentAmount: X12Decimal.fromString("450.00")!,
      patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
      adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
    },
  ],
};
const ix = build835(spec);
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`Build835ClaimSpec`](#build835claimspec)[]

Loop 2100 claim payments.

##### envelope

> `readonly` **envelope**: [`Build835EnvelopeSpec`](#build835envelopespec)

Interchange / group / transaction identity.

##### payee?

> `readonly` `optional` **payee?**: [`Build835PartySpec`](#build835partyspec)

Loop 1000B payee party (N1*PE).

##### payer?

> `readonly` `optional` **payer?**: [`Build835PartySpec`](#build835partyspec)

Loop 1000A payer party (N1*PR).

##### payment

> `readonly` **payment**: [`Build835PaymentSpec`](#build835paymentspec)

BPR payment header.

##### providerAdjustments?

> `readonly` `optional` **providerAdjustments?**: readonly [`Build835ProviderAdjustmentSpec`](#build835provideradjustmentspec)[]

PLB provider-level adjustments.

##### traces

> `readonly` **traces**: readonly [`Build835TraceSpec`](#build835tracespec)[]

TRN traces (≥ 1 required).

***

### Build835TraceSpec

TRN reassociation trace. At least one is required by the TR3 (it pairs
the 835 to the payment artifact a cash-poster reconciles against).

#### Example

```ts
import type { Build835TraceSpec } from "@cosyte/x12";
const trn: Build835TraceSpec = {
  traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678",
};
```

#### Properties

##### originatingCompanyId?

> `readonly` `optional` **originatingCompanyId?**: `string`

TRN-03 - originating company identifier.

##### originatingCompanySupplementalCode?

> `readonly` `optional` **originatingCompanySupplementalCode?**: `string`

TRN-04 - originating company supplemental code.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - reference identification (the trace / check number).

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code (`1` current transaction trace numbers).

***

### Build837AddressSpec

N3 + N4 address block on an entity. Mirrors "./types.js".X12ClaimAddress.

#### Example

```ts
import type { Build837AddressSpec } from "@cosyte/x12";
const a: Build837AddressSpec = {
  lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113",
};
```

#### Properties

##### city?

> `readonly` `optional` **city?**: `string`

N4-01 - city.

##### countryCode?

> `readonly` `optional` **countryCode?**: `string`

N4-04 - country code.

##### lines

> `readonly` **lines**: readonly `string`[]

N3 address lines (1-2).

##### postalCode?

> `readonly` `optional` **postalCode?**: `string`

N4-03 - postal code.

##### state?

> `readonly` `optional` **state?**: `string`

N4-02 - state / province.

***

### Build837AdjudicationSpec

SVD + adjacent CAS / DTP - Loop 2430 Line Adjudication Information (a prior
payer's adjudication of this line, for COB). Mirrors "./types.js".X12LineAdjudication.

#### Example

```ts
import type { Build837AdjudicationSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const svd: Build837AdjudicationSpec = {
  otherPayerId: "PAYER02", amountPaid: X12Decimal.fromString("50.00")!,
  procedureQualifier: "HC", procedureCode: "99213",
  adjustments: [{ groupCode: "CO", reasonCode: "45", amount: X12Decimal.fromString("20.00")! }],
  dateAdjudicated: "20260520",
};
```

#### Properties

##### adjustments?

> `readonly` `optional` **adjustments?**: readonly [`Build837AdjustmentSpec`](#build837adjustmentspec)[]

CAS adjustments under this adjudication.

##### amountPaid

> `readonly` **amountPaid**: [`X12Decimal`](#x12decimal)

SVD-02 - amount the other payer paid for this line.

##### dateAdjudicated?

> `readonly` `optional` **dateAdjudicated?**: `string`

DTP*573 - adjudication / payment date (CCYYMMDD).

##### otherPayerId

> `readonly` **otherPayerId**: `string`

SVD-01 - other payer identifier.

##### paidUnits?

> `readonly` `optional` **paidUnits?**: [`X12Decimal`](#x12decimal)

SVD-05 - paid units of service.

##### procedureCode?

> `readonly` `optional` **procedureCode?**: `string`

SVD-03-2 - adjudicated procedure code.

##### procedureQualifier?

> `readonly` `optional` **procedureQualifier?**: `string`

SVD-03-1 - adjudicated procedure qualifier.

***

### Build837AdjustmentSpec

One CAS adjustment triple inside a Loop 2430 line adjudication. Mirrors
the remit `X12RemitAdjustment` shape (CAS semantics are identical).

#### Example

```ts
import type { Build837AdjustmentSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const cas: Build837AdjustmentSpec = { groupCode: "CO", reasonCode: "45", amount: X12Decimal.fromString("20.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

Adjustment amount.

##### groupCode

> `readonly` **groupCode**: `string`

CAS-01 - claim adjustment group code (`CO`, `PR`, `OA`, `PI`).

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

Adjustment quantity (situational).

##### reasonCode

> `readonly` **reasonCode**: `string`

Adjustment reason code (CARC).

***

### Build837AmountSpec

AMT supplemental amount on a claim / service line. Mirrors "./types.js".X12ClaimAmount.

#### Example

```ts
import type { Build837AmountSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const amt: Build837AmountSpec = { qualifier: "F5", amount: X12Decimal.fromString("25.00")! };
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02 - monetary amount.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01 - amount qualifier code.

***

### Build837BillingProviderSpec

Loop 2000A billing provider. Emits an HL level-20 top-of-tree node,
computed by the builder. Requires ≥ 1 subscriber.

#### Example

```ts
import type { Build837BillingProviderSpec } from "@cosyte/x12";
declare const sub: import("@cosyte/x12").Build837SubscriberSpec;
const bp: Build837BillingProviderSpec = {
  provider: {
    entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC",
    idQualifier: "XX", idCode: "1234567890",
    address: { lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113" },
    references: [{ qualifier: "EI", value: "987654321" }],
  },
  subscribers: [sub],
};
```

#### Properties

##### payToAddress?

> `readonly` `optional` **payToAddress?**: [`Build837AddressSpec`](#build837addressspec)

NM1*87 - pay-to address (N3/N4 round-trip; the name is not re-surfaced).

##### payToPlan?

> `readonly` `optional` **payToPlan?**: [`Build837EntitySpec`](#build837entityspec)

NM1*PE - pay-to plan (837I only).

##### provider

> `readonly` **provider**: [`Build837EntitySpec`](#build837entityspec)

NM1*85 - the billing provider.

##### subscribers

> `readonly` **subscribers**: readonly [`Build837SubscriberSpec`](#build837subscriberspec)[]

Loop 2000B subscribers (≥ 1 required).

***

### Build837ClaimSpec

Loop 2300 claim. The builder REFUSES a claim with an empty `claimId` or no
service lines (a CLM requires ≥ 1 LX/SVx loop). Mirrors "./types.js".X12Claim minus the HL-resolved context the spine supplies.

#### Example

```ts
import type { Build837ClaimSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const claim: Build837ClaimSpec = {
  claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
  placeOfServiceCode: "11", facilityCodeQualifier: "B", claimFrequencyCode: "1",
  providerSignatureOnFile: "Y", providerAcceptAssignment: "A",
  benefitsAssignment: "Y", releaseOfInformationCode: "Y",
  diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
  serviceLines: [{
    variant: "P", procedureQualifier: "HC", procedureCode: "99213",
    charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN",
    units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"],
  }],
};
```

#### Properties

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build837AmountSpec`](#build837amountspec)[]

AMT claim-level amounts.

##### benefitsAssignment?

> `readonly` `optional` **benefitsAssignment?**: `string`

CLM-08 - benefits assignment certification indicator.

##### claimFrequencyCode?

> `readonly` `optional` **claimFrequencyCode?**: `string`

CLM-05-3 - claim frequency type code.

##### claimId

> `readonly` **claimId**: `string`

CLM-01 - patient account / claim id.

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build837DateSpec`](#build837datespec)[]

DTP claim-level dates.

##### diagnoses?

> `readonly` `optional` **diagnoses?**: readonly [`Build837HiCodeSpec`](#build837hicodespec)[]

HI diagnoses.

##### facilityCodeQualifier?

> `readonly` `optional` **facilityCodeQualifier?**: `string`

CLM-05-2 - facility code qualifier.

##### notes?

> `readonly` `optional` **notes?**: readonly [`Build837NoteSpec`](#build837notespec)[]

NTE claim-level notes.

##### otherHi?

> `readonly` `optional` **otherHi?**: readonly [`Build837HiCodeSpec`](#build837hicodespec)[]

HI other code-set entries (value information, condition, occurrence, …).

##### otherSubscribers?

> `readonly` `optional` **otherSubscribers?**: readonly [`Build837OtherSubscriberSpec`](#build837othersubscriberspec)[]

Loop 2320 other subscribers.

##### placeOfServiceCode?

> `readonly` `optional` **placeOfServiceCode?**: `string`

CLM-05-1 - place of service code.

##### procedures?

> `readonly` `optional` **procedures?**: readonly [`Build837HiCodeSpec`](#build837hicodespec)[]

HI procedures.

##### providerAcceptAssignment?

> `readonly` `optional` **providerAcceptAssignment?**: `string`

CLM-07 - provider accept assignment code.

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build837EntitySpec`](#build837entityspec)[]

Loop 2310x claim provider names (NM1 fields round-trip).

##### providerSignatureOnFile?

> `readonly` `optional` **providerSignatureOnFile?**: `string`

CLM-06 - provider/supplier signature on file.

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

REF claim-level identifiers.

##### releaseOfInformationCode?

> `readonly` `optional` **releaseOfInformationCode?**: `string`

CLM-09 - release of information code.

##### serviceLines

> `readonly` **serviceLines**: readonly [`Build837ServiceLineSpec`](#build837servicelinespec)[]

Loop 2400 service lines (≥ 1 required).

##### totalCharge

> `readonly` **totalCharge**: [`X12Decimal`](#x12decimal)

CLM-02 - total claim charge amount.

***

### Build837ContactSpec

PER contact on an entity (Loop 1000A submitter, etc.). Each contact may
carry up to three communication channels. Mirrors "./types.js".X12ClaimContact.

#### Example

```ts
import type { Build837ContactSpec } from "@cosyte/x12";
const per: Build837ContactSpec = {
  contactFunctionCode: "IC",
  name: "JANE SUBMITTER",
  communications: [{ qualifier: "TE", value: "5551234567" }],
};
```

#### Properties

##### communications?

> `readonly` `optional` **communications?**: readonly `object`[]

Up to 3 communication channels (PER-03/04, 05/06, 07/08).

##### contactFunctionCode

> `readonly` **contactFunctionCode**: `string`

PER-01 - contact function code (`IC` information contact, …).

##### name?

> `readonly` `optional` **name?**: `string`

PER-02 - contact name.

***

### Build837DateSpec

DTP date - claim-level or service-line-level. Mirrors "./types.js".X12ClaimDate.

#### Example

```ts
import type { Build837DateSpec } from "@cosyte/x12";
const d: Build837DateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time format qualifier (`D8` CCYYMMDD, `RD8` range).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier (`472` service, `431` onset, …).

##### value

> `readonly` **value**: `string`

DTP-03 - the date value verbatim.

***

### Build837DrugSpec

LIN + CTP - Loop 2410 Drug Identification (837P). Mirrors "./types.js".X12LineDrug.

#### Example

```ts
import type { Build837DrugSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const drug: Build837DrugSpec = {
  qualifier: "N4", code: "00093721410",
  quantity: X12Decimal.fromString("1.5")!, unitOfMeasure: "ML",
};
```

#### Properties

##### code

> `readonly` **code**: `string`

LIN-03 - the drug code (NDC).

##### qualifier

> `readonly` **qualifier**: `string`

LIN-02 - product id qualifier (`N4` NDC, …).

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

CTP-04 - dispensed quantity (situational).

##### unitOfMeasure?

> `readonly` `optional` **unitOfMeasure?**: `string`

CTP-05-1 - UCUM unit of measure (situational).

***

### Build837EntitySpec

NM1 entity used throughout the 837 - submitter (`41`), receiver (`40`),
billing provider (`85`), subscriber (`IL`), payer (`PR`), patient (`QC`),
and the 2310x / 2420x provider roles. Mirrors "./types.js".X12ClaimEntity.

Note: when used as a claim-level (2310x) or service-line (2420x) provider,
only the NM1 fields round-trip through `get837Claims`; an attached
`address` / `contacts` / `references` is emitted but the read side does
not re-surface it on the provider (a documented read limitation).

#### Example

```ts
import type { Build837EntitySpec } from "@cosyte/x12";
const billing: Build837EntitySpec = {
  entityIdentifierCode: "85", entityTypeQualifier: "2",
  name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890",
  address: { lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113" },
  references: [{ qualifier: "EI", value: "987654321" }],
};
```

#### Properties

##### address?

> `readonly` `optional` **address?**: [`Build837AddressSpec`](#build837addressspec)

N3 + N4 address block.

##### contacts?

> `readonly` `optional` **contacts?**: readonly [`Build837ContactSpec`](#build837contactspec)[]

PER contacts.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### firstName?

> `readonly` `optional` **firstName?**: `string`

NM1-04 - first name (person).

##### idCode?

> `readonly` `optional` **idCode?**: `string`

NM1-09 - identification code.

##### idQualifier?

> `readonly` `optional` **idQualifier?**: `string`

NM1-08 - identification code qualifier (`XX` NPI, `MI` member id, …).

##### middleName?

> `readonly` `optional` **middleName?**: `string`

NM1-05 - middle name (person).

##### name

> `readonly` **name**: `string`

NM1-03 - last name / organization name.

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

REF additional identifiers.

##### suffix?

> `readonly` `optional` **suffix?**: `string`

NM1-07 - name suffix (person).

***

### Build837EnvelopeSpec

Interchange + group + transaction identity for the built 837. The builder
fixes GS-01 to `"HC"`, and defaults the ST-03 / GS-08 reference to the
variant's TR3 (`005010X222A2` / `X223A3` / `X224A2`) so the caller never
has to hand-code it.

**🩺 That default is not what every trading partner accepts, so
[Build837EnvelopeSpec.implementationConventionReference](#implementationconventionreference) overrides
it.** The three defaults are published errata guides, but they are
neither the identifiers HIPAA adopts at 45 CFR 162.1102 nor the ones
payer companion guides commonly require in ST-03 / GS-08 (CMS and several
state Medicaid guides state `005010X222A1` for Professional and
`005010X223A2` for Institutional). **A partner that requires one of those
will reject a Professional or Institutional 837 built on the default**,
and the override is how you send what your partner asked for. The default
itself was deliberately NOT re-stamped: which published guide identifier
a partner accepts is a partner fact rather than a spec fact, and changing
bytes this library already emitted would break the partners it works with
today. The READ side is unaffected - `get837Claims` recognises all of
these references.

#### Example

```ts
import type { Build837EnvelopeSpec } from "@cosyte/x12";
const env: Build837EnvelopeSpec = {
  senderId: "SUBMITTER", receiverId: "RECEIVER",
  interchangeDate: "260601", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1", transactionSetControlNumber: "0001",
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Default: the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Default: the interchange sender id.

##### claimOrEncounterIndicator?

> `readonly` `optional` **claimOrEncounterIndicator?**: `string`

BHT-06 - claim/encounter indicator (`CH` chargeable, `RP` reporting). Default `"CH"`.

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number.

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Default: the interchange time.

##### implementationConventionReference?

> `readonly` `optional` **implementationConventionReference?**: `string`

🩺 ST-03 **and** GS-08 - the implementation convention reference this
837 declares. Default: the variant's TR3 (`005010X222A2` Professional,
`005010X223A3` Institutional, `005010X224A2` Dental).

**Set it to whatever your trading partner's companion guide requires**,
for example `005010X222A1` on a professional claim to a payer that asks
for it. Which published identifier a partner accepts is a partner fact,
so this library will not choose for you: it defaults to a real published
guide and gets out of the way. **One value is written to both elements**,
because this builder has always written the same reference to ST-03 and
GS-08 and nothing grounds a caller making them differ. That is a statement
about the bytes this field emits, not about what each element may legally
hold: GS-08 is data element 480 (`AN 1/12`) and ST-03 is element 1705
(`AN 1/35`), and nothing here bounds the length.

Refused, all `X12_837_BUILD_INVALID_SPEC`. An **empty** string, because a
trailing empty element is dropped on emit, so it would delete ST-03 and
GS-08 rather than send them empty. One carrying an **active delimiter or
the release character**, because these two elements cannot carry it even
escaped: the ST and GS segments are read by a splitter that is not
release-aware, so the declaration would silently become two elements. And
one **this library's own reader resolves to a different variant**
(`005010X223A2` handed to `build837P`): the file would declare one variant
and carry another's service segments, and `get837Claims` would then decode
none of its service lines. Those are what this field adds, on top of the
element-type guard every string slot already has, which refuses a
non-string with the same code - no total is published. **Anything else is
emitted as given** - the set of published errata is not provably
exhaustive, so an identifier this library does not carry is the caller's
call, not an error.

🩺 A guard on this element cannot make the element trustworthy. An active
delimiter in a DIFFERENT envelope field splits its own segment and shifts
every element after it, so ST-03 / GS-08 are then read out of a
neighbour's slot. `KNOWN-LIMITATIONS.md` carries the measurement.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### transactionDate?

> `readonly` `optional` **transactionDate?**: `string`

BHT-04 - transaction creation date CCYYMMDD. Default: the group date.

##### transactionReferenceId?

> `readonly` `optional` **transactionReferenceId?**: `string`

BHT-03 - originator application reference id. Default: the transaction set control number.

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number.

##### transactionTime?

> `readonly` `optional` **transactionTime?**: `string`

BHT-05 - transaction creation time HHMM. Default: the group time.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

***

### Build837HiCodeSpec

One HI diagnosis / procedure composite. Mirrors "./types.js".X12ClaimHiCode minus the looked-up `codeSystem` / `category`
(the builder emits the qualifier; the read side resolves the system).

#### Example

```ts
import type { Build837HiCodeSpec } from "@cosyte/x12";
const dx: Build837HiCodeSpec = { qualifier: "ABK", code: "J20.9" };
```

#### Properties

##### code

> `readonly` **code**: `string`

Composite component 2 - the diagnosis / procedure code.

##### date?

> `readonly` `optional` **date?**: `string`

Composite component 4 - date value (situational).

##### dateQualifier?

> `readonly` `optional` **dateQualifier?**: `string`

Composite component 3 - date/time format qualifier (situational).

##### monetaryAmount?

> `readonly` `optional` **monetaryAmount?**: [`X12Decimal`](#x12decimal)

Composite component 5 - monetary amount (situational).

##### poaIndicator?

> `readonly` `optional` **poaIndicator?**: `string`

Composite component 9 - present-on-admission indicator (837I).

##### qualifier

> `readonly` **qualifier**: `string`

Composite component 1 - code-list qualifier (`ABK`, `ABF`, `BBR`, …).

##### quantity?

> `readonly` `optional` **quantity?**: [`X12Decimal`](#x12decimal)

Composite component 6 - quantity (situational).

##### versionId?

> `readonly` `optional` **versionId?**: `string`

Composite component 7 - version id (situational).

***

### Build837NoteSpec

NTE free-text note. Mirrors "./types.js".X12ClaimNote. NTE-02 may
carry incidental PHI - synthetic-only fixtures.

#### Example

```ts
import type { Build837NoteSpec } from "@cosyte/x12";
const n: Build837NoteSpec = { noteReferenceCode: "ADD", description: "SUPPLEMENTAL INFO" };
```

#### Properties

##### description

> `readonly` **description**: `string`

NTE-02 - free text.

##### noteReferenceCode

> `readonly` **noteReferenceCode**: `string`

NTE-01 - note reference code (`ADD`, `CER`, …).

***

### Build837OtherSubscriberSpec

Loop 2320 Other Subscriber Information (COB surface). Mirrors "./types.js".X12OtherSubscriber.

#### Example

```ts
import type { Build837OtherSubscriberSpec } from "@cosyte/x12";
const oth: Build837OtherSubscriberSpec = {
  payerResponsibilityCode: "S", individualRelationshipCode: "01",
  otherSubscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "SPOUSE" },
  otherPayer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "SECONDARY PLAN" },
};
```

#### Properties

##### claimFilingIndicator?

> `readonly` `optional` **claimFilingIndicator?**: `string`

SBR-09 - claim filing indicator code.

##### individualRelationshipCode?

> `readonly` `optional` **individualRelationshipCode?**: `string`

SBR-02 - individual relationship code.

##### otherPayer?

> `readonly` `optional` **otherPayer?**: [`Build837EntitySpec`](#build837entityspec)

NM1*PR - the other payer.

##### otherSubscriber?

> `readonly` `optional` **otherSubscriber?**: [`Build837EntitySpec`](#build837entityspec)

NM1*IL / NM1*QC - the other subscriber.

##### payerResponsibilityCode

> `readonly` **payerResponsibilityCode**: `string`

SBR-01 - payer responsibility code (`P`/`S`/`T`).

***

### Build837PatientSpec

Loop 2000C dependent patient (patient ≠ subscriber). Emits an HL level-23
child of the enclosing subscriber HL, computed by the builder. Requires
≥ 1 claim.

#### Example

```ts
import type { Build837PatientSpec } from "@cosyte/x12";
declare const claim: import("@cosyte/x12").Build837ClaimSpec;
const pat: Build837PatientSpec = {
  individualRelationshipCode: "19",
  patient: { entityIdentifierCode: "QC", entityTypeQualifier: "1", name: "CHILD", firstName: "TEST" },
  claims: [claim],
};
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`Build837ClaimSpec`](#build837claimspec)[]

Loop 2300 claims under this patient.

##### individualRelationshipCode?

> `readonly` `optional` **individualRelationshipCode?**: `string`

PAT-01 - individual relationship code (`19` child, …).

##### patient

> `readonly` **patient**: [`Build837EntitySpec`](#build837entityspec)

NM1*QC - the patient.

***

### Build837ReferenceSpec

REF additional identifier on an entity / claim / service line. Mirrors
"./types.js".X12ClaimReference. `description` (REF-03) is emitted
only when supplied.

#### Example

```ts
import type { Build837ReferenceSpec } from "@cosyte/x12";
const ref: Build837ReferenceSpec = { qualifier: "EI", value: "987654321" };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

REF-03 - description (situational).

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification value.

***

### Build837ServiceLineBaseSpec

Fields shared across every service-line variant spec.

#### Extended by

- [`Build837ServiceLineDentalSpec`](#build837servicelinedentalspec)
- [`Build837ServiceLineInstitutionalSpec`](#build837servicelineinstitutionalspec)
- [`Build837ServiceLineProfessionalSpec`](#build837servicelineprofessionalspec)

#### Properties

##### adjudications?

> `readonly` `optional` **adjudications?**: readonly [`Build837AdjudicationSpec`](#build837adjudicationspec)[]

Loop 2430 line adjudications.

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build837AmountSpec`](#build837amountspec)[]

Line-level AMT amounts.

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal)

SVx charge amount - SV1-02 (P), SV2-03 (I) or SV3-02 (D).

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build837DateSpec`](#build837datespec)[]

DTP service-line dates.

##### lineNumber?

> `readonly` `optional` **lineNumber?**: `string`

LX-01 - line number. Default: the 1-based index within the claim.

##### notes?

> `readonly` `optional` **notes?**: readonly [`Build837NoteSpec`](#build837notespec)[]

Line-level NTE notes.

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build837EntitySpec`](#build837entityspec)[]

Loop 2420 service-line provider names (NM1 fields round-trip).

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

Line-level REF identifiers.

##### unitOfMeasure?

> `readonly` `optional` **unitOfMeasure?**: `string`

SVx unit/basis-of-measurement code (`UN`, `MJ`, …).

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal)

SVx units of service - SV1-04 (P), SV2-05 (I) or SV3-06 (D).

**Required as of `0.0.13`.** Through `0.0.12` this was optional and an
omitted value was emitted as the literal `"0"`, so the builder stated a
service unit count the caller never supplied. It now refuses with
`X12_837_BUILD_INVALID_SPEC` instead, the same stance `build277` takes
for SVC-07: this builder will not invent a count, and will not leave the
element empty for the receiver to guess at either.

***

### Build837ServiceLineDentalSpec

837D service line (SV3). Mirrors "./types.js".X12\_837ServiceLineDental.

#### Example

```ts
import type { Build837ServiceLineDentalSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const sl: Build837ServiceLineDentalSpec = {
  variant: "D", procedureQualifier: "AD", procedureCode: "D2391",
  charge: X12Decimal.fromString("180.00")!, units: X12Decimal.fromString("1")!,
  placeOfServiceCode: "11", toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
};
```

#### Extends

- [`Build837ServiceLineBaseSpec`](#build837servicelinebasespec)

#### Properties

##### adjudications?

> `readonly` `optional` **adjudications?**: readonly [`Build837AdjudicationSpec`](#build837adjudicationspec)[]

Loop 2430 line adjudications.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`adjudications`](#adjudications)

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build837AmountSpec`](#build837amountspec)[]

Line-level AMT amounts.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`amounts`](#amounts-6)

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal)

SVx charge amount - SV1-02 (P), SV2-03 (I) or SV3-02 (D).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`charge`](#charge)

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build837DateSpec`](#build837datespec)[]

DTP service-line dates.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`dates`](#dates-18)

##### lineNumber?

> `readonly` `optional` **lineNumber?**: `string`

LX-01 - line number. Default: the 1-based index within the claim.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`lineNumber`](#linenumber)

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SV3-01-3..6 - procedure modifiers.

##### notes?

> `readonly` `optional` **notes?**: readonly [`Build837NoteSpec`](#build837notespec)[]

Line-level NTE notes.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`notes`](#notes-1)

##### oralCavityArea?

> `readonly` `optional` **oralCavityArea?**: readonly `string`[]

SV3-04 - oral cavity area designation codes.

##### placeOfServiceCode?

> `readonly` `optional` **placeOfServiceCode?**: `string`

SV3-03 - place of service.

##### procedureCode

> `readonly` **procedureCode**: `string`

SV3-01-2 - procedure code.

##### procedureQualifier

> `readonly` **procedureQualifier**: `string`

SV3-01-1 - procedure qualifier (`AD` ADA/CDT).

##### prosthesisCrownInlayCode?

> `readonly` `optional` **prosthesisCrownInlayCode?**: `string`

SV3-05 - prosthesis / crown / inlay code.

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build837EntitySpec`](#build837entityspec)[]

Loop 2420 service-line provider names (NM1 fields round-trip).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`providers`](#providers-4)

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

Line-level REF identifiers.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`references`](#references-24)

##### toothInformation?

> `readonly` `optional` **toothInformation?**: readonly [`Build837ToothSpec`](#build837toothspec)[]

Loop 2400 TOO tooth information.

##### unitOfMeasure?

> `readonly` `optional` **unitOfMeasure?**: `string`

SVx unit/basis-of-measurement code (`UN`, `MJ`, …).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`unitOfMeasure`](#unitofmeasure-1)

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal)

SVx units of service - SV1-04 (P), SV2-05 (I) or SV3-06 (D).

**Required as of `0.0.13`.** Through `0.0.12` this was optional and an
omitted value was emitted as the literal `"0"`, so the builder stated a
service unit count the caller never supplied. It now refuses with
`X12_837_BUILD_INVALID_SPEC` instead, the same stance `build277` takes
for SVC-07: this builder will not invent a count, and will not leave the
element empty for the receiver to guess at either.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`units`](#units)

##### variant

> `readonly` **variant**: `"D"`

***

### Build837ServiceLineInstitutionalSpec

837I service line (SV2). Mirrors "./types.js".X12\_837ServiceLineInstitutional.

#### Example

```ts
import type { Build837ServiceLineInstitutionalSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const sl: Build837ServiceLineInstitutionalSpec = {
  variant: "I", revenueCode: "0120", procedureQualifier: "HC", procedureCode: "99221",
  charge: X12Decimal.fromString("1500.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!,
};
```

#### Extends

- [`Build837ServiceLineBaseSpec`](#build837servicelinebasespec)

#### Properties

##### adjudications?

> `readonly` `optional` **adjudications?**: readonly [`Build837AdjudicationSpec`](#build837adjudicationspec)[]

Loop 2430 line adjudications.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`adjudications`](#adjudications)

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build837AmountSpec`](#build837amountspec)[]

Line-level AMT amounts.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`amounts`](#amounts-6)

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal)

SVx charge amount - SV1-02 (P), SV2-03 (I) or SV3-02 (D).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`charge`](#charge)

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build837DateSpec`](#build837datespec)[]

DTP service-line dates.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`dates`](#dates-18)

##### lineNumber?

> `readonly` `optional` **lineNumber?**: `string`

LX-01 - line number. Default: the 1-based index within the claim.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`lineNumber`](#linenumber)

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SV2-02-3..6 - procedure modifiers.

##### nonCoveredCharge?

> `readonly` `optional` **nonCoveredCharge?**: [`X12Decimal`](#x12decimal)

SV2-07 - non-covered charge amount.

##### notes?

> `readonly` `optional` **notes?**: readonly [`Build837NoteSpec`](#build837notespec)[]

Line-level NTE notes.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`notes`](#notes-1)

##### procedureCode?

> `readonly` `optional` **procedureCode?**: `string`

SV2-02-2 - procedure code (situational).

##### procedureQualifier?

> `readonly` `optional` **procedureQualifier?**: `string`

SV2-02-1 - procedure qualifier (situational).

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build837EntitySpec`](#build837entityspec)[]

Loop 2420 service-line provider names (NM1 fields round-trip).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`providers`](#providers-4)

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

Line-level REF identifiers.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`references`](#references-24)

##### revenueCode

> `readonly` **revenueCode**: `string`

SV2-01 - NUBC revenue code.

##### serviceLineRate?

> `readonly` `optional` **serviceLineRate?**: [`X12Decimal`](#x12decimal)

SV2-06 - line item rate.

##### unitOfMeasure?

> `readonly` `optional` **unitOfMeasure?**: `string`

SVx unit/basis-of-measurement code (`UN`, `MJ`, …).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`unitOfMeasure`](#unitofmeasure-1)

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal)

SVx units of service - SV1-04 (P), SV2-05 (I) or SV3-06 (D).

**Required as of `0.0.13`.** Through `0.0.12` this was optional and an
omitted value was emitted as the literal `"0"`, so the builder stated a
service unit count the caller never supplied. It now refuses with
`X12_837_BUILD_INVALID_SPEC` instead, the same stance `build277` takes
for SVC-07: this builder will not invent a count, and will not leave the
element empty for the receiver to guess at either.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`units`](#units)

##### variant

> `readonly` **variant**: `"I"`

***

### Build837ServiceLineProfessionalSpec

837P service line (SV1). Mirrors "./types.js".X12\_837ServiceLineProfessional.

#### Example

```ts
import type { Build837ServiceLineProfessionalSpec } from "@cosyte/x12";
import { X12Decimal } from "@cosyte/x12";
const sl: Build837ServiceLineProfessionalSpec = {
  variant: "P", procedureQualifier: "HC", procedureCode: "99213",
  modifiers: ["25"], charge: X12Decimal.fromString("150.00")!,
  unitOfMeasure: "UN", units: X12Decimal.fromString("1")!,
  diagnosisPointers: ["1"], dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
};
```

#### Extends

- [`Build837ServiceLineBaseSpec`](#build837servicelinebasespec)

#### Properties

##### adjudications?

> `readonly` `optional` **adjudications?**: readonly [`Build837AdjudicationSpec`](#build837adjudicationspec)[]

Loop 2430 line adjudications.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`adjudications`](#adjudications)

##### amounts?

> `readonly` `optional` **amounts?**: readonly [`Build837AmountSpec`](#build837amountspec)[]

Line-level AMT amounts.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`amounts`](#amounts-6)

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal)

SVx charge amount - SV1-02 (P), SV2-03 (I) or SV3-02 (D).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`charge`](#charge)

##### dates?

> `readonly` `optional` **dates?**: readonly [`Build837DateSpec`](#build837datespec)[]

DTP service-line dates.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`dates`](#dates-18)

##### diagnosisPointers?

> `readonly` `optional` **diagnosisPointers?**: readonly `string`[]

SV1-07 - diagnosis code pointers (1-4).

##### drug?

> `readonly` `optional` **drug?**: [`Build837DrugSpec`](#build837drugspec)

Loop 2410 drug identification.

##### emergencyIndicator?

> `readonly` `optional` **emergencyIndicator?**: `string`

SV1-09 - emergency indicator.

##### epsdtIndicator?

> `readonly` `optional` **epsdtIndicator?**: `string`

SV1-11 - EPSDT indicator.

##### familyPlanningIndicator?

> `readonly` `optional` **familyPlanningIndicator?**: `string`

SV1-12 - family planning indicator.

##### lineNumber?

> `readonly` `optional` **lineNumber?**: `string`

LX-01 - line number. Default: the 1-based index within the claim.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`lineNumber`](#linenumber)

##### modifiers?

> `readonly` `optional` **modifiers?**: readonly `string`[]

SV1-01-3..6 - procedure modifiers.

##### notes?

> `readonly` `optional` **notes?**: readonly [`Build837NoteSpec`](#build837notespec)[]

Line-level NTE notes.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`notes`](#notes-1)

##### placeOfServiceCode?

> `readonly` `optional` **placeOfServiceCode?**: `string`

SV1-05 - place of service (overrides claim-level).

##### procedureCode

> `readonly` **procedureCode**: `string`

SV1-01-2 - procedure code.

##### procedureQualifier

> `readonly` **procedureQualifier**: `string`

SV1-01-1 - procedure qualifier (`HC` HCPCS/CPT, …).

##### providers?

> `readonly` `optional` **providers?**: readonly [`Build837EntitySpec`](#build837entityspec)[]

Loop 2420 service-line provider names (NM1 fields round-trip).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`providers`](#providers-4)

##### references?

> `readonly` `optional` **references?**: readonly [`Build837ReferenceSpec`](#build837referencespec)[]

Line-level REF identifiers.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`references`](#references-24)

##### unitOfMeasure?

> `readonly` `optional` **unitOfMeasure?**: `string`

SVx unit/basis-of-measurement code (`UN`, `MJ`, …).

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`unitOfMeasure`](#unitofmeasure-1)

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal)

SVx units of service - SV1-04 (P), SV2-05 (I) or SV3-06 (D).

**Required as of `0.0.13`.** Through `0.0.12` this was optional and an
omitted value was emitted as the literal `"0"`, so the builder stated a
service unit count the caller never supplied. It now refuses with
`X12_837_BUILD_INVALID_SPEC` instead, the same stance `build277` takes
for SVC-07: this builder will not invent a count, and will not leave the
element empty for the receiver to guess at either.

###### Inherited from

[`Build837ServiceLineBaseSpec`](#build837servicelinebasespec).[`units`](#units)

##### variant

> `readonly` **variant**: `"P"`

***

### Build837Spec

The full input to "./build-837.js".build837P / `build837I` /
`build837D`: the envelope, the submitter (Loop 1000A) + receiver (Loop
1000B), and the nested billing-provider → subscriber → (claims | patient)
tree from which the builder COMPUTES the HL spine. A well-formed spec
round-trips through `get837Claims` field-for-field; a structurally
impossible tree is REFUSED with a "./build-errors.js".Claim837BuildError.

#### Example

```ts
import { build837P, X12Decimal, type Build837Spec } from "@cosyte/x12";
const spec: Build837Spec = {
  envelope: {
    senderId: "SUBMITTER", receiverId: "RECEIVER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUBMITTER ONE", idQualifier: "46", idCode: "SUB001" },
  receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "RECEIVER ONE", idQualifier: "46", idCode: "REC001" },
  billingProviders: [{
    provider: { entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
    subscribers: [{
      info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
      subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
      payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
      claims: [{
        claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
        diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
        serviceLines: [{ variant: "P", procedureQualifier: "HC", procedureCode: "99213", charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"] }],
      }],
    }],
  }],
};
const ix = build837P(spec);
```

#### Properties

##### billingProviders

> `readonly` **billingProviders**: readonly [`Build837BillingProviderSpec`](#build837billingproviderspec)[]

Loop 2000A billing providers (≥ 1 required).

##### envelope

> `readonly` **envelope**: [`Build837EnvelopeSpec`](#build837envelopespec)

Interchange / group / transaction identity.

##### receiver

> `readonly` **receiver**: [`Build837EntitySpec`](#build837entityspec)

Loop 1000B receiver (NM1*40).

##### submitter

> `readonly` **submitter**: [`Build837EntitySpec`](#build837entityspec)

Loop 1000A submitter (NM1*41).

***

### Build837SubscriberInfoSpec

SBR - Subscriber Information for a Loop 2000B subscriber. Mirrors "./types.js".X12SubscriberInfo.

#### Example

```ts
import type { Build837SubscriberInfoSpec } from "@cosyte/x12";
const info: Build837SubscriberInfoSpec = {
  payerResponsibilityCode: "P", individualRelationshipCode: "18",
  groupNumber: "GROUP123", claimFilingIndicator: "MB",
};
```

#### Properties

##### claimFilingIndicator?

> `readonly` `optional` **claimFilingIndicator?**: `string`

SBR-09 - claim filing indicator code.

##### groupName?

> `readonly` `optional` **groupName?**: `string`

SBR-04 - group name.

##### groupNumber?

> `readonly` `optional` **groupNumber?**: `string`

SBR-03 - group / policy number.

##### individualRelationshipCode?

> `readonly` `optional` **individualRelationshipCode?**: `string`

SBR-02 - individual relationship code (`18` self, …).

##### payerResponsibilityCode

> `readonly` **payerResponsibilityCode**: `string`

SBR-01 - payer responsibility code (`P`/`S`/`T`).

***

### Build837SubscriberSpec

Loop 2000B subscriber. Emits an HL level-22 child of the enclosing billing
provider HL, computed by the builder. Carries either direct `claims`
(patient = subscriber, SBR-02 `18`) or dependent `patients`.

#### Example

```ts
import type { Build837SubscriberSpec } from "@cosyte/x12";
declare const claim: import("@cosyte/x12").Build837ClaimSpec;
const sub: Build837SubscriberSpec = {
  info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
  subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
  payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
  claims: [claim],
};
```

#### Properties

##### claims?

> `readonly` `optional` **claims?**: readonly [`Build837ClaimSpec`](#build837claimspec)[]

Loop 2300 claims directly under the subscriber (patient = subscriber).

##### info

> `readonly` **info**: [`Build837SubscriberInfoSpec`](#build837subscriberinfospec)

SBR subscriber information.

##### patients?

> `readonly` `optional` **patients?**: readonly [`Build837PatientSpec`](#build837patientspec)[]

Loop 2000C dependent patients.

##### payer

> `readonly` **payer**: [`Build837EntitySpec`](#build837entityspec)

NM1*PR - the payer.

##### subscriber

> `readonly` **subscriber**: [`Build837EntitySpec`](#build837entityspec)

NM1*IL - the subscriber.

***

### Build837ToothSpec

TOO - Tooth Information (837D Loop 2400). Mirrors "./types.js".X12ToothInformation.

#### Example

```ts
import type { Build837ToothSpec } from "@cosyte/x12";
const too: Build837ToothSpec = { qualifier: "JP", toothCode: "14", surfaces: ["O"] };
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

TOO-01 - tooth-numbering code list qualifier (`JP` ADA universal, …).

##### surfaces?

> `readonly` `optional` **surfaces?**: readonly `string`[]

TOO-03 - per-surface codes (`M`, `O`, `D`, …).

##### toothCode

> `readonly` **toothCode**: `string`

TOO-02 - tooth identifier.

***

### Build997ElementErrorSpec

Element-level error spec for `build997`: one AK4. `syntaxErrorCode`
(AK4-03) is required and written as given. `copyOfBadDataElement` is
optional and SHOULD be omitted whenever the offending value is PHI.

#### Properties

##### copyOfBadDataElement?

> `readonly` `optional` **copyOfBadDataElement?**: `string`

##### dataElementReferenceNumber?

> `readonly` `optional` **dataElementReferenceNumber?**: `string`

##### position

> `readonly` **position**: `object`

###### component?

> `readonly` `optional` **component?**: `number`

###### element

> `readonly` **element**: `number`

###### repetition?

> `readonly` `optional` **repetition?**: `number`

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: `string`

***

### Build997FunctionalGroupSpec

Functional group response spec for `build997`: the AK1 and AK9 pair. AK1-03
is situational on a 997, so `versionRelease` is optional.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode)

##### functionalIdCode

> `readonly` **functionalIdCode**: `string`

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

##### numberOfAcceptedTransactionSets

> `readonly` **numberOfAcceptedTransactionSets**: `number`

##### numberOfReceivedTransactionSets

> `readonly` **numberOfReceivedTransactionSets**: `number`

##### numberOfTransactionSets

> `readonly` **numberOfTransactionSets**: `number`

##### syntaxErrorCodes?

> `readonly` `optional` **syntaxErrorCodes?**: readonly `string`[]

##### transactionResponses

> `readonly` **transactionResponses**: readonly [`Build997TransactionResponseSpec`](#build997transactionresponsespec)[]

##### versionRelease?

> `readonly` `optional` **versionRelease?**: `string`

***

### Build997SegmentErrorSpec

Segment-level error spec for `build997`: one AK3 with its AK4s.

#### Properties

##### elementErrors?

> `readonly` `optional` **elementErrors?**: readonly [`Build997ElementErrorSpec`](#build997elementerrorspec)[]

##### loopIdentifier?

> `readonly` `optional` **loopIdentifier?**: `string`

##### segmentIdCode

> `readonly` **segmentIdCode**: `string`

##### segmentPositionInTransactionSet

> `readonly` **segmentPositionInTransactionSet**: `number`

##### syntaxErrorCode?

> `readonly` `optional` **syntaxErrorCode?**: `string`

***

### Build997Spec

Top-level spec for `build997`. The envelope takes the same fields and
defaults as the 999's ([Build999EnvelopeSpec](#build999envelopespec)); GS-08 is the base
standard version `005010` and the ST carries no ST-03.

#### Properties

##### envelope

> `readonly` **envelope**: [`Build999EnvelopeSpec`](#build999envelopespec)

##### functionalGroup

> `readonly` **functionalGroup**: [`Build997FunctionalGroupSpec`](#build997functionalgroupspec)

***

### Build997TransactionResponseSpec

Transaction set response spec for `build997`: one AK2..AK5 block.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12Ack997SetDispositionCode`](#x12ack997setdispositioncode)

AK5-01, code list 717: there is no `P` for one transaction set.

##### implementationConventionReference?

> `readonly` `optional` **implementationConventionReference?**: `string`

##### segmentErrors?

> `readonly` `optional` **segmentErrors?**: readonly [`Build997SegmentErrorSpec`](#build997segmenterrorspec)[]

##### syntaxErrorCodes?

> `readonly` `optional` **syntaxErrorCodes?**: readonly `string`[]

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

##### transactionSetIdCode

> `readonly` **transactionSetIdCode**: `string`

***

### Build999ElementErrorSpec

Element-level error spec - the input shape for an IK4 the library will
build. `copyOfBadDataElement` is OPTIONAL by design: when the offending
value is PHI (medical record number, name, date of birth), callers
SHOULD omit it. The library never auto-populates this field.

#### Properties

##### contexts?

> `readonly` `optional` **contexts?**: readonly `string`[]

Optional CTX context strings emitted between this IK4 and the next.
Each entry becomes a single CTX segment with the given value as its
first composite element. Pass `[]` (default) for no context.

##### copyOfBadDataElement?

> `readonly` `optional` **copyOfBadDataElement?**: `string`

##### dataElementReferenceNumber?

> `readonly` `optional` **dataElementReferenceNumber?**: `string`

##### position

> `readonly` **position**: `object`

###### component?

> `readonly` `optional` **component?**: `number`

###### element

> `readonly` **element**: `number`

###### repetition?

> `readonly` `optional` **repetition?**: `number`

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: [`Ik403Code`](#ik403code)

***

### Build999EnvelopeSpec

Envelope spec for `build999` - the ISA + GS + ST + matching trailers
that wrap the 999 transaction set. Defaults are spec-conformant for a
minimal 999 envelope:

- `senderQualifier` / `receiverQualifier` default to `ZZ` (mutually
  defined).
- `usageIndicator` defaults to `P` (production).
- `repetitionSeparator` defaults to `^`; `componentSeparator` defaults
  to `:`; `segmentTerminator` defaults to `~`. Override for trading-
  partner companion-guide requirements (e.g. Medicare uses `:` component,
  BCBS some shapes use `\\`).
- `interchangeControlNumber` is the 9-character ISA-13 value (zero-
  padded if needed). `groupControlNumber` is the GS-06 numeric string
  (1 to 9 digits). `transactionSetControlNumber` is the ST-02 string (4 to 9
  digits per X12 .5).

#### Properties

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

##### groupResponsibleAgency?

> `readonly` `optional` **groupResponsibleAgency?**: `string`

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

##### interchangeDate

> `readonly` **interchangeDate**: `string`

##### interchangeTime

> `readonly` **interchangeTime**: `string`

##### receiverId

> `readonly` **receiverId**: `string`

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

##### senderId

> `readonly` **senderId**: `string`

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `"P"` \| `"T"`

***

### Build999FunctionalGroupSpec

Functional-group response spec - input for the AK1 + AK9 pair.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode)

##### functionalIdCode

> `readonly` **functionalIdCode**: `string`

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

##### numberOfAcceptedTransactionSets

> `readonly` **numberOfAcceptedTransactionSets**: `number`

##### numberOfReceivedTransactionSets

> `readonly` **numberOfReceivedTransactionSets**: `number`

##### numberOfTransactionSets

> `readonly` **numberOfTransactionSets**: `number`

##### syntaxErrorCodes?

> `readonly` `optional` **syntaxErrorCodes?**: readonly `string`[]

##### transactionResponses

> `readonly` **transactionResponses**: readonly [`Build999TransactionResponseSpec`](#build999transactionresponsespec)[]

##### versionRelease

> `readonly` **versionRelease**: `string`

***

### Build999SegmentErrorSpec

Segment-level error spec - input for an IK3 (with optional nested IK4s).

#### Properties

##### contexts?

> `readonly` `optional` **contexts?**: readonly `string`[]

Optional CTX context strings emitted between this IK3 and the first
nested IK4 (or the next IK3 / IK5 if no IK4s). Each entry becomes a
single CTX segment with the given value as its first composite
element.

##### elementErrors?

> `readonly` `optional` **elementErrors?**: readonly [`Build999ElementErrorSpec`](#build999elementerrorspec)[]

##### loopIdentifier?

> `readonly` `optional` **loopIdentifier?**: `string`

##### segmentIdCode

> `readonly` **segmentIdCode**: `string`

##### segmentPositionInTransactionSet

> `readonly` **segmentPositionInTransactionSet**: `number`

##### syntaxErrorCode?

> `readonly` `optional` **syntaxErrorCode?**: [`Ik304Code`](#ik304code)

***

### Build999Spec

Top-level spec for `build999`.

#### Properties

##### envelope

> `readonly` **envelope**: [`Build999EnvelopeSpec`](#build999envelopespec)

##### functionalGroup

> `readonly` **functionalGroup**: [`Build999FunctionalGroupSpec`](#build999functionalgroupspec)

***

### Build999TransactionResponseSpec

Transaction-set response spec - input for one AK2..IK5 block.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode)

##### implementationConventionReference?

> `readonly` `optional` **implementationConventionReference?**: `string`

##### segmentErrors?

> `readonly` `optional` **segmentErrors?**: readonly [`Build999SegmentErrorSpec`](#build999segmenterrorspec)[]

##### syntaxErrorCodes?

> `readonly` `optional` **syntaxErrorCodes?**: readonly `string`[]

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

##### transactionSetIdCode

> `readonly` **transactionSetIdCode**: `string`

***

### BuildTA1Options

Options accepted by [buildTA1](#buildta1): the delimiter set the returned
segment will be read against. Every field is optional and defaults to the
cosyte parser archetype (`*` element, `^` repetition, `:` component, `~`
segment), which is the same four `build999` takes on
"./types.js".Build999EnvelopeSpec.

**The three non-element fields exist for ESCAPING and nothing else.**
`buildTA1` still emits no segment terminator, no repetition and no
composite. It has to know them because a caller value carrying one of
them has to be released, and because escaping a byte that is NOT a
delimiter where the segment lands corrupts the value: `unescapeRelease`
preserves `?X` verbatim for any `X` outside the declared set, so a value
released against a guessed delimiter comes back carrying a stray `?`.
**If you embed a TA1 in an envelope whose delimiters are not the
archetype, state them here** - the defaults are an assumption this
function cannot verify, exactly as they were before it escaped anything.

#### Properties

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

***

### BuildTA1Spec

Top-level spec for `buildTA1`.

#### Properties

##### ackCode

> `readonly` **ackCode**: [`Ta1AckCode`](#ta1ackcode)

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

##### interchangeDate

> `readonly` **interchangeDate**: `string`

##### interchangeTime

> `readonly` **interchangeTime**: `string`

##### noteCode

> `readonly` **noteCode**: [`Ta1NoteCode`](#ta1notecode)

***

### CodeListEntry

One entry returned from a code-list `lookup(code)`. The inbound code
value is echoed verbatim (so a caller that branches on `entry.code` is
comparing exactly the bytes that came in, never a normalized form);
`description` is the bundled human-readable text from the snapshot.
Snapshots ship the code and description only; fields such as `isObsolete`
and `replacedBy` are not carried.

`dates` is present only on the snapshots that carry per-code dates (CARC and
RARC today) and only for a code that HAS one there, so an entry from a
snapshot without them keeps exactly the two properties it has always had.
Reading a description has never meant the code was valid on any particular
day; [CodeValidityResult](#codevalidityresult) is where that question is answered.

#### Example

```ts
import { lookupCarc } from "@cosyte/x12";
const entry = lookupCarc("45");
entry?.code;          // "45"
entry?.description;   // "Charge exceeds fee schedule/maximum allowable..."
entry?.dates?.start;  // "1995-01-01"
```

#### Properties

##### code

> `readonly` **code**: `string`

##### dates?

> `readonly` `optional` **dates?**: [`CodeListEntryDates`](#codelistentrydates-1)

##### description

> `readonly` **description**: `string`

***

### CodeListEntryDates

The dates a code-list maintainer publishes for ONE code, as ISO-8601
calendar days in `YYYY-MM-DD` form. `start` is the first day the code was
valid, `stop` the FIRST day it is no longer valid (the interval is
half-open, and `KNOWN-LIMITATIONS.md` records why this package reads the
published Stop date that way), and `lastModified` the day its description
last changed.

Each is absent when the maintainer publishes no such date for that code. An
absent `start` is the one that matters: validity on a supplied day cannot be
decided without it, and the answer is `indeterminate` rather than either
verdict.

#### Example

```ts
import { CARC } from "@cosyte/x12";
CARC.dates["1"]?.start;  // "1995-01-01"
CARC.dates["15"]?.stop;  // "2018-05-01" (deactivated code)
CARC.dates["1"]?.stop;   // undefined (still current)
```

#### Properties

##### lastModified?

> `readonly` `optional` **lastModified?**: `string`

##### start?

> `readonly` `optional` **start?**: `string`

##### stop?

> `readonly` `optional` **stop?**: `string`

***

### CodeListMeta

Metadata header attached to every bundled code-list snapshot. Surfaces
the snapshot's identity + provenance + freshness so consumers can
decide whether a stale description matters for their use case, and its
maintaining organisation + redistribution record so they can decide
whether displaying, caching or re-publishing a description is theirs to
do. Those last two are SEPARATE readings: who keeps the list and what
may be done with its text are different questions with different
answers, and the bundled lists really do disagree on both.

#### Example

```ts
import { CARC } from "@cosyte/x12";
CARC.meta.id;                        // "CARC"
CARC.meta.snapshotDate;              // ISO date string this snapshot was captured
CARC.meta.publishedDate;             // ISO date string of the underlying publication
CARC.meta.maintainingOrganization;   // "ASC X12"
CARC.meta.redistribution?.status;    // "licence-required"
CARC.meta.completeness;              // "cited-subset"
```

#### Extended by

- [`DatedCodeListMeta`](#datedcodelistmeta)

#### Properties

##### completeness

> `readonly` **completeness**: [`CodeListCompleteness`](#codelistcompleteness)

Whether `codes` is the complete published list or a cited part of it, so a
code this package does not know can be told from a code the publisher
never issued.

##### description

> `readonly` **description**: `string`

##### id

> `readonly` **id**: `string`

##### maintainingOrganization

> `readonly` **maintainingOrganization**: `string` \| `undefined`

Who maintains the published list, read off a source carried for this
package. `undefined` means the list carries NO maintainer at all, which
snapshot validation refuses rather than tolerates: a list nobody is
recorded as maintaining is a list nobody can be asked about.

##### note?

> `readonly` `optional` **note?**: `string`

##### publishedDate

> `readonly` **publishedDate**: `string`

##### redistribution

> `readonly` **redistribution**: [`CodeListRedistribution`](#codelistredistribution) \| `undefined`

What may be done with this list's descriptions, and whom to approach
where the answer is not "anything". `undefined` means the list carries no
record at all, which snapshot validation refuses. An unsettled question
is recorded as `status: "not-established"` instead, which IS a record.

##### snapshotDate

> `readonly` **snapshotDate**: `string`

##### source

> `readonly` **source**: `string`

***

### CodeListRedistribution

A bundled list's redistribution record: the status, the terms it was read
off, and the party who must be approached where the descriptions are not
free to redistribute.

`approach` is `undefined` only where nobody needs to be asked, which is to
say only where `status` is `"permitted"`.

#### Example

```ts
import { CARC } from "@cosyte/x12";
CARC.meta.redistribution?.approach; // names ASC X12 and its licensing page
```

#### Properties

##### approach

> `readonly` **approach**: `string` \| `undefined`

The licensor to approach, or `undefined` where none need be.

##### status

> `readonly` **status**: [`CodeListRedistributionStatus`](#codelistredistributionstatus-1)

What the evidence establishes, or that it establishes nothing.

##### terms

> `readonly` **terms**: `string`

The terms, quoted or cited from the source that carries them.

***

### CodeListSnapshot

A complete bundled code-list snapshot. `meta` carries provenance;
`codes` is a frozen plain object so consumers can iterate or build their
own lookups without going through the helper. Internal use prefers the
per-snapshot `lookup*` helpers - they return a frozen [CodeListEntry](#codelistentry) ergonomic for the helper APIs.

#### Example

```ts
import { CARC } from "@cosyte/x12";
Object.keys(CARC.codes).length;        // count of bundled CARC codes
CARC.codes["45"];                      // raw description string (or undefined)
```

#### Extended by

- [`DatedCodeListSnapshot`](#datedcodelistsnapshot)

#### Properties

##### codes

> `readonly` **codes**: `Readonly`\<`Record`\<`string`, `string`\>\>

##### meta

> `readonly` **meta**: [`CodeListMeta`](#codelistmeta)

***

### CodeValidityResult

The answer to "was this code valid on the day this document was produced".

`code` is the inbound value byte for byte, exactly as the lookup helpers echo
it, so a code outside the bundled subset is never lost on the way through.
`description` is `undefined` for such a code: an absent code gets no
description and no validity claim, only its own bytes back.

#### Example

```ts
import { checkRarcValidity } from "@cosyte/x12";
const answer = checkRarcValidity("N4", "20260627");
answer.code;         // "N4"
answer.documentDate; // "2026-06-27" (normalised from the wire form)
answer.validity;     // "valid"
answer.reason;       // undefined
```

#### Properties

##### code

> `readonly` **code**: `string`

The inbound code, byte for byte as it was supplied.

##### dates

> `readonly` **dates**: [`CodeListEntryDates`](#codelistentrydates-1) \| `undefined`

The maintainer's dates for this code, where the snapshot has them.

##### description

> `readonly` **description**: `string` \| `undefined`

The bundled description, or `undefined` outside the bundled subset.

##### documentDate

> `readonly` **documentDate**: `string`

The supplied document date, normalised to `YYYY-MM-DD`.

##### reason

> `readonly` **reason**: [`CodeValidityReason`](#codevalidityreason) \| `undefined`

Why the answer is `indeterminate`; `undefined` for the other two.

##### validity

> `readonly` **validity**: [`CodeValidity`](#codevalidity)

`valid`, `not-valid` or `indeterminate`.

***

### CoreCodeCombinationQuery

The input to [checkCoreCodeCombination](#checkcorecodecombination). `adjustment` and `remarks`
take the decoded `X12RemitAdjustment` and `X12RemitRemark` as `get835`
returns them, or any object carrying the same fields.

The 835 carries remarks per claim and per service line rather than per
adjustment, so which remarks accompany an adjustment is the caller's
choice; pass none to judge the group and reason pair alone.

#### Example

```ts
import type { CoreCodeCombinationQuery } from "@cosyte/x12";
const query: CoreCodeCombinationQuery = {
  table,
  scenario: "scenario-3",
  adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
  remarks: [{ system: "HE", code: "ZZ-R1" }],
};
```

#### Properties

##### adjustment

> `readonly` **adjustment**: `Pick`\<[`X12RemitAdjustment`](#x12remitadjustment), `"groupCode"` \| `"reasonCode"`\>

##### remarks?

> `readonly` `optional` **remarks?**: readonly `Pick`\<[`X12RemitRemark`](#x12remitremark), `"system"` \| `"code"`\>[]

The remarks that accompany the adjustment. Absent means none.

##### scenario

> `readonly` **scenario**: [`CoreBusinessScenario`](#corebusinessscenario)

##### table?

> `readonly` `optional` **table?**: [`CoreCodeCombinationTable`](#corecodecombinationtable)

The caller's table. Absent means no table: the answer is `unevaluated`.

***

### CoreCodeCombinationRow

One row of a [CoreCodeCombinationTable](#corecodecombinationtable): one scenario, one group
code, one reason code and at most one remark code. A row with no
`remarkCode` lists the group and reason pair alone; the table lists a pair
with several remark codes as several rows. Every code is compared exactly
as written here: no case folding and no trimming.

#### Example

```ts
import type { CoreCodeCombinationRow } from "@cosyte/x12";
const row: CoreCodeCombinationRow = {
  scenario: "scenario-3",
  groupCode: "CO",
  reasonCode: "ZZ901",
  remarkCode: "ZZ-R1",
};
```

#### Properties

##### groupCode

> `readonly` **groupCode**: `string`

The Claim Adjustment Group Code (CAS-01): a non-empty string.

##### reasonCode

> `readonly` **reasonCode**: `string`

The Claim Adjustment Reason Code: a non-empty string.

##### remarkCode?

> `readonly` `optional` **remarkCode?**: `string`

One Remittance Advice Remark Code, or absent for the pair alone.

##### scenario

> `readonly` **scenario**: [`CoreBusinessScenario`](#corebusinessscenario)

***

### CoreCodeCombinationTable

A combination table the CALLER supplies, typically transcribed from the
CORE Code Combinations version its posting system follows. `version` is a
label of the caller's own choosing (such as the published version it
transcribed) and comes back unchanged beside every answer given against
this table. A table with no version label is refused.

#### Example

```ts
import type { CoreCodeCombinationTable } from "@cosyte/x12";
const table: CoreCodeCombinationTable = {
  version: "my-transcription-2026-02",
  rows: [
    { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901" },
    { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R1" },
  ],
};
```

#### Properties

##### rows

> `readonly` **rows**: readonly [`CoreCodeCombinationRow`](#corecodecombinationrow)[]

##### version

> `readonly` **version**: `string`

The caller's label for this table's version: a non-empty string.

***

### DatedCodeListMeta

Provenance for a snapshot that ALSO carries per-code validity dates. The two
new fields are deliberately separate from `publishedDate` and
`snapshotDate`: those describe the DESCRIPTIONS this package bundled, and a
consumer has to be able to tell how fresh the validity data is without
inferring it from how fresh the descriptions are. The two are captured from
different pages on different days and neither implies the other.

#### Example

```ts
import { CARC } from "@cosyte/x12";
CARC.meta.snapshotDate;      // when the descriptions were captured
CARC.meta.datesCapturedAt;   // when the per-code validity dates were captured
CARC.meta.datesSource;       // the maintainer page they were read from
```

#### Extends

- [`CodeListMeta`](#codelistmeta)

#### Properties

##### completeness

> `readonly` **completeness**: [`CodeListCompleteness`](#codelistcompleteness)

Whether `codes` is the complete published list or a cited part of it, so a
code this package does not know can be told from a code the publisher
never issued.

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`completeness`](#completeness)

##### datesCapturedAt

> `readonly` **datesCapturedAt**: `string`

The day the per-code dates below were read off the maintainer page.

##### datesSource

> `readonly` **datesSource**: `string`

The maintainer page URL those dates were read from.

##### description

> `readonly` **description**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`description`](#description-16)

##### id

> `readonly` **id**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`id`](#id-1)

##### maintainingOrganization

> `readonly` **maintainingOrganization**: `string` \| `undefined`

Who maintains the published list, read off a source carried for this
package. `undefined` means the list carries NO maintainer at all, which
snapshot validation refuses rather than tolerates: a list nobody is
recorded as maintaining is a list nobody can be asked about.

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`maintainingOrganization`](#maintainingorganization-1)

##### note?

> `readonly` `optional` **note?**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`note`](#note)

##### publishedDate

> `readonly` **publishedDate**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`publishedDate`](#publisheddate)

##### redistribution

> `readonly` **redistribution**: [`CodeListRedistribution`](#codelistredistribution) \| `undefined`

What may be done with this list's descriptions, and whom to approach
where the answer is not "anything". `undefined` means the list carries no
record at all, which snapshot validation refuses. An unsettled question
is recorded as `status: "not-established"` instead, which IS a record.

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`redistribution`](#redistribution)

##### snapshotDate

> `readonly` **snapshotDate**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`snapshotDate`](#snapshotdate-1)

##### source

> `readonly` **source**: `string`

###### Inherited from

[`CodeListMeta`](#codelistmeta).[`source`](#source-1)

***

### DatedCodeListSnapshot

A bundled snapshot that carries the maintainer's per-code validity dates
beside the descriptions. `dates` is keyed by the same code strings as
`codes`, and a code may be present in `codes` while absent from `dates`:
that means no date was published for it, never that it has none.

#### Example

```ts
import { RARC } from "@cosyte/x12";
RARC.codes["N4"];          // the bundled description
RARC.dates["N4"]?.start;   // "2000-01-01"
```

#### Extends

- [`CodeListSnapshot`](#codelistsnapshot)

#### Properties

##### codes

> `readonly` **codes**: `Readonly`\<`Record`\<`string`, `string`\>\>

###### Inherited from

[`CodeListSnapshot`](#codelistsnapshot).[`codes`](#codes-3)

##### dates

> `readonly` **dates**: `Readonly`\<`Record`\<`string`, [`CodeListEntryDates`](#codelistentrydates-1)\>\>

##### meta

> `readonly` **meta**: [`DatedCodeListMeta`](#datedcodelistmeta)

###### Overrides

[`CodeListSnapshot`](#codelistsnapshot).[`meta`](#meta-1)

***

### DateParts

The calendar components a value actually stated, and only those.

A component the value did not state is ABSENT: the key is not there at all,
rather than present holding `undefined`. So `Object.keys()` of a result is
exactly the set of stated components and the value's precision is recoverable
from it. `month` is spec-native 1 to 12, never the JavaScript `Date` 0 to 11,
and the names are singular.

Deleting `offsetMinutes` leaves an object `Temporal.PlainDateTime.from` and
luxon's `DateTime.fromObject` both accept with no key rename and no value
adjustment. That compatibility is the reason for this shape. Neither library
is a dependency of this package and neither is used at run time.

The type carries every component the shared shape defines, so the same
declaration serves each `@cosyte/*` parser. From an X12 date element this
package populates `year`, `month` and `day` and nothing else: the two format
qualifiers it decodes are a whole day and a range of whole days, so no value
it reads states a time of day, a fraction of a second or a UTC offset.

#### Example

```ts
import { toObject, type DateParts } from "@cosyte/x12";
const parts: DateParts | undefined = toObject({ formatQualifier: "D8", value: "20260601" });
Object.keys(parts ?? {}); // ["year", "month", "day"]
parts?.month;             // 6, not 5
```

#### Properties

##### day?

> `readonly` `optional` **day?**: `number`

##### hour?

> `readonly` `optional` **hour?**: `number`

##### millisecond?

> `readonly` `optional` **millisecond?**: `number`

##### minute?

> `readonly` `optional` **minute?**: `number`

##### month?

> `readonly` `optional` **month?**: `number`

##### offsetMinutes?

> `readonly` `optional` **offsetMinutes?**: `number`

##### second?

> `readonly` `optional` **second?**: `number`

##### year?

> `readonly` `optional` **year?**: `number`

***

### DefineLoopSpecInput

Input shape accepted by `defineLoopSpec`. `children` is optional;
`LoopSpec.children` always materializes as a frozen `[]` when omitted
so consumer code can iterate without an `?? []` guard.

#### Example

```ts
import type { DefineLoopSpecInput } from "@cosyte/x12";
const input: DefineLoopSpecInput = {
  id: "2110",
  trigger: "SVC",
  segments: [{ id: "SVC", usage: "required", max: 1 }],
};
```

#### Properties

##### children?

> `readonly` `optional` **children?**: readonly [`LoopSpec`](#loopspec)[]

##### description?

> `readonly` `optional` **description?**: `string`

##### id

> `readonly` **id**: `string`

##### segments

> `readonly` **segments**: readonly [`LoopSegmentSpec`](#loopsegmentspec)[]

##### trigger

> `readonly` **trigger**: `string`

***

### Delimiters

The four X12 delimiter classes discovered from fixed byte positions inside
the ISA envelope. The parser detects all four from the ISA itself - they are
NEVER assumed (in particular, `component` is rarely `:` outside Medicare).

- `element` - ISA byte 4 (1-indexed); separates the 16 ISA elements.
- `repetition` - ISA-11 (byte 83, 1-indexed); separates repetitions inside
  an element. Carries the legacy Control Standards Identifier
  (typically `U`) for pre-005010 inputs; the parser surfaces it verbatim.
- `component` - ISA-16 (byte 105, 1-indexed); separates sub-elements of a
  composite. Real-world senders use `:`, `\\`, `^`, `|`, and more.
- `segment` - the byte immediately after ISA-16 (byte 106, 1-indexed);
  terminates each segment. Typically `~`, often followed by optional
  `\r\n` which is silently tolerated.

#### Example

```ts
import type { Delimiters } from "@cosyte/x12";
const medicare: Delimiters = {
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
};
```

#### Properties

##### component

> `readonly` **component**: `string`

##### element

> `readonly` **element**: `string`

##### repetition

> `readonly` **repetition**: `string`

##### segment

> `readonly` **segment**: `string`

***

### FunctionalGroupSpec

A single GS..GE functional group. The builder emits the GS header, each
transaction set, then `GE{count}{control}` with GE-01 (the transaction
count) computed for you.

#### Example

```ts
const group: FunctionalGroupSpec = {
  functionalIdCode: "HC",
  groupControlNumber: "1",
  versionRelease: "005010X222A2",
  transactions: [tx],
};
```

#### Properties

##### applicationReceiverCode?

> `readonly` `optional` **applicationReceiverCode?**: `string`

GS-03 - application receiver code. Defaults to the interchange receiver id.

##### applicationSenderCode?

> `readonly` `optional` **applicationSenderCode?**: `string`

GS-02 - application sender code. Defaults to the interchange sender id.

##### functionalIdCode

> `readonly` **functionalIdCode**: `string`

GS-01 - functional identifier code (`HC` claims, `HP` remittance, …).

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

GS-06 / GE-02 - group control number (echoed on GE-02).

##### groupDate?

> `readonly` `optional` **groupDate?**: `string`

GS-04 - group date CCYYMMDD. Defaults to the century-expanded ISA-09.

##### groupTime?

> `readonly` `optional` **groupTime?**: `string`

GS-05 - group time HHMM. Defaults to the interchange time (ISA-10).

##### responsibleAgencyCode?

> `readonly` `optional` **responsibleAgencyCode?**: `string`

GS-07 - responsible agency code. Defaults to `"X"` (ASC X12).

##### transactions

> `readonly` **transactions**: readonly [`TransactionSetSpec`](#transactionsetspec)[]

The ordered ST..SE transaction sets inside this group.

##### versionRelease

> `readonly` **versionRelease**: `string`

GS-08 - version / release / industry identifier code (e.g. `"005010X222A2"`).

***

### GeSegment

The decoded GE functional group trailer. GE-01 is the transaction count,
which reconciles against the number of ST/SE pairs in the group, and
GE-02 the group control number, which reconciles against GS-06.

`elements` is 1-indexed (`elements[0]` = `"GE"`, `elements[1]` = GE-01,
`elements[2]` = GE-02). **Element values are stored RAW,
pre-`?`-unescape**, so an element is the framed byte text of its slot and
not necessarily the value the sender stated.

#### Example

```ts
import type { GeSegment } from "@cosyte/x12";
declare const ge: GeSegment;
ge.raw;            // verbatim segment text
ge.elements[2];    // raw text of GE-02 (post-element-split, pre-?-unescape)
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### raw

> `readonly` **raw**: `string`

***

### GsSegment

The decoded GS functional group header. GS-01 is the functional ID code
(`HC` for claims, `HP` for remittance, etc.), GS-06 the group control
number, which reconciles against GE-02, and GS-08 the version /
implementation convention reference (e.g. `005010X222A2`).

`elements` is 1-indexed (`elements[0]` = `"GS"`, `elements[1]` = GS-01,
..., `elements[8]` = GS-08). **Element values are stored RAW,
pre-`?`-unescape**, so an element is the framed byte text of its slot and
not necessarily the value the sender stated.

#### Example

```ts
import type { GsSegment } from "@cosyte/x12";
declare const gs: GsSegment;
gs.raw;            // verbatim segment text
gs.elements[6];    // raw text of GS-06 (post-element-split, pre-?-unescape)
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### raw

> `readonly` **raw**: `string`

***

### IeaSegment

The decoded IEA interchange trailer. IEA-01 is the group count and IEA-02
the interchange control number, which the envelope walker reconciles
against ISA-13.

`raw` is the exact segment string (without the segment terminator) and
`elements` is 1-indexed (`elements[0]` = `"IEA"`, `elements[1]` = IEA-01,
`elements[2]` = IEA-02). **Element values are stored RAW,
pre-`?`-unescape**, so an element is the framed byte text of its slot and
not necessarily the value the sender stated.

#### Example

```ts
import type { IeaSegment } from "@cosyte/x12";
declare const iea: IeaSegment;
iea.raw;            // verbatim segment text
iea.elements[2];    // raw text of IEA-02 (post-element-split, pre-?-unescape)
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### raw

> `readonly` **raw**: `string`

***

### InterchangeSpec

The top-level spec for "./build-interchange.js".buildInterchange.
The required fields name the interchange identity; everything else has a
conformant default (`*^:~` delimiters, `ZZ` qualifiers, `P` usage
indicator, `00501` version).

#### Example

```ts
const spec: InterchangeSpec = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "250101",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [group],
};
```

#### Properties

##### componentSeparator?

> `readonly` `optional` **componentSeparator?**: `string`

Component (sub-element) separator (ISA-16). Default `":"`.

##### elementSeparator?

> `readonly` `optional` **elementSeparator?**: `string`

Element separator (ISA byte 4). Default `"*"`.

##### groups

> `readonly` **groups**: readonly [`FunctionalGroupSpec`](#functionalgroupspec)[]

The ordered GS..GE functional groups inside this interchange.

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit).

##### interchangeDate

> `readonly` **interchangeDate**: `string`

ISA-09 - interchange date YYMMDD.

##### interchangeTime

> `readonly` **interchangeTime**: `string`

ISA-10 - interchange time HHMM.

##### receiverId

> `readonly` **receiverId**: `string`

ISA-08 - interchange receiver id (padded to 15 on emit).

##### receiverQualifier?

> `readonly` `optional` **receiverQualifier?**: `string`

ISA-07 - interchange receiver qualifier. Default `"ZZ"`.

##### repetitionSeparator?

> `readonly` `optional` **repetitionSeparator?**: `string`

Repetition separator (ISA-11). Default `"^"`.

##### segmentTerminator?

> `readonly` `optional` **segmentTerminator?**: `string`

Segment terminator (ISA byte 106). Default `"~"`.

##### senderId

> `readonly` **senderId**: `string`

ISA-06 - interchange sender id (padded to 15 on emit).

##### senderQualifier?

> `readonly` `optional` **senderQualifier?**: `string`

ISA-05 - interchange sender qualifier. Default `"ZZ"`.

##### usageIndicator?

> `readonly` `optional` **usageIndicator?**: `string`

ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`.

##### version?

> `readonly` `optional` **version?**: `string`

ISA-12 - interchange control version number. Default `"00501"`.

***

### IsaSegment

The decoded ISA interchange header. ISA-12 is the interchange control
version number, `00501` being the HIPAA-mandated baseline, and ISA-13 the
interchange control number, which the envelope walker reconciles against
IEA-02.

`raw` preserves the exact 106-byte ISA + terminator string from input so
round-trip serialization is byte-exact regardless of any lenient
normalization downstream. `elements` is what splitting that span on the
element separator produced, `elements[0]` being the literal `"ISA"` name
placeholder. **Element values are stored RAW**, so an entry is byte text
and not necessarily the value the sender stated. The 1-indexed mapping onto
ISA-01..ISA-16 holds where that split produced exactly 17 entries;
`X12_ISA_EXTRA_ELEMENT_SEPARATOR` reports where it did not, and `raw`
carries all 106 bytes either way.

#### Example

```ts
import type { IsaSegment } from "@cosyte/x12";
declare const isa: IsaSegment;
isa.raw;             // verbatim 106-byte header
isa.elements[13];    // raw text at index 13 of the ISA split
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### raw

> `readonly` **raw**: `string`

***

### LoopSegmentSpec

A segment slot inside a loop body. Carries the segment id, its TR3
usage + cardinality, and an optional position label (e.g. `"Loop 2300
#2"`) used by loop-walker diagnostics. Stored verbatim by
`defineLoopSpec`; no validation beyond the structural shape so consumers
can author payer-specific segment specs without re-deriving each rule.

#### Example

```ts
import type { LoopSegmentSpec } from "@cosyte/x12";
const clm: LoopSegmentSpec = { id: "CLM", usage: "required", max: 1 };
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

##### id

> `readonly` **id**: `string`

##### max

> `readonly` **max**: [`LoopMax`](#loopmax)

##### position?

> `readonly` `optional` **position?**: `string`

##### usage

> `readonly` **usage**: [`LoopUsage`](#loopusage)

***

### LoopSpec

A declarative loop description used by the transaction extractors
and consumer-authored payer profiles alike. Frozen by `defineLoopSpec`
so a `LoopSpec` is safe to share across calls.

#### Example

```ts
import { defineLoopSpec } from "@cosyte/x12";
const Loop2300 = defineLoopSpec({
  id: "2300",
  description: "837 Claim Information",
  trigger: "CLM",
  segments: [
    { id: "CLM", usage: "required", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "HI",  usage: "situational", max: ">1" },
  ],
});
```

#### Properties

##### children

> `readonly` **children**: readonly [`LoopSpec`](#loopspec)[]

##### description?

> `readonly` `optional` **description?**: `string`

##### id

> `readonly` **id**: `string`

##### segments

> `readonly` **segments**: readonly [`LoopSegmentSpec`](#loopsegmentspec)[]

##### trigger

> `readonly` **trigger**: `string`

***

### SerializeOptions

Options accepted by [serializeX12](#serializex12). Every field is optional;
`serializeX12(ix)` produces the byte-faithful reconstruction with no
reconciliation.

#### Remarks

With `exactOptionalPropertyTypes: true`, do not pass `specClean: undefined`
explicitly - omit the key instead.

#### Example

```ts
import { serializeX12, parseX12 } from "@cosyte/x12";
const ix = parseX12(raw);
// Spec-clean emit that fixes any stale envelope counts:
const out = serializeX12(ix, {
  specClean: true,
  recomputeCounts: true,
  onWarning: (w) => console.warn(w.code, w.message),
});
```

#### Properties

##### onWarning?

> `readonly` `optional` **onWarning?**: [`OnWarningCallback`](#onwarningcallback)

Invoked once per reconciliation warning (spec-clean mode only).

##### recomputeCounts?

> `readonly` `optional` **recomputeCounts?**: `boolean`

Substitute the recomputed SE-01 / GE-01 / IEA-01 counts into the emitted
control segments (only meaningful with `specClean: true`). Default
`false` - the serializer warns on a count mismatch but emits the model's
verbatim value. Control NUMBERS are never rewritten regardless.

##### specClean?

> `readonly` `optional` **specClean?**: `boolean`

Reconcile envelope counts + control-number pairs and surface any
mismatch via [onWarning](#onwarning). Default `false` (pure byte-faithful
reconstruction, no reconciliation, no warnings).

***

### Ta1Segment

A decoded envelope-level TA1 Interchange Acknowledgment segment. TA1 is
NOT a transaction set - per the ASC X12 standard it lives at the envelope
level, between ISA and the first GS, or alone inside an ISA..IEA with no
GS at all (a TA1-only interchange). One interchange may carry multiple
TA1 segments, each acknowledging a prior inbound interchange.

TA1-01 is the interchange control number of the acknowledged interchange
and the reassociation key. TA1-02 and TA1-03 are
its interchange date (YYMMDD) and time (HHMM). TA1-04 is the Interchange
Acknowledgment Code, code list I13 (`A` accepted, `E` accepted with
errors, `R` rejected), and TA1-05 the Interchange Note Code, code list
I18.

`elements` is 1-indexed (`elements[0]` = `"TA1"`, `elements[1]` = TA1-01,
..., `elements[5]` = TA1-05). **Element values are stored RAW,
pre-`?`-unescape**, so an element is the framed byte text of its slot and
not necessarily the value the sender stated.

The envelope walker captures TA1 segments here verbatim; the
typed-ack model is built on top by `parseTA1`, whose five decoded fields
are POST-`?`-unescape. `parseTA1` decodes the FIRST TA1 on an
interchange, so on a multi-TA1 inbound it does not necessarily describe
the segment you are holding. TA1 contains only structural control /
disposition codes - by spec it carries NO PHI.

#### Example

```ts
import type { Ta1Segment } from "@cosyte/x12";
declare const ta1: Ta1Segment;
ta1.raw;            // verbatim segment text
ta1.elements[1];    // raw text of TA1-01 (post-element-split, pre-?-unescape)
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### raw

> `readonly` **raw**: `string`

***

### ToDateOptions

The one option [toDate](#todate) takes, and the only way a zone reaches it.

`assumeOffsetMinutes` is signed minutes east of UTC, so `0` means "treat this
calendar day as UTC" and `-300` means UTC-5. It is the caller stating a fact
this library does not have; without it there is no instant to return.

#### Example

```ts
import { toDate, type ToDateOptions } from "@cosyte/x12";
const easternStandard: ToDateOptions = { assumeOffsetMinutes: -300 };
toDate({ formatQualifier: "D8", value: "20260601" }, easternStandard);
// 2026-06-01T05:00:00.000Z
```

#### Properties

##### assumeOffsetMinutes?

> `readonly` `optional` **assumeOffsetMinutes?**: `number`

***

### TransactionSetSpec

A single ST..SE transaction set. The builder emits `ST{idCode}{control}`,
then each body [SegmentSpec](#segmentspec), then `SE{count}{control}` with the
segment count (ST..SE inclusive) computed for you.

#### Example

```ts
const tx: TransactionSetSpec = {
  transactionSetIdCode: "837",
  transactionSetControlNumber: "0001",
  implementationConventionReference: "005010X222A2",
  segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
};
```

#### Properties

##### implementationConventionReference?

> `readonly` `optional` **implementationConventionReference?**: `string`

ST-03 - implementation convention reference (optional, e.g. `"005010X222A2"`).

##### segments

> `readonly` **segments**: readonly [`SegmentSpec`](#segmentspec)[]

Body segments between ST and SE (excludes ST and SE themselves).

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

ST-02 / SE-02 - transaction set control number (echoed on SE-02).

##### transactionSetIdCode

> `readonly` **transactionSetIdCode**: `string`

ST-01 - transaction set ID code (e.g. `"837"`, `"835"`, `"271"`).

***

### X12\_837ServiceLineDental

837D service line (SV3). Dental lines carry the ADA-coded procedure
(qualifier `AD`, CDT code) plus optional tooth + surface detail
captured on the per-line TOO segments (Loop 2400 in X224A2).

#### Example

```ts
import type { X12_837ServiceLineDental } from "@cosyte/x12";
declare const sl: X12_837ServiceLineDental;
sl.procedureQualifier;     // "AD"
sl.procedureCode;          // "D2391" composite resin
sl.charge.toString();      // "180.00"
sl.toothInformation[0]?.toothCode;       // "14"
sl.toothInformation[0]?.surfaces;         // ["O"]
```

#### Extends

- `X12_837ServiceLineBase`

#### Properties

##### adjudications

> `readonly` **adjudications**: readonly [`X12LineAdjudication`](#x12lineadjudication)[]

###### Inherited from

`X12_837ServiceLineBase.adjudications`

##### amounts

> `readonly` **amounts**: readonly [`X12ClaimAmount`](#x12claimamount)[]

###### Inherited from

`X12_837ServiceLineBase.amounts`

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's charge - SV1-02 (professional), SV2-03
(institutional) or SV3-02 (dental). `undefined` where this library
decoded no value from that element: it was absent or empty, it held
bytes that do not decode as a decimal (which also emits
`X12_UNPARSEABLE_DECIMAL`), or no SVx for the resolved variant was
decoded onto the line at all (which emits
`X12_837_SERVICE_LINE_NOT_DECODED` at the LX). Through `0.0.12` all
three read `X12Decimal.ZERO`, and a consumer could not tell any of them
from a line the sender charged nothing for.

###### Inherited from

`X12_837ServiceLineBase.charge`

##### dates

> `readonly` **dates**: readonly [`X12ClaimDate`](#x12claimdate)[]

###### Inherited from

`X12_837ServiceLineBase.dates`

##### drug

> `readonly` **drug**: [`X12LineDrug`](#x12linedrug) \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.drug`

##### lineNumber

> `readonly` **lineNumber**: `string`

###### Inherited from

`X12_837ServiceLineBase.lineNumber`

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

##### notes

> `readonly` **notes**: readonly [`X12ClaimNote`](#x12claimnote)[]

###### Inherited from

`X12_837ServiceLineBase.notes`

##### oralCavityArea

> `readonly` **oralCavityArea**: readonly `string`[]

##### placeOfServiceCode

> `readonly` **placeOfServiceCode**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.placeOfServiceCode`

##### procedureCode

> `readonly` **procedureCode**: `string`

##### procedureQualifier

> `readonly` **procedureQualifier**: `string`

##### prosthesisCrownInlayCode

> `readonly` **prosthesisCrownInlayCode**: `string` \| `undefined`

##### providers

> `readonly` **providers**: readonly [`X12ClaimEntity`](#x12claimentity)[]

###### Inherited from

`X12_837ServiceLineBase.providers`

##### references

> `readonly` **references**: readonly [`X12ClaimReference`](#x12claimreference)[]

###### Inherited from

`X12_837ServiceLineBase.references`

##### toothInformation

> `readonly` **toothInformation**: readonly [`X12ToothInformation`](#x12toothinformation)[]

##### unitOfMeasure

> `readonly` **unitOfMeasure**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.unitOfMeasure`

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's unit count - SV1-04 (professional), SV2-05
(institutional) or SV3-06 (dental). `undefined` on the same three
conditions as [X12\_837ServiceLineBase.charge](#charge-4), and for the same
reason: a fabricated count is a count the sender never sent.

###### Inherited from

`X12_837ServiceLineBase.units`

##### variant

> `readonly` **variant**: `"D"`

***

### X12\_837ServiceLineInstitutional

837I service line (SV2). Institutional lines lead with a `revenueCode`
(SV2-01, NUBC 4-digit revenue code - what *kind* of service this is);
the procedure code (HCPCS) and modifiers in SV2-02 are situational.
`nonCoveredCharge` (SV2-07) is the portion of the line the provider
has marked as not covered before the payer adjudicates.

#### Example

```ts
import type { X12_837ServiceLineInstitutional } from "@cosyte/x12";
declare const sl: X12_837ServiceLineInstitutional;
sl.revenueCode;                 // "0260" IV therapy
sl.procedureCode;               // "J7030"
sl.charge.toString();           // "780.00"
sl.nonCoveredCharge?.toString();// "0.00"
```

#### Extends

- `X12_837ServiceLineBase`

#### Properties

##### adjudications

> `readonly` **adjudications**: readonly [`X12LineAdjudication`](#x12lineadjudication)[]

###### Inherited from

`X12_837ServiceLineBase.adjudications`

##### amounts

> `readonly` **amounts**: readonly [`X12ClaimAmount`](#x12claimamount)[]

###### Inherited from

`X12_837ServiceLineBase.amounts`

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's charge - SV1-02 (professional), SV2-03
(institutional) or SV3-02 (dental). `undefined` where this library
decoded no value from that element: it was absent or empty, it held
bytes that do not decode as a decimal (which also emits
`X12_UNPARSEABLE_DECIMAL`), or no SVx for the resolved variant was
decoded onto the line at all (which emits
`X12_837_SERVICE_LINE_NOT_DECODED` at the LX). Through `0.0.12` all
three read `X12Decimal.ZERO`, and a consumer could not tell any of them
from a line the sender charged nothing for.

###### Inherited from

`X12_837ServiceLineBase.charge`

##### dates

> `readonly` **dates**: readonly [`X12ClaimDate`](#x12claimdate)[]

###### Inherited from

`X12_837ServiceLineBase.dates`

##### drug

> `readonly` **drug**: [`X12LineDrug`](#x12linedrug) \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.drug`

##### lineNumber

> `readonly` **lineNumber**: `string`

###### Inherited from

`X12_837ServiceLineBase.lineNumber`

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

##### nonCoveredCharge

> `readonly` **nonCoveredCharge**: [`X12Decimal`](#x12decimal) \| `undefined`

##### notes

> `readonly` **notes**: readonly [`X12ClaimNote`](#x12claimnote)[]

###### Inherited from

`X12_837ServiceLineBase.notes`

##### placeOfServiceCode

> `readonly` **placeOfServiceCode**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.placeOfServiceCode`

##### procedureCode

> `readonly` **procedureCode**: `string` \| `undefined`

##### procedureQualifier

> `readonly` **procedureQualifier**: `string` \| `undefined`

##### providers

> `readonly` **providers**: readonly [`X12ClaimEntity`](#x12claimentity)[]

###### Inherited from

`X12_837ServiceLineBase.providers`

##### references

> `readonly` **references**: readonly [`X12ClaimReference`](#x12claimreference)[]

###### Inherited from

`X12_837ServiceLineBase.references`

##### revenueCode

> `readonly` **revenueCode**: `string`

##### serviceLineRate

> `readonly` **serviceLineRate**: [`X12Decimal`](#x12decimal) \| `undefined`

##### unitOfMeasure

> `readonly` **unitOfMeasure**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.unitOfMeasure`

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's unit count - SV1-04 (professional), SV2-05
(institutional) or SV3-06 (dental). `undefined` on the same three
conditions as [X12\_837ServiceLineBase.charge](#charge-4), and for the same
reason: a fabricated count is a count the sender never sent.

###### Inherited from

`X12_837ServiceLineBase.units`

##### variant

> `readonly` **variant**: `"I"`

***

### X12\_837ServiceLineProfessional

837P service line (SV1). `procedureQualifier` is the HCPCS / CPT
qualifier (typically `HC` for HCPCS / CPT-4; `ER` jurisdiction-specific
procedure code; `IV` HIPPS-based rate code); `procedureCode` is the
verbatim code; `modifiers` are the 1-4 procedure modifiers from
SV1-01-3 through SV1-01-6 (e.g. `25`, `59`, `LT`, `RT`).

`diagnosisPointers` carry up to 4 pointers (SV1-07's composite of
positional indexes into the claim's HI diagnoses). The pointer `"1"`
refers to the first principal-diagnosis HI composite, `"2"` the second,
etc.; verbatim string preserved.

#### Example

```ts
import type { X12_837ServiceLineProfessional } from "@cosyte/x12";
declare const sl: X12_837ServiceLineProfessional;
sl.procedureQualifier;     // "HC"
sl.procedureCode;          // "99213"
sl.modifiers;              // ["25"]
sl.diagnosisPointers;      // ["1"]
sl.placeOfServiceCode;     // "11" office (overrides claim-level)
sl.charge.toString();      // "150.00"
```

#### Extends

- `X12_837ServiceLineBase`

#### Properties

##### adjudications

> `readonly` **adjudications**: readonly [`X12LineAdjudication`](#x12lineadjudication)[]

###### Inherited from

`X12_837ServiceLineBase.adjudications`

##### amounts

> `readonly` **amounts**: readonly [`X12ClaimAmount`](#x12claimamount)[]

###### Inherited from

`X12_837ServiceLineBase.amounts`

##### charge

> `readonly` **charge**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's charge - SV1-02 (professional), SV2-03
(institutional) or SV3-02 (dental). `undefined` where this library
decoded no value from that element: it was absent or empty, it held
bytes that do not decode as a decimal (which also emits
`X12_UNPARSEABLE_DECIMAL`), or no SVx for the resolved variant was
decoded onto the line at all (which emits
`X12_837_SERVICE_LINE_NOT_DECODED` at the LX). Through `0.0.12` all
three read `X12Decimal.ZERO`, and a consumer could not tell any of them
from a line the sender charged nothing for.

###### Inherited from

`X12_837ServiceLineBase.charge`

##### dates

> `readonly` **dates**: readonly [`X12ClaimDate`](#x12claimdate)[]

###### Inherited from

`X12_837ServiceLineBase.dates`

##### diagnosisPointers

> `readonly` **diagnosisPointers**: readonly `string`[]

##### drug

> `readonly` **drug**: [`X12LineDrug`](#x12linedrug) \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.drug`

##### emergencyIndicator

> `readonly` **emergencyIndicator**: `string` \| `undefined`

##### epsdtIndicator

> `readonly` **epsdtIndicator**: `string` \| `undefined`

##### familyPlanningIndicator

> `readonly` **familyPlanningIndicator**: `string` \| `undefined`

##### lineNumber

> `readonly` **lineNumber**: `string`

###### Inherited from

`X12_837ServiceLineBase.lineNumber`

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

##### notes

> `readonly` **notes**: readonly [`X12ClaimNote`](#x12claimnote)[]

###### Inherited from

`X12_837ServiceLineBase.notes`

##### placeOfServiceCode

> `readonly` **placeOfServiceCode**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.placeOfServiceCode`

##### procedureCode

> `readonly` **procedureCode**: `string`

##### procedureQualifier

> `readonly` **procedureQualifier**: `string`

##### providers

> `readonly` **providers**: readonly [`X12ClaimEntity`](#x12claimentity)[]

###### Inherited from

`X12_837ServiceLineBase.providers`

##### references

> `readonly` **references**: readonly [`X12ClaimReference`](#x12claimreference)[]

###### Inherited from

`X12_837ServiceLineBase.references`

##### unitOfMeasure

> `readonly` **unitOfMeasure**: `string` \| `undefined`

###### Inherited from

`X12_837ServiceLineBase.unitOfMeasure`

##### units

> `readonly` **units**: [`X12Decimal`](#x12decimal) \| `undefined`

The service line's unit count - SV1-04 (professional), SV2-05
(institutional) or SV3-06 (dental). `undefined` on the same three
conditions as [X12\_837ServiceLineBase.charge](#charge-4), and for the same
reason: a fabricated count is a count the sender never sent.

###### Inherited from

`X12_837ServiceLineBase.units`

##### variant

> `readonly` **variant**: `"P"`

***

### X12\_837Submission

The top-level result returned by `get837Claims()`. Carries the submitter
(Loop 1000A) and receiver (Loop 1000B) parties, the HL hierarchy walk
(Loops 2000A/B/C - every HL segment captured with parent-pointer
provenance), every claim payment loop (Loop 2300), and every warning
surfaced during the walk - including the safety-critical
`X12_HL_PARENT_MISMATCH` and `X12_HL_PARENT_LEVEL_INVALID`.

#### Example

```ts
import { parseX12, get837Claims } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
if (tx !== undefined) {
  const sub = get837Claims(ix.delimiters, tx);
  sub?.variant;             // "P" | "I" | "D" | "unknown"
  sub?.claims.length;       // count of CLM segments encountered
  for (const claim of sub?.claims ?? []) {
    claim.totalCharge.toString();
    claim.diagnoses[0]?.codeSystem;  // "ICD-10-CM" etc.
  }
}
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`X12Claim`](#x12claim)[]

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12HierarchicalLevel`](#x12hierarchicallevel)[]

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

##### receiver

> `readonly` **receiver**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### submitter

> `readonly` **submitter**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### variant

> `readonly` **variant**: [`X12Claim837Variant`](#x12claim837variant)

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12AaaCode

One AAA code as it reached the reader: the VERBATIM inbound value, plus the
bundled description where one resolves. `description` is `undefined` for a
code outside the bundled snapshot, and the snapshots ship empty, so today it
is `undefined` for every code. The code itself is never normalised, never
defaulted and never dropped.

#### Example

```ts
import type { X12AaaCode } from "@cosyte/x12";
declare const c: X12AaaCode;
c.code;        // "42", exactly the bytes the payer sent
c.description; // undefined (the bundled snapshot is empty)
```

#### Properties

##### code

> `readonly` **code**: `string`

##### description

> `readonly` **description**: `string` \| `undefined`

***

### X12AaaCondition

One AAA request-validation segment, surfaced on the typed 271 result.

**This is the distinction between "the payer rejected the inquiry" and "the
member has no benefits".** Both used to read as an empty benefit collection;
only the first produces an entry here. The reject reason and follow-up
action codes are the payer's own, echoed verbatim, with a description only
where the bundled snapshot has one.

Only the two code positions are read, because only those two have a recorded
source. Nothing else in the segment is assigned a meaning, and an element
past them raises `X12_271_AAA_SEGMENT_MALFORMED` rather than being read.

#### Example

```ts
import type { X12AaaCondition } from "@cosyte/x12";
declare const c: X12AaaCondition;
c.key.level;                 // "subscriber"
c.rejectReasonCode?.code;    // "42", verbatim
c.followUpActionCode?.code;  // "C", verbatim
c.position.segmentIndex;     // where in the transaction set to read it
```

#### Properties

##### followUpActionCode

> `readonly` **followUpActionCode**: [`X12AaaCode`](#x12aaacode) \| `undefined`

AAA-04, verbatim, or `undefined` where the payer stated none.

##### key

> `readonly` **key**: [`X12AaaConditionKey`](#x12aaaconditionkey-1)

##### position

> `readonly` **position**: [`X12Position`](#x12position)

Where the segment sits, for a consumer reading `tx.segments` beside it.

##### rejectReasonCode

> `readonly` **rejectReasonCode**: [`X12AaaCode`](#x12aaacode) \| `undefined`

AAA-03, verbatim, or `undefined` where the payer stated none.

***

### X12AaaConditionKey

Which loop occurrence an AAA was transmitted under. Three parts, and a
consumer reads all three:

- `level` - the hierarchical level, or `undefined` where no level of a named
  kind encloses the segment. Never guessed.
- `hierarchyId` - the identifier the DOCUMENT assigns that loop (HL-01), as
  [X12Eligibility.hierarchies](#hierarchies-2) reports it, or `undefined` where the
  loop states none. Never synthesised.
- `occurrenceIndex` - the zero-based index of that loop occurrence among the
  occurrences of the SAME level, counted DOCUMENT-WIDE in document order and
  never restarted per enclosing loop. The third dependent loop in a document
  is index 2 whether it is the first dependent of the second subscriber or
  the third dependent of the first. Where `level` is `undefined` the index
  counts within the AAA segments whose level is likewise unknown. It is
  always determinable and is never absent.

A per-parent index is deliberately NOT what this is: it is not unique
document-wide, so it could not stand in for `hierarchyId` where a loop
states none.

#### Example

```ts
import type { X12AaaConditionKey } from "@cosyte/x12";
declare const k: X12AaaConditionKey;
k.level;           // "dependent"
k.hierarchyId;     // "4" (the HL-01 the document assigned)
k.occurrenceIndex; // 1 (the second dependent loop in the document)
```

#### Properties

##### hierarchyId

> `readonly` **hierarchyId**: `string` \| `undefined`

##### level

> `readonly` **level**: [`X12AaaConditionLevel`](#x12aaaconditionlevel) \| `undefined`

##### occurrenceIndex

> `readonly` **occurrenceIndex**: `number`

***

### X12Ack997

The decoded 997 Functional Acknowledgment, returned by `parse997(raw)`.
Read to the ASC X12 base standard: no implementation guide names the 997,
so no declared guide is checked.

Nothing on it is filled in. An absent AK1, AK5 or AK9 reads as
`undefined` and warns (`X12_997_AK1_ABSENT`, `X12_997_AK5_ABSENT`,
`X12_997_AK9_ABSENT`); a disposition outside its code list reads as
`undefined` beside its verbatim `dispositionRaw` and warns
(`X12_997_AK5_DISPOSITION_UNKNOWN`, `X12_997_AK9_DISPOSITION_UNKNOWN`); a
segment the 997 does not allow where it stands is left unread and warns
`X12_997_SEGMENT_OUT_OF_PLACE`, and one it does not define at all (a CTX,
an IK3) warns `X12_997_SEGMENT_NOT_DEFINED`. Envelope-level warnings stay on
`interchange.warnings`. Never throws on a document `parseX12` reads.

#### Properties

##### ak1

> `readonly` **ak1**: [`X12Ack999Ak1`](#x12ack999ak1-1) \| `undefined`

##### ak9

> `readonly` **ak9**: [`X12Ack997Ak9`](#x12ack997ak9-1) \| `undefined`

##### interchange

> `readonly` **interchange**: [`X12Interchange`](#x12interchange)

##### transactionResponses

> `readonly` **transactionResponses**: readonly [`X12Ack997TransactionResponse`](#x12ack997transactionresponse)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12Ack997Ak3

The decoded AK3 data segment note of a 997: the segment of the
acknowledged transaction set the note is about.

- `segmentIdCode` - AK3-01: the segment identifier (e.g. `NM1`).
- `segmentPositionInTransactionSet` - AK3-02: 1-indexed position of the
  segment inside the acknowledged ST..SE.
- `loopIdentifier` - AK3-03: situational; the loop identifier code.
- `syntaxErrorCode` - AK3-04: situational; the segment syntax error code,
  carried verbatim as sent. No code list is bundled for it, so a code is
  never dropped for being one this package does not know.

#### Example

```ts
import type { X12Ack997Ak3 } from "@cosyte/x12";
declare const ak3: X12Ack997Ak3;
ak3.segmentIdCode;   // "NM1"
ak3.syntaxErrorCode; // "8" | undefined
```

#### Properties

##### loopIdentifier

> `readonly` **loopIdentifier**: `string` \| `undefined`

##### segmentIdCode

> `readonly` **segmentIdCode**: `string`

##### segmentPositionInTransactionSet

> `readonly` **segmentPositionInTransactionSet**: `number`

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: `string` \| `undefined`

***

### X12Ack997Ak4

The decoded AK4 data element note of a 997: the element of the segment the
enclosing AK3 names.

- `position` - AK4-01: the element / component / repetition position, the
  same composite the 999's IK4-01 carries.
- `dataElementReferenceNumber` - AK4-02: situational.
- `syntaxErrorCode` - AK4-03: the data element syntax error code, carried
  verbatim as sent; `undefined` only when the sender left it empty.
- `copyOfBadDataElement` - AK4-04: situational; the offending value as
  sent. It can be PHI, so never log it.

#### Example

```ts
import type { X12Ack997Ak4 } from "@cosyte/x12";
declare const ak4: X12Ack997Ak4;
ak4.position.element; // 3
ak4.syntaxErrorCode;  // "7"
```

#### Properties

##### copyOfBadDataElement

> `readonly` **copyOfBadDataElement**: `string` \| `undefined`

##### dataElementReferenceNumber

> `readonly` **dataElementReferenceNumber**: `string` \| `undefined`

##### position

> `readonly` **position**: [`X12Ack999Ik4Position`](#x12ack999ik4position-1)

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: `string` \| `undefined`

***

### X12Ack997Ak5

The decoded AK5 transaction set response trailer of a 997.

- `disposition` - AK5-01 narrowed to code list 717
  ([X12Ack997SetDispositionCode](#x12ack997setdispositioncode)), or `undefined` when the sender
  wrote a code outside it or none. Nothing stands in for it: a reader that
  checks `disposition === "A"` never takes an unread code for an accept.
- `dispositionRaw` - AK5-01 as sent (release escapes resolved), so an
  unknown code survives. `""` when the element is empty or absent.
- `syntaxErrorCodes` - AK5-02..AK5-06, verbatim.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12Ack997SetDispositionCode`](#x12ack997setdispositioncode) \| `undefined`

##### dispositionRaw

> `readonly` **dispositionRaw**: `string`

##### syntaxErrorCodes

> `readonly` **syntaxErrorCodes**: readonly `string`[]

***

### X12Ack997Ak9

The decoded AK9 functional group response trailer of a 997.

- `disposition` - AK9-01 narrowed to code list 715
  ([X12AckDispositionCode](#x12ackdispositioncode)), or `undefined` when the sender wrote a
  code outside it or none.
- `dispositionRaw` - AK9-01 as sent, `""` when empty or absent.
- the three counts - AK9-02, AK9-03 and AK9-04, read as on a 999.
- `syntaxErrorCodes` - AK9-05..AK9-09, verbatim.

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode) \| `undefined`

##### dispositionRaw

> `readonly` **dispositionRaw**: `string`

##### numberOfAcceptedTransactionSets

> `readonly` **numberOfAcceptedTransactionSets**: `number`

##### numberOfReceivedTransactionSets

> `readonly` **numberOfReceivedTransactionSets**: `number`

##### numberOfTransactionSets

> `readonly` **numberOfTransactionSets**: `number`

##### syntaxErrorCodes

> `readonly` **syntaxErrorCodes**: readonly `string`[]

***

### X12Ack997SegmentNote

One AK3 with the AK4 element notes that follow it.

#### Properties

##### ak3

> `readonly` **ak3**: [`X12Ack997Ak3`](#x12ack997ak3)

##### elementNotes

> `readonly` **elementNotes**: readonly [`X12Ack997Ak4`](#x12ack997ak4)[]

***

### X12Ack997TransactionResponse

One AK2..AK5 transaction set response inside a 997. `ak5` is `undefined`
when the response has no AK5, and the reading warns
`X12_997_AK5_ABSENT`.

#### Properties

##### ak2

> `readonly` **ak2**: [`X12Ack999Ak2`](#x12ack999ak2)

##### ak5

> `readonly` **ak5**: [`X12Ack997Ak5`](#x12ack997ak5) \| `undefined`

##### segmentNotes

> `readonly` **segmentNotes**: readonly [`X12Ack997SegmentNote`](#x12ack997segmentnote)[]

***

### X12Ack999

The decoded 999 Implementation Acknowledgment. Returned by
`parse999(raw)`. Carries every loop the wire produced and the underlying
parsed envelope (so byte-exact round-trip is reachable through
`interchange.isa.raw`).

`warnings` carries the 999-specific warnings: the declared-guide check,
`X12_999_IK5_ABSENT` / `X12_999_AK9_ABSENT` where the reader filled in a
reject for a response with no IK5 or a group with no AK9,
`X12_999_IK5_DISPOSITION_UNKNOWN` / `X12_999_AK9_DISPOSITION_UNKNOWN` where
it read a reject for a disposition outside code list 715, and
`X12_999_AK1_ABSENT` where it filled in an empty AK1 for a 999 with none.
Envelope-level warnings stay on `interchange.warnings`. Never throws on a
real-world 999.

#### Properties

##### ak1

> `readonly` **ak1**: [`X12Ack999Ak1`](#x12ack999ak1-1)

##### ak9

> `readonly` **ak9**: [`X12Ack999Ak9`](#x12ack999ak9-1)

##### interchange

> `readonly` **interchange**: [`X12Interchange`](#x12interchange)

##### transactionResponses

> `readonly` **transactionResponses**: readonly [`X12Ack999TransactionResponse`](#x12ack999transactionresponse)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12Ack999Ak1

The decoded AK1 functional group response header (loop 1).

- `functionalIdCode` - AK1-01: echoes the inbound GS-01 (e.g. `HC` for a
  claim group).
- `groupControlNumber` - AK1-02: echoes the inbound GS-06.
- `versionRelease` - AK1-03: echoes the inbound GS-08 (e.g.
  `005010X222A2`). Situational at the standard level, ALWAYS present in
  X231A1; surfaced as `string | undefined` to remain lenient on parse.

#### Example

```ts
import type { X12Ack999Ak1 } from "@cosyte/x12";
declare const ak1: X12Ack999Ak1;
ak1.functionalIdCode; // "HC"
ak1.versionRelease;   // "005010X222A2" | undefined
```

#### Properties

##### functionalIdCode

> `readonly` **functionalIdCode**: `string`

##### groupControlNumber

> `readonly` **groupControlNumber**: `string`

##### versionRelease

> `readonly` **versionRelease**: `string` \| `undefined`

***

### X12Ack999Ak2

The decoded AK2 transaction set response header (loop 2000).

- `transactionSetIdCode` - AK2-01: echoes the inbound ST-01 (e.g. `837`,
  `270`).
- `transactionSetControlNumber` - AK2-02: echoes the inbound ST-02.
- `implementationConventionReference` - AK2-03: echoes the inbound ST-03
  (the TR3 ID, e.g. `005010X222A2`); situational.

#### Example

```ts
import type { X12Ack999Ak2 } from "@cosyte/x12";
declare const ak2: X12Ack999Ak2;
ak2.transactionSetIdCode; // "837"
```

#### Properties

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

##### transactionSetControlNumber

> `readonly` **transactionSetControlNumber**: `string`

##### transactionSetIdCode

> `readonly` **transactionSetIdCode**: `string`

***

### X12Ack999Ak9

The decoded AK9 functional group response trailer.

- `disposition` - AK9-01: functional-group-level disposition.
- `numberOfTransactionSets` - AK9-02: echoes the inbound GE-01.
- `numberOfReceivedTransactionSets` - AK9-03: how many ST..SE pairs
  actually arrived.
- `numberOfAcceptedTransactionSets` - AK9-04: how many were accepted.
  By construction `0 <= accepted <= received <= numberOfTransactionSets`.
- `syntaxErrorCodes` - AK9-05..AK9-09: situational; up to five
  functional-group syntax error codes (code list 716).

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode)

##### numberOfAcceptedTransactionSets

> `readonly` **numberOfAcceptedTransactionSets**: `number`

##### numberOfReceivedTransactionSets

> `readonly` **numberOfReceivedTransactionSets**: `number`

##### numberOfTransactionSets

> `readonly` **numberOfTransactionSets**: `number`

##### syntaxErrorCodes

> `readonly` **syntaxErrorCodes**: readonly `string`[]

***

### X12Ack999ElementNote

One IK4 element-level error wrapped with its (optional) IK3-paired CTX
context strings - surfaced verbatim because CTX uses a composite syntax
the X231A1 implementer typically writes as `ELEMENT*NM1*8*1`. The
library does not try to over-decompose the CTX value.

#### Properties

##### contexts

> `readonly` **contexts**: readonly `string`[]

##### ik4

> `readonly` **ik4**: [`X12Ack999Ik4`](#x12ack999ik4)

***

### X12Ack999Ik3

The decoded IK3 implementation data segment note (loop 2100).

- `segmentIdCode` - IK3-01: the X12 segment identifier (e.g. `NM1`,
  `CLP`, `HL`).
- `segmentPositionInTransactionSet` - IK3-02: 1-indexed position of the
  offending segment inside the inbound ST..SE.
- `loopIdentifier` - IK3-03: situational; the loop identifier
  (e.g. `2010BA`) where the offending segment lives.
- `syntaxErrorCode` - IK3-04: situational; one of
  [Ik304Code](#ik304code). `undefined` when the parent IK3 is purely a
  context wrapper for nested IK4s (the per-element error path).

#### Example

```ts
import type { X12Ack999SegmentNote } from "@cosyte/x12";
declare const note: X12Ack999SegmentNote;
note.ik3.segmentIdCode;                  // "NM1"
note.ik3.segmentPositionInTransactionSet; // 8
```

#### Properties

##### loopIdentifier

> `readonly` **loopIdentifier**: `string` \| `undefined`

##### segmentIdCode

> `readonly` **segmentIdCode**: `string`

##### segmentPositionInTransactionSet

> `readonly` **segmentPositionInTransactionSet**: `number`

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: [`Ik304Code`](#ik304code) \| `undefined`

***

### X12Ack999Ik4

The decoded IK4 implementation data element note (loop 2110).

- `position` - IK4-01: composite carrying element / component /
  repetition (1-indexed).
- `dataElementReferenceNumber` - IK4-02: situational; the ASC X12
  element reference number (e.g. `66` for NM1-08).
- `syntaxErrorCode` - IK4-03: required; one of [Ik403Code](#ik403code).
- `copyOfBadDataElement` - IK4-04: situational; the verbatim offending
  element value. By spec it may be omitted entirely; callers building a
  999 SHOULD omit it whenever the offending bytes are PHI (medical IDs,
  names, dates). The library never auto-populates this field.

#### Example

```ts
import type { X12Ack999ElementNote } from "@cosyte/x12";
declare const note: X12Ack999ElementNote;
note.ik4.syntaxErrorCode; // "7" (invalid code value)
```

#### Properties

##### copyOfBadDataElement

> `readonly` **copyOfBadDataElement**: `string` \| `undefined`

##### dataElementReferenceNumber

> `readonly` **dataElementReferenceNumber**: `string` \| `undefined`

##### position

> `readonly` **position**: [`X12Ack999Ik4Position`](#x12ack999ik4position-1)

##### syntaxErrorCode

> `readonly` **syntaxErrorCode**: [`Ik403Code`](#ik403code)

***

### X12Ack999Ik4Position

Position of an element/component/repetition inside a parent segment for
an IK4 element note. Element is 1-indexed (the TR3 convention);
component and repetition are surfaced exactly as encoded in IK4-01's
composite - see TR3 `005010X231A1` §IK4.

#### Example

```ts
import type { X12Ack999Ik4Position } from "@cosyte/x12";
const pos: X12Ack999Ik4Position = { element: 1, component: 2 };
```

#### Properties

##### component

> `readonly` **component**: `number` \| `undefined`

##### element

> `readonly` **element**: `number`

##### repetition

> `readonly` **repetition**: `number` \| `undefined`

***

### X12Ack999Ik5

The decoded IK5 implementation transaction set response trailer.

- `disposition` - IK5-01: one of [X12AckDispositionCode](#x12ackdispositioncode).
- `syntaxErrorCodes` - IK5-02..IK5-06: situational; up to five
  transaction-set syntax error codes (code list 718).

#### Properties

##### disposition

> `readonly` **disposition**: [`X12AckDispositionCode`](#x12ackdispositioncode)

##### syntaxErrorCodes

> `readonly` **syntaxErrorCodes**: readonly `string`[]

***

### X12Ack999SegmentNote

One IK3 segment-level error wrapped with its (optional) CTX context
strings and any nested IK4 element-level errors. Lifting the IK3 / IK4
groups into nested arrays mirrors the X231A1 loop hierarchy exactly so
the typed model maps 1:1 onto the wire shape.

#### Properties

##### contexts

> `readonly` **contexts**: readonly `string`[]

##### elementNotes

> `readonly` **elementNotes**: readonly [`X12Ack999ElementNote`](#x12ack999elementnote)[]

##### ik3

> `readonly` **ik3**: [`X12Ack999Ik3`](#x12ack999ik3)

***

### X12Ack999TransactionResponse

One AK2..IK5 transaction-set response inside a 999.

#### Properties

##### ak2

> `readonly` **ak2**: [`X12Ack999Ak2`](#x12ack999ak2)

##### ik5

> `readonly` **ik5**: [`X12Ack999Ik5`](#x12ack999ik5)

##### segmentNotes

> `readonly` **segmentNotes**: readonly [`X12Ack999SegmentNote`](#x12ack999segmentnote)[]

***

### X12AckTA1

The decoded TA1 Interchange Acknowledgment.

- `interchangeControlNumber` - TA1-01: echoes the inbound ISA-13.
- `interchangeDate` - TA1-02: YYMMDD (echoes inbound ISA-09).
- `interchangeTime` - TA1-03: HHMM (echoes inbound ISA-10).
- `ackCode` - TA1-04: [Ta1AckCode](#ta1ackcode).
- `noteCode` - TA1-05: typed when the value is a known I18 code
  ([Ta1NoteCode](#ta1notecode)); `noteCodeRaw` carries the un-narrowed string
  alongside so unknown extensions survive. **A clause here said that
  string is preserved VERBATIM and is deleted, not reworded:**
  a later release made it post-unescape, and `raw.elements[5]` is
  the verbatim surface.
- `noteCodeRaw` - the un-narrowed TA1-05 string. Equal to `noteCode` when
  the value is a known I18 code; equal to the decoded inbound text when
  not.
- `raw` - the underlying envelope-level [Ta1Segment](#ta1segment), for
  byte-exact round-trip.

**The five decoded fields are POST-`?`-unescape; `raw` is the verbatim
byte surface and is not.** A later release moved the decoded half:
before it, a released TA1-01 read back carrying its `?` and matched no
ISA-13, while every dot-path read of the same element already unescaped.
Read `raw.elements` when you want the bytes.

#### Example

```ts
import type { X12AckTA1 } from "@cosyte/x12";
declare const ta1: X12AckTA1;
ta1.ackCode;      // "A" | "E" | "R"
ta1.noteCode;     // "000" | "001" | ...
```

#### Properties

##### ackCode

> `readonly` **ackCode**: [`Ta1AckCode`](#ta1ackcode)

##### interchangeControlNumber

> `readonly` **interchangeControlNumber**: `string`

##### interchangeDate

> `readonly` **interchangeDate**: `string`

##### interchangeTime

> `readonly` **interchangeTime**: `string`

##### noteCode

> `readonly` **noteCode**: [`Ta1NoteCode`](#ta1notecode) \| `undefined`

##### noteCodeRaw

> `readonly` **noteCodeRaw**: `string`

##### raw

> `readonly` **raw**: [`Ta1Segment`](#ta1segment)

***

### X12AdditionalInformationRequest

A 277 request for additional information read by
`get277RequestForAdditionalInformation`: the BHT header and every
hierarchical level in document order, each carrying the entities and the
claim-level requests sent under it.

#### Example

```ts
import { parseX12, get277RequestForAdditionalInformation } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions[0];
const rfai = tx === undefined ? undefined : get277RequestForAdditionalInformation(ix.delimiters, tx);
rfai?.transactionType; // "request-for-additional-information"
rfai?.levels[0]?.requests[0]?.statuses[0]?.codes[0]?.codeListQualifier; // "LOI"
```

#### Properties

##### header

> `readonly` **header**: [`X12AdditionalInformationRequestHeader`](#x12additionalinformationrequestheader-1) \| `undefined`

The BHT, or `undefined` where the transaction set carries none.

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

ST-03, decoded of any release escape.

##### levels

> `readonly` **levels**: readonly [`X12AdditionalInformationRequestLevel`](#x12additionalinformationrequestlevel)[]

Every HL, in document order. Empty where the transaction set carries none.

##### transactionType

> `readonly` **transactionType**: `"request-for-additional-information"`

Always `"request-for-additional-information"`. Never a claim status label.

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

Every warning raised while reading, anchored at the segment it concerns.

***

### X12AdditionalInformationRequestAmount

One AMT Monetary Amount Information, the amount exact.

#### Example

```ts
import type { X12AdditionalInformationRequestAmount } from "@cosyte/x12";
declare const a: X12AdditionalInformationRequestAmount;
a.amount?.toString(); // AMT-02, exact
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal) \| `undefined`

AMT-02, the amount; `undefined` where absent or not a decimal.

##### qualifier

> `readonly` **qualifier**: `string` \| `undefined`

AMT-01, amount qualifier code.

***

### X12AdditionalInformationRequestClaim

One claim-level request (the 2200 loop): the TRN that opens it, and the
STC, REF, DTP, QTY and AMT segments and SVC service lines sent under it.
A request opened by an STC or SVC with no TRN before it carries an empty
`traces` list rather than an invented one.

#### Example

```ts
import type { X12AdditionalInformationRequestClaim } from "@cosyte/x12";
declare const r: X12AdditionalInformationRequestClaim;
r.references.find((ref) => ref.qualifier === "1K")?.value; // payer claim control number
r.statuses[0]?.codes[0]?.statusCode;                        // the requested item's code
```

#### Properties

##### amounts

> `readonly` **amounts**: readonly [`X12AdditionalInformationRequestAmount`](#x12additionalinformationrequestamount)[]

Every AMT, in document order.

##### dates

> `readonly` **dates**: readonly [`X12AdditionalInformationRequestDate`](#x12additionalinformationrequestdate)[]

Every claim-level DTP, in document order.

##### quantities

> `readonly` **quantities**: readonly [`X12AdditionalInformationRequestQuantity`](#x12additionalinformationrequestquantity)[]

Every QTY, in document order.

##### references

> `readonly` **references**: readonly [`X12AdditionalInformationRequestReference`](#x12additionalinformationrequestreference)[]

Every claim-level REF, in document order.

##### serviceLines

> `readonly` **serviceLines**: readonly [`X12AdditionalInformationRequestServiceLine`](#x12additionalinformationrequestserviceline)[]

Every SVC service line, in document order.

##### statuses

> `readonly` **statuses**: readonly [`X12AdditionalInformationRequestStatus`](#x12additionalinformationrequeststatus)[]

Every claim-level STC, in document order.

##### traces

> `readonly` **traces**: readonly [`X12AdditionalInformationRequestTrace`](#x12additionalinformationrequesttrace)[]

The TRN that opened this request; empty where an STC or SVC opened it.

***

### X12AdditionalInformationRequestDate

One DTP date or period, verbatim: the value keeps exactly the precision and
format the sender stated, and the format qualifier that says which is carried
beside it. A partial date is never completed.

#### Example

```ts
import type { X12AdditionalInformationRequestDate } from "@cosyte/x12";
declare const d: X12AdditionalInformationRequestDate;
d.formatQualifier; // "RD8"
d.value;           // "20260501-20260502"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string` \| `undefined`

DTP-02, date time period format qualifier.

##### qualifier

> `readonly` **qualifier**: `string` \| `undefined`

DTP-01, date or time qualifier.

##### value

> `readonly` **value**: `string` \| `undefined`

DTP-03, the date or period, as sent.

***

### X12AdditionalInformationRequestEntity

One NM1 Individual or Organizational Name, the elements a party is named and
identified by, verbatim.

#### Example

```ts
import type { X12AdditionalInformationRequestEntity } from "@cosyte/x12";
declare const e: X12AdditionalInformationRequestEntity;
e.entityIdentifierCode; // NM1-01
e.lastOrOrganizationName; // NM1-03
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string` \| `undefined`

NM1-01, entity identifier code.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string` \| `undefined`

NM1-02, entity type qualifier.

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

NM1-04, first name.

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

NM1-09, identification code.

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

NM1-08, identification code qualifier.

##### lastOrOrganizationName

> `readonly` **lastOrOrganizationName**: `string` \| `undefined`

NM1-03, last name or organization name.

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

NM1-05, middle name.

##### namePrefix

> `readonly` **namePrefix**: `string` \| `undefined`

NM1-06, name prefix.

##### nameSuffix

> `readonly` **nameSuffix**: `string` \| `undefined`

NM1-07, name suffix.

***

### X12AdditionalInformationRequestHeader

The BHT Beginning of Hierarchical Transaction, every element verbatim.

#### Example

```ts
import type { X12AdditionalInformationRequestHeader } from "@cosyte/x12";
declare const h: X12AdditionalInformationRequestHeader;
h.referenceId; // BHT-03, as sent
```

#### Properties

##### date

> `readonly` **date**: `string` \| `undefined`

BHT-04, date, as sent.

##### hierarchicalStructureCode

> `readonly` **hierarchicalStructureCode**: `string` \| `undefined`

BHT-01, hierarchical structure code.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

BHT-03, reference identification.

##### time

> `readonly` **time**: `string` \| `undefined`

BHT-05, time, as sent.

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string` \| `undefined`

BHT-02, transaction set purpose code.

##### transactionTypeCode

> `readonly` **transactionTypeCode**: `string` \| `undefined`

BHT-06, transaction type code.

***

### X12AdditionalInformationRequestLevel

One HL hierarchical level, with the NM1 entities of its name loops and the
claim-level requests sent under it. The HL elements are verbatim and are
never re-numbered or re-parented; which level a code names is the sender's,
because no carried source states the guide's level codes.

#### Example

```ts
import type { X12AdditionalInformationRequestLevel } from "@cosyte/x12";
declare const level: X12AdditionalInformationRequestLevel;
level.levelCode;               // HL-03, as sent
level.entities[0]?.idCode;     // NM1-09, as sent
level.requests.length;         // claim-level requests under this level
```

#### Properties

##### childCode

> `readonly` **childCode**: `string` \| `undefined`

HL-04, hierarchical child code.

##### entities

> `readonly` **entities**: readonly [`X12AdditionalInformationRequestEntity`](#x12additionalinformationrequestentity)[]

Every NM1 sent under this level before its first claim-level request.

##### id

> `readonly` **id**: `string` \| `undefined`

HL-01, hierarchical id number.

##### levelCode

> `readonly` **levelCode**: `string` \| `undefined`

HL-03, hierarchical level code.

##### parentId

> `readonly` **parentId**: `string` \| `undefined`

HL-02, hierarchical parent id number.

##### requests

> `readonly` **requests**: readonly [`X12AdditionalInformationRequestClaim`](#x12additionalinformationrequestclaim)[]

Every claim-level request sent under this level, in document order.

***

### X12AdditionalInformationRequestQuantity

One QTY Quantity Information, the quantity exact.

#### Example

```ts
import type { X12AdditionalInformationRequestQuantity } from "@cosyte/x12";
declare const q: X12AdditionalInformationRequestQuantity;
q.quantity?.toString(); // QTY-02, exact
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string` \| `undefined`

QTY-01, quantity qualifier.

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

QTY-02, the quantity; `undefined` where absent or not a decimal.

***

### X12AdditionalInformationRequestReference

One REF Reference Information, verbatim. A REF short of either element is
still carried, with the absent one `undefined`.

#### Example

```ts
import type { X12AdditionalInformationRequestReference } from "@cosyte/x12";
declare const r: X12AdditionalInformationRequestReference;
r.qualifier; // REF-01
r.value;     // REF-02
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

REF-03, description.

##### qualifier

> `readonly` **qualifier**: `string` \| `undefined`

REF-01, reference identification qualifier.

##### value

> `readonly` **value**: `string` \| `undefined`

REF-02, reference identification.

***

### X12AdditionalInformationRequestServiceLine

One SVC service line (the 2220 loop) and the STC, REF and DTP segments sent
under it.

#### Example

```ts
import type { X12AdditionalInformationRequestServiceLine } from "@cosyte/x12";
declare const l: X12AdditionalInformationRequestServiceLine;
l.procedureCode;                // SVC-01-2
l.lineChargeAmount?.toString(); // SVC-02, exact
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12AdditionalInformationRequestDate`](#x12additionalinformationrequestdate)[]

Every DTP sent under this line.

##### lineChargeAmount

> `readonly` **lineChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-02, line charge amount.

##### linePaymentAmount

> `readonly` **linePaymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-03, line payment amount.

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

SVC-01-3 to SVC-01-6, the modifiers present, in order.

##### procedureCode

> `readonly` **procedureCode**: `string` \| `undefined`

SVC-01-2, the procedure or service code.

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-05, quantity.

##### references

> `readonly` **references**: readonly [`X12AdditionalInformationRequestReference`](#x12additionalinformationrequestreference)[]

Every REF sent under this line.

##### revenueCode

> `readonly` **revenueCode**: `string` \| `undefined`

SVC-04, revenue code.

##### serviceIdQualifier

> `readonly` **serviceIdQualifier**: `string` \| `undefined`

SVC-01-1, product or service id qualifier.

##### statuses

> `readonly` **statuses**: readonly [`X12AdditionalInformationRequestStatus`](#x12additionalinformationrequeststatus)[]

Every STC sent under this line.

##### unitsOfService

> `readonly` **unitsOfService**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-07, original units of service count.

***

### X12AdditionalInformationRequestStatus

One STC Status Information segment: its up to three C043 composites
(STC-01, STC-10, STC-11) and its other elements, verbatim.

#### Example

```ts
import type { X12AdditionalInformationRequestStatus } from "@cosyte/x12";
declare const s: X12AdditionalInformationRequestStatus;
s.codes[0]?.categoryCode; // C043-01 of STC-01
s.totalChargeAmount?.toString(); // STC-04, exact
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string` \| `undefined`

STC-03, action code.

##### checkIssueDate

> `readonly` **checkIssueDate**: `string` \| `undefined`

STC-08, check issue date, as sent.

##### checkNumber

> `readonly` **checkNumber**: `string` \| `undefined`

STC-09, check number.

##### codes

> `readonly` **codes**: readonly [`X12AdditionalInformationRequestStatusCode`](#x12additionalinformationrequeststatuscode)[]

The C043 composites present, STC-01 first, then STC-10 and STC-11.

##### message

> `readonly` **message**: `string` \| `undefined`

STC-12, free-form message text.

##### paymentAmount

> `readonly` **paymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

STC-05, amount paid.

##### paymentDate

> `readonly` **paymentDate**: `string` \| `undefined`

STC-06, paid date, as sent.

##### paymentMethodCode

> `readonly` **paymentMethodCode**: `string` \| `undefined`

STC-07, payment method code.

##### statusEffectiveDate

> `readonly` **statusEffectiveDate**: `string` \| `undefined`

STC-02, the status effective date, as sent.

##### totalChargeAmount

> `readonly` **totalChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

STC-04, total charge amount.

***

### X12AdditionalInformationRequestStatusCode

One C043 Health Care Claim Status composite, all four components verbatim.

C043-04 names the code source of C043-02. Where it is non-empty, C043-02 is a
code from that source (a LOINC code naming the attachment requested, say) and
is NOT looked up in the claim status code list, so `statusDescription` is
`undefined` and no unknown-claim-status warning is raised for it. Where it is
empty, C043-02 is a claim status code and is described from the bundled list
when the list has it. C043-01 is always a claim status category code.

#### Example

```ts
import type { X12AdditionalInformationRequestStatusCode } from "@cosyte/x12";
declare const c: X12AdditionalInformationRequestStatusCode;
c.codeListQualifier; // "LOI" where C043-02 is a LOINC code
c.statusDescription; // undefined whenever codeListQualifier is present
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string` \| `undefined`

C043-01, the claim status category code.

##### categoryDescription

> `readonly` **categoryDescription**: `string` \| `undefined`

The bundled description of C043-01, where the list has it.

##### codeListQualifier

> `readonly` **codeListQualifier**: `string` \| `undefined`

C043-04, the code list qualifier naming the source of C043-02.

##### entityCode

> `readonly` **entityCode**: `string` \| `undefined`

C043-03, entity identifier code.

##### statusCode

> `readonly` **statusCode**: `string` \| `undefined`

C043-02, a code from the source C043-04 names, or a claim status code.

##### statusDescription

> `readonly` **statusDescription**: `string` \| `undefined`

The claim status description of C043-02; only where C043-04 is empty.

***

### X12AdditionalInformationRequestTrace

One TRN Trace, verbatim.

#### Example

```ts
import type { X12AdditionalInformationRequestTrace } from "@cosyte/x12";
declare const t: X12AdditionalInformationRequestTrace;
t.referenceId; // TRN-02
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

TRN-03, originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

TRN-02, reference identification.

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

TRN-04, supplemental reference identification.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string` \| `undefined`

TRN-01, trace type code.

***

### X12Attachment

One BDS Binary Data Structure, read as one attachment.

`lengthVerified` is `true` only where the parser framed BDS-03 by a valid
BDS-02 count, the count was met exactly, the segment ended where the count
said, and every character is one octet. Where any of those failed, the
matching binary framing warning is on the reading's `warnings`, anchored at
this BDS, and `lengthVerified` is `false`, so a caller can tell a
length-verified attachment from the others without reading the warnings.
BDS-02 is then still exactly what was sent, and the data is only the octets
that were present.

#### Example

```ts
import type { X12Attachment } from "@cosyte/x12";
declare const a: X12Attachment;
if (a.lengthVerified) a.data.readOctets(); // exactly BDS-02 octets
```

#### Properties

##### data

> `readonly` **data**: [`X12AttachmentData`](#x12attachmentdata)

BDS-03, withheld from printing; `readOctets()` returns it verbatim.

##### declaredLength

> `readonly` **declaredLength**: `string` \| `undefined`

BDS-02, the declared length, exactly as sent.

##### filterCode

> `readonly` **filterCode**: `string` \| `undefined`

BDS-01, the filter id code, as sent. Not applied.

##### lengthVerified

> `readonly` **lengthVerified**: `boolean`

Whether the data's length was verified against BDS-02 with no framing warning.

##### line

> `readonly` **line**: [`X12AttachmentLine`](#x12attachmentline-1) \| `undefined`

The LX line this BDS was sent under, or `undefined` before the first LX.

##### segmentIndex

> `readonly` **segmentIndex**: `number`

Where the BDS sits, transaction-relative, the ST being segment 0.

***

### X12AttachmentBeginning

The heading's BGN Beginning Segment, verbatim.

#### Example

```ts
import type { X12AttachmentBeginning } from "@cosyte/x12";
declare const b: X12AttachmentBeginning;
b.referenceId; // BGN-02
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string` \| `undefined`

BGN-08, action code.

##### date

> `readonly` **date**: `string` \| `undefined`

BGN-03, date, as sent.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

BGN-02, reference identification.

##### secondReferenceId

> `readonly` **secondReferenceId**: `string` \| `undefined`

BGN-06, a second reference identification.

##### securityLevelCode

> `readonly` **securityLevelCode**: `string` \| `undefined`

BGN-09, security level code.

##### time

> `readonly` **time**: `string` \| `undefined`

BGN-04, time, as sent.

##### timeCode

> `readonly` **timeCode**: `string` \| `undefined`

BGN-05, time code.

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string` \| `undefined`

BGN-01, transaction set purpose code.

##### transactionTypeCode

> `readonly` **transactionTypeCode**: `string` \| `undefined`

BGN-07, transaction type code.

***

### X12AttachmentEntity

One NM1 of the heading, verbatim.

#### Example

```ts
import type { X12AttachmentEntity } from "@cosyte/x12";
declare const e: X12AttachmentEntity;
e.entityIdentifierCode; // NM1-01
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string` \| `undefined`

NM1-01, entity identifier code.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string` \| `undefined`

NM1-02, entity type qualifier.

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

NM1-04, first name.

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

NM1-09, identification code.

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

NM1-08, identification code qualifier.

##### lastOrOrganizationName

> `readonly` **lastOrOrganizationName**: `string` \| `undefined`

NM1-03, last name or organization name.

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

NM1-05, middle name.

##### namePrefix

> `readonly` **namePrefix**: `string` \| `undefined`

NM1-06, name prefix.

##### nameSuffix

> `readonly` **nameSuffix**: `string` \| `undefined`

NM1-07, name suffix.

***

### X12AttachmentLine

One LX line: its number and the TRN, STC and REF segments sent under it,
verbatim. The attachments sent under it point back at it through
[X12Attachment.line](#line).

#### Example

```ts
import type { X12AttachmentLine } from "@cosyte/x12";
declare const line: X12AttachmentLine;
line.lineNumber;                 // LX-01
line.statuses[0]?.codes[0]?.statusCode; // the requested item's code, echoed
```

#### Properties

##### lineNumber

> `readonly` **lineNumber**: `string` \| `undefined`

LX-01, assigned number.

##### references

> `readonly` **references**: readonly [`X12AttachmentReference`](#x12attachmentreference)[]

Every REF sent under this line.

##### statuses

> `readonly` **statuses**: readonly [`X12AttachmentStatus`](#x12attachmentstatus)[]

Every STC sent under this line.

##### traces

> `readonly` **traces**: readonly [`X12AttachmentTrace`](#x12attachmenttrace)[]

Every TRN sent under this line.

***

### X12AttachmentReference

One REF, verbatim.

#### Example

```ts
import type { X12AttachmentReference } from "@cosyte/x12";
declare const r: X12AttachmentReference;
r.value; // REF-02
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

REF-03, description.

##### qualifier

> `readonly` **qualifier**: `string` \| `undefined`

REF-01, reference identification qualifier.

##### value

> `readonly` **value**: `string` \| `undefined`

REF-02, reference identification.

***

### X12AttachmentStatus

One STC, its C043 composites verbatim. Nothing is looked up or described: on
a 275 the STC echoes the item a request named, and C043-02 is whatever code
source C043-04 names.

#### Example

```ts
import type { X12AttachmentStatus } from "@cosyte/x12";
declare const s: X12AttachmentStatus;
s.codes[0]?.codeListQualifier; // C043-04 of STC-01
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string` \| `undefined`

STC-03, action code.

##### checkIssueDate

> `readonly` **checkIssueDate**: `string` \| `undefined`

STC-08, check issue date, as sent.

##### checkNumber

> `readonly` **checkNumber**: `string` \| `undefined`

STC-09, check number.

##### codes

> `readonly` **codes**: readonly [`X12AttachmentStatusCode`](#x12attachmentstatuscode)[]

The C043 composites present, STC-01 first, then STC-10 and STC-11.

##### message

> `readonly` **message**: `string` \| `undefined`

STC-12, free-form message text.

##### paymentAmount

> `readonly` **paymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

STC-05, amount paid.

##### paymentDate

> `readonly` **paymentDate**: `string` \| `undefined`

STC-06, paid date, as sent.

##### paymentMethodCode

> `readonly` **paymentMethodCode**: `string` \| `undefined`

STC-07, payment method code.

##### statusEffectiveDate

> `readonly` **statusEffectiveDate**: `string` \| `undefined`

STC-02, status effective date, as sent.

##### totalChargeAmount

> `readonly` **totalChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

STC-04, total charge amount.

***

### X12AttachmentStatusCode

One C043 composite of a 275 STC, all four components verbatim.

#### Example

```ts
import type { X12AttachmentStatusCode } from "@cosyte/x12";
declare const c: X12AttachmentStatusCode;
c.statusCode; // C043-02
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string` \| `undefined`

C043-01.

##### codeListQualifier

> `readonly` **codeListQualifier**: `string` \| `undefined`

C043-04, naming the code source of C043-02.

##### entityCode

> `readonly` **entityCode**: `string` \| `undefined`

C043-03.

##### statusCode

> `readonly` **statusCode**: `string` \| `undefined`

C043-02.

***

### X12AttachmentSubmission

A 275 read by `get275Attachments`: the heading's BGN and names, every LX
line, and every BDS as one attachment, in document order.

#### Example

```ts
import { parseX12, get275Attachments } from "@cosyte/x12";
const ix = parseX12(buffer);
const tx = ix.groups[0]?.transactions[0];
const reading = tx === undefined ? undefined : get275Attachments(ix.delimiters, tx);
for (const attachment of reading?.attachments ?? []) {
  attachment.filterCode;     // BDS-01, e.g. "B64"
  attachment.declaredLength; // BDS-02, as sent
  attachment.lengthVerified; // false where a framing warning was raised
  attachment.line?.lineNumber; // LX-01 of the line it was sent under
}
```

#### Properties

##### attachments

> `readonly` **attachments**: readonly [`X12Attachment`](#x12attachment)[]

Every BDS, in document order. Empty where the transaction set carries none.

##### beginning

> `readonly` **beginning**: [`X12AttachmentBeginning`](#x12attachmentbeginning) \| `undefined`

The heading's BGN, or `undefined` where the transaction set carries none.

##### entities

> `readonly` **entities**: readonly [`X12AttachmentEntity`](#x12attachmententity)[]

Every NM1 in the heading, before the first LX, in document order.

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

ST-03, decoded of any release escape.

##### lines

> `readonly` **lines**: readonly [`X12AttachmentLine`](#x12attachmentline-1)[]

Every LX line, in document order.

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

Every warning raised while reading, including each BDS's framing warnings.

***

### X12AttachmentTrace

One TRN, verbatim.

#### Example

```ts
import type { X12AttachmentTrace } from "@cosyte/x12";
declare const t: X12AttachmentTrace;
t.referenceId; // TRN-02
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

TRN-03, originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

TRN-02, reference identification.

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

TRN-04, supplemental reference identification.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string` \| `undefined`

TRN-01, trace type code.

***

### X12AuthDate

A DTP date / date-range attached to a review item. `qualifier` is DTP-01
(e.g. `435` admission, `472` service); `value` is DTP-03 in the DTP-02
format (`D8` `CCYYMMDD` / `RD8` range).

#### Example

```ts
import type { X12AuthDate } from "@cosyte/x12";
declare const d: X12AuthDate;
d.qualifier;       // "472"
d.formatQualifier; // "D8"
d.value;           // "20260601"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12AuthDiagnosis

One diagnosis from an HI segment (Loop 2000E). `qualifier` (HI-0x-01) is
the X12 code-source qualifier (e.g. `ABK` ICD-10-CM principal); `code`
(HI-0x-02) is the diagnosis code. `codeSystem` resolves the qualifier
against the bundled `HI_QUALIFIERS` snapshot - `"unknown"` (with an
`X12_UNKNOWN_HI_QUALIFIER` warning) when the qualifier is outside it. The
verbatim qualifier + code are always preserved.

#### Example

```ts
import type { X12AuthDiagnosis } from "@cosyte/x12";
declare const dx: X12AuthDiagnosis;
dx.qualifier;  // "ABK"
dx.code;       // "E1165"
dx.codeSystem; // "ICD-10-CM"
```

#### Properties

##### code

> `readonly` **code**: `string`

##### codeSystem

> `readonly` **codeSystem**: [`X12HiCodeSystem`](#x12hicodesystem)

##### qualifier

> `readonly` **qualifier**: `string`

***

### X12AuthEntity

A non-person entity (UMO in Loop 2010A, requester in Loop 2010B, or a
provider attached to a review). Decoded from an NM1 - name + identifier,
no demographics.

#### Example

```ts
import type { X12AuthEntity } from "@cosyte/x12";
declare const e: X12AuthEntity;
e.entityIdentifierCode; // "X3" (UMO) / "1P" (provider)
e.name;                 // "UTILIZATION REVIEW CO"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

***

### X12AuthHeader

The BHT beginning-of-hierarchical-transaction header. `purposeCode`
(BHT-02) is `00` (original) / `18` (reissue); `transactionTypeCode`
(BHT-06) distinguishes a request (`RT` / cancel) from administrative
variants.

#### Example

```ts
import type { X12AuthHeader } from "@cosyte/x12";
declare const h: X12AuthHeader;
h.referenceId; // "AUTH-202606"
h.date;        // "20260601" (BHT-04, CCYYMMDD)
```

#### Properties

##### date

> `readonly` **date**: `string` \| `undefined`

##### purposeCode

> `readonly` **purposeCode**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

##### structurePurposeCode

> `readonly` **structurePurposeCode**: `string`

##### time

> `readonly` **time**: `string` \| `undefined`

##### transactionTypeCode

> `readonly` **transactionTypeCode**: `string` \| `undefined`

***

### X12AuthMember

A person (subscriber Loop 2010C / dependent Loop 2010D) decoded from NM1 +
the optional DMG demographics. `idCode` (NM1-09) is the member identifier
- synthetic-only in fixtures.

#### Example

```ts
import type { X12AuthMember } from "@cosyte/x12";
declare const m: X12AuthMember;
m.lastName;    // "DOE"
m.dateOfBirth; // "19850515" (DMG-02, CCYYMMDD)
```

#### Properties

##### dateOfBirth

> `readonly` **dateOfBirth**: `string` \| `undefined`

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### genderCode

> `readonly` **genderCode**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12AuthReference

A REF supplemental identifier attached to a review item. `qualifier` is
REF-01; `value` is REF-02.

#### Example

```ts
import type { X12AuthReference } from "@cosyte/x12";
declare const r: X12AuthReference;
r.qualifier; // "BB" (authorization number)
r.value;     // "PRIORAUTH-1"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12AuthTrace

A reassociation trace (TRN). A 278 request carries a trace the response
echoes verbatim so the requester can re-associate the certification
outcome with the request it sent - the walker NEVER mutates it.

#### Example

```ts
import type { X12AuthTrace } from "@cosyte/x12";
declare const t: X12AuthTrace;
t.traceTypeCode; // "1" (current transaction)
t.referenceId;   // "AUTHREQ-202606-0001"
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string`

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

***

### X12Claim

Decoded CLM claim header + every claim-scoped loop. The `variant`
mirrors the parent submission's variant; the `serviceLines` discriminate
on the same variant so a consumer can do a single switch.

PHI surface: `claimId` (provider's patient-account number), the
subscriber/patient NM1 entities, member ID on subscriber/patient, NTE
notes. All surfaced verbatim; warnings never echo values.

#### Example

```ts
import type { X12Claim } from "@cosyte/x12";
declare const c: X12Claim;
c.variant;                    // "P" / "I" / "D" / "unknown"
c.claimId;                    // CLM-01 (patient account number)
c.totalCharge?.toString();    // CLM-02 as X12Decimal, or undefined if none decoded
c.diagnoses[0]?.codeSystem;   // "ICD-10-CM"
c.serviceLines.length;        // count of LX/SVx loops
```

#### Properties

##### amounts

> `readonly` **amounts**: readonly [`X12ClaimAmount`](#x12claimamount)[]

##### benefitsAssignment

> `readonly` **benefitsAssignment**: `string` \| `undefined`

##### billingProvider

> `readonly` **billingProvider**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### claimFrequencyCode

> `readonly` **claimFrequencyCode**: `string` \| `undefined`

##### claimId

> `readonly` **claimId**: `string`

##### dates

> `readonly` **dates**: readonly [`X12ClaimDate`](#x12claimdate)[]

##### diagnoses

> `readonly` **diagnoses**: readonly [`X12ClaimHiCode`](#x12claimhicode)[]

##### facilityCodeQualifier

> `readonly` **facilityCodeQualifier**: `string` \| `undefined`

##### hierarchy

> `readonly` **hierarchy**: [`X12HierarchicalLevel`](#x12hierarchicallevel) \| `undefined`

##### notes

> `readonly` **notes**: readonly [`X12ClaimNote`](#x12claimnote)[]

##### otherHi

> `readonly` **otherHi**: readonly [`X12ClaimHiCode`](#x12claimhicode)[]

##### otherSubscribers

> `readonly` **otherSubscribers**: readonly [`X12OtherSubscriber`](#x12othersubscriber)[]

##### patient

> `readonly` **patient**: [`X12ClaimMember`](#x12claimmember) \| `undefined`

##### payer

> `readonly` **payer**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### payToAddress

> `readonly` **payToAddress**: [`X12ClaimAddress`](#x12claimaddress) \| `undefined`

##### payToPlan

> `readonly` **payToPlan**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### placeOfServiceCode

> `readonly` **placeOfServiceCode**: `string` \| `undefined`

##### procedures

> `readonly` **procedures**: readonly [`X12ClaimHiCode`](#x12claimhicode)[]

##### providerAcceptAssignment

> `readonly` **providerAcceptAssignment**: `string` \| `undefined`

##### providers

> `readonly` **providers**: readonly [`X12ClaimEntity`](#x12claimentity)[]

##### providerSignatureOnFile

> `readonly` **providerSignatureOnFile**: `string` \| `undefined`

##### references

> `readonly` **references**: readonly [`X12ClaimReference`](#x12claimreference)[]

##### releaseOfInformationCode

> `readonly` **releaseOfInformationCode**: `string` \| `undefined`

##### serviceLines

> `readonly` **serviceLines**: readonly [`X12_837ServiceLine`](#x12_837serviceline)[]

##### subscriber

> `readonly` **subscriber**: [`X12ClaimMember`](#x12claimmember) \| `undefined`

##### totalCharge

> `readonly` **totalCharge**: [`X12Decimal`](#x12decimal) \| `undefined`

CLM-02, the total claim charge. `undefined` where this library decoded
no value from that element - it was absent or empty, or it held bytes
that do not decode as a decimal (which also emits
`X12_UNPARSEABLE_DECIMAL` at its `elementIndex`). Through `0.0.12` both
cases read `X12Decimal.ZERO`, indistinguishable from a claim whose
charge really is zero.

##### variant

> `readonly` **variant**: [`X12Claim837Variant`](#x12claim837variant)

***

### X12ClaimAddress

Decoded N3 + N4 address block attached to an entity. Same shape as the
835's address (intentional - symmetry across helpers). All fields
verbatim, no normalization.

#### Example

```ts
import type { X12ClaimAddress } from "@cosyte/x12";
declare const a: X12ClaimAddress;
a.lines[0];   // "123 PROVIDER WAY"
a.city;       // "CLEVELAND"
a.state;      // "OH"
a.postalCode; // "44113"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12ClaimAmount

Decoded AMT segment - supplemental claim amount (patient-paid amount,
coverage amount, etc.). `qualifier` from X12 522. Surfaced verbatim;
never folded into a computed total (the 837 has no on-spec balance
invariant analogous to the 835's CLP balance).

#### Example

```ts
import type { X12ClaimAmount } from "@cosyte/x12";
declare const a: X12ClaimAmount;
a.qualifier;          // "F5" patient amount paid
a.amount.toString();  // "25.00"
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

##### qualifier

> `readonly` **qualifier**: `string`

***

### X12ClaimContact

Decoded PER contact segment. `contactFunctionCode` = `IC` (Information
Contact), `BL` (Technical), `AP` (Accounts Payable Contact); each
carries up to 3 communication channels (`TE` telephone, `EM` email,
`FX` fax, `EX` extension).

#### Example

```ts
import type { X12ClaimContact } from "@cosyte/x12";
declare const c: X12ClaimContact;
c.contactFunctionCode;                // "IC"
c.communications[0]?.qualifier;       // "TE"
c.communications[0]?.value;            // "5551234567"
```

#### Properties

##### communications

> `readonly` **communications**: readonly `object`[]

##### contactFunctionCode

> `readonly` **contactFunctionCode**: `string`

##### name

> `readonly` **name**: `string` \| `undefined`

***

### X12ClaimDate

Decoded DTP date - claim-level or service-line-level. `formatQualifier`
is DTP-02 (`D8` single-date CCYYMMDD; `RD8` date range
CCYYMMDD-CCYYMMDD). `value` is DTP-03 verbatim - the parser never
normalizes the literal.

Date-qualifier vocabulary on 837 (X12 374): `472` Service Date, `434`
Statement Date, `435` Admission Date (837I), `096` Discharge Date
(837I), `431` Onset of Current Illness, `454` Initial Treatment Date,
`297` Last Worked Date, etc.

#### Example

```ts
import type { X12ClaimDate } from "@cosyte/x12";
declare const d: X12ClaimDate;
d.qualifier;       // "472"
d.formatQualifier; // "D8"
d.value;           // "20260601"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12ClaimEntity

Generic NM1 entity used throughout the 837. Covers billing provider
(`85`), pay-to address (`87`), submitter (`41`), receiver (`40`),
subscriber name (`IL`), patient name (`QC`), payer (`PR`), and the long
tail of 2310 / 2330 / 2420 provider / payer / facility roles. The
`entityIdentifierCode` discriminates the role; consumers branching on
roles should compare against the X12 0098 code list.

PHI surface: `lastName`/`firstName`/`idCode` carry PHI when the role is
a person (subscriber, patient, rendering provider as an individual).
Surfaced verbatim - the parser never echoes them in warnings.

#### Example

```ts
import type { X12ClaimEntity } from "@cosyte/x12";
declare const e: X12ClaimEntity;
e.entityIdentifierCode; // "85" billing provider
e.name;                 // verbatim NM1-03
e.idQualifier;          // "XX" (NPI)
e.idCode;               // verbatim NPI
```

#### Properties

##### address

> `readonly` **address**: [`X12ClaimAddress`](#x12claimaddress) \| `undefined`

##### contacts

> `readonly` **contacts**: readonly [`X12ClaimContact`](#x12claimcontact)[]

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

##### references

> `readonly` **references**: readonly [`X12ClaimReference`](#x12claimreference)[]

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12ClaimHiCode

Decoded HI diagnosis or procedure composite. ONE entry per HI composite
(HI-01..HI-12); the parser surfaces the verbatim qualifier AND the
resolved [X12HiCodeSystem](#x12hicodesystem) so consumers can branch by system
without re-deriving the mapping. The `category` discriminates the role
(diagnosis / procedure / NUBC code-set entry).

`poaIndicator` (Present-on-Admission) is HI-NN-9 - 837I institutional
inpatient only. CMS-mandated values: `Y` Yes, `N` No, `U` Insufficient
documentation, `W` Clinically undetermined, `1` Exempt from POA
reporting. Verbatim - the parser preserves the value, never validates
against the spec list (a profile may layer enforcement).

#### Example

```ts
import type { X12ClaimHiCode } from "@cosyte/x12";
declare const dx: X12ClaimHiCode;
dx.qualifier;     // "ABK" - principal diagnosis ICD-10-CM
dx.codeSystem;    // "ICD-10-CM"
dx.category;      // "principal-diagnosis"
dx.code;          // "J45.50"
dx.poaIndicator;  // "Y" (837I only)
```

#### Properties

##### category

> `readonly` **category**: [`X12HiCategory`](#x12hicategory)

##### code

> `readonly` **code**: `string`

##### codeSystem

> `readonly` **codeSystem**: [`X12HiCodeSystem`](#x12hicodesystem)

##### date

> `readonly` **date**: `string` \| `undefined`

##### dateQualifier

> `readonly` **dateQualifier**: `string` \| `undefined`

##### monetaryAmount

> `readonly` **monetaryAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

##### poaIndicator

> `readonly` **poaIndicator**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

##### versionId

> `readonly` **versionId**: `string` \| `undefined`

***

### X12ClaimMember

A claim's subscriber or patient - the NM1 entity plus the SBR/PAT
metadata that wraps it.

#### Example

```ts
import type { X12ClaimMember } from "@cosyte/x12";
declare const m: X12ClaimMember;
m.entity.name;             // verbatim subscriber name (PHI)
m.info.claimFilingIndicator; // "MB"
```

#### Properties

##### entity

> `readonly` **entity**: [`X12ClaimEntity`](#x12claimentity)

##### info

> `readonly` **info**: [`X12SubscriberInfo`](#x12subscriberinfo)

***

### X12ClaimNote

Decoded NTE note - free-text annotation. `noteReferenceCode` (NTE-01)
classifies the note ('ADD' Additional Information, 'CER' Certification,
'DCP' Goals/Rehabilitation/Discharge Plans, 'DGN' Diagnosis, 'DME' DME,
'MED' Medications, etc., X12 code list 363).

NOTE: NTE-02 is free text supplied by the provider - it may include
incidental PHI (a patient name in a clinical note). Surfaced verbatim
for fidelity; the parser flags this surface in JSDoc but never
redacts. Consumers should treat NTE-02 as PHI-bearing.

#### Example

```ts
import type { X12ClaimNote } from "@cosyte/x12";
declare const n: X12ClaimNote;
n.noteReferenceCode; // "ADD"
n.description;       // verbatim - may include incidental PHI
```

#### Properties

##### description

> `readonly` **description**: `string`

##### noteReferenceCode

> `readonly` **noteReferenceCode**: `string`

***

### X12ClaimReference

Decoded REF segment - additional identifier on an entity or claim.
Verbatim across the table; the qualifier vocabulary depends on the
context (`EI` Employer ID at the billing provider, `D9` Claim Number on
an other-payer reference, `G1` Prior Authorization, etc.).

#### Example

```ts
import type { X12ClaimReference } from "@cosyte/x12";
declare const r: X12ClaimReference;
r.qualifier; // "EI"
r.value;     // "123456789"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12ClaimStatus

One claim status-tracking loop (Loop 2200). A claim opens on a TRN
(claim-level reassociation trace) or - in a 277CA provider-level batch
acknowledgment - on a standalone STC. Carries the resolved HL context,
the echoed traces, the decoded STC statuses, supplemental REF / DTP, and
any service-line statuses (Loop 2220).

#### Example

```ts
import type { X12ClaimStatus } from "@cosyte/x12";
declare const c: X12ClaimStatus;
c.serviceProvider?.name;   // "ANYTOWN CLINIC"
c.subscriber?.lastName;    // "DOE"
c.statuses[0]?.totalChargeAmount?.toString(); // "150.00"
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12StatusDate`](#x12statusdate)[]

##### dependent

> `readonly` **dependent**: [`X12StatusMember`](#x12statusmember) \| `undefined`

##### informationReceiver

> `readonly` **informationReceiver**: [`X12StatusEntity`](#x12statusentity) \| `undefined`

##### informationSource

> `readonly` **informationSource**: [`X12StatusEntity`](#x12statusentity) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12StatusReference`](#x12statusreference)[]

##### serviceLines

> `readonly` **serviceLines**: readonly [`X12ServiceLineStatus`](#x12servicelinestatus)[]

##### serviceProvider

> `readonly` **serviceProvider**: [`X12StatusEntity`](#x12statusentity) \| `undefined`

##### statuses

> `readonly` **statuses**: readonly [`X12StatusInfo`](#x12statusinfo)[]

##### subscriber

> `readonly` **subscriber**: [`X12StatusMember`](#x12statusmember) \| `undefined`

##### traces

> `readonly` **traces**: readonly [`X12StatusTrace`](#x12statustrace)[]

***

### X12ClaimStatusResponse

Top-level result of the 277 / 277CA walker. Claims are flattened: each
[X12ClaimStatus](#x12claimstatus) carries its enclosing information source (payer),
information receiver, service provider, and subscriber / dependent
context resolved from the HL tree, mirroring how `get835` flattens claim
payment loops.

#### Example

```ts
import { parseX12, get277Status } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
if (tx !== undefined) {
  const status = get277Status(ix.delimiters, tx);
  for (const claim of status?.claims ?? []) {
    claim.traces[0]?.referenceId;                  // echoed 276 trace
    claim.statuses[0]?.statuses[0]?.categoryCode;  // "A2" (acknowledgment)
  }
}
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`X12ClaimStatus`](#x12claimstatus)[]

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12Hl`](#x12hl)[]

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

##### transactionType

> `readonly` **transactionType**: `"claim-status"` \| `"claim-acknowledgment"` \| `"unrecognized-guide"`

Which document this reading is. `"claim-status"` or
`"claim-acknowledgment"` where the transaction set declares a guide the
reader implements (ST-03 as framed reading `005010X214` is the
acknowledgment); `"unrecognized-guide"` where it declares no guide at
all, in which case the reading also carries `X12_GUIDE_NOT_DECLARED`, or
declares one only padded or in another case (`005010X212` with a space
either side, say), in which case it carries `X12_GUIDE_NOT_IMPLEMENTED`.
A transaction set declaring a guide outside that set even once trimmed
and upper-cased gets no reading (the reader returns `undefined`). ST-03
stays readable, decoded, on `implementationConventionReference`.

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12ClassifiedQuirk

A quirk as [X12Profile.describe](#describe) RENDERS it: the authored quirk plus
the conformance state it resolved to. `conformance` is required here and
optional on [X12ProfileQuirk](#x12profilequirk), which is the whole difference - an
unrecorded judgement is rendered as `"undetermined"` rather than left
absent, so a reader never has to distinguish "no field" from "no claim".

#### Example

```ts
import { profiles } from "@cosyte/x12";
const d = profiles.bcbsCommon.describe();
d.relaxes[0]?.conformance; // "permitted" | "not-permitted" | "undetermined"
```

#### Extends

- [`X12ProfileQuirk`](#x12profilequirk)

#### Properties

##### conformance

> `readonly` **conformance**: [`X12ProfileConformance`](#x12profileconformance)

OPTIONAL recorded judgement of whether a trading partner may lawfully
require this deviation under 45 CFR 162.915. Omit it and the quirk
renders as [X12ProfileConformance](#x12profileconformance) `"undetermined"` - the fail-safe
default - so a profile written before this field existed keeps defining
and describing exactly as it did, and never gains a claim nobody made.

###### Overrides

[`X12ProfileQuirk`](#x12profilequirk).[`conformance`](#conformance-2)

##### effect

> `readonly` **effect**: [`X12ProfileEffect`](#x12profileeffect)

Which `describe()` bucket this quirk renders into.

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`effect`](#effect-1)

##### expectedWarnings?

> `readonly` `optional` **expectedWarnings?**: readonly [`X12WarningCode`](#x12warningcode)[]

Warning codes this quirk leads a consumer to EXPECT when the deviation
is present. Drives `partitionWarnings`. Often empty: the lenient parser
absorbs most corpus deviations with zero warnings, and that "lossless,
no warning" outcome is itself the documented behavior.

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`expectedWarnings`](#expectedwarnings-2)

##### fixture

> `readonly` **fixture**: `string`

Path to the Tier-2 fixture demonstrating the deviation, relative to
`test/fixtures/` (e.g. `"remit/835-availity-quirk.edi"`). REQUIRED - the
locked hard rule. The accuracy test parses this file and asserts the
claimed deviation is present.

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`fixture`](#fixture-1)

##### id

> `readonly` **id**: `string`

Stable, kebab-case identifier - unique within a profile's quirk set.

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`id`](#id-8)

##### sourceCategory

> `readonly` **sourceCategory**: `string`

Where the deviation was observed (companion guide / corpus category).

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`sourceCategory`](#sourcecategory-1)

##### summary

> `readonly` **summary**: `string`

One-line human summary. NEVER contains PHI - describes structure only.

###### Inherited from

[`X12ProfileQuirk`](#x12profilequirk).[`summary`](#summary-1)

***

### X12CoordinationOfBenefits

Decoded Loop 2320 coordination of benefits (`COB`). `payerResponsibility`
is COB-01 (`P` primary, `S` secondary, `T` tertiary); `referenceId` is
COB-02 (the other payer's group/policy number); `serviceTypeCode` is
COB-03.

#### Example

```ts
import type { X12CoordinationOfBenefits } from "@cosyte/x12";
declare const c: X12CoordinationOfBenefits;
c.payerResponsibility; // "P"
c.referenceId;         // "OTHERGRP-1"
```

#### Properties

##### coordinationOfBenefitsCode

> `readonly` **coordinationOfBenefitsCode**: `string` \| `undefined`

##### payerResponsibility

> `readonly` **payerResponsibility**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

***

### X12DateValue

Any date carrier this package's typed readers surface, read structurally
rather than by name.

Every `X12*Date` this package exports is accepted through this one shape:
`X12ClaimDate`, `X12InquiryDate`, `X12EligibilityDate`, `X12StatusInquiryDate`,
`X12StatusDate`, `X12PremiumDate`, `X12EnrollmentDate` and `X12AuthDate`. It
is structural on purpose - a ninth carrier added later is accepted with no
change here, and there is no per-transaction conversion variant to pick
between.

Both members are optional because two of those eight carriers state no
format qualifier at all: `X12EnrollmentDate` and `X12PremiumDate` surface the
qualifier and the verbatim value and nothing else. A carrier with no
`formatQualifier` converts to `undefined`, which is the honest answer rather
than a guess at which format the sender used.

#### Example

```ts
import { toISO, type X12DateValue } from "@cosyte/x12";
const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
toISO(day); // "2026-06-01"
```

#### Properties

##### formatQualifier?

> `readonly` `optional` **formatQualifier?**: `string`

DTP-02 / DTM-03 date/time period format qualifier, when the carrier states one.

##### value?

> `readonly` `optional` **value?**: `string`

The verbatim date element, in whatever form `formatQualifier` declares.

***

### X12DecimalRead

The tri-state result of [readElementDecimal](#readelementdecimal): the decoded value
(when there is one) alongside the reason there is not.

#### Example

```ts
import { readElementDecimal } from "@cosyte/x12";
const read = readElementDecimal(seg, 2, delim);
if (read.status === "unparseable") {
  // the element was PRESENT and did not decode - do not read it as absent
}
```

#### Properties

##### status

> `readonly` **status**: [`X12DecimalStatus`](#x12decimalstatus)

Which of the three spec-distinct outcomes this read hit.

##### value

> `readonly` **value**: [`X12Decimal`](#x12decimal) \| `undefined`

The decoded decimal, or `undefined` for both non-`"decoded"` states.

***

### X12DecimalWarningSink

Where [elementDecimal](#elementdecimal) / [elementDecimalOrZero](#elementdecimalorzero) put an
`X12_UNPARSEABLE_DECIMAL` warning, and the segment-level position it is
anchored to. The helpers add the failing `elementIndex` themselves, so a
caller passes the position of the SEGMENT it is decoding and never has to
remember to narrow it per element.

#### Example

```ts
import { elementDecimalOrZero, type X12DecimalWarningSink } from "@cosyte/x12";
const sink: X12DecimalWarningSink = { warnings, position: { segmentIndex: 3 } };
elementDecimalOrZero(seg, 2, delim, sink);
```

#### Properties

##### position

> `readonly` **position**: [`X12Position`](#x12position)

Position of the segment being decoded; `elementIndex` is supplied by the helper.

##### warnings

> `readonly` **warnings**: [`X12ParseWarning`](#x12parsewarning)[]

The walker's warning accumulator. Appended to, never read.

***

### X12Eligibility

Top-level result of "./get-271.js".get271Eligibility. Carries
every subscriber loop (each with its enclosing information-source payer
and information-receiver provider, its echoed TRN traces, name, and
eligibility/benefit lines), the verbatim HL hierarchy, and every warning
surfaced during the walk.

#### Example

```ts
import { parseX12, get271Eligibility } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
if (tx !== undefined) {
  const elig = get271Eligibility(ix.delimiters, tx);
  for (const sub of elig.subscribers) {
    sub.traces[0]?.referenceId;       // echoed 270 trace number
    sub.benefits[0]?.eligibilityCode; // "1" (Active Coverage)
  }
}
```

#### Properties

##### aaaConditions

> `readonly` **aaaConditions**: readonly [`X12AaaCondition`](#x12aaacondition)[]

Every AAA request-validation segment the document carried, in document
order. **ALWAYS PRESENT, and empty where the document carried none.** A
present, empty collection is a stated zero; an absent field could not be
told from a reader that does not surface AAA at all, which is the exact
ambiguity this collection exists to remove. A payer that rejected the
inquiry and a payer that found no benefits are different answers, and
before this collection existed they read identically through this surface.

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12Hl`](#x12hl)[]

##### subscribers

> `readonly` **subscribers**: readonly [`X12EligibilitySubscriber`](#x12eligibilitysubscriber)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12EligibilityAddress

A postal address (N3 + N4) attached to a subscriber / dependent name.

#### Example

```ts
import type { X12EligibilityAddress } from "@cosyte/x12";
declare const a: X12EligibilityAddress;
a.lines[0];   // "123 MAIN ST"
a.city;       // "ANYTOWN"
a.state;      // "CA"
a.postalCode; // "90001"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12EligibilityBenefit

One eligibility-or-benefit line (EB, Loop 2110C/2110D). EB-01 is the
eligibility code (`1` Active Coverage, `6` Inactive, `I` Non-Covered,
…); EB-03 carries one-or-more Service Type Codes (each looked up against
the bundled snapshot). Monetary + percent + quantity are
[X12Decimal](#x12decimal). The walker preserves the verbatim EB-01 even when no
description resolves.

#### Example

```ts
import type { X12EligibilityBenefit } from "@cosyte/x12";
declare const b: X12EligibilityBenefit;
b.eligibilityCode;          // "1"
b.serviceTypeCodes[0]?.code; // "30"
b.inPlanNetwork;            // "Y"
b.monetaryAmount?.toString(); // "1000.00"
b.procedure?.code;          // "D2150" (EB-13-2, when the line is procedure-specific)
```

#### Properties

##### authorizationRequired

> `readonly` **authorizationRequired**: `string` \| `undefined`

##### coverageLevelCode

> `readonly` **coverageLevelCode**: `string` \| `undefined`

##### dates

> `readonly` **dates**: readonly [`X12EligibilityDate`](#x12eligibilitydate)[]

##### eligibilityCode

> `readonly` **eligibilityCode**: `string`

##### inPlanNetwork

> `readonly` **inPlanNetwork**: `string` \| `undefined`

##### insuranceTypeCode

> `readonly` **insuranceTypeCode**: `string` \| `undefined`

##### messages

> `readonly` **messages**: readonly `string`[]

##### monetaryAmount

> `readonly` **monetaryAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

##### percent

> `readonly` **percent**: [`X12Decimal`](#x12decimal) \| `undefined`

##### planCoverageDescription

> `readonly` **planCoverageDescription**: `string` \| `undefined`

##### procedure

> `readonly` **procedure**: [`X12EligibilityProcedure`](#x12eligibilityprocedure) \| `undefined`

EB-13 - the procedure this line applies to; `undefined` when EB-13 is absent or has no qualifier.

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

##### quantityQualifier

> `readonly` **quantityQualifier**: `string` \| `undefined`

##### references

> `readonly` **references**: readonly [`X12EligibilityReference`](#x12eligibilityreference)[]

##### relatedEntities

> `readonly` **relatedEntities**: readonly [`X12EligibilityEntity`](#x12eligibilityentity)[]

##### serviceTypeCodes

> `readonly` **serviceTypeCodes**: readonly [`X12EligibilityServiceType`](#x12eligibilityservicetype)[]

##### timePeriodQualifier

> `readonly` **timePeriodQualifier**: `string` \| `undefined`

***

### X12EligibilityDate

A DTP date / date-range attached to a subscriber, dependent, or benefit
line. `qualifier` is DTP-01 (e.g. `307` Eligibility, `291` Plan); `value`
is DTP-03 in the DTP-02 format (`D8` `CCYYMMDD` / `RD8` range).

#### Example

```ts
import type { X12EligibilityDate } from "@cosyte/x12";
declare const d: X12EligibilityDate;
d.qualifier;       // "307"
d.formatQualifier; // "D8"
d.value;           // "20260101"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12EligibilityDependent

One dependent (Loop 2000D / 2100D) - a patient who is not the subscriber
(relationship is carried at the HL level). Same benefit-bearing shape as
a subscriber minus the nested dependents.

#### Example

```ts
import type { X12EligibilityDependent } from "@cosyte/x12";
declare const d: X12EligibilityDependent;
d.name?.firstName;            // "JUNIOR"
d.benefits[0]?.coverageLevelCode; // "IND"
```

#### Properties

##### benefits

> `readonly` **benefits**: readonly [`X12EligibilityBenefit`](#x12eligibilitybenefit)[]

##### dates

> `readonly` **dates**: readonly [`X12EligibilityDate`](#x12eligibilitydate)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl) \| `undefined`

##### name

> `readonly` **name**: [`X12EligibilityMember`](#x12eligibilitymember) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12EligibilityReference`](#x12eligibilityreference)[]

##### traces

> `readonly` **traces**: readonly [`X12EligibilityTrace`](#x12eligibilitytrace)[]

***

### X12EligibilityEntity

A non-person entity (payer in Loop 2100A, provider in Loop 2100B, or a
benefit-related entity in Loop 2120C). Decoded from an NM1 - no
demographics, just the organization / provider name + identifier.

#### Example

```ts
import type { X12EligibilityEntity } from "@cosyte/x12";
declare const e: X12EligibilityEntity;
e.entityIdentifierCode; // "PR" (payer) / "1P" (provider)
e.name;                 // "MEDPAY INSURANCE"
e.idCode;               // "00123"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

***

### X12EligibilityMember

A person (subscriber / dependent) decoded from NM1 + the optional DMG
demographics + N3/N4 address. `idCode` is the member identifier (NM1-09)
- synthetic-only in fixtures.

#### Example

```ts
import type { X12EligibilityMember } from "@cosyte/x12";
declare const m: X12EligibilityMember;
m.lastName;     // "DOE"
m.dateOfBirth;  // "19800101" (DMG-02, CCYYMMDD)
m.genderCode;   // "F"
```

#### Properties

##### address

> `readonly` **address**: [`X12EligibilityAddress`](#x12eligibilityaddress) \| `undefined`

##### dateOfBirth

> `readonly` **dateOfBirth**: `string` \| `undefined`

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### genderCode

> `readonly` **genderCode**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12EligibilityProcedure

The EB-13 composite medical procedure identifier (C003), as its separated
components, split on the component separator the interchange declares.
C003-08 (range end) is not read.

#### Example

```ts
import type { X12EligibilityProcedure } from "@cosyte/x12";
declare const p: X12EligibilityProcedure;
p.qualifier;    // "AD" (EB-13-1, product/service id qualifier)
p.code;         // "D2150" (EB-13-2)
p.modifiers[0]; // "26" (EB-13-3 onward)
```

#### Properties

##### code

> `readonly` **code**: `string` \| `undefined`

EB-13-2 - the procedure code.

##### description

> `readonly` **description**: `string` \| `undefined`

EB-13-7 - procedure description, when the sender transmitted one.

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

EB-13-3 through EB-13-6 - procedure modifiers, in transmitted order.

##### qualifier

> `readonly` **qualifier**: `string`

EB-13-1 - product or service id qualifier.

***

### X12EligibilityReference

A REF supplemental identifier attached to a subscriber, dependent, or
benefit line. `qualifier` is REF-01; `value` is REF-02.

#### Example

```ts
import type { X12EligibilityReference } from "@cosyte/x12";
declare const r: X12EligibilityReference;
r.qualifier; // "6P" (group number)
r.value;     // "GRP0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12EligibilityServiceType

A decoded Service Type Code (EB-03, X12 external code source 1365). The
verbatim code is always preserved; `description` resolves from the
bundled snapshot (or `undefined` when outside the subset).

#### Example

```ts
import type { X12EligibilityServiceType } from "@cosyte/x12";
declare const st: X12EligibilityServiceType;
st.code;        // "30"
st.description; // "Health Benefit Plan Coverage"
```

#### Properties

##### code

> `readonly` **code**: `string`

##### description

> `readonly` **description**: `string` \| `undefined`

***

### X12EligibilitySubscriber

One subscriber (Loop 2000C / 2100C). Holds the enclosing information
source (Loop 2100A payer) and information receiver (Loop 2100B provider)
resolved from the HL tree, the verbatim echoed TRN traces, the
subscriber name + demographics, and the eligibility/benefit lines.
Non-subscriber patients hang off [dependents](#dependents-4).

#### Example

```ts
import type { X12EligibilitySubscriber } from "@cosyte/x12";
declare const s: X12EligibilitySubscriber;
s.informationSource?.name;   // "MEDPAY INSURANCE"
s.name?.lastName;            // "DOE"
s.dependents.length;         // 0
```

#### Properties

##### benefits

> `readonly` **benefits**: readonly [`X12EligibilityBenefit`](#x12eligibilitybenefit)[]

##### dates

> `readonly` **dates**: readonly [`X12EligibilityDate`](#x12eligibilitydate)[]

##### dependents

> `readonly` **dependents**: readonly [`X12EligibilityDependent`](#x12eligibilitydependent)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl) \| `undefined`

##### informationReceiver

> `readonly` **informationReceiver**: [`X12EligibilityEntity`](#x12eligibilityentity) \| `undefined`

##### informationSource

> `readonly` **informationSource**: [`X12EligibilityEntity`](#x12eligibilityentity) \| `undefined`

##### name

> `readonly` **name**: [`X12EligibilityMember`](#x12eligibilitymember) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12EligibilityReference`](#x12eligibilityreference)[]

##### traces

> `readonly` **traces**: readonly [`X12EligibilityTrace`](#x12eligibilitytrace)[]

***

### X12EligibilityTrace

A reassociation trace (TRN). **The verbatim echo of the requesting 270's
trace number** - `referenceId` (TRN-02) is the value a provider matches
against the trace it sent. The walker NEVER mutates it.

#### Example

```ts
import type { X12EligibilityTrace } from "@cosyte/x12";
declare const t: X12EligibilityTrace;
t.traceTypeCode; // "2" (referenced - added by the payer in the 271)
t.referenceId;   // "ELIG20260627001" (echoed verbatim from the 270)
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string`

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

***

### X12Enrollment

One decoded Loop 2000 member-level detail (`INS`) - a single member's
enrollment action. Carries the member identity (Loop 2100A NM1 + DMG +
address), the supplemental ids (REF - subscriber id, group/policy), the
dates (DTP - eligibility begin/end), the health-coverage loops (Loop
2300 HD), and the coordination-of-benefits loops (Loop 2320 COB). Any
recoverable deviation (e.g. an unknown maintenance type) is surfaced on
`warnings` for THIS member only.

#### Example

```ts
import type { X12Enrollment } from "@cosyte/x12";
declare const e: X12Enrollment;
e.maintenanceTypeCode;            // "021" addition
e.maintenanceTypeDescription;     // "Addition"
e.member?.lastName;               // verbatim member surname
e.healthCoverages[0]?.insuranceLineCode; // "HLT"
```

#### Properties

##### benefitStatusCode

> `readonly` **benefitStatusCode**: `string` \| `undefined`

##### coordinationOfBenefits

> `readonly` **coordinationOfBenefits**: readonly [`X12CoordinationOfBenefits`](#x12coordinationofbenefits)[]

##### dates

> `readonly` **dates**: readonly [`X12EnrollmentDate`](#x12enrollmentdate)[]

##### employmentStatusCode

> `readonly` **employmentStatusCode**: `string` \| `undefined`

##### healthCoverages

> `readonly` **healthCoverages**: readonly [`X12HealthCoverage`](#x12healthcoverage)[]

##### maintenanceReasonCode

> `readonly` **maintenanceReasonCode**: `string` \| `undefined`

##### maintenanceTypeCode

> `readonly` **maintenanceTypeCode**: `string`

##### maintenanceTypeDescription

> `readonly` **maintenanceTypeDescription**: `string` \| `undefined`

##### member

> `readonly` **member**: [`X12EnrollmentMember`](#x12enrollmentmember-1) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12EnrollmentReference`](#x12enrollmentreference)[]

##### relationshipCode

> `readonly` **relationshipCode**: `string` \| `undefined`

##### subscriberIndicator

> `readonly` **subscriberIndicator**: `string` \| `undefined`

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12EnrollmentAddress

Decoded N3 + N4 address block attached to a member. `lines` is the N3
address lines (1-2 entries); `city` / `state` / `postalCode` come from
N4. All verbatim - no normalization.

#### Example

```ts
import type { X12EnrollmentAddress } from "@cosyte/x12";
declare const a: X12EnrollmentAddress;
a.lines[0];   // "100 MAIN ST"
a.city;       // "COLUMBUS"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12EnrollmentAmount

Decoded AMT amount attached to a health-coverage loop. `qualifier` is the
amount qualifier (AMT-01 - `"P3"` premium, `"B9"` co-insurance, …);
`amount` is "../../decimal.js".X12Decimal (NEVER `number`).

#### Example

```ts
import type { X12EnrollmentAmount } from "@cosyte/x12";
declare const a: X12EnrollmentAmount;
a.qualifier;          // "P3"
a.amount.toString();  // "125.00"
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

##### qualifier

> `readonly` **qualifier**: `string`

***

### X12EnrollmentDate

Decoded DTP date attached to a member or a health-coverage loop.
`qualifier` is the date/time qualifier (DTP-01); `value` is the verbatim
CCYYMMDD or range (DTP-03). No normalization.

#### Example

```ts
import type { X12EnrollmentDate } from "@cosyte/x12";
declare const d: X12EnrollmentDate;
d.qualifier; // "356" eligibility begin
d.value;     // "20260101"
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12EnrollmentHeader

Decoded 834 header - the BGN Beginning Segment plus the sponsor
(`N1*P5`) and payer (`N1*IN`) parties. Returned by
"./get-834.js".get834Header; the per-member stream is separate
so a consumer can read the file-level context without draining the
(potentially huge) member roster.

#### Example

```ts
import type { X12EnrollmentHeader } from "@cosyte/x12";
declare const h: X12EnrollmentHeader;
h.transactionSetPurposeCode; // "00" original
h.sponsor?.name;             // "EMPLOYER CO"
h.payer?.name;               // "MEDPAY INSURANCE"
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string` \| `undefined`

##### date

> `readonly` **date**: `string` \| `undefined`

##### dates

> `readonly` **dates**: readonly [`X12EnrollmentDate`](#x12enrollmentdate)[]

##### payer

> `readonly` **payer**: [`X12EnrollmentParty`](#x12enrollmentparty) \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

##### references

> `readonly` **references**: readonly [`X12EnrollmentReference`](#x12enrollmentreference)[]

##### sponsor

> `readonly` **sponsor**: [`X12EnrollmentParty`](#x12enrollmentparty) \| `undefined`

##### time

> `readonly` **time**: `string` \| `undefined`

##### transactionSetPurposeCode

> `readonly` **transactionSetPurposeCode**: `string`

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12EnrollmentMember

Decoded Loop 2100A member name (`NM1*IL`) + demographic (`DMG`) +
address (`N3`/`N4`). PHI surface: every field carries PHI.

#### Example

```ts
import type { X12EnrollmentMember } from "@cosyte/x12";
declare const m: X12EnrollmentMember;
m.lastName;     // verbatim
m.idCode;       // verbatim member id
m.dateOfBirth;  // "19850515" (CCYYMMDD, verbatim)
m.genderCode;   // "F"
```

#### Properties

##### address

> `readonly` **address**: [`X12EnrollmentAddress`](#x12enrollmentaddress) \| `undefined`

##### dateOfBirth

> `readonly` **dateOfBirth**: `string` \| `undefined`

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### genderCode

> `readonly` **genderCode**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12EnrollmentParty

Decoded Loop 1000 party (sponsor `N1*P5`, payer `N1*IN`, TPA/broker
`N1*BO`/`N1*TV`). Organizational PII, not member PHI.

#### Example

```ts
import type { X12EnrollmentParty } from "@cosyte/x12";
declare const p: X12EnrollmentParty;
p.entityIdentifierCode; // "P5" plan sponsor
p.name;                 // "EMPLOYER CO"
p.idCode;               // "FEIN123" (verbatim)
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

***

### X12EnrollmentReference

Decoded REF - supplemental identifier (subscriber id `0F`, group/policy
`1L`, member id `23`, …). `qualifier` is the X12 reference-identification
qualifier; `value` is the verbatim id.

#### Example

```ts
import type { X12EnrollmentReference } from "@cosyte/x12";
declare const r: X12EnrollmentReference;
r.qualifier; // "0F" subscriber number
r.value;     // "MBR0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12FunctionalGroup

A single GS..GE functional group inside an interchange. `transactions`
is the ordered list of ST..SE transaction sets inside it (opaque bodies
at envelope decode - see [X12TransactionSet](#x12transactionset)).

#### Example

```ts
import type { X12FunctionalGroup } from "@cosyte/x12";
declare const group: X12FunctionalGroup;
group.transactions.length;
```

#### Properties

##### ge

> `readonly` **ge**: [`GeSegment`](#gesegment) \| `undefined`

##### gs

> `readonly` **gs**: [`GsSegment`](#gssegment)

##### transactions

> `readonly` **transactions**: readonly [`X12TransactionSet`](#x12transactionset)[]

***

### X12HealthCoverage

Decoded Loop 2300 health coverage (`HD`) plus its attached dates (`DTP`)
and monetary amounts (`AMT`). `insuranceLineCode` is HD-03 (`HLT`, `DEN`,
`VIS`, …); `maintenanceTypeCode` is HD-01 - the per-coverage echo of the
member action, validated against the same X12 0875 snapshot as INS-03.

#### Example

```ts
import type { X12HealthCoverage } from "@cosyte/x12";
declare const c: X12HealthCoverage;
c.insuranceLineCode;       // "HLT"
c.planCoverageDescription; // "GOLD PPO"
c.dates[0]?.qualifier;     // "348" benefit begin
```

#### Properties

##### amounts

> `readonly` **amounts**: readonly [`X12EnrollmentAmount`](#x12enrollmentamount)[]

##### coverageLevelCode

> `readonly` **coverageLevelCode**: `string` \| `undefined`

##### dates

> `readonly` **dates**: readonly [`X12EnrollmentDate`](#x12enrollmentdate)[]

##### insuranceLineCode

> `readonly` **insuranceLineCode**: `string` \| `undefined`

##### maintenanceTypeCode

> `readonly` **maintenanceTypeCode**: `string` \| `undefined`

##### maintenanceTypeDescription

> `readonly` **maintenanceTypeDescription**: `string` \| `undefined`

##### planCoverageDescription

> `readonly` **planCoverageDescription**: `string` \| `undefined`

***

### X12HierarchicalLevel

One HL segment captured during the walk. The 837 HL hierarchy is the
safety primitive: HL-01 is this level's id (sequential within the
transaction); HL-02 is the parent's id (empty when this is a top-level
HL); HL-03 is the level code (`20` Information Source = billing
provider, `22` Subscriber, `23` Dependent/patient); HL-04 is `1` when
any HL below it claims this as its parent, `0` otherwise.

**Parent-pointer integrity is the #1 safety property.** The walker
validates HL-02 references an earlier-emitted HL-01 in the same
transaction AND that the parent's HL-03 level is consistent with this
level (20 → 22; 22 → 23). Violations emit
`X12_HL_PARENT_MISMATCH` and `X12_HL_PARENT_LEVEL_INVALID` -
the parser NEVER silently re-numbers.

#### Example

```ts
import type { X12HierarchicalLevel } from "@cosyte/x12";
declare const hl: X12HierarchicalLevel;
hl.hlId;           // "1" (sequential within the transaction)
hl.parentHlId;     // undefined for billing-provider top level
hl.levelCode;      // "20"
hl.hasChild;       // "1"
```

#### Properties

##### hasChild

> `readonly` **hasChild**: `string`

##### hlId

> `readonly` **hlId**: `string`

##### levelCode

> `readonly` **levelCode**: `string`

##### parentHlId

> `readonly` **parentHlId**: `string` \| `undefined`

***

### X12Hl

One HL segment captured during an eligibility / claim-status walk. The
hierarchy is the structural safety primitive - see the module doc. The
verbatim declared `parentHlId` is always preserved even when it fails
validation (the parser never re-numbers).

#### Example

```ts
import type { X12Hl } from "@cosyte/x12";
declare const hl: X12Hl;
hl.hlId;       // "3"
hl.parentHlId; // "2" (undefined at the information-source top level)
hl.levelCode;  // "22" (Subscriber)
hl.hasChild;   // "1"
```

#### Properties

##### hasChild

> `readonly` **hasChild**: `string`

##### hlId

> `readonly` **hlId**: `string`

##### levelCode

> `readonly` **levelCode**: `string`

##### parentHlId

> `readonly` **parentHlId**: `string` \| `undefined`

***

### X12Inquiry

Top-level result of "./get-270.js".get270Inquiry. Carries the
transaction header, the information-source roots of the transmitted
hierarchy, every declared HL verbatim, and every warning raised while
walking.

#### Example

```ts
import { parseX12, get270Inquiry } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "270");
if (tx !== undefined) {
  const inquiry = get270Inquiry(ix.delimiters, tx);
  const sub = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];
  sub?.traces[0]?.referenceId;                    // trace the provider sent
  sub?.inquiries[0]?.serviceTypeCodes[0]?.code;   // "30"
}
```

#### Properties

##### header

> `readonly` **header**: [`X12InquiryHeader`](#x12inquiryheader-1) \| `undefined`

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12Hl`](#x12hl)[]

##### informationSources

> `readonly` **informationSources**: readonly [`X12InquirySource`](#x12inquirysource)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12InquiryAddress

A postal address (N3 + N4) attached to a name loop.

#### Example

```ts
import type { X12InquiryAddress } from "@cosyte/x12";
declare const a: X12InquiryAddress;
a.lines[0];   // "100 MAIN ST"
a.postalCode; // "43215"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12InquiryDate

A DTP date or date range. `formatQualifier` (DTP-02) is the element that
says WHICH: `D8` is a single `CCYYMMDD` date and `RD8` a
`CCYYMMDD-CCYYMMDD` range. It is preserved verbatim beside the value, so a
consumer never has to infer which one a `value` holds.

#### Example

```ts
import type { X12InquiryDate } from "@cosyte/x12";
declare const d: X12InquiryDate;
d.qualifier;       // "291" (plan) / "307" (eligibility)
d.formatQualifier; // "D8" or "RD8"
d.value;           // "20260601"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time period format qualifier (`D8` single, `RD8` range).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - the date or range, in the DTP-02 format.

***

### X12InquiryDependent

One dependent (Loop 2000D / 2100D / 2110D) - a patient who cannot be
identified as a subscriber in their own right. HL-03 is `23`. Carries its
OWN traces and inquiries and is never merged onto the subscriber it hangs
under.

#### Example

```ts
import type { X12InquiryDependent } from "@cosyte/x12";
declare const d: X12InquiryDependent;
d.name?.firstName;    // "BABY"
d.inquiries.length;   // the dependent's own requested service types
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12InquiryDate`](#x12inquirydate)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### inquiries

> `readonly` **inquiries**: readonly [`X12InquiryRequest`](#x12inquiryrequest)[]

##### name

> `readonly` **name**: [`X12InquiryName`](#x12inquiryname) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12InquiryReference`](#x12inquiryreference)[]

##### traces

> `readonly` **traces**: readonly [`X12InquiryTrace`](#x12inquirytrace)[]

***

### X12InquiryHeader

The BHT beginning-of-hierarchical-transaction header. `purposeCode`
(BHT-02) is `13` on a request; `referenceId` (BHT-03) is the submitter's
own identifier for the inquiry.

#### Example

```ts
import type { X12InquiryHeader } from "@cosyte/x12";
declare const h: X12InquiryHeader;
h.hierarchicalStructureCode; // "0022"
h.purposeCode;               // "13"
```

#### Properties

##### date

> `readonly` **date**: `string` \| `undefined`

BHT-04 - transaction creation date, CCYYMMDD.

##### hierarchicalStructureCode

> `readonly` **hierarchicalStructureCode**: `string`

BHT-01 - hierarchical structure code.

##### purposeCode

> `readonly` **purposeCode**: `string`

BHT-02 - transaction set purpose code.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

BHT-03 - submitter transaction identifier.

##### time

> `readonly` **time**: `string` \| `undefined`

BHT-05 - transaction creation time.

***

### X12InquiryName

An NM1 name loop, plus the N3 / N4 address and DMG demographics that follow
it. ONE type covers every level, because NM1 is one segment: NM1-03 is
"name last or organization name", so a payer fills it and a member fills it,
and splitting the type by level would mean this reader deciding which kind
of party a level holds. `entityTypeQualifier` (NM1-02) is the sender's own
statement of that (`1` person, `2` non-person) and is preserved verbatim.

#### Example

```ts
import type { X12InquiryName } from "@cosyte/x12";
declare const n: X12InquiryName;
n.entityIdentifierCode;          // "IL" subscriber / "PR" payer / "1P" provider
n.lastNameOrOrganizationName;    // "DOE" or "MEDPAY INSURANCE"
n.dateOfBirth;                   // "19850515" (DMG-02, CCYYMMDD)
```

#### Properties

##### address

> `readonly` **address**: [`X12InquiryAddress`](#x12inquiryaddress) \| `undefined`

N3 + N4 postal address, absent when the level transmitted neither.

##### dateOfBirth

> `readonly` **dateOfBirth**: `string` \| `undefined`

DMG-02 - date of birth.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

NM1-04 - first name.

##### genderCode

> `readonly` **genderCode**: `string` \| `undefined`

DMG-03 - gender code.

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

NM1-09 - identification code.

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

NM1-08 - identification code qualifier.

##### lastNameOrOrganizationName

> `readonly` **lastNameOrOrganizationName**: `string` \| `undefined`

NM1-03 - last name, or the organization name for a non-person.

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

NM1-05 - middle name.

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

NM1-07 - name suffix.

***

### X12InquiryProcedure

The EQ-02 composite medical procedure identifier, exposed as its SEPARATED
components. It is never handed back as one joined string: the component
separator is framing, so joining it into a value would make two documents
that differ only in their declared delimiters decode to different models.

#### Example

```ts
import type { X12InquiryProcedure } from "@cosyte/x12";
declare const p: X12InquiryProcedure;
p.qualifier;    // "HC" (EQ-02-1, product/service id qualifier)
p.code;         // "99213" (EQ-02-2)
p.modifiers[0]; // "25" (EQ-02-3 onward)
```

#### Properties

##### code

> `readonly` **code**: `string` \| `undefined`

EQ-02-2 - the procedure code.

##### description

> `readonly` **description**: `string` \| `undefined`

EQ-02-7 - procedure description.

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

EQ-02-3 through EQ-02-6 - procedure modifiers, in transmitted order.

##### qualifier

> `readonly` **qualifier**: `string`

EQ-02-1 - product or service id qualifier.

***

### X12InquiryReceiver

One information receiver (Loop 2000B / 2100B) - the provider asking. HL-03
is `21` and its HL-02 names an information source.

#### Example

```ts
import type { X12InquiryReceiver } from "@cosyte/x12";
declare const r: X12InquiryReceiver;
r.name?.idCode;        // the asking provider's identifier
r.subscribers.length;  // 1
```

#### Properties

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12InquiryName`](#x12inquiryname) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12InquiryReference`](#x12inquiryreference)[]

##### subscribers

> `readonly` **subscribers**: readonly [`X12InquirySubscriber`](#x12inquirysubscriber)[]

***

### X12InquiryReference

A REF supplemental identifier on a level or on an inquiry.

#### Example

```ts
import type { X12InquiryReference } from "@cosyte/x12";
declare const r: X12InquiryReference;
r.qualifier; // "6P" (group number)
r.value;     // "GROUP0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### X12InquiryRequest

One eligibility or benefit inquiry (`EQ`, Loop 2110C / 2110D) - a single
thing the provider asked about, with the REF identifiers and DTP dates
transmitted under it.

#### Example

```ts
import type { X12InquiryRequest } from "@cosyte/x12";
declare const q: X12InquiryRequest;
q.serviceTypeCodes[0]?.code;        // "30"
q.serviceTypeCodes[0]?.description; // "Health Benefit Plan Coverage"
q.coverageLevelCode;                // "IND"
```

#### Properties

##### coverageLevelCode

> `readonly` **coverageLevelCode**: `string` \| `undefined`

EQ-03 - coverage level code.

##### dates

> `readonly` **dates**: readonly [`X12InquiryDate`](#x12inquirydate)[]

DTP dates transmitted under this inquiry.

##### diagnosisCodePointers

> `readonly` **diagnosisCodePointers**: readonly `string`[]

EQ-05 - diagnosis code pointers, as separated components.

##### insuranceTypeCode

> `readonly` **insuranceTypeCode**: `string` \| `undefined`

EQ-04 - insurance type code.

##### procedure

> `readonly` **procedure**: [`X12InquiryProcedure`](#x12inquiryprocedure) \| `undefined`

EQ-02 - the requested procedure, as its separated components.

##### references

> `readonly` **references**: readonly [`X12InquiryReference`](#x12inquiryreference)[]

REF identifiers transmitted under this inquiry.

##### serviceTypeCodes

> `readonly` **serviceTypeCodes**: readonly [`X12InquiryServiceType`](#x12inquiryservicetype)[]

EQ-01 - one or more requested Service Type Codes (a repeating element).

***

### X12InquiryServiceType

A requested Service Type Code (EQ-01, X12 external code source 1365). The
verbatim `code` is ALWAYS preserved; `description` resolves from the
bundled snapshot the 271 reader already consumes, and is `undefined`
outside it. The code is never replaced by its description.

#### Example

```ts
import type { X12InquiryServiceType } from "@cosyte/x12";
declare const st: X12InquiryServiceType;
st.code;        // "30"
st.description; // "Health Benefit Plan Coverage"
```

#### Properties

##### code

> `readonly` **code**: `string`

##### description

> `readonly` **description**: `string` \| `undefined`

***

### X12InquirySource

One information source (Loop 2000A / 2100A) - the payer the inquiry is put
to. The root of a transmitted hierarchy: HL-03 is `20` and HL-02 is absent.

#### Example

```ts
import type { X12InquirySource } from "@cosyte/x12";
declare const s: X12InquirySource;
s.name?.lastNameOrOrganizationName; // "MEDPAY INSURANCE"
s.receivers.length;                 // 1
```

#### Properties

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12InquiryName`](#x12inquiryname) \| `undefined`

##### receivers

> `readonly` **receivers**: readonly [`X12InquiryReceiver`](#x12inquiryreceiver)[]

##### references

> `readonly` **references**: readonly [`X12InquiryReference`](#x12inquiryreference)[]

***

### X12InquirySubscriber

One subscriber (Loop 2000C / 2100C / 2110C) - the member the inquiry is
about, or the member a dependent hangs under. HL-03 is `22`.

#### Example

```ts
import type { X12InquirySubscriber } from "@cosyte/x12";
declare const s: X12InquirySubscriber;
s.name?.idCode;                        // member identifier as transmitted
s.inquiries[0]?.serviceTypeCodes[0];   // requested service type
s.dependents.length;                   // 0
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12InquiryDate`](#x12inquirydate)[]

##### dependents

> `readonly` **dependents**: readonly [`X12InquiryDependent`](#x12inquirydependent)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### inquiries

> `readonly` **inquiries**: readonly [`X12InquiryRequest`](#x12inquiryrequest)[]

##### name

> `readonly` **name**: [`X12InquiryName`](#x12inquiryname) \| `undefined`

##### references

> `readonly` **references**: readonly [`X12InquiryReference`](#x12inquiryreference)[]

##### traces

> `readonly` **traces**: readonly [`X12InquiryTrace`](#x12inquirytrace)[]

***

### X12InquiryTrace

A reassociation trace (TRN) transmitted with the inquiry. **TRN-02 is the
value the answering 271 must echo verbatim**, which is what lets the
provider match the answer to this question.

#### Example

```ts
import type { X12InquiryTrace } from "@cosyte/x12";
declare const t: X12InquiryTrace;
t.traceTypeCode; // "1" (current transaction trace numbers)
t.referenceId;   // "ELIG20260601001"
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - the trace number a 271 echoes back.

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### X12Interchange

The top-level X12 interchange returned by `parseX12`. `isa` carries the
envelope header verbatim; `delimiters` is the four-class delimiter set
detected from fixed positions inside `isa.raw`; `groups` is the ordered
GS..GE list; `orphanSegments` holds any segment that fell outside every
transaction set (empty for a well-formed interchange); `warnings`
accumulates every Tier-2 deviation observed during the parse (lenient
mode); `trailingBytes` (when present) is any non-empty content after IEA -
preserved verbatim so a consumer can inspect or re-emit it.

#### Example

```ts
import { parseX12 } from "@cosyte/x12";
const ix = parseX12(raw);
for (const w of ix.warnings) console.warn(w.code, w.position);
```

#### Properties

##### delimiters

> `readonly` **delimiters**: [`Delimiters`](#delimiters)

##### groups

> `readonly` **groups**: readonly [`X12FunctionalGroup`](#x12functionalgroup)[]

##### iea

> `readonly` **iea**: [`IeaSegment`](#ieasegment) \| `undefined`

##### isa

> `readonly` **isa**: [`IsaSegment`](#isasegment)

##### orphanSegments

> `readonly` **orphanSegments**: readonly [`X12OrphanSegment`](#x12orphansegment)[]

Segments the envelope grammar could not place, in input order - almost
always because they fell outside every ST..SE transaction set, plus the
`TA1`-inside-a-group case, which is lifted out of the transaction it
arrived in. Empty for a well-formed interchange. See
[X12OrphanSegment](#x12orphansegment).

##### profile?

> `readonly` `optional` **profile?**: [`X12Profile`](#x12profile)

The trading-partner [X12Profile](#x12profile) in effect for this parse, if any -
either passed explicitly via `options.profile` or resolved from the
process-scoped default. Present only when a profile applied; used for
attribution and as the partition basis for `partitionWarnings`.

##### ta1Segments

> `readonly` **ta1Segments**: readonly [`Ta1Segment`](#ta1segment)[]

##### trailingBytes?

> `readonly` `optional` **trailingBytes?**: `string`

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12LineAdjudication

Decoded SVD + adjacent CAS / DTP - Line Adjudication Information (Loop
2430). Captures another payer's prior adjudication of THIS line so the
downstream payer has the COB context. The `adjustments` re-use the
remit `X12RemitAdjustment` shape since the CAS semantics are identical
to those on the 835.

`procedureCode` is SVD-03-2 (verbatim) - the adjudicated procedure
code as the other payer recorded it. May differ from the line's SV
procedure code if the other payer remapped.

#### Example

```ts
import type { X12LineAdjudication } from "@cosyte/x12";
declare const a: X12LineAdjudication;
a.otherPayerId;             // "84320" (the other payer's id)
a.amountPaid?.toString();   // "50.00", or undefined if none decoded
a.procedureCode;            // "99213"
a.adjustments[0]?.groupCode;// "CO"
a.dateAdjudicated;          // "20260520" CCYYMMDD verbatim
```

#### Properties

##### adjustments

> `readonly` **adjustments**: readonly [`X12RemitAdjustment`](#x12remitadjustment)[]

##### amountPaid

> `readonly` **amountPaid**: [`X12Decimal`](#x12decimal) \| `undefined`

SVD-02, the amount the other payer paid on this line. `undefined` where
this library decoded no value from that element - absent, empty, or
bytes that do not decode (which also emits `X12_UNPARSEABLE_DECIMAL`).
Through `0.0.12` both cases read `X12Decimal.ZERO`, indistinguishable
from a payer that adjudicated the line to nothing.

##### dateAdjudicated

> `readonly` **dateAdjudicated**: `string` \| `undefined`

##### otherPayerId

> `readonly` **otherPayerId**: `string`

##### paidUnits

> `readonly` **paidUnits**: [`X12Decimal`](#x12decimal) \| `undefined`

##### procedureCode

> `readonly` **procedureCode**: `string` \| `undefined`

##### procedureQualifier

> `readonly` **procedureQualifier**: `string` \| `undefined`

***

### X12LineDrug

Decoded LIN + CTP - Drug Identification (837P Loop 2410). Surfaces the
NDC and the optional dispensed-quantity + UCUM unit. `qualifier`
= `N4` NDC (overwhelmingly common), `EN` EAN/UCC-13, `HI` HIBC.

#### Example

```ts
import type { X12LineDrug } from "@cosyte/x12";
declare const d: X12LineDrug;
d.qualifier;                // "N4"
d.code;                     // verbatim NDC
d.quantity?.toString();     // "1.50"
d.unitOfMeasure;            // "ML" UCUM milliliter
```

#### Properties

##### code

> `readonly` **code**: `string`

##### qualifier

> `readonly` **qualifier**: `string`

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

##### unitOfMeasure

> `readonly` **unitOfMeasure**: `string` \| `undefined`

***

### X12OrphanSegment

A segment the envelope grammar has no place for, captured verbatim rather
than discarded. Every segment recorded here also raised exactly one
`X12_UNEXPECTED_SEGMENT` warning whose `position.segmentIndex` equals
[segmentIndex](#segmentindex-1), and `context` is that warning's library-owned
discriminant, so the two surfaces can be joined without string matching.

These are structural anomalies, not a normal shape: a stray segment
between `GE` and `IEA`, a body segment between an `SE` and its group's
`GE`, a body segment between `GS` and the first `ST`, an `ST` with no open
group, an `SE` closing nothing, a `GE` closing nothing, or a `TA1` inside
an open functional group. The parser cannot place any of them in the typed
tree, but it no longer drops them either, so a segment that used to vanish
is now readable here.

**Most of these sit outside every ST..SE transaction set, but the `TA1`
case does not.** `TA1` is envelope-level by spec, so a `TA1` anywhere
inside an open group is routed here even when it arrives BETWEEN an `ST`
and its `SE` - in which case it is lifted out of that transaction's
`segments` / `rawSegments` and appears only on this array. That is
long-standing behaviour (it predates this array; the segment simply used
to be discarded), and it is the one case where `ix.groups` is not the whole
typed model.

**`serializeX12` re-emits these, at [anchor](#anchor)**, so an orphan and its
`X12_UNEXPECTED_SEGMENT` warning both survive a round trip. Placement is by
the structural anchor and NEVER by [segmentIndex](#segmentindex-1): that index is an
index into the INPUT stream, and the emit is not in input order (it hoists
`ta1Segments` ahead of the groups and skips the zero-length segment a
doubled terminator produces), so replaying by index splices an orphan into
whatever occupies that slot - measurably, into an 835's `ST..SE` body,
where a re-parse reports nothing at all. Use [segmentIndex](#segmentindex-1) to join
back to the warning, not to place the segment. See `KNOWN-LIMITATIONS.md`.

One thing is NOT recorded here: a doubled segment terminator delimits a
zero-length segment carrying no elements, so there is nothing to retain.
A segment whose first element is empty (`*A*B~`) IS recorded: it has no id
for the envelope walker to dispatch on, so its `segment.id` is empty, but it
carries values, and it is warned, kept and re-emitted like any other body
segment outside a transaction.

**This is document content, so treat it as PHI.** Unlike an
`X12ParseWarning`, whose `message` is a lookup into a frozen registry and
whose metadata is positional only, an orphan carries the sender's bytes
verbatim, exactly as `X12TransactionSet.rawSegments` and `isa.raw` do. A
segment outside a transaction is not required to be PHI-free, so do NOT
log this array wholesale when triaging; log `context` and `segmentIndex`,
which name the structural rule and the location without echoing content.

#### Example

```ts
import { parseX12 } from "@cosyte/x12";
const ix = parseX12(raw);
for (const o of ix.orphanSegments) {
  console.warn(o.context, o.segmentIndex, o.segment.id);
}
```

#### Properties

##### anchor

> `readonly` **anchor**: [`X12OrphanAnchor`](#x12orphananchor)

Where the segment sat in the typed tree - the slot `serializeX12` puts it
back into. See [X12OrphanAnchor](#x12orphananchor) for why a structural anchor and not
[segmentIndex](#segmentindex-1) is what makes re-emission sound.

##### context

> `readonly` **context**: [`X12UnexpectedSegmentContext`](#x12unexpectedsegmentcontext)

Which structural rule the segment broke.

##### raw

> `readonly` **raw**: `string`

The verbatim segment text, segment terminator stripped.

##### segment

> `readonly` **segment**: [`X12Segment`](#x12segment)

The decoded segment (id + 1-indexed elements), as for any body segment.

##### segmentIndex

> `readonly` **segmentIndex**: `number`

Global segment index in the post-ISA stream (ISA itself is index 0) -
identical to the `position.segmentIndex` of the segment's
`X12_UNEXPECTED_SEGMENT` warning.

***

### X12OtherSubscriber

Decoded Loop 2320 - Other Subscriber Information. Captures the SBR-01
payer responsibility code and the associated other-subscriber / other-
payer NM1 entities; this reader records the surface so a consumer knows
COB exists. Detailed CAS / OI / MOA breakdown inside Loop 2320 is
deferred to the profile system (it tracks one payer's specific
adjudication and
is rarely needed for outbound claim creation).

#### Example

```ts
import type { X12OtherSubscriber } from "@cosyte/x12";
declare const o: X12OtherSubscriber;
o.payerResponsibilityCode; // "S" secondary
o.otherSubscriber?.name;    // verbatim
o.otherPayer?.name;         // verbatim
```

#### Properties

##### claimFilingIndicator

> `readonly` **claimFilingIndicator**: `string` \| `undefined`

##### individualRelationshipCode

> `readonly` **individualRelationshipCode**: `string` \| `undefined`

##### otherPayer

> `readonly` **otherPayer**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### otherSubscriber

> `readonly` **otherSubscriber**: [`X12ClaimEntity`](#x12claimentity) \| `undefined`

##### payerResponsibilityCode

> `readonly` **payerResponsibilityCode**: `string`

***

### X12ParseOptions

Options accepted by `parseX12` to tune lenient/strict behaviour. Every
field is optional; `parseX12(raw, {})` is valid and produces the library
defaults.

#### Remarks

With `exactOptionalPropertyTypes: true`, callers cannot pass
`{ strict: undefined }` - either omit the key or pass a boolean.

#### Example

```ts
import { parseX12, type X12ParseOptions } from "@cosyte/x12";
const opts: X12ParseOptions = {
  strict: true,
  onWarning: (w) => console.warn(w.code),
};
parseX12(raw, opts);
```

#### Properties

##### onWarning?

> `readonly` `optional` **onWarning?**: [`OnWarningCallback`](#onwarningcallback)

##### profile?

> `readonly` `optional` **profile?**: [`X12Profile`](#x12profile) \| `null`

A trading-partner [X12Profile](#x12profile) to attach to the result. An explicit
profile ALWAYS wins over any process-scoped default; pass `null` to opt
out of the default for a single call. When omitted, `parseX12` consults
`getDefaultProfile()`. The profile is attached as `ix.profile` for
attribution and consumed by `partitionWarnings`; it does not alter the
lenient parse itself (v1 profiles are descriptive - see the profile
subsystem docs).

##### strict?

> `readonly` `optional` **strict?**: `boolean`

***

### X12ParseWarning

Data shape for every Tier-2 warning emitted by the parser. Warnings are
plain data (distinct from `X12ParseError`, which is a thrown `Error`
subclass) so they can be safely accumulated on `X12Interchange.warnings`
and passed to `onWarning` callbacks.

`message` is always a member of [ALL\_WARNING\_MESSAGES](#all_warning_messages): it names
the deviation, never the bytes that caused it. `position` says where to
look and the bytes stay on the model. A warning has no `snippet`.

#### Example

```ts
import type { X12ParseWarning } from "@cosyte/x12";
declare const w: X12ParseWarning;
w.code; // "X12_PRE_005010"
w.position; // { segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }
```

#### Properties

##### code

> `readonly` **code**: [`X12WarningCode`](#x12warningcode)

##### message

> `readonly` **message**: `string`

##### position

> `readonly` **position**: [`X12Position`](#x12position)

***

### X12Position

Positional context attached to every warning and fatal error. Fields are
1-indexed against the X12 spec convention (interchange first, then group,
then transaction, then segment, then element within that segment, then
component within that element).

All fields past `segmentIndex` are optional - for a top-level fatal like
`X12_EMPTY_INPUT` only `segmentIndex: 0` is populated; for a per-element
warning deep inside a transaction every field may be set.

#### Remarks

With `exactOptionalPropertyTypes: true`, do not pass `interchangeIndex:
undefined` explicitly - omit the key instead.

#### Example

```ts
import type { X12Position } from "@cosyte/x12";
const pos: X12Position = { segmentIndex: 0, interchangeIndex: 0 };
```

#### Properties

##### componentIndex?

> `readonly` `optional` **componentIndex?**: `number`

##### elementIndex?

> `readonly` `optional` **elementIndex?**: `number`

##### groupIndex?

> `readonly` `optional` **groupIndex?**: `number`

##### interchangeIndex?

> `readonly` `optional` **interchangeIndex?**: `number`

##### repetitionIndex?

> `readonly` `optional` **repetitionIndex?**: `number`

##### segmentIndex

> `readonly` **segmentIndex**: `number`

##### transactionIndex?

> `readonly` `optional` **transactionIndex?**: `number`

***

### X12PremiumAddress

Decoded N3 + N4 address block attached to a party. `lines` is the N3
address lines (1-2 entries); `city` / `state` / `postalCode` come from
N4. All verbatim - no normalization.

#### Example

```ts
import type { X12PremiumAddress } from "@cosyte/x12";
declare const a: X12PremiumAddress;
a.lines[0];   // "500 CORPORATE BLVD"
a.city;       // "COLUMBUS"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12PremiumAdjustment

Decoded ADX - Adjustment to a premium remittance. `amount` is ADX-01
(signed monetary adjustment); `reasonCode` is ADX-02 (adjustment reason -
`"52"` credit memo, `"53"` debit memo, …); the optional
`referenceQualifier` / `referenceId` (ADX-03 / ADX-04) tie the adjustment
to a prior item.

#### Example

```ts
import type { X12PremiumAdjustment } from "@cosyte/x12";
declare const a: X12PremiumAdjustment;
a.amount.toString(); // "-25.00"
a.reasonCode;        // "53"
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

##### reasonCode

> `readonly` **reasonCode**: `string`

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

##### referenceQualifier

> `readonly` **referenceQualifier**: `string` \| `undefined`

***

### X12PremiumDate

Decoded DTM date attached to the header or a remittance loop. `qualifier`
is the date/time qualifier (DTM-01); `value` is the verbatim CCYYMMDD
(DTM-02). No normalization.

#### Example

```ts
import type { X12PremiumDate } from "@cosyte/x12";
declare const d: X12PremiumDate;
d.qualifier; // "582" (report period)
d.value;     // "20260601"
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12PremiumEntity

Decoded ENT - Entity (organization-summary remittance). `assignedNumber`
is ENT-01; the entity is identified by ENT-02 (entity id code) plus the
ENT-03 / ENT-04 qualifier + id. All verbatim.

#### Example

```ts
import type { X12PremiumEntity } from "@cosyte/x12";
declare const e: X12PremiumEntity;
e.assignedNumber;          // "1"
e.entityIdentifierCode;    // "2J" (correspondent)
e.idCode;                  // "GRP-0001"
```

#### Properties

##### assignedNumber

> `readonly` **assignedNumber**: `string` \| `undefined`

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

***

### X12PremiumOpenItem

Decoded RMR - Remittance Advice Accounts Receivable Open Item Reference.
The premium-line unit: a policy / invoice reference plus the amount paid
and (optionally) the amount due. `qualifier` is RMR-01 (reference id
qualifier - `"11"` account number, `"IK"` invoice, `"AZ"` health-insurance
policy number); `referenceId` is RMR-02; `amountPaid` is RMR-04;
`amountDue` is RMR-05.

#### Example

```ts
import type { X12PremiumOpenItem } from "@cosyte/x12";
declare const o: X12PremiumOpenItem;
o.qualifier;             // "AZ"
o.referenceId;           // "POL-0001"
o.amountPaid?.toString(); // "250.00", or undefined if none decoded
```

#### Properties

##### amountDue

> `readonly` **amountDue**: [`X12Decimal`](#x12decimal) \| `undefined`

##### amountPaid

> `readonly` **amountPaid**: [`X12Decimal`](#x12decimal) \| `undefined`

RMR-04, the amount paid against this open item. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state.

##### paymentActionCode

> `readonly` **paymentActionCode**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### referenceId

> `readonly` **referenceId**: `string`

***

### X12PremiumParty

Decoded Loop 1000A (Premium Receiver, `N1*PE`) or Loop 1000B (Premium
Payer / Remitter, `N1*PR` / `N1*RM`) party. Uniform shape so a consumer
can read both by role. Names + addresses here are PII (organizational),
not PHI in the §164.514 sense - member identity lives on the per-member
remittance detail.

#### Example

```ts
import type { X12PremiumParty } from "@cosyte/x12";
declare const payer: X12PremiumParty;
payer.name;     // "EMPLOYER CO"
payer.idCode;   // "FEIN123" (verbatim)
```

#### Properties

##### address

> `readonly` **address**: [`X12PremiumAddress`](#x12premiumaddress) \| `undefined`

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

##### references

> `readonly` **references**: readonly [`X12PremiumReference`](#x12premiumreference)[]

***

### X12PremiumPaymentHeader

Decoded BPR - Financial Information / payment header (identical segment
shape to the 835). `totalPremiumAmount` is BPR-02, the aggregate premium
the bank actually moved; `method` is BPR-04 (`ACH` / `CHK` / `NON` / …).

#### Example

```ts
import type { X12PremiumPaymentHeader } from "@cosyte/x12";
declare const p: X12PremiumPaymentHeader;
p.totalPremiumAmount?.toString(); // "12500.00", or undefined if none decoded
p.method;                         // "ACH"
p.paymentDate;                    // "20260601" (CCYYMMDD, verbatim)
```

#### Properties

##### creditDebitFlag

> `readonly` **creditDebitFlag**: `string`

BPR-03 credit/debit flag. Spec-defined `"C"` (credit) or `"D"` (debit);
typed `string` to preserve any verbatim non-spec value from a quirky
sender.

##### method

> `readonly` **method**: `string`

##### paymentDate

> `readonly` **paymentDate**: `string`

##### paymentFormatCode

> `readonly` **paymentFormatCode**: `string` \| `undefined`

##### totalPremiumAmount

> `readonly` **totalPremiumAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

BPR-02, the aggregate premium moved. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state.

##### transactionHandlingCode

> `readonly` **transactionHandlingCode**: `string`

***

### X12PremiumPayments

The top-level result returned by "./get-820.js".get820Payments.
Carries the payment header (BPR), reassociation traces (TRN), the premium
receiver + remitter parties (Loop 1000A / 1000B), every organization /
individual remittance detail loop (Loop 2000 → RMR / ADX), and every
warning surfaced during the walk.

#### Example

```ts
import { parseX12, get820Payments } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
if (tx !== undefined) {
  const prem = get820Payments(ix.delimiters, tx);
  prem.payment.totalPremiumAmount.toString();
  for (const r of prem.remittances) {
    r.openItems[0]?.amountPaid.toString();
  }
}
```

#### Properties

##### payment

> `readonly` **payment**: [`X12PremiumPaymentHeader`](#x12premiumpaymentheader)

##### receiver

> `readonly` **receiver**: [`X12PremiumParty`](#x12premiumparty) \| `undefined`

##### remittances

> `readonly` **remittances**: readonly [`X12PremiumRemittance`](#x12premiumremittance)[]

##### remitter

> `readonly` **remitter**: [`X12PremiumParty`](#x12premiumparty) \| `undefined`

##### traces

> `readonly` **traces**: readonly [`X12PremiumTrace`](#x12premiumtrace)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12PremiumPerson

Decoded NM1 individual (member) inside an individual remittance loop. PHI
surface: every field carries PHI.

#### Example

```ts
import type { X12PremiumPerson } from "@cosyte/x12";
declare const p: X12PremiumPerson;
p.entityIdentifierCode; // "IL" insured
p.lastName;             // verbatim
p.idQualifier;          // "34" SSN / "ZZ" mutually defined
p.idCode;               // verbatim member id
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12PremiumReference

Decoded REF segment - supplemental identifier (master policy number, plan
id, version). `qualifier` is the X12 reference-identification qualifier;
`value` is the verbatim id.

#### Example

```ts
import type { X12PremiumReference } from "@cosyte/x12";
declare const r: X12PremiumReference;
r.qualifier; // "38" (master policy number)
r.value;     // "POL-0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12PremiumRemittance

Decoded Loop 2000 remittance entry - one organization-summary (`ENT`) or
individual (`NM1`) remittance. Carries the open-item references (RMR), the
adjustments (ADX), and any REF / DTM context. The entity / individual
name fields carry PII / PHI (member name + id) - surfaced verbatim, never
echoed in a warning, never normalized.

#### Example

```ts
import type { X12PremiumRemittance } from "@cosyte/x12";
declare const r: X12PremiumRemittance;
r.individual?.lastName;          // verbatim member surname
r.openItems[0]?.referenceId;     // policy / invoice number
r.openItems[0]?.amountPaid.toString(); // "250.00"
```

#### Properties

##### adjustments

> `readonly` **adjustments**: readonly [`X12PremiumAdjustment`](#x12premiumadjustment)[]

##### dates

> `readonly` **dates**: readonly [`X12PremiumDate`](#x12premiumdate)[]

##### entity

> `readonly` **entity**: [`X12PremiumEntity`](#x12premiumentity) \| `undefined`

##### individual

> `readonly` **individual**: [`X12PremiumPerson`](#x12premiumperson) \| `undefined`

##### openItems

> `readonly` **openItems**: readonly [`X12PremiumOpenItem`](#x12premiumopenitem)[]

##### references

> `readonly` **references**: readonly [`X12PremiumReference`](#x12premiumreference)[]

***

### X12PremiumTrace

Decoded TRN - Reassociation Trace Number. Pairs the 820 to the
originating ACH / check artifact so the receiver can reconcile the
premium deposit. `referenceId` is the trace number a bank statement / ACH
addenda will carry.

#### Example

```ts
import type { X12PremiumTrace } from "@cosyte/x12";
declare const t: X12PremiumTrace;
t.traceTypeCode;        // "1" - Current Transaction Trace Numbers
t.referenceId;          // e.g. "PREM-202606" (verbatim)
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

##### originatingCompanySupplementalCode

> `readonly` **originatingCompanySupplementalCode**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string`

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

***

### X12Profile

A readonly, frozen profile produced by `defineProfile()`. Mirrors the
locked hl7 `Profile` shape (name / description / lineage) plus X12's
`quirks` axis and a structured `describe()`.

#### Example

```ts
import { parseX12, profiles } from "@cosyte/x12";
const ix = parseX12(raw, { profile: profiles.availity });
ix.profile?.name;          // "availity"
ix.profile?.describe().adds.length;
```

#### Properties

##### describe

> `readonly` **describe**: () => [`X12ProfileDescription`](#x12profiledescription-1)

###### Returns

[`X12ProfileDescription`](#x12profiledescription-1)

##### description?

> `readonly` `optional` **description?**: `string`

##### lineage

> `readonly` **lineage**: readonly `string`[]

##### name

> `readonly` **name**: `string`

##### quirks

> `readonly` **quirks**: readonly [`X12ProfileQuirk`](#x12profilequirk)[]

***

### X12ProfileConformancePartition

The rendered quirks of a profile, grouped by their conformance state. Every
quirk appears in exactly one of the three, and the three together are the
profile's whole quirk set, so a consumer can ask "does this profile record
anything a partner may not lawfully require?" without walking the effect
buckets. A profile with no quirks makes no conformance claim of any kind:
all three are empty.

#### Example

```ts
import { profiles } from "@cosyte/x12";
const { notPermitted } = profiles.availity.describe().conformance;
notPermitted.map((q) => q.id); // quirks 45 CFR 162.915 forbids requiring
```

#### Properties

##### notPermitted

> `readonly` **notPermitted**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

Quirks recorded as partner deviations 162.915 forbids requiring.

##### permitted

> `readonly` **permitted**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

Quirks recorded as ones a partner MAY lawfully require.

##### undetermined

> `readonly` **undetermined**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

Quirks with no recorded judgement. NOT a claim in either direction.

***

### X12ProfileDescription

Structured `describe()` output - the "what this profile relaxes / adds /
requires" record published with the package. Returned as DATA (not a
formatted string, unlike hl7) so downstream tooling - docs generators,
the `pathways` engine - can consume it programmatically.

Each bucketed quirk carries the conformance state it resolved to, so a
consumer reading a described deviation also reads whether a partner could
lawfully have required it. `requires` is a record of what a partner MANDATES
and never a claim that the standard supports the mandate: that question is
answered by `conformance` alone, and its default answer is "undetermined".

#### Example

```ts
import { profiles } from "@cosyte/x12";
const d = profiles.availity.describe();
d.adds.map((q) => q.id);          // ["payer-loop-ref-2u", "service-line-ref-f8"]
d.adds.map((q) => q.conformance); // ["undetermined", "undetermined"]
d.expectedWarnings;               // readonly X12WarningCode[]
```

#### Properties

##### adds

> `readonly` **adds**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

##### conformance

> `readonly` **conformance**: [`X12ProfileConformancePartition`](#x12profileconformancepartition)

The same quirks, grouped by conformance state instead of by effect. See
[X12ProfileConformancePartition](#x12profileconformancepartition); the states themselves are
documented on [X12ProfileConformance](#x12profileconformance).

##### description?

> `readonly` `optional` **description?**: `string`

##### expectedWarnings

> `readonly` **expectedWarnings**: readonly [`X12WarningCode`](#x12warningcode)[]

Sorted, de-duplicated union of every quirk's `expectedWarnings`.

##### lineage

> `readonly` **lineage**: readonly `string`[]

##### name

> `readonly` **name**: `string`

##### relaxes

> `readonly` **relaxes**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

##### requires

> `readonly` **requires**: readonly [`X12ClassifiedQuirk`](#x12classifiedquirk)[]

***

### X12ProfileQuirk

A single trading-partner deviation captured by a profile. Every quirk is
fixture-grounded: `fixture` points at a real Tier-2 corpus file that
demonstrates the deviation, and `sourceCategory` records where the quirk
was observed. This is the locked hard rule - a quirk without a
demonstrating fixture is forbidden, enforced both by this required field
and by the accuracy test.

#### Example

```ts
import type { X12ProfileQuirk } from "@cosyte/x12";
const quirk: X12ProfileQuirk = {
  id: "payer-loop-ref-2u",
  effect: "adds",
  summary: "Payer Loop 1000A carries a REF*2U additional payer identifier.",
  fixture: "remit/835-availity-quirk.edi",
  sourceCategory: "Availity 835 ERA companion guide - payer-loop REF",
};
```

#### Extended by

- [`X12ClassifiedQuirk`](#x12classifiedquirk)

#### Properties

##### conformance?

> `readonly` `optional` **conformance?**: [`X12ProfileConformance`](#x12profileconformance)

OPTIONAL recorded judgement of whether a trading partner may lawfully
require this deviation under 45 CFR 162.915. Omit it and the quirk
renders as [X12ProfileConformance](#x12profileconformance) `"undetermined"` - the fail-safe
default - so a profile written before this field existed keeps defining
and describing exactly as it did, and never gains a claim nobody made.

##### effect

> `readonly` **effect**: [`X12ProfileEffect`](#x12profileeffect)

Which `describe()` bucket this quirk renders into.

##### expectedWarnings?

> `readonly` `optional` **expectedWarnings?**: readonly [`X12WarningCode`](#x12warningcode)[]

Warning codes this quirk leads a consumer to EXPECT when the deviation
is present. Drives `partitionWarnings`. Often empty: the lenient parser
absorbs most corpus deviations with zero warnings, and that "lossless,
no warning" outcome is itself the documented behavior.

##### fixture

> `readonly` **fixture**: `string`

Path to the Tier-2 fixture demonstrating the deviation, relative to
`test/fixtures/` (e.g. `"remit/835-availity-quirk.edi"`). REQUIRED - the
locked hard rule. The accuracy test parses this file and asserts the
claimed deviation is present.

##### id

> `readonly` **id**: `string`

Stable, kebab-case identifier - unique within a profile's quirk set.

##### sourceCategory

> `readonly` **sourceCategory**: `string`

Where the deviation was observed (companion guide / corpus category).

##### summary

> `readonly` **summary**: `string`

One-line human summary. NEVER contains PHI - describes structure only.

***

### X12ProfileSpec

Input accepted by `defineProfile()`. Every field except `name` is
optional; `extends` composes parent profiles (lineage + quirks merge) the
same way hl7's `extends` does.

#### Example

```ts
import { defineProfile, profiles, type X12ProfileSpec } from "@cosyte/x12";
const spec: X12ProfileSpec = {
  name: "my-bcbs-regional",
  extends: profiles.bcbsCommon,
  quirks: [
    {
      id: "service-line-ref-f8",
      effect: "adds",
      summary: "Service line carries a REF*F8 original-reference identifier.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "regional BCBS 835 companion guide",
    },
  ],
};
const profile = defineProfile(spec);
```

#### Properties

##### description?

> `readonly` `optional` **description?**: `string`

##### extends?

> `readonly` `optional` **extends?**: [`X12Profile`](#x12profile) \| readonly [`X12Profile`](#x12profile)[]

##### name

> `readonly` **name**: `string`

##### quirks?

> `readonly` `optional` **quirks?**: readonly [`X12ProfileQuirk`](#x12profilequirk)[]

***

### X12RemitAddress

Decoded N3 + N4 address block attached to a party. `lines` is the N3
address lines (1-2 entries); `city`/`state`/`postalCode` come from N4.
All fields verbatim - no normalization (no proper-casing, no
postal-code canonicalization).

#### Example

```ts
import type { X12RemitAddress } from "@cosyte/x12";
declare const a: X12RemitAddress;
a.lines[0];     // "123 PAYER WAY"
a.city;         // "ANYTOWN"
a.state;        // "OH"
a.postalCode;   // "44113"
```

#### Properties

##### city

> `readonly` **city**: `string` \| `undefined`

##### countryCode

> `readonly` **countryCode**: `string` \| `undefined`

##### lines

> `readonly` **lines**: readonly `string`[]

##### postalCode

> `readonly` **postalCode**: `string` \| `undefined`

##### state

> `readonly` **state**: `string` \| `undefined`

***

### X12RemitAdjustment

Decoded CAS adjustment. One CAS segment carries up to 6 adjustment
triples (reason code + amount + optional quantity) all under the same
`groupCode` (CAS-01). The walker flattens these so each
[X12RemitAdjustment](#x12remitadjustment) is ONE adjustment, not one segment.

**`groupCode` is the safety primitive** - see
"../../code-lists/cagc.js".CLAIM\_ADJUSTMENT\_GROUP\_CODES. `CO`
= provider write-off; `PR` = patient owes; `OA` / `PI` = other / payer
edit. `reasonCode` is the CARC value (verbatim); `reasonDescription`
is from the bundled snapshot or `undefined` if outside the subset.

#### Example

```ts
import type { X12RemitAdjustment } from "@cosyte/x12";
declare const a: X12RemitAdjustment;
a.groupCode;             // "PR" (patient responsibility)
a.reasonCode;            // "1" (deductible)
a.reasonDescription;     // "Deductible Amount"
a.amount?.toString();    // "50.00", or undefined if none decoded
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal) \| `undefined`

The CAS adjustment amount for this triple. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### groupCode

> `readonly` **groupCode**: `string`

##### quantity

> `readonly` **quantity**: [`X12Decimal`](#x12decimal) \| `undefined`

##### reasonCode

> `readonly` **reasonCode**: `string`

##### reasonDescription

> `readonly` **reasonDescription**: `string` \| `undefined`

***

### X12RemitAmount

Decoded AMT segment - supplemental claim or service amount (allowed
charge, late filing penalty, capitation payment, etc.). `qualifier`
names which amount (`AU` coverage amount, `B6` allowed actual, …).
Surfaced verbatim; never folded into the balance invariant (which
checks only CLP / CAS / PLB / SVC fields).

#### Example

```ts
import type { X12RemitAmount } from "@cosyte/x12";
declare const a: X12RemitAmount;
a.qualifier; // "B6"
a.amount.toString(); // "450.00"
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

##### qualifier

> `readonly` **qualifier**: `string`

***

### X12RemitClaim

Decoded Loop 2100 - Claim Payment Information. The clinical-claim
unit: one provider-billed claim adjudicated by the payer. **Carries
the per-claim balance invariant** (`totalPaymentAmount +
patientResponsibilityAmount + Σ(claim-level adjustments) ===
totalChargeAmount`); a mismatch fires
`X12_835_REMIT_BALANCE_MISMATCH` and is NEVER silently rebalanced.

PHI surface: `patientControlNumber` (provider's account number),
`payerClaimControlNumber`, the patient name on NM1*QC, and member ID
on NM1*IL all carry PHI; the parser surfaces them verbatim, never
echoes them in warnings, and never normalizes.

#### Example

```ts
import type { X12RemitClaim } from "@cosyte/x12";
declare const c: X12RemitClaim;
c.patientControlNumber;          // "PT-ACCT-001"
c.totalChargeAmount?.toString();  // "500.00", or undefined if none decoded
c.totalPaymentAmount?.toString(); // "450.00", or undefined if none decoded
c.claimStatusCode;               // "1" - Processed as Primary
c.serviceLines.length;           // count of SVC loops
```

#### Properties

##### adjustments

> `readonly` **adjustments**: readonly [`X12RemitAdjustment`](#x12remitadjustment)[]

##### amounts

> `readonly` **amounts**: readonly [`X12RemitAmount`](#x12remitamount)[]

##### claimFilingIndicatorCode

> `readonly` **claimFilingIndicatorCode**: `string` \| `undefined`

##### claimFrequencyCode

> `readonly` **claimFrequencyCode**: `string` \| `undefined`

##### claimStatusCode

> `readonly` **claimStatusCode**: `string`

##### claimStatusDescription

> `readonly` **claimStatusDescription**: `string` \| `undefined`

##### correctedPatient

> `readonly` **correctedPatient**: [`X12RemitPerson`](#x12remitperson) \| `undefined`

##### facilityTypeCode

> `readonly` **facilityTypeCode**: `string` \| `undefined`

##### patient

> `readonly` **patient**: [`X12RemitPerson`](#x12remitperson) \| `undefined`

##### patientControlNumber

> `readonly` **patientControlNumber**: `string`

##### patientResponsibilityAmount

> `readonly` **patientResponsibilityAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

CLP-05, the patient responsibility amount. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### payerClaimControlNumber

> `readonly` **payerClaimControlNumber**: `string` \| `undefined`

##### references

> `readonly` **references**: readonly [`X12RemitReference`](#x12remitreference)[]

##### remarks

> `readonly` **remarks**: readonly [`X12RemitRemark`](#x12remitremark)[]

##### renderingProvider

> `readonly` **renderingProvider**: [`X12RemitProvider`](#x12remitprovider) \| `undefined`

##### serviceLines

> `readonly` **serviceLines**: readonly [`X12RemitServiceLine`](#x12remitserviceline)[]

##### servicePeriodEnd

> `readonly` **servicePeriodEnd**: `string` \| `undefined`

##### servicePeriodStart

> `readonly` **servicePeriodStart**: `string` \| `undefined`

##### serviceProvider

> `readonly` **serviceProvider**: [`X12RemitProvider`](#x12remitprovider) \| `undefined`

##### subscriber

> `readonly` **subscriber**: [`X12RemitPerson`](#x12remitperson) \| `undefined`

##### totalChargeAmount

> `readonly` **totalChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

CLP-03, the total submitted charge. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### totalPaymentAmount

> `readonly` **totalPaymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

CLP-04, the total amount paid on the claim. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

***

### X12RemitContact

Decoded PER contact segment. `contactFunctionCode` = `"BL"`
(Technical), `"CX"` (Payers' Claim Office), etc.; each contact may
carry up to 3 communication channels (TE/EX/EM/FX).

#### Example

```ts
import type { X12RemitContact } from "@cosyte/x12";
declare const c: X12RemitContact;
c.contactFunctionCode;       // "BL"
c.name;                       // "JANE COORDINATOR"
c.communications[0]?.qualifier; // "TE"
c.communications[0]?.value;     // "5551234567"
```

#### Properties

##### communications

> `readonly` **communications**: readonly `object`[]

##### contactFunctionCode

> `readonly` **contactFunctionCode**: `string`

##### name

> `readonly` **name**: `string` \| `undefined`

***

### X12RemitParty

Decoded Loop 1000A (Payer Identification) or Loop 1000B (Payee
Identification) party. The shape is uniform across both loops so a
consumer can iterate by role. PHI surface here: payer/payee names +
addresses + contact info are PII (payee may be an individual provider)
but NOT PHI in the §164.514 sense - patient identity lives on the
per-claim level.

#### Example

```ts
import type { X12RemitParty } from "@cosyte/x12";
declare const payer: X12RemitParty;
payer.name;     // "PAYER NAME"
payer.idCode;   // "12345" (NAIC / NPI / payer ID, verbatim)
```

#### Properties

##### additionalIdentifiers

> `readonly` **additionalIdentifiers**: readonly [`X12RemitReference`](#x12remitreference)[]

##### address

> `readonly` **address**: [`X12RemitAddress`](#x12remitaddress) \| `undefined`

##### contacts

> `readonly` **contacts**: readonly [`X12RemitContact`](#x12remitcontact)[]

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

***

### X12RemitPaymentHeader

Decoded BPR - Financial Information / payment header. The PAYMENT
MOVEMENT primitive: actual payment amount, credit/debit flag, method
(`ACH`/`CHK`/`NON`/`BOP`/`FWT`), payment date. **`totalActualPayment`
is the sum the bank actually moved**, and `BPR-02 === Σ(claim CLP-04) -
Σ(PLB amounts)` is the top-level balance invariant, with each PLB amount
in its raw EDI sign (a positive amount is a take-back).

#### Example

```ts
import type { X12RemitPaymentHeader } from "@cosyte/x12";
declare const p: X12RemitPaymentHeader;
p.totalActualPayment?.toString(); // "945.00", or undefined if none decoded
p.method;                         // "ACH"
p.paymentDate;                    // "20260601" (CCYYMMDD, verbatim)
```

#### Properties

##### creditDebitFlag

> `readonly` **creditDebitFlag**: `string`

BPR-03 credit/debit flag. Spec-defined values: `"C"` (credit - money
to provider, the normal case) or `"D"` (debit - refund / chargeback,
uncommon). The field is typed as `string` to preserve verbatim any
non-spec value from a quirky payer; consumers branching on it should
compare against the literals.

##### method

> `readonly` **method**: `string`

##### paymentDate

> `readonly` **paymentDate**: `string`

##### paymentFormatCode

> `readonly` **paymentFormatCode**: `string` \| `undefined`

##### totalActualPayment

> `readonly` **totalActualPayment**: [`X12Decimal`](#x12decimal) \| `undefined`

BPR-02, the amount the bank actually moved. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### transactionHandlingCode

> `readonly` **transactionHandlingCode**: `string`

***

### X12RemitPerson

Decoded NM1 person - patient, subscriber, or corrected patient. The
`idQualifier` distinguishes member ID (`MI`), Social Security
(`34` - rare, regulated), payer ID, etc. PHI surface: every field on
a person model carries PHI.

#### Example

```ts
import type { X12RemitPerson } from "@cosyte/x12";
declare const p: X12RemitPerson;
p.entityIdentifierCode; // "QC" patient / "IL" insured / "74" corrected patient
p.lastName;             // verbatim
p.idQualifier;          // "MI"
p.idCode;               // "MEMBER123"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12RemitProvider

Decoded NM1 provider - service provider (`82`), rendering provider
(`82` in some contexts), crossover carrier (`TT`), other payer
(`PR` / `GB`), etc. Same shape as a person but the qualifier semantics
are organizational.

#### Example

```ts
import type { X12RemitProvider } from "@cosyte/x12";
declare const r: X12RemitProvider;
r.entityIdentifierCode; // "82" service provider
r.name;                 // "RENDERING PROVIDER INC"
r.idQualifier;          // "XX" (NPI)
r.idCode;               // "1234567890"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string` \| `undefined`

***

### X12RemitProviderAdjustment

Decoded PLB - Provider-Level Adjustment. Off-claim adjustments
(recoupments, interest, capitation, write-offs) that move money at
the provider level, not the claim level. Each PLB segment carries up
to 6 adjustment triples (reason + amount); the walker flattens these
so each [X12RemitProviderAdjustment](#x12remitprovideradjustment) is one adjustment.

**Sign convention:** a POSITIVE PLB amount REDUCES the provider's
payment (recoupment / take-back); a NEGATIVE PLB amount ADDS to the
payment (interest / advance payment). The 835 balance invariant
`BPR-02 === Σ(claim CLP-04) - Σ(PLB amounts)` subtracts the amounts as
the wire states them, so a positive PLB lowers BPR-02 and a negative one
raises it.

`reasonCode` is the adjustment reason code, the first component of the
PLB composite (e.g. `WO`, withholding); `subCode` is its optional second
component, the reference identifier (e.g. `123456`, the claim the
withholding relates to). A composite sent as `WO:123456` reads as
`reasonCode: "WO"` and `subCode: "123456"`.

#### Example

```ts
import type { X12RemitProviderAdjustment } from "@cosyte/x12";
declare const p: X12RemitProviderAdjustment;
p.providerId;      // "1234567890" (NPI)
p.fiscalPeriodDate; // "20261231"
p.reasonCode;       // "WO" (withholding)
p.subCode;          // "123456" (related-claim reference)
p.amount?.toString();// "50.00", or undefined if none decoded
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal) \| `undefined`

The PLB adjustment amount, with its raw EDI sign. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### fiscalPeriodDate

> `readonly` **fiscalPeriodDate**: `string`

##### providerId

> `readonly` **providerId**: `string`

##### reasonCode

> `readonly` **reasonCode**: `string`

##### subCode

> `readonly` **subCode**: `string` \| `undefined`

***

### X12RemitReference

Decoded REF segment - additional identifier (Tax ID, payer ID,
supplemental). `qualifier` is the X12 reference-identification
qualifier (`"2U"` payer ID, `"TJ"` Tax ID, `"EV"` participant
receiver, `"D9"` claim number, …); `value` is the verbatim ID. Used on
payer / payee loops and on per-claim contexts.

#### Example

```ts
import type { X12RemitReference } from "@cosyte/x12";
declare const r: X12RemitReference;
r.qualifier; // "TJ"
r.value;     // "123456789"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12RemitRemark

Decoded remark segment (LQ at claim or service level). `system` is the
LQ-01 industry code system (`"HE"` healthcare remark codes /
RARC, `"RX"` reject-reason, etc.); `code` is the verbatim value;
`description` comes from the bundled RARC snapshot for `HE` codes,
`undefined` otherwise. Unknown HE codes also emit
`X12_UNKNOWN_RARC`.

#### Example

```ts
import type { X12RemitRemark } from "@cosyte/x12";
declare const r: X12RemitRemark;
r.system;        // "HE"
r.code;          // "N4"
r.description;   // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
```

#### Properties

##### code

> `readonly` **code**: `string`

##### description

> `readonly` **description**: `string` \| `undefined`

##### system

> `readonly` **system**: `string`

***

### X12RemitServiceLine

Decoded Loop 2110 - Service Payment Information. One per service line
adjudicated. Line-level CAS adjustments enter two balance invariants:
this line's own `SVC-02 === SVC-03 + Σ(line CAS)`, and the parent claim's
`CLP-03 === CLP-04 + Σ(claim CAS + line CAS)`. A mismatch in either fires
`X12_835_REMIT_BALANCE_MISMATCH`.

`productServiceIdQualifier` is the SVC-01-1 procedure-code system
(`HC` HCPCS/CPT, `AD` ADA dental, `N4` NDC, `WK` Advanced Billing
Concepts, `IV` HIPPS rate code, …); `productServiceId` is the verbatim
code. The qualifier governs interpretation - **misreading it picks
the wrong code system** and corrupts the clinical context.

X221A1 is reported to default an absent SVC-05 to one (secondhand, via
X12's RFI #2163 - this library has not read the TR3). This reader does
**not** apply that default, because fabricating a count the sender did not
send is inventing data. Apply it yourself if you want it.

**`undefined` on either quantity means "not decoded", not "absent".** The
element may have been missing, or present and unparseable as a decimal -
the two are not distinguished here and neither raises a warning. Read the
verbatim element off `tx.segments` if you need to tell them apart.

#### Example

```ts
import type { X12RemitServiceLine } from "@cosyte/x12";
declare const s: X12RemitServiceLine;
s.productServiceIdQualifier; // "HC"
s.productServiceId;          // "99213"
s.chargeAmount?.toString();  // "150.00", or undefined if none decoded
s.paymentAmount?.toString(); // "135.00", or undefined if none decoded
```

#### Properties

##### adjustments

> `readonly` **adjustments**: readonly [`X12RemitAdjustment`](#x12remitadjustment)[]

##### amounts

> `readonly` **amounts**: readonly [`X12RemitAmount`](#x12remitamount)[]

##### chargeAmount

> `readonly` **chargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-02, the line's submitted charge. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

##### originalServiceId

> `readonly` **originalServiceId**: `string` \| `undefined`

##### originalServiceIdQualifier

> `readonly` **originalServiceIdQualifier**: `string` \| `undefined`

##### originalUnitsOfService

> `readonly` **originalUnitsOfService**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-07 - Original Units of Service Count: the units as SUBMITTED. Sent
only when they differ from the paid count in SVC-05, so `undefined` here
does NOT mean zero submitted units - it means "same as paid".

##### paidUnitsOfService

> `readonly` **paidUnitsOfService**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-05 - Units of Service Paid Count: what the payer adjudicated.

##### paymentAmount

> `readonly` **paymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-03, the amount paid on the line. `undefined` where this library decoded no value
from that element - it was absent or empty, or it held bytes that do
not decode as a decimal (which also emits `X12_UNPARSEABLE_DECIMAL` at
its `elementIndex`). Through `0.0.12` both cases read
`X12Decimal.ZERO`, indistinguishable from an amount of zero the sender
did state, and the balance invariants summed that fabricated zero.

##### productServiceId

> `readonly` **productServiceId**: `string`

##### productServiceIdQualifier

> `readonly` **productServiceIdQualifier**: `string`

##### references

> `readonly` **references**: readonly [`X12RemitReference`](#x12remitreference)[]

##### remarks

> `readonly` **remarks**: readonly [`X12RemitRemark`](#x12remitremark)[]

##### revenueCode

> `readonly` **revenueCode**: `string` \| `undefined`

SVC-04 - NUBC revenue code. Absent on a professional line.

##### serviceDateEnd

> `readonly` **serviceDateEnd**: `string` \| `undefined`

##### serviceDateStart

> `readonly` **serviceDateStart**: `string` \| `undefined`

***

### X12Remittance

The top-level result returned by "./get-835.js".get835. Carries
the payment header (BPR), the trace (TRN), payer + payee identification
(Loop 1000A/1000B), every claim payment loop (Loop 2100 → Loop 2110),
provider-level adjustments (PLB), and every warning surfaced during the
walk - including the safety-critical "../../parser/warnings.js".WARNING\_CODES.X12\_835\_REMIT\_BALANCE\_MISMATCH.

#### Example

```ts
import { parseX12, get835 } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
if (tx !== undefined) {
  const remit = get835(ix.delimiters, tx);
  remit.payment.totalActualPayment.toString();
  for (const claim of remit.claims) {
    claim.totalChargeAmount.toString();
    claim.totalPaymentAmount.toString();
  }
}
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`X12RemitClaim`](#x12remitclaim)[]

##### payee

> `readonly` **payee**: [`X12RemitParty`](#x12remitparty) \| `undefined`

##### payer

> `readonly` **payer**: [`X12RemitParty`](#x12remitparty) \| `undefined`

##### payment

> `readonly` **payment**: [`X12RemitPaymentHeader`](#x12remitpaymentheader)

##### providerAdjustments

> `readonly` **providerAdjustments**: readonly [`X12RemitProviderAdjustment`](#x12remitprovideradjustment)[]

##### traces

> `readonly` **traces**: readonly [`X12RemitTrace`](#x12remittrace)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12RemitTrace

Decoded TRN - Reassociation Trace Number. Pairs the 835 to the
originating payer's payment artifact (ACH trace, check number) so a
cash-poster can reconcile. `referenceId` is the trace number a bank
statement / ACH addenda will carry; `originatingCompanyId` is the
payer's CMS-assigned (or proprietary) routing identifier.

#### Example

```ts
import type { X12RemitTrace } from "@cosyte/x12";
declare const t: X12RemitTrace;
t.traceTypeCode;             // "1" - Current Transaction Trace Numbers
t.referenceId;               // e.g. "12345" (verbatim)
t.originatingCompanyId;      // e.g. "1512345678"
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

##### originatingCompanySupplementalCode

> `readonly` **originatingCompanySupplementalCode**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string`

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

***

### X12ReviewDecision

The HCR Health Care Services Review decision (response only, Loop 2000E /
2000F). **`actionCode` (HCR-01) is the certification outcome and is
preserved verbatim** - the parser never infers an outcome.
`reviewIdentificationNumber` (HCR-02) is the authorization / certification
number a provider quotes back to the payer.

#### Example

```ts
import type { X12ReviewDecision } from "@cosyte/x12";
declare const d: X12ReviewDecision;
d.actionCode;                 // "A1" (certified in total)
d.reviewIdentificationNumber; // "AUTH123456"
d.reasonCode;                 // "0" (HCR-03, free-form decision reason)
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string`

##### reasonCode

> `readonly` **reasonCode**: `string` \| `undefined`

##### reviewIdentificationNumber

> `readonly` **reviewIdentificationNumber**: `string` \| `undefined`

##### secondSurgicalOpinionCode

> `readonly` **secondSurgicalOpinionCode**: `string` \| `undefined`

***

### X12Segment

Immutable decoded X12 segment. `elements` is 1-indexed: `elements[0]` is
the segment id placeholder (matching "./types.js".IsaSegment,
`GsSegment`, etc. - every typed segment in the envelope follows the same
1-indexed shape so consumers learn one rule and never have to recall
whether a particular accessor offsets by one). `raw` preserves the exact
segment text from input (terminator stripped) so a byte-exact round-trip
survives even when downstream stages mutate the model.

Element values are stored RAW (pre-`?`-unescape). Reads via [getSegmentValue](#getsegmentvalue) apply [unescapeRelease](#unescaperelease) on demand - this keeps
round-trip byte-exact while still letting helpers receive
spec-compliant logical values.

#### Example

```ts
import type { X12Segment } from "@cosyte/x12";
declare const seg: X12Segment;
seg.id;              // "NM1"
seg.elements[3];     // raw text of NM1-03 (post-element-split, pre-?-unescape)
```

#### Properties

##### elements

> `readonly` **elements**: readonly `string`[]

##### id

> `readonly` **id**: `string`

##### raw

> `readonly` **raw**: `string`

***

### X12ServiceLineStatus

One service-line status (Loop 2220). Triggered by an SVC; carries the
procedure / revenue identification, line amounts, and its own STC
statuses + REF / DTP.

#### Example

```ts
import type { X12ServiceLineStatus } from "@cosyte/x12";
declare const l: X12ServiceLineStatus;
l.procedureCode;                 // "99213"
l.lineChargeAmount?.toString();  // "150.00"
l.statuses[0]?.statuses[0]?.statusCode; // "20"
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12StatusDate`](#x12statusdate)[]

##### lineChargeAmount

> `readonly` **lineChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

##### linePaymentAmount

> `readonly` **linePaymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

##### procedureCode

> `readonly` **procedureCode**: `string` \| `undefined`

##### references

> `readonly` **references**: readonly [`X12StatusReference`](#x12statusreference)[]

##### revenueCode

> `readonly` **revenueCode**: `string` \| `undefined`

##### serviceIdQualifier

> `readonly` **serviceIdQualifier**: `string` \| `undefined`

##### statuses

> `readonly` **statuses**: readonly [`X12StatusInfo`](#x12statusinfo)[]

##### unitsOfService

> `readonly` **unitsOfService**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-07, data element 380 (Quantity). Named "Units of Service Count" by
TR3 `005010X212` and "Original Units of Service Count" by `005010X214`;
the same element in the same position either way, so one field serves
both and the walker never has to know which TR3 it is reading.

SVC-05 is NOT USED in both TR3s, so unlike the 835 there is no second,
paid quantity to tell this one apart from. `undefined` means **not
decoded**, not "the sender sent zero": an absent element and a present
one that is not an X12 R-type decimal share it, and only the latter
raises `X12_UNPARSEABLE_DECIMAL` at `position.elementIndex` 7.

***

### X12ServiceReview

One services-review item - a patient-event HL (`EV`, Loop 2000E) or a
service HL (`SS`, Loop 2000F). Carries the `UM` review information, the
optional `HCR` decision (response only), echoed `TRN` traces, `HI`
diagnoses, attached provider NM1s, and the supplemental REF/DTP/MSG.

#### Example

```ts
import type { X12ServiceReview } from "@cosyte/x12";
declare const r: X12ServiceReview;
r.requestCategoryCode;        // "HS" (health services review) / "AR" (admission review)
r.certificationTypeCode;      // "I" (initial) / "R" (renewal)
r.decision?.actionCode;       // "A1" (certified) - response only
```

#### Properties

##### certificationTypeCode

> `readonly` **certificationTypeCode**: `string` \| `undefined`

##### dates

> `readonly` **dates**: readonly [`X12AuthDate`](#x12authdate)[]

##### decision

> `readonly` **decision**: [`X12ReviewDecision`](#x12reviewdecision) \| `undefined`

##### diagnoses

> `readonly` **diagnoses**: readonly [`X12AuthDiagnosis`](#x12authdiagnosis)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl) \| `undefined`

##### levelOfServiceCode

> `readonly` **levelOfServiceCode**: `string` \| `undefined`

##### messages

> `readonly` **messages**: readonly `string`[]

##### providers

> `readonly` **providers**: readonly [`X12AuthEntity`](#x12authentity)[]

##### references

> `readonly` **references**: readonly [`X12AuthReference`](#x12authreference)[]

##### requestCategoryCode

> `readonly` **requestCategoryCode**: `string` \| `undefined`

##### serviceTypeCode

> `readonly` **serviceTypeCode**: `string` \| `undefined`

##### traces

> `readonly` **traces**: readonly [`X12AuthTrace`](#x12authtrace)[]

***

### X12ServicesReview

Top-level result of "./get-278.js".get278Request /
"./get-278.js".get278Response. Carries the BHT header, the four
named HL parties (UMO, requester, subscriber, dependent) resolved from the
hierarchy, every per-event / per-service review item, the verbatim HL
tree, and the warnings surfaced during the walk.

#### Example

```ts
import { parseX12, get278Response } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
if (tx !== undefined) {
  const review = get278Response(ix.delimiters, tx);
  review?.reviews[0]?.decision?.actionCode; // "A1" (certified)
}
```

#### Properties

##### dependent

> `readonly` **dependent**: [`X12AuthMember`](#x12authmember) \| `undefined`

##### direction

> `readonly` **direction**: `"request"` \| `"response"`

##### header

> `readonly` **header**: [`X12AuthHeader`](#x12authheader)

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12Hl`](#x12hl)[]

##### implementationConventionReference

> `readonly` **implementationConventionReference**: `string` \| `undefined`

##### requester

> `readonly` **requester**: [`X12AuthEntity`](#x12authentity) \| `undefined`

##### reviews

> `readonly` **reviews**: readonly [`X12ServiceReview`](#x12servicereview)[]

##### subscriber

> `readonly` **subscriber**: [`X12AuthMember`](#x12authmember) \| `undefined`

##### utilizationManagementOrganization

> `readonly` **utilizationManagementOrganization**: [`X12AuthEntity`](#x12authentity) \| `undefined`

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12StatusCode

One Health Care Claim Status composite (C043, STC-01 / STC-10 / STC-11).
Pairs a **CSCC** (Claim Status Category Code, X12 source 507) with a
**CSC** (Claim Status Code, X12 source 508) and the responsible entity.
The verbatim codes are always preserved; descriptions resolve from the
bundled snapshots (or `undefined` outside the subset).

#### Example

```ts
import type { X12StatusCode } from "@cosyte/x12";
declare const c: X12StatusCode;
c.categoryCode;        // "A7" (rejected/invalid)
c.statusCode;          // "21" (Missing or invalid information)
c.statusDescription;   // "Missing or invalid information."
c.entityCode;          // "85" (billing provider)
```

#### Properties

##### categoryCode

> `readonly` **categoryCode**: `string`

##### categoryDescription

> `readonly` **categoryDescription**: `string` \| `undefined`

##### entityCode

> `readonly` **entityCode**: `string` \| `undefined`

##### statusCode

> `readonly` **statusCode**: `string`

##### statusDescription

> `readonly` **statusDescription**: `string` \| `undefined`

***

### X12StatusDate

A DTP date / date-range on a claim or service-line status (e.g. DTP*472
service date, DTP*050 received date).

#### Example

```ts
import type { X12StatusDate } from "@cosyte/x12";
declare const d: X12StatusDate;
d.qualifier;       // "472"
d.formatQualifier; // "RD8"
d.value;           // "20260601-20260601"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12StatusEntity

A non-person entity decoded from an NM1 - the payer (Loop 2100A),
information receiver (2100B), or service provider (2100C).

#### Example

```ts
import type { X12StatusEntity } from "@cosyte/x12";
declare const e: X12StatusEntity;
e.entityIdentifierCode; // "PR" / "41" / "1P"
e.name;                 // "MEDPAY INSURANCE"
e.idCode;               // "00123"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### name

> `readonly` **name**: `string`

***

### X12StatusInfo

One decoded STC segment - the headline status fields plus the up-to-three
[X12StatusCode](#x12statuscode) composites (STC-01, STC-10, STC-11). A single claim
(or service line) can carry multiple STC segments; each becomes one
`X12StatusInfo`.

#### Example

```ts
import type { X12StatusInfo } from "@cosyte/x12";
declare const s: X12StatusInfo;
s.statusEffectiveDate;        // "20260627"
s.totalChargeAmount?.toString(); // "150.00"
s.statuses[0]?.statusCode;    // "20"
```

#### Properties

##### actionCode

> `readonly` **actionCode**: `string` \| `undefined`

##### adjudicationDate

> `readonly` **adjudicationDate**: `string` \| `undefined`

##### message

> `readonly` **message**: `string` \| `undefined`

##### paymentAmount

> `readonly` **paymentAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

##### statusEffectiveDate

> `readonly` **statusEffectiveDate**: `string` \| `undefined`

##### statuses

> `readonly` **statuses**: readonly [`X12StatusCode`](#x12statuscode)[]

##### totalChargeAmount

> `readonly` **totalChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

***

### X12StatusInquiry

Top-level result of "./get-276.js".get276StatusInquiry. Carries the
transaction header, the information-source roots of the transmitted
hierarchy, every declared HL verbatim, and every warning raised while
walking.

#### Example

```ts
import { parseX12, get276StatusInquiry } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "276");
if (tx !== undefined) {
  const inquiry = get276StatusInquiry(ix.delimiters, tx);
  const sub =
    inquiry?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
  sub?.claims[0]?.trace?.referenceId; // the trace a 277 echoes back
}
```

#### Properties

##### header

> `readonly` **header**: [`X12StatusInquiryHeader`](#x12statusinquiryheader-1) \| `undefined`

##### hierarchies

> `readonly` **hierarchies**: readonly [`X12Hl`](#x12hl)[]

##### informationSources

> `readonly` **informationSources**: readonly [`X12StatusInquirySource`](#x12statusinquirysource)[]

##### warnings

> `readonly` **warnings**: readonly [`X12ParseWarning`](#x12parsewarning)[]

***

### X12StatusInquiryAmount

An AMT amount row on a claim (e.g. `AMT*T3` total submitted charges). A row
and not a slot: an AMT reaching the reader with no decodable amount builds no
row at all and reports the loss, so an empty `amounts` list can be told apart
from an amount this reader could build no row from.

#### Example

```ts
import type { X12StatusInquiryAmount } from "@cosyte/x12";
declare const a: X12StatusInquiryAmount;
a.qualifier;          // "T3"
a.amount.toString();  // "150.00"
```

#### Properties

##### amount

> `readonly` **amount**: [`X12Decimal`](#x12decimal)

AMT-02 - the monetary amount, NEVER a JavaScript `number`.

##### qualifier

> `readonly` **qualifier**: `string`

AMT-01 - amount qualifier code.

***

### X12StatusInquiryClaim

One claim the submitter is asking about (Loop 2200D / 2200E), opened by the
TRN that carries its trace. Carries the identifiers, submitted amounts, dates
and service lines transmitted under that trace.

#### Example

```ts
import type { X12StatusInquiryClaim } from "@cosyte/x12";
declare const c: X12StatusInquiryClaim;
c.trace?.referenceId;       // "STATUS20260601001"
c.references[0]?.qualifier; // "1K" (payer claim control number)
c.serviceLines.length;      // 1
```

#### Properties

##### amounts

> `readonly` **amounts**: readonly [`X12StatusInquiryAmount`](#x12statusinquiryamount)[]

AMT amount rows transmitted under this claim.

##### dates

> `readonly` **dates**: readonly [`X12StatusInquiryDate`](#x12statusinquirydate)[]

DTP date rows transmitted under this claim.

##### references

> `readonly` **references**: readonly [`X12StatusInquiryReference`](#x12statusinquiryreference)[]

REF identifiers transmitted under this claim.

##### serviceLines

> `readonly` **serviceLines**: readonly [`X12StatusInquiryServiceLine`](#x12statusinquiryserviceline)[]

Loop 2210 service lines transmitted under this claim.

##### trace

> `readonly` **trace**: [`X12StatusInquiryTrace`](#x12statusinquirytrace) \| `undefined`

TRN - the trace the answering 277 echoes back verbatim.

***

### X12StatusInquiryDate

A DTP date or date range on a claim or a service line. `formatQualifier`
(DTP-02) is the element that says WHICH: `D8` is a single `CCYYMMDD` date and
`RD8` a `CCYYMMDD-CCYYMMDD` range. It is preserved verbatim beside the value,
so a consumer never has to infer which one a `value` holds.

#### Example

```ts
import type { X12StatusInquiryDate } from "@cosyte/x12";
declare const d: X12StatusInquiryDate;
d.qualifier;       // "472" (service date)
d.formatQualifier; // "D8" or "RD8"
d.value;           // "20260520"
```

#### Properties

##### formatQualifier

> `readonly` **formatQualifier**: `string`

DTP-02 - date/time period format qualifier (`D8` single, `RD8` range).

##### qualifier

> `readonly` **qualifier**: `string`

DTP-01 - date/time qualifier.

##### value

> `readonly` **value**: `string`

DTP-03 - the date or range, in the DTP-02 format.

***

### X12StatusInquiryDependent

One dependent (Loop 2000E / 2100E / 2200E) - a patient who cannot be
identified as a subscriber in their own right. HL-03 is `23`. Carries its OWN
name, demographics and claims and is never merged onto the subscriber it
hangs under.

#### Example

```ts
import type { X12StatusInquiryDependent } from "@cosyte/x12";
declare const d: X12StatusInquiryDependent;
d.name?.firstName; // "BABY"
d.claims.length;   // the dependent's own claims
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`X12StatusInquiryClaim`](#x12statusinquiryclaim)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12StatusInquiryName`](#x12statusinquiryname) \| `undefined`

***

### X12StatusInquiryHeader

The BHT beginning-of-hierarchical-transaction header. `purposeCode` (BHT-02)
is `13` on a request; `referenceId` (BHT-03) is the submitter's own
identifier for the request.

#### Example

```ts
import type { X12StatusInquiryHeader } from "@cosyte/x12";
declare const h: X12StatusInquiryHeader;
h.hierarchicalStructureCode; // "0010"
h.purposeCode;               // "13"
```

#### Properties

##### date

> `readonly` **date**: `string` \| `undefined`

BHT-04 - transaction creation date, CCYYMMDD.

##### hierarchicalStructureCode

> `readonly` **hierarchicalStructureCode**: `string`

BHT-01 - hierarchical structure code.

##### purposeCode

> `readonly` **purposeCode**: `string`

BHT-02 - transaction set purpose code.

##### referenceId

> `readonly` **referenceId**: `string` \| `undefined`

BHT-03 - submitter transaction identifier.

##### time

> `readonly` **time**: `string` \| `undefined`

BHT-05 - transaction creation time.

***

### X12StatusInquiryName

An NM1 name loop, plus the DMG demographics that follow it. ONE type covers
every level, because NM1 is one segment: NM1-03 is "name last or organization
name", so a payer fills it and a member fills it, and splitting the type by
level would mean this reader deciding which kind of party a level holds.
`entityTypeQualifier` (NM1-02) is the sender's own statement of that (`1`
person, `2` non-person) and is preserved verbatim.

**No postal address is surfaced here, deliberately.** The response reader
beside this one surfaces none either, so the two directions of this family
agree; an N3 or N4 a sender transmits stays verbatim on `tx.segments`.

#### Example

```ts
import type { X12StatusInquiryName } from "@cosyte/x12";
declare const n: X12StatusInquiryName;
n.entityIdentifierCode;       // "IL" subscriber / "PR" payer / "1P" provider
n.lastNameOrOrganizationName; // "DOE" or "MEDPAY INSURANCE"
n.dateOfBirth;                // "19850515" (DMG-02, CCYYMMDD)
```

#### Properties

##### dateOfBirth

> `readonly` **dateOfBirth**: `string` \| `undefined`

DMG-02 - date of birth.

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

NM1-01 - entity identifier code.

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

NM1-02 - entity type qualifier (`1` person, `2` non-person).

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

NM1-04 - first name.

##### genderCode

> `readonly` **genderCode**: `string` \| `undefined`

DMG-03 - gender code.

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

NM1-09 - identification code.

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

NM1-08 - identification code qualifier.

##### lastNameOrOrganizationName

> `readonly` **lastNameOrOrganizationName**: `string` \| `undefined`

NM1-03 - last name, or the organization name for a non-person.

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

NM1-05 - middle name.

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

NM1-07 - name suffix.

***

### X12StatusInquiryProcedure

The SVC-01 composite medical procedure identifier, exposed as its SEPARATED
components. It is never handed back as one joined string: the component
separator is framing, so joining it into a value would make two documents that
differ only in their declared delimiters decode to different models.

#### Example

```ts
import type { X12StatusInquiryProcedure } from "@cosyte/x12";
declare const p: X12StatusInquiryProcedure;
p.qualifier;    // "HC" (SVC-01-1, product/service id qualifier)
p.code;         // "99213" (SVC-01-2)
p.modifiers[0]; // "25" (SVC-01-3 onward)
```

#### Properties

##### code

> `readonly` **code**: `string` \| `undefined`

SVC-01-2 - the procedure code.

##### description

> `readonly` **description**: `string` \| `undefined`

SVC-01-7 - procedure description.

##### modifiers

> `readonly` **modifiers**: readonly `string`[]

SVC-01-3 through SVC-01-6 - procedure modifiers, in transmitted order.

##### qualifier

> `readonly` **qualifier**: `string`

SVC-01-1 - product or service id qualifier.

***

### X12StatusInquiryProvider

One service provider (Loop 2000C / 2100C) - the provider whose claim is being
asked about. HL-03 is `19` and its HL-02 names an information receiver. This
level is the one the 270's spine does NOT have, and it is why the claim-status
pair carries five levels where the eligibility pair carries four.

#### Example

```ts
import type { X12StatusInquiryProvider } from "@cosyte/x12";
declare const p: X12StatusInquiryProvider;
p.name?.idCode;        // the provider's NPI as transmitted
p.subscribers.length;  // 1
```

#### Properties

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12StatusInquiryName`](#x12statusinquiryname) \| `undefined`

##### subscribers

> `readonly` **subscribers**: readonly [`X12StatusInquirySubscriber`](#x12statusinquirysubscriber)[]

***

### X12StatusInquiryReceiver

One information receiver (Loop 2000B / 2100B) - the party the answer goes
back to. HL-03 is `21` and its HL-02 names an information source.

#### Example

```ts
import type { X12StatusInquiryReceiver } from "@cosyte/x12";
declare const r: X12StatusInquiryReceiver;
r.name?.idCode;      // the receiver's identifier
r.providers.length;  // 1
```

#### Properties

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12StatusInquiryName`](#x12statusinquiryname) \| `undefined`

##### providers

> `readonly` **providers**: readonly [`X12StatusInquiryProvider`](#x12statusinquiryprovider)[]

***

### X12StatusInquiryReference

A REF supplemental identifier on a claim or on a service line (e.g. `REF*1K`
payer claim control number, `REF*BLT` bill type, `REF*FJ` line item control
number).

#### Example

```ts
import type { X12StatusInquiryReference } from "@cosyte/x12";
declare const r: X12StatusInquiryReference;
r.qualifier; // "1K"
r.value;     // "PCN0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

REF-03 - description.

##### qualifier

> `readonly` **qualifier**: `string`

REF-01 - reference identification qualifier.

##### value

> `readonly` **value**: `string`

REF-02 - reference identification.

***

### X12StatusInquiryServiceLine

One service line the request asks about (Loop 2210), opened by an SVC.

**Which SVC elements this reader surfaces is a property of the READ, stated
as one.** It surfaces SVC-01 as its separated components, SVC-02 as the line
charge, SVC-04 as the revenue code and SVC-07 as the units of service count -
the same four the 277 reader beside it surfaces for the same segment. SVC-03,
SVC-05 and SVC-06 are left unread: this is the REQUEST direction, where a
submitter states what it billed rather than what was paid, and a slot named
for a payment on a question nobody has answered yet would invite a consumer to
read one. A sender that transmits them keeps them verbatim on `tx.segments`.

#### Example

```ts
import type { X12StatusInquiryServiceLine } from "@cosyte/x12";
declare const l: X12StatusInquiryServiceLine;
l.procedure?.code;              // "99213"
l.lineChargeAmount?.toString(); // "150.00"
l.unitsOfService?.toString();   // "1"
```

#### Properties

##### dates

> `readonly` **dates**: readonly [`X12StatusInquiryDate`](#x12statusinquirydate)[]

DTP date rows transmitted under this service line.

##### lineChargeAmount

> `readonly` **lineChargeAmount**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-02 - line item charge amount.

##### procedure

> `readonly` **procedure**: [`X12StatusInquiryProcedure`](#x12statusinquiryprocedure) \| `undefined`

SVC-01 - the billed procedure, as its separated components.

##### references

> `readonly` **references**: readonly [`X12StatusInquiryReference`](#x12statusinquiryreference)[]

REF identifiers transmitted under this service line.

##### revenueCode

> `readonly` **revenueCode**: `string` \| `undefined`

SVC-04 - revenue code.

##### unitsOfService

> `readonly` **unitsOfService**: [`X12Decimal`](#x12decimal) \| `undefined`

SVC-07 - units of service count.

***

### X12StatusInquirySource

One information source (Loop 2000A / 2100A) - the payer the request is put
to. The root of a transmitted hierarchy: HL-03 is `20` and HL-02 is absent.

#### Example

```ts
import type { X12StatusInquirySource } from "@cosyte/x12";
declare const s: X12StatusInquirySource;
s.name?.lastNameOrOrganizationName; // "MEDPAY INSURANCE"
s.receivers.length;                 // 1
```

#### Properties

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12StatusInquiryName`](#x12statusinquiryname) \| `undefined`

##### receivers

> `readonly` **receivers**: readonly [`X12StatusInquiryReceiver`](#x12statusinquiryreceiver)[]

***

### X12StatusInquirySubscriber

One subscriber (Loop 2000D / 2100D / 2200D) - the member the claim was filed
under, or the member a dependent hangs under. HL-03 is `22`.

#### Example

```ts
import type { X12StatusInquirySubscriber } from "@cosyte/x12";
declare const s: X12StatusInquirySubscriber;
s.name?.idCode;                 // member identifier as transmitted
s.claims[0]?.trace?.referenceId; // the trace a 277 echoes back
s.dependents.length;            // 0
```

#### Properties

##### claims

> `readonly` **claims**: readonly [`X12StatusInquiryClaim`](#x12statusinquiryclaim)[]

##### dependents

> `readonly` **dependents**: readonly [`X12StatusInquiryDependent`](#x12statusinquirydependent)[]

##### hierarchy

> `readonly` **hierarchy**: [`X12Hl`](#x12hl)

##### name

> `readonly` **name**: [`X12StatusInquiryName`](#x12statusinquiryname) \| `undefined`

***

### X12StatusInquiryTrace

A reassociation trace (TRN) transmitted with the request. **TRN-02 is the
value the answering 277 must echo verbatim**, which is what lets the
submitter match the answer to this question.

#### Example

```ts
import type { X12StatusInquiryTrace } from "@cosyte/x12";
declare const t: X12StatusInquiryTrace;
t.traceTypeCode; // "1" (current transaction trace numbers)
t.referenceId;   // "STATUS20260601001"
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

TRN-03 - originating company identifier.

##### referenceId

> `readonly` **referenceId**: `string`

TRN-02 - the trace number a 277 echoes back.

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

TRN-04 - supplemental reference identifier.

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

TRN-01 - trace type code.

***

### X12StatusMember

A person (subscriber Loop 2100D / dependent Loop 2100E) decoded from an
NM1. `idCode` is the member identifier (NM1-09) - synthetic-only in
fixtures.

#### Example

```ts
import type { X12StatusMember } from "@cosyte/x12";
declare const m: X12StatusMember;
m.lastName; // "DOE"
m.idCode;   // "MBR0001"
```

#### Properties

##### entityIdentifierCode

> `readonly` **entityIdentifierCode**: `string`

##### entityTypeQualifier

> `readonly` **entityTypeQualifier**: `string`

##### firstName

> `readonly` **firstName**: `string` \| `undefined`

##### idCode

> `readonly` **idCode**: `string` \| `undefined`

##### idQualifier

> `readonly` **idQualifier**: `string` \| `undefined`

##### lastName

> `readonly` **lastName**: `string` \| `undefined`

##### middleName

> `readonly` **middleName**: `string` \| `undefined`

##### suffix

> `readonly` **suffix**: `string` \| `undefined`

***

### X12StatusReference

A REF supplemental identifier on a claim or service-line status (e.g.
REF*1K payer claim control number, REF*BLT bill type).

#### Example

```ts
import type { X12StatusReference } from "@cosyte/x12";
declare const r: X12StatusReference;
r.qualifier; // "1K"
r.value;     // "PCN0001"
```

#### Properties

##### description

> `readonly` **description**: `string` \| `undefined`

##### qualifier

> `readonly` **qualifier**: `string`

##### value

> `readonly` **value**: `string`

***

### X12StatusTrace

A reassociation trace (TRN). For a 277 claim status, **`referenceId`
(TRN-02) echoes the requesting 276's trace number verbatim** so the
provider can re-associate the answer. The walker never mutates it.

#### Example

```ts
import type { X12StatusTrace } from "@cosyte/x12";
declare const t: X12StatusTrace;
t.traceTypeCode; // "2"
t.referenceId;   // "CLAIM20260627001"
```

#### Properties

##### originatingCompanyId

> `readonly` **originatingCompanyId**: `string` \| `undefined`

##### referenceId

> `readonly` **referenceId**: `string`

##### supplementalReferenceId

> `readonly` **supplementalReferenceId**: `string` \| `undefined`

##### traceTypeCode

> `readonly` **traceTypeCode**: `string`

***

### X12SubscriberInfo

Decoded SBR - Subscriber Information (Loop 2000B's primary trigger). Or
decoded PAT - Patient Information when the patient is the subscriber.

- `payerResponsibilityCode` (SBR-01 / X12 1138): `P` Primary, `S`
  Secondary, `T` Tertiary, etc. Drives COB ordering.
- `individualRelationshipCode` (SBR-02 / PAT-01 / X12 1069): `18` Self,
  `01` Spouse, `19` Child, `G8` Other Insured.
- `groupNumber` (SBR-03), `groupName` (SBR-04).
- `claimFilingIndicator` (SBR-09 / X12 1032): `MC` Medicaid, `MB`
  Medicare Part B, `BL` BlueCross/BlueShield, `CI` Commercial, etc.

#### Example

```ts
import type { X12SubscriberInfo } from "@cosyte/x12";
declare const s: X12SubscriberInfo;
s.payerResponsibilityCode;  // "P"
s.individualRelationshipCode; // "18" self
s.claimFilingIndicator;     // "MB"
```

#### Properties

##### claimFilingIndicator

> `readonly` **claimFilingIndicator**: `string` \| `undefined`

##### groupName

> `readonly` **groupName**: `string` \| `undefined`

##### groupNumber

> `readonly` **groupNumber**: `string` \| `undefined`

##### individualRelationshipCode

> `readonly` **individualRelationshipCode**: `string` \| `undefined`

##### payerResponsibilityCode

> `readonly` **payerResponsibilityCode**: `string` \| `undefined`

***

### X12ToothInformation

Decoded TOO - Tooth Information (837D Loop 2400). `qualifier` is the
tooth-numbering code list (`JP` ADA Universal Tooth Numbering, `JO`
ANSI / ISO 3950 / FDI). `toothCode` is the verbatim tooth identifier;
`surfaces` are the per-surface codes (`M` mesial, `O` occlusal, `D`
distal, etc.) from TOO-03's composite components.

#### Example

```ts
import type { X12ToothInformation } from "@cosyte/x12";
declare const t: X12ToothInformation;
t.qualifier;     // "JP"
t.toothCode;     // "14"
t.surfaces;      // ["O"]
```

#### Properties

##### qualifier

> `readonly` **qualifier**: `string`

##### surfaces

> `readonly` **surfaces**: readonly `string`[]

##### toothCode

> `readonly` **toothCode**: `string`

***

### X12Tr3Conformance

One conformance row: the identifier this package implements for one
transaction (and, where a transaction has more than one document or more
than one shape, one variant of it), the directions it is implemented in, and
the identifiers 45 CFR 162.920 names for it.

`transaction` is the transaction set number as it appears in this package's
own export names, so `get835` and `build837D` and `parse999` and `buildTA1`
are reachable from a row without a second hand-maintained list.

`directions` states what is implemented and NEVER implies the other
direction: a transaction this package only reads carries `["read"]` alone.

`tr3` is `null` only where no implementation guide identifier names the
document at all, and `note` then says why.

#### Example

```ts
import { X12_TR3_CONFORMANCE, type X12Tr3Conformance } from "@cosyte/x12";
const row: X12Tr3Conformance | undefined = X12_TR3_CONFORMANCE.find(
  (r) => r.transaction === "837" && r.variant === "I",
);
row?.tr3;         // "005010X223A3"
row?.adoption;    // "errata-in-practice"
row?.cfrAdopted;  // ["005010X223", "005010X223A1"]
```

#### Properties

##### adoption

> `readonly` **adoption**: [`X12Tr3Adoption`](#x12tr3adoption)

How `tr3` stands against 45 CFR 162.920.

##### cfrAdopted

> `readonly` **cfrAdopted**: readonly `string`[]

Identifiers 45 CFR 162.920 names for this transaction; empty iff `not-adopted`.

##### directions

> `readonly` **directions**: readonly [`X12Tr3Direction`](#x12tr3direction)[]

The directions actually implemented. Never empty.

##### note

> `readonly` **note**: `string` \| `null`

Why this row is not the simple case, where it is not. Never an empty string.

##### title

> `readonly` **title**: `string`

Human-readable document title. Never empty.

##### tr3

> `readonly` **tr3**: `string` \| `null`

The identifier this package implements, errata suffix included.

##### transaction

> `readonly` **transaction**: `string`

Transaction set number, spelled as this package's export names spell it.

##### variant

> `readonly` **variant**: `string` \| `null`

The variant within that transaction, or `null` where there is only one.

***

### X12TransactionSet

A single ST..SE transaction set inside a functional group. The parser
decodes every body segment via "./segment.js".decodeSegment so
`segments` carries typed [X12Segment](#x12segment) entries (ST through SE,
inclusive). `rawSegments` mirrors the same list as the verbatim raw
segment strings (terminator stripped) so a byte-exact round-trip survives
any downstream consumer that needs to re-emit the source.

`elements` on the ST and SE segments themselves IS decoded at envelope
time so envelope invariants can be checked (ST-02 ↔ SE-02 control-number
reconciliation, SE-01 segment count). **Read "decoded" as element-SPLIT and
nothing more: the strings are PRE-`?`-unescape**, and a reader that publishes
one to a consumer unescapes it first.

#### Example

```ts
import type { X12TransactionSet } from "@cosyte/x12";
declare const tx: X12TransactionSet;
tx.st.elements[1];             // ST-01 - transaction set ID (e.g. "835")
tx.segments[1]?.id;            // first body segment id
tx.rawSegments[1];             // first body segment raw text
```

#### Properties

##### gs?

> `readonly` `optional` **gs?**: [`GsSegment`](#gssegment)

The GS header of the functional group the envelope walker framed this
transaction set in, the same object as that group's `gs`. It is carried
here so a typed reader called with `(delimiters, tx)` can read GS-08 where
ST-03 is absent or empty. **Element values are stored RAW,
pre-`?`-unescape**, like every envelope element, so an element is the
framed byte text of its slot and not necessarily the value the sender
stated.

Optional: a transaction set assembled by hand may carry none, and every
typed reader treats that exactly as a group whose GS-08 is absent.

##### rawSegments

> `readonly` **rawSegments**: readonly `string`[]

##### se

> `readonly` **se**: \{ `elements`: readonly `string`[]; `raw`: `string`; \} \| `undefined`

##### segments

> `readonly` **segments**: readonly [`X12Segment`](#x12segment)[]

##### st

> `readonly` **st**: `object`

###### elements

> `readonly` **elements**: readonly `string`[]

###### raw

> `readonly` **raw**: `string`

***

### X12WarningPartition

The result of [partitionWarnings](#partitionwarnings): warnings split into those a
profile leads you to EXPECT and those it does not.

#### Example

```ts
import type { X12WarningPartition } from "@cosyte/x12";
declare const p: X12WarningPartition;
p.unexpected.length; // alert only on these
```

#### Properties

##### expected

> `readonly` **expected**: readonly [`X12ParseWarning`](#x12parsewarning)[]

##### unexpected

> `readonly` **unexpected**: readonly [`X12ParseWarning`](#x12parsewarning)[]

## Type Aliases

### AckBuildErrorCode

> **AckBuildErrorCode** = *typeof* [`ACK_BUILD_ERROR_CODES`](#ack_build_error_codes)\[keyof *typeof* [`ACK_BUILD_ERROR_CODES`](#ack_build_error_codes)\]

String-literal union over [ACK\_BUILD\_ERROR\_CODES](#ack_build_error_codes). Used as
`AckBuildError.code`.

***

### Attachment275BuildErrorCode

> **Attachment275BuildErrorCode** = *typeof* [`ATTACHMENT_275_BUILD_ERROR_CODES`](#attachment_275_build_error_codes)\[keyof *typeof* [`ATTACHMENT_275_BUILD_ERROR_CODES`](#attachment_275_build_error_codes)\]

String-literal union over [ATTACHMENT\_275\_BUILD\_ERROR\_CODES](#attachment_275_build_error_codes).

#### Example

```ts
import type { Attachment275BuildErrorCode } from "@cosyte/x12";
const code: Attachment275BuildErrorCode = "X12_275_BUILD_NO_ATTACHMENT";
```

***

### Build837ServiceLineSpec

> **Build837ServiceLineSpec** = [`Build837ServiceLineProfessionalSpec`](#build837servicelineprofessionalspec) \| [`Build837ServiceLineInstitutionalSpec`](#build837servicelineinstitutionalspec) \| [`Build837ServiceLineDentalSpec`](#build837servicelinedentalspec)

Service-line spec - discriminated union keyed by `variant`. Every line in
a `build837P` spec must be `"P"`, etc.; a mismatch is REFUSED.

#### Example

```ts
import type { Build837ServiceLineSpec } from "@cosyte/x12";
declare const sl: Build837ServiceLineSpec;
if (sl.variant === "P") sl.diagnosisPointers;
```

***

### Claim837BuildErrorCode

> **Claim837BuildErrorCode** = *typeof* [`CLAIM_837_BUILD_ERROR_CODES`](#claim_837_build_error_codes)\[keyof *typeof* [`CLAIM_837_BUILD_ERROR_CODES`](#claim_837_build_error_codes)\]

String-literal union over [CLAIM\_837\_BUILD\_ERROR\_CODES](#claim_837_build_error_codes). Used as
[Claim837BuildError](#claim837builderror).`code`.

***

### ClaimAdjustmentGroupCode

> **ClaimAdjustmentGroupCode** = *typeof* [`CLAIM_ADJUSTMENT_GROUP_CODES`](#claim_adjustment_group_codes)\[keyof *typeof* [`CLAIM_ADJUSTMENT_GROUP_CODES`](#claim_adjustment_group_codes)\]

Discriminant type for a known Claim Adjustment Group Code. Used to
narrow the `group` field on a parsed claim adjustment; unknown
inbound values keep the verbatim string (NEVER coerced) and consumers
can distinguish via `isClaimAdjustmentGroupCode`.

#### Example

```ts
import type { ClaimAdjustmentGroupCode } from "@cosyte/x12";
const code: ClaimAdjustmentGroupCode = "PR";
```

***

### ClaimStatus276BuildErrorCode

> **ClaimStatus276BuildErrorCode** = *typeof* [`CLAIM_STATUS_276_BUILD_ERROR_CODES`](#claim_status_276_build_error_codes)\[keyof *typeof* [`CLAIM_STATUS_276_BUILD_ERROR_CODES`](#claim_status_276_build_error_codes)\]

String-literal union over [CLAIM\_STATUS\_276\_BUILD\_ERROR\_CODES](#claim_status_276_build_error_codes). Used as
[ClaimStatus276BuildError](#claimstatus276builderror).`code`.

***

### ClaimStatus277BuildErrorCode

> **ClaimStatus277BuildErrorCode** = *typeof* [`CLAIM_STATUS_277_BUILD_ERROR_CODES`](#claim_status_277_build_error_codes)\[keyof *typeof* [`CLAIM_STATUS_277_BUILD_ERROR_CODES`](#claim_status_277_build_error_codes)\]

String-literal union over [CLAIM\_STATUS\_277\_BUILD\_ERROR\_CODES](#claim_status_277_build_error_codes). Used
as [ClaimStatus277BuildError](#claimstatus277builderror).`code`.

***

### CodeListCompleteness

> **CodeListCompleteness** = `"complete-published-list"` \| `"cited-subset"`

Whether a bundled snapshot is the whole published list or a cited part of
it. It is what tells a code the lookup does not know from a code the
publisher never issued: outside a `"cited-subset"` the absence means nothing,
and outside a `"complete-published-list"` it means the code is not in the
list at all.

#### Example

```ts
import { SERVICE_TYPE_CODES } from "@cosyte/x12";
SERVICE_TYPE_CODES.meta.completeness; // "cited-subset"
```

***

### CodeListRedistributionStatus

> **CodeListRedistributionStatus** = `"permitted"` \| `"licence-required"` \| `"not-established"`

What the recorded evidence says about redistributing a bundled list's
descriptions.

- `"permitted"` - the maintainer publishes the list without a licence
  requirement, so the descriptions may be redistributed.
- `"licence-required"` - the maintainer requires a purchased licence or
  express permission before the descriptions may be reproduced.
- `"not-established"` - the sources obtained for this package do not settle
  it. This is a real answer and is treated as NOT redistributable.

#### Example

```ts
import { CARC, RARC } from "@cosyte/x12";
CARC.meta.redistribution?.status; // "licence-required"
RARC.meta.redistribution?.status; // "permitted"
```

***

### CodeValidity

> **CodeValidity** = *typeof* [`CODE_VALIDITY`](#code_validity)\[keyof *typeof* [`CODE_VALIDITY`](#code_validity)\]

String-literal union over [CODE\_VALIDITY](#code_validity). Used as
[CodeValidityResult](#codevalidityresult).`validity`.

***

### CodeValidityReason

> **CodeValidityReason** = *typeof* [`CODE_VALIDITY_REASONS`](#code_validity_reasons)\[keyof *typeof* [`CODE_VALIDITY_REASONS`](#code_validity_reasons)\]

String-literal union over [CODE\_VALIDITY\_REASONS](#code_validity_reasons). Used as
[CodeValidityResult](#codevalidityresult).`reason`.

***

### CoreBusinessScenario

> **CoreBusinessScenario** = *typeof* [`CORE_BUSINESS_SCENARIOS`](#core_business_scenarios)\[keyof *typeof* [`CORE_BUSINESS_SCENARIOS`](#core_business_scenarios)\]

One of the four CORE-defined business scenario identifiers in
[CORE\_BUSINESS\_SCENARIOS](#core_business_scenarios).

#### Example

```ts
import type { CoreBusinessScenario } from "@cosyte/x12";
const scenario: CoreBusinessScenario = "scenario-4";
```

***

### CoreCodeCombinationErrorCode

> **CoreCodeCombinationErrorCode** = *typeof* [`CORE_CODE_COMBINATION_ERROR_CODES`](#core_code_combination_error_codes)\[keyof *typeof* [`CORE_CODE_COMBINATION_ERROR_CODES`](#core_code_combination_error_codes)\]

String-literal union over [CORE\_CODE\_COMBINATION\_ERROR\_CODES](#core_code_combination_error_codes). Used as
[CoreCodeCombinationTableError](#corecodecombinationtableerror).`code`.

#### Example

```ts
import type { CoreCodeCombinationErrorCode } from "@cosyte/x12";
const code: CoreCodeCombinationErrorCode = "X12_CORE_COMBINATION_TABLE_INVALID";
```

***

### CoreCodeCombinationOutcome

> **CoreCodeCombinationOutcome** = *typeof* [`CORE_CODE_COMBINATION_OUTCOMES`](#core_code_combination_outcomes)\[keyof *typeof* [`CORE_CODE_COMBINATION_OUTCOMES`](#core_code_combination_outcomes)\]

String-literal union over [CORE\_CODE\_COMBINATION\_OUTCOMES](#core_code_combination_outcomes).

#### Example

```ts
import type { CoreCodeCombinationOutcome } from "@cosyte/x12";
const outcome: CoreCodeCombinationOutcome = "unevaluated";
```

***

### CoreCodeCombinationResult

> **CoreCodeCombinationResult** = \{ `outcome`: *typeof* [`IN_TABLE`](#in_table); `tableVersion`: `string`; \} \| \{ `outcome`: *typeof* [`NOT_IN_TABLE`](#not_in_table); `tableVersion`: `string`; \} \| \{ `outcome`: *typeof* [`UNEVALUATED`](#unevaluated); `reason`: [`CoreCodeCombinationUnevaluatedReason`](#corecodecombinationunevaluatedreason); `tableVersion`: `string` \| `undefined`; \}

The answer from [checkCoreCodeCombination](#checkcorecodecombination). Switch on `outcome`.
`tableVersion` is the supplied table's `version`, exactly as supplied; it
is `undefined` only when no table was supplied. An `unevaluated` answer
also names its `reason`.

#### Example

```ts
import type { CoreCodeCombinationResult } from "@cosyte/x12";
declare const result: CoreCodeCombinationResult;
switch (result.outcome) {
  case "in-table":
    result.tableVersion; // the label you supplied
    break;
  case "not-in-table":
    break;
  case "unevaluated":
    result.reason; // e.g. "no-table"
    break;
}
```

***

### CoreCodeCombinationTableField

> **CoreCodeCombinationTableField** = `"table"` \| `"version"` \| `"rows"` \| `"row"` \| `"scenario"` \| `"groupCode"` \| `"reasonCode"` \| `"remarkCode"`

Which part of a combination table a [CoreCodeCombinationTableError](#corecodecombinationtableerror)
refused. `table` is the argument itself (not an object), `version` its
label, `rows` its row list, `row` one entry of that list (not an object),
and the last four are fields of one row.

#### Example

```ts
import type { CoreCodeCombinationTableField } from "@cosyte/x12";
const field: CoreCodeCombinationTableField = "reasonCode";
```

***

### CoreCodeCombinationUnevaluatedReason

> **CoreCodeCombinationUnevaluatedReason** = *typeof* [`CORE_CODE_COMBINATION_UNEVALUATED_REASONS`](#core_code_combination_unevaluated_reasons)\[keyof *typeof* [`CORE_CODE_COMBINATION_UNEVALUATED_REASONS`](#core_code_combination_unevaluated_reasons)\]

String-literal union over [CORE\_CODE\_COMBINATION\_UNEVALUATED\_REASONS](#core_code_combination_unevaluated_reasons).

#### Example

```ts
import type { CoreCodeCombinationUnevaluatedReason } from "@cosyte/x12";
const reason: CoreCodeCombinationUnevaluatedReason = "no-rows-for-scenario";
```

***

### Eligibility270BuildErrorCode

> **Eligibility270BuildErrorCode** = *typeof* [`ELIGIBILITY_270_BUILD_ERROR_CODES`](#eligibility_270_build_error_codes)\[keyof *typeof* [`ELIGIBILITY_270_BUILD_ERROR_CODES`](#eligibility_270_build_error_codes)\]

String-literal union over [ELIGIBILITY\_270\_BUILD\_ERROR\_CODES](#eligibility_270_build_error_codes). Used
as [Eligibility270BuildError](#eligibility270builderror).`code`.

***

### Eligibility271BuildErrorCode

> **Eligibility271BuildErrorCode** = *typeof* [`ELIGIBILITY_271_BUILD_ERROR_CODES`](#eligibility_271_build_error_codes)\[keyof *typeof* [`ELIGIBILITY_271_BUILD_ERROR_CODES`](#eligibility_271_build_error_codes)\]

String-literal union over [ELIGIBILITY\_271\_BUILD\_ERROR\_CODES](#eligibility_271_build_error_codes). Used
as [Eligibility271BuildError](#eligibility271builderror).`code`.

***

### Enrollment834BuildErrorCode

> **Enrollment834BuildErrorCode** = *typeof* [`ENROLLMENT_834_BUILD_ERROR_CODES`](#enrollment_834_build_error_codes)\[keyof *typeof* [`ENROLLMENT_834_BUILD_ERROR_CODES`](#enrollment_834_build_error_codes)\]

String-literal union over [ENROLLMENT\_834\_BUILD\_ERROR\_CODES](#enrollment_834_build_error_codes). Used
as [Enrollment834BuildError](#enrollment834builderror).`code`.

***

### Ik304Code

> **Ik304Code** = *typeof* [`IK3_SYNTAX_ERROR_CODES`](#ik3_syntax_error_codes)\[keyof *typeof* [`IK3_SYNTAX_ERROR_CODES`](#ik3_syntax_error_codes)\]

String-literal union over [IK3\_SYNTAX\_ERROR\_CODES](#ik3_syntax_error_codes). Used as the
type of `IK3-04` on the ack-spec/parsed-ack models.

***

### Ik403Code

> **Ik403Code** = *typeof* [`IK4_SYNTAX_ERROR_CODES`](#ik4_syntax_error_codes)\[keyof *typeof* [`IK4_SYNTAX_ERROR_CODES`](#ik4_syntax_error_codes)\]

String-literal union over [IK4\_SYNTAX\_ERROR\_CODES](#ik4_syntax_error_codes). Used as the
type of `IK4-03` on the ack-spec/parsed-ack models.

***

### LoopMax

> **LoopMax** = `number` \| `">1"`

Repetition count for a segment or child loop inside its parent. `">1"`
means many (TR3 typically writes `>1` to mean "no cap"). A finite max
surfaces as the numeric value. This module stores the value; the loop
walker uses it for over-limit warnings.

#### Example

```ts
import type { LoopMax } from "@cosyte/x12";
const single: LoopMax = 1;
const many: LoopMax = ">1";
```

***

### LoopUsage

> **LoopUsage** = `"required"` \| `"situational"` \| `"optional"`

Cardinality of a segment or child loop inside its parent. Mirrors TR3
spelling so the spec reads like the implementation guide:

- `required` - the segment/loop MUST appear at least once.
- `situational` - the segment/loop MAY appear when its situational rule
  triggers; the parser does not enforce the rule itself but loop-walker
  warnings reference it.
- `optional` - the segment/loop MAY appear in any usage.

#### Example

```ts
import type { LoopUsage } from "@cosyte/x12";
const usage: LoopUsage = "required";
```

***

### OnWarningCallback

> **OnWarningCallback** = (`warning`) => `void`

Callback invoked inline each time the parser emits a Tier-2 warning.
Always fires BEFORE the warning is appended to `X12Interchange.warnings`
so consumers observe warnings in the same order the parser discovered them.

#### Parameters

##### warning

[`X12ParseWarning`](#x12parsewarning)

#### Returns

`void`

#### Example

```ts
import { parseX12, type OnWarningCallback } from "@cosyte/x12";
const onWarning: OnWarningCallback = (w) => {
  console.warn(w.code, w.message);
};
parseX12(raw, { onWarning });
```

***

### Premium820BuildErrorCode

> **Premium820BuildErrorCode** = *typeof* [`PREMIUM_820_BUILD_ERROR_CODES`](#premium_820_build_error_codes)\[keyof *typeof* [`PREMIUM_820_BUILD_ERROR_CODES`](#premium_820_build_error_codes)\]

String-literal union over [PREMIUM\_820\_BUILD\_ERROR\_CODES](#premium_820_build_error_codes). Used as
[Premium820BuildError](#premium820builderror).`code`.

***

### Remit835BuildErrorCode

> **Remit835BuildErrorCode** = *typeof* [`REMIT_835_BUILD_ERROR_CODES`](#remit_835_build_error_codes)\[keyof *typeof* [`REMIT_835_BUILD_ERROR_CODES`](#remit_835_build_error_codes)\]

String-literal union over [REMIT\_835\_BUILD\_ERROR\_CODES](#remit_835_build_error_codes). Used as
[Remit835BuildError](#remit835builderror).`code`.

***

### Rfai277BuildErrorCode

> **Rfai277BuildErrorCode** = *typeof* [`RFAI_277_BUILD_ERROR_CODES`](#rfai_277_build_error_codes)\[keyof *typeof* [`RFAI_277_BUILD_ERROR_CODES`](#rfai_277_build_error_codes)\]

String-literal union over [RFAI\_277\_BUILD\_ERROR\_CODES](#rfai_277_build_error_codes).

#### Example

```ts
import type { Rfai277BuildErrorCode } from "@cosyte/x12";
const code: Rfai277BuildErrorCode = "X12_277_RFAI_BUILD_NO_LEVEL";
```

***

### SegmentSpec

> **SegmentSpec** = readonly `string`[]

A single body segment as a raw element array: `[segmentId, ...elements]`,
1-indexed against the X12 spec convention once placed (i.e. `spec[1]` is
element 1). Element values are LOGICAL - the builder applies the
`?`-release-character escape on emit so any active delimiter inside a value
survives. The segment id (`spec[0]`) is emitted verbatim. ST and SE are NOT
included here - the builder synthesizes them from [TransactionSetSpec](#transactionsetspec).

#### Example

```ts
const nm1: SegmentSpec = ["NM1", "IL", "1", "DOE", "JANE"];
```

***

### ServicesReview278BuildErrorCode

> **ServicesReview278BuildErrorCode** = *typeof* [`AUTH_278_BUILD_ERROR_CODES`](#auth_278_build_error_codes)\[keyof *typeof* [`AUTH_278_BUILD_ERROR_CODES`](#auth_278_build_error_codes)\]

String-literal union over [AUTH\_278\_BUILD\_ERROR\_CODES](#auth_278_build_error_codes). Used as
[ServicesReview278BuildError](#servicesreview278builderror).`code`.

***

### Ta1AckCode

> **Ta1AckCode** = *typeof* [`TA1_ACK_CODES`](#ta1_ack_codes)\[keyof *typeof* [`TA1_ACK_CODES`](#ta1_ack_codes)\]

String-literal union over [TA1\_ACK\_CODES](#ta1_ack_codes).

***

### Ta1NoteCode

> **Ta1NoteCode** = *typeof* [`TA1_NOTE_CODES`](#ta1_note_codes)\[keyof *typeof* [`TA1_NOTE_CODES`](#ta1_note_codes)\]

String-literal union over [TA1\_NOTE\_CODES](#ta1_note_codes) - the standard-issued
note codes `000` to `028`. Real-world inbound TA1 may carry a value past
`028` (some revisions extend the list); `parseTA1` exposes the
un-narrowed string on `noteCodeRaw` in that case, so the value survives
even when the union cannot statically type it. **It is post-`?`-unescape
as of a later release, and a clause here calling it VERBATIM is
deleted rather than reworded** - `raw.elements[5]` is the byte surface.

***

### X12\_837ServiceLine

> **X12\_837ServiceLine** = [`X12_837ServiceLineProfessional`](#x12_837servicelineprofessional) \| [`X12_837ServiceLineInstitutional`](#x12_837servicelineinstitutional) \| [`X12_837ServiceLineDental`](#x12_837servicelinedental)

Service-line discriminated union - one variant per TR3. The walker
picks the variant from the segment id (`SV1` → P, `SV2` → I, `SV3` →
D). When an `LX` opens a service line with no SVx segment that follows
before the next LX / SE, the line is dropped (an `X12_UNEXPECTED_SEGMENT`
warning will have already fired if the body content was structurally
impossible).

#### Example

```ts
import type { X12_837ServiceLine } from "@cosyte/x12";
declare const sl: X12_837ServiceLine;
switch (sl.variant) {
  case "P": sl.procedureCode; sl.diagnosisPointers; break;
  case "I": sl.revenueCode; break;
  case "D": sl.toothInformation; break;
}
```

***

### X12AaaConditionLevel

> **X12AaaConditionLevel** = `Exclude`\<[`X12AaaLevelContext`](#x12aaalevelcontext), *typeof* [`UNATTACHED`](#unattached)\>

String-literal union over [AAA\_CONDITION\_LEVELS](#aaa_condition_levels): the warning
discriminant minus its unknown-level member.

#### Example

```ts
import type { X12AaaConditionLevel } from "@cosyte/x12";
const level: X12AaaConditionLevel = "dependent";
```

***

### X12AaaLevelContext

> **X12AaaLevelContext** = *typeof* [`AAA_LEVEL_CONTEXTS`](#aaa_level_contexts)\[keyof *typeof* [`AAA_LEVEL_CONTEXTS`](#aaa_level_contexts)\]

String-literal union over [AAA\_LEVEL\_CONTEXTS](#aaa_level_contexts).

#### Example

```ts
import type { X12AaaLevelContext } from "@cosyte/x12";
const level: X12AaaLevelContext = "dependent";
```

***

### X12Ack997SetDispositionCode

> **X12Ack997SetDispositionCode** = *typeof* [`X12_997_SET_DISPOSITION_CODES`](#x12_997_set_disposition_codes)\[keyof *typeof* [`X12_997_SET_DISPOSITION_CODES`](#x12_997_set_disposition_codes)\]

String-literal union over [X12\_997\_SET\_DISPOSITION\_CODES](#x12_997_set_disposition_codes): the type
of AK5-01 on a 997.

#### Example

```ts
import type { X12Ack997SetDispositionCode } from "@cosyte/x12";
const accepted: X12Ack997SetDispositionCode = "A";
```

***

### X12AckDispositionCode

> **X12AckDispositionCode** = *typeof* [`X12_ACK_DISPOSITION_CODES`](#x12_ack_disposition_codes)\[keyof *typeof* [`X12_ACK_DISPOSITION_CODES`](#x12_ack_disposition_codes)\]

String-literal union over [X12\_ACK\_DISPOSITION\_CODES](#x12_ack_disposition_codes). Used as the
type of `AK9-01`, `IK5-01`, and the `disposition` field on the
ack-spec/parsed-ack models.

#### Example

```ts
import type { X12AckDispositionCode } from "@cosyte/x12";
function isReject(code: X12AckDispositionCode): boolean {
  return code === "R" || code === "M" || code === "W" || code === "X";
}
```

***

### X12BalanceInvariant

> **X12BalanceInvariant** = *typeof* [`BALANCE_INVARIANTS`](#balance_invariants)\[keyof *typeof* [`BALANCE_INVARIANTS`](#balance_invariants)\]

String-literal union over [BALANCE\_INVARIANTS](#balance_invariants).

#### Example

```ts
import type { X12BalanceInvariant } from "@cosyte/x12";
const which: X12BalanceInvariant = "service-line";
```

***

### X12BuildErrorCode

> **X12BuildErrorCode** = *typeof* [`X12_BUILD_ERROR_CODES`](#x12_build_error_codes)\[keyof *typeof* [`X12_BUILD_ERROR_CODES`](#x12_build_error_codes)\]

String-literal union over [X12\_BUILD\_ERROR\_CODES](#x12_build_error_codes). Used as
[X12BuildError](#x12builderror).`code`.

***

### X12Claim837Variant

> **X12Claim837Variant** = `"P"` \| `"I"` \| `"D"` \| `"unknown"`

837 variant - discriminator for the service-line union and for any
variant-specific helper logic. `"unknown"` covers transactions where
neither ST-03 nor a service-line segment id resolved the variant.

#### Example

```ts
import type { X12Claim837Variant } from "@cosyte/x12";
const v: X12Claim837Variant = "P";
```

***

### X12CodeListErrorCode

> **X12CodeListErrorCode** = *typeof* [`X12_CODE_LIST_ERROR_CODES`](#x12_code_list_error_codes)\[keyof *typeof* [`X12_CODE_LIST_ERROR_CODES`](#x12_code_list_error_codes)\]

String-literal union over [X12\_CODE\_LIST\_ERROR\_CODES](#x12_code_list_error_codes). Used as
[X12CodeListError](#x12codelisterror).`code`.

***

### X12ControlNumberPair

> **X12ControlNumberPair** = *typeof* [`CONTROL_NUMBER_PAIRS`](#control_number_pairs)\[keyof *typeof* [`CONTROL_NUMBER_PAIRS`](#control_number_pairs)\]

String-literal union over [CONTROL\_NUMBER\_PAIRS](#control_number_pairs).

#### Example

```ts
import type { X12ControlNumberPair } from "@cosyte/x12";
const pair: X12ControlNumberPair = "group";
```

***

### X12DecimalStatus

> **X12DecimalStatus** = `"decoded"` \| `"absent"` \| `"unparseable"`

Why a decimal read produced no [X12Decimal](#x12decimal), or that it produced
one. The three states are spec-distinct and were previously collapsed
onto a single `undefined`:

- `"decoded"` - the element matched the shape "../decimal.js".X12Decimal
  decodes, `[+-]?digits(.digits?)?`.
- `"absent"` - the element was missing or empty. The sender said nothing.
- `"unparseable"` - the element held bytes outside that shape. The sender
  said something and this library could not read it, which is a materially
  different fact from `"absent"`. **That shape is what this library reads;
  no clause of X12.6 is cited for it, so do not read this as an assertion
  about what type R does and does not permit.**

#### Example

```ts
import type { X12DecimalStatus } from "@cosyte/x12";
const status: X12DecimalStatus = "unparseable";
```

***

### X12FatalCode

> **X12FatalCode** = *typeof* [`FATAL_CODES`](#fatal_codes)\[keyof *typeof* [`FATAL_CODES`](#fatal_codes)\]

Discriminant type for `X12ParseError.code`. Narrowing a caught error by
this code lets consumers write exhaustive `switch` blocks (enabled by the
`switch-exhaustiveness-check` lint rule) and guarantees a typo-free
comparison against the `FATAL_CODES` registry.

#### Example

```ts
import type { X12FatalCode } from "@cosyte/x12";
function describe(code: X12FatalCode): string {
  switch (code) {
    case "X12_EMPTY_INPUT":
      return "input was empty";
    case "X12_NO_ISA_HEADER":
      return "missing ISA";
    case "X12_ISA_TOO_SHORT":
      return "ISA truncated";
    case "X12_INVALID_DELIMITERS":
      return "bad ISA delimiters";
  }
}
```

***

### X12HiCategory

> **X12HiCategory** = `"diagnosis"` \| `"procedure"` \| `"external-cause"` \| `"principal-diagnosis"` \| `"admitting-diagnosis"` \| `"patient-reason-for-visit"` \| `"drg"` \| `"condition"` \| `"occurrence"` \| `"occurrence-span"` \| `"value"` \| `"treatment"` \| `"unknown"`

Category of an HI qualifier - separates diagnoses from procedures from
the institutional NUBC code families. Consumers branching on the
category get exhaustiveness; the variant-specific helpers
(`getDiagnoses` / `getProcedures`) filter on it.

#### Example

```ts
import type { X12HiCategory } from "@cosyte/x12";
const c: X12HiCategory = "diagnosis";
```

***

### X12HiCodeSystem

> **X12HiCodeSystem** = `"ICD-10-CM"` \| `"ICD-10-PCS"` \| `"ICD-9-CM"` \| `"ICD-9-PCS"` \| `"DRG"` \| `"NDC"` \| `"NUBC-CONDITION"` \| `"NUBC-OCCURRENCE"` \| `"NUBC-OCCURRENCE-SPAN"` \| `"NUBC-VALUE"` \| `"NUBC-PATIENT-REASON"` \| `"unknown"`

Discriminant for the code system referenced by a single HI composite. The
`"unknown"` member is the catch-all for qualifiers outside the TR3-cited
set - verbatim code is preserved on the parsed structure and an
`X12_UNKNOWN_HI_QUALIFIER` warning is emitted.

#### Example

```ts
import type { X12HiCodeSystem } from "@cosyte/x12";
const sys: X12HiCodeSystem = "ICD-10-CM";
```

***

### X12HiQualifier

> **X12HiQualifier** = keyof *typeof* [`HI_QUALIFIERS`](#hi_qualifiers)

Stable string-literal union of every known HI qualifier the parser
recognizes. Inferred from [HI\_QUALIFIERS](#hi_qualifiers) keys.

#### Example

```ts
import type { X12HiQualifier } from "@cosyte/x12";
const q: X12HiQualifier = "ABK";
```

***

### X12OrphanAnchor

> **X12OrphanAnchor** = \{ `groupIndex`: `number`; `kind`: `"interchange"`; \} \| \{ `groupIndex`: `number`; `kind`: `"group"`; `transactionIndex`: `number`; \} \| \{ `groupIndex`: `number`; `kind`: `"transaction"`; `segmentOffset`: `number`; `transactionIndex`: `number`; \}

Where an orphan sat in the STRUCTURE of the interchange, as opposed to
where it sat in the input byte stream. This is what lets `serializeX12`
put an orphan back without guessing.

`X12OrphanSegment.segmentIndex` cannot do that job. It indexes the INPUT
stream, and the emit is not in input order: `ta1Segments` are hoisted ahead
of the groups, and a doubled terminator's zero-length segment occupies an
input index that is never emitted. Either one shifts the output's indices
away from the input's, so replaying by index splices the orphan into
whatever occupies that slot - measurably, into an 835's `ST..SE` body,
where a re-parse reports nothing. An anchor names a slot in the typed tree
instead, which survives both reorderings because it does not mention bytes.

Three kinds, one per structural level:

- **`"interchange"`** - between the ISA and the IEA but outside every
  functional group. `groupIndex` is the number of groups that had already
  closed, so the orphan is emitted immediately before `ix.groups[groupIndex]`
  (or before the IEA when `groupIndex === ix.groups.length`).
- **`"group"`** - inside `ix.groups[groupIndex]` but outside every
  transaction set in it. `transactionIndex` is the number of transactions
  that had already closed, so the orphan is emitted immediately before that
  group's `transactions[transactionIndex]` (or before its `GE` when
  `transactionIndex === transactions.length`).
- **`"transaction"`** - inside an open `ST..SE`, which only a `TA1` can be,
  since every other segment arriving there is body content. `segmentOffset`
  is the number of `rawSegments` already collected, so the orphan is emitted
  immediately before `rawSegments[segmentOffset]`. It is never `0` (the `ST`
  is always `rawSegments[0]`) and never exceeds `rawSegments.length`. Such an
  orphan is written back BETWEEN the `ST` and the `SE`, so `serializeX12`
  counts it toward SE-01 in spec-clean mode even though it is not on
  `tx.rawSegments` - it is a segment of that transaction set per X12.6.

**An anchor is a POSITION, so reshaping the model invalidates it.** The
indices address `ix.groups`, that group's `transactions`, and that
transaction's `rawSegments` as they stand on the interchange you pass to
`serializeX12`. Filter or reorder any of those and an orphan's anchor may
still resolve while naming a different slot, and it will be emitted there
with no warning. An anchor that resolves to nothing is emitted at
interchange level before the IEA rather than dropped. Re-parse rather than
hand-edit if you need anchors to stay meaningful.

#### Union Members

##### Type Literal

\{ `groupIndex`: `number`; `kind`: `"interchange"`; \}

###### groupIndex

> `readonly` **groupIndex**: `number`

How many functional groups had closed before this segment arrived.

###### kind

> `readonly` **kind**: `"interchange"`

***

##### Type Literal

\{ `groupIndex`: `number`; `kind`: `"group"`; `transactionIndex`: `number`; \}

###### groupIndex

> `readonly` **groupIndex**: `number`

Index into `ix.groups` of the group that was open.

###### kind

> `readonly` **kind**: `"group"`

###### transactionIndex

> `readonly` **transactionIndex**: `number`

How many transaction sets in that group had closed.

***

##### Type Literal

\{ `groupIndex`: `number`; `kind`: `"transaction"`; `segmentOffset`: `number`; `transactionIndex`: `number`; \}

###### groupIndex

> `readonly` **groupIndex**: `number`

Index into `ix.groups` of the group that was open.

###### kind

> `readonly` **kind**: `"transaction"`

###### segmentOffset

> `readonly` **segmentOffset**: `number`

How many of that set's `rawSegments` had been collected.

###### transactionIndex

> `readonly` **transactionIndex**: `number`

Index into that group's `transactions` of the set that was open.

#### Example

```ts
import { parseX12 } from "@cosyte/x12";
const ix = parseX12(raw);
for (const o of ix.orphanSegments) {
  if (o.anchor.kind === "group") console.warn(o.anchor.groupIndex);
}
```

***

### X12OrphanAnchorKind

> **X12OrphanAnchorKind** = [`X12OrphanAnchor`](#x12orphananchor)\[`"kind"`\]

String-literal union over the `kind` discriminant of [X12OrphanAnchor](#x12orphananchor).

#### Example

```ts
import type { X12OrphanAnchorKind } from "@cosyte/x12";
const kind: X12OrphanAnchorKind = "transaction";
```

***

### X12ProfileConformance

> **X12ProfileConformance** = `"permitted"` \| `"not-permitted"` \| `"undetermined"`

Whether the deviation a quirk describes is one a trading partner may
LAWFULLY require. The axis is 45 CFR 162.915, which forbids a covered
entity from entering a trading partner agreement that would change the
definition, data condition or use of a data element or segment in a
standard, add data elements or segments to the maximum defined data set,
use any code or data element marked "not used" in (or absent from) the
standard's implementation specification, or change the meaning or intent
of that implementation specification.

The three states, and what each one does and does not claim:

- `permitted` - a recorded judgement that none of 162.915(a) to (d) is
  engaged, so a partner may lawfully require the deviation. It is a
  statement about the RULE, never a promise that your partner's guide is
  correct in any other respect.
- `not-permitted` - a recorded judgement that the deviation is one 162.915
  forbids a partner from requiring. The profile still describes it, because
  describing what a partner SENDS is exactly what a profile is for; the
  classification says the partner is deviating from the adopted standard
  rather than that the standard supports the requirement.
- `undetermined` - NO judgement was recorded, or the recorded value was not
  one of the two above. This is the fail-safe default, and it is the value
  you get for any quirk that says nothing. Read it as "this library makes no
  claim", never as "permitted".

**Every one of these is a recorded human judgement, not a check this library
performed.** In particular, whether an element is marked "not used" in an
adopted implementation specification is not machine-checkable here: 45 CFR
162.920(a) states a fee is charged for those specifications, and none is
bundled with this package. A classification that rests on such a marking
rests on someone having read the guide and written the answer down. Treat it
as documentation, and confirm it against your own copy of the guide before
you rely on it. `KNOWN-LIMITATIONS.md` carries the same caveat for consumers
who never open this type.

#### Example

```ts
import type { X12ProfileConformance } from "@cosyte/x12";
const c: X12ProfileConformance = "undetermined";
```

***

### X12ProfileEffect

> **X12ProfileEffect** = `"relaxes"` \| `"adds"` \| `"requires"`

The bucket a quirk falls into when rendered by [X12Profile.describe](#describe).
A profile states what it relaxes, what it adds and what it requires.

- `relaxes` - the partner tolerates / emits a structural variation the
  strict 005010 baseline would flag (e.g. an alternate component
  delimiter).
- `adds` - the partner emits extra spec-optional content (e.g. additional
  REF segments) a generic consumer might not expect.
- `requires` - the partner mandates a normally-situational element be
  present.

#### Example

```ts
import type { X12ProfileEffect } from "@cosyte/x12";
const effect: X12ProfileEffect = "adds";
```

***

### X12RequiredLoop

> **X12RequiredLoop** = *typeof* [`REQUIRED_LOOPS`](#required_loops)\[keyof *typeof* [`REQUIRED_LOOPS`](#required_loops)\]

String-literal union over [REQUIRED\_LOOPS](#required_loops).

#### Example

```ts
import type { X12RequiredLoop } from "@cosyte/x12";
const loop: X12RequiredLoop = "2010BB";
```

***

### X12Tr3Adoption

> **X12Tr3Adoption** = `"incorporated-by-reference"` \| `"errata-in-practice"` \| `"not-adopted"`

How the identifier a row names stands against 45 CFR 162.920.

- `incorporated-by-reference`: that section names this exact identifier for
  this transaction.
- `errata-in-practice`: an errata revision the industry implements, which
  that section does not name for this transaction. The base identifier it
  DOES name is carried alongside, on `cfrAdopted`.
- `not-adopted`: the section names no identifier at all for this
  transaction, so there is nothing to be adopted or superseded.

#### Example

```ts
import { X12_TR3_CONFORMANCE, type X12Tr3Adoption } from "@cosyte/x12";
const strict: X12Tr3Adoption = "incorporated-by-reference";
X12_TR3_CONFORMANCE.filter((row) => row.adoption === strict).map((row) => row.transaction);
// ["275", "276", "277", "277", "278", "278", "820"]
```

***

### X12Tr3Direction

> **X12Tr3Direction** = `"read"` \| `"build"`

A direction a transaction is implemented in: `read` when the package decodes
it into a typed model, `build` when the package emits it from one.

#### Example

```ts
import { X12_TR3_CONFORMANCE, type X12Tr3Direction } from "@cosyte/x12";
const wanted: X12Tr3Direction = "build";
const emitted = X12_TR3_CONFORMANCE.filter((row) => row.directions.includes(wanted));
emitted.length; // rows this package can produce documents for
```

***

### X12UnexpectedSegmentContext

> **X12UnexpectedSegmentContext** = *typeof* [`UNEXPECTED_SEGMENT_CONTEXTS`](#unexpected_segment_contexts)\[keyof *typeof* [`UNEXPECTED_SEGMENT_CONTEXTS`](#unexpected_segment_contexts)\]

String-literal union over [UNEXPECTED\_SEGMENT\_CONTEXTS](#unexpected_segment_contexts).

#### Example

```ts
import type { X12UnexpectedSegmentContext } from "@cosyte/x12";
const ctx: X12UnexpectedSegmentContext = "se-without-st";
```

***

### X12WarningCode

> **X12WarningCode** = *typeof* [`WARNING_CODES`](#warning_codes)\[keyof *typeof* [`WARNING_CODES`](#warning_codes)\]

Discriminant type for `X12ParseWarning.code`. Narrowing a warning by this
code lets consumers write exhaustive `switch` blocks and guarantees a
typo-free comparison against the `WARNING_CODES` registry.

#### Example

```ts
import type { X12ParseWarning, X12WarningCode } from "@cosyte/x12";
function describe(w: X12ParseWarning): string {
  const code: X12WarningCode = w.code;
  switch (code) {
    case "X12_PRE_005010":
      return "pre-005010 sender";
    default:
      return `warning: ${code}`;
  }
}
```

## Variables

### AAA\_CONDITION\_LEVELS

> `const` **AAA\_CONDITION\_LEVELS**: `Readonly`\<\{ `DEPENDENT`: `"dependent"`; `INFORMATION_RECEIVER`: `"information-receiver"`; `INFORMATION_SOURCE`: `"information-source"`; `SUBSCRIBER`: `"subscriber"`; \}\>

The four hierarchical levels a 271 AAA request-validation segment can be
surfaced against. Derived from the library-owned warning discriminant so the
model and the diagnostics can never drift apart on what a level is called;
the discriminant's fifth member covers an AAA whose level is unknown, and on
the model that case is `undefined` rather than a fifth name.

#### Example

```ts
import { AAA_CONDITION_LEVELS } from "@cosyte/x12";
AAA_CONDITION_LEVELS.SUBSCRIBER; // "subscriber"
```

***

### AAA\_FOLLOW\_UP\_ACTION\_CODES

> `const` **AAA\_FOLLOW\_UP\_ACTION\_CODES**: [`AaaCodeListSnapshot`](#aaacodelistsnapshot)

Bundled **AAA-04 Follow-up Action Code** snapshot (X12 data element 889),
for the 271 request-validation surface. Ships EMPTY on the same terms as
[AAA\_REJECT\_REASON\_CODES](#aaa_reject_reason_codes); every inbound follow-up action code is
echoed verbatim with its description absent.

#### Example

```ts
import { AAA_FOLLOW_UP_ACTION_CODES } from "@cosyte/x12";
AAA_FOLLOW_UP_ACTION_CODES.meta.id; // "AAA-FOLLOW-UP-ACTION"
```

***

### AAA\_LEVEL\_CONTEXTS

> `const` **AAA\_LEVEL\_CONTEXTS**: `object`

Which hierarchical level a 271 AAA request-validation segment was read
under. A closed, library-owned discriminant: the four level names are the
reader's own vocabulary, NOT bytes taken out of the document, so a
diagnostic can say where the payer rejected without echoing anything the
sender sent.

`UNATTACHED` covers the AAA whose level this reader could not determine:
one transmitted before any hierarchical level opened, and one under a level
whose HL-03 is none of the four this surface names. It says the level is
unknown; it never guesses one.

#### Type Declaration

##### DEPENDENT

> `readonly` **DEPENDENT**: `"dependent"` = `"dependent"`

Loop 2000D, the dependent.

##### INFORMATION\_RECEIVER

> `readonly` **INFORMATION\_RECEIVER**: `"information-receiver"` = `"information-receiver"`

Loop 2000B, the information receiver (provider).

##### INFORMATION\_SOURCE

> `readonly` **INFORMATION\_SOURCE**: `"information-source"` = `"information-source"`

Loop 2000A, the information source (payer).

##### SUBSCRIBER

> `readonly` **SUBSCRIBER**: `"subscriber"` = `"subscriber"`

Loop 2000C, the subscriber.

##### UNATTACHED

> `readonly` **UNATTACHED**: `"unattached"` = `"unattached"`

No hierarchical level of a named kind encloses the segment.

#### Example

```ts
import { aaaRejectReasonAbsent, AAA_LEVEL_CONTEXTS } from "@cosyte/x12";
const w = aaaRejectReasonAbsent({ segmentIndex: 7 }, AAA_LEVEL_CONTEXTS.SUBSCRIBER);
```

***

### AAA\_REJECT\_REASON\_CODES

> `const` **AAA\_REJECT\_REASON\_CODES**: [`AaaCodeListSnapshot`](#aaacodelistsnapshot)

Bundled **AAA-03 Reject Reason Code** snapshot (X12 data element 901), for
the 271 request-validation surface. Ships EMPTY: no description source was
obtained, and the recorded redistribution terms do not permit bundling.
Every inbound reject reason code is echoed verbatim on the typed result with
its description absent.

#### Example

```ts
import { AAA_REJECT_REASON_CODES } from "@cosyte/x12";
AAA_REJECT_REASON_CODES.meta.id;          // "AAA-REJECT-REASON"
Object.keys(AAA_REJECT_REASON_CODES.codes).length; // 0
```

***

### ACK\_BUILD\_ERROR\_CODES

> `const` **ACK\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every `AckBuildError` thrown by the
acknowledgment builders. Locked here so consumers can narrow on
`err.code` exhaustively. Additions-only thereafter; renaming any of
these codes is a breaking change.

- `X12_ACK_INVALID_DISPOSITION` - A disposition was supplied that does
  not match "./codes.js".X12AckDispositionCode (or
  "./codes.js".Ta1AckCode for `buildTA1`).
- `X12_ACK_INVALID_SPEC` - A spec field violated a structural constraint
  the builder cannot recover from (e.g., an ISA-13 control number longer
  than the spec's 9-char limit).
- `X12_ACK_ACCEPT_WITH_ERRORS` - An `A` disposition was supplied
  alongside non-empty per-transaction errors or a transaction-set whose
  own disposition is not `A`. Refused - accept must mean accept. Use
  `E` for "accepted, errors noted" or `R` for "rejected" instead.
- `X12_ACK_COUNT_MISMATCH` - The functional-level
  `numberOfTransactionSets` / `numberReceived` / `numberAccepted` are
  internally inconsistent (e.g., accepted \> received) or do not match
  the supplied `transactionResponses` list.
- `X12_TA1_ACCEPT_WITH_NOTE` - A TA1 `A` ack code was supplied with a
  note code other than `000` (no error). Refused for the same safety
  reason: an accept cannot cite a non-zero note.

#### Type Declaration

##### X12\_ACK\_ACCEPT\_WITH\_ERRORS

> `readonly` **X12\_ACK\_ACCEPT\_WITH\_ERRORS**: `"X12_ACK_ACCEPT_WITH_ERRORS"` = `"X12_ACK_ACCEPT_WITH_ERRORS"`

##### X12\_ACK\_COUNT\_MISMATCH

> `readonly` **X12\_ACK\_COUNT\_MISMATCH**: `"X12_ACK_COUNT_MISMATCH"` = `"X12_ACK_COUNT_MISMATCH"`

##### X12\_ACK\_INVALID\_DISPOSITION

> `readonly` **X12\_ACK\_INVALID\_DISPOSITION**: `"X12_ACK_INVALID_DISPOSITION"` = `"X12_ACK_INVALID_DISPOSITION"`

##### X12\_ACK\_INVALID\_SPEC

> `readonly` **X12\_ACK\_INVALID\_SPEC**: `"X12_ACK_INVALID_SPEC"` = `"X12_ACK_INVALID_SPEC"`

##### X12\_TA1\_ACCEPT\_WITH\_NOTE

> `readonly` **X12\_TA1\_ACCEPT\_WITH\_NOTE**: `"X12_TA1_ACCEPT_WITH_NOTE"` = `"X12_TA1_ACCEPT_WITH_NOTE"`

#### Example

```ts
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "@cosyte/x12";
try {
  buildSomeAck();
} catch (err) {
  if (err instanceof AckBuildError && err.code === ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS) {
    // application bug - never silently accept with errors
  }
}
```

***

### ALL\_WARNING\_MESSAGES

> `const` **ALL\_WARNING\_MESSAGES**: `ReadonlySet`\<`string`\>

Every message string this library can put on a warning. Exported so a
consumer, or a conformance gate, can assert set membership: if
`ALL_WARNING_MESSAGES.has(w.message)` is ever false, something
interpolated document bytes into a diagnostic.

#### Example

```ts
import { parseX12, ALL_WARNING_MESSAGES } from "@cosyte/x12";
const ix = parseX12(raw);
ix.warnings.every((w) => ALL_WARNING_MESSAGES.has(w.message)); // true, always
```

***

### ATTACHMENT\_275\_BUILD\_ERROR\_CODES

> `const` **ATTACHMENT\_275\_BUILD\_ERROR\_CODES**: `object`

Stable codes for every [Attachment275BuildError](#attachment275builderror). Additions only.

- `X12_275_BUILD_NO_ATTACHMENT`: no line carries an attachment.
- `X12_275_BUILD_EMPTY_DATA`: an attachment's data holds no octet.
- `X12_275_BUILD_FILTER_CODE_INVALID`: an attachment's filter code is not
  exactly three characters.
- `X12_275_BUILD_DATA_NOT_OCTETS`: an attachment's data holds a character
  above U+00FF, which is not one octet, so no true BDS-02 could be written.
- `X12_275_BUILD_INVALID_SPEC`: the spec is not shaped like one: a value that
  is not a string, data that is neither a string nor a `Uint8Array`, a list
  that is not an array, an unusable delimiter set, or an empty or over-long
  control number.

#### Type Declaration

##### X12\_275\_BUILD\_DATA\_NOT\_OCTETS

> `readonly` **X12\_275\_BUILD\_DATA\_NOT\_OCTETS**: `"X12_275_BUILD_DATA_NOT_OCTETS"` = `"X12_275_BUILD_DATA_NOT_OCTETS"`

##### X12\_275\_BUILD\_EMPTY\_DATA

> `readonly` **X12\_275\_BUILD\_EMPTY\_DATA**: `"X12_275_BUILD_EMPTY_DATA"` = `"X12_275_BUILD_EMPTY_DATA"`

##### X12\_275\_BUILD\_FILTER\_CODE\_INVALID

> `readonly` **X12\_275\_BUILD\_FILTER\_CODE\_INVALID**: `"X12_275_BUILD_FILTER_CODE_INVALID"` = `"X12_275_BUILD_FILTER_CODE_INVALID"`

##### X12\_275\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_275\_BUILD\_INVALID\_SPEC**: `"X12_275_BUILD_INVALID_SPEC"` = `"X12_275_BUILD_INVALID_SPEC"`

##### X12\_275\_BUILD\_NO\_ATTACHMENT

> `readonly` **X12\_275\_BUILD\_NO\_ATTACHMENT**: `"X12_275_BUILD_NO_ATTACHMENT"` = `"X12_275_BUILD_NO_ATTACHMENT"`

#### Example

```ts
import { ATTACHMENT_275_BUILD_ERROR_CODES, Attachment275BuildError } from "@cosyte/x12";
try {
  // build275(spec);
} catch (err) {
  if (err instanceof Attachment275BuildError && err.code === ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA) {
    // an attachment carries at least one octet
  }
}
```

***

### AUTH\_278\_BUILD\_ERROR\_CODES

> `const` **AUTH\_278\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [ServicesReview278BuildError](#servicesreview278builderror). Locked
here so consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_278_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
  278 HL spine (a subscriber with neither a review nor a dependent; a
  dependent with no review). The message carries structural indices +
  counts only - never a member id / name.
- `X12_278_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed (a
  review whose HL-03 `levelCode` is outside `EV` / `SS`; a review with no
  `requestCategoryCode`; a request spec carrying an `HCR` certification
  decision - `HCR` is response-only; a response review with a decision whose
  `actionCode` is empty; an over-long ISA-13 control number). The message
  carries structural indices, counts and X12 control codes - never a member
  id / name.

#### Type Declaration

##### X12\_278\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_278\_BUILD\_INVALID\_HIERARCHY**: `"X12_278_BUILD_INVALID_HIERARCHY"` = `"X12_278_BUILD_INVALID_HIERARCHY"`

##### X12\_278\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_278\_BUILD\_INVALID\_SPEC**: `"X12_278_BUILD_INVALID_SPEC"` = `"X12_278_BUILD_INVALID_SPEC"`

#### Example

```ts
import { AUTH_278_BUILD_ERROR_CODES, ServicesReview278BuildError, build278Response } from "@cosyte/x12";
try {
  build278Response(spec);
} catch (err) {
  if (
    err instanceof ServicesReview278BuildError &&
    err.code === AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY
  ) {
    // the hierarchy is impossible - fix the tree, do not emit
  }
}
```

***

### AUTH\_278\_LOOP\_2000A

> `const` **AUTH\_278\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

278 Loop 2000A - Utilization Management Organization (UMO) HL. Triggered by
`HL` (`HL-03 = "20"`) - the top of the hierarchy, no parent. Carries the
UMO name NM1.

#### Example

```ts
import { AUTH_278_LOOP_2000A } from "@cosyte/x12";
AUTH_278_LOOP_2000A.trigger; // "HL"
```

***

### AUTH\_278\_LOOP\_2000B

> `const` **AUTH\_278\_LOOP\_2000B**: [`LoopSpec`](#loopspec)

278 Loop 2000B - Requester HL. Triggered by `HL` (`HL-03 = "21"`). The
requesting provider / facility.

#### Example

```ts
import { AUTH_278_LOOP_2000B } from "@cosyte/x12";
AUTH_278_LOOP_2000B.id; // "2000B"
```

***

### AUTH\_278\_LOOP\_2000C

> `const` **AUTH\_278\_LOOP\_2000C**: [`LoopSpec`](#loopspec)

278 Loop 2000C - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
Carries the subscriber name NM1 + DMG demographics.

#### Example

```ts
import { AUTH_278_LOOP_2000C } from "@cosyte/x12";
AUTH_278_LOOP_2000C.id; // "2000C"
```

***

### AUTH\_278\_LOOP\_2000D

> `const` **AUTH\_278\_LOOP\_2000D**: [`LoopSpec`](#loopspec)

278 Loop 2000D - Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
the dependent name NM1 + DMG demographics.

#### Example

```ts
import { AUTH_278_LOOP_2000D } from "@cosyte/x12";
AUTH_278_LOOP_2000D.id; // "2000D"
```

***

### AUTH\_278\_LOOP\_2000E

> `const` **AUTH\_278\_LOOP\_2000E**: [`LoopSpec`](#loopspec)

278 Loop 2000E - Patient Event HL. Triggered by `HL` (`HL-03 = "EV"`).
Anchors the `UM` services-review information, the `HCR` decision (response
only), `HI` diagnoses, the echoed `TRN`, and the service-provider NM1s.
Nests [AUTH\_278\_LOOP\_2000F](#auth_278_loop_2000f).

#### Example

```ts
import { AUTH_278_LOOP_2000E } from "@cosyte/x12";
AUTH_278_LOOP_2000E.children[0]?.id; // "2000F"
```

***

### AUTH\_278\_LOOP\_2000F

> `const` **AUTH\_278\_LOOP\_2000F**: [`LoopSpec`](#loopspec)

278 Loop 2000F - Service HL. Triggered by `HL` (`HL-03 = "SS"`). Carries a
service-level `UM` review and, in a response, its `HCR` decision.

#### Example

```ts
import { AUTH_278_LOOP_2000F } from "@cosyte/x12";
AUTH_278_LOOP_2000F.trigger; // "HL"
```

***

### BALANCE\_INVARIANTS

> `const` **BALANCE\_INVARIANTS**: `object`

Which 835 balance invariant failed. A library-owned discriminant naming
the TR3 equation. The amounts on either side stay on the model as
`X12Decimal` and are never rendered into the message: an EDI amount is a
consumer-controlled element like any other, and a 300,000-digit "amount"
would otherwise become a 300,000-byte diagnostic.

#### Type Declaration

##### CLAIM

> `readonly` **CLAIM**: `"claim"` = `"claim"`

`CLP-04 + sum(claim CAS + line CAS) == CLP-03`.

##### REMIT\_TOTAL

> `readonly` **REMIT\_TOTAL**: `"remit-total"` = `"remit-total"`

`sum(CLP-04) - sum(PLB amounts) == BPR-02`.

##### SERVICE\_LINE

> `readonly` **SERVICE\_LINE**: `"service-line"` = `"service-line"`

`SVC-03 + sum(line CAS) == SVC-02`.

#### Example

```ts
import { remitBalanceMismatch, BALANCE_INVARIANTS } from "@cosyte/x12";
const w = remitBalanceMismatch({ segmentIndex: 12 }, BALANCE_INVARIANTS.CLAIM);
```

***

### BUILD\_REFUSAL\_VALUE\_MAX\_LENGTH

> `const` **BUILD\_REFUSAL\_VALUE\_MAX\_LENGTH**: `63` = `63`

How many characters of a caller-supplied value survive into a refusal
message, whether it comes from a `build*` function or from
`defineProfile()`. Set to mirror the parser's own `SNIPPET_MAX_INPUT` (63),
so the two bounded copies in this library agree rather than each picking a
number. Comfortably wider than every slot it guards: an ISA-13 / IEA-02
control number is 9, a TA1-05 note code 3, an ST-01 transaction set id 3, an
834 maintenance type 2-3, an 837 service-line variant 1.

#### Example

```ts
import { BUILD_REFUSAL_VALUE_MAX_LENGTH } from "@cosyte/x12";
BUILD_REFUSAL_VALUE_MAX_LENGTH; // 63
```

***

### BUILD\_REFUSAL\_VALUE\_MAX\_RENDERED

> `const` **BUILD\_REFUSAL\_VALUE\_MAX\_RENDERED**: `number`

Hard ceiling, in characters, on the fragment [renderCallerValue](#rendercallervalue)
returns: [BUILD\_REFUSAL\_VALUE\_MAX\_LENGTH](#build_refusal_value_max_length) surviving characters, two
quotes, one ellipsis, and the ` (N characters)` suffix at its widest.
renderCallerJson is held to the same ceiling and comes in two
characters under it, because JSON supplies its own quotes.

**This is the bound on the FRAGMENT, not on the message.** A refusal message
is this plus the site's own fixed template text, which differs per site, so
the message is bounded by a constant but not by *this* constant. Measured on
this tree: a 120,000-character control number gives an 86-character fragment
and a **150-character** `X12BuildError.message` from `buildInterchange`. Do
not quote the ceiling as though it were a message length - an earlier
revision of the docs did exactly that, reporting "now 90 bytes" for a message
that is 150. The suite asserts the fragment against this constant and each
message against its own site.

#### Example

```ts
import { BUILD_REFUSAL_VALUE_MAX_RENDERED } from "@cosyte/x12";
BUILD_REFUSAL_VALUE_MAX_RENDERED; // 90
```

***

### CARC

> `const` **CARC**: [`DatedCodeListSnapshot`](#datedcodelistsnapshot)

Bundled CARC snapshot. `meta.publishedDate` is the WPC publication
date this subset reflects; `meta.snapshotDate` is when cosyte captured
it, and `meta.datesCapturedAt` / `meta.datesSource` say separately when the
per-code validity dates were read and from which maintainer page. The
`codes` and `dates` maps are frozen - use the [lookupCarc](#lookupcarc) helper for
the ergonomic `{ code, description }` shape consumed by the 835
helper.

`meta.maintainingOrganization` and `meta.redistribution` carry the answer a
consumer needs before displaying, caching or re-publishing a description:
this list is X12's and its descriptions require a purchased licence, so the
bundled snapshot stays exactly the cited part it has always been and the
record names the licensor to approach.

#### Example

```ts
import { CARC } from "@cosyte/x12";
CARC.meta.snapshotDate;              // "2026-06-27"
CARC.meta.datesCapturedAt;           // "2026-08-28"
CARC.codes["45"];                    // "Charge exceeds fee schedule..."
CARC.dates["45"]?.start;             // "1995-01-01"
Object.keys(CARC.codes).length;      // count of bundled codes
CARC.meta.maintainingOrganization;   // "ASC X12"
CARC.meta.redistribution?.status;    // "licence-required"
```

***

### checkCarcValidity

> `const` **checkCarcValidity**: (`code`, `documentDate`) => [`CodeValidityResult`](#codevalidityresult)

Report whether a CARC code was valid on the day a document was produced,
rather than only whether this package bundles it.

Three answers, never two. `valid` and `not-valid` are both claims backed by a
date the maintainer published; `indeterminate` says the shipped data cannot
decide, and carries the reason - the code is outside the bundled subset, or
it is inside it with no published start date. A code is NEVER reported valid
for want of evidence, which is the whole asymmetry here: a retired code read
as current is a payer credited with an adjustment reason it was not entitled
to use.

`documentDate` is a calendar day in `YYYY-MM-DD` or `CCYYMMDD` form. Anything
else, a JavaScript `Date` included, is refused with an
"./errors.js".X12CodeListError and yields no answer at all.

#### Parameters

##### code

`string`

##### documentDate

`string`

#### Returns

[`CodeValidityResult`](#codevalidityresult)

#### Example

```ts
import { checkCarcValidity } from "@cosyte/x12";
checkCarcValidity("1", "2026-06-27").validity;    // "valid"
checkCarcValidity("15", "2018-04-30").validity;   // "valid"
checkCarcValidity("15", "2018-05-01").validity;   // "not-valid" (stopped that day)
checkCarcValidity("9999", "20260627").validity;   // "indeterminate"
checkCarcValidity("9999", "20260627").code;       // "9999" (echoed verbatim)
```

***

### checkRarcValidity

> `const` **checkRarcValidity**: (`code`, `documentDate`) => [`CodeValidityResult`](#codevalidityresult)

Report whether a RARC code was valid on the day a document was produced.
Same three-state answer and the same fail-safe direction as
"./carc.js".checkCarcValidity: never `valid` for want of evidence,
and an `indeterminate` answer always names its reason.

`documentDate` is a calendar day in `YYYY-MM-DD` or `CCYYMMDD` form; anything
else is refused with an "./errors.js".X12CodeListError.

#### Parameters

##### code

`string`

##### documentDate

`string`

#### Returns

[`CodeValidityResult`](#codevalidityresult)

#### Example

```ts
import { checkRarcValidity } from "@cosyte/x12";
checkRarcValidity("N4", "2026-06-27").validity;  // "valid"
checkRarcValidity("N4", "1999-12-31").validity;  // "not-valid" (before its start)
checkRarcValidity("ZZZZ", "2026-06-27").reason;  // "code-not-in-bundled-subset"
```

***

### CLAIM\_837\_BUILD\_ERROR\_CODES

> `const` **CLAIM\_837\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Claim837BuildError](#claim837builderror). Locked here so
consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_837_BUILD_INVALID_HIERARCHY` - the billing-provider → subscriber →
  (claims | patient) tree cannot form a valid HL spine: no billing
  providers, a billing provider with no subscribers, a subscriber with
  neither direct claims nor dependent patients, or a dependent patient
  with no claims.
- `X12_837_BUILD_INVALID_SPEC` - a non-hierarchy structural precondition
  failed: an empty `claimId`, a claim with no service lines, a service
  line whose `variant` does not match the builder, an empty procedure /
  revenue code, or an over-length control number.

#### Type Declaration

##### X12\_837\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_837\_BUILD\_INVALID\_HIERARCHY**: `"X12_837_BUILD_INVALID_HIERARCHY"` = `"X12_837_BUILD_INVALID_HIERARCHY"`

##### X12\_837\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_837\_BUILD\_INVALID\_SPEC**: `"X12_837_BUILD_INVALID_SPEC"` = `"X12_837_BUILD_INVALID_SPEC"`

#### Example

```ts
import { CLAIM_837_BUILD_ERROR_CODES, Claim837BuildError, build837P } from "@cosyte/x12";
try {
  build837P(spec);
} catch (err) {
  if (
    err instanceof Claim837BuildError &&
    err.code === CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY
  ) {
    // the HL spine is impossible - fix the tree, do not emit
  }
}
```

***

### CLAIM\_837\_LOOP\_1000A

> `const` **CLAIM\_837\_LOOP\_1000A**: [`LoopSpec`](#loopspec)

837 Loop 1000A - Submitter Name. Same across variants.

#### Example

```ts
import { CLAIM_837_LOOP_1000A } from "@cosyte/x12";
CLAIM_837_LOOP_1000A.id; // "1000A"
```

***

### CLAIM\_837\_LOOP\_1000B

> `const` **CLAIM\_837\_LOOP\_1000B**: [`LoopSpec`](#loopspec)

837 Loop 1000B - Receiver Name. Same across variants.

#### Example

```ts
import { CLAIM_837_LOOP_1000B } from "@cosyte/x12";
CLAIM_837_LOOP_1000B.id; // "1000B"
```

***

### CLAIM\_837\_LOOP\_2010AA

> `const` **CLAIM\_837\_LOOP\_2010AA**: [`LoopSpec`](#loopspec)

837 Loop 2010AA - Billing Provider Name. Triggered by `NM1` with
`NM1-01 = "85"`. The trigger qualifier value is enforced in the walker
(the loop spec keys off the segment id, not the element value).

#### Example

```ts
import { CLAIM_837_LOOP_2010AA } from "@cosyte/x12";
CLAIM_837_LOOP_2010AA.trigger; // "NM1"
```

***

### CLAIM\_837\_LOOP\_2010BA

> `const` **CLAIM\_837\_LOOP\_2010BA**: [`LoopSpec`](#loopspec)

837 Loop 2010BA - Subscriber Name (NM1*IL). The subscriber identity
+ member id; address is situational.

#### Example

```ts
import { CLAIM_837_LOOP_2010BA } from "@cosyte/x12";
CLAIM_837_LOOP_2010BA.id; // "2010BA"
```

***

### CLAIM\_837\_LOOP\_2010BB

> `const` **CLAIM\_837\_LOOP\_2010BB**: [`LoopSpec`](#loopspec)

837 Loop 2010BB - Payer Name (NM1*PR). Identifies the payer the
provider is billing for this hierarchy.

#### Example

```ts
import { CLAIM_837_LOOP_2010BB } from "@cosyte/x12";
CLAIM_837_LOOP_2010BB.id; // "2010BB"
```

***

### CLAIM\_837\_LOOP\_2010CA

> `const` **CLAIM\_837\_LOOP\_2010CA**: [`LoopSpec`](#loopspec)

837 Loop 2010CA - Patient Name (NM1*QC). Triggered only when Loop 2000C
(patient HL) is present (patient ≠ subscriber).

#### Example

```ts
import { CLAIM_837_LOOP_2010CA } from "@cosyte/x12";
CLAIM_837_LOOP_2010CA.id; // "2010CA"
```

***

### CLAIM\_837\_LOOP\_2430

> `const` **CLAIM\_837\_LOOP\_2430**: [`LoopSpec`](#loopspec)

837 Loop 2430 - Line Adjudication Information. Triggered by `SVD`.
Captures a prior payer's adjudication of this line for COB.

#### Example

```ts
import { CLAIM_837_LOOP_2430 } from "@cosyte/x12";
CLAIM_837_LOOP_2430.trigger; // "SVD"
```

***

### CLAIM\_837D\_LOOP\_2000A

> `const` **CLAIM\_837D\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

837D Loop 2000A - Billing Provider Hierarchical Level (dental).

#### Example

```ts
import { CLAIM_837D_LOOP_2000A } from "@cosyte/x12";
CLAIM_837D_LOOP_2000A.id; // "2000A"
```

***

### CLAIM\_837D\_LOOP\_2300

> `const` **CLAIM\_837D\_LOOP\_2300**: [`LoopSpec`](#loopspec)

837D Loop 2300 - Claim Information (dental). Triggered by `CLM`.
Nests [CLAIM\_837D\_LOOP\_2400](#claim_837d_loop_2400) (SV3-led service lines).

#### Example

```ts
import { CLAIM_837D_LOOP_2300 } from "@cosyte/x12";
CLAIM_837D_LOOP_2300.trigger; // "CLM"
```

***

### CLAIM\_837D\_LOOP\_2400

> `const` **CLAIM\_837D\_LOOP\_2400**: [`LoopSpec`](#loopspec)

837D Loop 2400 - Service Line (dental). Body led by `SV3`; per-line
`TOO` segments capture tooth + surface detail.

#### Example

```ts
import { CLAIM_837D_LOOP_2400 } from "@cosyte/x12";
CLAIM_837D_LOOP_2400.trigger; // "LX"
```

***

### CLAIM\_837I\_LOOP\_2000A

> `const` **CLAIM\_837I\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

837I Loop 2000A - Billing Provider Hierarchical Level (institutional).

#### Example

```ts
import { CLAIM_837I_LOOP_2000A } from "@cosyte/x12";
CLAIM_837I_LOOP_2000A.id; // "2000A"
```

***

### CLAIM\_837I\_LOOP\_2300

> `const` **CLAIM\_837I\_LOOP\_2300**: [`LoopSpec`](#loopspec)

837I Loop 2300 - Claim Information (institutional). Triggered by `CLM`.
Nests [CLAIM\_837I\_LOOP\_2400](#claim_837i_loop_2400) (SV2-led service lines).

#### Example

```ts
import { CLAIM_837I_LOOP_2300 } from "@cosyte/x12";
CLAIM_837I_LOOP_2300.trigger; // "CLM"
```

***

### CLAIM\_837I\_LOOP\_2400

> `const` **CLAIM\_837I\_LOOP\_2400**: [`LoopSpec`](#loopspec)

837I Loop 2400 - Service Line (institutional). Body led by `SV2`
(revenue code + HCPCS).

#### Example

```ts
import { CLAIM_837I_LOOP_2400 } from "@cosyte/x12";
CLAIM_837I_LOOP_2400.trigger; // "LX"
```

***

### CLAIM\_837P\_LOOP\_2000A

> `const` **CLAIM\_837P\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

837P Loop 2000A - Billing Provider Hierarchical Level (professional).
Top of the HL tree for professional claims. Nests Loop 2010AA (Billing
Provider Name) and Loop 2000B (Subscriber HL).

#### Example

```ts
import { CLAIM_837P_LOOP_2000A } from "@cosyte/x12";
CLAIM_837P_LOOP_2000A.id; // "2000A"
```

***

### CLAIM\_837P\_LOOP\_2300

> `const` **CLAIM\_837P\_LOOP\_2300**: [`LoopSpec`](#loopspec)

837P Loop 2300 - Claim Information (professional). Triggered by `CLM`.
Nests [CLAIM\_837P\_LOOP\_2400](#claim_837p_loop_2400) (SV1-led service lines).

#### Example

```ts
import { CLAIM_837P_LOOP_2300 } from "@cosyte/x12";
CLAIM_837P_LOOP_2300.trigger; // "CLM"
```

***

### CLAIM\_837P\_LOOP\_2400

> `const` **CLAIM\_837P\_LOOP\_2400**: [`LoopSpec`](#loopspec)

837P Loop 2400 - Service Line (professional). Triggered by `LX`, body
led by `SV1`. Nests Loop 2410 (drug) and Loop 2430 (line adjudication).

#### Example

```ts
import { CLAIM_837P_LOOP_2400 } from "@cosyte/x12";
CLAIM_837P_LOOP_2400.trigger; // "LX"
```

***

### CLAIM\_837P\_LOOP\_2410

> `const` **CLAIM\_837P\_LOOP\_2410**: [`LoopSpec`](#loopspec)

837P Loop 2410 - Drug Identification. Triggered by `LIN` inside the
2400 service-line loop. Carries the NDC + dispensed quantity for a
professional pharmacy / injectable claim line.

#### Example

```ts
import { CLAIM_837P_LOOP_2410 } from "@cosyte/x12";
CLAIM_837P_LOOP_2410.trigger; // "LIN"
```

***

### CLAIM\_ADJUSTMENT\_GROUP\_CODES

> `const` **CLAIM\_ADJUSTMENT\_GROUP\_CODES**: `object`

The 4 spec-fixed Claim Adjustment Group Codes. Frozen literal union via
`as const` so consumers compare `code === CLAIM_ADJUSTMENT_GROUP_CODES.PR`
and TypeScript narrows exhaustively.

- `CO` - **Contractual Obligation.** The provider's contracted write-off
  (e.g. payer fee schedule below billed charges). **The PROVIDER eats
  this.** Posting `CO` to patient responsibility is the wrong-party bug.
- `PR` - **Patient Responsibility.** Patient deductible / coinsurance /
  copay / non-covered. **The PATIENT owes this.** This is the
  patient-statement total.
- `OA` - **Other Adjustment.** Used when neither CO nor PR fits -
  typically prior-payer payments, COB adjustments, withholding for
  refund. Use is fact-pattern-specific.
- `PI` - **Payer Initiated Reductions.** Payer-side reduction the
  provider may not dispute under the contract - e.g. bundling edits,
  prepayment review reductions.

#### Type Declaration

##### CO

> `readonly` **CO**: `"CO"` = `"CO"`

##### OA

> `readonly` **OA**: `"OA"` = `"OA"`

##### PI

> `readonly` **PI**: `"PI"` = `"PI"`

##### PR

> `readonly` **PR**: `"PR"` = `"PR"`

#### Example

```ts
import { CLAIM_ADJUSTMENT_GROUP_CODES } from "@cosyte/x12";
function bucketFor(group: string): "provider" | "patient" | "other" | "payer-edit" | "unknown" {
  switch (group) {
    case CLAIM_ADJUSTMENT_GROUP_CODES.CO: return "provider";
    case CLAIM_ADJUSTMENT_GROUP_CODES.PR: return "patient";
    case CLAIM_ADJUSTMENT_GROUP_CODES.OA: return "other";
    case CLAIM_ADJUSTMENT_GROUP_CODES.PI: return "payer-edit";
    default: return "unknown";
  }
}
```

***

### CLAIM\_STATUS\_276\_BUILD\_ERROR\_CODES

> `const` **CLAIM\_STATUS\_276\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [ClaimStatus276BuildError](#claimstatus276builderror). Locked here
so consumers can narrow exhaustively on `err.code`; additions-only thereafter
(renaming any code is a breaking change).

- `X12_276_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid 276
  HL spine (no information sources, a source with no receiver, a receiver
  with no service provider, a provider with no subscriber), or a list slot
  was handed something that is not a list. The message carries structural
  indices and counts only, never a member id, a name, a trace value or a
  claim number.
- `X12_276_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed: an
  over-long interchange control number, an empty control number, a non-string
  element value, or a level the builder cannot emit spec-clean (a level with
  no name loop, a level that asks about no claim, or a claim that asks
  nothing).

#### Type Declaration

##### X12\_276\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_276\_BUILD\_INVALID\_HIERARCHY**: `"X12_276_BUILD_INVALID_HIERARCHY"` = `"X12_276_BUILD_INVALID_HIERARCHY"`

##### X12\_276\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_276\_BUILD\_INVALID\_SPEC**: `"X12_276_BUILD_INVALID_SPEC"` = `"X12_276_BUILD_INVALID_SPEC"`

#### Example

```ts
import { CLAIM_STATUS_276_BUILD_ERROR_CODES, ClaimStatus276BuildError, build276 } from "@cosyte/x12";
try {
  build276(spec);
} catch (err) {
  if (
    err instanceof ClaimStatus276BuildError &&
    err.code === CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY
  ) {
    // the hierarchy is impossible - fix the tree, do not emit
  }
}
```

***

### CLAIM\_STATUS\_277\_BUILD\_ERROR\_CODES

> `const` **CLAIM\_STATUS\_277\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [ClaimStatus277BuildError](#claimstatus277builderror). Locked
here so consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_277_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
  277 HL spine (no sources, a source with no receiver, a receiver with no
  provider, a provider with no subscriber, a subscriber with neither
  claims nor dependents, a dependent with no claim). The message carries
  structural indices + counts only - never a member id / name.
- `X12_277_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed (a
  claim that would not materialize on read - no trace, no statuses, no
  service lines; a status whose first composite has no category code; a
  service line with no SVC-07 units of service count, which `005010X212`
  makes REQUIRED and `005010X214` does not, so this arm fires for
  `build277` and never for `build277CA`; an over-long ISA-13 control
  number).

#### Type Declaration

##### X12\_277\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_277\_BUILD\_INVALID\_HIERARCHY**: `"X12_277_BUILD_INVALID_HIERARCHY"` = `"X12_277_BUILD_INVALID_HIERARCHY"`

##### X12\_277\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_277\_BUILD\_INVALID\_SPEC**: `"X12_277_BUILD_INVALID_SPEC"` = `"X12_277_BUILD_INVALID_SPEC"`

#### Example

```ts
import { CLAIM_STATUS_277_BUILD_ERROR_CODES, ClaimStatus277BuildError, build277 } from "@cosyte/x12";
try {
  build277(spec);
} catch (err) {
  if (
    err instanceof ClaimStatus277BuildError &&
    err.code === CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY
  ) {
    // the hierarchy is impossible - fix the tree, do not emit
  }
}
```

***

### CLAIM\_STATUS\_CATEGORY\_CODES

> `const` **CLAIM\_STATUS\_CATEGORY\_CODES**: [`CodeListSnapshot`](#codelistsnapshot)

Bundled Claim Status Category Code (CSCC) snapshot. Used by the 277 and
277CA helpers to surface a human-readable category alongside each
verbatim CSCC parsed from an STC composite.

#### Example

```ts
import { CLAIM_STATUS_CATEGORY_CODES } from "@cosyte/x12";
CLAIM_STATUS_CATEGORY_CODES.codes["A2"]; // "Acknowledgement/Acceptance into adjudication system"
CLAIM_STATUS_CATEGORY_CODES.codes["F2"]; // "Finalized/Denial"
CLAIM_STATUS_CATEGORY_CODES.meta.redistribution?.status; // "licence-required"
```

***

### CLAIM\_STATUS\_CODES

> `const` **CLAIM\_STATUS\_CODES**: [`CodeListSnapshot`](#codelistsnapshot)

Bundled Claim Status Code (CSC) snapshot. Used by the 277 and 277CA
helpers to surface a human-readable status alongside each verbatim CSC
parsed from an STC composite.

#### Example

```ts
import { CLAIM_STATUS_CODES } from "@cosyte/x12";
CLAIM_STATUS_CODES.codes["20"]; // "Accepted for processing."
CLAIM_STATUS_CODES.codes["21"]; // "Missing or invalid information."
CLAIM_STATUS_CODES.meta.redistribution?.status; // "licence-required"
```

***

### CLP\_STATUS

> `const` **CLP\_STATUS**: [`CodeListSnapshot`](#codelistsnapshot)

Bundled CLP-02 (Claim Status) snapshot. Used by the 835 helper to
surface a human-readable description alongside the verbatim
disposition code.

#### Example

```ts
import { CLP_STATUS } from "@cosyte/x12";
CLP_STATUS.codes["1"];  // "Processed as Primary"
CLP_STATUS.codes["4"];  // "Denied"
CLP_STATUS.meta.redistribution?.status; // "not-established"
```

***

### CODE\_VALIDITY

> `const` **CODE\_VALIDITY**: `object`

The three answers to "was this code valid on that day". `not-valid` and
`indeterminate` are deliberately different answers: the first is a claim
this package can support from a published date, the second says the shipped
data cannot decide. A code is never reported `valid` for want of evidence.

#### Type Declaration

##### INDETERMINATE

> `readonly` **INDETERMINATE**: `"indeterminate"` = `"indeterminate"`

##### NOT\_VALID

> `readonly` **NOT\_VALID**: `"not-valid"` = `"not-valid"`

##### VALID

> `readonly` **VALID**: `"valid"` = `"valid"`

#### Example

```ts
import { CODE_VALIDITY, checkCarcValidity } from "@cosyte/x12";
checkCarcValidity("15", "2026-06-27").validity === CODE_VALIDITY.NOT_VALID; // true
```

***

### CODE\_VALIDITY\_REASONS

> `const` **CODE\_VALIDITY\_REASONS**: `object`

Why a validity answer came back `indeterminate`. Locked here so a consumer
can branch on the reason exhaustively; additions-only thereafter.

- `code-not-in-bundled-subset` - the code is not one this package bundles, so
  nothing is known about it. The inbound code is still echoed verbatim.
- `no-published-start-date` - the code IS bundled but the maintainer publishes
  no start date for it, so no interval exists to test the day against.

#### Type Declaration

##### CODE\_NOT\_IN\_BUNDLED\_SUBSET

> `readonly` **CODE\_NOT\_IN\_BUNDLED\_SUBSET**: `"code-not-in-bundled-subset"` = `"code-not-in-bundled-subset"`

##### NO\_PUBLISHED\_START\_DATE

> `readonly` **NO\_PUBLISHED\_START\_DATE**: `"no-published-start-date"` = `"no-published-start-date"`

#### Example

```ts
import { CODE_VALIDITY_REASONS, checkCarcValidity } from "@cosyte/x12";
checkCarcValidity("9999", "2026-06-27").reason;
// CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET
```

***

### CONTROL\_NUMBER\_PAIRS

> `const` **CONTROL\_NUMBER\_PAIRS**: `object`

Which header/trailer control-number pair disagreed. A library-owned
discriminant, NOT a value read out of the document: the useful part of
the diagnostic is that the two disagree and where each one sits, never
what either one says.

#### Type Declaration

##### GROUP

> `readonly` **GROUP**: `"group"` = `"group"`

GS-06 against GE-02.

##### INTERCHANGE

> `readonly` **INTERCHANGE**: `"interchange"` = `"interchange"`

ISA-13 against IEA-02.

##### TRANSACTION

> `readonly` **TRANSACTION**: `"transaction"` = `"transaction"`

ST-02 against SE-02.

#### Example

```ts
import { controlNumberMismatch, CONTROL_NUMBER_PAIRS } from "@cosyte/x12";
const w = controlNumberMismatch({ segmentIndex: 6 }, CONTROL_NUMBER_PAIRS.INTERCHANGE);
```

***

### CORE\_BUSINESS\_SCENARIOS

> `const` **CORE\_BUSINESS\_SCENARIOS**: `object`

Identifiers for the four CORE-defined business scenarios of CORE 360
Table 4.1.1-1, a closed set of four. The value is the scenario's number in
that table, so a table transcribed from a CAQH CORE publication maps its
scenario column onto these values one to one.

- `ADDITIONAL_INFORMATION_DOCUMENTATION` (`"scenario-1"`) - additional
  information required: documentation missing, invalid or incomplete.
- `ADDITIONAL_INFORMATION_CLAIM_DATA` (`"scenario-2"`) - additional
  information required: data from the submitted claim missing, invalid or
  incomplete.
- `SERVICE_NOT_COVERED` (`"scenario-3"`) - the billed service is not
  covered by the health plan.
- `NOT_SEPARATELY_PAYABLE` (`"scenario-4"`) - the benefit for the billed
  service is not separately payable.

Business scenarios a health plan defines for itself (CORE 360 permits them)
are not in this set, and a check naming one answers `unevaluated`.

#### Type Declaration

##### ADDITIONAL\_INFORMATION\_CLAIM\_DATA

> `readonly` **ADDITIONAL\_INFORMATION\_CLAIM\_DATA**: `"scenario-2"` = `"scenario-2"`

##### ADDITIONAL\_INFORMATION\_DOCUMENTATION

> `readonly` **ADDITIONAL\_INFORMATION\_DOCUMENTATION**: `"scenario-1"` = `"scenario-1"`

##### NOT\_SEPARATELY\_PAYABLE

> `readonly` **NOT\_SEPARATELY\_PAYABLE**: `"scenario-4"` = `"scenario-4"`

##### SERVICE\_NOT\_COVERED

> `readonly` **SERVICE\_NOT\_COVERED**: `"scenario-3"` = `"scenario-3"`

#### Example

```ts
import { CORE_BUSINESS_SCENARIOS } from "@cosyte/x12";
CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED; // "scenario-3"
```

***

### CORE\_CODE\_COMBINATION\_ERROR\_CODES

> `const` **CORE\_CODE\_COMBINATION\_ERROR\_CODES**: `object`

Stable string codes for every [CoreCodeCombinationTableError](#corecodecombinationtableerror). Locked
here so consumers can narrow on `err.code` exhaustively; additions-only
thereafter (renaming any code is a breaking change).

- `X12_CORE_COMBINATION_TABLE_INVALID` - the supplied combination table is
  malformed: its version label is missing, not a string or empty; its rows
  are not an array; a row is not an object; a row names a scenario outside
  the four CORE-defined business scenarios; a row's group code or reason
  code is missing, not a string or empty; or a row's remark code is present
  and not a string.

#### Type Declaration

##### X12\_CORE\_COMBINATION\_TABLE\_INVALID

> `readonly` **X12\_CORE\_COMBINATION\_TABLE\_INVALID**: `"X12_CORE_COMBINATION_TABLE_INVALID"` = `"X12_CORE_COMBINATION_TABLE_INVALID"`

#### Example

```ts
import {
  CORE_CODE_COMBINATION_ERROR_CODES,
  CoreCodeCombinationTableError,
  checkCoreCodeCombination,
} from "@cosyte/x12";
try {
  checkCoreCodeCombination({ table, scenario, adjustment });
} catch (err) {
  if (
    err instanceof CoreCodeCombinationTableError &&
    err.code === CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID
  ) {
    // configuration bug: fix the table you load, do not post against it
  }
}
```

***

### CORE\_CODE\_COMBINATION\_OUTCOMES

> `const` **CORE\_CODE\_COMBINATION\_OUTCOMES**: `object`

The three answers [checkCoreCodeCombination](#checkcorecodecombination) gives.

- `IN_TABLE` (`"in-table"`) - the table lists this group code and reason
  code for the scenario, and lists every supplied remark code with them.
- `NOT_IN_TABLE` (`"not-in-table"`) - the table has rows for the scenario,
  and the combination is not among them.
- `UNEVALUATED` (`"unevaluated"`) - the check could not decide. This is
  NOT permitted, and the result names the reason.

#### Type Declaration

##### IN\_TABLE

> `readonly` **IN\_TABLE**: `"in-table"` = `"in-table"`

##### NOT\_IN\_TABLE

> `readonly` **NOT\_IN\_TABLE**: `"not-in-table"` = `"not-in-table"`

##### UNEVALUATED

> `readonly` **UNEVALUATED**: `"unevaluated"` = `"unevaluated"`

#### Example

```ts
import { CORE_CODE_COMBINATION_OUTCOMES, checkCoreCodeCombination } from "@cosyte/x12";
const result = checkCoreCodeCombination({ table, scenario, adjustment, remarks });
if (result.outcome !== CORE_CODE_COMBINATION_OUTCOMES.IN_TABLE) {
  // route to a human: not in the table, or not decidable
}
```

***

### CORE\_CODE\_COMBINATION\_UNEVALUATED\_REASONS

> `const` **CORE\_CODE\_COMBINATION\_UNEVALUATED\_REASONS**: `object`

Why a check answered `unevaluated`. Each names what could not be judged and
none carries a value from the inputs.

- `NO_TABLE` - no table was supplied.
- `UNKNOWN_SCENARIO` - the scenario named is not one of the four
  CORE-defined business scenarios.
- `NO_ROWS_FOR_SCENARIO` - the table has no row for the named scenario.
- `GROUP_CODE_UNREADABLE` - the adjustment's group code is empty or not a
  string.
- `REASON_CODE_UNREADABLE` - the adjustment's reason code is empty or not a
  string.
- `REMARK_NOT_RARC` - a supplied remark carries a code system other than
  `HE` (for example an `RX` reject reason read from LQ-01).
- `REMARK_UNREADABLE` - the remarks are not a list, or one of them is not an
  object or carries a code that is not a string.

#### Type Declaration

##### GROUP\_CODE\_UNREADABLE

> `readonly` **GROUP\_CODE\_UNREADABLE**: `"group-code-unreadable"` = `"group-code-unreadable"`

##### NO\_ROWS\_FOR\_SCENARIO

> `readonly` **NO\_ROWS\_FOR\_SCENARIO**: `"no-rows-for-scenario"` = `"no-rows-for-scenario"`

##### NO\_TABLE

> `readonly` **NO\_TABLE**: `"no-table"` = `"no-table"`

##### REASON\_CODE\_UNREADABLE

> `readonly` **REASON\_CODE\_UNREADABLE**: `"reason-code-unreadable"` = `"reason-code-unreadable"`

##### REMARK\_NOT\_RARC

> `readonly` **REMARK\_NOT\_RARC**: `"remark-not-rarc"` = `"remark-not-rarc"`

##### REMARK\_UNREADABLE

> `readonly` **REMARK\_UNREADABLE**: `"remark-unreadable"` = `"remark-unreadable"`

##### UNKNOWN\_SCENARIO

> `readonly` **UNKNOWN\_SCENARIO**: `"unknown-scenario"` = `"unknown-scenario"`

#### Example

```ts
import { CORE_CODE_COMBINATION_UNEVALUATED_REASONS } from "@cosyte/x12";
CORE_CODE_COMBINATION_UNEVALUATED_REASONS.NO_TABLE; // "no-table"
```

***

### DELIMITER\_POSITIONS

> `const` **DELIMITER\_POSITIONS**: `object`

Zero-indexed byte positions of the four delimiter classes inside the
106-byte ISA. Locked by ASC X12 .5; do NOT make these configurable.

- `element` at byte 3 - the byte immediately after the literal `"ISA"`.
- `repetition` at byte 82 - ISA-11 (the Control Standards Identifier
  slot, repurposed as the repetition separator in 005010+).
- `component` at byte 104 - ISA-16 (the LAST element).
- `segment` at byte 105 - the byte immediately after ISA-16.

#### Type Declaration

##### component

> `readonly` **component**: `104` = `104`

##### element

> `readonly` **element**: `3` = `3`

##### repetition

> `readonly` **repetition**: `82` = `82`

##### segment

> `readonly` **segment**: `105` = `105`

#### Example

```ts
import { DELIMITER_POSITIONS } from "@cosyte/x12";
// The element separator is always the 4th byte of a well-formed ISA:
raw.charAt(DELIMITER_POSITIONS.element); // e.g. "*"
```

***

### ELIGIBILITY\_270\_BUILD\_ERROR\_CODES

> `const` **ELIGIBILITY\_270\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Eligibility270BuildError](#eligibility270builderror). Locked here
so consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_270_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
  270 HL spine (no information sources, a source with no receiver, a
  receiver with no subscriber), or a list slot was handed something that is
  not a list. The message carries structural indices and counts only, never
  a member id, a name or a trace value.
- `X12_270_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed: an
  over-long interchange control number, an empty control number, a
  non-string element value, or a level the builder cannot emit spec-clean
  (a subscriber or dependent with no name loop, or with no eligibility
  inquiry to ask).

#### Type Declaration

##### X12\_270\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_270\_BUILD\_INVALID\_HIERARCHY**: `"X12_270_BUILD_INVALID_HIERARCHY"` = `"X12_270_BUILD_INVALID_HIERARCHY"`

##### X12\_270\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_270\_BUILD\_INVALID\_SPEC**: `"X12_270_BUILD_INVALID_SPEC"` = `"X12_270_BUILD_INVALID_SPEC"`

#### Example

```ts
import { ELIGIBILITY_270_BUILD_ERROR_CODES, Eligibility270BuildError, build270 } from "@cosyte/x12";
try {
  build270(spec);
} catch (err) {
  if (
    err instanceof Eligibility270BuildError &&
    err.code === ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY
  ) {
    // the hierarchy is impossible - fix the tree, do not emit
  }
}
```

***

### ELIGIBILITY\_271\_BUILD\_ERROR\_CODES

> `const` **ELIGIBILITY\_271\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Eligibility271BuildError](#eligibility271builderror). Locked
here so consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_271_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
  271 HL spine (no information sources, a source with no receiver, a
  receiver with no subscriber). The message carries structural indices +
  counts only - never a member id / name (PHI discipline).
- `X12_271_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed (an
  over-long ISA-13 interchange control number).

#### Type Declaration

##### X12\_271\_BUILD\_INVALID\_HIERARCHY

> `readonly` **X12\_271\_BUILD\_INVALID\_HIERARCHY**: `"X12_271_BUILD_INVALID_HIERARCHY"` = `"X12_271_BUILD_INVALID_HIERARCHY"`

##### X12\_271\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_271\_BUILD\_INVALID\_SPEC**: `"X12_271_BUILD_INVALID_SPEC"` = `"X12_271_BUILD_INVALID_SPEC"`

#### Example

```ts
import { ELIGIBILITY_271_BUILD_ERROR_CODES, Eligibility271BuildError, build271 } from "@cosyte/x12";
try {
  build271(spec);
} catch (err) {
  if (
    err instanceof Eligibility271BuildError &&
    err.code === ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY
  ) {
    // the hierarchy is impossible - fix the tree, do not emit
  }
}
```

***

### ELIGIBILITY\_271\_LOOP\_2000A

> `const` **ELIGIBILITY\_271\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

271 Loop 2000A - Information Source HL (payer). Triggered by `HL`
(`HL-03 = "20"`); the level-code check happens in the walker. Nests the
Loop 2100A payer name.

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2000A } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2000A.trigger; // "HL"
```

***

### ELIGIBILITY\_271\_LOOP\_2000B

> `const` **ELIGIBILITY\_271\_LOOP\_2000B**: [`LoopSpec`](#loopspec)

271 Loop 2000B - Information Receiver HL (provider). Triggered by `HL`
(`HL-03 = "21"`). Carries the receiver NM1 + optional REF/N3/N4/PER and
request-validation AAA segments.

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2000B } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2000B.id; // "2000B"
```

***

### ELIGIBILITY\_271\_LOOP\_2000C

> `const` **ELIGIBILITY\_271\_LOOP\_2000C**: [`LoopSpec`](#loopspec)

271 Loop 2000C - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
Carries the echoed subscriber TRN traces and nests
[ELIGIBILITY\_271\_LOOP\_2100C](#eligibility_271_loop_2100c).

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2000C } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2000C.children[0]?.id; // "2100C"
```

***

### ELIGIBILITY\_271\_LOOP\_2000D

> `const` **ELIGIBILITY\_271\_LOOP\_2000D**: [`LoopSpec`](#loopspec)

271 Loop 2000D - Dependent HL. Triggered by `HL` (`HL-03 = "23"`).
Carries the echoed dependent TRN traces and nests
[ELIGIBILITY\_271\_LOOP\_2100D](#eligibility_271_loop_2100d).

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2000D } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2000D.id; // "2000D"
```

***

### ELIGIBILITY\_271\_LOOP\_2100C

> `const` **ELIGIBILITY\_271\_LOOP\_2100C**: [`LoopSpec`](#loopspec)

271 Loop 2100C - Subscriber Name. Triggered by `NM1` (`NM1-01 = "IL"`);
the qualifier check happens in the walker, not the spec. Nests
[ELIGIBILITY\_271\_LOOP\_2110](#eligibility_271_loop_2110).

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2100C } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2100C.children[0]?.trigger; // "EB"
```

***

### ELIGIBILITY\_271\_LOOP\_2100D

> `const` **ELIGIBILITY\_271\_LOOP\_2100D**: [`LoopSpec`](#loopspec)

271 Loop 2100D - Dependent Name. Triggered by `NM1` (`NM1-01 = "03"`).
Same shape as 2100C; nests [ELIGIBILITY\_271\_LOOP\_2110](#eligibility_271_loop_2110).

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2100D } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2100D.id; // "2100D"
```

***

### ELIGIBILITY\_271\_LOOP\_2110

> `const` **ELIGIBILITY\_271\_LOOP\_2110**: [`LoopSpec`](#loopspec)

271 Loop 2110 - Eligibility or Benefit Information. Triggered by `EB`.
Reused under both the subscriber (2110C) and dependent (2110D) name
loops - the segment shape is identical.

#### Example

```ts
import { ELIGIBILITY_271_LOOP_2110 } from "@cosyte/x12";
ELIGIBILITY_271_LOOP_2110.trigger; // "EB"
```

***

### ENROLLMENT\_834\_BUILD\_ERROR\_CODES

> `const` **ENROLLMENT\_834\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Enrollment834BuildError](#enrollment834builderror). Locked here
so consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE` - an `INS-03` or `HD-01`
  maintenance type code falls outside the X12 Code Source 875 subset the
  library validates against. The message carries the structural index of
  the affected member / coverage and the offending code (an X12 control
  code, never PHI).
- `X12_834_BUILD_INVALID_SPEC` - a non-maintenance precondition failed: no
  member loop, an empty (required) `INS-03`, or an over-long ISA-13
  interchange control number. The message carries structural indices +
  counts only - never a member id / name (PHI discipline).

#### Type Declaration

##### X12\_834\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_834\_BUILD\_INVALID\_SPEC**: `"X12_834_BUILD_INVALID_SPEC"` = `"X12_834_BUILD_INVALID_SPEC"`

##### X12\_834\_BUILD\_UNKNOWN\_MAINTENANCE\_TYPE

> `readonly` **X12\_834\_BUILD\_UNKNOWN\_MAINTENANCE\_TYPE**: `"X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE"` = `"X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE"`

#### Example

```ts
import { ENROLLMENT_834_BUILD_ERROR_CODES, Enrollment834BuildError, build834 } from "@cosyte/x12";
try {
  build834(spec);
} catch (err) {
  if (
    err instanceof Enrollment834BuildError &&
    err.code === ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE
  ) {
    // the maintenance action is unrecognized - fix the code, do not emit
  }
}
```

***

### ENROLLMENT\_834\_LOOP\_1000A

> `const` **ENROLLMENT\_834\_LOOP\_1000A**: [`LoopSpec`](#loopspec)

834 Loop 1000A - Sponsor Name. Triggered by `N1` with `N1-01 = "P5"`.

#### Example

```ts
import { ENROLLMENT_834_LOOP_1000A } from "@cosyte/x12";
ENROLLMENT_834_LOOP_1000A.id; // "1000A"
```

***

### ENROLLMENT\_834\_LOOP\_1000B

> `const` **ENROLLMENT\_834\_LOOP\_1000B**: [`LoopSpec`](#loopspec)

834 Loop 1000B - Payer. Triggered by `N1` with `N1-01 = "IN"`.

#### Example

```ts
import { ENROLLMENT_834_LOOP_1000B } from "@cosyte/x12";
ENROLLMENT_834_LOOP_1000B.id; // "1000B"
```

***

### ENROLLMENT\_834\_LOOP\_2000

> `const` **ENROLLMENT\_834\_LOOP\_2000**: [`LoopSpec`](#loopspec)

834 Loop 2000 - Member Level Detail. Triggered by `INS`. The streaming
unit of "./get-834.js".get834Enrollments - one yielded
`X12Enrollment` per `INS`. Nests Loop 2100A (member name) and Loop 2300
(health coverage).

#### Example

```ts
import { ENROLLMENT_834_LOOP_2000 } from "@cosyte/x12";
ENROLLMENT_834_LOOP_2000.trigger;          // "INS"
ENROLLMENT_834_LOOP_2000.children.map((c) => c.trigger); // ["NM1", "HD"]
```

***

### ENROLLMENT\_834\_LOOP\_2100A

> `const` **ENROLLMENT\_834\_LOOP\_2100A**: [`LoopSpec`](#loopspec)

834 Loop 2100A - Member Name. Triggered by `NM1` with `NM1-01 = "IL"`.

#### Example

```ts
import { ENROLLMENT_834_LOOP_2100A } from "@cosyte/x12";
ENROLLMENT_834_LOOP_2100A.trigger; // "NM1"
```

***

### ENROLLMENT\_834\_LOOP\_2300

> `const` **ENROLLMENT\_834\_LOOP\_2300**: [`LoopSpec`](#loopspec)

834 Loop 2300 - Health Coverage. Triggered by `HD`. Nests Loop 2320.

#### Example

```ts
import { ENROLLMENT_834_LOOP_2300 } from "@cosyte/x12";
ENROLLMENT_834_LOOP_2300.trigger;          // "HD"
ENROLLMENT_834_LOOP_2300.children[0]?.trigger; // "COB"
```

***

### ENROLLMENT\_834\_LOOP\_2320

> `const` **ENROLLMENT\_834\_LOOP\_2320**: [`LoopSpec`](#loopspec)

834 Loop 2320 - Coordination of Benefits. Triggered by `COB`.

#### Example

```ts
import { ENROLLMENT_834_LOOP_2320 } from "@cosyte/x12";
ENROLLMENT_834_LOOP_2320.trigger; // "COB"
```

***

### FATAL\_CODES

> `const` **FATAL\_CODES**: `object`

Stable string codes for every Tier-3 fatal `parseX12` may throw. The
registry is locked at four codes: anything else MUST be a Tier-2 warning.
Consumers narrow on `err.code` to react to specific structural failures.

#### Type Declaration

##### X12\_EMPTY\_INPUT

> `readonly` **X12\_EMPTY\_INPUT**: `"X12_EMPTY_INPUT"` = `"X12_EMPTY_INPUT"`

##### X12\_INVALID\_DELIMITERS

> `readonly` **X12\_INVALID\_DELIMITERS**: `"X12_INVALID_DELIMITERS"` = `"X12_INVALID_DELIMITERS"`

##### X12\_ISA\_TOO\_SHORT

> `readonly` **X12\_ISA\_TOO\_SHORT**: `"X12_ISA_TOO_SHORT"` = `"X12_ISA_TOO_SHORT"`

##### X12\_NO\_ISA\_HEADER

> `readonly` **X12\_NO\_ISA\_HEADER**: `"X12_NO_ISA_HEADER"` = `"X12_NO_ISA_HEADER"`

#### Example

```ts
import { parseX12, FATAL_CODES, X12ParseError } from "@cosyte/x12";
try {
  parseX12("");
} catch (err) {
  if (err instanceof X12ParseError && err.code === FATAL_CODES.X12_EMPTY_INPUT) {
    // handle empty input
  }
}
```

***

### HI\_QUALIFIERS

> `const` **HI\_QUALIFIERS**: `object`

The HI qualifier → ([X12HiCodeSystem](#x12hicodesystem) + [X12HiCategory](#x12hicategory))
registry. Frozen with `as const` so the keyset is type-narrowed for
downstream consumers. Each entry cites its TR3 use site in the
description so a reviewer can confirm against the source.

Snapshot covers the qualifiers cited across 837P/I/D TR3s plus the most
common NUBC code-set qualifiers. Additions are non-breaking; renames or
removals are breaking and require a public-surface bump.

#### Type Declaration

##### ABF

> `readonly` **ABF**: `object`

###### ABF.category

> `readonly` **category**: `"diagnosis"` = `"diagnosis"`

###### ABF.description

> `readonly` **description**: `"Other (secondary) diagnosis, ICD-10-CM."` = `"Other (secondary) diagnosis, ICD-10-CM."`

###### ABF.system

> `readonly` **system**: `"ICD-10-CM"` = `"ICD-10-CM"`

##### ABJ

> `readonly` **ABJ**: `object`

###### ABJ.category

> `readonly` **category**: `"admitting-diagnosis"` = `"admitting-diagnosis"`

###### ABJ.description

> `readonly` **description**: `"Admitting diagnosis, ICD-10-CM (837I inpatient)."` = `"Admitting diagnosis, ICD-10-CM (837I inpatient)."`

###### ABJ.system

> `readonly` **system**: `"ICD-10-CM"` = `"ICD-10-CM"`

##### ABK

> `readonly` **ABK**: `object`

###### ABK.category

> `readonly` **category**: `"principal-diagnosis"` = `"principal-diagnosis"`

###### ABK.description

> `readonly` **description**: `"Principal diagnosis, ICD-10-CM (837I; 837P uses ABK in HI-01 for the principal)."` = `"Principal diagnosis, ICD-10-CM (837I; 837P uses ABK in HI-01 for the principal)."`

###### ABK.system

> `readonly` **system**: `"ICD-10-CM"` = `"ICD-10-CM"`

##### ABN

> `readonly` **ABN**: `object`

###### ABN.category

> `readonly` **category**: `"patient-reason-for-visit"` = `"patient-reason-for-visit"`

###### ABN.description

> `readonly` **description**: `"Patient's reason for visit, ICD-10-CM (837I outpatient)."` = `"Patient's reason for visit, ICD-10-CM (837I outpatient)."`

###### ABN.system

> `readonly` **system**: `"ICD-10-CM"` = `"ICD-10-CM"`

##### APR

> `readonly` **APR**: `object`

###### APR.category

> `readonly` **category**: `"external-cause"` = `"external-cause"`

###### APR.description

> `readonly` **description**: `"External cause of injury, ICD-10-CM (V-Y codes)."` = `"External cause of injury, ICD-10-CM (V-Y codes)."`

###### APR.system

> `readonly` **system**: `"ICD-10-CM"` = `"ICD-10-CM"`

##### BBA

> `readonly` **BBA**: `object`

###### BBA.category

> `readonly` **category**: `"procedure"` = `"procedure"`

###### BBA.description

> `readonly` **description**: `"Other procedure, ICD-9-PCS (legacy; replaced by BBR)."` = `"Other procedure, ICD-9-PCS (legacy; replaced by BBR)."`

###### BBA.system

> `readonly` **system**: `"ICD-9-PCS"` = `"ICD-9-PCS"`

##### BBQ

> `readonly` **BBQ**: `object`

###### BBQ.category

> `readonly` **category**: `"treatment"` = `"treatment"`

###### BBQ.description

> `readonly` **description**: `"Principal procedure, ICD-10-PCS (837I)."` = `"Principal procedure, ICD-10-PCS (837I)."`

###### BBQ.system

> `readonly` **system**: `"ICD-10-PCS"` = `"ICD-10-PCS"`

##### BBR

> `readonly` **BBR**: `object`

###### BBR.category

> `readonly` **category**: `"procedure"` = `"procedure"`

###### BBR.description

> `readonly` **description**: `"Other (secondary) procedure, ICD-10-PCS (837I)."` = `"Other (secondary) procedure, ICD-10-PCS (837I)."`

###### BBR.system

> `readonly` **system**: `"ICD-10-PCS"` = `"ICD-10-PCS"`

##### BE

> `readonly` **BE**: `object`

###### BE.category

> `readonly` **category**: `"value"` = `"value"`

###### BE.description

> `readonly` **description**: `"Value code (NUBC FL 39-41) - paired amount in HI-NN-5 as decimal."` = `"Value code (NUBC FL 39-41) - paired amount in HI-NN-5 as decimal."`

###### BE.system

> `readonly` **system**: `"NUBC-VALUE"` = `"NUBC-VALUE"`

##### BF

> `readonly` **BF**: `object`

###### BF.category

> `readonly` **category**: `"diagnosis"` = `"diagnosis"`

###### BF.description

> `readonly` **description**: `"Other diagnosis, ICD-9-CM (legacy; replaced by ABF)."` = `"Other diagnosis, ICD-9-CM (legacy; replaced by ABF)."`

###### BF.system

> `readonly` **system**: `"ICD-9-CM"` = `"ICD-9-CM"`

##### BG

> `readonly` **BG**: `object`

###### BG.category

> `readonly` **category**: `"condition"` = `"condition"`

###### BG.description

> `readonly` **description**: `"Condition code (NUBC FL 18-28)."` = `"Condition code (NUBC FL 18-28)."`

###### BG.system

> `readonly` **system**: `"NUBC-CONDITION"` = `"NUBC-CONDITION"`

##### BH

> `readonly` **BH**: `object`

###### BH.category

> `readonly` **category**: `"occurrence"` = `"occurrence"`

###### BH.description

> `readonly` **description**: `"Occurrence code (NUBC FL 31-34) - date paired in HI-NN-4."` = `"Occurrence code (NUBC FL 31-34) - date paired in HI-NN-4."`

###### BH.system

> `readonly` **system**: `"NUBC-OCCURRENCE"` = `"NUBC-OCCURRENCE"`

##### BI

> `readonly` **BI**: `object`

###### BI.category

> `readonly` **category**: `"occurrence-span"` = `"occurrence-span"`

###### BI.description

> `readonly` **description**: `"Occurrence span code (NUBC FL 35-36) - date range in HI-NN-5/6."` = `"Occurrence span code (NUBC FL 35-36) - date range in HI-NN-5/6."`

###### BI.system

> `readonly` **system**: `"NUBC-OCCURRENCE-SPAN"` = `"NUBC-OCCURRENCE-SPAN"`

##### BJ

> `readonly` **BJ**: `object`

###### BJ.category

> `readonly` **category**: `"admitting-diagnosis"` = `"admitting-diagnosis"`

###### BJ.description

> `readonly` **description**: `"Admitting diagnosis, ICD-9-CM (legacy; replaced by ABJ)."` = `"Admitting diagnosis, ICD-9-CM (legacy; replaced by ABJ)."`

###### BJ.system

> `readonly` **system**: `"ICD-9-CM"` = `"ICD-9-CM"`

##### BK

> `readonly` **BK**: `object`

###### BK.category

> `readonly` **category**: `"principal-diagnosis"` = `"principal-diagnosis"`

###### BK.description

> `readonly` **description**: `"Principal diagnosis, ICD-9-CM (legacy; replaced by ABK 2015-10-01 onward)."` = `"Principal diagnosis, ICD-9-CM (legacy; replaced by ABK 2015-10-01 onward)."`

###### BK.system

> `readonly` **system**: `"ICD-9-CM"` = `"ICD-9-CM"`

##### BN

> `readonly` **BN**: `object`

###### BN.category

> `readonly` **category**: `"patient-reason-for-visit"` = `"patient-reason-for-visit"`

###### BN.description

> `readonly` **description**: `"Reason for visit, ICD-9-CM (legacy; replaced by ABN)."` = `"Reason for visit, ICD-9-CM (legacy; replaced by ABN)."`

###### BN.system

> `readonly` **system**: `"ICD-9-CM"` = `"ICD-9-CM"`

##### BQ

> `readonly` **BQ**: `object`

###### BQ.category

> `readonly` **category**: `"treatment"` = `"treatment"`

###### BQ.description

> `readonly` **description**: `"Principal procedure, ICD-9-PCS (legacy; replaced by BBQ)."` = `"Principal procedure, ICD-9-PCS (legacy; replaced by BBQ)."`

###### BQ.system

> `readonly` **system**: `"ICD-9-PCS"` = `"ICD-9-PCS"`

##### BR

> `readonly` **BR**: `object`

###### BR.category

> `readonly` **category**: `"external-cause"` = `"external-cause"`

###### BR.description

> `readonly` **description**: `"External cause of injury, ICD-9-CM (legacy; replaced by APR)."` = `"External cause of injury, ICD-9-CM (legacy; replaced by APR)."`

###### BR.system

> `readonly` **system**: `"ICD-9-CM"` = `"ICD-9-CM"`

##### DR

> `readonly` **DR**: `object`

###### DR.category

> `readonly` **category**: `"drg"` = `"drg"`

###### DR.description

> `readonly` **description**: `"Diagnosis Related Group (DRG) - payment-grouping code."` = `"Diagnosis Related Group (DRG) - payment-grouping code."`

###### DR.system

> `readonly` **system**: `"DRG"` = `"DRG"`

##### PR

> `readonly` **PR**: `object`

###### PR.category

> `readonly` **category**: `"patient-reason-for-visit"` = `"patient-reason-for-visit"`

###### PR.description

> `readonly` **description**: `"Patient reason for visit (837I outpatient secondary code; ICD-10-CM coded)."` = `"Patient reason for visit (837I outpatient secondary code; ICD-10-CM coded)."`

###### PR.system

> `readonly` **system**: `"NUBC-PATIENT-REASON"` = `"NUBC-PATIENT-REASON"`

#### Example

```ts
import { HI_QUALIFIERS, resolveHiQualifier } from "@cosyte/x12";
HI_QUALIFIERS.ABK.system;   // "ICD-10-CM"
resolveHiQualifier("ABK");  // { system: "ICD-10-CM", category: "principal-diagnosis", ... }
resolveHiQualifier("ZZZ");  // undefined
```

***

### HL\_LEVEL\_CODES

> `const` **HL\_LEVEL\_CODES**: `Readonly`\<\{ `DEPENDENT`: `"23"`; `INFORMATION_RECEIVER`: `"21"`; `INFORMATION_SOURCE`: `"20"`; `SUBSCRIBER`: `"22"`; \}\>

HL level codes per X12 0736 + 837 TR3 conventions. `INFORMATION_SOURCE`
is the billing provider (top of the tree); `SUBSCRIBER` is the
insurance subscriber; `DEPENDENT` is a non-subscriber patient.

#### Example

```ts
import { HL_LEVEL_CODES } from "@cosyte/x12";
HL_LEVEL_CODES.INFORMATION_SOURCE; // "20"
HL_LEVEL_CODES.SUBSCRIBER;         // "22"
HL_LEVEL_CODES.DEPENDENT;          // "23"
```

***

### IK3\_SYNTAX\_ERROR\_CODES

> `const` **IK3\_SYNTAX\_ERROR\_CODES**: `object`

IK3-04 implementation segment syntax error codes (ASC X12 code list 716).
Cited per IK3 segment to identify the structural issue against the
inbound segment. The library NEVER auto-classifies - the application
supplies the code; the library mechanically builds the IK3 around it.

- `1` - Unrecognized segment ID.
- `2` - Unexpected segment.
- `3` - Required segment missing.
- `4` - Loop occurs over maximum times.
- `5` - Segment exceeds maximum use.
- `6` - Segment not in defined transaction set.
- `7` - Segment not in proper sequence.
- `8` - Segment has data element errors.
- `I4` - Implementation "Not Used" segment present.
- `I6` - Implementation dependent segment missing.
- `I7` - Implementation loop occurs under minimum times.
- `I8` - Implementation segment below minimum use.
- `I9` - Implementation dependent "Not Used" segment present.

#### Type Declaration

##### 1

> `readonly` **1**: `"1"` = `"1"`

##### 2

> `readonly` **2**: `"2"` = `"2"`

##### 3

> `readonly` **3**: `"3"` = `"3"`

##### 4

> `readonly` **4**: `"4"` = `"4"`

##### 5

> `readonly` **5**: `"5"` = `"5"`

##### 6

> `readonly` **6**: `"6"` = `"6"`

##### 7

> `readonly` **7**: `"7"` = `"7"`

##### 8

> `readonly` **8**: `"8"` = `"8"`

##### I4

> `readonly` **I4**: `"I4"` = `"I4"`

##### I6

> `readonly` **I6**: `"I6"` = `"I6"`

##### I7

> `readonly` **I7**: `"I7"` = `"I7"`

##### I8

> `readonly` **I8**: `"I8"` = `"I8"`

##### I9

> `readonly` **I9**: `"I9"` = `"I9"`

#### Example

```ts
import type { Ik304Code } from "@cosyte/x12";
const required: Ik304Code = "3";
```

***

### IK4\_SYNTAX\_ERROR\_CODES

> `const` **IK4\_SYNTAX\_ERROR\_CODES**: `object`

IK4-03 implementation data element syntax error codes (ASC X12 code list
723). Cited per IK4 segment to identify the issue against the inbound
element/component/repetition.

- `1` - Required data element missing.
- `2` - Conditional required data element missing.
- `3` - Too many data elements.
- `4` - Data element too short.
- `5` - Data element too long.
- `6` - Invalid character in data element.
- `7` - Invalid code value.
- `8` - Invalid date.
- `9` - Invalid time.
- `10` - Exclusion condition violated.
- `12` - Too many repetitions.
- `13` - Too many components.
- `I6` - Code value not used in implementation.
- `I9` - Implementation dependent data element missing.
- `I10` - Implementation "Not Used" data element present.
- `I11` - Implementation too few repetitions.
- `I12` - Implementation pattern match failure.
- `I13` - Implementation dependent "Not Used" data element present.

#### Type Declaration

##### 1

> `readonly` **1**: `"1"` = `"1"`

##### 10

> `readonly` **10**: `"10"` = `"10"`

##### 12

> `readonly` **12**: `"12"` = `"12"`

##### 13

> `readonly` **13**: `"13"` = `"13"`

##### 2

> `readonly` **2**: `"2"` = `"2"`

##### 3

> `readonly` **3**: `"3"` = `"3"`

##### 4

> `readonly` **4**: `"4"` = `"4"`

##### 5

> `readonly` **5**: `"5"` = `"5"`

##### 6

> `readonly` **6**: `"6"` = `"6"`

##### 7

> `readonly` **7**: `"7"` = `"7"`

##### 8

> `readonly` **8**: `"8"` = `"8"`

##### 9

> `readonly` **9**: `"9"` = `"9"`

##### I10

> `readonly` **I10**: `"I10"` = `"I10"`

##### I11

> `readonly` **I11**: `"I11"` = `"I11"`

##### I12

> `readonly` **I12**: `"I12"` = `"I12"`

##### I13

> `readonly` **I13**: `"I13"` = `"I13"`

##### I6

> `readonly` **I6**: `"I6"` = `"I6"`

##### I9

> `readonly` **I9**: `"I9"` = `"I9"`

#### Example

```ts
import type { Ik403Code } from "@cosyte/x12";
const tooShort: Ik403Code = "4";
```

***

### INQUIRY\_270\_LOOP\_2000A

> `const` **INQUIRY\_270\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

270 Loop 2000A - Information Source HL (the payer being asked). Triggered
by `HL` (`HL-03 = "20"`); the level-code check happens in the walker.

#### Example

```ts
import { INQUIRY_270_LOOP_2000A } from "@cosyte/x12";
INQUIRY_270_LOOP_2000A.trigger; // "HL"
```

***

### INQUIRY\_270\_LOOP\_2000B

> `const` **INQUIRY\_270\_LOOP\_2000B**: [`LoopSpec`](#loopspec)

270 Loop 2000B - Information Receiver HL (the provider asking). Triggered
by `HL` (`HL-03 = "21"`).

#### Example

```ts
import { INQUIRY_270_LOOP_2000B } from "@cosyte/x12";
INQUIRY_270_LOOP_2000B.id; // "2000B"
```

***

### INQUIRY\_270\_LOOP\_2000C

> `const` **INQUIRY\_270\_LOOP\_2000C**: [`LoopSpec`](#loopspec)

270 Loop 2000C - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`). Carries
the TRN traces a 271 must echo back and nests
[INQUIRY\_270\_LOOP\_2100C](#inquiry_270_loop_2100c).

#### Example

```ts
import { INQUIRY_270_LOOP_2000C } from "@cosyte/x12";
INQUIRY_270_LOOP_2000C.children[0]?.id; // "2100C"
```

***

### INQUIRY\_270\_LOOP\_2000D

> `const` **INQUIRY\_270\_LOOP\_2000D**: [`LoopSpec`](#loopspec)

270 Loop 2000D - Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
the dependent's own TRN traces and nests [INQUIRY\_270\_LOOP\_2100D](#inquiry_270_loop_2100d).

#### Example

```ts
import { INQUIRY_270_LOOP_2000D } from "@cosyte/x12";
INQUIRY_270_LOOP_2000D.id; // "2000D"
```

***

### INQUIRY\_270\_LOOP\_2100C

> `const` **INQUIRY\_270\_LOOP\_2100C**: [`LoopSpec`](#loopspec)

270 Loop 2100C - Subscriber Name. Triggered by `NM1` (`NM1-01 = "IL"`); the
qualifier check happens in the walker, not the spec. Nests
[INQUIRY\_270\_LOOP\_2110](#inquiry_270_loop_2110).

#### Example

```ts
import { INQUIRY_270_LOOP_2100C } from "@cosyte/x12";
INQUIRY_270_LOOP_2100C.children[0]?.trigger; // "EQ"
```

***

### INQUIRY\_270\_LOOP\_2100D

> `const` **INQUIRY\_270\_LOOP\_2100D**: [`LoopSpec`](#loopspec)

270 Loop 2100D - Dependent Name. Triggered by `NM1` (`NM1-01 = "03"`). Same
shape as 2100C; nests [INQUIRY\_270\_LOOP\_2110](#inquiry_270_loop_2110).

#### Example

```ts
import { INQUIRY_270_LOOP_2100D } from "@cosyte/x12";
INQUIRY_270_LOOP_2100D.id; // "2100D"
```

***

### INQUIRY\_270\_LOOP\_2110

> `const` **INQUIRY\_270\_LOOP\_2110**: [`LoopSpec`](#loopspec)

270 Loop 2110 - Eligibility or Benefit Inquiry. Triggered by `EQ`. Reused
under both the subscriber (2110C) and dependent (2110D) name loops: the
segment shape is identical.

#### Example

```ts
import { INQUIRY_270_LOOP_2110 } from "@cosyte/x12";
INQUIRY_270_LOOP_2110.trigger; // "EQ"
```

***

### ISA\_MIN\_LENGTH

> `const` **ISA\_MIN\_LENGTH**: `106` = `106`

Minimum number of bytes a valid ISA segment occupies. ASC X12 .5 fixes
the ISA at 106 bytes total, **including** the trailing segment
terminator: 3 ("ISA") + 16 element separators + 86 element-value bytes
(sum of fixed widths 2+10+2+10+2+15+2+15+6+4+1+5+9+1+1+1) + 1
terminator = 106. Anything shorter cannot carry the 16 ISA elements and
is Tier-3 `X12_ISA_TOO_SHORT`.

#### Example

```ts
import { ISA_MIN_LENGTH } from "@cosyte/x12";
ISA_MIN_LENGTH; // 106 - a raw interchange shorter than this is X12_ISA_TOO_SHORT
```

***

### lookupAaaFollowUpAction

> `const` **lookupAaaFollowUpAction**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up an AAA-04 Follow-up Action Code description. Returns `undefined` for
every code while the snapshot is empty.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupAaaFollowUpAction } from "@cosyte/x12";
lookupAaaFollowUpAction("C"); // undefined (snapshot ships empty)
```

***

### lookupAaaRejectReason

> `const` **lookupAaaRejectReason**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up an AAA-03 Reject Reason Code description. Returns `undefined` for
every code while the snapshot is empty, which is the fail-safe: the verbatim
inbound code is preserved on the typed result either way.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupAaaRejectReason } from "@cosyte/x12";
lookupAaaRejectReason("42"); // undefined (snapshot ships empty)
```

***

### lookupCarc

> `const` **lookupCarc**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a CARC code's bundled description. Returns `undefined` when
the code is not in the initial subset - the verbatim code is still
preserved on the parsed model and the 835 walker emits
`X12_UNKNOWN_CARC` so consumers know the description gap exists.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupCarc } from "@cosyte/x12";
lookupCarc("45")?.description; // "Charge exceeds fee schedule..."
lookupCarc("9999");            // undefined (outside the bundled subset)
```

***

### lookupClaimStatus

> `const` **lookupClaimStatus**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a Claim Status Code (CSC) description from the bundled snapshot.
Returns `undefined` for codes outside the subset; the verbatim code is
always preserved on the parsed status model.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupClaimStatus } from "@cosyte/x12";
lookupClaimStatus("20")?.description; // "Accepted for processing."
lookupClaimStatus("99999");           // undefined (outside subset)
```

***

### lookupClaimStatusCategory

> `const` **lookupClaimStatusCategory**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a Claim Status Category Code (CSCC) description from the bundled
snapshot. Returns `undefined` for codes outside the subset; the verbatim
code is always preserved on the parsed status model.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupClaimStatusCategory } from "@cosyte/x12";
lookupClaimStatusCategory("A2")?.description; // "Acknowledgement/Acceptance..."
lookupClaimStatusCategory("ZZ");              // undefined (outside subset)
```

***

### lookupClpStatus

> `const` **lookupClpStatus**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a CLP-02 claim status code's bundled description. Returns
`undefined` for codes outside the initial subset; the verbatim code is
still preserved on the parsed claim model.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupClpStatus } from "@cosyte/x12";
lookupClpStatus("1")?.description; // "Processed as Primary"
lookupClpStatus("99");             // undefined (outside subset)
```

***

### lookupMaintenanceType

> `const` **lookupMaintenanceType**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up an INS-03 maintenance type code's bundled description. Returns
`undefined` for codes outside the subset; the verbatim code is still
preserved on the parsed enrollment, and the 834 helper raises an
`X12_834_UNKNOWN_MAINTENANCE_TYPE` warning so a consumer never silently
mis-applies an unknown action.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupMaintenanceType } from "@cosyte/x12";
lookupMaintenanceType("024")?.description; // "Cancellation or Termination"
lookupMaintenanceType("999");              // undefined (outside subset)
```

***

### lookupRarc

> `const` **lookupRarc**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a RARC code's bundled description. Same fail-safe semantics as
"./carc.js".lookupCarc: unknown codes return `undefined`, the
verbatim code is preserved on the parsed model, and the 835 walker
emits `X12_UNKNOWN_RARC`.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupRarc } from "@cosyte/x12";
lookupRarc("N4")?.description; // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
```

***

### lookupServiceType

> `const` **lookupServiceType**: (`code`) => [`CodeListEntry`](#codelistentry) \| `undefined`

Look up a Service Type Code (EB-03) description from the bundled
snapshot. Returns `undefined` for codes outside the initial subset; the
verbatim code is still preserved on the parsed benefit model.

#### Parameters

##### code

`string`

#### Returns

[`CodeListEntry`](#codelistentry) \| `undefined`

#### Example

```ts
import { lookupServiceType } from "@cosyte/x12";
lookupServiceType("30")?.description; // "Health Benefit Plan Coverage"
lookupServiceType("ZZ");              // undefined (outside subset)
```

***

### MAINTENANCE\_TYPE\_CODES

> `const` **MAINTENANCE\_TYPE\_CODES**: [`CodeListSnapshot`](#codelistsnapshot)

Bundled INS-03 (Maintenance Type) snapshot. Used by the 834 helper to
surface a human-readable description alongside the verbatim maintenance
code, and to drive the `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning when a
code falls outside this set.

#### Example

```ts
import { MAINTENANCE_TYPE_CODES } from "@cosyte/x12";
MAINTENANCE_TYPE_CODES.codes["021"]; // "Addition"
MAINTENANCE_TYPE_CODES.codes["024"]; // "Cancellation or Termination"
MAINTENANCE_TYPE_CODES.meta.redistribution?.status; // "not-established"
```

***

### NM1\_QUALIFIERS

> `const` **NM1\_QUALIFIERS**: `Readonly`\<\{ `BILLING_PROVIDER`: `"85"`; `PATIENT`: `"QC"`; `PAY_TO_ADDRESS`: `"87"`; `PAY_TO_PLAN`: `"PE"`; `PAYER`: `"PR"`; `RECEIVER`: `"40"`; `SUBMITTER`: `"41"`; `SUBSCRIBER`: `"IL"`; \}\>

NM1-01 entity-identifier codes used by the 837 walker to route an NM1
onto the right entity slot. Curated to the qualifiers the v1 walker
recognizes; an NM1 with a qualifier outside this set falls into the
Loop 2310x / 2420x line-provider verbatim bucket. Frozen for type
safety + IntelliSense - consumers should rarely need these (they're a
walker-internal vocabulary), but they're exported for tests + the
builder API.

#### Example

```ts
NM1_QUALIFIERS.BILLING_PROVIDER → "85".
```

***

### NON\_SPEC\_SEGMENT\_ID

> `const` **NON\_SPEC\_SEGMENT\_ID**: `"(non-spec)"` = `"(non-spec)"`

The value [X12Segment.id](#id-9) takes when the first element does not
match the X12 segment-id grammar. Not a valid segment id, so it can
never collide with a real one in a `seg.id === "NM1"` comparison.

#### Example

```ts
import { parseX12, NON_SPEC_SEGMENT_ID } from "@cosyte/x12";
const seg = parseX12(raw).groups[0]?.transactions[0]?.segments[1];
if (seg?.id === NON_SPEC_SEGMENT_ID) {
  // the sender's "segment" name is not a spec segment id; its bytes are on seg.raw
}
```

***

### PREMIUM\_820\_BUILD\_ERROR\_CODES

> `const` **PREMIUM\_820\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Premium820BuildError](#premium820builderror). Locked here so
consumers can narrow exhaustively on `err.code`; additions-only thereafter
(renaming any code is a breaking change).

- `X12_820_BUILD_INVALID_SPEC` - a structural precondition failed: no TRN
  trace, no remittance loop, a remittance with neither an `ENT` entity nor
  an `NM1` individual to open it, a remittance with no `RMR` open item, an
  open item with no identity (empty qualifier + reference id), or an
  over-long ISA-13 interchange control number. The message carries
  structural indices + counts only - never a member id / name (PHI
  discipline).

#### Type Declaration

##### X12\_820\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_820\_BUILD\_INVALID\_SPEC**: `"X12_820_BUILD_INVALID_SPEC"` = `"X12_820_BUILD_INVALID_SPEC"`

#### Example

```ts
import { PREMIUM_820_BUILD_ERROR_CODES, Premium820BuildError, build820 } from "@cosyte/x12";
try {
  build820(spec);
} catch (err) {
  if (
    err instanceof Premium820BuildError &&
    err.code === PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC
  ) {
    // the remittance structure is impossible - fix the spec, do not emit
  }
}
```

***

### PREMIUM\_820\_LOOP\_1000A

> `const` **PREMIUM\_820\_LOOP\_1000A**: [`LoopSpec`](#loopspec)

820 Loop 1000A - Premium Receiver's Name. Triggered by `N1` with
`N1-01 = "PE"`. The qualifier check happens in the walker;
`defineLoopSpec` keys off the segment id, not the element value.

#### Example

```ts
import { PREMIUM_820_LOOP_1000A } from "@cosyte/x12";
PREMIUM_820_LOOP_1000A.id; // "1000A"
```

***

### PREMIUM\_820\_LOOP\_1000B

> `const` **PREMIUM\_820\_LOOP\_1000B**: [`LoopSpec`](#loopspec)

820 Loop 1000B - Premium Payer's Name (remitter). Triggered by `N1` with
`N1-01 = "PR"` or `"RM"`. Same shape as Loop 1000A minus `RDM`.

#### Example

```ts
import { PREMIUM_820_LOOP_1000B } from "@cosyte/x12";
PREMIUM_820_LOOP_1000B.id; // "1000B"
```

***

### PREMIUM\_820\_LOOP\_2000A

> `const` **PREMIUM\_820\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

820 Loop 2000A - Organization Summary Remittance. Triggered by `ENT`.
Nests Loop 2100A (party name) and Loop 2300A (remittance detail).

Cited as Loop 2000A in TR3 X218.

#### Example

```ts
import { PREMIUM_820_LOOP_2000A } from "@cosyte/x12";
PREMIUM_820_LOOP_2000A.trigger;          // "ENT"
PREMIUM_820_LOOP_2000A.children.length;  // 2 (2100A, 2300A)
```

***

### PREMIUM\_820\_LOOP\_2100A

> `const` **PREMIUM\_820\_LOOP\_2100A**: [`LoopSpec`](#loopspec)

820 Loop 2100A - Party Name (member / entity inside an organization
summary). Triggered by `NM1`.

Cited as Loop 2100A in TR3 X218.

#### Example

```ts
import { PREMIUM_820_LOOP_2100A } from "@cosyte/x12";
PREMIUM_820_LOOP_2100A.trigger; // "NM1"
```

***

### PREMIUM\_820\_LOOP\_2300A

> `const` **PREMIUM\_820\_LOOP\_2300A**: [`LoopSpec`](#loopspec)

820 Loop 2300A - Organization Summary Remittance Detail. Triggered by
`RMR` (the premium-line open-item reference). Nests Loop 2310A.

Cited as Loop 2300A in TR3 X218.

#### Example

```ts
import { PREMIUM_820_LOOP_2300A } from "@cosyte/x12";
PREMIUM_820_LOOP_2300A.trigger;          // "RMR"
PREMIUM_820_LOOP_2300A.children[0]?.trigger; // "ADX"
```

***

### PREMIUM\_820\_LOOP\_2310A

> `const` **PREMIUM\_820\_LOOP\_2310A**: [`LoopSpec`](#loopspec)

820 Loop 2310A - Adjustment. Triggered by `ADX`. Innermost detail loop:
a signed monetary adjustment tied to the enclosing `RMR` open item.

Cited as Loop 2310A in TR3 X218.

#### Example

```ts
import { PREMIUM_820_LOOP_2310A } from "@cosyte/x12";
PREMIUM_820_LOOP_2310A.trigger; // "ADX"
```

***

### profiles

> `const` **profiles**: `object`

Namespace object exposing the shipped built-in profiles. Each is authored
via the public `defineProfile()` API and grounded in a real Tier-2 fixture.

#### Type Declaration

##### availity

> `readonly` **availity**: [`X12Profile`](#x12profile)

##### bcbsCommon

> `readonly` **bcbsCommon**: [`X12Profile`](#x12profile)

#### Example

```ts
import { parseX12, profiles } from "@cosyte/x12";
const ix = parseX12(raw, { profile: profiles.availity });
ix.profile?.name; // "availity"
```

***

### RARC

> `const` **RARC**: [`DatedCodeListSnapshot`](#datedcodelistsnapshot)

Bundled RARC snapshot. Companion to "./carc.js".CARC; same
freshness + safety posture, and the same separation between when the
descriptions were captured (`meta.snapshotDate`) and when the per-code
validity dates were (`meta.datesCapturedAt`). Use [lookupRarc](#lookuprarc) for the
ergonomic lookup.

**The redistribution answer differs from CARC's, and that is the point of
recording it per list.** This list is maintained by CMS rather than by X12
and needs no licence, so its descriptions are free to redistribute where
CARC's are not. The snapshot is still only the cited part of the published
list, which `meta.completeness` says.

#### Example

```ts
import { RARC } from "@cosyte/x12";
RARC.codes["N4"];                    // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
RARC.codes["MA01"];                  // (or undefined if outside this subset)
RARC.dates["N4"]?.start;             // "2000-01-01"
RARC.meta.maintainingOrganization;   // "CMS"
RARC.meta.redistribution?.status;    // "permitted"
```

***

### RELEASE\_CHAR

> `const` **RELEASE\_CHAR**: `"?"`

The release character is conventionally `?` per ASC X12; HIPAA 005010
does not transmit it as a fifth ISA delimiter. The library accepts `?` as
the universal release character - a non-`?` release sequence has never
been observed in real-world US healthcare X12 traffic. If a future
consumer needs a different release character, the constant is `as const`
so a parameterized variant can be added without breaking the public API.

#### Example

```ts
import { RELEASE_CHAR } from "@cosyte/x12";
// `?~` is an escaped segment terminator inside a value, not a real one:
"PER*IC*ACME?~BILLING".includes(RELEASE_CHAR); // true
```

***

### REMIT\_835\_BUILD\_ERROR\_CODES

> `const` **REMIT\_835\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [Remit835BuildError](#remit835builderror). Locked here so
consumers can narrow exhaustively on `err.code`; additions-only
thereafter (renaming any code is a breaking change).

- `X12_835_BUILD_BALANCE_MISMATCH` - a spec violated one of the three
  §1.10.2 balance invariants (service-line `SVC-02 == SVC-03 + Σ(line
  CAS)`, claim `CLP-03 == CLP-04 + Σ(claim+line CAS)`, or top-of-remit
  `BPR-02 == Σ(CLP-04) − Σ(PLB)`). The message names the invariant,
  the spec'd vs computed totals, and the delta - numeric values only,
  never PHI.
- `X12_835_BUILD_INVALID_SPEC` - a structural precondition failed (no
  trace supplied, a claim with no patient-control number, etc.).

#### Type Declaration

##### X12\_835\_BUILD\_BALANCE\_MISMATCH

> `readonly` **X12\_835\_BUILD\_BALANCE\_MISMATCH**: `"X12_835_BUILD_BALANCE_MISMATCH"` = `"X12_835_BUILD_BALANCE_MISMATCH"`

##### X12\_835\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_835\_BUILD\_INVALID\_SPEC**: `"X12_835_BUILD_INVALID_SPEC"` = `"X12_835_BUILD_INVALID_SPEC"`

#### Example

```ts
import { REMIT_835_BUILD_ERROR_CODES, Remit835BuildError, build835 } from "@cosyte/x12";
try {
  build835(spec);
} catch (err) {
  if (
    err instanceof Remit835BuildError &&
    err.code === REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH
  ) {
    // the remit does not balance - fix the amounts, do not emit
  }
}
```

***

### REMIT\_835\_LOOP\_1000A

> `const` **REMIT\_835\_LOOP\_1000A**: [`LoopSpec`](#loopspec)

835 Loop 1000A - Payer Identification. Triggered by `N1` with
`N1-01 = "PR"`. The trigger validation against the qualifier value
(PR vs PE) happens in the walker, not the loop spec - `defineLoopSpec`
keys off the segment id, not the element-level qualifier.

#### Example

```ts
import { REMIT_835_LOOP_1000A } from "@cosyte/x12";
REMIT_835_LOOP_1000A.id;      // "1000A"
REMIT_835_LOOP_1000A.trigger; // "N1"
```

***

### REMIT\_835\_LOOP\_1000B

> `const` **REMIT\_835\_LOOP\_1000B**: [`LoopSpec`](#loopspec)

835 Loop 1000B - Payee Identification. Triggered by `N1` with
`N1-01 = "PE"`. Shape is the same as Loop 1000A (plus optional `RDM`)
but the role is the payment recipient.

#### Example

```ts
import { REMIT_835_LOOP_1000B } from "@cosyte/x12";
REMIT_835_LOOP_1000B.id; // "1000B"
```

***

### REMIT\_835\_LOOP\_2000

> `const` **REMIT\_835\_LOOP\_2000**: [`LoopSpec`](#loopspec)

835 Loop 2000 - Header Number. Triggered by `LX`. Nests Loop 2100.

Cited as Loop 2000 in TR3 X221A1; situational because some payers
(notably Medicare FFS) omit the LX header entirely and ship CLP loops
directly under the transaction set header. The walker handles
both shapes - claims appear inside Loop 2000 if `LX` is present, at
top level otherwise.

#### Example

```ts
import { REMIT_835_LOOP_2000 } from "@cosyte/x12";
REMIT_835_LOOP_2000.trigger;          // "LX"
REMIT_835_LOOP_2000.children[0]?.trigger; // "CLP" (Loop 2100)
```

***

### REMIT\_835\_LOOP\_2100

> `const` **REMIT\_835\_LOOP\_2100**: [`LoopSpec`](#loopspec)

835 Loop 2100 - Claim Payment Information. Triggered by `CLP`. Nests
Loop 2110.

Cited as Loop 2100 in TR3 X221A1.

#### Example

```ts
import { REMIT_835_LOOP_2100 } from "@cosyte/x12";
REMIT_835_LOOP_2100.trigger;          // "CLP"
REMIT_835_LOOP_2100.children.length;  // 1 (Loop 2110)
```

***

### REMIT\_835\_LOOP\_2110

> `const` **REMIT\_835\_LOOP\_2110**: [`LoopSpec`](#loopspec)

835 Loop 2110 - Service Payment Information. Triggered by `SVC`.

Cited as Loop 2110 in TR3 X221A1.

#### Example

```ts
import { REMIT_835_LOOP_2110 } from "@cosyte/x12";
REMIT_835_LOOP_2110.id;       // "2110"
REMIT_835_LOOP_2110.trigger;  // "SVC"
```

***

### REQUIRED\_LOOPS

> `const` **REQUIRED\_LOOPS**: `object`

The TR3-required loops the parser reports as structurally absent. A
closed set owned by the loop specs under `src/transactions/`, so both the
loop id and its rationale are library constants rather than anything read
out of the document.

#### Type Declaration

##### BILLING\_PROVIDER\_2000A

> `readonly` **BILLING\_PROVIDER\_2000A**: `"2000A"` = `"2000A"`

Loop 2000A, Billing Provider HL.

##### INQUIRY\_ELIGIBILITY\_2110

> `readonly` **INQUIRY\_ELIGIBILITY\_2110**: `"270-2110"` = `"270-2110"`

270 Loop 2110, the eligibility or benefit inquiry (`EQ`) under a
subscriber or dependent level, as the warning's `position` names.

##### INQUIRY\_HIERARCHY\_2000A

> `readonly` **INQUIRY\_HIERARCHY\_2000A**: `"270-2000A"` = `"270-2000A"`

270 Loop 2000A, Information Source HL. Reported when a 270 transaction
set carries no hierarchical level segment at all, so there is no
inquiry hierarchy to build.

##### INQUIRY\_NAME\_2100

> `readonly` **INQUIRY\_NAME\_2100**: `"270-2100"` = `"270-2100"`

270 Loop 2100, the name loop of whichever hierarchical level the
warning's `position` names (2100A / 2100B / 2100C / 2100D). One
discriminant covers all four, because the position already says which
level is short of its NM1 and the library does not need a fifth string
to repeat it.

##### PAYER\_NAME\_2010BB

> `readonly` **PAYER\_NAME\_2010BB**: `"2010BB"` = `"2010BB"`

Loop 2010BB, Payer Name.

##### SUBSCRIBER\_2000B

> `readonly` **SUBSCRIBER\_2000B**: `"2000B"` = `"2000B"`

Loop 2000B, Subscriber HL.

##### SUBSCRIBER\_NAME\_2010BA

> `readonly` **SUBSCRIBER\_NAME\_2010BA**: `"2010BA"` = `"2010BA"`

Loop 2010BA, Subscriber Name.

#### Example

```ts
import { missingRequiredLoop, REQUIRED_LOOPS } from "@cosyte/x12";
const w = missingRequiredLoop({ segmentIndex: 12 }, REQUIRED_LOOPS.PAYER_NAME_2010BB);
```

***

### RFAI\_277\_BUILD\_ERROR\_CODES

> `const` **RFAI\_277\_BUILD\_ERROR\_CODES**: `object`

Stable codes for every [Rfai277BuildError](#rfai277builderror). Additions only.

- `X12_277_RFAI_BUILD_NO_LEVEL`: `levels` is empty.
- `X12_277_RFAI_BUILD_NO_REQUEST`: no level anywhere carries a request.
- `X12_277_RFAI_BUILD_NO_TRACE`: a request has no `trace`.
- `X12_277_RFAI_BUILD_STATUS_CODE_EMPTY`: an STC has no composite, or a
  composite whose C043-01 or C043-02 is empty.
- `X12_277_RFAI_BUILD_NO_SERVICE`: a service line has no `service`.
- `X12_277_RFAI_BUILD_INVALID_SPEC`: the spec is not shaped like one: a value
  that is not a string or not an `X12Decimal`, a list that is not an array,
  an unusable delimiter set, an empty or over-long control number, or more
  than three composites or four modifiers.

#### Type Declaration

##### X12\_277\_RFAI\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_277\_RFAI\_BUILD\_INVALID\_SPEC**: `"X12_277_RFAI_BUILD_INVALID_SPEC"` = `"X12_277_RFAI_BUILD_INVALID_SPEC"`

##### X12\_277\_RFAI\_BUILD\_NO\_LEVEL

> `readonly` **X12\_277\_RFAI\_BUILD\_NO\_LEVEL**: `"X12_277_RFAI_BUILD_NO_LEVEL"` = `"X12_277_RFAI_BUILD_NO_LEVEL"`

##### X12\_277\_RFAI\_BUILD\_NO\_REQUEST

> `readonly` **X12\_277\_RFAI\_BUILD\_NO\_REQUEST**: `"X12_277_RFAI_BUILD_NO_REQUEST"` = `"X12_277_RFAI_BUILD_NO_REQUEST"`

##### X12\_277\_RFAI\_BUILD\_NO\_SERVICE

> `readonly` **X12\_277\_RFAI\_BUILD\_NO\_SERVICE**: `"X12_277_RFAI_BUILD_NO_SERVICE"` = `"X12_277_RFAI_BUILD_NO_SERVICE"`

##### X12\_277\_RFAI\_BUILD\_NO\_TRACE

> `readonly` **X12\_277\_RFAI\_BUILD\_NO\_TRACE**: `"X12_277_RFAI_BUILD_NO_TRACE"` = `"X12_277_RFAI_BUILD_NO_TRACE"`

##### X12\_277\_RFAI\_BUILD\_STATUS\_CODE\_EMPTY

> `readonly` **X12\_277\_RFAI\_BUILD\_STATUS\_CODE\_EMPTY**: `"X12_277_RFAI_BUILD_STATUS_CODE_EMPTY"` = `"X12_277_RFAI_BUILD_STATUS_CODE_EMPTY"`

#### Example

```ts
import { RFAI_277_BUILD_ERROR_CODES, Rfai277BuildError } from "@cosyte/x12";
try {
  // build277RequestForAdditionalInformation(spec);
} catch (err) {
  if (err instanceof Rfai277BuildError && err.code === RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_TRACE) {
    // a claim-level request needs its TRN
  }
}
```

***

### RFAI\_277\_LOOP\_1000

> `const` **RFAI\_277\_LOOP\_1000**: [`LoopSpec`](#loopspec)

277 request for additional information, Loop 1000: a name in the heading.
Triggered by `NM1`. The reader does not type this loop; its segments stay
verbatim on the transaction set.

#### Example

```ts
import { RFAI_277_LOOP_1000 } from "@cosyte/x12";
RFAI_277_LOOP_1000.trigger; // "NM1"
```

***

### RFAI\_277\_LOOP\_2000

> `const` **RFAI\_277\_LOOP\_2000**: [`LoopSpec`](#loopspec)

277 request for additional information, Loop 2000: hierarchical level.
Triggered by `HL`; the level code is the sender's and is not checked here.

#### Example

```ts
import { RFAI_277_LOOP_2000 } from "@cosyte/x12";
RFAI_277_LOOP_2000.children.map((loop) => loop.id); // ["2100", "2200"]
```

***

### RFAI\_277\_LOOP\_2100

> `const` **RFAI\_277\_LOOP\_2100**: [`LoopSpec`](#loopspec)

277 request for additional information, Loop 2100: a name under a
hierarchical level. Triggered by `NM1`.

#### Example

```ts
import { RFAI_277_LOOP_2100 } from "@cosyte/x12";
RFAI_277_LOOP_2100.trigger; // "NM1"
```

***

### RFAI\_277\_LOOP\_2200

> `const` **RFAI\_277\_LOOP\_2200**: [`LoopSpec`](#loopspec)

277 request for additional information, Loop 2200: claim-level request.
Triggered by `TRN`, which the base standard makes mandatory in the loop.

#### Example

```ts
import { RFAI_277_LOOP_2200 } from "@cosyte/x12";
RFAI_277_LOOP_2200.trigger; // "TRN"
```

***

### RFAI\_277\_LOOP\_2220

> `const` **RFAI\_277\_LOOP\_2220**: [`LoopSpec`](#loopspec)

277 request for additional information, Loop 2220: service line. Triggered
by `SVC`.

#### Example

```ts
import { RFAI_277_LOOP_2220 } from "@cosyte/x12";
RFAI_277_LOOP_2220.trigger; // "SVC"
```

***

### SERVICE\_TYPE\_CODES

> `const` **SERVICE\_TYPE\_CODES**: [`CodeListSnapshot`](#codelistsnapshot)

Bundled Service Type Code (EB-03) snapshot. Used by the 271 helper to
surface a human-readable description alongside each verbatim service
type code under an eligibility/benefit statement.

#### Example

```ts
import { SERVICE_TYPE_CODES } from "@cosyte/x12";
SERVICE_TYPE_CODES.codes["30"]; // "Health Benefit Plan Coverage"
SERVICE_TYPE_CODES.codes["88"]; // "Pharmacy"
SERVICE_TYPE_CODES.meta.redistribution?.status; // "licence-required"
```

***

### STATUS\_276\_LOOP\_2000A

> `const` **STATUS\_276\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

276 Loop 2000A - Information Source HL (the payer being asked). Triggered by
`HL` (`HL-03 = "20"`); the level-code check happens in the walker.

#### Example

```ts
import { STATUS_276_LOOP_2000A } from "@cosyte/x12";
STATUS_276_LOOP_2000A.trigger; // "HL"
```

***

### STATUS\_276\_LOOP\_2000B

> `const` **STATUS\_276\_LOOP\_2000B**: [`LoopSpec`](#loopspec)

276 Loop 2000B - Information Receiver HL. Triggered by `HL`
(`HL-03 = "21"`).

#### Example

```ts
import { STATUS_276_LOOP_2000B } from "@cosyte/x12";
STATUS_276_LOOP_2000B.id; // "2000B"
```

***

### STATUS\_276\_LOOP\_2000C

> `const` **STATUS\_276\_LOOP\_2000C**: [`LoopSpec`](#loopspec)

276 Loop 2000C - Service Provider HL, the provider whose claim is being
asked about. Triggered by `HL` (`HL-03 = "19"`).

#### Example

```ts
import { STATUS_276_LOOP_2000C } from "@cosyte/x12";
STATUS_276_LOOP_2000C.id; // "2000C"
```

***

### STATUS\_276\_LOOP\_2000D

> `const` **STATUS\_276\_LOOP\_2000D**: [`LoopSpec`](#loopspec)

276 Loop 2000D - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`). Carries
the subscriber name loop, its demographics, and the claims asked about under
it via [STATUS\_276\_LOOP\_2200](#status_276_loop_2200).

#### Example

```ts
import { STATUS_276_LOOP_2000D } from "@cosyte/x12";
STATUS_276_LOOP_2000D.children[0]?.id; // "2200"
```

***

### STATUS\_276\_LOOP\_2000E

> `const` **STATUS\_276\_LOOP\_2000E**: [`LoopSpec`](#loopspec)

276 Loop 2000E - Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
the dependent's OWN name loop, demographics and claims; nothing it carries is
merged onto the subscriber it hangs under.

#### Example

```ts
import { STATUS_276_LOOP_2000E } from "@cosyte/x12";
STATUS_276_LOOP_2000E.id; // "2000E"
```

***

### STATUS\_276\_LOOP\_2200

> `const` **STATUS\_276\_LOOP\_2200**: [`LoopSpec`](#loopspec)

276 Loop 2200 - Claim Submitter Trace Number, the loop that carries ONE
claim the submitter is asking about. Triggered by `TRN`, whose TRN-02 is the
value the answering 277 echoes back. Nests [STATUS\_276\_LOOP\_2210](#status_276_loop_2210).

#### Example

```ts
import { STATUS_276_LOOP_2200 } from "@cosyte/x12";
STATUS_276_LOOP_2200.children[0]?.trigger; // "SVC"
```

***

### STATUS\_276\_LOOP\_2210

> `const` **STATUS\_276\_LOOP\_2210**: [`LoopSpec`](#loopspec)

276 Loop 2210 - Service Line Information. Triggered by `SVC`. Reused under
both the subscriber (2210D) and dependent (2210E) claim loops.

#### Example

```ts
import { STATUS_276_LOOP_2210 } from "@cosyte/x12";
STATUS_276_LOOP_2210.trigger; // "SVC"
```

***

### STATUS\_277\_LOOP\_2000A

> `const` **STATUS\_277\_LOOP\_2000A**: [`LoopSpec`](#loopspec)

277 Loop 2000A - Information Source HL (payer). Triggered by `HL`
(`HL-03 = "20"`); the level-code check happens in the walker.

#### Example

```ts
import { STATUS_277_LOOP_2000A } from "@cosyte/x12";
STATUS_277_LOOP_2000A.trigger; // "HL"
```

***

### STATUS\_277\_LOOP\_2000B

> `const` **STATUS\_277\_LOOP\_2000B**: [`LoopSpec`](#loopspec)

277 Loop 2000B - Information Receiver HL. Triggered by `HL`
(`HL-03 = "21"`).

#### Example

```ts
import { STATUS_277_LOOP_2000B } from "@cosyte/x12";
STATUS_277_LOOP_2000B.id; // "2000B"
```

***

### STATUS\_277\_LOOP\_2000C

> `const` **STATUS\_277\_LOOP\_2000C**: [`LoopSpec`](#loopspec)

277 Loop 2000C - Service Provider HL. Triggered by `HL` (`HL-03 = "19"`).
In a 277CA this level can also carry a Loop 2200 batch acknowledgment
(provider-level STC) - nested here as [STATUS\_277\_LOOP\_2200](#status_277_loop_2200).

#### Example

```ts
import { STATUS_277_LOOP_2000C } from "@cosyte/x12";
STATUS_277_LOOP_2000C.children[0]?.id; // "2200"
```

***

### STATUS\_277\_LOOP\_2000D

> `const` **STATUS\_277\_LOOP\_2000D**: [`LoopSpec`](#loopspec)

277 Loop 2000D - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
Carries the subscriber name (2100D) and its claim status tracking
(Loop 2200).

#### Example

```ts
import { STATUS_277_LOOP_2000D } from "@cosyte/x12";
STATUS_277_LOOP_2000D.children[0]?.id; // "2200"
```

***

### STATUS\_277\_LOOP\_2000E

> `const` **STATUS\_277\_LOOP\_2000E**: [`LoopSpec`](#loopspec)

277 Loop 2000E - Dependent HL. Triggered by `HL` (`HL-03 = "23"`).
Carries the dependent name (2100E) and its claim status tracking
(Loop 2200).

#### Example

```ts
import { STATUS_277_LOOP_2000E } from "@cosyte/x12";
STATUS_277_LOOP_2000E.id; // "2000E"
```

***

### STATUS\_277\_LOOP\_2200

> `const` **STATUS\_277\_LOOP\_2200**: [`LoopSpec`](#loopspec)

277 Loop 2200 - Claim Status Tracking. Triggered by `TRN` (a 277 claim
status) - in a 277CA provider-level batch acknowledgment the same loop
may open on a standalone `STC`; the walker handles both. Nests
[STATUS\_277\_LOOP\_2220](#status_277_loop_2220).

#### Example

```ts
import { STATUS_277_LOOP_2200 } from "@cosyte/x12";
STATUS_277_LOOP_2200.children[0]?.trigger; // "SVC"
```

***

### STATUS\_277\_LOOP\_2220

> `const` **STATUS\_277\_LOOP\_2220**: [`LoopSpec`](#loopspec)

277 Loop 2220 - Service Line Status Information. Triggered by `SVC`.
Reused under both the subscriber (2220D) and dependent (2220E) claim
status loops.

#### Example

```ts
import { STATUS_277_LOOP_2220 } from "@cosyte/x12";
STATUS_277_LOOP_2220.trigger; // "SVC"
```

***

### TA1\_ACK\_CODES

> `const` **TA1\_ACK\_CODES**: `object`

TA1-04 interchange acknowledgment code (ASC X12 code list I13). Three
values: `A` accepted, `E` accepted with errors, `R` rejected. Distinct
from the 999 disposition (no `M`/`W`/`X` here - TA1 covers only the
interchange envelope, not crypto failures of contained groups).

#### Type Declaration

##### A

> `readonly` **A**: `"A"` = `"A"`

##### E

> `readonly` **E**: `"E"` = `"E"`

##### R

> `readonly` **R**: `"R"` = `"R"`

#### Example

```ts
import type { Ta1AckCode } from "@cosyte/x12";
const accept: Ta1AckCode = "A";
```

***

### TA1\_NOTE\_CODES

> `const` **TA1\_NOTE\_CODES**: `object`

TA1-05 interchange note code (ASC X12 code list I18). Codes `000` to `028`
are defined by the standard; values past `028` exist in some standard
revisions and are accepted on parse (Postel's Law) but not enumerated
here - the parsed model carries the un-narrowed string on `noteCodeRaw`,
post-`?`-unescape as of a later release. **A clause here said "verbatim"
and is deleted rather than reworded**; `raw.elements[5]` is the byte surface.

`000` is the canonical "no error" note paired with a `TA1-04 == 'A'`
acceptance. The build-time safety guard refuses a fabricated `A` paired
with any non-`000` note (see "./errors.js".AckBuildError).

Standard-issued values:
- `000` - No error.
- `001` - Interchange Control Number in the Header and Trailer do not match.
- `002` - Standard as noted in the Control Standards Identifier is not supported.
- `003` - Version of the controls is not supported.
- `004` - Segment Terminator is invalid.
- `005` - Invalid Interchange ID Qualifier for Sender.
- `006` - Invalid Interchange Sender ID.
- `007` - Invalid Interchange ID Qualifier for Receiver.
- `008` - Invalid Interchange Receiver ID.
- `009` - Unknown Interchange Receiver ID.
- `010` - Invalid Authorization Information Qualifier value.
- `011` - Invalid Authorization Information value.
- `012` - Invalid Security Information Qualifier value.
- `013` - Invalid Security Information value.
- `014` - Invalid Interchange Date value.
- `015` - Invalid Interchange Time value.
- `016` - Invalid Interchange Standards Identifier value.
- `017` - Invalid Interchange Version ID value.
- `018` - Invalid Interchange Control Number value.
- `019` - Invalid Acknowledgment Requested value.
- `020` - Invalid Test Indicator value.
- `021` - Invalid Number of Included Groups value.
- `022` - Invalid Control Structure.
- `023` - Improper (premature) end-of-file (transmission).
- `024` - Invalid Interchange Content (e.g., invalid GS segment).
- `025` - Duplicate Interchange Control Number.
- `026` - Invalid Data Element Separator.
- `027` - Invalid Component Element Separator.
- `028` - Invalid Delivery Date in Deferred Delivery Request.

#### Type Declaration

##### 000

> `readonly` **000**: `"000"` = `"000"`

##### 001

> `readonly` **001**: `"001"` = `"001"`

##### 002

> `readonly` **002**: `"002"` = `"002"`

##### 003

> `readonly` **003**: `"003"` = `"003"`

##### 004

> `readonly` **004**: `"004"` = `"004"`

##### 005

> `readonly` **005**: `"005"` = `"005"`

##### 006

> `readonly` **006**: `"006"` = `"006"`

##### 007

> `readonly` **007**: `"007"` = `"007"`

##### 008

> `readonly` **008**: `"008"` = `"008"`

##### 009

> `readonly` **009**: `"009"` = `"009"`

##### 010

> `readonly` **010**: `"010"` = `"010"`

##### 011

> `readonly` **011**: `"011"` = `"011"`

##### 012

> `readonly` **012**: `"012"` = `"012"`

##### 013

> `readonly` **013**: `"013"` = `"013"`

##### 014

> `readonly` **014**: `"014"` = `"014"`

##### 015

> `readonly` **015**: `"015"` = `"015"`

##### 016

> `readonly` **016**: `"016"` = `"016"`

##### 017

> `readonly` **017**: `"017"` = `"017"`

##### 018

> `readonly` **018**: `"018"` = `"018"`

##### 019

> `readonly` **019**: `"019"` = `"019"`

##### 020

> `readonly` **020**: `"020"` = `"020"`

##### 021

> `readonly` **021**: `"021"` = `"021"`

##### 022

> `readonly` **022**: `"022"` = `"022"`

##### 023

> `readonly` **023**: `"023"` = `"023"`

##### 024

> `readonly` **024**: `"024"` = `"024"`

##### 025

> `readonly` **025**: `"025"` = `"025"`

##### 026

> `readonly` **026**: `"026"` = `"026"`

##### 027

> `readonly` **027**: `"027"` = `"027"`

##### 028

> `readonly` **028**: `"028"` = `"028"`

#### Example

```ts
import { TA1_NOTE_CODES, type Ta1NoteCode } from "@cosyte/x12";
const noError: Ta1NoteCode = TA1_NOTE_CODES["000"];
```

***

### UNEXPECTED\_SEGMENT\_CONTEXTS

> `const` **UNEXPECTED\_SEGMENT\_CONTEXTS**: `object`

Which structural rule an out-of-place segment broke. A closed,
library-owned set. The segment's own id is deliberately NOT part of it:
a segment that is not where it belongs is exactly the case where its
first element is arbitrary sender bytes rather than a spec name.

#### Type Declaration

##### BODY\_OUTSIDE\_TRANSACTION

> `readonly` **BODY\_OUTSIDE\_TRANSACTION**: `"body-outside-transaction"` = `"body-outside-transaction"`

A body segment appeared outside any open transaction set.

##### GE\_WITHOUT\_GS

> `readonly` **GE\_WITHOUT\_GS**: `"ge-without-gs"` = `"ge-without-gs"`

A `GE` appeared with no open `GS`.

##### SE\_WITHOUT\_ST

> `readonly` **SE\_WITHOUT\_ST**: `"se-without-st"` = `"se-without-st"`

An `SE` appeared with no open transaction set.

##### ST\_WITHOUT\_GS

> `readonly` **ST\_WITHOUT\_GS**: `"st-without-gs"` = `"st-without-gs"`

An `ST` appeared with no open functional group.

##### TA1\_INSIDE\_GROUP

> `readonly` **TA1\_INSIDE\_GROUP**: `"ta1-inside-group"` = `"ta1-inside-group"`

A `TA1` (envelope-level by spec) appeared inside an open functional group.

#### Example

```ts
import { unexpectedSegment, UNEXPECTED_SEGMENT_CONTEXTS } from "@cosyte/x12";
const w = unexpectedSegment({ segmentIndex: 12 }, UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS);
```

***

### VERSION

> `const` **VERSION**: `string` = `"0.1.13"`

Library version string, synced with `package.json#version` by the
release's version step. Exported now so consumers (and the
type-check pipeline) have at least one symbol to resolve through the
`exports` map.

#### Example

```ts
import { VERSION } from "@cosyte/x12";
console.log(VERSION);
```

***

### WARNING\_CODES

> `const` **WARNING\_CODES**: `object`

Stable string codes for every Tier-2 warning the parser may emit. The
registry is frozen via `as const` so TypeScript infers the exact string
literal union for [X12WarningCode](#x12warningcode) - zero runtime cost, no magic-
string comparisons for consumers.

#### Type Declaration

##### X12\_270\_DATE\_ROW\_DROPPED

> `readonly` **X12\_270\_DATE\_ROW\_DROPPED**: `"X12_270_DATE_ROW_DROPPED"` = `"X12_270_DATE_ROW_DROPPED"`

##### X12\_270\_DUPLICATE\_HIERARCHY\_ID

> `readonly` **X12\_270\_DUPLICATE\_HIERARCHY\_ID**: `"X12_270_DUPLICATE_HIERARCHY_ID"` = `"X12_270_DUPLICATE_HIERARCHY_ID"`

##### X12\_270\_HIERARCHY\_CYCLE

> `readonly` **X12\_270\_HIERARCHY\_CYCLE**: `"X12_270_HIERARCHY_CYCLE"` = `"X12_270_HIERARCHY_CYCLE"`

##### X12\_270\_INTER\_SEGMENT\_LINE\_BREAK

> `readonly` **X12\_270\_INTER\_SEGMENT\_LINE\_BREAK**: `"X12_270_INTER_SEGMENT_LINE_BREAK"` = `"X12_270_INTER_SEGMENT_LINE_BREAK"`

##### X12\_270\_LEVEL\_DETACHED

> `readonly` **X12\_270\_LEVEL\_DETACHED**: `"X12_270_LEVEL_DETACHED"` = `"X12_270_LEVEL_DETACHED"`

##### X12\_270\_NON\_CONVENTIONAL\_DELIMITER

> `readonly` **X12\_270\_NON\_CONVENTIONAL\_DELIMITER**: `"X12_270_NON_CONVENTIONAL_DELIMITER"` = `"X12_270_NON_CONVENTIONAL_DELIMITER"`

##### X12\_271\_AAA\_LOOP\_UNIDENTIFIED

> `readonly` **X12\_271\_AAA\_LOOP\_UNIDENTIFIED**: `"X12_271_AAA_LOOP_UNIDENTIFIED"` = `"X12_271_AAA_LOOP_UNIDENTIFIED"`

##### X12\_271\_AAA\_REJECT\_REASON\_ABSENT

> `readonly` **X12\_271\_AAA\_REJECT\_REASON\_ABSENT**: `"X12_271_AAA_REJECT_REASON_ABSENT"` = `"X12_271_AAA_REJECT_REASON_ABSENT"`

##### X12\_271\_AAA\_SEGMENT\_MALFORMED

> `readonly` **X12\_271\_AAA\_SEGMENT\_MALFORMED**: `"X12_271_AAA_SEGMENT_MALFORMED"` = `"X12_271_AAA_SEGMENT_MALFORMED"`

##### X12\_271\_AAA\_UNKNOWN\_CODE

> `readonly` **X12\_271\_AAA\_UNKNOWN\_CODE**: `"X12_271_AAA_UNKNOWN_CODE"` = `"X12_271_AAA_UNKNOWN_CODE"`

##### X12\_271\_HEADER\_ABSENT

> `readonly` **X12\_271\_HEADER\_ABSENT**: `"X12_271_HEADER_ABSENT"` = `"X12_271_HEADER_ABSENT"`

##### X12\_275\_ATTACHMENT\_ABSENT

> `readonly` **X12\_275\_ATTACHMENT\_ABSENT**: `"X12_275_ATTACHMENT_ABSENT"` = `"X12_275_ATTACHMENT_ABSENT"`

##### X12\_276\_DATE\_ROW\_DROPPED

> `readonly` **X12\_276\_DATE\_ROW\_DROPPED**: `"X12_276_DATE_ROW_DROPPED"` = `"X12_276_DATE_ROW_DROPPED"`

##### X12\_276\_DUPLICATE\_HIERARCHY\_ID

> `readonly` **X12\_276\_DUPLICATE\_HIERARCHY\_ID**: `"X12_276_DUPLICATE_HIERARCHY_ID"` = `"X12_276_DUPLICATE_HIERARCHY_ID"`

##### X12\_276\_HIERARCHY\_CYCLE

> `readonly` **X12\_276\_HIERARCHY\_CYCLE**: `"X12_276_HIERARCHY_CYCLE"` = `"X12_276_HIERARCHY_CYCLE"`

##### X12\_276\_LEVEL\_DETACHED

> `readonly` **X12\_276\_LEVEL\_DETACHED**: `"X12_276_LEVEL_DETACHED"` = `"X12_276_LEVEL_DETACHED"`

##### X12\_276\_REFERENCE\_ROW\_DROPPED

> `readonly` **X12\_276\_REFERENCE\_ROW\_DROPPED**: `"X12_276_REFERENCE_ROW_DROPPED"` = `"X12_276_REFERENCE_ROW_DROPPED"`

##### X12\_277\_RFAI\_HEADER\_ABSENT

> `readonly` **X12\_277\_RFAI\_HEADER\_ABSENT**: `"X12_277_RFAI_HEADER_ABSENT"` = `"X12_277_RFAI_HEADER_ABSENT"`

##### X12\_277\_RFAI\_LEVEL\_ABSENT

> `readonly` **X12\_277\_RFAI\_LEVEL\_ABSENT**: `"X12_277_RFAI_LEVEL_ABSENT"` = `"X12_277_RFAI_LEVEL_ABSENT"`

##### X12\_277\_RFAI\_REQUEST\_ABSENT

> `readonly` **X12\_277\_RFAI\_REQUEST\_ABSENT**: `"X12_277_RFAI_REQUEST_ABSENT"` = `"X12_277_RFAI_REQUEST_ABSENT"`

##### X12\_834\_UNKNOWN\_MAINTENANCE\_TYPE

> `readonly` **X12\_834\_UNKNOWN\_MAINTENANCE\_TYPE**: `"X12_834_UNKNOWN_MAINTENANCE_TYPE"` = `"X12_834_UNKNOWN_MAINTENANCE_TYPE"`

##### X12\_835\_BALANCE\_NOT\_EVALUABLE

> `readonly` **X12\_835\_BALANCE\_NOT\_EVALUABLE**: `"X12_835_BALANCE_NOT_EVALUABLE"` = `"X12_835_BALANCE_NOT_EVALUABLE"`

##### X12\_835\_REMIT\_BALANCE\_MISMATCH

> `readonly` **X12\_835\_REMIT\_BALANCE\_MISMATCH**: `"X12_835_REMIT_BALANCE_MISMATCH"` = `"X12_835_REMIT_BALANCE_MISMATCH"`

##### X12\_837\_AMBIGUOUS\_VARIANT

> `readonly` **X12\_837\_AMBIGUOUS\_VARIANT**: `"X12_837_AMBIGUOUS_VARIANT"` = `"X12_837_AMBIGUOUS_VARIANT"`

##### X12\_837\_ENTITY\_SEGMENT\_DISCARDED\_AFTER\_LX

> `readonly` **X12\_837\_ENTITY\_SEGMENT\_DISCARDED\_AFTER\_LX**: `"X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX"` = `"X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX"`

##### X12\_837\_PAY\_TO\_ADDRESS\_REPEATED

> `readonly` **X12\_837\_PAY\_TO\_ADDRESS\_REPEATED**: `"X12_837_PAY_TO_ADDRESS_REPEATED"` = `"X12_837_PAY_TO_ADDRESS_REPEATED"`

##### X12\_837\_SERVICE\_LINE\_DROPPED

> `readonly` **X12\_837\_SERVICE\_LINE\_DROPPED**: `"X12_837_SERVICE_LINE_DROPPED"` = `"X12_837_SERVICE_LINE_DROPPED"`

##### X12\_837\_SERVICE\_LINE\_NOT\_DECODED

> `readonly` **X12\_837\_SERVICE\_LINE\_NOT\_DECODED**: `"X12_837_SERVICE_LINE_NOT_DECODED"` = `"X12_837_SERVICE_LINE_NOT_DECODED"`

##### X12\_837\_SERVICE\_SEGMENT\_REPEATED

> `readonly` **X12\_837\_SERVICE\_SEGMENT\_REPEATED**: `"X12_837_SERVICE_SEGMENT_REPEATED"` = `"X12_837_SERVICE_SEGMENT_REPEATED"`

##### X12\_837\_SERVICE\_SEGMENT\_WITHOUT\_LX

> `readonly` **X12\_837\_SERVICE\_SEGMENT\_WITHOUT\_LX**: `"X12_837_SERVICE_SEGMENT_WITHOUT_LX"` = `"X12_837_SERVICE_SEGMENT_WITHOUT_LX"`

##### X12\_837\_UNKNOWN\_VARIANT

> `readonly` **X12\_837\_UNKNOWN\_VARIANT**: `"X12_837_UNKNOWN_VARIANT"` = `"X12_837_UNKNOWN_VARIANT"`

##### X12\_997\_AK1\_ABSENT

> `readonly` **X12\_997\_AK1\_ABSENT**: `"X12_997_AK1_ABSENT"` = `"X12_997_AK1_ABSENT"`

##### X12\_997\_AK5\_ABSENT

> `readonly` **X12\_997\_AK5\_ABSENT**: `"X12_997_AK5_ABSENT"` = `"X12_997_AK5_ABSENT"`

##### X12\_997\_AK5\_DISPOSITION\_UNKNOWN

> `readonly` **X12\_997\_AK5\_DISPOSITION\_UNKNOWN**: `"X12_997_AK5_DISPOSITION_UNKNOWN"` = `"X12_997_AK5_DISPOSITION_UNKNOWN"`

##### X12\_997\_AK9\_ABSENT

> `readonly` **X12\_997\_AK9\_ABSENT**: `"X12_997_AK9_ABSENT"` = `"X12_997_AK9_ABSENT"`

##### X12\_997\_AK9\_DISPOSITION\_UNKNOWN

> `readonly` **X12\_997\_AK9\_DISPOSITION\_UNKNOWN**: `"X12_997_AK9_DISPOSITION_UNKNOWN"` = `"X12_997_AK9_DISPOSITION_UNKNOWN"`

##### X12\_997\_SEGMENT\_NOT\_DEFINED

> `readonly` **X12\_997\_SEGMENT\_NOT\_DEFINED**: `"X12_997_SEGMENT_NOT_DEFINED"` = `"X12_997_SEGMENT_NOT_DEFINED"`

##### X12\_997\_SEGMENT\_OUT\_OF\_PLACE

> `readonly` **X12\_997\_SEGMENT\_OUT\_OF\_PLACE**: `"X12_997_SEGMENT_OUT_OF_PLACE"` = `"X12_997_SEGMENT_OUT_OF_PLACE"`

##### X12\_999\_AK1\_ABSENT

> `readonly` **X12\_999\_AK1\_ABSENT**: `"X12_999_AK1_ABSENT"` = `"X12_999_AK1_ABSENT"`

##### X12\_999\_AK9\_ABSENT

> `readonly` **X12\_999\_AK9\_ABSENT**: `"X12_999_AK9_ABSENT"` = `"X12_999_AK9_ABSENT"`

##### X12\_999\_AK9\_DISPOSITION\_UNKNOWN

> `readonly` **X12\_999\_AK9\_DISPOSITION\_UNKNOWN**: `"X12_999_AK9_DISPOSITION_UNKNOWN"` = `"X12_999_AK9_DISPOSITION_UNKNOWN"`

##### X12\_999\_IK5\_ABSENT

> `readonly` **X12\_999\_IK5\_ABSENT**: `"X12_999_IK5_ABSENT"` = `"X12_999_IK5_ABSENT"`

##### X12\_999\_IK5\_DISPOSITION\_UNKNOWN

> `readonly` **X12\_999\_IK5\_DISPOSITION\_UNKNOWN**: `"X12_999_IK5_DISPOSITION_UNKNOWN"` = `"X12_999_IK5_DISPOSITION_UNKNOWN"`

##### X12\_AMOUNT\_ROW\_DROPPED

> `readonly` **X12\_AMOUNT\_ROW\_DROPPED**: `"X12_AMOUNT_ROW_DROPPED"` = `"X12_AMOUNT_ROW_DROPPED"`

##### X12\_BINARY\_DATA\_TRUNCATED

> `readonly` **X12\_BINARY\_DATA\_TRUNCATED**: `"X12_BINARY_DATA_TRUNCATED"` = `"X12_BINARY_DATA_TRUNCATED"`

##### X12\_BINARY\_LENGTH\_INVALID

> `readonly` **X12\_BINARY\_LENGTH\_INVALID**: `"X12_BINARY_LENGTH_INVALID"` = `"X12_BINARY_LENGTH_INVALID"`

##### X12\_BINARY\_LENGTH\_MISMATCH

> `readonly` **X12\_BINARY\_LENGTH\_MISMATCH**: `"X12_BINARY_LENGTH_MISMATCH"` = `"X12_BINARY_LENGTH_MISMATCH"`

##### X12\_BINARY\_LENGTH\_UNVERIFIABLE

> `readonly` **X12\_BINARY\_LENGTH\_UNVERIFIABLE**: `"X12_BINARY_LENGTH_UNVERIFIABLE"` = `"X12_BINARY_LENGTH_UNVERIFIABLE"`

##### X12\_CONTROL\_NUMBER\_MISMATCH

> `readonly` **X12\_CONTROL\_NUMBER\_MISMATCH**: `"X12_CONTROL_NUMBER_MISMATCH"` = `"X12_CONTROL_NUMBER_MISMATCH"`

##### X12\_DANGLING\_RELEASE\_CHAR

> `readonly` **X12\_DANGLING\_RELEASE\_CHAR**: `"X12_DANGLING_RELEASE_CHAR"` = `"X12_DANGLING_RELEASE_CHAR"`

##### X12\_GROUP\_COUNT\_MISMATCH

> `readonly` **X12\_GROUP\_COUNT\_MISMATCH**: `"X12_GROUP_COUNT_MISMATCH"` = `"X12_GROUP_COUNT_MISMATCH"`

##### X12\_GUIDE\_NOT\_DECLARED

> `readonly` **X12\_GUIDE\_NOT\_DECLARED**: `"X12_GUIDE_NOT_DECLARED"` = `"X12_GUIDE_NOT_DECLARED"`

##### X12\_GUIDE\_NOT\_IMPLEMENTED

> `readonly` **X12\_GUIDE\_NOT\_IMPLEMENTED**: `"X12_GUIDE_NOT_IMPLEMENTED"` = `"X12_GUIDE_NOT_IMPLEMENTED"`

##### X12\_HL\_PARENT\_LEVEL\_INVALID

> `readonly` **X12\_HL\_PARENT\_LEVEL\_INVALID**: `"X12_HL_PARENT_LEVEL_INVALID"` = `"X12_HL_PARENT_LEVEL_INVALID"`

##### X12\_HL\_PARENT\_MISMATCH

> `readonly` **X12\_HL\_PARENT\_MISMATCH**: `"X12_HL_PARENT_MISMATCH"` = `"X12_HL_PARENT_MISMATCH"`

##### X12\_ISA\_EXTRA\_ELEMENT\_SEPARATOR

> `readonly` **X12\_ISA\_EXTRA\_ELEMENT\_SEPARATOR**: `"X12_ISA_EXTRA_ELEMENT_SEPARATOR"` = `"X12_ISA_EXTRA_ELEMENT_SEPARATOR"`

##### X12\_MISSING\_GE

> `readonly` **X12\_MISSING\_GE**: `"X12_MISSING_GE"` = `"X12_MISSING_GE"`

##### X12\_MISSING\_IEA

> `readonly` **X12\_MISSING\_IEA**: `"X12_MISSING_IEA"` = `"X12_MISSING_IEA"`

##### X12\_MISSING\_REQUIRED\_LOOP

> `readonly` **X12\_MISSING\_REQUIRED\_LOOP**: `"X12_MISSING_REQUIRED_LOOP"` = `"X12_MISSING_REQUIRED_LOOP"`

##### X12\_MISSING\_SE

> `readonly` **X12\_MISSING\_SE**: `"X12_MISSING_SE"` = `"X12_MISSING_SE"`

##### X12\_PRE\_005010

> `readonly` **X12\_PRE\_005010**: `"X12_PRE_005010"` = `"X12_PRE_005010"`

##### X12\_SEGMENT\_COUNT\_MISMATCH

> `readonly` **X12\_SEGMENT\_COUNT\_MISMATCH**: `"X12_SEGMENT_COUNT_MISMATCH"` = `"X12_SEGMENT_COUNT_MISMATCH"`

##### X12\_STATED\_AMOUNT\_DISCARDED

> `readonly` **X12\_STATED\_AMOUNT\_DISCARDED**: `"X12_STATED_AMOUNT_DISCARDED"` = `"X12_STATED_AMOUNT_DISCARDED"`

##### X12\_TRAILING\_GARBAGE

> `readonly` **X12\_TRAILING\_GARBAGE**: `"X12_TRAILING_GARBAGE"` = `"X12_TRAILING_GARBAGE"`

##### X12\_TRANSACTION\_COUNT\_MISMATCH

> `readonly` **X12\_TRANSACTION\_COUNT\_MISMATCH**: `"X12_TRANSACTION_COUNT_MISMATCH"` = `"X12_TRANSACTION_COUNT_MISMATCH"`

##### X12\_UNEXPECTED\_SEGMENT

> `readonly` **X12\_UNEXPECTED\_SEGMENT**: `"X12_UNEXPECTED_SEGMENT"` = `"X12_UNEXPECTED_SEGMENT"`

##### X12\_UNKNOWN\_CARC

> `readonly` **X12\_UNKNOWN\_CARC**: `"X12_UNKNOWN_CARC"` = `"X12_UNKNOWN_CARC"`

##### X12\_UNKNOWN\_CLAIM\_STATUS

> `readonly` **X12\_UNKNOWN\_CLAIM\_STATUS**: `"X12_UNKNOWN_CLAIM_STATUS"` = `"X12_UNKNOWN_CLAIM_STATUS"`

##### X12\_UNKNOWN\_CLAIM\_STATUS\_CATEGORY

> `readonly` **X12\_UNKNOWN\_CLAIM\_STATUS\_CATEGORY**: `"X12_UNKNOWN_CLAIM_STATUS_CATEGORY"` = `"X12_UNKNOWN_CLAIM_STATUS_CATEGORY"`

##### X12\_UNKNOWN\_HI\_QUALIFIER

> `readonly` **X12\_UNKNOWN\_HI\_QUALIFIER**: `"X12_UNKNOWN_HI_QUALIFIER"` = `"X12_UNKNOWN_HI_QUALIFIER"`

##### X12\_UNKNOWN\_RARC

> `readonly` **X12\_UNKNOWN\_RARC**: `"X12_UNKNOWN_RARC"` = `"X12_UNKNOWN_RARC"`

##### X12\_UNPARSEABLE\_DECIMAL

> `readonly` **X12\_UNPARSEABLE\_DECIMAL**: `"X12_UNPARSEABLE_DECIMAL"` = `"X12_UNPARSEABLE_DECIMAL"`

#### Example

```ts
import { parseX12, WARNING_CODES } from "@cosyte/x12";
const ix = parseX12(raw);
if (ix.warnings.some((w) => w.code === WARNING_CODES.X12_PRE_005010)) {
  // sender is on a pre-005010 version family
}
```

***

### X12\_997\_SET\_DISPOSITION\_CODES

> `const` **X12\_997\_SET\_DISPOSITION\_CODES**: `object`

AK5-01 transaction set disposition codes of the 997 Functional
Acknowledgment, ASC X12 code list 717. The six codes code list 715 shares
with it, without `P`: partial acceptance is a functional group outcome, so
a 997 states it at AK9-01 and never for one transaction set. AK9-01 of a
997 takes the seven codes of [X12\_ACK\_DISPOSITION\_CODES](#x12_ack_disposition_codes).

Code values only, carried as the base standard spells them; no guide
table is bundled.

#### Type Declaration

##### A

> `readonly` **A**: `"A"` = `"A"`

##### E

> `readonly` **E**: `"E"` = `"E"`

##### M

> `readonly` **M**: `"M"` = `"M"`

##### R

> `readonly` **R**: `"R"` = `"R"`

##### W

> `readonly` **W**: `"W"` = `"W"`

##### X

> `readonly` **X**: `"X"` = `"X"`

#### Example

```ts
import { X12_997_SET_DISPOSITION_CODES, type X12Ack997SetDispositionCode } from "@cosyte/x12";
const rejected: X12Ack997SetDispositionCode = X12_997_SET_DISPOSITION_CODES.R;
```

***

### X12\_ACK\_DISPOSITION\_CODES

> `const` **X12\_ACK\_DISPOSITION\_CODES**: `object`

AK9-01 (functional group) + IK5-01 (transaction set) disposition codes.
Sourced from ASC X12 code list 715. The implementation acknowledges the
inbound functional group / transaction set with one of these dispositions;
the LIBRARY does not decide accept-vs-reject - the application does.
`build999` / `buildTA1` MECHANICALLY build the cited disposition; a
fabricated `A` against a non-empty error list is a bug and refused at
build time (see "./errors.js".AckBuildError).

- `A` - Accepted.
- `E` - Accepted, but errors were noted.
- `P` - Partially accepted: at least one transaction set was rejected
  while the functional group as a whole was accepted.
- `R` - Rejected.
- `M` - Rejected: message authentication code (MAC) failed.
- `W` - Rejected: assurance failed validity tests.
- `X` - Rejected: content after decryption could not be analyzed.

#### Type Declaration

##### A

> `readonly` **A**: `"A"` = `"A"`

##### E

> `readonly` **E**: `"E"` = `"E"`

##### M

> `readonly` **M**: `"M"` = `"M"`

##### P

> `readonly` **P**: `"P"` = `"P"`

##### R

> `readonly` **R**: `"R"` = `"R"`

##### W

> `readonly` **W**: `"W"` = `"W"`

##### X

> `readonly` **X**: `"X"` = `"X"`

#### Example

```ts
import type { X12AckDispositionCode } from "@cosyte/x12";
const accept: X12AckDispositionCode = "A";
```

***

### X12\_BUILD\_ERROR\_CODES

> `const` **X12\_BUILD\_ERROR\_CODES**: `object`

Stable string codes for every [X12BuildError](#x12builderror). Locked here so
consumers can narrow on `err.code` exhaustively; additions-only thereafter
(renaming any code is a breaking change).

- `X12_BUILD_INVALID_SPEC` - a spec field violated a structural constraint
  the builder cannot recover from (an ISA-13 / IEA-02 control number longer
  than the 9-char fixed width, a segment spec with no segment id, etc.).

#### Type Declaration

##### X12\_BUILD\_INVALID\_SPEC

> `readonly` **X12\_BUILD\_INVALID\_SPEC**: `"X12_BUILD_INVALID_SPEC"` = `"X12_BUILD_INVALID_SPEC"`

#### Example

```ts
import { X12_BUILD_ERROR_CODES, X12BuildError } from "@cosyte/x12";
try {
  buildInterchange(spec);
} catch (err) {
  if (err instanceof X12BuildError && err.code === X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC) {
    // application bug - the envelope spec is structurally impossible
  }
}
```

***

### X12\_CODE\_LIST\_ERROR\_CODES

> `const` **X12\_CODE\_LIST\_ERROR\_CODES**: `object`

Stable string codes for every [X12CodeListError](#x12codelisterror). Locked here so
consumers can narrow on `err.code` exhaustively; additions-only thereafter
(renaming any code is a breaking change).

- `X12_CODE_LIST_INVALID_DOCUMENT_DATE` - the document date supplied to a
  date-aware code-list query was not a calendar day in `YYYY-MM-DD` or
  `CCYYMMDD` form.

#### Type Declaration

##### X12\_CODE\_LIST\_INVALID\_DOCUMENT\_DATE

> `readonly` **X12\_CODE\_LIST\_INVALID\_DOCUMENT\_DATE**: `"X12_CODE_LIST_INVALID_DOCUMENT_DATE"` = `"X12_CODE_LIST_INVALID_DOCUMENT_DATE"`

#### Example

```ts
import { X12_CODE_LIST_ERROR_CODES, X12CodeListError, checkCarcValidity } from "@cosyte/x12";
try {
  checkCarcValidity("1", "2026-6-27");
} catch (err) {
  if (
    err instanceof X12CodeListError &&
    err.code === X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE
  ) {
    // application bug - the date was never a calendar day
  }
}
```

***

### X12\_TR3\_CONFORMANCE

> `const` **X12\_TR3\_CONFORMANCE**: readonly [`X12Tr3Conformance`](#x12tr3conformance)[]

Which implementation guide this package implements for each transaction it
reads or builds, and what 45 CFR 162.920 names for that transaction.

Frozen at every level: the list, each row, and each row's arrays. Assign to
any of them and the value a later reader sees is unchanged.

The 005010 `cfrAdopted` values are read from the official Government
Publishing Office XML of 45 CFR 162.920, title 45 volume 2, 2024 annual
edition, retrieved 2026-08-25. Thirteen 005010 identifiers appear in that
section and no others: 005010X212, 005010X212E1, 005010X217, 005010X217E1,
005010X218, 005010X220, 005010X221, 005010X222, 005010X223, 005010X223A1,
005010X224, 005010X224A1 and 005010X279.

The 006020 `cfrAdopted` values are read from the current eCFR text of the
same section, as amended by 91 FR 14404, which adds two paragraphs and two
identifiers: (a)(19) names 006020X314 for the 275 and (a)(20) names
006020X313 for the 277 request for additional information. 45 CFR 162.2002
adopts both for the period on and after May 26, 2028. No other 006020
identifier appears in the section.

#### Example

```ts
import { X12_TR3_CONFORMANCE } from "@cosyte/x12";
const remit = X12_TR3_CONFORMANCE.find((row) => row.transaction === "835");
remit?.tr3;          // "005010X221A1"
remit?.cfrAdopted;   // ["005010X221"]
remit?.directions;   // ["read", "build"]
```

## Functions

### aaaLoopUnidentified()

> **aaaLoopUnidentified**(`position`, `level`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_271_AAA_LOOP_UNIDENTIFIED` warning. Raised where an AAA cannot
be attributed to an identified hierarchical loop: the enclosing level states
no HL-01, or no level of a kind this surface names encloses the segment.

The AAA is never dropped for it, and no identifier and no level is
synthesised. Every part of the key that could be determined is still
carried, and the occurrence index is always one of them.

#### Parameters

##### position

[`X12Position`](#x12position)

##### level

[`X12AaaLevelContext`](#x12aaalevelcontext)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { aaaLoopUnidentified, AAA_LEVEL_CONTEXTS } from "@cosyte/x12";
const w = aaaLoopUnidentified({ segmentIndex: 4 }, AAA_LEVEL_CONTEXTS.UNATTACHED);
```

***

### aaaProvenanceIsComplete()

> **aaaProvenanceIsComplete**(`meta`): `boolean`

True only when all FOUR provenance parts are established AND the terms as
recorded permit bundling. Exported so a consumer can apply the same bar to
a snapshot rather than re-deriving it.

#### Parameters

##### meta

[`AaaCodeListMeta`](#aaacodelistmeta)

#### Returns

`boolean`

#### Example

```ts
import { AAA_REJECT_REASON_CODES, aaaProvenanceIsComplete } from "@cosyte/x12";
aaaProvenanceIsComplete(AAA_REJECT_REASON_CODES.meta); // false
```

***

### aaaRejectReasonAbsent()

> **aaaRejectReasonAbsent**(`position`, `level`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_271_AAA_REJECT_REASON_ABSENT` warning. Raised where a 271 AAA
request-validation segment states no reject reason code, either because the
element is absent or because it is present and empty.

The AAA is still surfaced on the typed result with that code ABSENT: this
reports a code the payer did not state, never a code this reader replaced.
Its counterpart is [aaaUnknownCode](#aaaunknowncode), and the two are deliberately
different codes so a consumer can tell "no reason given" from "a reason
given that this package cannot describe".

#### Parameters

##### position

[`X12Position`](#x12position)

##### level

[`X12AaaLevelContext`](#x12aaalevelcontext)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { aaaRejectReasonAbsent, AAA_LEVEL_CONTEXTS } from "@cosyte/x12";
const w = aaaRejectReasonAbsent(
  { segmentIndex: 7, transactionIndex: 0, elementIndex: 3 },
  AAA_LEVEL_CONTEXTS.SUBSCRIBER,
);
```

***

### aaaSegmentMalformed()

> **aaaSegmentMalformed**(`position`, `level`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_271_AAA_SEGMENT_MALFORMED` warning. Raised where an AAA
element sits PAST the highest element position this reader has a source
for, or where the follow-up action code element is present and empty.

It reports that a position is occupied and asserts NOTHING about what
occupies it. Reading a meaning into an element whose layout is not
established is the failure this code exists to avoid, so the reader warns
about the position and moves on.

#### Parameters

##### position

[`X12Position`](#x12position)

##### level

[`X12AaaLevelContext`](#x12aaalevelcontext)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { aaaSegmentMalformed, AAA_LEVEL_CONTEXTS } from "@cosyte/x12";
const w = aaaSegmentMalformed(
  { segmentIndex: 7, transactionIndex: 0, elementIndex: 5 },
  AAA_LEVEL_CONTEXTS.INFORMATION_SOURCE,
);
```

***

### aaaUnknownCode()

> **aaaUnknownCode**(`position`, `level`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_271_AAA_UNKNOWN_CODE` warning. Raised once per stated AAA code
occurrence that resolves to no description in the bundled snapshot, whether
it is the reject reason code or the follow-up action code.

The bundled AAA snapshots ship empty, so today every stated AAA code raises
this. That is the intended consequence of shipping no descriptions rather
than descriptions whose redistribution terms nobody recorded.

#### Parameters

##### position

[`X12Position`](#x12position)

##### level

[`X12AaaLevelContext`](#x12aaalevelcontext)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { aaaUnknownCode, AAA_LEVEL_CONTEXTS } from "@cosyte/x12";
const w = aaaUnknownCode(
  { segmentIndex: 7, transactionIndex: 0, elementIndex: 3 },
  AAA_LEVEL_CONTEXTS.DEPENDENT,
);
```

***

### ack997Ak1Absent()

> **ack997Ak1Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_AK1_ABSENT` warning. Raised by `parse997` when the 997
carries no AK1, so `ak1` is undefined.

The reader anchors it at the ST (`segmentIndex: 0`), because an absent
segment has no position of its own. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997Ak1Absent } from "@cosyte/x12";
const w = ack997Ak1Absent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_997_AK1_ABSENT"
```

***

### ack997Ak5Absent()

> **ack997Ak5Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_AK5_ABSENT` warning. Raised by `parse997` when an AK2 is
closed before its AK5, so that response's `ak5` is undefined.

The reader anchors it at the AK2. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997Ak5Absent } from "@cosyte/x12";
const w = ack997Ak5Absent({ segmentIndex: 2, transactionIndex: 0 });
w.code; // "X12_997_AK5_ABSENT"
```

***

### ack997Ak5DispositionUnknown()

> **ack997Ak5DispositionUnknown**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_AK5_DISPOSITION_UNKNOWN` warning. Raised by `parse997`
when AK5-01 is absent, empty or outside code list 717, so
`ak5.disposition` is undefined and `ak5.dispositionRaw` carries the code.

The reader anchors it at that AK5, element 1. It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997Ak5DispositionUnknown } from "@cosyte/x12";
const w = ack997Ak5DispositionUnknown({ segmentIndex: 3, transactionIndex: 0, elementIndex: 1 });
w.code; // "X12_997_AK5_DISPOSITION_UNKNOWN"
```

***

### ack997Ak9Absent()

> **ack997Ak9Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_AK9_ABSENT` warning. Raised by `parse997` when the 997
carries no AK9, so `ak9` is undefined.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position
and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997Ak9Absent } from "@cosyte/x12";
const w = ack997Ak9Absent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_997_AK9_ABSENT"
```

***

### ack997Ak9DispositionUnknown()

> **ack997Ak9DispositionUnknown**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_AK9_DISPOSITION_UNKNOWN` warning. Raised by `parse997`
when AK9-01 is absent, empty or outside code list 715, so
`ak9.disposition` is undefined and `ak9.dispositionRaw` carries the code.

The reader anchors it at that AK9, element 1. It takes a position and
nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997Ak9DispositionUnknown } from "@cosyte/x12";
const w = ack997Ak9DispositionUnknown({ segmentIndex: 4, transactionIndex: 0, elementIndex: 1 });
w.code; // "X12_997_AK9_DISPOSITION_UNKNOWN"
```

***

### ack997SegmentNotDefined()

> **ack997SegmentNotDefined**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_SEGMENT_NOT_DEFINED` warning. Raised by `parse997` for a
segment inside a 997 that the 997 does not define (anything but AK1, AK2,
AK3, AK4, AK5 and AK9, such as a 999's CTX, IK3, IK4 or IK5), which does not
reach the reading.

The reader anchors it at that segment. It takes a position and nothing
else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997SegmentNotDefined } from "@cosyte/x12";
const w = ack997SegmentNotDefined({ segmentIndex: 3, transactionIndex: 0 });
w.code; // "X12_997_SEGMENT_NOT_DEFINED"
```

***

### ack997SegmentOutOfPlace()

> **ack997SegmentOutOfPlace**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_997_SEGMENT_OUT_OF_PLACE` warning. Raised by `parse997` for
an AK3 or AK5 with no AK2 open, an AK4 with no AK3 open, an AK1 after an
AK2, an AK2 after the AK9, or a second AK1 or AK9,
none of which reaches the reading.

The reader anchors it at that segment. It takes a position and nothing
else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack997SegmentOutOfPlace } from "@cosyte/x12";
const w = ack997SegmentOutOfPlace({ segmentIndex: 2, transactionIndex: 0 });
w.code; // "X12_997_SEGMENT_OUT_OF_PLACE"
```

***

### ack999Ak1Absent()

> **ack999Ak1Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_999_AK1_ABSENT` warning. Raised by `parse999` when the
transaction set carries no AK1, and the reading fills in an empty AK1, so
the 999 names no functional group it answers.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack999Ak1Absent } from "@cosyte/x12";
const w = ack999Ak1Absent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_999_AK1_ABSENT"
```

***

### ack999Ak9Absent()

> **ack999Ak9Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_999_AK9_ABSENT` warning. Raised by `parse999` when the
transaction set carries no AK9, and the reading fills in a reject and zero
counts for the functional group.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack999Ak9Absent } from "@cosyte/x12";
const w = ack999Ak9Absent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_999_AK9_ABSENT"
```

***

### ack999Ak9DispositionUnknown()

> **ack999Ak9DispositionUnknown**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_999_AK9_DISPOSITION_UNKNOWN` warning. Raised by `parse999`
when AK9-01 is absent, empty or not one of the seven dispositions of code
list 715, and the reading falls back to a reject for the functional group.

The reader anchors it at that AK9, element 1. It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack999Ak9DispositionUnknown } from "@cosyte/x12";
const w = ack999Ak9DispositionUnknown({ segmentIndex: 4, transactionIndex: 0, elementIndex: 1 });
w.code; // "X12_999_AK9_DISPOSITION_UNKNOWN"
```

***

### ack999Ik5Absent()

> **ack999Ik5Absent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_999_IK5_ABSENT` warning. Raised by `parse999` when an AK2
transaction set response is closed (by the next AK2, by the AK9 or by the
end of the transaction set) before its IK5 arrives, and the reading fills
in a reject for it.

The reader anchors it at that AK2. It takes a position and nothing else, so
no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack999Ik5Absent } from "@cosyte/x12";
const w = ack999Ik5Absent({ segmentIndex: 2, transactionIndex: 0 });
w.code; // "X12_999_IK5_ABSENT"
```

***

### ack999Ik5DispositionUnknown()

> **ack999Ik5DispositionUnknown**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_999_IK5_DISPOSITION_UNKNOWN` warning. Raised by `parse999`
when IK5-01 (or AK5-01 on a legacy segment) is absent, empty or not one of
the seven dispositions of code list 715, and the reading falls back to a
reject for that response.

The reader anchors it at that IK5, element 1. It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ack999Ik5DispositionUnknown } from "@cosyte/x12";
const w = ack999Ik5DispositionUnknown({ segmentIndex: 3, transactionIndex: 0, elementIndex: 1 });
w.code; // "X12_999_IK5_DISPOSITION_UNKNOWN"
```

***

### ambiguous837Variant()

> **ambiguous837Variant**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_AMBIGUOUS_VARIANT` warning. Emitted by the 837 helper
when the SVx fall-back is what resolved the variant AND the transaction
body carries service segments naming more than one variant, so the
resolution is a guess between contradictory evidence. The submission still
ships with the resolved variant on `submission.variant`; nothing about how
any claim or line decodes is changed by this warning.

It reports the RESOLUTION, not the document. A caller-supplied `opts.type`
wins ahead of the fall-back, and so does an ST-03 naming one of the three
known implementation-convention references, and in either case no guess was
made and this code is not raised however mixed the body is.

Which service segment is the stray one is deliberately not decided: this
reader cannot tell a stray service segment from a conformant one, and the
fall-back takes the first in the body whether or not a Loop 2400 was open
at it. Distinct from [unknown837Variant](#unknown837variant), which is raised where
NOTHING resolved a variant; the two can never travel together, because a
body with conflicting service segments has at least one to fall back on.

`get837Claims` anchors this at the **ST**, which is `tx.segments[0]` and
carries the ST-03 that would have settled the question. No `elementIndex`
is set: the conflict is a property of the body rather than of an element,
and one route into it is an ST-03 that is absent altogether.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { ambiguous837Variant } from "@cosyte/x12";
const w = ambiguous837Variant({ segmentIndex: 0, transactionIndex: 0 });
```

***

### amountRowDropped()

> **amountRowDropped**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_AMOUNT_ROW_DROPPED` warning. Emitted where an `AMT` or `ADX`
decoded no value from its amount element (AMT-02, ADX-01) and the reader
therefore built no row at all, so the qualifier or adjustment reason code
the sender did state is off the model with it.

`position` names the `AMT` / `ADX` segment itself and carries NO
`elementIndex`: one of the two routes here is an absent element, and an
absent element has no index to name. The element the reader was reading is
fixed by the segment anyway - AMT-02 or ADX-01 - so the segment locates the
loss exactly.

It is raised for BOTH routes to an undecoded amount, and
[unparseableDecimal](#unparseabledecimal) is unchanged by it: a present-but-undecodable
element still raises `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex`,
now ALONGSIDE this code rather than instead of it, so a consumer predicate
written against that code alone still fires exactly where it did. The
absent route raises this code and nothing else, which is what tells the two
apart.

Read the bound literally. This reports a row whose AMOUNT was read and
decoded no value. A segment a reader discards before reading its amount is
not on this channel, and neither is one whose amount decoded and then found
nothing open to attach the row to. An 820 `RMR` is not on it either, for its
own reason: `decodeRmr` drops on open-item IDENTITY, RMR-01 and RMR-02 both
empty, before the amount is read - so an `RMR` that states an open item and
no amount keeps its row with `amountPaid` `undefined`, while one that states
an amount and no open item is dropped whole. That second case is a separate
loss, as is an 837 `AMT` that decoded while a Loop 2430 adjudication was
open; [statedAmountDiscarded](#statedamountdiscarded) reports both and this code reports
neither. Nothing is fabricated to stand in and the segments stay verbatim on
the transaction set.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { amountRowDropped } from "@cosyte/x12";
const w = amountRowDropped({ segmentIndex: 7, transactionIndex: 0 });
```

***

### attachmentAbsent()

> **attachmentAbsent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_275_ATTACHMENT_ABSENT` warning. Raised by `get275Attachments`
when the transaction set carries no BDS segment, so the reading's
`attachments` list is empty.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position and
nothing else, so no byte of the document reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { attachmentAbsent } from "@cosyte/x12";
const w = attachmentAbsent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_275_ATTACHMENT_ABSENT"
```

***

### balanceNotEvaluable()

> **balanceNotEvaluable**(`position`, `invariant`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_835_BALANCE_NOT_EVALUABLE` warning. Emitted where a term of
a TR3 X221A1 §1.10.2 invariant is `undefined` on the model, so the
equation has nothing to compare on one side. `invariant` names which
equation could not be run.

This is deliberately a DIFFERENT code from
[remitBalanceMismatch](#remitbalancemismatch): that one asserts a computed inequality
between amounts the sender supplied, and this one asserts only that the
comparison could not be made. Reading an absent term as `0` is what made
the two indistinguishable before `X12Decimal | undefined`, and it is the
thing this code exists to stop.

#### Parameters

##### position

[`X12Position`](#x12position)

##### invariant

[`X12BalanceInvariant`](#x12balanceinvariant)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { balanceNotEvaluable, BALANCE_INVARIANTS } from "@cosyte/x12";
const w = balanceNotEvaluable(
  { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
  BALANCE_INVARIANTS.CLAIM,
);
```

***

### binaryDataTruncated()

> **binaryDataTruncated**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_BINARY_DATA_TRUNCATED` warning. Raised where the input ends
before a BDS or BIN segment's binary data reaches the octet count its length
element declares. The data element holds only the octets that are present,
so nothing past the end of the input is read, and the declared count is left
as the sender wrote it.

The parser anchors it at the BDS or BIN segment, with `elementIndex` on the
data element (BDS-03 or BIN-02). It takes a position and nothing else, so no
byte of the length or the data reaches the message.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { binaryDataTruncated } from "@cosyte/x12";
const w = binaryDataTruncated({ segmentIndex: 3, transactionIndex: 0, elementIndex: 2 });
w.code; // "X12_BINARY_DATA_TRUNCATED"
```

***

### binaryLengthInvalid()

> **binaryLengthInvalid**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_BINARY_LENGTH_INVALID` warning. Raised where a BDS or BIN
segment's length element (BDS-02 or BIN-01) is absent, empty, or not a
non-negative integer written as 1 to 15 ASCII digits, so a sign, a decimal
point or surrounding whitespace is refused and leading zeros are not. No
count is inferred: the segment is framed by its delimiters, exactly as a
segment of any other id is.

The parser anchors it at the BDS or BIN segment, with `elementIndex` on the
length element. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { binaryLengthInvalid } from "@cosyte/x12";
const w = binaryLengthInvalid({ segmentIndex: 3, transactionIndex: 0, elementIndex: 1 });
w.code; // "X12_BINARY_LENGTH_INVALID"
```

***

### binaryLengthMismatch()

> **binaryLengthMismatch**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_BINARY_LENGTH_MISMATCH` warning. Raised where the byte after a
BDS or BIN segment's declared span is not the segment terminator, which
covers a declared length shorter than the data and one longer than it, and
where the segment ends before a data element begins although a non-zero
length was declared. The data element holds exactly the declared span; the
bytes after it stay on the segment's raw text, so nothing the sender
transmitted is lost, and the length element is never rewritten.

The parser anchors it at the BDS or BIN segment, with `elementIndex` on the
data element. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { binaryLengthMismatch } from "@cosyte/x12";
const w = binaryLengthMismatch({ segmentIndex: 3, transactionIndex: 0, elementIndex: 3 });
w.code; // "X12_BINARY_LENGTH_MISMATCH"
```

***

### binaryLengthUnverifiable()

> **binaryLengthUnverifiable**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_BINARY_LENGTH_UNVERIFIABLE` warning. Raised where `parseX12`
was handed a string and a BDS or BIN segment's declared span holds a UTF-16
code unit above U+00FF. Every code unit at or below U+00FF is the latin1
image of one octet, so the count is applied one code unit per octet; above
that the octet count the sender meant cannot be known from a string, and this
reports it rather than guessing. The span's characters are still carried
verbatim. A `Buffer` input never raises it.

The parser anchors it at the BDS or BIN segment, with `elementIndex` on the
data element. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { binaryLengthUnverifiable } from "@cosyte/x12";
const w = binaryLengthUnverifiable({ segmentIndex: 3, transactionIndex: 0, elementIndex: 2 });
w.code; // "X12_BINARY_LENGTH_UNVERIFIABLE"
```

***

### build270()

> **build270**(`spec`): [`X12Interchange`](#x12interchange)

`build270` - assemble a 005010X279A1 270 around the supplied spec.

Refused via "./build-270-errors.js".Eligibility270BuildError:
- No information sources, a source with no receivers, a receiver with no
  subscribers, or a SPINE list slot (`informationSources`, `receivers`,
  `subscribers`, `dependents`, `inquiries`, `serviceTypeCodes`) handed
  something that is not a list or left with an empty slot in it, gives
  `X12_270_BUILD_INVALID_HIERARCHY`.
- A level with no name loop, at ANY of the four levels, a subscriber with
  neither an inquiry nor a dependent, a dependent with no inquiry, an inquiry
  that asks nothing, an empty or over-long control number, a non-string
  element value, or a LEAF list slot (`traces`, `references`, `dates`,
  `address.lines`, `diagnosisCodePointers`, `procedure.modifiers`) handed
  something that is not a list or left with an empty slot in it, gives
  `X12_270_BUILD_INVALID_SPEC`.

EVERY list slot on the spec is read through the package's array chokepoint
and checked for holes at the same point, so a forged array-like, and equally
a real list with a gap in it, draws one of those two typed refusals wherever
it stands. That is deliberately stricter than the sibling builders, whose
leaf lists throw an untyped `TypeError` a consumer cannot branch on.

Every refusal message names structural indices and counts. None of them
names a member identifier, a member name, a patient name, a trace value or a
diagnosis code, and the one caller value any of them renders (a control
number) goes through the package's bounded renderer.

#### Parameters

##### spec

[`Build270Spec`](#build270spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build270 } from "@cosyte/x12";
const ix = build270({
  envelope: {
    senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
    receivers: [{
      name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
      subscribers: [{
        traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
        name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
        inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
      }],
    }],
  }],
});
```

***

### build271()

> **build271**(`spec`): [`X12Interchange`](#x12interchange)

`build271` - assemble a 005010X279A1 271 around the supplied spec.

Refused via "./build-errors.js".Eligibility271BuildError:
- No information sources, a source with no receivers, or a receiver with
  no subscribers → `X12_271_BUILD_INVALID_HIERARCHY`.
- An over-long (\>9 char) interchange control number →
  `X12_271_BUILD_INVALID_SPEC`.
- An empty BHT-01, BHT-02, BHT-04 or BHT-05, given or defaulted →
  `X12_271_BUILD_INVALID_SPEC`.

The BHT comes from `spec.header`; see "./build-271-types.js".Build271HeaderSpec for its defaults.

#### Parameters

##### spec

[`Build271Spec`](#build271spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build271, X12Decimal } from "@cosyte/x12";
const ix = build271({
  envelope: {
    senderId: "MEDPAY", receiverId: "PROVIDER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
    receivers: [{
      entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
      subscribers: [{
        traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
        name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
        benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND", serviceTypeCodes: [{ code: "30" }], monetaryAmount: X12Decimal.fromString("1000.00")! }],
      }],
    }],
  }],
});
```

***

### build275()

> **build275**(`spec`): [`X12Interchange`](#x12interchange)

Build a 275 declaring `006020X314`.

#### Parameters

##### spec

[`Build275Spec`](#build275spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build275, serializeX12 } from "@cosyte/x12";
const ix = build275({
  envelope: {
    senderId: "CLINIC", receiverId: "PAYER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001", groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  lines: [{ attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }] }],
});
const octets = Buffer.from(serializeX12(ix), "latin1"); // BDS*B64*12*U1lOVEhFVElD
```

***

### build276()

> **build276**(`spec`): [`X12Interchange`](#x12interchange)

`build276` - assemble a 005010X212 276 Health Care Claim Status Request
around the supplied spec.

Refused via "./build-276-errors.js".ClaimStatus276BuildError:
- No information sources, a source with no receivers, a receiver with no
  service providers, a provider with no subscribers, or a SPINE list slot
  (`informationSources`, `receivers`, `providers`, `subscribers`,
  `dependents`, `claims`, `serviceLines`) handed something that is not a list
  or left with an empty slot in it, gives
  `X12_276_BUILD_INVALID_HIERARCHY`.
- A level with no name loop, at ANY of the five levels, a subscriber that
  asks about no claim and carries no dependent that does, a dependent with no
  claim, a claim carrying nothing a payer could look it up by, a service line
  identifying no service, an empty or over-long control number, a non-string
  element value, a non-`X12Decimal` amount, or a LEAF list slot
  (`references`, `amounts`, `dates`, `procedure.modifiers`) handed something
  that is not a list or left with an empty slot in it, gives
  `X12_276_BUILD_INVALID_SPEC`.

EVERY list slot on the spec is read through the package's array chokepoint
and checked for holes at the same point, so a forged array-like, and equally
a real list with a gap in it, draws one of those two typed refusals wherever
it stands.

Every refusal message names structural indices and counts. None of them names
a member identifier, a member name, a patient name, a trace value, a claim
number or a diagnosis code, and the one caller value any of them renders (a
control number) goes through the package's bounded renderer.

#### Parameters

##### spec

[`Build276Spec`](#build276spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build276 } from "@cosyte/x12";
const ix = build276({
  envelope: {
    senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
    receivers: [{
      name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "46", idCode: "RECVR01" },
      providers: [{
        name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
        subscribers: [{
          name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
          claims: [{
            trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
            references: [{ qualifier: "1K", value: "PCN0001" }],
          }],
        }],
      }],
    }],
  }],
});
```

***

### build277()

> **build277**(`spec`): [`X12Interchange`](#x12interchange)

`build277` - assemble a 005010X212 277 Claim Status Response around the
supplied spec.

#### Parameters

##### spec

[`Build277Spec`](#build277spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build277, X12Decimal } from "@cosyte/x12";
const ix = build277({
  envelope: {
    senderId: "MEDPAY", receiverId: "PROVIDER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  informationSources: [{
    entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
    receivers: [{
      entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
      providers: [{
        entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
        subscribers: [{
          member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
          claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM001" }, statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }] }],
        }],
      }],
    }],
  }],
});
```

***

### build277CA()

> **build277CA**(`spec`): [`X12Interchange`](#x12interchange)

`build277CA` - assemble a 005010X214 277CA Claim Acknowledgment around the
supplied spec. Identical body to [build277](#build277); only the ST-03 / GS-08
version differs (so the parsed result is admitted by
"./get-277.js".get277CADisposition and carries
`transactionType: "claim-acknowledgment"`).

#### Parameters

##### spec

[`Build277Spec`](#build277spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build277CA } from "@cosyte/x12";
declare const spec: import("@cosyte/x12").Build277Spec;
const ix = build277CA(spec); // ST-03 = 005010X214
```

***

### build277RequestForAdditionalInformation()

> **build277RequestForAdditionalInformation**(`spec`): [`X12Interchange`](#x12interchange)

Build a 277 request for additional information declaring `006020X313`.

#### Parameters

##### spec

[`Build277RfaiSpec`](#build277rfaispec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build277RequestForAdditionalInformation, serializeX12 } from "@cosyte/x12";
const ix = build277RequestForAdditionalInformation({
  envelope: {
    senderId: "PAYER", receiverId: "CLINIC",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001", groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
  levels: [{
    levelCode: "20",
    requests: [{
      trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
      statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
    }],
  }],
});
serializeX12(ix); // an interchange whose GS-08 and ST-03 read 006020X313
```

***

### build278Request()

> **build278Request**(`spec`): [`X12Interchange`](#x12interchange)

`build278Request` - assemble a 005010X217 278 Request for Review around the
supplied spec. Refuses any review carrying an HCR `decision` (HCR is
response-only), and any review whose HL-03 `levelCode` is outside
`EV` / `SS`.

#### Parameters

##### spec

[`Build278Spec`](#build278spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build278Request } from "@cosyte/x12";
const ix = build278Request({
  envelope: {
    senderId: "SUBMITTER", receiverId: "UMOPAYER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
  utilizationManagementOrganization: { entityIdentifierCode: "X3", entityTypeQualifier: "2", name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001" },
  requester: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "RENDERING CLINIC", idQualifier: "XX", idCode: "1234567893" },
  subscriber: {
    member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
    reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
  },
});
```

***

### build278Response()

> **build278Response**(`spec`): [`X12Interchange`](#x12interchange)

`build278Response` - assemble a 005010X217 278 Response around the supplied
spec, declaring that guide in GS-08 and ST-03 exactly as [build278Request](#build278request) does. The HCR `actionCode` on each review's `decision` is emitted VERBATIM
(never inferred), so the response round-trips the exact certification
outcome through "./get-278.js".get278Response. A review whose HL-03
`levelCode` is outside `EV` / `SS` is REFUSED, because that round trip is
what an out-of-enum level breaks: the emitted review loop is one no reader
opens, so the decision fails to decode.

#### Parameters

##### spec

[`Build278Spec`](#build278spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build278Response } from "@cosyte/x12";
declare const base: import("@cosyte/x12").Build278Spec;
const ix = build278Response({
  ...base,
  subscriber: {
    ...base.subscriber,
    reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" } }],
  },
}); // GS-08 = ST-03 = 005010X217, HCR*A1*AUTH123456
```

***

### build820()

> **build820**(`spec`): [`X12Interchange`](#x12interchange)

`build820` - assemble a 005010X218 820 around the supplied spec.

Refused via "./build-errors.js".Premium820BuildError with code
`X12_820_BUILD_INVALID_SPEC`:
- no TRN trace, or no remittance loop;
- a remittance with neither an `entity` nor an `individual` (nothing opens
  its loop), or with no `openItems`;
- an open item with empty `qualifier` AND empty `referenceId` (the read
  side drops it);
- an over-long (\> 9 char) interchange control number.

#### Parameters

##### spec

[`Build820Spec`](#build820spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build820, X12Decimal } from "@cosyte/x12";
const ix = build820({
  envelope: {
    senderId: "EMPLOYERCO", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: X12Decimal.fromString("250.00")!,
    creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
  remittances: [{
    individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
    openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
  }],
});
```

***

### build834()

> **build834**(`spec`): [`X12Interchange`](#x12interchange)

`build834` - assemble a 005010X220A1 834 around the supplied spec.

Refused via "./build-errors.js".Enrollment834BuildError:
- an `INS-03` or `HD-01` maintenance type code outside the validated X12
  875 subset → `X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`;
- no member loop, an empty (required) `INS-03`, or an over-long (\> 9 char)
  interchange control number → `X12_834_BUILD_INVALID_SPEC`.

#### Parameters

##### spec

[`Build834Spec`](#build834spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build834 } from "@cosyte/x12";
const ix = build834({
  envelope: {
    senderId: "EMPLOYERCO", receiverId: "MEDPAY",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  header: {
    transactionSetPurposeCode: "00",
    sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
    payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
  },
  members: [{
    subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
    member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
    healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
  }],
});
```

***

### build835()

> **build835**(`spec`): [`X12Interchange`](#x12interchange)

`build835` - assemble a 005010X221A1 835 around the supplied spec.

Refused via "./build-errors.js".Remit835BuildError:
- No trace supplied, or a claim with no patient-control number, etc. →
  `X12_835_BUILD_INVALID_SPEC`.
- Any §1.10.2 balance invariant violated (service-line `SVC-02 ==
  SVC-03 + Σ(line CAS)`, claim `CLP-03 == CLP-04 + Σ(claim+line CAS)`,
  or top-of-remit `BPR-02 == Σ(CLP-04) − Σ(PLB)`) →
  `X12_835_BUILD_BALANCE_MISMATCH`.

#### Parameters

##### spec

[`Build835Spec`](#build835spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build835, X12Decimal } from "@cosyte/x12";
const ix = build835({
  envelope: {
    senderId: "MEDICARE", receiverId: "SUBMITTER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: X12Decimal.fromString("450.00")!,
    creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
  claims: [
    {
      patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
      totalChargeAmount: X12Decimal.fromString("500.00")!,
      totalPaymentAmount: X12Decimal.fromString("450.00")!,
      patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
      adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
    },
  ],
});
```

***

### build837D()

> **build837D**(`spec`): [`X12Interchange`](#x12interchange)

`build837D` - assemble a Dental 837 around the spec, declaring
`005010X224A2` unless `envelope.implementationConventionReference` states
the guide your trading partner requires. Service lines must be
`variant: "D"` (SV3); per-line tooth detail rides on TOO.

#### Parameters

##### spec

[`Build837Spec`](#build837spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build837D, X12Decimal } from "@cosyte/x12";
declare const spec: import("@cosyte/x12").Build837Spec;
const ix = build837D(spec); // each serviceLine: { variant: "D", procedureQualifier: "AD", ... }
```

***

### build837I()

> **build837I**(`spec`): [`X12Interchange`](#x12interchange)

`build837I` - assemble an Institutional 837 around the spec, declaring
`005010X223A3` unless `envelope.implementationConventionReference` states
the guide your trading partner requires. Service lines must be
`variant: "I"` (SV2).

#### Parameters

##### spec

[`Build837Spec`](#build837spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build837I, X12Decimal } from "@cosyte/x12";
declare const spec: import("@cosyte/x12").Build837Spec;
const ix = build837I(spec); // each serviceLine: { variant: "I", revenueCode: "0120", ... }
```

***

### build837P()

> **build837P**(`spec`): [`X12Interchange`](#x12interchange)

`build837P` - assemble a Professional 837 around the spec, declaring
`005010X222A2` unless `envelope.implementationConventionReference` states
the guide your trading partner requires.

#### Parameters

##### spec

[`Build837Spec`](#build837spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build837P, X12Decimal } from "@cosyte/x12";
const ix = build837P({
  envelope: {
    senderId: "SUBMITTER", receiverId: "RECEIVER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUBMITTER ONE", idQualifier: "46", idCode: "SUB001" },
  receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "RECEIVER ONE", idQualifier: "46", idCode: "REC001" },
  billingProviders: [{
    provider: { entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
    subscribers: [{
      info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
      subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
      payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
      claims: [{
        claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
        diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
        serviceLines: [{ variant: "P", procedureQualifier: "HC", procedureCode: "99213", charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"] }],
      }],
    }],
  }],
});
```

***

### build997()

> **build997**(`spec`): [`X12Interchange`](#x12interchange)

`build997` - assemble a 997 Functional Acknowledgment around the supplied
envelope and functional group spec.

Refused through [AckBuildError](#ackbuilderror):
- an AK9-01 outside code list 715, or an AK5-01 outside code list 717
  (which has no `P`) - `X12_ACK_INVALID_DISPOSITION`;
- a count, AK3-02 position or AK4-01 position that is not a whole number,
  an empty AK4-03, or `contexts` on any segment or element error (a 999
  error list passed on: the 997 has no CTX) - `X12_ACK_INVALID_SPEC`;
- everything `build999` refuses: an accept with errors
  (`X12_ACK_ACCEPT_WITH_ERRORS`), counts that disagree
  (`X12_ACK_COUNT_MISMATCH`), an empty or over-long control number.

#### Parameters

##### spec

[`Build997Spec`](#build997spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build997, serializeX12 } from "@cosyte/x12";
const ix = build997({
  envelope: {
    senderId: "RECEIVER", receiverId: "SENDER",
    interchangeDate: "260601", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  functionalGroup: {
    functionalIdCode: "HC", groupControlNumber: "7",
    disposition: "A",
    numberOfTransactionSets: 1, numberOfReceivedTransactionSets: 1, numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
    ],
  },
});
serializeX12(ix); // "ISA*00*...~GS*FA*RECEIVER*SENDER*20260601*1200*1*X*005010~ST*997*0001~AK1*HC*7~..."
```

***

### build999()

> **build999**(`spec`): [`X12Interchange`](#x12interchange)

`build999` - assemble a 005010X231A1 Implementation Acknowledgment
around the supplied envelope + functional-group spec.

Safety guards (refused via [AckBuildError](#ackbuilderror)):
- Functional-level `A` disposition paired with any per-transaction
  non-`A` response, or any per-transaction segment-error / syntax-error
  payload anywhere in the spec → "./errors.js".ACK\_BUILD\_ERROR\_CODES.X12\_ACK\_ACCEPT\_WITH\_ERRORS.
- Per-transaction `A` disposition paired with non-empty
  `segmentErrors` / `syntaxErrorCodes` → same.
- AK9-04 (accepted) \> AK9-03 (received), AK9-03 \> AK9-02 (declared),
  or response-list length not equal to AK9-03 → "./errors.js".ACK\_BUILD\_ERROR\_CODES.X12\_ACK\_COUNT\_MISMATCH.

#### Parameters

##### spec

[`Build999Spec`](#build999spec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { build999 } from "@cosyte/x12";
const ix = build999({
  envelope: {
    senderId: "SENDER", receiverId: "RECEIVER",
    interchangeDate: "250101", interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1", transactionSetControlNumber: "0001",
  },
  functionalGroup: {
    functionalIdCode: "HC", groupControlNumber: "1", versionRelease: "005010X222A2",
    disposition: "A",
    numberOfTransactionSets: 1, numberOfReceivedTransactionSets: 1, numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
    ],
  },
});
```

***

### buildInterchange()

> **buildInterchange**(`spec`): [`X12Interchange`](#x12interchange)

Assemble a complete [X12Interchange](#x12interchange) from a segment-level
[InterchangeSpec](#interchangespec). See the module header for the envelope mechanics
the builder owns.

#### Parameters

##### spec

[`InterchangeSpec`](#interchangespec)

#### Returns

[`X12Interchange`](#x12interchange)

#### Example

```ts
import { buildInterchange } from "@cosyte/x12";
const ix = buildInterchange({
  senderId: "SENDER", receiverId: "RECEIVER",
  interchangeDate: "250101", interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [
    {
      functionalIdCode: "HC", groupControlNumber: "1", versionRelease: "005010X222A2",
      transactions: [
        {
          transactionSetIdCode: "837", transactionSetControlNumber: "0001",
          implementationConventionReference: "005010X222A2",
          segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
        },
      ],
    },
  ],
});
```

***

### buildTA1()

> **buildTA1**(`spec`, `options?`): [`Ta1Segment`](#ta1segment)

`buildTA1` - assemble a TA1 Interchange Acknowledgment segment from the
supplied spec. The returned [Ta1Segment](#ta1segment) carries the 1-indexed
5-element value array (`elements[0]` = `"TA1"`, `elements[1]` =
TA1-01, …, `elements[5]` = TA1-05) plus the verbatim wire text on `raw`
(no segment terminator appended - that's the envelope's job).

Safety guards (refused via [AckBuildError](#ackbuilderror)):

- `ackCode === "A"` paired with `noteCode !== "000"` →
  "./errors.js".ACK\_BUILD\_ERROR\_CODES.X12\_TA1\_ACCEPT\_WITH\_NOTE.
  Accept must mean accept. Use `E` (accept with errors) when the
  inbound had structural defects you elected to ignore. This one runs
  FIRST and its precedence is unchanged.
- Any of the five element values that is not a `string` →
  "./errors.js".ACK\_BUILD\_ERROR\_CODES.X12\_ACK\_INVALID\_SPEC. This
  is not a bonus guard: releasing a value means routing it through
  "../../builder/caller-string.js".makeCallerEscaper, and the
  bare `escapeRelease` underneath it returns its empty accumulator for a
  `number`, so escaping without the type check would have replaced the
  shifted-element defect with a silently VANISHED TA1-01. **A number or
  an `undefined` control number used to emit as `TA1*12345*…` (the
  number surviving onto `elements`, in a `readonly string[]`) or
  `TA1**250101*…`; both now refuse.**

#### Parameters

##### spec

[`BuildTA1Spec`](#buildta1spec)

The TA1 fields. `interchangeControlNumber` echoes the
              inbound ISA-13; `interchangeDate` / `interchangeTime` echo
              the inbound ISA-09 / ISA-10; `ackCode` is the disposition;
              `noteCode` is the note (`000` for no-error pairings).

##### options?

[`BuildTA1Options`](#buildta1options) = `{}`

Optional delimiter overrides for callers building TA1
                 segments embedded in non-default envelopes. The
                 defaults match the cosyte parser archetype (`*` element,
                 `~` segment) - override when wrapping a TA1 in an ISA
                 envelope whose declared delimiters differ.

#### Returns

[`Ta1Segment`](#ta1segment)

#### Example

```ts
import { buildTA1 } from "@cosyte/x12";

// Accept (canonical "no error" pairing).
const ok = buildTA1({
  interchangeControlNumber: "000000001",
  interchangeDate: "250101",
  interchangeTime: "1200",
  ackCode: "A",
  noteCode: "000",
});
ok.raw; // 'TA1*000000001*250101*1200*A*000'

// Reject (control number mismatch).
const reject = buildTA1({
  interchangeControlNumber: "000000007",
  interchangeDate: "250101",
  interchangeTime: "1200",
  ackCode: "R",
  noteCode: "001",
});
```

***

### bundleAaaCodes()

> **bundleAaaCodes**(`meta`, `codes`): [`AaaCodeListSnapshot`](#aaacodelistsnapshot)

Bundle `codes` under `meta`, DROPPING every description unless the
four-part record is complete and permits it. The refusal is the whole
point: a description cannot reach a consumer on the strength of terms
nobody recorded, however it got into the source table. The package builds
its two bundled snapshots, [AAA\_REJECT\_REASON\_CODES](#aaa_reject_reason_codes) and
[AAA\_FOLLOW\_UP\_ACTION\_CODES](#aaa_follow_up_action_codes), through this function.

#### Parameters

##### meta

[`AaaCodeListMeta`](#aaacodelistmeta)

##### codes

`Readonly`\<`Record`\<`string`, `string`\>\>

#### Returns

[`AaaCodeListSnapshot`](#aaacodelistsnapshot)

#### Example

```ts
import { AAA_REJECT_REASON_CODES, bundleAaaCodes } from "@cosyte/x12";
// The bundled record does not permit descriptions, so every one is dropped.
const snapshot = bundleAaaCodes(AAA_REJECT_REASON_CODES.meta, { ZZ: "An invented description" });
Object.keys(snapshot.codes).length; // 0
```

***

### checkClaimBalance()

> **checkClaimBalance**(`claim`, `position`): [`X12ParseWarning`](#x12parsewarning) \| `undefined`

Check the claim-level invariant `CLP-03 === CLP-04 + Σ(all CAS in
claim, both claim and line level)`. Returns the warning when out of
balance, or `undefined` otherwise. Pure - no side effects.

#### Parameters

##### claim

[`X12RemitClaim`](#x12remitclaim)

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning) \| `undefined`

#### Example

```ts
import { checkClaimBalance } from "@cosyte/x12";
declare const claim: X12RemitClaim;
const w = checkClaimBalance(claim, { segmentIndex: 12 });
if (w !== undefined) {
  // not balanced - w.message names the TR3 equation; the amounts are on `claim`,
  // and w.position.segmentIndex is the CLP's own index in the transaction body
}
```

***

### checkCoreCodeCombination()

> **checkCoreCodeCombination**(`query`): [`CoreCodeCombinationResult`](#corecodecombinationresult)

Answer whether one 835 adjustment's group code, reason code and
accompanying remark codes are a combination the caller's CORE Code
Combinations table lists for a named CORE-defined business scenario.

- **`in-table`** when the table has a row for that scenario with that group
  code and that reason code, and every supplied remark code appears in some
  row for that same scenario, group code and reason code. With no remarks,
  the pair's own row suffices. A permitted pair does not license an
  arbitrary remark.
- **`not-in-table`** when the table has rows for the scenario and the
  combination is not among them, including a combination the table lists
  only under a different scenario.
- **`unevaluated`**, with a `reason`, when there is no table, the scenario
  is not one of the four, the table has no row for the scenario, the group
  code or reason code is empty, or a remark is not an `HE` remark code.
  **Never read `unevaluated` as permitted.**

Codes are matched exactly as supplied: no case folding and no trimming, so
`co` and `CO ` are not `CO`. The table's `version` comes back beside every
answer given against it, exactly as supplied. Nothing supplied is mutated.

What it does not do: decide which scenario an adjustment belongs to, walk a
whole remittance, bind a remark to an adjustment, say which remark code
failed, check a code's effective dates, or evaluate a scenario a health
plan defines for itself. No CORE table ships with this package.

#### Parameters

##### query

[`CoreCodeCombinationQuery`](#corecodecombinationquery)

The table, the scenario, the adjustment and its remarks.

#### Returns

[`CoreCodeCombinationResult`](#corecodecombinationresult)

The answer, with the table's version label.

#### Throws

When a supplied table is malformed
  (`X12_CORE_COMBINATION_TABLE_INVALID`). The message names the field and
  row index only, never a value from the table.

#### Example

```ts
import { checkCoreCodeCombination, CORE_BUSINESS_SCENARIOS } from "@cosyte/x12";
const table = {
  version: "my-transcription-2026-02",
  rows: [{ scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901" }] as const,
};
checkCoreCodeCombination({
  table,
  scenario: CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED,
  adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
});
// { outcome: "in-table", tableVersion: "my-transcription-2026-02" }
checkCoreCodeCombination({
  scenario: CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED,
  adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
});
// { outcome: "unevaluated", reason: "no-table", tableVersion: undefined }
```

***

### checkRemitTotalBalance()

> **checkRemitTotalBalance**(`bpr02`, `claims`, `providerAdjustments`, `position`): [`X12ParseWarning`](#x12parsewarning) \| `undefined`

Check the top-of-remit invariant `BPR-02 === Σ(CLP-04) - Σ(PLB
amounts)`. PLB amounts are preserved with their **raw EDI sign**
(positive = take-back from provider; negative = credit to provider -
see "./types.js".X12RemitProviderAdjustment), so the
*subtraction* is what makes the equation balance. Returns the warning
when out of balance, or `undefined` when balanced.

#### Parameters

##### bpr02

[`X12Decimal`](#x12decimal) \| `undefined`

##### claims

readonly [`X12RemitClaim`](#x12remitclaim)[]

##### providerAdjustments

readonly [`X12RemitProviderAdjustment`](#x12remitprovideradjustment)[]

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning) \| `undefined`

#### Example

```ts
import { checkRemitTotalBalance } from "@cosyte/x12";
declare const remit: import("./types.js").X12Remittance;
const w = checkRemitTotalBalance(
  remit.payment.totalActualPayment,
  remit.claims,
  remit.providerAdjustments,
  { segmentIndex: 2, transactionIndex: 0 },
);
```

***

### checkServiceLineBalance()

> **checkServiceLineBalance**(`claim`, `position`): readonly [`X12ParseWarning`](#x12parsewarning)[]

Check the per-service-line invariant `SVC-02 === SVC-03 + Σ(line CAS)`.
Returns one warning per out-of-balance service line. Header-only
adjudications (claims with zero service lines) produce no per-line
warning. Pure - no side effects.

#### Parameters

##### claim

[`X12RemitClaim`](#x12remitclaim)

##### position

[`X12Position`](#x12position)

#### Returns

readonly [`X12ParseWarning`](#x12parsewarning)[]

#### Example

```ts
import { checkServiceLineBalance } from "@cosyte/x12";
declare const claim: X12RemitClaim;
const warnings = checkServiceLineBalance(claim, { segmentIndex: 14 });
```

***

### codeListRedistributionIsPermitted()

> **codeListRedistributionIsPermitted**(`meta`): `boolean`

Whether this list's descriptions may be regenerated and redistributed, read
off its own record and nothing else. Only a recorded `"permitted"` answers
`true`: a licence requirement, an unsettled status and a missing record all
answer `false`, so a permission is never inferred from an absence.

Exported so a consumer applies the same bar this package applies to itself,
rather than re-deriving one from the status string.

#### Parameters

##### meta

[`CodeListMeta`](#codelistmeta)

#### Returns

`boolean`

#### Example

```ts
import { CARC, RARC, codeListRedistributionIsPermitted } from "@cosyte/x12";
codeListRedistributionIsPermitted(RARC.meta); // true  (CMS, no licence)
codeListRedistributionIsPermitted(CARC.meta); // false (X12, licence required)
```

***

### collectElementValues()

> **collectElementValues**(`seg`, `start`, `end`, `delimiters`): `string`[]

Collect non-empty element values across the 1-indexed inclusive range
`[start, end]`. Returns a new array preserving order, omitting empty /
missing slots. Common for sweeping N3 address-line composites, MIA /
MOA remark code slots, etc.

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### start

`number`

##### end

`number`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

`string`[]

#### Example

```ts
import { collectElementValues } from "@cosyte/x12";
collectElementValues(n3Segment, 1, 2, delim); // ["123 Main St", "Apt 4"]
```

***

### componentOptional()

> **componentOptional**(`seg`, `n`, `p`, `delimiters`): `string` \| `undefined`

Read component P (1-indexed) of element N (1-indexed) as a string, or
`undefined` when absent / empty. The common shape for X12 composite
elements (`HI-01-2`, `CLM-05-1`, `SVC-01-2`, etc.).

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### p

`number`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

`string` \| `undefined`

#### Example

```ts
import { componentOptional } from "@cosyte/x12";
componentOptional(seg, 1, 2, delim); // HI-01-2 (the actual code)
```

***

### controlNumberMismatch()

> **controlNumberMismatch**(`position`, `pair`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_CONTROL_NUMBER_MISMATCH` warning. Emitted when an
envelope-trailer control number does not match its matching header:
ISA-13 ↔ IEA-02, GS-06 ↔ GE-02, or ST-02 ↔ SE-02.

Neither side is echoed, not truncated and not hashed. A control number is
free-form trading-partner text on five of the six slots (only ISA-13 is
fixed-width), routinely carries a batch or patient-account identifier in
the field, and is entirely sender-controlled.

#### Parameters

##### position

[`X12Position`](#x12position)

##### pair

[`X12ControlNumberPair`](#x12controlnumberpair)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { controlNumberMismatch, CONTROL_NUMBER_PAIRS } from "@cosyte/x12";
const w = controlNumberMismatch(
  { segmentIndex: 6, interchangeIndex: 0, elementIndex: 2 },
  CONTROL_NUMBER_PAIRS.INTERCHANGE,
);
```

***

### danglingReleaseChar()

> **danglingReleaseChar**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_DANGLING_RELEASE_CHAR` warning. Emitted when a release
character (`?` per ASC X12 convention; see
"./release.js".RELEASE\_CHAR) appears at the end of a segment or
element with no following byte to escape - the bytes are preserved
verbatim so round-trip stays byte-exact, but the structural truncation
is flagged so consumers can decide how to react.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { danglingReleaseChar } from "@cosyte/x12";
const w = danglingReleaseChar({ segmentIndex: 7, interchangeIndex: 0 });
```

***

### dateRowDropped()

> **dateRowDropped**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_DATE_ROW_DROPPED` warning. Raised where a 270's DTP reached
the reader short of its qualifier (DTP-01) or its value (DTP-03), so no date
row was built and the whole segment, the format qualifier included, is absent
from the typed model.

A DTP is a RECORD and not a slot, which is why the loss is the row rather
than one element, and why it is reported at all: without this code an empty
`dates` list reads the same whether the sender stated no date or stated one
this reader could not build a row from.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { dateRowDropped } from "@cosyte/x12";
const w = dateRowDropped({ segmentIndex: 9, transactionIndex: 0 });
```

***

### decodeSegment()

> **decodeSegment**(`raw`, `delimiters`, `emit`, `position`): [`X12Segment`](#x12segment)

Decode a raw segment string into an [X12Segment](#x12segment). Splits on the
detected element separator (honouring the `?`-release-character escape),
preserves the verbatim raw text, and surfaces dangling-release warnings
via the supplied emitter with positional context tied to the segment.

Never throws - malformed input produces a best-effort segment and any
issues surface as Tier-2 warnings via `emit`. An empty input string
decodes to an empty segment (`id: ""`, `elements: [""]`); callers that
care can guard.

**A degenerate delimiter set whose ELEMENT SEPARATOR is itself `?` splits
literally**, because one byte cannot both separate and escape. Only that
role is guarded here: a `?` repetition or component separator is a
different call and is deliberately unchanged (see
"./release.js".splitWithRelease).

**A BDS or BIN segment's binary data element is framed by the octet count
its length element declares** (BDS-02 / BIN-01), not by scanning for
delimiters: the data element (BDS-03 / BIN-02) is exactly that many
characters of `raw`, whatever delimiter or `?` bytes it holds, and is the
last element. Where the count cannot be honoured this raises
`X12_BINARY_DATA_TRUNCATED`, `X12_BINARY_LENGTH_INVALID`,
`X12_BINARY_LENGTH_MISMATCH` or `X12_BINARY_LENGTH_UNVERIFIABLE`, anchored at
`position` with the element it concerns. An absent, empty or malformed
length element frames the segment by its delimiters, as any other segment
is framed. `raw` is always the sender's bytes, so bytes after a declared
span that the terminator did not follow stay on it.

#### Parameters

##### raw

`string`

##### delimiters

[`Delimiters`](#delimiters)

##### emit

(`w`) => `void`

##### position

[`X12Position`](#x12position)

#### Returns

[`X12Segment`](#x12segment)

#### Example

```ts
import { decodeSegment } from "@cosyte/x12";
const d = { element: "*", repetition: "^", component: ":", segment: "~" };
const seg = decodeSegment("NM1*IL*1*DOE*JANE", d, () => {}, { segmentIndex: 5 });
seg.id;          // "NM1"
seg.elements[3]; // "DOE"
const bin = decodeSegment("BIN*5*A*B:C", d, () => {}, { segmentIndex: 6 });
bin.elements[2]; // "A*B:C" (five octets, one element)
```

***

### defineLoopSpec()

> **defineLoopSpec**(`input`): [`LoopSpec`](#loopspec)

Define a TR3 loop specification. Validates structurally, freezes the
resulting [LoopSpec](#loopspec) (along with its `segments` and `children`
arrays), and returns it. Pure - no I/O, no global state.

#### Parameters

##### input

[`DefineLoopSpecInput`](#defineloopspecinput)

#### Returns

[`LoopSpec`](#loopspec)

#### Example

```ts
import { defineLoopSpec } from "@cosyte/x12";
const Loop2110 = defineLoopSpec({
  id: "2110",
  description: "835 Service Payment Information",
  trigger: "SVC",
  segments: [
    { id: "SVC", usage: "required",  max: 1 },
    { id: "DTM", usage: "situational", max: ">1" },
    { id: "CAS", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "LQ",  usage: "situational", max: ">1" },
  ],
});
Loop2110.trigger; // "SVC"
```

***

### defineProfile()

> **defineProfile**(`opts`): [`X12Profile`](#x12profile)

Build a readonly [X12Profile](#x12profile) from a validated spec. Invalid input
throws "./errors.js".X12ProfileError with an actionable message:
missing/empty name, unknown option key (with a typo hint), or a quirk that
violates the locked hard rule (missing `fixture`, bad `effect`, unknown
`expectedWarnings` code).

`extends` composes parent profiles: lineage flattens + dedupes, quirks
merge by id (child wins on collision, non-colliding parent quirks survive),
and `description` is last-wins.

#### Parameters

##### opts

[`X12ProfileSpec`](#x12profilespec)

#### Returns

[`X12Profile`](#x12profile)

#### Example

```ts
import { defineProfile } from "@cosyte/x12";
const availity = defineProfile({
  name: "availity",
  description: "Availity clearinghouse 835 ERA conventions",
  quirks: [
    {
      id: "payer-loop-ref-2u",
      effect: "adds",
      summary: "Payer Loop 1000A carries a REF*2U additional payer identifier.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "Availity 835 ERA companion guide - payer-loop REF",
    },
  ],
});
availity.name;               // "availity"
availity.lineage;            // ["availity"]
availity.describe().adds;    // [{ id: "payer-loop-ref-2u", ... }]
```

***

### detectDelimiters()

> **detectDelimiters**(`raw`): [`Delimiters`](#delimiters)

Detect the four X12 delimiters from a raw input string by reading fixed
byte positions inside the ISA envelope. Validates that:

- the input is at least [ISA\_MIN\_LENGTH](#isa_min_length) bytes (else
  `X12_ISA_TOO_SHORT`),
- the input begins with the literal `"ISA"` (else `X12_NO_ISA_HEADER`),
- each delimiter is a single visible (non-whitespace, non-control)
  character and the four are mutually distinct (else
  `X12_INVALID_DELIMITERS`),
- the detected element separator actually appears at every fixed ISA
  element-separator position (else `X12_INVALID_DELIMITERS`) - guards
  against an input that begins with `"ISA"` followed by structurally
  wrong bytes (e.g. a tab as element separator with `:` further in).

The parser is liberal in what it accepts AFTER the ISA - downstream
envelope walking emits Tier-2 warnings rather than throwing. But the
ISA itself MUST be structurally readable; otherwise no later stage has
a delimiter set to work with.

#### Parameters

##### raw

`string`

#### Returns

[`Delimiters`](#delimiters)

#### Example

```ts
import { detectDelimiters } from "@cosyte/x12";
const d = detectDelimiters("ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~GS*HC*S*R*20250101*1200*1*X*005010X222A2~...");
d.element;   // "*"
d.repetition; // "^"
d.component; // ":"
d.segment;   // "~"
```

***

### duplicateHierarchyId()

> **duplicateHierarchyId**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_DUPLICATE_HIERARCHY_ID` warning. Raised at the second and
each subsequent HL in a 270 transaction set to carry an HL-01 an earlier one
already carried. `position` names the repeat, never the first occurrence.

Attachment is what the duplication decides, and the rule is fixed so the
decode is deterministic: a child naming that identifier attaches to the
FIRST level carrying it in transmitted order.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { duplicateHierarchyId } from "@cosyte/x12";
const w = duplicateHierarchyId({ segmentIndex: 7, transactionIndex: 0 });
```

***

### elementDecimal()

> **elementDecimal**(`seg`, `n`, `delimiters`, `sink?`): [`X12Decimal`](#x12decimal) \| `undefined`

Read element N (1-indexed) as an [X12Decimal](#x12decimal), or `undefined`
when absent / empty / malformed. The walker discipline for every
monetary or quantity field - NEVER `parseFloat`.

**`undefined` here means "not decoded", not "absent."** When `sink` is
supplied, a PRESENT element that does not decode emits
`X12_UNPARSEABLE_DECIMAL` carrying `elementIndex: n`, so the two cases are
told apart on the warning channel. Without a sink the ambiguity is
silent, which is why every reader in this library passes one; use
[readElementDecimal](#readelementdecimal) when you want the distinction in-band instead.
An ABSENT element returns `undefined` and does NOT warn.

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### delimiters

[`Delimiters`](#delimiters)

##### sink?

[`X12DecimalWarningSink`](#x12decimalwarningsink)

#### Returns

[`X12Decimal`](#x12decimal) \| `undefined`

#### Example

```ts
import { elementDecimal } from "@cosyte/x12";
elementDecimal(seg, 2, delim)?.toString(); // BPR-02 verbatim decimal
```

***

### elementDecimalOrZero()

> **elementDecimalOrZero**(`seg`, `n`, `delimiters`, `sink?`): [`X12Decimal`](#x12decimal)

Read element N (1-indexed) as an [X12Decimal](#x12decimal), defaulting to
`X12Decimal.ZERO` when absent. Convenient for fields the walker treats
as "missing means zero" (charge totals, etc.).

**The `0` this returns for a PRESENT-but-unparseable element is a
stand-in, not a reading.** A slot typed `X12Decimal` cannot express
"did not decode", so a consumer looking only at the model cannot tell
that `0` from a `0` the sender sent: on a paid amount that is a fabricated
amount presented as read. When `sink` is supplied the case emits
`X12_UNPARSEABLE_DECIMAL`, which is the only signal that distinguishes
them. Pass one, or use [readElementDecimal](#readelementdecimal) and decide for
yourself.

An ABSENT element still returns `X12Decimal.ZERO` and does NOT warn: that
is the documented "missing means zero" convention of the slots that use
this helper, and it is unchanged.

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### delimiters

[`Delimiters`](#delimiters)

##### sink?

[`X12DecimalWarningSink`](#x12decimalwarningsink)

#### Returns

[`X12Decimal`](#x12decimal)

#### Example

```ts
import { elementDecimalOrZero } from "@cosyte/x12";
elementDecimalOrZero(seg, 2, delim).toString();
```

***

### elementOptional()

> **elementOptional**(`seg`, `n`, `delimiters`): `string` \| `undefined`

Read element N (1-indexed) as `string | undefined`. Empty strings
collapse to `undefined` - the conventional "absent" sentinel for
optional element slots.

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

`string` \| `undefined`

#### Example

```ts
import { elementOptional } from "@cosyte/x12";
// returns undefined when NM1-04 is "" or missing
```

***

### elementValue()

> **elementValue**(`seg`, `n`, `delimiters`): `string`

Read element N (1-indexed) from a decoded segment as a string. Returns
`""` when the element is absent or empty - convenient when downstream
code wants to fold "absent" and "empty" into one branch. For
"absent / empty → `undefined`" use [elementOptional](#elementoptional).

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

`string`

#### Example

```ts
import { decodeSegment, elementValue } from "@cosyte/x12";
declare const seg: ReturnType<typeof decodeSegment>;
declare const delim: import("./types.js").Delimiters;
elementValue(seg, 3, delim); // verbatim text of element 3, or "".
```

***

### eligibility271HeaderAbsent()

> **eligibility271HeaderAbsent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_271_HEADER_ABSENT` warning. Raised by `get271Eligibility` when
the transaction set carries no BHT, which 005010X279A1 requires after the ST
of every 271. Nothing stands in for it on the reading.

The reader anchors it at the ST (`segmentIndex: 0`), because an absent
segment has no position of its own. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { eligibility271HeaderAbsent } from "@cosyte/x12";
const w = eligibility271HeaderAbsent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_271_HEADER_ABSENT"
```

***

### entitySegmentDiscardedAfterLx()

> **entitySegmentDiscardedAfterLx**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` warning. Emitted by
the 837 helper for an `N3` / `N4` / `PER` / `REF` that reached no party
because an earlier `LX` with no `CLM` open closed the entity loop that was
current at it. `position` names the discarded segment itself, not the `LX`:
the loss is per segment (two `N3`s are two losses), and the segment is the
one thing a consumer needs to resolve back through `tx.segments`.

It is the narrow companion to [serviceLineDropped](#servicelinedropped), which is raised at
that same `LX` and reports the SERVICE LINE. Neither reports what the other
does, and both can be on one transaction's channel.

**Read its bound literally: this is not a general "unattached entity
segment" code.** It fires only after such an `LX` and only while nothing has
opened a new loop since, so an `N3` / `N4` / `PER` / `REF` that reaches no
party by any other route stays silent, exactly as it did before this code
existed. Widening it is a guard change and would be its own decision.

It reports that the segment reached no party, NOT that it would have reached
one: this reader surfaces neither a `PER` on a patient nor one on a pay-to
address, on any release.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { entitySegmentDiscardedAfterLx } from "@cosyte/x12";
const w = entitySegmentDiscardedAfterLx({ segmentIndex: 8, transactionIndex: 0 });
```

***

### escapeRelease()

> **escapeRelease**(`value`, `delimiters`): `string`

Apply X12 release-character escapes to a value so it can be emitted
inside a segment without ambiguity. Every occurrence of the four
delimiters (or the release character itself) is preceded by `?`; other
bytes pass through verbatim. The companion to [unescapeRelease](#unescaperelease).

**Throws `TypeError` on a non-string, and the previous behaviour was the
defect.** This function is declared over `string`, but a JavaScript or
JSON-driven caller is not held to that. Reading `value.length` gave three
different wrong answers depending on what arrived: a `number`, a `boolean`
or a plain object has no `.length`, so `undefined === 0` was false, `i <
undefined` was false, and the function **returned the empty accumulator** -
the value vanished with no error and no warning; `null` and `undefined` threw
on the property read; an array or an array-like threw on `charAt`. The silent
one was by far the worst: `build835` emitted `CLP**1*500.00*…` with
`warnings.length === 0`, dropping the CLP-01 reassociation key TR3
005010X221A1 requires. All three now terminate the same way.

`TypeError` and not a code-tagged library error is deliberate, and it is not
the untyped-refusal defect this package has fixed elsewhere. This is a pure
text utility with no spec, no element and no caller context to name, so
`TypeError` is the accurate answer for a wrong-typed argument. **Nothing
inside this library can reach it**: every builder routes its elements
through `src/builder/caller-string.ts`, which refuses first with the calling
builder's own typed, code-tagged error. (No count: it is asserted by
`test/builder-string-type.test.ts` and was stale here.) This throw is the backstop for a
consumer calling the export directly, where the alternative was silent data
loss.

#### Parameters

##### value

`string`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

`string`

#### Throws

TypeError if `value` is not a string

#### Example

```ts
import { escapeRelease } from "@cosyte/x12";
const d = { element: "*", repetition: "^", component: ":", segment: "~" };
escapeRelease("ab~cd*ef:gh", d); // "ab?~cd?*ef?:gh"
escapeRelease("a?b", d);          // "a??b"
escapeRelease(1 as unknown as string, d); // TypeError (was "")
```

***

### get270Inquiry()

> **get270Inquiry**(`delimiters`, `tx`): [`X12Inquiry`](#x12inquiry) \| `undefined`

Extract the typed [X12Inquiry](#x12inquiry) from one 270 transaction set. Pure
function: no I/O, no global state, never throws. Returns `undefined` when
the transaction set's ST-01 is not `"270"` (a mis-routed call), and when it
declares (ST-03, else GS-08) a guide this reader does not implement, such as
the 4010 `004010X092A1` - the same refusal shape `get271Eligibility`,
`get835`, `get820Payments` and every other per-transaction reader in this
package uses. Every other deviation is recoverable and surfaces on
`result.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12Inquiry`](#x12inquiry) \| `undefined`

#### Example

```ts
import { parseX12, get270Inquiry } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "270") continue;
    const inquiry = get270Inquiry(ix.delimiters, tx);
    const sub = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];
    sub?.traces[0]?.referenceId;                   // trace to reassociate on
    sub?.inquiries[0]?.serviceTypeCodes[0]?.code;  // "30"
  }
}
```

***

### get271Eligibility()

> **get271Eligibility**(`delimiters`, `tx`): [`X12Eligibility`](#x12eligibility) \| `undefined`

Extract a typed [X12Eligibility](#x12eligibility) from a 271 transaction set. Pure
function - no I/O, no global state. Returns `undefined` when the input
transaction's ST-01 is not `"271"` (mis-routed call), and when it declares
(ST-03, else GS-08) a guide this reader does not implement, such as the
4010 `004010X092A1`: its values would be read off 005010 element positions.
Every other deviation is recoverable and surfaces on `result.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12Eligibility`](#x12eligibility) \| `undefined`

#### Example

```ts
import { parseX12, get271Eligibility } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "271") continue;
    const elig = get271Eligibility(ix.delimiters, tx);
    for (const sub of elig?.subscribers ?? []) {
      sub.traces[0]?.referenceId;        // echoed 270 trace number
      sub.benefits[0]?.eligibilityCode;  // "1" (Active Coverage)
    }
  }
}
```

***

### get275Attachments()

> **get275Attachments**(`delimiters`, `tx`): [`X12AttachmentSubmission`](#x12attachmentsubmission) \| `undefined`

Read a 275. Returns `undefined` only when ST-01 is not `275`; every other
deviation is read leniently and surfaces on `warnings`, never as a throw.
Pure: no I/O, no global state, and the transaction set is not modified.

Pass the interchange to `parseX12` as a `Buffer` where the attachments hold
octets above 0x7F: a `Buffer` is read one character per octet, so every
count is exact.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12AttachmentSubmission`](#x12attachmentsubmission) \| `undefined`

#### Example

```ts
import { parseX12, get275Attachments } from "@cosyte/x12";
const ix = parseX12(buffer);
for (const tx of ix.groups[0]?.transactions ?? []) {
  const reading = get275Attachments(ix.delimiters, tx);
  for (const attachment of reading?.attachments ?? []) {
    if (!attachment.lengthVerified) continue; // a framing warning names why
    const octets = attachment.data.readOctets(); // verbatim, still filtered
  }
}
```

***

### get276StatusInquiry()

> **get276StatusInquiry**(`delimiters`, `tx`): [`X12StatusInquiry`](#x12statusinquiry) \| `undefined`

Extract the typed [X12StatusInquiry](#x12statusinquiry) from one 276 transaction set. Pure
function: no I/O, no global state, never throws. Returns `undefined` when
the transaction set's ST-01 is not `"276"` (a mis-routed call), and when it
declares (ST-03, else GS-08) a guide this reader does not implement, such as
the 4010 `004010X093A1` - the same refusal shape `get277Status`,
`get270Inquiry` and every other per-transaction reader in this package uses.
Every other deviation is recoverable and surfaces on `result.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12StatusInquiry`](#x12statusinquiry) \| `undefined`

#### Example

```ts
import { parseX12, get276StatusInquiry } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "276") continue;
    const inquiry = get276StatusInquiry(ix.delimiters, tx);
    const sub =
      inquiry?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
    sub?.claims[0]?.trace?.referenceId;      // the trace a 277 echoes back
    sub?.claims[0]?.references[0]?.value;    // "PCN0001"
  }
}
```

***

### get277CADisposition()

> **get277CADisposition**(`delimiters`, `tx`): [`X12ClaimStatusResponse`](#x12claimstatusresponse) \| `undefined`

Extract a 277CA Claim Acknowledgment (`005010X214`). Returns `undefined`
unless the transaction is a 277 whose `ST-03` is `005010X214` - use
[get277Status](#get277status) for the general 277 Claim Status Response. The
returned model is the same [X12ClaimStatusResponse](#x12claimstatusresponse); the
`transactionType` is always `"claim-acknowledgment"`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12ClaimStatusResponse`](#x12claimstatusresponse) \| `undefined`

#### Example

```ts
import { parseX12, get277CADisposition } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
const ack = tx === undefined ? undefined : get277CADisposition(ix.delimiters, tx);
ack?.claims[0]?.statuses[0]?.statuses[0]?.categoryCode; // "A1" / "A2" / "A3"
```

***

### get277RequestForAdditionalInformation()

> **get277RequestForAdditionalInformation**(`delimiters`, `tx`): [`X12AdditionalInformationRequest`](#x12additionalinformationrequest) \| `undefined`

Read a 277 request for additional information. Returns `undefined` unless
ST-01 is `277` and the declared guide is `006020X313`; every other deviation
is read leniently and surfaces on `warnings`, never as a throw. Pure: no I/O,
no global state, and the transaction set is not modified.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12AdditionalInformationRequest`](#x12additionalinformationrequest) \| `undefined`

#### Example

```ts
import { parseX12, get277RequestForAdditionalInformation } from "@cosyte/x12";
const ix = parseX12(raw);
for (const tx of ix.groups[0]?.transactions ?? []) {
  const rfai = get277RequestForAdditionalInformation(ix.delimiters, tx);
  if (rfai === undefined) continue; // not a 006020X313 277
  for (const level of rfai.levels) {
    for (const request of level.requests) {
      request.traces[0]?.referenceId;
      request.statuses[0]?.codes[0]?.statusCode; // e.g. a LOINC code
    }
  }
}
```

***

### get277Status()

> **get277Status**(`delimiters`, `tx`): [`X12ClaimStatusResponse`](#x12claimstatusresponse) \| `undefined`

Extract a typed [X12ClaimStatusResponse](#x12claimstatusresponse) from a 277 / 277CA
transaction set. Pure function - no I/O, no global state. Returns
`undefined` when `ST-01` is not `"277"` (mis-routed call), and when the
transaction set declares a guide this reader does not implement; every
other deviation is recoverable and surfaces on `result.warnings`.

The declared guide (ST-03, or GS-08 where ST-03 is absent or empty) is
checked against the guides this reader implements, which are those of the
claim status and claim acknowledgment rows of `X12_TR3_CONFORMANCE`, and not
the request for additional information row. Where it is outside them (the
4010 `004010X093A1`, the 4010 277U `004010X070`, or `006020X313`, say) the
reader returns `undefined`, because the walk reads 005010 element positions.
Where nothing is declared the reading is still walked and returned, carries
`X12_GUIDE_NOT_DECLARED`, and its `transactionType` is
`"unrecognized-guide"`. Where the declaration names an implemented guide
only once trimmed and upper-cased (`005010X212` with a space either side,
or `005010x212`), the reading is walked and returned, carries
`X12_GUIDE_NOT_IMPLEMENTED`, and its `transactionType` is
`"unrecognized-guide"` too, as it was before readers refused anything.
Otherwise `transactionType` is derived from ST-03 as
framed: `"claim-acknowledgment"` where it reads `005010X214`, and
`"claim-status"` for every other implemented declaration.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12ClaimStatusResponse`](#x12claimstatusresponse) \| `undefined`

#### Example

```ts
import { parseX12, get277Status } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "277") continue;
    const status = get277Status(ix.delimiters, tx);
    for (const claim of status?.claims ?? []) {
      claim.traces[0]?.referenceId;                 // echoed 276 trace
      claim.statuses[0]?.statuses[0]?.statusCode;   // "20"
    }
  }
}
```

***

### get278Request()

> **get278Request**(`delimiters`, `tx`): [`X12ServicesReview`](#x12servicesreview) \| `undefined`

Extract a typed [X12ServicesReview](#x12servicesreview) from a 278 **request**
(`005010X217`). Pure function - no I/O. Returns `undefined` when the
transaction's ST-01 is not `"278"` (mis-routed call), and when it declares
(ST-03, else GS-08) a guide this reader does not implement, such as the
4010 `004010X094A1`: its values would be read off 005010 element positions.
Every other deviation is recoverable and surfaces on `result.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12ServicesReview`](#x12servicesreview) \| `undefined`

#### Example

```ts
import { parseX12, get278Request } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
if (tx !== undefined) {
  const req = get278Request(ix.delimiters, tx);
  req?.reviews[0]?.requestCategoryCode; // "HS"
  req?.reviews[0]?.diagnoses[0]?.code;  // "E1165"
}
```

***

### get278Response()

> **get278Response**(`delimiters`, `tx`): [`X12ServicesReview`](#x12servicesreview) \| `undefined`

Extract a typed [X12ServicesReview](#x12servicesreview) from a 278 **response**
(`005010X217`, the same guide as the request). Same lenient walk as
[get278Request](#get278request); the `HCR` decision under each event / service review
is the response's safety-critical addition. Returns `undefined` on a
mis-routed ST-01, and for a transaction set that declares a guide this
reader does not implement: `005010X216`, the 278 notification guide, or the
4010 `004010X094A1`, say.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12ServicesReview`](#x12servicesreview) \| `undefined`

#### Example

```ts
import { parseX12, get278Response } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
if (tx !== undefined) {
  const resp = get278Response(ix.delimiters, tx);
  resp?.reviews[0]?.decision?.actionCode;                 // "A1"
  resp?.reviews[0]?.decision?.reviewIdentificationNumber; // "AUTH123456"
}
```

***

### get820Payments()

> **get820Payments**(`delimiters`, `tx`): [`X12PremiumPayments`](#x12premiumpayments) \| `undefined`

Extract a typed [X12PremiumPayments](#x12premiumpayments) from an 820 transaction set.
Pure function - no I/O, no global state. Returns `undefined` when the
input transaction's ST-01 is not `"820"` (mis-routed call), and when it
declares (ST-03, else GS-08) a guide this reader does not implement, such
as the 4010 `004010X061A1`: its values would be read off 005010 element
positions. Every other deviation is recoverable and the verbatim segments
remain on `tx.segments`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12PremiumPayments`](#x12premiumpayments) \| `undefined`

#### Example

```ts
import { parseX12, get820Payments } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
if (tx !== undefined) {
  const prem = get820Payments(ix.delimiters, tx);
  prem?.payment.totalPremiumAmount?.toString();
  for (const r of prem?.remittances ?? []) {
    r.openItems[0]?.amountPaid?.toString();
  }
}
```

***

### get834Enrollments()

> **get834Enrollments**(`delimiters`, `tx`): `AsyncIterable`\<[`X12Enrollment`](#x12enrollment)\>

Stream the 834 member-level detail loops - one [X12Enrollment](#x12enrollment) per
`INS` segment. For a non-834 transaction, and for one declaring (ST-03,
else GS-08) a guide this reader does not implement, such as the 4010
`004010X095A1`, the iterable yields nothing.
Async-generator typed so the contract leaves room for a future
file→iterator streaming source; the v1 implementation iterates the
already-parsed `tx.segments` synchronously under the hood.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

`AsyncIterable`\<[`X12Enrollment`](#x12enrollment)\>

#### Example

```ts
import { parseX12, get834Enrollments } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
if (tx !== undefined) {
  for await (const member of get834Enrollments(ix.delimiters, tx)) {
    member.maintenanceTypeCode;      // "021"
    member.member?.idCode;           // verbatim member id
  }
}
```

***

### get834Header()

> **get834Header**(`delimiters`, `tx`): [`X12EnrollmentHeader`](#x12enrollmentheader) \| `undefined`

Extract the 834 header - BGN + sponsor (`N1*P5`) + payer (`N1*IN`).
Pure function. Returns `undefined` when the input transaction's ST-01 is
not `"834"` (mis-routed call), and when it declares (ST-03, else GS-08) a
guide this reader does not implement, such as the 4010 `004010X095A1`.
Stops collecting header parties at the first `INS` (member-level detail) -
those belong to the member stream.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12EnrollmentHeader`](#x12enrollmentheader) \| `undefined`

#### Example

```ts
import { parseX12, get834Header } from "@cosyte/x12";
const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
const header = tx === undefined ? undefined : get834Header(ix.delimiters, tx);
header?.sponsor?.name;
```

***

### get835()

> **get835**(`delimiters`, `tx`): [`X12Remittance`](#x12remittance) \| `undefined`

Extract a typed [X12Remittance](#x12remittance) from an 835 transaction set.
Pure function - no I/O, no global state. Returns `undefined` when the
input transaction's ST-01 is not `"835"` (mis-routed call), and when it
declares (ST-03, else GS-08) a guide this reader does not implement, such
as the 4010 `004010X091A1`: its values would be read off 005010 element
positions. Every other deviation is recoverable and surfaces on
`result.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

#### Returns

[`X12Remittance`](#x12remittance) \| `undefined`

#### Example

```ts
import { parseX12, get835 } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "835") continue;
    const remit = get835(ix.delimiters, tx);
    remit?.payment.totalActualPayment?.toString();
    for (const claim of remit?.claims ?? []) {
      claim.totalPaymentAmount?.toString();
    }
  }
}
```

***

### get837Claims()

> **get837Claims**(`delimiters`, `tx`, `opts?`): [`X12_837Submission`](#x12_837submission) \| `undefined`

Extract a typed [X12\_837Submission](#x12_837submission) from an 837 transaction set.
Pure function - no I/O, no global state. Returns `undefined` when the
input transaction's ST-01 is not `"837"` (mis-routed call), and when it
declares (ST-03, else GS-08) a guide this reader does not implement, such
as the 4010 `004010X098A1`: its values would be read off 005010 element
positions. Every other deviation is recoverable and surfaces on
`submission.warnings`.

#### Parameters

##### delimiters

[`Delimiters`](#delimiters)

##### tx

[`X12TransactionSet`](#x12transactionset)

##### opts?

###### type?

`"P"` \| `"I"` \| `"D"`

#### Returns

[`X12_837Submission`](#x12_837submission) \| `undefined`

#### Example

```ts
import { parseX12, get837Claims } from "@cosyte/x12";
const ix = parseX12(raw);
for (const group of ix.groups) {
  for (const tx of group.transactions) {
    if (tx.st.elements[1] !== "837") continue;
    const sub = get837Claims(ix.delimiters, tx);
    sub?.variant;                  // "P" / "I" / "D" / "unknown"
    for (const claim of sub?.claims ?? []) {
      claim.totalCharge?.toString();
      claim.diagnoses[0]?.codeSystem; // "ICD-10-CM"
    }
  }
}
```

***

### getAllSegmentValues()

> **getAllSegmentValues**(`segment`, `path`, `delimiters`, `emit?`): readonly `string`[]

Return every repetition / component matching the dot-path. For a path
with no `[N]` and no `-N` (e.g. `"03"`), returns every repetition's
decoded element text. For a path with `-N` and no `[N]`, returns each
repetition's Nth component. With both `[N]` and `-N` specified, returns
a single-element array (or empty if the path doesn't resolve). Every
returned string is post-`?`-unescape, except a BDS or BIN binary data
element, which comes back whole and verbatim exactly as
[getSegmentValue](#getsegmentvalue) returns it.

#### Parameters

##### segment

[`X12Segment`](#x12segment)

##### path

`string`

##### delimiters

[`Delimiters`](#delimiters)

##### emit?

(`w`) => `void`

#### Returns

readonly `string`[]

#### Example

```ts
import { decodeSegment, getAllSegmentValues } from "@cosyte/x12";
const d = { element: "*", repetition: "^", component: ":", segment: "~" };
const seg = decodeSegment(
  "HI*ABK:J45.50^ABF:I10",
  d,
  () => {},
  { segmentIndex: 0 },
);
getAllSegmentValues(seg, "01", d);   // ["ABK:J45.50", "ABF:I10"]
getAllSegmentValues(seg, "01-1", d); // ["ABK", "ABF"]
```

***

### getDefaultProfile()

> **getDefaultProfile**(): [`X12Profile`](#x12profile) \| `undefined`

Return the current default profile, or `undefined` if none is registered.

#### Returns

[`X12Profile`](#x12profile) \| `undefined`

#### Example

```ts
import { getDefaultProfile } from "@cosyte/x12";
const p = getDefaultProfile();
if (p !== undefined) console.log("default profile:", p.name);
```

***

### getSegmentValue()

> **getSegmentValue**(`segment`, `path`, `delimiters`, `emit?`): `string` \| `undefined`

Resolve a dot-path against a decoded [X12Segment](#x12segment) and return the
decoded leaf value (post-`?`-unescape) or `undefined` if the path does
not resolve (missing element, out-of-range repetition, out-of-range
component). Throws `TypeError` only when `path` itself is malformed.

Optional `emit` collects any dangling-release warnings discovered on the
read path; pass a no-op to silently decode.

**A BDS or BIN binary data element (`"03"` on a BDS, `"02"` on a BIN) is
returned verbatim**: no release-character unescape and no split on the
repetition or component separator, because every byte in it is data. Its
only repetition is `[0]` and its only component is `-1`; any other index
returns `undefined`. BDS-01's filter is not applied.

#### Parameters

##### segment

[`X12Segment`](#x12segment)

##### path

`string`

##### delimiters

[`Delimiters`](#delimiters)

##### emit?

(`w`) => `void`

#### Returns

`string` \| `undefined`

#### Example

```ts
import { decodeSegment, getSegmentValue } from "@cosyte/x12";
const d = { element: "*", repetition: "^", component: ":", segment: "~" };
const seg = decodeSegment(
  "HI*ABK:J45.50*ABF:I10",
  d,
  () => {},
  { segmentIndex: 0 },
);
getSegmentValue(seg, "01-1", d);    // "ABK"
getSegmentValue(seg, "01-2", d);    // "J45.50"
getSegmentValue(seg, "02-1", d);    // "ABF"
```

***

### groupCountMismatch()

> **groupCountMismatch**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_GROUP_COUNT_MISMATCH` warning. Emitted when IEA-01 does not
equal the actual number of GS..GE groups present in the interchange.
Trading partners use this to detect transmission truncation. Both numbers
stay on the model and neither is silently corrected.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { groupCountMismatch } from "@cosyte/x12";
const w = groupCountMismatch({ segmentIndex: 5, interchangeIndex: 0, elementIndex: 1 });
```

***

### guideNotDeclared()

> **guideNotDeclared**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_GUIDE_NOT_DECLARED` warning. Raised by a typed reader when a
transaction set declares no implementation guide at all: ST-03 is absent or
empty and GS-08 of the enclosing functional group is absent or empty too, or
no functional group header reached the transaction set (one assembled by
hand, say). A declaration of whitespace alone counts as empty: an ST-03 of
whitespace falls through to GS-08, and a GS-08 of whitespace declares
nothing.

The reading is still decoded and returned against the guide the reader
implements. Readers anchor it at the ST (`segmentIndex: 0`).

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { guideNotDeclared } from "@cosyte/x12";
const w = guideNotDeclared({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_GUIDE_NOT_DECLARED"
```

***

### guideNotImplemented()

> **guideNotImplemented**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_GUIDE_NOT_IMPLEMENTED` warning. Raised by the 275 and 999
readers when the implementation guide a transaction set declares is not one
that reader implements. The declaration is ST-03, decoded of any release
escape, or GS-08 of the enclosing functional group where ST-03 is absent,
empty or whitespace alone; the comparison is exact, and the guides a reader
implements are the ones its rows in `X12_TR3_CONFORMANCE` name. Every other
typed reader raises it only where the declaration, trimmed and upper-cased,
names a guide it implements (a padded or lower-cased 005010 guide, which it
still reads), and returns no reading where even that names none.

Where it is raised, the reading is still decoded and returned: this code
refuses, drops and re-decodes nothing. It takes a position and no value, so
the declared identifier never reaches the message; readers anchor it at the
ST (`segmentIndex: 0`) with no `elementIndex`, because the declaration may
have come from GS-08 rather than from an element of the ST.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { guideNotImplemented } from "@cosyte/x12";
const w = guideNotImplemented({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_GUIDE_NOT_IMPLEMENTED"
```

***

### hierarchyCycle()

> **hierarchyCycle**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_HIERARCHY_CYCLE` warning. Raised where the chain of
HL-02 parent pointers from the level at `position` returns to a level
already on that chain. Disjoint from [hlParentMismatch](#hlparentmismatch) by
construction: this one requires every pointer on the chain to name a level
that IS present, and that one reports a pointer that names none.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { hierarchyCycle } from "@cosyte/x12";
const w = hierarchyCycle({ segmentIndex: 5, transactionIndex: 0 });
```

***

### hlParentLevelInvalid()

> **hlParentLevelInvalid**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_HL_PARENT_LEVEL_INVALID` warning. Emitted when an HL's
level code (HL-03) is inconsistent with its declared parent's level code
per the TR3 (e.g. a `22` Subscriber claiming a `22` Subscriber as its
parent, where the parent must be `20` Information Source). Both level
codes stay verbatim on the model.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { hlParentLevelInvalid } from "@cosyte/x12";
const w = hlParentLevelInvalid({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
```

***

### hlParentMismatch()

> **hlParentMismatch**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_HL_PARENT_MISMATCH` warning. Emitted when an HL segment's
HL-02 (parent id) does not match any earlier-emitted HL-01 in the same
transaction. The walker NEVER silently re-numbers the hierarchy (HL
parent-pointer integrity is the safety primitive of the 837), so the
declared pointer stays verbatim on `hierarchy.parentHlId` and the warning
reports only that the pointer is dangling, and where.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { hlParentMismatch } from "@cosyte/x12";
const w = hlParentMismatch({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
```

***

### interSegmentLineBreak()

> **interSegmentLineBreak**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_INTER_SEGMENT_LINE_BREAK` warning. Raised by the 270
reader, once per 270 transaction set, where the document carries a run of CR
or LF bytes between segments. Same scoping as
[nonConventionalDelimiter](#nonconventionaldelimiter) and for the same reason: the shared parse
consumes such a run and is not changed here.

**CR and LF and nothing else, which is why the name says line break rather
than whitespace.** A space or a tab between segments is not consumed by the
shared parse: it is taken as the head of the next segment's identifier, so
the functional group never frames and there is no 270 to report on. Widening
that is a change to the shared parse, which this reader deliberately does not
make; the gap is recorded in `KNOWN-LIMITATIONS.md`.

The run is observable in the BYTES and not on the model, so only the entry
point that receives the bytes can raise it. `position` is the ISA, because
the framing is a property of the document rather than of one segment.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { interSegmentLineBreak } from "@cosyte/x12";
const w = interSegmentLineBreak({ segmentIndex: 0, interchangeIndex: 0 });
```

***

### isAcceptDisposition()

> **isAcceptDisposition**(`code`): `boolean`

True when the supplied disposition is some form of "accept" (`A`, `E`,
`P`) rather than reject (`R`, `M`, `W`, `X`). Used by the build-time
safety guard and by consumer code that wants a yes/no on the inbound.

#### Parameters

##### code

[`X12AckDispositionCode`](#x12ackdispositioncode)

#### Returns

`boolean`

#### Example

```ts
import { isAcceptDisposition } from "@cosyte/x12";
isAcceptDisposition("A"); // true
isAcceptDisposition("R"); // false
```

***

### isaExtraElementSeparator()

> **isaExtraElementSeparator**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_ISA_EXTRA_ELEMENT_SEPARATOR` warning. Emitted when the ISA
element area (bytes 0..104) splits on the detected element separator into
anything other than `["ISA", e1, …, e16]`.

`detectDelimiters` has already verified that the separator sits at all 16
fixed 005010 positions, so the split can only come out LONGER than 17: an
ISA element value is itself carrying the byte that was declared in-band as
the element separator. The interchange is not 005010-conformant either way,
and the parser does not choose between the two readings of that byte - it
reports that the header did not frame and leaves `isa.elements` exactly as
the split produced it, with `isa.raw` carrying all 106 bytes verbatim.

`decodeEnvelope` raises this ahead of every warning it raises after it,
because when it is present the ISA-derived diagnostics that follow
(`X12_PRE_005010` off `elements[12]`, `X12_CONTROL_NUMBER_MISMATCH` off
`elements[13]`) may be reading a displaced element rather than the one they
name. **That is a statement about `parseX12`'s `warnings` (and `onWarning`)
and about nothing else.** `serializeX12(ix, { specClean: true })` runs its own
reconciliation off `interchange.isa.elements[13]` with no arity awareness and
never raises this code, so on that channel a lone
`X12_CONTROL_NUMBER_MISMATCH` can be a displaced read - and its absence is not
evidence the header framed. Filed, not fixed here.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { isaExtraElementSeparator } from "@cosyte/x12";
const w = isaExtraElementSeparator({ segmentIndex: 0, interchangeIndex: 0 });
```

***

### isClaimAdjustmentGroupCode()

> **isClaimAdjustmentGroupCode**(`value`): `value is ClaimAdjustmentGroupCode`

Narrow an inbound CAS-01 string to a [ClaimAdjustmentGroupCode](#claimadjustmentgroupcode).
`false` means the inbound code is not one of the 4 spec-defined values
(e.g. a typo `"CR"` from a quirky payer); the verbatim value is still
preserved on the parsed model, and the consumer can branch on the
narrow result.

#### Parameters

##### value

`string`

#### Returns

`value is ClaimAdjustmentGroupCode`

#### Example

```ts
import { isClaimAdjustmentGroupCode } from "@cosyte/x12";
isClaimAdjustmentGroupCode("PR"); // true
isClaimAdjustmentGroupCode("CR"); // false (unknown)
```

***

### isDiagnosisQualifier()

> **isDiagnosisQualifier**(`qualifier`): `boolean`

Decide whether an HI qualifier represents a diagnosis (principal,
secondary, admitting, reason-for-visit, external-cause). Used by
variant-specific extractors that split the HI segment family into
diagnoses vs procedures.

#### Parameters

##### qualifier

`string`

#### Returns

`boolean`

#### Example

```ts
import { isDiagnosisQualifier } from "@cosyte/x12";
isDiagnosisQualifier("ABK"); // true (principal diagnosis)
isDiagnosisQualifier("BBR"); // false (procedure)
isDiagnosisQualifier("XYZ"); // false
```

***

### isProcedureQualifier()

> **isProcedureQualifier**(`qualifier`): `boolean`

Decide whether an HI qualifier represents a procedure (principal or
other) - current ICD-10-PCS or legacy ICD-9-PCS.

#### Parameters

##### qualifier

`string`

#### Returns

`boolean`

#### Example

```ts
import { isProcedureQualifier } from "@cosyte/x12";
isProcedureQualifier("BBR"); // true (other procedure, ICD-10-PCS)
isProcedureQualifier("ABK"); // false (diagnosis)
```

***

### levelDetached()

> **levelDetached**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_LEVEL_DETACHED` warning. Raised where a 270 hierarchical
level's declared parent pointer did not resolve to a level of the parent
kind the TR3 gives it, so the level and everything transmitted beneath it
is absent from the returned tree.

It reports the LOSS. The defect in the pointer itself is reported by its own
code at the same position, so a level named here always carries one of
[hlParentMismatch](#hlparentmismatch), [hlParentLevelInvalid](#hlparentlevelinvalid) or
[hierarchyCycle](#hierarchycycle) beside it.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { levelDetached } from "@cosyte/x12";
const w = levelDetached({ segmentIndex: 5, transactionIndex: 0 });
```

***

### missingGe()

> **missingGe**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_MISSING_GE` warning. Emitted when a GS opened a functional
group but no matching GE appeared before the next GS or IEA. The parser
returns the group with `ge: undefined` and the transactions it managed
to collect.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { missingGe } from "@cosyte/x12";
const w = missingGe({ segmentIndex: 3, interchangeIndex: 0, groupIndex: 0 });
```

***

### missingIea()

> **missingIea**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_MISSING_IEA` warning. Emitted when the input opened a
valid ISA but EOF arrived before any IEA segment. The parser returns the
groups it managed to decode with `iea: undefined`; the warning surfaces
the structural break so consumers know the interchange is truncated.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { missingIea } from "@cosyte/x12";
const w = missingIea({ segmentIndex: 4, interchangeIndex: 0 });
```

***

### missingRequiredLoop()

> **missingRequiredLoop**(`position`, `loop`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_MISSING_REQUIRED_LOOP` warning. Emitted when a TR3-required
loop is structurally absent (e.g. no Loop 2010BB Payer Name inside a
Subscriber HL). The parser does not enforce situational rules: only loops
marked `usage: "required"` in the loop spec fire this warning, so the
loop id and its rationale are both library constants.

#### Parameters

##### position

[`X12Position`](#x12position)

##### loop

[`X12RequiredLoop`](#x12requiredloop)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { missingRequiredLoop, REQUIRED_LOOPS } from "@cosyte/x12";
const w = missingRequiredLoop(
  { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
  REQUIRED_LOOPS.PAYER_NAME_2010BB,
);
```

***

### missingSe()

> **missingSe**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_MISSING_SE` warning. Emitted when an ST opened a
transaction set but no matching SE appeared before the next ST, GE, or
IEA. The parser returns the transaction with `se: undefined` and the
segments it managed to collect.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { missingSe } from "@cosyte/x12";
const w = missingSe({ segmentIndex: 2, groupIndex: 0, transactionIndex: 0 });
```

***

### nonConventionalDelimiter()

> **nonConventionalDelimiter**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_270_NON_CONVENTIONAL_DELIMITER` warning. Raised by the 270
reader, once per 270 transaction set, where the delimiter set the shared
interchange parse detected out of the ISA is not the conventional one.

**The 270 path raises it and shared code does not**, which is deliberate
rather than incidental. Both halves of the tolerance this code reports live
in the ENVELOPE, so the obvious place to detect them is the shared parse,
and raising it there would give every pre-existing non-270 fixture that
declares a non-conventional separator a warning it did not have. This reader
TAKES the detected set from that parse and reports its own tolerance of it
instead; nothing about delimiter handling in shared code moves.

`position` is the ISA, which is where the set is declared. No byte is
echoed and no role is named: `isa.raw` carries all 106 bytes.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { nonConventionalDelimiter } from "@cosyte/x12";
const w = nonConventionalDelimiter({ segmentIndex: 0, interchangeIndex: 0 });
```

***

### parse270Inquiries()

> **parse270Inquiries**(`raw`, `options?`): readonly [`X12Inquiry`](#x12inquiry)[]

Decode every 270 in a raw interchange, in transmitted order. Returns one
[X12Inquiry](#x12inquiry) per 270 transaction set, each with its own model and its
own warnings, and an EMPTY list when the interchange carries no 270 at all.
Two 270s are never merged into one model and the first is never returned in
place of the rest. A 270 declaring a guide this reader does not implement
(the 4010 `004010X092A1`, say) is left out of the list, as
[get270Inquiry](#get270inquiry) returns `undefined` for it.

This is also the entry point that reports an inter-segment line break
(`X12_270_INTER_SEGMENT_LINE_BREAK`): the shared parse consumes a run of CR
or LF before the next segment opens, so it is visible in the bytes and
nowhere on the model, and [get270Inquiry](#get270inquiry) is handed the model. A space
or a tab between segments is a different case: the shared parse does not
consume it, the group never frames, and this function answers the empty list
with the loss reported on the interchange's own warning channel.

A structural fatal from the shared parse (an input truncated before its ISA
is readable, say) is raised by that parse and passes through here
unchanged: it is deliberately NOT caught, downgraded or re-raised, because
the frame not parsing is a different fact from a 270 body being incomplete,
and the lenient guarantee of this reader begins where the frame ended.

#### Parameters

##### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`X12ParseOptions`](#x12parseoptions) = `{}`

#### Returns

readonly [`X12Inquiry`](#x12inquiry)[]

#### Example

```ts
import { parse270Inquiries } from "@cosyte/x12";
const inquiries = parse270Inquiries(rawBytes);
inquiries.length;                       // 0 when the interchange holds no 270
inquiries[0]?.informationSources.length;
```

***

### parse276StatusInquiries()

> **parse276StatusInquiries**(`raw`, `options?`): readonly [`X12StatusInquiry`](#x12statusinquiry)[]

Decode every 276 in a raw interchange, in transmitted order. Returns one
[X12StatusInquiry](#x12statusinquiry) per 276 transaction set, each with its own model and
its own warnings, and an EMPTY list when the interchange carries no 276 at
all. Two 276s are never merged into one model and the first is never returned
in place of the rest. A 276 declaring a guide this reader does not implement
(the 4010 `004010X093A1`, say) is left out of the list, as
[get276StatusInquiry](#get276statusinquiry) returns `undefined` for it.

**No warning is raised about an interchange that carries no 276.** An
interchange full of 277s is not a defective 276 and this reader says nothing
about it: the empty list IS the answer.

A structural fatal from the shared parse (an input truncated before its ISA
is readable, say) is raised by that parse and passes through here unchanged:
it is deliberately NOT caught, downgraded or re-raised, because the frame not
parsing is a different fact from a 276 body being incomplete, and the lenient
guarantee of this reader begins where the frame ended.

#### Parameters

##### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`X12ParseOptions`](#x12parseoptions) = `{}`

#### Returns

readonly [`X12StatusInquiry`](#x12statusinquiry)[]

#### Example

```ts
import { parse276StatusInquiries } from "@cosyte/x12";
const inquiries = parse276StatusInquiries(rawBytes);
inquiries.length;                       // 0 when the interchange holds no 276
inquiries[0]?.informationSources.length;
```

***

### parse997()

> **parse997**(`raw`, `options?`): [`X12Ack997`](#x12ack997) \| `undefined`

Decode a 997 Functional Acknowledgment from a raw `string` or `Buffer`.
Returns the typed [X12Ack997](#x12ack997) for the first 997 transaction set in
the input, or `undefined` when there is none. Lenient on parse: every
recoverable deviation is a warning (see [X12Ack997.warnings](#warnings-1)).

#### Parameters

##### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`X12ParseOptions`](#x12parseoptions) = `{}`

#### Returns

[`X12Ack997`](#x12ack997) \| `undefined`

#### Example

```ts
import { parse997 } from "@cosyte/x12";
const ack = parse997(rawBytes);
if (ack !== undefined) {
  ack.ak9?.disposition;                     // "A" | "E" | "P" | "R" | "M" | "W" | "X" | undefined
  ack.transactionResponses[0]?.ak5?.disposition;
}
```

***

### parse999()

> **parse999**(`raw`, `options?`): [`X12Ack999`](#x12ack999) \| `undefined`

Decode a 005010X231A1 Implementation Acknowledgment from a raw `string`
or `Buffer`. Returns the typed [X12Ack999](#x12ack999) or `undefined` when the
input does not contain any 999 transaction set. Lenient on parse: every
recoverable deviation surfaces as an envelope-level warning (see
[X12Ack999.warnings](#warnings-2)).

#### Parameters

##### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`X12ParseOptions`](#x12parseoptions) = `{}`

#### Returns

[`X12Ack999`](#x12ack999) \| `undefined`

#### Example

```ts
import { parse999 } from "@cosyte/x12";
const ack = parse999(rawBytes);
if (ack !== undefined) {
  ack.ak9.disposition;                    // "A" | "E" | "P" | "R" | "M" | "W" | "X"
  ack.transactionResponses[0]?.ik5.disposition;
}
```

***

### parseTA1()

> **parseTA1**(`interchange`): [`X12AckTA1`](#x12ackta1) \| `undefined`

Decode the first TA1 Interchange Acknowledgment on the supplied
`interchange`. Returns the typed [X12AckTA1](#x12ackta1) or `undefined` when
the interchange has no TA1 (the common case for non-ack inbounds).

#### Parameters

##### interchange

[`X12Interchange`](#x12interchange)

#### Returns

[`X12AckTA1`](#x12ackta1) \| `undefined`

#### Example

```ts
import { parseTA1, parseX12 } from "@cosyte/x12";
const ix = parseX12(rawAckBytes);
const ta1 = parseTA1(ix);
if (ta1?.ackCode === "R") {
  // inbound interchange was rejected
}
```

***

### parseX12()

#### Call Signature

> **parseX12**(`raw`): [`X12Interchange`](#x12interchange)

Parse a raw X12 healthcare interchange (string or `Buffer`) into an
[X12Interchange](#x12interchange). The parser is lenient by default: recoverable
deviations from 005010 are reported via `ix.warnings` and (optionally)
`options.onWarning`, never thrown. Four unrecoverable structural errors
throw [X12ParseError](#x12parseerror): `X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`,
`X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`. Opt into strict mode with
`{ strict: true }` to escalate every Tier-2 warning into an
`X12ParseError` carrying the warning's code. A strict-mode escalation
carries an empty `snippet`: the warning it wraps is registry-built and
fully located by `position`, so there is nothing to redact.

The envelope decode reads ISA / GS / ST / SE / GE / IEA and detects the
four delimiters from fixed ISA byte positions. Transaction-set bodies
inside each ST..SE are kept **opaque** there - `tx.segments` carries the
raw segment strings (terminator stripped). Segment decode adds
element/composite/repetition decode on top.

##### Parameters

###### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### Returns

[`X12Interchange`](#x12interchange)

##### Example

```ts
import { parseX12, WARNING_CODES } from "@cosyte/x12";

const raw = "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";
const ix = parseX12(raw);
ix.delimiters.element;    // "*"
ix.delimiters.component;  // ":"
ix.delimiters.segment;    // "~"
ix.groups[0]?.gs.elements[1]; // raw text of GS-01 (pre-?-unescape)
for (const w of ix.warnings) {
  if (w.code === WARNING_CODES.X12_PRE_005010) {
    // sender on pre-005010 version family
  }
}
```

#### Call Signature

> **parseX12**(`raw`, `options`): [`X12Interchange`](#x12interchange)

Parse a raw X12 healthcare interchange (string or `Buffer`) into an
[X12Interchange](#x12interchange). The parser is lenient by default: recoverable
deviations from 005010 are reported via `ix.warnings` and (optionally)
`options.onWarning`, never thrown. Four unrecoverable structural errors
throw [X12ParseError](#x12parseerror): `X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`,
`X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`. Opt into strict mode with
`{ strict: true }` to escalate every Tier-2 warning into an
`X12ParseError` carrying the warning's code. A strict-mode escalation
carries an empty `snippet`: the warning it wraps is registry-built and
fully located by `position`, so there is nothing to redact.

The envelope decode reads ISA / GS / ST / SE / GE / IEA and detects the
four delimiters from fixed ISA byte positions. Transaction-set bodies
inside each ST..SE are kept **opaque** there - `tx.segments` carries the
raw segment strings (terminator stripped). Segment decode adds
element/composite/repetition decode on top.

##### Parameters

###### raw

`string` \| `Buffer`\<`ArrayBufferLike`\>

###### options

[`X12ParseOptions`](#x12parseoptions)

##### Returns

[`X12Interchange`](#x12interchange)

##### Example

```ts
import { parseX12, WARNING_CODES } from "@cosyte/x12";

const raw = "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";
const ix = parseX12(raw);
ix.delimiters.element;    // "*"
ix.delimiters.component;  // ":"
ix.delimiters.segment;    // "~"
ix.groups[0]?.gs.elements[1]; // raw text of GS-01 (pre-?-unescape)
for (const w of ix.warnings) {
  if (w.code === WARNING_CODES.X12_PRE_005010) {
    // sender on pre-005010 version family
  }
}
```

***

### partitionWarnings()

> **partitionWarnings**(`warnings`, `profile`): [`X12WarningPartition`](#x12warningpartition)

Split a parse's warnings against a profile's expected-warning union. A
warning whose `code` is in the profile's `expectedWarnings` lands in
`expected`; everything else lands in `unexpected`. Order within each bucket
preserves the input order.

#### Parameters

##### warnings

readonly [`X12ParseWarning`](#x12parsewarning)[]

##### profile

[`X12Profile`](#x12profile)

#### Returns

[`X12WarningPartition`](#x12warningpartition)

#### Example

```ts
import { parseX12, partitionWarnings, profiles } from "@cosyte/x12";
const ix = parseX12(raw, { profile: profiles.availity });
const { expected, unexpected } = partitionWarnings(ix.warnings, profiles.availity);
if (unexpected.length > 0) flagForReview(unexpected);
```

***

### payToAddressRepeated()

> **payToAddressRepeated**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_PAY_TO_ADDRESS_REPEATED` warning. Emitted by the 837
helper at the second and each subsequent `NM1*87` within one Loop 2000A,
where the TR3s allow Loop 2010AB at most once. `position` names the
repeated `NM1*87` itself, which is the segment a consumer resolves back
through `tx.segments`; there is no `elementIndex`, because what is being
reported is a second occurrence of the segment rather than a defect in
any element of it.

Once per repeat, so two repeats in one Loop 2000A are two warnings. The
counter resets at the Loop 2000A `HL`, beside the pay-to slot it guards -
a first `NM1*87` under a later billing provider is a first, not a repeat.

It reports that the DOCUMENT named the pay-to address more than once. It
does NOT report that anything was mis-read, and it is not a service-line
or entity-segment code: nothing else on the channel says this, and this
says nothing about the other 837 codes' subjects.

**The rule the reader applies, because a consumer cannot infer it from a
one-slot model:** occurrences are never merged, the last occurrence that
states an address of its own wins, and an occurrence that states none does
not blank one that did. "States an address" means exactly what the emit
side would write a segment for - see `./address-segments.ts`, which both
sides share so they cannot drift.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { payToAddressRepeated } from "@cosyte/x12";
const w = payToAddressRepeated({ segmentIndex: 12, transactionIndex: 0 });
```

***

### pre005010()

> **pre005010**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_PRE_005010` warning. Emitted when the twelfth element of the
ISA split does not read `00501`, the HIPAA-mandated baseline interchange
control version number. The code name reads as a
"pre-005010" test and the guard is an inequality, so a LATER family
(`00602`, `00700`) raises it too. The parser still
accepts the input (Postel's Law: lenient on parse) but flags the
mismatch so consumers know the input may diverge from 005010 semantics.

The guard reads that element, so raising this code does NOT establish that
the header split into `ISA` plus 16 elements and does not assert what ISA-12
itself declares. Where `X12_ISA_EXTRA_ELEMENT_SEPARATOR` is also present the
element read may be a displaced one; `isa.raw` carries all 106 bytes and with
the ISA fixed widths is the route back.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { pre005010 } from "@cosyte/x12";
const w = pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 });
```

***

### readElementDecimal()

> **readElementDecimal**(`seg`, `n`, `delimiters`): [`X12DecimalRead`](#x12decimalread)

Read element N (1-indexed) as an [X12Decimal](#x12decimal) and say WHY when
there is no value. This is the chokepoint every decimal read in the
library goes through, and the only surface that distinguishes an element
the sender omitted from one this library could not decode.

Pure: it never warns and never throws. [elementDecimal](#elementdecimal) and
[elementDecimalOrZero](#elementdecimalorzero) wrap it and add the diagnostic.

#### Parameters

##### seg

[`X12Segment`](#x12segment)

##### n

`number`

##### delimiters

[`Delimiters`](#delimiters)

#### Returns

[`X12DecimalRead`](#x12decimalread)

#### Example

```ts
import { readElementDecimal } from "@cosyte/x12";
readElementDecimal(seg, 2, delim); // { value: undefined, status: "unparseable" }
```

***

### remitBalanceMismatch()

> **remitBalanceMismatch**(`position`, `invariant`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_835_REMIT_BALANCE_MISMATCH` warning. Emitted by the 835
helper when a TR3 X221A1 §1.10.2 balance invariant fails. `invariant`
names which equation broke; the spec'd, computed and delta amounts stay
on the model as "../decimal.js".X12Decimal values and are never
rendered into the message.

The parser ALWAYS surfaces this and NEVER silently rebalances. To report
the numbers, recompute them from the model: `claim.totalChargeAmount`,
`claim.totalPaymentAmount` and the CAS adjustments are all present.

#### Parameters

##### position

[`X12Position`](#x12position)

##### invariant

[`X12BalanceInvariant`](#x12balanceinvariant)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { remitBalanceMismatch, BALANCE_INVARIANTS } from "@cosyte/x12";
const w = remitBalanceMismatch(
  { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
  BALANCE_INVARIANTS.CLAIM,
);
```

***

### renderCallerValue()

> **renderCallerValue**(`value`): `string`

Render a caller-supplied value as a bounded, quoted fragment for a `build*`
refusal message. **This is the only sanctioned route a caller value takes
into a thrown message**, and `test/builder-refusal-bounds.test.ts` scans
`src/` for any other route - a twenty-fifth refusal site that interpolates a
value directly reds that test. That scan keys on `throw new *BuildError(` and
on template-literal holes, so it is a strong tripwire for the shape this
library uses rather than a proof over every shape one could write.

Returns the value quoted when it fits, and otherwise the first
[BUILD\_REFUSAL\_VALUE\_MAX\_LENGTH](#build_refusal_value_max_length) characters, an ellipsis, and the true
length - the length is the diagnostically useful part when the value is
over-long, since that is usually *why* the builder refused.

#### Parameters

##### value

`string` \| `number`

#### Returns

`string`

#### Example

```ts
import { renderCallerValue } from "@cosyte/x12";
renderCallerValue("000000001");        // '"000000001"'
renderCallerValue("9".repeat(120000)); // '"999…" (120000 characters)'
```

***

### resolveHiQualifier()

> **resolveHiQualifier**(`qualifier`): `HiQualifierEntry` \| `undefined`

Resolve an HI qualifier string into a HiQualifierEntry, or
`undefined` if the qualifier is outside the bundled snapshot. Unknown
qualifiers still parse - the parser preserves the verbatim qualifier on
the diagnosis/procedure and emits `X12_UNKNOWN_HI_QUALIFIER`. The lookup
is case-sensitive (TR3 qualifiers are uppercase).

#### Parameters

##### qualifier

`string`

#### Returns

`HiQualifierEntry` \| `undefined`

#### Example

```ts
import { resolveHiQualifier } from "@cosyte/x12";
resolveHiQualifier("ABK")?.system;     // "ICD-10-CM"
resolveHiQualifier("ABK")?.category;   // "principal-diagnosis"
resolveHiQualifier("XYZ");             // undefined
```

***

### rfaiHeaderAbsent()

> **rfaiHeaderAbsent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_277_RFAI_HEADER_ABSENT` warning. Raised by
`get277RequestForAdditionalInformation` when the transaction set carries no
BHT, so the reading's `header` is left undefined rather than filled in.

The reader anchors it at the ST (`segmentIndex: 0`), because an absent
segment has no position of its own. It takes a position and nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { rfaiHeaderAbsent } from "@cosyte/x12";
const w = rfaiHeaderAbsent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_277_RFAI_HEADER_ABSENT"
```

***

### rfaiLevelAbsent()

> **rfaiLevelAbsent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_277_RFAI_LEVEL_ABSENT` warning. Raised by
`get277RequestForAdditionalInformation` when the transaction set carries no
HL segment, so the reading's `levels` list is empty and no level is
synthesized.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position and
nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { rfaiLevelAbsent } from "@cosyte/x12";
const w = rfaiLevelAbsent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_277_RFAI_LEVEL_ABSENT"
```

***

### rfaiRequestAbsent()

> **rfaiRequestAbsent**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_277_RFAI_REQUEST_ABSENT` warning. Raised by
`get277RequestForAdditionalInformation` when no level on the reading carries
a claim-level request, so the reading names no claim and no requested item.

The reader anchors it at the ST (`segmentIndex: 0`). It takes a position and
nothing else.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { rfaiRequestAbsent } from "@cosyte/x12";
const w = rfaiRequestAbsent({ segmentIndex: 0, transactionIndex: 0 });
w.code; // "X12_277_RFAI_REQUEST_ABSENT"
```

***

### segmentCountMismatch()

> **segmentCountMismatch**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_SEGMENT_COUNT_MISMATCH` warning. Emitted by the spec-clean
serializer when an SE-01 value does not equal the actual number of
segments in the transaction set it closes (ST through SE inclusive).
Corrected counts are emitted only on `serializeX12(ix, { specClean: true,
recomputeCounts: true })`. The parser does not emit this code (it leaves
SE-01 reconciliation to the emit half); it is a serializer diagnostic.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { segmentCountMismatch } from "@cosyte/x12";
const w = segmentCountMismatch({ segmentIndex: 2, transactionIndex: 0, elementIndex: 1 });
```

***

### serializeX12()

> **serializeX12**(`interchange`, `opts?`): `string`

Serialize an [X12Interchange](#x12interchange) back to an X12 byte stream. Pure
function - never throws, never mutates the input, never performs I/O. See
the module header for the two emit modes.

#### Parameters

##### interchange

[`X12Interchange`](#x12interchange)

##### opts?

[`SerializeOptions`](#serializeoptions) = `{}`

#### Returns

`string`

#### Example

```ts
import { parseX12, serializeX12 } from "@cosyte/x12";
const ix = parseX12(raw);
// Segments on the model come back verbatim, orphans included. Anything the
// parser did not record (line breaks, a doubled terminator, ...) does not,
// so this is not guaranteed to equal `raw`. See the module header.
const bytes = serializeX12(ix);
```

***

### serviceLineDropped()

> **serviceLineDropped**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_SERVICE_LINE_DROPPED` warning. Emitted by the 837
helper when an LX opens no Loop 2400 at all, so the service line never
reaches any claim's `serviceLines`: either no CLM is open at that point
in the walk, or the submission's variant is not one of `P` / `I` / `D`
and there is no variant-specific line shape to build. That second cause
is reachable WITHOUT `X12_837_UNKNOWN_VARIANT`, because a caller-supplied
`opts.type` outside the union (from JavaScript or a JSON payload) is a
variant this reader never resolved and never warned about. Distinct from
[serviceLineNotDecoded](#servicelinenotdecoded), where the line IS retained and only its
service segment went unread. `position` names the LX itself - the same
anchor, for the same reason: it is the one segment present in every
case. Nothing is fabricated to stand in, and the segments stay verbatim
on the transaction set.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { serviceLineDropped } from "@cosyte/x12";
const w = serviceLineDropped({ segmentIndex: 7, transactionIndex: 0 });
```

***

### serviceLineNotDecoded()

> **serviceLineNotDecoded**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_SERVICE_LINE_NOT_DECODED` warning. Emitted by the 837
helper when a Loop 2400 service line is closed without ever having
decoded an SV1 / SV2 / SV3 for the resolved variant: either the line
carries no SVx at all, or it carries one belonging to a different 837
variant than ST-03 (or the caller's `type` option) named. The line is
still retained, and every segment stays verbatim on the transaction set,
but the line's `charge` and `units` are `undefined` rather than anything
read off the wire. Through `0.0.12` they were the accumulator's seeded
`X12Decimal.ZERO`, which a consumer could not tell from a charge of zero
the sender did state. `position` names the LX segment that opened the
line.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { serviceLineNotDecoded } from "@cosyte/x12";
const w = serviceLineNotDecoded({ segmentIndex: 9, transactionIndex: 0 });
```

***

### serviceSegmentRepeated()

> **serviceSegmentRepeated**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_SERVICE_SEGMENT_REPEATED` warning. Emitted by the 837
helper at the second and each subsequent `SV1` / `SV2` / `SV3` to arrive
inside one open Loop 2400. `position` names the repeated service segment
itself, which is the segment a consumer resolves back through
`tx.segments`; there is no `elementIndex`, because what is reported is a
second occurrence of the segment rather than a defect in any element of it.

Once per repeat, so three service segments in one Loop 2400 are two
warnings. The count lives on the line and is cleared when the line flushes,
so a first service segment under a later `LX` is a first and never a
repeat - a scope, not a latch.

**The rule the reader applies, because a consumer cannot infer it from a
one-slot model:** occurrences are never merged and the LAST one matching
the submission's resolved variant wins, writing every slot its kind writes.
So an earlier matching occurrence leaves nothing on the line, not even in a
slot the later one's own element is absent from - there the later one's
`undefined` replaces an amount the earlier one stated. Through `0.0.13` a
charge of `8500` and a CPT of `99213` were replaced by a repeat's `12` and
`99999` with `warnings: []`. An occurrence whose kind does NOT match the
resolved variant is read into nothing and overwrites nothing.

It reports that the DOCUMENT sent more than one, and asserts nothing about
what usage the TR3s give the segment. It does not decide which occurrence
the sender meant: this reader cannot tell a stray service segment from a
conformant one, exactly as [ambiguous837Variant](#ambiguous837variant) records for the
variant fallback.

Disjoint from [serviceSegmentWithoutLx](#servicesegmentwithoutlx) by construction - that one
fires only where no Loop 2400 is open and this one only where one is - so
the two can never name the same segment. Read that as disjointness only:
a service segment following an `LX` that opened no line is named by
NEITHER, because [serviceLineDropped](#servicelinedropped) at that `LX` already reports
the loss and suppresses the orphan code. [serviceLineNotDecoded](#servicelinenotdecoded) is
raised at the `LX` and reports that no matching service segment decoded
onto the line at all; a document can carry both codes on different
segments.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { serviceSegmentRepeated } from "@cosyte/x12";
const w = serviceSegmentRepeated({ segmentIndex: 9, transactionIndex: 0 });
```

***

### serviceSegmentWithoutLx()

> **serviceSegmentWithoutLx**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_SERVICE_SEGMENT_WITHOUT_LX` warning. Emitted by the 837
helper when an SV1 / SV2 / SV3 arrives with no Loop 2400 open, so there is
no service line to decode it into and nothing the segment carries is read.
`position` names the service segment itself, because it is the only
segment the case has: the other two 837 service-line codes both anchor at
an LX, and there is no LX in scope here to anchor to. An LX may still
appear elsewhere in the transaction - in an earlier claim, say - so read
the condition as "no line was open", not as "the file has no LX".

The three do not overlap on one segment. [serviceLineDropped](#servicelinedropped) is
raised at an LX that opened no line, [serviceLineNotDecoded](#servicelinenotdecoded) at an
LX whose line was retained undecoded, and this one only where no line is
open. Nothing is fabricated to stand in and no line or claim is
synthesized; the segments stay verbatim on the transaction set.

It says nothing about the submission's variant. A caller-supplied `type`
option wins first; absent one, and where ST-03 names no known
implementation convention, the reader falls back to the first
SV1 / SV2 / SV3 in the transaction, and a segment reported here is
eligible for that fallback like any other - pre-existing behaviour,
documented in `KNOWN-LIMITATIONS.md` and unchanged. Where that fallback
decided the variant and the body names more than one,
[ambiguous837Variant](#ambiguous837variant) reports the resolution as contested; it is
additive and does not change which documents reach this code.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { serviceSegmentWithoutLx } from "@cosyte/x12";
const w = serviceSegmentWithoutLx({ segmentIndex: 8, transactionIndex: 0 });
```

***

### setDefaultProfile()

> **setDefaultProfile**(`profile`): `void`

Register a process-scoped default profile. `parseX12(raw)` (no explicit
profile arg) consults `getDefaultProfile()` and attaches the returned
profile to the result. Pass `null` (or `undefined`) to clear.

Explicit args ALWAYS win - `parseX12(raw, { profile: myProfile })` uses
`myProfile` regardless of the default; `parseX12(raw, { profile: null })`
opts out of the default for a single call without changing the registered
default.

**Test hygiene:** the only mutable module-scoped state in the library.
Tests that call this MUST clean up in `afterEach` (`setDefaultProfile(null)`).

#### Parameters

##### profile

[`X12Profile`](#x12profile) \| `null`

#### Returns

`void`

#### Example

```ts
import { setDefaultProfile, getDefaultProfile, profiles, parseX12 } from "@cosyte/x12";
setDefaultProfile(profiles.availity);
const ix = parseX12(raw);
ix.profile?.name; // "availity"
setDefaultProfile(null); // clear (or in test teardown)
```

***

### statedAmountDiscarded()

> **statedAmountDiscarded**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_STATED_AMOUNT_DISCARDED` warning. Emitted where a segment
POPULATED its amount element, the loop that would carry its row was open,
and the reader built no row anyway - for a reason that is not a failure to
decode that amount. The money the sender wrote is on no part of the typed
model. **This code asserts nothing about whether that amount is decodable**:
route 2 below decoded it, route 1 never attempted the decode.

Two routes, enumerated because a count without its list cannot correct
itself:

1. An 820 `RMR` under an open remittance loop whose RMR-01 and RMR-02 are
   BOTH empty while RMR-04 or RMR-05 is populated. `decodeRmr` refuses the
   open item on identity before either amount element is read, so a stated
   payment, a stated amount due and the payment action code beside them are
   lost together.
2. An 837 `AMT` arriving while a Loop 2430 line adjudication (`SVD`) is
   open, whose AMT-02 decoded. The v1 adjudication model carries no amount
   row, so the row is skipped rather than attached to the service line,
   which is this reader's own line and not the other payer's.

`position` names the `RMR` / `AMT` segment itself and carries NO
`elementIndex`: on the first route the loss spans RMR-04 and RMR-05 and no
single element names it, and on the second the element is fixed by the
segment.

Read the bound as a property of the READ. This does NOT report an `AMT` or
`ADX` that reaches a reader with no loop open to carry its row at all: the
834's `AMT` with no `HD` open, the 820's `ADX` with no remittance open, and
the 835's and the 837's `AMT` that decodes before any claim or service line
is open are all still silent, and recorded in `KNOWN-LIMITATIONS.md`. It is
additive: [unparseableDecimal](#unparseabledecimal) and [amountRowDropped](#amountrowdropped) fire on
exactly the documents they fired on before. On route 1 no
`X12_UNPARSEABLE_DECIMAL` accompanies this code even where the amount bytes
are unreadable, because that route never attempts the decode - so never read
an unaccompanied instance as evidence the bytes are postable. Read them off
the segment and decode them yourself.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statedAmountDiscarded } from "@cosyte/x12";
const w = statedAmountDiscarded({ segmentIndex: 9, transactionIndex: 0 });
```

***

### statusInquiryDateRowDropped()

> **statusInquiryDateRowDropped**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_276_DATE_ROW_DROPPED` warning. The 276's sibling of
[dateRowDropped](#daterowdropped), raised where a 276's DTP reached the reader short of
its qualifier (DTP-01) or its value (DTP-03), so no date row was built and
the whole segment, the format qualifier included, is absent from the typed
model.

A DTP is a RECORD and not a slot, which is why the loss is the row rather
than one element, and why it is reported at all.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statusInquiryDateRowDropped } from "@cosyte/x12";
const w = statusInquiryDateRowDropped({ segmentIndex: 9, transactionIndex: 0 });
```

***

### statusInquiryDuplicateHierarchyId()

> **statusInquiryDuplicateHierarchyId**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_276_DUPLICATE_HIERARCHY_ID` warning. The 276's sibling of
[duplicateHierarchyId](#duplicatehierarchyid), raised at the second and each subsequent HL in
a 276 transaction set to carry an HL-01 an earlier one already carried.

A sibling rather than a widening of the 270's code, and for the reason the
builder error classes are siblings too: a consumer narrowing on
`X12_270_DUPLICATE_HIERARCHY_ID` would start seeing claim-status requests on
a predicate they wrote for eligibility inquiries, which is a silent change to
a published surface. One code per direction, additions only.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statusInquiryDuplicateHierarchyId } from "@cosyte/x12";
const w = statusInquiryDuplicateHierarchyId({ segmentIndex: 7, transactionIndex: 0 });
```

***

### statusInquiryHierarchyCycle()

> **statusInquiryHierarchyCycle**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_276_HIERARCHY_CYCLE` warning. The 276's sibling of
[hierarchyCycle](#hierarchycycle), raised where the chain of HL-02 parent pointers from
the level at `position` returns to a level already on that chain. Disjoint
from [hlParentMismatch](#hlparentmismatch) by construction: this one requires every
pointer on the chain to name a level that IS present, and that one reports a
pointer that names none.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statusInquiryHierarchyCycle } from "@cosyte/x12";
const w = statusInquiryHierarchyCycle({ segmentIndex: 5, transactionIndex: 0 });
```

***

### statusInquiryLevelDetached()

> **statusInquiryLevelDetached**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_276_LEVEL_DETACHED` warning. The 276's sibling of
[levelDetached](#leveldetached), raised where a 276 hierarchical level's declared
parent pointer did not resolve to a level of the parent kind the TR3 gives
it, so the level and everything transmitted beneath it is absent from the
returned tree.

It reports the LOSS. The defect in the pointer itself is reported by its own
code at the same position, so a level named here always carries one of
[hlParentMismatch](#hlparentmismatch), [hlParentLevelInvalid](#hlparentlevelinvalid) or
[statusInquiryHierarchyCycle](#statusinquiryhierarchycycle) beside it.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statusInquiryLevelDetached } from "@cosyte/x12";
const w = statusInquiryLevelDetached({ segmentIndex: 5, transactionIndex: 0 });
```

***

### statusInquiryReferenceRowDropped()

> **statusInquiryReferenceRowDropped**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_276_REFERENCE_ROW_DROPPED` warning. Raised where a 276's REF
reached the reader short of its qualifier (REF-01) or its identifier
(REF-02), so no reference row was built and the whole segment, the
description included, is absent from the typed model.

A REF is a RECORD and not a slot for the same reason a DTP is: a qualifier
with no identifier states nothing that can be looked up, and an identifier
with no qualifier states nothing about WHAT was identified. Building half a
row from either would put a value on the model the sender did not state.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { statusInquiryReferenceRowDropped } from "@cosyte/x12";
const w = statusInquiryReferenceRowDropped({ segmentIndex: 9, transactionIndex: 0 });
```

***

### toDate()

> **toDate**(`value`, `options?`): `Date` \| `undefined`

An X12 date carrier as an absolute-instant `Date`, ONLY when the caller
states the zone.

No X12 date element this package decodes carries a UTC offset, so without
`options.assumeOffsetMinutes` there is no instant and the answer is
`undefined`. The host machine's timezone is never read and UTC is never
assumed. With an offset supplied, midnight on that calendar day in that zone
is returned: `0` yields UTC midnight and `-300` yields 05:00Z the same day.

The time is filled to midnight for INSTANT CONSTRUCTION ONLY. The carrier's
own precision is unchanged, and `toObject` and `toISO` on the same value
return exactly what they returned before. A four-digit year below 100 stays
that year: `0050` is year 50, never 1950. It never throws.

#### Parameters

##### value

[`X12DateValue`](#x12datevalue) \| `null` \| `undefined`

##### options?

[`ToDateOptions`](#todateoptions)

#### Returns

`Date` \| `undefined`

#### Example

```ts
import { toDate } from "@cosyte/x12";
const day = { formatQualifier: "D8", value: "20260601" };
toDate(day);                            // undefined: no zone was stated
toDate(day, { assumeOffsetMinutes: 0 });    // 2026-06-01T00:00:00.000Z
toDate(day, { assumeOffsetMinutes: -300 }); // 2026-06-01T05:00:00.000Z
```

***

### toISO()

> **toISO**(`value`): `string` \| `undefined`

An X12 date carrier as an ISO-8601 string truncated to the precision it
stated, or `undefined`.

A `D8` value renders `YYYY-MM-DD` and NOTHING is appended: the element stated
no UTC offset, so the string is deliberately zone-less and no `Z` is
fabricated. The digits are the sender's, verbatim, so a year below 100 keeps
its leading zeroes. It never throws.

#### Parameters

##### value

[`X12DateValue`](#x12datevalue) \| `null` \| `undefined`

#### Returns

`string` \| `undefined`

#### Example

```ts
import { toISO } from "@cosyte/x12";
toISO({ formatQualifier: "D8", value: "20260601" }); // "2026-06-01"
toISO({ formatQualifier: "D8", value: "00500101" }); // "0050-01-01"
toISO({ formatQualifier: "RD8", value: "20260601-20260605" }); // undefined
```

***

### toObject()

> **toObject**(`value`): [`DateParts`](#dateparts) \| `undefined`

The calendar components an X12 date carrier stated, or `undefined`.

Returns a frozen plain object holding exactly `year`, `month` and `day` for a
`D8` value; `month` is 1 to 12. There is no `qualifier`, `formatQualifier`,
`precision`, `raw` or `valid` key, and no key holding `undefined`. A range, an
unhandled or absent format qualifier, a value that does not match its
declared shape, a calendar-invalid day, `null` and `undefined` all answer
`undefined`. It never throws.

#### Parameters

##### value

[`X12DateValue`](#x12datevalue) \| `null` \| `undefined`

#### Returns

[`DateParts`](#dateparts) \| `undefined`

#### Example

```ts
import { toObject } from "@cosyte/x12";
toObject({ formatQualifier: "D8", value: "20260601" }); // { year: 2026, month: 6, day: 1 }
toObject({ formatQualifier: "D8", value: "20260230" }); // undefined (February 30 is not a day)
toObject({ formatQualifier: "RD8", value: "20260601-20260605" }); // undefined (a range)
```

***

### trailingGarbage()

> **trailingGarbage**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_TRAILING_GARBAGE` warning. Emitted when non-empty bytes
appear after the IEA segment terminator and any optional CRLF. The bytes
are preserved verbatim on "./types.js".X12Interchange.`trailingBytes` so consumers can inspect,
measure, or re-emit them. Common cause: a second interchange concatenated
into the same file (multi-ISA, out of v1 scope; only the first
interchange is decoded).

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { trailingGarbage } from "@cosyte/x12";
const w = trailingGarbage({ segmentIndex: 6, interchangeIndex: 0 });
```

***

### transactionCountMismatch()

> **transactionCountMismatch**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_TRANSACTION_COUNT_MISMATCH` warning. Emitted when GE-01
does not equal the actual number of ST..SE transaction sets present in
the group. Both numbers stay on the model.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { transactionCountMismatch } from "@cosyte/x12";
const w = transactionCountMismatch({ segmentIndex: 4, groupIndex: 0, elementIndex: 1 });
```

***

### unescapeRelease()

> **unescapeRelease**(`input`, `delimiters`, `emit`, `position`): `string`

Reverse a single X12 release-character escape sequence. Consumes `?` plus
its target byte when the target is one of the four detected delimiters or
another `?`; preserves the `?` verbatim when the target is anything else
(Postel's-Law tolerance - the spec leaves the `?A` case ambiguous and
preserving the bytes is the most defensible behavior).

Emits a single Tier-2 `X12_DANGLING_RELEASE_CHAR` warning when the input
ends with a bare `?` (no target byte to escape) - the bytes are preserved
verbatim so round-trip is still byte-exact.

#### Parameters

##### input

`string`

##### delimiters

[`Delimiters`](#delimiters)

##### emit

(`w`) => `void`

##### position

[`X12Position`](#x12position)

#### Returns

`string`

#### Example

```ts
import { unescapeRelease } from "@cosyte/x12";
const d = { element: "*", repetition: "^", component: ":", segment: "~" };
unescapeRelease("a?~b", d, () => {}, { segmentIndex: 0 }); // "a~b"
unescapeRelease("a??b", d, () => {}, { segmentIndex: 0 }); // "a?b"
unescapeRelease("a?Xb", d, () => {}, { segmentIndex: 0 }); // "a?Xb" (preserved)
```

***

### unexpectedSegment()

> **unexpectedSegment**(`position`, `context`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNEXPECTED_SEGMENT` warning. Emitted when a structurally
meaningful segment (`GE`, `SE`, `ST`, `TA1`, or a body segment) appears
outside its expected parent. The parser preserves lenient-never-throw and
continues; `context` names which structural rule broke and `position`
locates the segment.

The segment's own id is deliberately not a parameter. Note that a segment
in one of these positions is NOT retained on the model at all (it has no
open container to belong to), so `position.segmentIndex` against the input
is the only way back to its bytes. For a segment that IS retained, the
`X12Segment.id` a consumer reads is bounded to the X12 segment-id grammar
(see "./segment.js".decodeSegment) while `seg.raw` and
`seg.elements[0]` stay verbatim.

#### Parameters

##### position

[`X12Position`](#x12position)

##### context

[`X12UnexpectedSegmentContext`](#x12unexpectedsegmentcontext)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unexpectedSegment, UNEXPECTED_SEGMENT_CONTEXTS } from "@cosyte/x12";
const w = unexpectedSegment(
  { segmentIndex: 12, interchangeIndex: 0 },
  UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS,
);
```

***

### unknown837Variant()

> **unknown837Variant**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_837_UNKNOWN_VARIANT` warning. Emitted when the 837 helper
cannot resolve the variant from ST-03's implementation-convention
reference AND no SVx service-line segment is present to fall back on.
The parsed submission still ships with `variant: "unknown"`, and the
walker does its best on shared structure (envelope, HL, claim header) and
skips variant-specific service-line decoding. **This message deliberately
points at no model field.** Recognition reads `ST-03` as FRAMED while
`submission.implementationConventionReference` is decoded of any `?` release
escape, so on a document that escapes a delimiter inside `ST-03` the two
differ and the model field can hold an identifier this code just said was
not recognised. A pointer stood here and
in the message text and is DELETED, not reworded.

`get837Claims` anchors this at the **ST**, which is `tx.segments[0]` and
carries the ST-03 the resolution reads. Through `0.0.10` it passed
`segmentIndex: 1`, which is the BHT and has no part in resolving a variant.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknown837Variant } from "@cosyte/x12";
const w = unknown837Variant({ segmentIndex: 0, groupIndex: 0, transactionIndex: 0 });
```

***

### unknownCarc()

> **unknownCarc**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNKNOWN_CARC` warning. Emitted when a CAS adjustment
carries a CARC code outside the bundled snapshot (see
"../code-lists/carc.js".CARC). The verbatim code is preserved on
the parsed adjustment (`adjustment.reasonCode`); only the description is
missing.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownCarc } from "@cosyte/x12";
const w = unknownCarc({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
```

***

### unknownClaimStatus()

> **unknownClaimStatus**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNKNOWN_CLAIM_STATUS` warning. Companion to
[unknownClaimStatusCategory](#unknownclaimstatuscategory) for the Claim Status Code (CSC, the
second component of an STC composite; X12 code source 508). Same
verbatim-preserve posture.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownClaimStatus } from "@cosyte/x12";
const w = unknownClaimStatus({ segmentIndex: 18, transactionIndex: 0 });
```

***

### unknownClaimStatusCategory()

> **unknownClaimStatusCategory**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` warning. Emitted by the 277
/ 277CA helpers when an STC composite's Claim Status Category Code
(CSCC, first component; X12 code source 507) is outside the bundled
snapshot. The verbatim CSCC is preserved on the parsed status; only the
description is missing.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownClaimStatusCategory } from "@cosyte/x12";
const w = unknownClaimStatusCategory({ segmentIndex: 18, transactionIndex: 0 });
```

***

### unknownHiQualifier()

> **unknownHiQualifier**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNKNOWN_HI_QUALIFIER` warning. Emitted by the 837 / 278
helpers when an HI composite's qualifier (first component) is outside the
bundled snapshot at "../code-lists/hi-qualifiers.js". HI\_QUALIFIERS. The verbatim qualifier and code are preserved on the
parsed diagnosis / procedure with `codeSystem: "unknown"` so consumers
can still react.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownHiQualifier } from "@cosyte/x12";
const w = unknownHiQualifier({ segmentIndex: 25, groupIndex: 0, transactionIndex: 0 });
```

***

### unknownMaintenanceType()

> **unknownMaintenanceType**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning. Emitted by the 834
helper when a member-level `INS-03` (or a health-coverage `HD-01`)
maintenance type code falls outside the bundled snapshot (see
"../code-lists/maintenance-type.js".MAINTENANCE\_TYPE\_CODES).
Maintenance type is the 834's safety-critical field: an unknown action
code must NEVER be silently coerced to add / change / terminate, so the
verbatim code is preserved on the parsed enrollment and this warning
flags the gap.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownMaintenanceType } from "@cosyte/x12";
const w = unknownMaintenanceType({ segmentIndex: 9, transactionIndex: 0 });
```

***

### unknownRarc()

> **unknownRarc**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNKNOWN_RARC` warning. Companion to [unknownCarc](#unknowncarc)
for RARC codes on `MIA` / `MOA` / `LQ` / `NTE`. Same verbatim-preserve
posture; the code lives on the parsed remark.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unknownRarc } from "@cosyte/x12";
const w = unknownRarc({ segmentIndex: 16, groupIndex: 0, transactionIndex: 0 });
```

***

### unparseableDecimal()

> **unparseableDecimal**(`position`): [`X12ParseWarning`](#x12parsewarning)

Build an `X12_UNPARSEABLE_DECIMAL` warning. Emitted whenever an element
read as a decimal held bytes that are NOT empty and do not match the shape
"../decimal.js".X12Decimal decodes, `[+-]?digits(.digits?)?` - a
thousands separator, a currency symbol, `N/A`, two decimal points, a
trailing sign, and so on. That shape is what this library reads, stated as
such: no clause of X12.6 is cited for it here, so do not read the code as
an assertion about what type R does and does not permit.

The warning is a property of the READ, not of what the caller does with
the result: it fires whether the decoded slot ends up on the model, is
discarded, or is replaced by a stand-in. That is what makes it countable
against the input rather than against the walker's control flow.

`position.elementIndex` is the 1-indexed element that failed, so a
consumer can go read the verbatim bytes off the segment. The message
takes NO discriminant and deliberately does not name what landed in the
slot instead: this library's own readers now either leave the slot
`undefined` or drop the row entirely, and a reader built on
"./segment.js".elementDecimalOrZero still substitutes
`X12Decimal.ZERO`. The one thing true of all of them is that whatever
occupies that slot is not the sender's. Read the model field itself to
see which happened.

#### Parameters

##### position

[`X12Position`](#x12position)

#### Returns

[`X12ParseWarning`](#x12parsewarning)

#### Example

```ts
import { unparseableDecimal } from "@cosyte/x12";
const w = unparseableDecimal({ segmentIndex: 3, transactionIndex: 0, elementIndex: 2 });
```
