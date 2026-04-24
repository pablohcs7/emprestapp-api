import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Schema, SchemaDefinition, SchemaOptions } from 'mongoose';

type RuntimeDatabaseConfig = {
  database: {
    mongodbUri: string;
  };
};

const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};

export const createOwnedDocumentDefinition = (
  definition: SchemaDefinition,
): SchemaDefinition => ({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  ...definition,
});

export const createBaseSchema = (
  definition: SchemaDefinition,
  options: SchemaOptions = {},
): Schema => new Schema(definition, { ...baseSchemaOptions, ...options });

export const buildMongoConnectionOptions = (
  config: RuntimeDatabaseConfig,
): MongooseModuleOptions => ({
  uri: config.database.mongodbUri,
  autoIndex: false,
});
