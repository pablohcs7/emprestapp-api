import Joi from 'joi';

import { EnvironmentVariables } from './config.types';

const environmentSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().min(2).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_TTL: Joi.string().min(2).required(),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).max(15).default(10),
}).unknown(true);

export const validateEnvironment = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  assertStrongJwtSecret('JWT_ACCESS_SECRET', value.JWT_ACCESS_SECRET, value.NODE_ENV);
  assertStrongJwtSecret(
    'JWT_REFRESH_SECRET',
    value.JWT_REFRESH_SECRET,
    value.NODE_ENV,
  );

  return value;
};

function assertStrongJwtSecret(
  fieldName: string,
  value: string,
  nodeEnv: EnvironmentVariables['NODE_ENV'],
): void {
  const normalized = value.trim().toLowerCase();
  const weakMarkers = ['changeme', 'example', 'placeholder', 'temp', 'secret'];
  const minLength = nodeEnv === 'production' ? 32 : 16;

  if (value.trim().length < minLength) {
    throw new Error(
      `Environment validation failed: ${fieldName} must be at least ${minLength} characters long`,
    );
  }

  if (weakMarkers.some((marker) => normalized.includes(marker))) {
    throw new Error(
      `Environment validation failed: ${fieldName} must not use placeholder-like values`,
    );
  }
}
