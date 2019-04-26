import * as fs from "fs";
import * as path from "path";
import { compileSchema } from "./CompiledSchema";
import Registry from "./Registry";
import Validator from "./Validator";

describe("Validator", () => {
  describe("spec", () => {
    for (const file of fs.readdirSync(path.join(__dirname, "../spec/tests"))) {
      describe(file, () => {
        const contents = fs.readFileSync(
          path.join(__dirname, "../spec/tests", file),
          "utf8",
        );
        const tests = JSON.parse(contents);

        for (const { name, registry, schema, instances } of tests) {
          describe(name, () => {
            const reg = new Registry();

            reg.register(compileSchema(schema));
            for (const testSchema of registry) {
              reg.register(compileSchema(testSchema));
            }

            const validator = new Validator(reg);

            for (const [index, { instance, errors }] of instances.entries()) {
              it(index.toString(), () => {
                const actualErrors = validator.validate(instance).map(err => ({
                  instancePath: err.instancePath.toString(),
                  schemaPath: err.schemaPath.toString(),
                  schemaURI:
                    err.schemaId === undefined ? "" : err.schemaId.toString(),
                }));

                actualErrors.sort((a, b) =>
                  `${a.schemaPath}:${a.instancePath}` <
                  `${b.schemaPath}:${b.instancePath}`
                    ? -1
                    : 1,
                );

                errors.sort((a: any, b: any) =>
                  `${a.schemaPath}:${a.instancePath}` <
                  `${b.schemaPath}:${b.instancePath}`
                    ? -1
                    : 1,
                );

                expect(actualErrors).toEqual(errors);
              });
            }
          });
        }
      });
    }
  });
});
