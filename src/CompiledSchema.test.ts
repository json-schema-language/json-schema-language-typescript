import { compileSchema } from "./CompiledSchema";
import InvalidFormError from "./InvalidForm";

describe("CompiledSchema", () => {
  describe("compileSchema", () => {
    it("handles root data", () => {
      expect(compileSchema({})).toEqual({
        definitions: {},
        form: { form: "empty" },
      });

      expect(
        compileSchema({
          definitions: {
            a: {},
          },
        }),
      ).toEqual({
        definitions: {
          a: {
            form: { form: "empty" },
          },
        },
        form: { form: "empty" },
      });
    });

    it("handles ref form", () => {
      expect(
        compileSchema({
          definitions: {
            a: {},
          },
          ref: "a",
        }),
      ).toEqual({
        definitions: {
          a: {
            form: { form: "empty" },
          },
        },
        form: { form: "ref", ref: "a" },
      });

      expect(() => {
        compileSchema({
          definitions: {
            a: {},
          },
          ref: "b",
        });
      }).toThrow(new InvalidFormError());
    });

    it("handles type form", () => {
      expect(
        compileSchema({
          type: "boolean",
        }),
      ).toEqual({
        definitions: {},
        form: { form: "type", type: "boolean" },
      });

      expect(
        compileSchema({
          type: "number",
        }),
      ).toEqual({
        definitions: {},
        form: { form: "type", type: "number" },
      });

      expect(
        compileSchema({
          type: "string",
        }),
      ).toEqual({
        definitions: {},
        form: { form: "type", type: "string" },
      });

      expect(
        compileSchema({
          type: "timestamp",
        }),
      ).toEqual({
        definitions: {},
        form: { form: "type", type: "timestamp" },
      });
    });

    it("handles enum form", () => {
      expect(
        compileSchema({
          enum: ["FOO", "BAR"],
        }),
      ).toEqual({
        definitions: {},
        form: { form: "enum", values: ["FOO", "BAR"] },
      });
    });

    it("handles elements form", () => {
      expect(
        compileSchema({
          elements: {},
        }),
      ).toEqual({
        definitions: {},
        form: {
          form: "elements",
          schema: {
            form: { form: "empty" },
          },
        },
      });
    });

    it("handles properties form", () => {
      expect(
        compileSchema({
          properties: {
            a: {},
          },
          optionalProperties: {
            b: {},
          },
        }),
      ).toEqual({
        definitions: {},
        form: {
          form: "properties",
          hasProperties: true,
          required: {
            a: {
              form: { form: "empty" },
            },
          },
          optional: {
            b: {
              form: { form: "empty" },
            },
          },
        },
      });

      expect(() => {
        compileSchema({
          properties: {
            a: {},
          },
          optionalProperties: {
            a: {},
          },
        });
      }).toThrow(new InvalidFormError());
    });

    it("handles values form", () => {
      expect(
        compileSchema({
          values: {},
        }),
      ).toEqual({
        definitions: {},
        form: {
          form: "values",
          schema: {
            form: { form: "empty" },
          },
        },
      });
    });

    it("handles discriminator form", () => {
      expect(
        compileSchema({
          discriminator: {
            tag: "foo",
            mapping: {
              a: { properties: {} },
            },
          },
        }),
      ).toEqual({
        definitions: {},
        form: {
          form: "discriminator",
          tag: "foo",
          mapping: {
            a: {
              form: {
                form: "properties",
                hasProperties: true,
                required: {},
                optional: {},
              },
            },
          },
        },
      });

      expect(() => {
        compileSchema({
          discriminator: {
            tag: "foo",
            mapping: {
              a: {},
            },
          },
        });
      }).toThrow(new InvalidFormError());

      expect(() => {
        compileSchema({
          discriminator: {
            tag: "foo",
            mapping: {
              a: {
                properties: {
                  foo: {},
                },
              },
            },
          },
        });
      }).toThrow(new InvalidFormError());

      expect(() => {
        compileSchema({
          discriminator: {
            tag: "foo",
            mapping: {
              a: {
                optionalProperties: {
                  foo: {},
                },
              },
            },
          },
        });
      }).toThrow(new InvalidFormError());
    });
  });
});
