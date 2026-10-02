import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Gespeicherte Haushalte (nur nach Login + Einwilligung).
 * Sensible Felder werden spaeter field-level verschluesselt (architektur.md 10.2).
 * Collection: haushalte.
 */
const haushaltSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bezeichnung: { type: String, required: false, maxlength: 80 },
    einwilligungAm: { type: Date, required: true },
    /** AES-256-GCM über den gesamten Haushalt, Format v1:… */
    datenChiffre: { type: String, required: true },
    rechtsstandVersion: { type: String, required: true },
    erstelltAm: { type: Date, required: true, default: () => new Date() },
    aktualisiertAm: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'haushalte' },
);

export type HaushaltDocument = InferSchemaType<typeof haushaltSchema> & {
  _id: Types.ObjectId;
};

export const HaushaltModel = model('Haushalt', haushaltSchema);
