import { AppConfig, EnvironmentVariables } from './config.types';
import { validateEnvironment } from './env.validation';

export const buildAppConfig = (env: EnvironmentVariables): AppConfig => ({
  app: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
  },
  database: {
    mongodbUri: env.MONGODB_URI,
  },
  auth: {
    accessToken: {
      secret: env.JWT_ACCESS_SECRET,
      ttl: env.JWT_ACCESS_TTL,
    },
    refreshToken: {
      secret: env.JWT_REFRESH_SECRET,
      ttl: env.JWT_REFRESH_TTL,
    },
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  },
});

export const appConfigFactory = (): AppConfig =>
  buildAppConfig(validateEnvironment(process.env));
