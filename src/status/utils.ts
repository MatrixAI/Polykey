import type { JSONSchemaType, ValidateFunction } from 'ajv';
import type { StatusInfo } from './types';
import Ajv from 'ajv';
import StatusSchema from './StatusSchema.json';

const ajv = new Ajv();

const statusSchema = StatusSchema as JSONSchemaType<StatusInfo>;
const statusValidate: ValidateFunction<StatusInfo> = ajv.compile(statusSchema);

export { statusSchema, statusValidate };
