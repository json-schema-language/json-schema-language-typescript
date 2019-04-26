/**
 * Schema is an interface for representing JSL schemas.
 *
 * There are a couple rules about how schemas must be formatted that can't be
 * expressed with TypeScript's type system directly. Instead, see
 * `CompiledSchema`, which enforces the correctness of schemas, and provides a
 * type-safe way of taking advantage of this correctness.
 */
export default interface Schema {
  id?: string;
  definitions?: { [name: string]: Schema };
  ref?: string;
  type?: string;
  elements?: Schema;
  properties?: { [name: string]: Schema };
  optionalProperties?: { [name: string]: Schema };
  values?: Schema;
  discriminator?: { tag: string; mapping: { [name: string]: Schema } };
}
