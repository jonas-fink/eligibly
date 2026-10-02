import mongoose from 'mongoose';

const DB_NAME = 'cursorEligibility';

export async function connectDB(mongoUri: string): Promise<void> {
  try {
    await mongoose.connect(mongoUri, { dbName: DB_NAME });
    console.log(`MongoDB verbunden (db: ${DB_NAME})`);
  } catch (error) {
    console.error('DB-Verbindung fehlgeschlagen:', error);
    process.exit(1);
  }
}

export { DB_NAME };
