export class KontoExistiert extends Error {
  constructor() {
    super('Konto existiert');
    this.name = 'KontoExistiert';
  }
}

export class AnmeldungFehlgeschlagen extends Error {
  constructor() {
    super('Anmeldung fehlgeschlagen');
    this.name = 'AnmeldungFehlgeschlagen';
  }
}

export class EmailNichtBestaetigt extends Error {
  constructor() {
    super('E-Mail nicht bestaetigt');
    this.name = 'EmailNichtBestaetigt';
  }
}

export class TokenUngueltig extends Error {
  constructor() {
    super('Token ungueltig');
    this.name = 'TokenUngueltig';
  }
}

export class MailNichtZugestellt extends Error {
  constructor() {
    super('E-Mail nicht zugestellt');
    this.name = 'MailNichtZugestellt';
  }
}

export class NichtGefunden extends Error {
  constructor() {
    super('Nicht gefunden');
    this.name = 'NichtGefunden';
  }
}
