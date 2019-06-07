import Ptr from "@json-schema-language/json-pointer";
import * as moment from "moment";
import CompiledSchema from "./CompiledSchema";
import MaxDepthExceededError from "./MaxDepthExceededError";
import { ValidationError } from "./Validator";

export default class Vm {
  public static validate(
    maxErrors: number,
    maxDepth: number,
    strictInstanceSemantics: boolean,
    schema: CompiledSchema,
    instance: any,
  ): ValidationError[] {
    const vm = new Vm(maxErrors, maxDepth, strictInstanceSemantics, schema);

    try {
      vm.eval(schema, instance);
    } catch (err) {
      // TooManyErrorsError is just a short-circuiting mechanism. It is not a
      // real error. All other errors are real.
      if (!(err instanceof TooManyErrorsError)) {
        throw err;
      }
    }

    return vm.errors;
  }

  private maxErrors: number;
  private maxDepth: number;
  private strictInstanceSemantics: boolean;
  private rootSchema: CompiledSchema;
  private instanceTokens: string[];
  private schemaTokens: string[][];
  private errors: ValidationError[];

  constructor(
    maxErrors: number,
    maxDepth: number,
    strictInstanceSemantics: boolean,
    rootSchema: CompiledSchema,
  ) {
    this.maxErrors = maxErrors;
    this.maxDepth = maxDepth;
    this.strictInstanceSemantics = strictInstanceSemantics;
    this.rootSchema = rootSchema;
    this.instanceTokens = [];
    this.schemaTokens = [[]];
    this.errors = [];
  }

  private eval(schema: CompiledSchema, instance: any, parentTag?: string) {
    switch (schema.form.form) {
      case "empty":
        return;
      case "ref":
        if (this.schemaTokens.length === this.maxDepth) {
          throw new MaxDepthExceededError();
        }

        const schemaTokens = ["definitions", schema.form.ref];
        const refSchema = this.rootSchema.definitions![schema.form.ref];
        this.schemaTokens.push(schemaTokens);
        this.eval(refSchema, instance);

        return;
      case "type":
        switch (schema.form.type) {
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
          case "timestamp":
            if (typeof instance !== "string") {
              this.pushSchemaToken("type");
              this.pushError();
              this.popSchemaToken();
            } else {
              // ISO 8601 is unfortunately not quite the same thing as RFC 3339.
              // However, at the time of writing no adequate alternative,
              // widely-used library for parsing RFC3339 timestamps exists.
              //
              // Notably, moment does not support two of the examples given in
              // RFC 3339 with "60" in the seconds place. These timestamps arise
              // due to leap seconds. See:
              //
              // https://tools.ietf.org/html/rfc3339#section-5.8
              if (!moment(instance, moment.ISO_8601).isValid()) {
                this.pushSchemaToken("type");
                this.pushError();
                this.popSchemaToken();
              }
            }

            return;
        }

        return;
      case "enum":
        if (typeof instance === "string") {
          if (!schema.form.values.includes(instance)) {
            this.pushSchemaToken("enum");
            this.pushError();
            this.popSchemaToken();
          }
        } else {
          this.pushSchemaToken("enum");
          this.pushError();
          this.popSchemaToken();
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

          if (this.strictInstanceSemantics) {
            for (const name of Object.keys(instance)) {
              if (
                name !== parentTag &&
                !schema.form.required.hasOwnProperty(name) &&
                !schema.form.optional.hasOwnProperty(name)
              ) {
                this.pushInstanceToken(name);
                this.pushError();
                this.popInstanceToken();
              }
            }

            this.popSchemaToken();
          }
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
                this.eval(
                  schema.form.mapping[tagValue],
                  instance,
                  schema.form.tag,
                );
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
    this.schemaTokens[this.schemaTokens.length - 1].push(token);
  }

  private popSchemaToken() {
    this.schemaTokens[this.schemaTokens.length - 1].pop();
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
      schemaPath: new Ptr([...this.schemaTokens[this.schemaTokens.length - 1]]),
    });

    if (this.errors.length === this.maxErrors) {
      throw new TooManyErrorsError();
    }
  }
}

// Just a psuedo-error to short-circuit the case of needing to stop evaluation.
class TooManyErrorsError extends Error {}
