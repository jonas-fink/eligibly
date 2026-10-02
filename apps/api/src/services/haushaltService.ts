import { isValidObjectId } from 'mongoose';
import { ergaenzeHaushalt, type HaushaltSpeichernRequest } from '@eligibility/shared';
import { HaushaltModel } from '../models/haushalt.js';
import { PruefungModel } from '../models/pruefung.js';
import { UserModel } from '../models/user.js';
import { EmailNichtBestaetigt, NichtGefunden } from '../domain/fehler.js';
import { entschluesseln, verschluesseln } from '../utils/verschluesselung.js';

export interface SpeicherKonfig {
  encryptionKey: Buffer;
  keyVersion: number;
}

interface GespeicherteDaten {
  haushalt: ReturnType<typeof ergaenzeHaushalt>;
  systemSpecificAnswers?: Record<string, unknown>;
}

async function verlangtBestaetigteEmail(userId: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw new NichtGefunden();
  if (!user.emailVerifiziert) throw new EmailNichtBestaetigt();
}

function packen(daten: GespeicherteDaten, konfig: SpeicherKonfig): string {
  return verschluesseln(JSON.stringify(daten), konfig.encryptionKey, konfig.keyVersion);
}

function auspacken(chiffre: string, konfig: SpeicherKonfig): GespeicherteDaten {
  return JSON.parse(entschluesseln(chiffre, konfig.encryptionKey)) as GespeicherteDaten;
}

export async function speichereHaushalt(userId: string, body: HaushaltSpeichernRequest, konfig: SpeicherKonfig) {
  await verlangtBestaetigteEmail(userId);
  const daten: GespeicherteDaten = {
    haushalt: ergaenzeHaushalt(body.haushalt),
    systemSpecificAnswers: body.systemSpecificAnswers,
  };
  const doc = await HaushaltModel.create({
    userId,
    bezeichnung: body.bezeichnung,
    einwilligungAm: new Date(),
    datenChiffre: packen(daten, konfig),
    rechtsstandVersion: body.haushalt.rechtsstandVersion,
  });
  if (body.ergebnisse?.length) {
    await PruefungModel.create({
      haushaltId: doc._id,
      rechtsstandVersion: body.haushalt.rechtsstandVersion,
      ergebnisseChiffre: verschluesseln(JSON.stringify(body.ergebnisse), konfig.encryptionKey, konfig.keyVersion),
    });
  }
  return { id: String(doc._id) };
}

export async function listeHaushalte(userId: string, konfig: SpeicherKonfig) {
  const docs = await HaushaltModel.find({ userId }).sort({ aktualisiertAm: -1 });
  return docs.map((doc) => {
    const daten = auspacken(doc.datenChiffre, konfig);
    return {
      id: String(doc._id),
      bezeichnung: doc.bezeichnung ?? undefined,
      erstelltAm: doc.erstelltAm.toISOString(),
      aktualisiertAm: doc.aktualisiertAm.toISOString(),
      plz: daten.haushalt.wohnsituation.plz,
      wohnort: daten.haushalt.wohnsituation.wohnort,
      anzahlPersonen: daten.haushalt.anzahlPersonen,
    };
  });
}

export async function liesHaushalt(userId: string, id: string, konfig: SpeicherKonfig) {
  if (!isValidObjectId(id)) throw new NichtGefunden();
  const doc = await HaushaltModel.findOne({ _id: id, userId });
  if (!doc) throw new NichtGefunden();
  const daten = auspacken(doc.datenChiffre, konfig);
  const pruefungen = await PruefungModel.find({ haushaltId: doc._id }).sort({ erstelltAm: -1 });
  return {
    id: String(doc._id),
    bezeichnung: doc.bezeichnung ?? undefined,
    erstelltAm: doc.erstelltAm.toISOString(),
    aktualisiertAm: doc.aktualisiertAm.toISOString(),
    haushalt: daten.haushalt,
    systemSpecificAnswers: daten.systemSpecificAnswers,
    pruefungen: pruefungen.map((p) => ({
      id: String(p._id),
      erstelltAm: p.erstelltAm.toISOString(),
      rechtsstandVersion: p.rechtsstandVersion,
      ergebnisse: JSON.parse(entschluesseln(p.ergebnisseChiffre, konfig.encryptionKey)),
    })),
  };
}

export async function aktualisiereHaushalt(
  userId: string,
  id: string,
  body: Omit<HaushaltSpeichernRequest, 'einwilligung' | 'ergebnisse'>,
  konfig: SpeicherKonfig,
) {
  await verlangtBestaetigteEmail(userId);
  if (!isValidObjectId(id)) throw new NichtGefunden();
  const daten: GespeicherteDaten = {
    haushalt: ergaenzeHaushalt(body.haushalt),
    systemSpecificAnswers: body.systemSpecificAnswers,
  };
  const doc = await HaushaltModel.findOneAndUpdate(
    { _id: id, userId },
    {
      bezeichnung: body.bezeichnung,
      datenChiffre: packen(daten, konfig),
      rechtsstandVersion: body.haushalt.rechtsstandVersion,
      aktualisiertAm: new Date(),
    },
    { new: true },
  );
  if (!doc) throw new NichtGefunden();
  return { id: String(doc._id) };
}

export async function loescheHaushalt(userId: string, id: string): Promise<void> {
  if (!isValidObjectId(id)) throw new NichtGefunden();
  const doc = await HaushaltModel.findOneAndDelete({ _id: id, userId });
  if (!doc) throw new NichtGefunden();
  await PruefungModel.deleteMany({ haushaltId: doc._id });
}
