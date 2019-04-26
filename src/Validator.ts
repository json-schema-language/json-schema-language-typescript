import Ptr from "@json-schema-language/json-pointer";
import Registry from "./Registry";
import Vm from "./Vm";

export default class Validator {
  private registry: Registry;
  private config: ValidatorConfig;

  constructor(registry: Registry, config?: ValidatorConfig) {
    this.registry = registry;
    this.config = config || DEFAULT_VALIDATOR_CONFIG;
  }

  public validate(instance: any, schemaId?: URL): ValidationError[] {
    return Vm.validate(
      this.config.maxErrors,
      this.config.maxDepth,
      this.config.strictInstanceSemantics,
      this.registry,
      schemaId,
      instance,
    );
  }
}

export interface ValidatorConfig {
  maxDepth: number;
  maxErrors: number;
  strictInstanceSemantics: boolean;
}

export const DEFAULT_VALIDATOR_CONFIG = {
  maxDepth: 32,
  maxErrors: 0,
  strictInstanceSemantics: false,
};

export interface ValidationError {
  instancePath: Ptr;
  schemaPath: Ptr;
  schemaId?: URL;
}
