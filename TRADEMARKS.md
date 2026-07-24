# Trademarks

`@cosyte/x12` is an independent open-source project. cosyte is **not affiliated with, endorsed by,
or sponsored by** any company named in this repository or its documentation.

## Why these names appear

Clearinghouses and payers publish companion guides that deviate from the base X12 implementation
guide. A profile records whose deviation it accommodates, which cannot be said without naming
them.

Every reference is **descriptive**: it identifies whose companion-guide deviation a profile accommodates, and nothing more. Naming a system is the only way to say
whether a library works with it.

## Where the profiles come from

The built-in profiles are authored through this package's own public `defineProfile()` API and are
grounded in **synthetic** fixtures written from scratch. No real payer or clearinghouse file was
used to produce them. They are descriptive only: selecting a profile never changes a correct
parse. They embed no privileged, confidential, or reverse-engineered material.

## Names referenced

| Name                          | Where it appears                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Availity                      | `profiles.availity`: a built-in profile name                                                  |
| Blue Cross Blue Shield (BCBS) | `profiles.bcbsCommon`: a built-in profile name, and descriptive use in documentation examples |

All product names, logos, and brands are the property of their respective owners. Use of a name here
does not imply any affiliation with, or endorsement by, its owner. If you own one of these marks and
would like a reference changed, please open an issue.
