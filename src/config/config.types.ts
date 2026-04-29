export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  MONGODB_URI: string;
  CORS_ALLOWED_ORIGINS?: string;
  TRUST_PROXY: boolean;
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
    corsAllowedOrigins: string[];
    trustProxy: boolean;
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
