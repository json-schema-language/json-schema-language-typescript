import Ptr from "@json-schema-language/json-pointer";
import CompiledSchema from "./CompiledSchema";
import NoSuchSchemaError from "./NoSuchSchemaError";
import Registry from "./Registry";
import RegistryNotSealedError from "./RegistryNotSealedError";
import { ValidationError } from "./Validator";

export default class Vm {
  public static validate(
    maxErrors: number,
    maxDepth: number,
    registry: Registry,
    id: URL | undefined,
    instance: any,
  ): ValidationError[] {
    if (!registry.isSealed()) {
      throw new RegistryNotSealedError();
    }

    const schema = registry.get(id);
    if (schema === undefined) {
      throw new NoSuchSchemaError();
    }

    const vm = new Vm(maxErrors, maxDepth, registry, id);
    vm.eval(schema, instance);
    return vm.errors;
  }

  private maxErrors: number;
  private maxDepth: number;
  private registry: Registry;
  private instanceTokens: string[];
  private schemas: Array<{ id: URL | undefined; tokens: string[] }>;
  private errors: ValidationError[];

  constructor(
    maxErrors: number,
    maxDepth: number,
    registry: Registry,
    id: URL | undefined,
  ) {
    this.maxErrors = maxErrors;
    this.maxDepth = maxDepth;
    this.registry = registry;
    this.instanceTokens = [];
    this.schemas = [{ id, tokens: [] }];
    this.errors = [];
  }

  private eval(schema: CompiledSchema, instance: any) {
    switch (schema.form.form) {
      case "empty":
        return;
      case "ref":
        const schemaTokens =
          schema.form.refDef === undefined
            ? []
            : ["definitions", schema.form.refDef];

        const rootSchema = this.registry.get(schema.form.refId);
        const refSchema =
          schema.form.refDef === undefined
            ? rootSchema
            : rootSchema.root!.definitions[schema.form.refDef];

        this.schemas.push({ id: schema.form.refId, tokens: schemaTokens });
        this.eval(refSchema, instance);

        return;
      case "type":
        switch (schema.form.type) {
          case "null":
            if (instance !== null) {
              this.pushSchemaToken("type");
              this.pushError();
              this.popSchemaToken();
            }

            return;
          case "boolean":
            if (typeof instance !== "boolean") {
              this.pushSchemaToken("type");
              this.pushError();
              this.popSchemaToken();
            }

            return;
          case "number":
            if (typeof instance !== "number") {
              this.pushSchemaToken("type");
              this.pushError();
              this.popSchemaToken();
            }

            return;
          case "string":
            if (typeof instance !== "string") {
              this.pushSchemaToken("type");
              this.pushError();
              this.popSchemaToken();
            }

            return;
        }

        return;
      case "elements":
        this.pushSchemaToken("elements");

        if (Array.isArray(instance)) {
          for (const [index, subInstance] of instance.entries()) {
            this.pushInstanceToken(index.toString());
            this.eval(schema.form.schema, subInstance);
            this.popInstanceToken();
          }
        } else {
          this.pushError();
        }

        this.popSchemaToken();

        return;
      case "properties":
        // JSON has six basic types of data (null, boolean, number, string,
        // array, object). Of their standard JS countparts, three have a
        // `typeof` of "object": null, array, and object.
        //
        // This check attempts to check if something is "really" an object.
        if (
          typeof instance === "object" &&
          instance !== null &&
          !Array.isArray(instance)
        ) {
          this.pushSchemaToken("properties");
          for (const [name, subSchema] of Object.entries(
            schema.form.required,
          )) {
            if (instance.hasOwnProperty(name)) {
              this.pushSchemaToken(name);
              this.pushInstanceToken(name);
              this.eval(subSchema, instance[name]);
              this.popInstanceToken();
              this.popSchemaToken();
            } else {
              this.pushSchemaToken(name);
              this.pushError();
              this.popSchemaToken();
            }
          }
          this.popSchemaToken();

          this.pushSchemaToken("optionalProperties");
          for (const [name, subSchema] of Object.entries(
            schema.form.optional,
          )) {
            if (instance.hasOwnProperty(name)) {
              this.pushSchemaToken(name);
              this.pushInstanceToken(name);
              this.eval(subSchema, instance[name]);
              this.popInstanceToken();
              this.popSchemaToken();
            }
          }
          this.popSchemaToken();
        } else {
          if (schema.form.hasProperties) {
            this.pushSchemaToken("properties");
          } else {
            this.pushSchemaToken("optionalProperties");
          }

          this.pushError();
          this.popSchemaToken();
        }

        return;
      case "values":
        this.pushSchemaToken("values");

        if (
          typeof instance === "object" &&
          instance !== null &&
          !Array.isArray(instance)
        ) {
          for (const [name, subInstance] of Object.entries(instance)) {
            this.pushInstanceToken(name);
            this.eval(schema.form.schema, subInstance);
            this.popInstanceToken();
          }
        } else {
          this.pushError();
        }

        this.popSchemaToken();

        return;
      case "discriminator":
        this.pushSchemaToken("discriminator");

        if (
          typeof instance === "object" &&
          instance !== null &&
          !Array.isArray(instance)
        ) {
          if (instance.hasOwnProperty(schema.form.tag)) {
            const tagValue = instance[schema.form.tag];

            if (typeof tagValue === "string") {
              if (schema.form.mapping.hasOwnProperty(tagValue)) {
                this.pushSchemaToken("mapping");
                this.pushSchemaToken(tagValue);
                this.eval(schema.form.mapping[tagValue], instance);
                this.popSchemaToken();
                this.popSchemaToken();
              } else {
                this.pushSchemaToken("mapping");
                this.pushInstanceToken(schema.form.tag);
                this.pushError();
                this.popInstanceToken();
                this.popSchemaToken();
              }
            } else {
              this.pushSchemaToken("tag");
              this.pushInstanceToken(schema.form.tag);
              this.pushError();
              this.popInstanceToken();
              this.popSchemaToken();
            }
          } else {
            this.pushSchemaToken("tag");
            this.pushError();
            this.popSchemaToken();
          }
        } else {
          this.pushError();
        }

        this.popSchemaToken();

        return;
    }
  }

  private pushSchemaToken(token: string) {
    this.schemas[this.schemas.length - 1].tokens.push(token);
  }

  private popSchemaToken() {
    this.schemas[this.schemas.length - 1].tokens.pop();
  }

  private pushInstanceToken(token: string) {
    this.instanceTokens.push(token);
  }

  private popInstanceToken() {
    this.instanceTokens.pop();
  }

  private pushError() {
    this.errors.push({
      instancePath: new Ptr([...this.instanceTokens]),
      schemaPath: new Ptr([...this.schemas[this.schemas.length - 1].tokens]),
      schemaId: this.schemas[this.schemas.length - 1].id,
    });
  }
}
