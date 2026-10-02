# Design System

Teil von: [SPEC.md](../SPEC.md) — setzt 6.5.3 (Statusdarstellung) und 6.5.4 (Betragsart) um
Stand: v1 (2026-09-08)
Tokens und Komponenten: [`apps/web/src/index.css`](../apps/web/src/index.css) · Visuelle Referenz: Design-Canvas (Artefakt)

Tailwind v4, CSS-first. Kein `tailwind.config.js` — alles steht in `index.css`.

## 1. Haltung

Die Menschen, die diese App benutzen, tun das unter finanziellem Druck — oft am Telefon, oft nebenbei, manchmal zum wiederholten Mal nach einer Ablehnung.

**Ruhig** heißt: nichts blinkt, nichts drängt, nichts wertet. **Ermutigend** heißt: der nächste Schritt ist immer sichtbar. Beides zusammen verbietet zwei naheliegende Register — die Betulichkeit einer Wohlfühl-App und die Distanz eines Behördenformulars.

Drei Sätze, aus denen sich der Rest ableitet:

1. **Der Fehler liegt nie beim Nutzer.** „Uns fehlen für dein Bundesland die Werte", nicht „deine Angaben reichen nicht".
2. **Ein Prüfergebnis ist kein Fehler.** „Kein Anspruch" ist eine Auskunft. Deshalb kommt in keinem Ergebnis Rot vor.
3. **Was unsicher ist, wird als unsicher gezeigt.** Keine Zahl, die belastbarer aussieht, als sie ist.

## 2. Farbe

### 2.1 Barrierefreiheit ist gerechnet, nicht geschätzt

Zielniveau ist **WCAG 2.1 AA**, verbindlich. Jeder Farbwert in `index.css` trägt sein gemessenes Kontrastverhältnis als Kommentar. Wer eine Farbe ändert, rechnet sie neu nach — das Verfahren steht in 6.

Erreicht: alle Textfarben ≥ 4,5:1 gegen Seitenfläche und gegen Weiß; alle Ränder bedienbarer Elemente ≥ 3:1 (WCAG 1.4.11).

### 2.2 Die Marke darf keine Statusbedeutung tragen

Die Statusrollen belegen Grün, Amber und Blau. Eine Marke in einer dieser Farben würde ständig mit einer Ergebnisaussage kollidieren. Deshalb ist `--color-brand` ein **warmes Ziegelrot** — warm genug für „ermutigend", und semantisch frei.

### 2.3 Rot hat zwei Aufgaben

`--color-error` erscheint bei **Eingabefehlern in Formularen** und am Schalter `.btn-gefahr` für das unwiderrufliche Löschen des Kontos. In keiner Ergebniskarte, unter keinem Status. Der Status `nein` trägt die neutrale Rolle. Die Löschfarbe bewertet keine Leistung, sie markiert eine Handlung, die Daten zerstört.

Diese Regel ist leicht zu brechen, ohne es zu merken: Der erste Entwurf des Design-Systems hatte ausgerechnet auf der Karte, die diese Regel erklärt, einen roten Rand.

### 2.4 Vier Rollen für fünf Status

Die Rolle hängt **nicht allein am Status**. Bei `nachrangig` entscheidet der Grund mit:

| Status | Grund | Rolle | Warum |
|---|---|---|---|
| `ja` | — | `ja` | Anspruch wahrscheinlich |
| `vielleicht` | — | `vielleicht` | Grenzbereich, Antrag lohnt sich |
| `nein` | — | `neutral` | Auskunft, kein Fehler |
| `nachrangig` | `ausschluss` | `neutral` | eine Einschränkung: „daneben gibt es kein Wohngeld" |
| `nachrangig` | `vermeidung` | **`ja`** | eine gute Nachricht: „dein Bedarf ist bereits gedeckt" |
| `nicht_pruefbar` | — | `info` | die Lücke liegt bei uns |

```ts
export type Rolle = 'ja' | 'vielleicht' | 'neutral' | 'info';

export function statusRolle(
  status: EligibilityStatus,
  grund?: 'ausschluss' | 'vermeidung',
): Rolle {
  switch (status) {
    case 'ja':             return 'ja';
    case 'vielleicht':     return 'vielleicht';
    case 'nein':           return 'neutral';
    case 'nicht_pruefbar': return 'info';
    case 'nachrangig':     return grund === 'vermeidung' ? 'ja' : 'neutral';
  }
}
```

Die Rolle geht als `data-rolle` an den Karten-Container; `.ergebnis` und `.status-pille` leiten Fläche, Rand und Akzent daraus ab. Damit ist die Zuordnung an genau einer Stelle im Code und nicht in jeder Komponente neu.

### 2.5 Farbe trägt nie allein

Jeder Status führt **Icon und Textlabel**. Für Farbfehlsichtigkeit, für schlechte Displays, für grelles Tageslicht auf dem Weg zum Amt. Die Klasse `.status-pille` enthält deshalb nur die Farbgebung — das Icon steht als eigenes SVG daneben und ist nicht optional.

Icons sind Inline-SVG auf 24er-Raster, Strichstärke 1,75, nie Emoji. Der Satz ist bewusst unterscheidbar auch ohne Farbe: Häkchen (`ja`), Waage (`vielleicht`), Minus im Kreis (`nein` — kein X, X liest sich als Fehler), Pfeil im Kreis (`nachrangig`), Fragezeichen (`nicht_pruefbar`).

## 3. Schrift

