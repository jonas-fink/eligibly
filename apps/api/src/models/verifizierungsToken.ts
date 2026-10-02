import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const verifizierungsTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    art: { type: String, enum: ['email', 'reset'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    laeuftAbAm: { type: Date, required: true },
    verbrauchtAm: { type: Date, required: false },
  },
  { collection: 'verifizierungsTokens' },
);

verifizierungsTokenSchema.index({ laeuftAbAm: 1 }, { expireAfterSeconds: 0 });

export type VerifizierungsTokenDocument = InferSchemaType<typeof verifizierungsTokenSchema> & {
  _id: Types.ObjectId;
};

export const VerifizierungsTokenModel = model('VerifizierungsToken', verifizierungsTokenSchema);
