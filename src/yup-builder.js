import * as yup from "yup";
import { Base } from "./entry";
import { createYupSchemaEntry } from "./create-entry";

function isObject(type) {
  return type && type === "object";
}

export function buildYup(schema, config = {}) {
  return new YupBuilder(schema, {...config}).yupSchema;
}

function isObjectType(obj) {
  return obj === Object(obj);
}

export class YupBuilder extends Base {
  constructor(schema, config = {}) {
    super(config);
    this.init(schema, config);
  }

  init(schema, config) {
    config.buildYup = buildYup;
    config.createYupSchemaEntry =
      config.createYupSchemaEntry || createYupSchemaEntry;
    this.config = Object.assign(this.config, config);    
    this.schema = schema;
    const type = this.getType(schema);
    const props = this.getProps(schema);
    this.type = type;
    this.properties = props;
    this.additionalProps = this.getAdditionalProperties(schema);
    this.required = this.getRequired(schema);

    this.setLocale()

    const customInitFn = typeof config.init === 'function' ? config.init : () => {}
    const customInit = customInitFn.bind(this) 
    customInit(schema, config)

    if (!isObject(type)) {
      this.error(`invalid schema: must be type: "object", was type: ${type}`);
      return;
    }

    if (!isObjectType(props)) {
      const props = JSON.stringify(properties);
      this.error(`invalid schema: must have a properties object: ${props}`);
      return;
    }

    const name = this.getName(schema);
    const properties = this.normalizeRequired(schema);
    const shapeConfig = this.propsToShape({ properties, name, config });

    this.shapeConfig = shapeConfig;
    this.validSchema = true;
  }

  get validator() {
    return yup
  }

  setLocale() {
    this.config.locale && yup.setLocale(this.config.locale);
  }

  getAdditionalProperties(schema) {
    return schema.additionalProperties;
  }

  getRequired(obj) {
    const { getRequired } = this.config;
    return getRequired ? getRequired(obj) : obj.required || [];
  }

  getProps(obj) {
    return this.config.getProps(obj);
  }

  getType(obj) {
    return this.config.getType(obj);
  }

  getName(obj) {
    return this.config.getName(obj);
  }

  get yupSchema() {
    return yup.object().shape(this.shapeConfig);
  }

  normalizeRequired() {
    const properties = {
      ...this.properties
    };
    const required = [...this.required] || [];
    // this.logInfo("normalizeRequired", {
    //   properties,
    //   required
    // });
    const propKeys = Object.keys(properties);
    return propKeys.reduce((acc, key) => {
      // this.logInfo("normalizeRequired", {
      //   key
      // });
      const value = properties[key];
      const isRequired = required.indexOf(key) >= 0;
      if (isObjectType(value)) {
        value.required = this.isRequired(value) || isRequired;
      } else {
        this.warn(`Bad value: ${value} must be an object`);
      }

      acc[key] = value;
      return acc;
    }, {});
  }

  isRequired(value) {
    return this.config.isRequired(value);
  }

  propsToShape(opts = {}) {
    const shape = this.objPropsToShape(opts);
    this.objPropsShape = shape;
    this.addPropsShape = this.additionalPropsToShape(opts, shape);
    return shape;
  }

  additionalPropsToShape(opts, shape) {
    return shape;
  }

  objPropsToShape({ name }) {
    const properties = {
      ...this.properties
    };
    const keys = Object.keys(properties);
    return keys.reduce((acc, key) => {
      const value = properties[key];
      const yupSchemaEntry = this.propToYupSchemaEntry({
        name,
        key,
        value
      });
      this.logInfo("propsToShape", { key, yupSchemaEntry });
      acc[key] = yupSchemaEntry;
      return acc;
    }, {});
  }

  propToYupSchemaEntry({ name, key, value = {} }) {
    return this.createYupSchemaEntry({
      schema: this.schema,
      name,
      key,
      value,
      config: this.config,
      builder: this
    });
  }

  createYupSchemaEntry(opts = {}) {
    return this.config.createYupSchemaEntry(opts);
  }

  onConstraintAdded(constraint) {
    this.logInfo('Constraint Added', constraint)
  }
}