**Literata** für Überschriften, **Source Sans 3** für alles Übrige. Beide über Google Fonts, beide mit vollständigen deutschen Diakritika. Literata ist eine Leseschrift — sie wirkt ruhig, ohne behördlich zu sein.

`--text-base` ist **18 px, nicht 16**. Die App wird oft auf kleinen, alten Displays und unter Druck gelesen; die zwei Pixel kosten nichts. Die Skala darüber und darunter ist entsprechend verschoben — wer `text-base` schreibt, bekommt 18 px.

Beträge stehen in `--font-display` mit `tabular-nums`: gleiche Ziffernbreite, damit Zahlen untereinander vergleichbar bleiben. Die Utility dafür ist `betrag`.

## 4. Bedienbarkeit

**48 px Mindestgröße** für jedes Bedienelement (Utility `bedienbar`, in `.btn` bereits enthalten). WCAG verlangt 44 — auf dem Telefon, mit klammen Händen, sind 48 die ehrlichere Zahl.

**Der Fokusring gilt global**, nicht als Opt-in-Klasse: `:focus-visible` in `@layer base`. Ein dunkler Ring mit 2 px Abstand.

Warum nicht in einer Semantikfarbe: Auf dem Primärbutton käme ein Fokus-Blau auf 1,19:1, das Info-Blau sogar auf 1,08:1 — beides praktisch unsichtbar. Der dunkle Ring liegt durch den Abstand immer auf der hellen Seitenfläche und trägt dort 15,1:1. **Käme je eine dunkle Fläche dazu, bräuchte er einen zweiten, hellen Innenring.**

`prefers-reduced-motion` wird respektiert.

## 5. Sprache

| So | Nicht so |
|---|---|
| „Uns fehlen für dein Bundesland die Werte." | „Deine Angaben reichen nicht aus." |
| „Was tatsächlich auf deinem Konto ankommt." | „Nettoerwerbseinkommen gemäß § 11 SGB II" |
| „Dein Bedarf ist gedeckt." | „Kein Anspruch (nachrangig)" |

Du, nicht Sie. Aktiv, wo es geht. Fachbegriffe nur dort, wo sie auch auf dem Antragsformular stehen — dann aber genau so, damit man sie wiedererkennt.

**Fehlertexte nennen nie den eingegebenen Wert.** „5 Ziffern erwartet", nicht „'1234' ist keine gültige PLZ" — Fehlerobjekte landen in Protokollen ([architektur.md](architektur.md) 5.3, 11.2).

## 6. Farben ändern

Die Werte sind in OKLCH definiert und nach sRGB umgerechnet. Wer eine Farbe anfasst, prüft vier Verhältnisse:

1. gegen `--color-surface` (`#fbfaf7`) — ≥ 4,5:1 für Text
2. gegen `--color-card` (`#ffffff`) — ≥ 4,5:1 für Text
3. Weiß darauf, falls die Farbe je Hintergrund einer Schaltfläche wird — ≥ 4,5:1
4. für Ränder bedienbarer Elemente — ≥ 3:1 gegen beide Flächen

Eine getönte Fläche (`*-soft`) muss zusätzlich den Text darauf tragen: `--color-ink` darauf ≥ 4,5:1, und die zugehörige Kernfarbe darauf ebenfalls ≥ 4,5:1, weil sie dort als Pillentext steht.

## 7. Was bewusst fehlt

**Kein Dark Mode.** Die gesamte Kontrastrechnung setzt helle Flächen voraus, und der Fokusring funktioniert nur deshalb einfarbig. Ein dunkles Thema ist kein Umschalten von Variablen, sondern eine zweite, eigenständig zu prüfende Palette samt zweifarbigem Fokusring. Wenn es kommt, dann als eigene Arbeit — nicht nebenbei.

**Keine Animationen** außer Zustandsübergängen an Schaltflächen. Nichts in dieser App muss sich bewegen, um verstanden zu werden.

**Kein Icon-Set als Abhängigkeit.** Fünf Statusicons plus eine Handvoll Bediensymbole sind als Inline-SVG billiger als ein Paket, das gepflegt werden will.

## 8. Offene Punkte

- [ ] Kontobereich und Fehlerseiten sind noch nicht gestaltet — kommen beim Bau dazu
- [ ] Leerzustände: gespeicherte Prüfungen, wenn noch keine da ist
- [ ] Ladezustände während der Prüfung — die Berechnung läuft serverseitig und dauert spürbar
- [ ] Der Hinweis auf einen veralteten Rechtsstand ([architektur.md](architektur.md) 12.2) braucht eine eigene Darstellung
- [x] **Druckansicht des Reports** — **entschieden**: eigene Druckansicht über `@media print`, **ohne Login und ohne serverseitige PDF-Erzeugung**. Wer will, druckt sie oder speichert sie über den Browser als PDF. Begründung: Eine serverseitige PDF-Erzeugung hielte den vollständigen Haushalt samt Finanzdaten für die Dauer des Renderings im Speicher — für einen Komfortgewinn, den der Browser ohnehin bietet. Inhalt der Druckansicht: alle Ergebniskarten, die Unterlagen-Checkliste je Anspruch, die zuständigen Stellen, Rechtsstand und Disclaimer. Ohne Navigation, ohne Schaltflächen, schwarz auf weiß lesbar
- [ ] Druck-Stylesheet ausarbeiten: Seitenumbrüche zwischen Ergebniskarten (`break-inside: avoid`), Farbflächen in Graustufen prüfen, Statusicons müssen ohne Farbe unterscheidbar bleiben
- [ ] Icon-Satz vollständig zeichnen (bisher nur die fünf Statusicons)
