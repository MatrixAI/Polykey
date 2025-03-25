import type { JSONSchemaType, ValidateFunction } from 'ajv';
import type { StatusInfo } from './types.js';
import Ajv from 'ajv';
import StatusSchema from './StatusSchema.json';

// @ts-ignore Ajv is improperly exported for ESM
const ajv = new Ajv.default();

const statusSchema = StatusSchema as JSONSchemaType<StatusInfo>;
const statusValidate: ValidateFunction<StatusInfo> = ajv.compile(statusSchema);

export { statusSchema, statusValidate };
