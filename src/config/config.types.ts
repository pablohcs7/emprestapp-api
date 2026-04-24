export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  MONGODB_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TTL: string;
  BCRYPT_SALT_ROUNDS: number;
}

export interface AppConfig {
  app: {
    nodeEnv: EnvironmentVariables['NODE_ENV'];
    port: number;
  };
  database: {
    mongodbUri: string;
  };
  auth: {
    accessToken: {
      secret: string;
      ttl: string;
    };
    refreshToken: {
      secret: string;
      ttl: string;
    };
    bcryptSaltRounds: number;
  };
}
