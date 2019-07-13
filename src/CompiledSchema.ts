import InvalidFormError from "./InvalidForm";
import Schema from "./Schema";

/**
 * CompiledSchema is a type-safe representation of valid JSL schemas.
 *
 * Whereas the `Schema` interface is useful if you merely need data to be
 * schema-like, if you want to ensure that a schema is semantically valid, and
 * you want to take advantage of that validity in a type-safe way, you should
 * use `CompiledSchema` instead.
 *
 * Construct instances of `CompiledSchema` from `Schema` using `compileSchema`.
 */
export default interface CompiledSchema {
  form: Form;

  // Present if and only if the schema is a root schema.
  definitions?: { [name: string]: CompiledSchema };
}

export interface RootData {
  definitions: { [name: string]: CompiledSchema };
}

export type Form =
  | EmptyForm
  | RefForm
  | TypeForm
  | EnumForm
  | ElementsForm
  | PropertiesForm
  | ValuesForm
  | DiscriminatorForm;

export interface EmptyForm {
  form: "empty";
}

export interface RefForm {
  form: "ref";
  ref: string;
}

export interface TypeForm {
  form: "type";
  type:
    | "boolean"
    | "number"
    | "float32"
    | "float64"
    | "int8"
    | "uint8"
    | "int16"
    | "uint16"
    | "int32"
    | "uint32"
    | "int64"
    | "uint64"
    | "string"
    | "timestamp";
}

export interface EnumForm {
  form: "enum";
  values: string[];
}

export interface ElementsForm {
  form: "elements";
  schema: CompiledSchema;
}

export interface PropertiesForm {
  form: "properties";
  hasProperties: boolean;
  required: { [name: string]: CompiledSchema };
  optional: { [name: string]: CompiledSchema };
}

export interface ValuesForm {
  form: "values";
  schema: CompiledSchema;
}

export interface DiscriminatorForm {
  form: "discriminator";
  tag: string;
  mapping: { [name: string]: CompiledSchema };
}

export function compileSchema(schema: Schema): CompiledSchema {
  const compiled = compileSchemaInternal(schema);

  // Build up definitions manually here. This is only done for root schemas.
  compiled.definitions = {};
  for (const [name, subSchema] of Object.entries(schema.definitions || {})) {
    compiled.definitions[name] = compileSchemaInternal(subSchema);
  }

  // Ensure all references actually resolve. Throws if any references aren't ok.
  checkRefs(compiled, compiled);

  return compiled;
}

function compileSchemaInternal(schema: Schema): CompiledSchema {
  let form: Form = { form: "empty" };

  if (schema.ref !== undefined) {
    form = { form: "ref", ref: schema.ref };
  }

  if (schema.type !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    if (
      schema.type === "boolean" ||
      schema.type === "number" ||
      schema.type === "float32" ||
      schema.type === "float64" ||
      schema.type === "int8" ||
      schema.type === "uint8" ||
      schema.type === "int16" ||
      schema.type === "uint16" ||
      schema.type === "int32" ||
      schema.type === "uint32" ||
      schema.type === "int64" ||
      schema.type === "uint64" ||
      schema.type === "string" ||
      schema.type === "timestamp"
    ) {
      form = { form: "type", type: schema.type };
    } else {
      throw new InvalidFormError();
    }
  }

  if (schema.enum !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    form = { form: "enum", values: schema.enum };
  }

  if (schema.elements !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    form = {
      form: "elements",
      schema: compileSchemaInternal(schema.elements),
    };
  }

  if (
    schema.properties !== undefined ||
    schema.optionalProperties !== undefined
  ) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    const required: { [name: string]: CompiledSchema } = {};
    for (const [name, subSchema] of Object.entries(schema.properties || {})) {
      required[name] = compileSchemaInternal(subSchema);
    }

    const optional: { [name: string]: CompiledSchema } = {};
    for (const [name, subSchema] of Object.entries(
      schema.optionalProperties || {},
    )) {
      if (required.hasOwnProperty(name)) {
        throw new InvalidFormError();
      }

      optional[name] = compileSchemaInternal(subSchema);
    }

    form = {
      form: "properties",
      hasProperties: schema.properties !== undefined,
      required,
      optional,
    };
  }

  if (schema.values !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    form = {
      form: "values",
      schema: compileSchemaInternal(schema.values),
    };
  }

  if (schema.discriminator !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    const mapping: { [name: string]: CompiledSchema } = {};
    for (const [name, subSchema] of Object.entries(
      schema.discriminator.mapping,
    )) {
      const compiled = compileSchemaInternal(subSchema);
      if (compiled.form.form === "properties") {
        for (const property of Object.keys(compiled.form.required)) {
          if (property === schema.discriminator.tag) {
            throw new InvalidFormError();
          }
        }

        for (const property of Object.keys(compiled.form.optional)) {
          if (property === schema.discriminator.tag) {
            throw new InvalidFormError();
          }
        }
      } else {
        throw new InvalidFormError();
      }

      mapping[name] = compiled;
    }

    form = { form: "discriminator", tag: schema.discriminator.tag, mapping };
  }

  return { form };
}

function checkRefs(root: CompiledSchema, schema: CompiledSchema): void {
  switch (schema.form.form) {
    case "ref":
      if (!(schema.form.ref in root.definitions!)) {
        throw new InvalidFormError();
      }

      return;
    case "elements":
      checkRefs(root, schema.form.schema);
      return;
    case "properties":
      for (const subSchema of Object.values(schema.form.required)) {
        checkRefs(root, subSchema);
      }

      for (const subSchema of Object.values(schema.form.optional)) {
        checkRefs(root, subSchema);
      }

      return;
    case "values":
      return checkRefs(root, schema.form.schema);
    case "discriminator":
      for (const subSchema of Object.values(schema.form.mapping)) {
        checkRefs(root, subSchema);
      }

      return;
  }
}
