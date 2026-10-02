import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * User-Konten. Auth-Routen folgen spaeter; Schema laut docs/architektur.md 9.1.
 * Collection: users (in Datenbank cursorEligibility).
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerifiziert: { type: Boolean, required: true, default: false },
    passwordHash: { type: String, required: false },
    oauthProvider: { type: String, enum: ['google'], required: false },
    oauthId: { type: String, required: false },
    erstelltAm: { type: Date, required: true, default: () => new Date() },
    zuletztAngemeldet: { type: Date, required: false },
    loeschungAngekuendigtAm: { type: Date, required: false },
  },
  { collection: 'users' },
);

userSchema.index({ oauthProvider: 1, oauthId: 1 }, { unique: true, sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };

export const UserModel = model('User', userSchema);
