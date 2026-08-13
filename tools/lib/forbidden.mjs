// The single place the private number's shape is written down. Every checker
// imports from here, so SELF is the only path the scan has to skip.
//
// The gap between digits is capped at two characters and restricted to real
// phone separators. An unbounded gap (\D*) is NOT usable here: across a long
// document those twelve digits occur in order by chance, and the pattern
// matches a span of arbitrary length. Measured on the plan file, \D* matched
// a 45-character stretch of ordinary prose.
const SEP = String.raw`[\s.()\- ]{0,2}`;
export const PHONE = new RegExp(
  ['9', '6', '6', '5', '1', '2', '3', '0', '2', '7', '2', '5'].join(SEP),
);
// Built the same way as PHONE and for the same reason: docs/implementation-plan.md
// quotes this file's source verbatim to document it, and a literal
// `Personal-Documents` substring right here would make that quotation match
// its own guard. Splitting the string keeps the source free of the substring
// while `VAULT` still matches it anywhere it appears in scanned text.
export const VAULT = new RegExp(['Personal', 'Documents'].join('-'));
export const SELF = 'tools/lib/forbidden.mjs';
