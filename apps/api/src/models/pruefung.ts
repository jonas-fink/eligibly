import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Gespeicherte Pruefergebnisse je Haushalt (nicht neu berechnet).
 * Collection: pruefungen.
 */
const pruefungSchema = new Schema(
  {
    haushaltId: { type: Schema.Types.ObjectId, ref: 'Haushalt', required: true },
    erstelltAm: { type: Date, required: true, default: () => new Date() },
    rechtsstandVersion: { type: String, required: true },
    ergebnisseChiffre: { type: String, required: true },
  },
  { collection: 'pruefungen' },
);

pruefungSchema.index({ haushaltId: 1, erstelltAm: -1 });

export type PruefungDocument = InferSchemaType<typeof pruefungSchema> & {
  _id: Types.ObjectId;
};

export const PruefungModel = model('Pruefung', pruefungSchema);
