import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Gehashte Refresh-Tokens. TTL raeumt abgelaufene Eintraege auf.
 * Collection: refreshTokens.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familieId: { type: String, required: true, index: true },
    laeuftAbAm: { type: Date, required: true },
    widerrufenAm: { type: Date, required: false },
  },
  { collection: 'refreshTokens' },
);

refreshTokenSchema.index({ laeuftAbAm: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & {
  _id: Types.ObjectId;
};

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
