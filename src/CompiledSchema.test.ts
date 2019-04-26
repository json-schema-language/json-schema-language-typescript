import { compileSchema } from "./CompiledSchema";

describe("CompiledSchema", () => {
  describe("compileSchema", () => {
    it("handles root data", () => {
      expect(compileSchema({})).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "empty" },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: { form: "empty" },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          definitions: {
            a: {},
          },
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {
            a: {
              form: { form: "empty" },
              extra: {},
            },
          },
        },
        form: { form: "empty" },
        extra: {},
      });
    });

    it("handles ref form", () => {
      expect(
        compileSchema({
          ref: "http://example.com/foo",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "ref", refId: new URL("http://example.com/foo") },
        extra: {},
      });

      expect(
        compileSchema({
          ref: "http://example.com/foo#bar",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/foo"),
          refDef: "bar",
        },
        extra: {},
      });

      expect(
        compileSchema({
          ref: "",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "ref",
        },
        extra: {},
      });

      expect(
        compileSchema({
          ref: "#",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "ref",
        },
        extra: {},
      });

      expect(
        compileSchema({
          ref: "#bar",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "ref",
          refDef: "bar",
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/foo"),
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "#",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/foo"),
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "#bar",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/foo"),
          refDef: "bar",
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "#bar",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/foo"),
          refDef: "bar",
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "/bar",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/bar"),
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "/bar#",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/bar"),
        },
        extra: {},
      });

      expect(
        compileSchema({
          id: "http://example.com/foo",
          ref: "/bar#asdf",
        }),
      ).toEqual({
        root: {
          id: new URL("http://example.com/foo"),
          definitions: {},
        },
        form: {
          form: "ref",
          refId: new URL("http://example.com/bar"),
          refDef: "asdf",
        },
        extra: {},
      });
    });

    it("handles type form", () => {
      expect(
        compileSchema({
          type: "null",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "type", type: "null" },
        extra: {},
      });

      expect(
        compileSchema({
          type: "boolean",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "type", type: "boolean" },
        extra: {},
      });

      expect(
        compileSchema({
          type: "number",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "type", type: "number" },
        extra: {},
      });

      expect(
        compileSchema({
          type: "string",
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: { form: "type", type: "string" },
        extra: {},
      });
    });

    it("handles elements form", () => {
      expect(
        compileSchema({
          elements: {},
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "elements",
          schema: {
            form: { form: "empty" },
            extra: {},
          },
        },
        extra: {},
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
        root: {
          definitions: {},
        },
        form: {
          form: "properties",
          required: {
            a: {
              form: { form: "empty" },
              extra: {},
            },
          },
          optional: {
            b: {
              form: { form: "empty" },
              extra: {},
            },
          },
        },
        extra: {},
      });
    });

    it("handles values form", () => {
      expect(
        compileSchema({
          values: {},
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "values",
          schema: {
            form: { form: "empty" },
            extra: {},
          },
        },
        extra: {},
      });
    });

    it("handles discriminator form", () => {
      expect(
        compileSchema({
          discriminator: {
            tag: "foo",
            mapping: {
              a: {},
            },
          },
        }),
      ).toEqual({
        root: {
          definitions: {},
        },
        form: {
          form: "discriminator",
          tag: "foo",
          mapping: {
            a: {
              form: { form: "empty" },
              extra: {},
            },
          },
        },
        extra: {},
      });
    });
  });
});
