import CompiledSchema from "./CompiledSchema";
import NonRootError from "./NonRootError";
import NoSuchDefinitionError from "./NoSuchDefinitionError";

export default class Registry {
  private registry: { [name: string]: CompiledSchema };
  private missingIds: URL[];

  constructor() {
    this.registry = {};
    this.missingIds = [];
  }

  public register(schema: CompiledSchema): URL[] {
    if (schema.root === undefined) {
      throw new NonRootError();
    }

    this.registry[this.idToKey(schema.root.id)] = schema;

    const missingIds: URL[] = [];
    for (const registrySchema of Object.values(this.registry)) {
      this.computeMissingIds(missingIds, registrySchema);
    }

    this.missingIds = missingIds;
    return this.missingIds;
  }

  public get(id: URL | undefined) {
    return this.registry[this.idToKey(id)];
  }

  private computeMissingIds(out: URL[], schema: CompiledSchema) {
    if (schema.root !== undefined) {
      for (const subSchema of Object.values(schema.root.definitions)) {
        this.computeMissingIds(out, subSchema);
      }
    }

    switch (schema.form.form) {
      case "ref":
        if (this.registry.hasOwnProperty(this.idToKey(schema.form.refId))) {
          // Elements of this.registry must be root schemas. Therefore it is ok
          // to coerce this schema's root as non-undefined.
          const refRoot = this.registry[this.idToKey(schema.form.refId)].root!;

          if (schema.form.refDef !== undefined) {
            if (!refRoot.definitions.hasOwnProperty(schema.form.refDef)) {
              throw new NoSuchDefinitionError(
                `no definition: ${schema.form.refDef} for schema with id: ${
                  schema.form.refId
                }`,
              );
            }
          }
        } else {
          // It is impossible for a reference to an anonymous schema (i.e. one
          // whose refId is `undefined`) to fail to resolve.
          //
          // It's therefore ok to coerce this value as non-undefined.
          out.push(schema.form.refId!);
        }

        return;
      case "elements":
        this.computeMissingIds(out, schema.form.schema);
        return;
      case "properties":
        for (const subSchema of Object.values(schema.form.required)) {
          this.computeMissingIds(out, subSchema);
        }

        for (const subSchema of Object.values(schema.form.optional)) {
          this.computeMissingIds(out, subSchema);
        }

        return;
      case "values":
        this.computeMissingIds(out, schema.form.schema);
        return;
      case "discriminator":
        for (const subSchema of Object.values(schema.form.mapping)) {
          this.computeMissingIds(out, subSchema);
        }

        return;
      case "empty":
        return;
      case "type":
        return;
    }
  }

  private idToKey(id: URL | undefined): string {
    return id === undefined ? "" : id.toString();
  }
}
