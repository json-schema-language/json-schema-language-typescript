# json-schema-language [![npm](https://img.shields.io/npm/v/@json-schema-language/json-schema-language.svg)](https://www.npmjs.com/package/@json-schema-language/json-schema-language)

This crate is a TypeScript / JavaScript / Node.js implementation of **JSON
Schema Language**. You can use it to:

1. Validate input data is valid against a schema,
2. Get a list of validation errors with that input data, or
3. Build your own custom tooling on top of JSON Schema Language.

## About JSON Schema Language

**JSON Schema Language ("JSL")** lets you define schemas for JSON data, or data
that's equivalent to JSON (such a subset of YAML, CBOR, BSON, etc.). Using those
schemas, you can:

1. Validate that inputted JSON data is correctly formatted
2. Document what kind of data you expect to recieve or produce
3. Generate code, documentation, or user interfaces automatically
4. Generate interoperable, detailed validation errors

JSON Schema Language is designed to make JSON more productive. For that reason,
it's super lightweight and easy to implement. It's designed to be intuitive and
easy to extend for your custom use-cases.

For more information, see: <https://json-schema-language.github.io>.

## Usage

Here's how you can use this package to validate inputted data:

```typescript
import {
  compileSchema,
  Validator,
} from "@json-schema-language/json-schema-language";

// compileSchema does basic validation on your schema, to make sure it's sane.
// Plus, if you're using TypeScript, it will give you basic typechecking.
const schema = compileSchema({
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    phones: {
      elements: {
        type: "string",
      },
    },
  },
});

// Once you've registered all your schemas, you can efficiently validate as many
// inputs as desired.
const validator = new Validator();

// Validator.validate returns an array of validation errors. By default, all
// errors are returned, but you can also configure Validator to limit how many
// errors it produces.
const errorsOk = validator.validate({
  name: "John Doe",
  age: 43,
  phones: ["+44 1234567", "+44 2345678"],
});

// We're not expecting any errors here.
console.log(errorsOk); // []

// Each returned error holds paths to the bad part of the input, as well as the
// part of the schema which rejected it.
const errorsBad = validator.validate({
  age: "43",
  phones: ["+44 1234567", 442345678],
});

// "name" is required
console.log(errorsBad[0].instancePath.toString()); // ""
console.log(errorsBad[0].schemaPath.toString()); // "/properties/name"

// "age" has the wrong type
console.log(errorsBad[1].instancePath.toString()); // "/age"
console.log(errorsBad[1].schemaPath.toString()); // "/properties/age/type"

// "phones[1]" has the wrong type
console.log(errorsBad[2].instancePath.toString()); // "/phones/1"
console.log(errorsBad[2].schemaPath.toString()); // "/properties/phones/elements/type"
```

In the example above, those errors are standardized; every implementation of JSL
would have produced the exact same errors, so you can reliably transmit these
errors to any other system that uses JSL.
