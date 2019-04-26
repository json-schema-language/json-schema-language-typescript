import { compileSchema } from "./CompiledSchema";
import Registry from "./Registry";

describe("Registry", () => {
  it("supports self-referential definitions", () => {
    const registry = new Registry();
    const missingIds = registry.register(
      compileSchema({
        id: "http://example.com/foo",
        definitions: {
          a: { ref: "" },
          b: { ref: "#" },
          c: { ref: "#c" },
          d: { ref: "http://example.com/foo#d" },
        },
      }),
    );

    expect(missingIds).toEqual([]);
  });

  it("supports having a missing ID added", () => {
    const registry = new Registry();
    const missingIds1 = registry.register(
      compileSchema({
        id: "http://example.com/foo",
        definitions: {
          a: { ref: "/bar" },
          b: { ref: "//foo.example.com/" },
          c: { ref: "/bar#c" },
          d: { ref: "//foo.example.com/#d" },
        },
      }),
    );

    expect(missingIds1).toEqual([
      new URL("http://example.com/bar"),
      new URL("http://foo.example.com/"),
      new URL("http://example.com/bar"),
      new URL("http://foo.example.com/"),
    ]);

    const missingIds2 = registry.register(
      compileSchema({
        id: "http://example.com/bar",
        definitions: {
          c: {},
        },
      }),
    );

    expect(missingIds2).toEqual([
      new URL("http://foo.example.com/"),
      new URL("http://foo.example.com/"),
    ]);

    const missingIds3 = registry.register(
      compileSchema({
        id: "http://foo.example.com/",
        definitions: {
          d: {},
        },
      }),
    );

    expect(missingIds3).toEqual([]);
  });

  it("finds all missing IDs", () => {
    const registry = new Registry();
    const missingIds = registry.register(
      compileSchema({
        id: "http://example.com/foo",
        definitions: {
          a: { ref: "/1" },
          b: { elements: { ref: "/2" } },
          c: { properties: { a: { ref: "/3" } } },
          d: { optionalProperties: { a: { ref: "/4" } } },
          e: { values: { ref: "/5" } },
          f: { discriminator: { tag: "foo", mapping: { a: { ref: "/6 " } } } },
        },
      }),
    );

    expect(missingIds).toEqual([
      new URL("http://example.com/1"),
      new URL("http://example.com/2"),
      new URL("http://example.com/3"),
      new URL("http://example.com/4"),
      new URL("http://example.com/5"),
      new URL("http://example.com/6"),
    ]);
  });
});
