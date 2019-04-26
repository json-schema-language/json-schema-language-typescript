import Schema from "./Schema";
import InvalidFormError from "./InvalidForm";

/**
 * CompiledSchema is a type-safe representation of valid JSL schemas.
 *
 * Whereas the `Schema` interface is useful if you merely need data to be
 * schema-like, if you want to ensure that a schema is semantically valid
 * according, and you want to take advantage of that validity in a type-safe
 * way, you should use `CompiledSchema` instead.
 *
 * Construct instances of `CompiledSchema` from `Schema` using
 */
export default interface CompiledSchema {
  root?: RootData;
  form: Form;
  extra: { [name: string]: CompiledSchema };
}

export function compileSchema(schema: Schema): CompiledSchema {
  const base = schema.id === undefined ? undefined : new URL(schema.id);
  return compileSchemaWithBase(base, true, schema);
}

function compileSchemaWithBase(
  base: URL | undefined,
  isRoot: boolean,
  schema: Schema,
): CompiledSchema {
  const root = isRoot ? compileSchemaRoot(base, schema) : undefined;
  let form: Form = { form: "empty" };
  const extra = {};

  if (schema.ref !== undefined) {
    const [refId, refDef] = compileSchemaRef(base, schema.ref);
    form = { form: "ref", refId, refDef };
  }

  if (schema.type !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    if (
      schema.type === "null" ||
      schema.type === "boolean" ||
      schema.type === "number" ||
      schema.type === "string"
    ) {
      form = { form: "type", type: schema.type };
    } else {
      throw new InvalidFormError();
    }
  }

  if (schema.elements !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    form = {
      form: "elements",
      schema: compileSchemaWithBase(base, false, schema.elements),
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
      required[name] = compileSchemaWithBase(base, false, subSchema);
    }

    const optional: { [name: string]: CompiledSchema } = {};
    for (const [name, subSchema] of Object.entries(
      schema.optionalProperties || {},
    )) {
      optional[name] = compileSchemaWithBase(base, false, subSchema);
    }

    form = { form: "properties", required, optional };
  }

  if (schema.values !== undefined) {
    if (form.form !== "empty") {
      throw new InvalidFormError();
    }

    form = {
      form: "values",
      schema: compileSchemaWithBase(base, false, schema.values),
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
      mapping[name] = compileSchemaWithBase(base, false, subSchema);
    }

    form = { form: "discriminator", tag: schema.discriminator.tag, mapping };
  }

  return { root, form, extra };
}

function compileSchemaRoot(base: URL | undefined, schema: Schema): RootData {
  const id = schema.id === undefined ? undefined : new URL(schema.id);
  const definitions: { [name: string]: CompiledSchema } = {};

  if (schema.definitions !== undefined) {
    for (const [name, subSchema] of Object.entries(schema.definitions)) {
      definitions[name] = compileSchemaWithBase(base, false, subSchema);
    }
  }

  return { id, definitions };
}

function compileSchemaRef(
  base: URL | undefined,
  ref: string,
): [URL | undefined, string | undefined] {
  if (ref === "" || ref === "#") {
    return [base, undefined];
  } else if (ref.startsWith("#")) {
    return [base, ref.substring(1)];
  } else {
    const resolvedUrl = new URL(ref, base);
    const fragment = resolvedUrl.hash;
    resolvedUrl.hash = "";

    return [resolvedUrl, fragment === "" ? undefined : fragment.substring(1)];
  }
}

export interface RootData {
  id?: URL;
  definitions: { [name: string]: CompiledSchema };
}

export type Form =
  | EmptyForm
  | RefForm
  | TypeForm
  | ElementsForm
  | PropertiesForm
  | ValuesForm
  | DiscriminatorForm;

export interface EmptyForm {
  form: "empty";
}

export interface RefForm {
  form: "ref";
  refId?: URL;
  refDef?: string;
}

export interface TypeForm {
  form: "type";
  type: "null" | "boolean" | "number" | "string";
}

export interface ElementsForm {
  form: "elements";
  schema: CompiledSchema;
}

export interface PropertiesForm {
  form: "properties";
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
