import { Schema, Types } from 'mongoose';

import {
  buildMongoConnectionOptions,
  createBaseSchema,
  createOwnedDocumentDefinition,
} from '../../src/common/database/mongoose.helpers';

describe('mongoose helpers', () => {
  it('adds the shared ownership field to protected document definitions', () => {
    const definition = createOwnedDocumentDefinition({
      fullName: { type: String, required: true },
    });

    expect(definition.userId).toMatchObject({
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    });
    expect(definition.fullName).toMatchObject({
      type: String,
      required: true,
    });
  });

  it('creates schemas with shared timestamps and version-key conventions', () => {
    const schema = createBaseSchema(
      createOwnedDocumentDefinition({
        status: { type: String, required: true },
      }),
    );

    expect(schema.get('timestamps')).toBe(true);
    expect(schema.get('versionKey')).toBe(false);
    expect(schema.path('userId')).toBeDefined();
    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();
  });

  it('maps the runtime config into mongoose connection options', () => {
    expect(
      buildMongoConnectionOptions({
        database: {
          mongodbUri: 'mongodb://localhost:27017/emprestapp',
        },
      }),
    ).toEqual({
      uri: 'mongodb://localhost:27017/emprestapp',
      autoIndex: false,
    });
  });
});
