import { tageBisAblaufNeuesterStand } from './index.js';

const tage = tageBisAblaufNeuesterStand();
if (tage < 60) {
  console.warn(
    `Rechtsstand: neuestes Konstanten-Set laeuft in ${tage} Tagen ab. Neues Set anlegen.`,
  );
  process.exitCode = 0;
} else {
  console.log(`Rechtsstand: noch ${tage} Tage bis zum Ablauf des neuesten Sets.`);
}
