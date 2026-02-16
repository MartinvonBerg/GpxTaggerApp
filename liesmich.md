# GpxTaggerApp – Foto-Geotagging und GPX-Viewer

Electron-Panes ist eine Desktop-Anwendung auf Basis von Electron, mit der du:

- Fotos aus einem Ordner einlesen und EXIF-Metadaten anzeigen kannst
- GPX-Tracks laden und auf einer Leaflet-Karte darstellen kannst
- Fotos mit GPS-Informationen (Geotagging) versehen oder vorhandene GPS-Daten anpassen kannst
- Metadaten (Titel, Beschreibung, GPS) zurück in die Bilddateien schreiben kannst

## Voraussetzungen

- **Betriebssystem**: Windows, macOS oder Linux
- **Node.js**: Empfohlen LTS-Version (z.B. 20.x)
- **ExifTool**: Muss im System installiert und im `PATH` verfügbar sein  
  (d.h. der Befehl `exiftool` muss im Terminal / in der Eingabeaufforderung funktionieren).
- **exiftool-vendored** bringt aber ExifTool in den node-modulen mit. 

## Disclaimer

Dieses Tool ist kein professionelles Tool. Es gibt andere Tools, die denselben Zweck erfüllen:

- PhotoLocator - https://github.com/meesoft/PhotoLocator - OSS, nur für Windows (derzeit mein Favorit)
- darktable - https://www.darktable.org/ - OSS
- GeoTagNinja  - https://github.com/nemethviktor/GeoTagNinja - OSS, nur für Windows
- Lightroom - immer noch das beste, wegen der unverschämten Preispolitik für micht nicht mehr nurtzbar.
- Es gibt noch viele weitere Tool für Linux, mac und Windows, die mir persönlich aber nicht zusagten, aber das ist Geschmackssache.

Diese App wurde mit starker Verwendung diverser KI-Tools entwickelt: Sourcery, chatGPT, MS Copilot, Windsurf, GitLens und gelegentlich der guten alten Google-Suche.

## Installation (Entwickler-Setup)

1. Repository klonen oder Quellcode herunterladen.
2. Im Projektordner die Abhängigkeiten installieren:

   ```bash
   npm install
   ```
3. Entwicklungsmodus starten:
    ```bash
    npm run all
    ``` 
4. Anwendung bauen (derzeit nur für Windows in der package.json)
    ```bash
    npm run package
    ```  
    Die *.exe befindet sich in Projektordner\dist\GpxTaggerApp-win32-x64. TODO für Linux und maxOS.

    Hinweis: Die erstellte Dist ist riesig (ca 1GB), daher wird auch kein Release bereitgestellt. Da ist noch Potential für Optimierung!

## Start der Anwendung (aus der IDE oder als EXE)
Nach dem Start öffnet sich das Hauptfenster mit:


- linker Sidebar: GPX-Track-Informationen und Geotagging-Controls
- mittlerer Bereich: Leaflet-Karte und ggf. ein Track-Chart, falls zuvor ausgewählt.
- unterer Bereich: Thumbnail-Leiste mit deinen Bildern, falls zuvor ausgewählt
- rechter Sidebar: Metadaten zum aktuell ausgewählten Bild
- falls keine Bilder und GPX-Track ausgewählt wurde, bleiben die Bereich leer. Die Karte wird in der letzten Ansicht angezeigt.

Die Anwendung merkt sich die zuletzt verwendete Fenstergröße, Position, Sprache und Pfade (Einstellungen werden als JSON im Benutzerverzeichnis und
nicht im Projektordner gespeichert, damit diese bei einem neuen Build nicht verloren gehen).

### Sprache / Lokalisierung
Die App erkennt die Systemsprache (app.getLocale()).
Unterstützte Sprachen je nach Konfiguration im Ordner locales/<sprache>/translation.json.
Derzeit ist nur eine Übersetzung für DE und EN vorhanden. Fallback-Sprache ist Englisch. 

### Debug Logging
Sowohl beimn Start aus der IDE als auch als EXE werden Debugging-Information in die Datei `geotagger.log` geschrieben. 
Die Pfade sind:
- Windows: `C:\Users\<USERNAME>\AppData\Roaming\<AppName>\geotagger.log`
- Linux: `/home/<USERNAME>/.config/<AppName>/geotagger.log`
- macOS: `/Users/<USERNAME>/Library/Application Support/<AppName>/geotagger.log`

Das Feature kann derzeit nicht abgeschalten werden.

# Typischer Workflow

## Bilder auswählen

**Menü:** `Image Folder → Select Folder`

Wähle zu Beginn einen Ordner mit Bildern. Unterstützte Dateiendungen u. a.:

* `jpg`
* `webp`
* `avif`
* `heic`
* `tiff`
* `dng`
* `nef`
* `cr3`

Die Endungen können in der `user-settings.json` definiert werden. Diese befindet sich im selben Pfad wie die Log-Datei (siehe oben).
```json
"extensions": [
    "jpg",
    "webp",
    "avif",
    "heic",
    "tiff",
    "dng",
    "nef",
    "cr3"
  ],
```

### Ablauf

Die App:

1. liest alle Dateien im Ordner, was mit 'Abort' abgebrochen werden kann. Es kann etwas dauern, v.a. beim ersten Mal, da dabei Thumbnails zur Anzeige erzeugt werden. Es gibt keine Fortschrittsanzeige.
2. filtert nach gefundenen Erweiterungen und nicht-/vorhandenen GPS-Daten und "innerhalb" des gewählten GPX-Tracks.
3. extrahiert EXIF-Metadaten mit `exiftool-vendored`
4. erzeugt Thumbnails-Dateien, falls in den Bilddateien enthalten, sonst nicht.
5. sortiert Bilder nach `DateTimeOriginal`.
6. zeigt:

   * eine Thumbnail-Leiste im unteren Bereich
   * Metadaten des ersten Bildes in der rechten Sidebar. Dort kann GPX, Titel und Beschreibung editiert werden. Anschließend sollte gleich mit dem Button unterhalb gespeichert werden, siehe weiter unten.

**Ordner rücksetzen:** `Image Folder → Reset Folder`

### Performance-Logs (Konsole)

Falls das Browser-DevTools/Terminal geöffnet ist, werden Ladezeiten angezeigt für:

* Einlesen der Dateiliste
* EXIF-Extraktion
* Sortierung
* Index-Zuweisung

---

## GPX-Track laden

**Menü:** `GPX Track → Open GPX File`

Eine `.gpx`-Datei auswählen.

### Die App:

* lädt den Track und zeigt ihn auf der Karte
* berechnet Trackinformationen:

  * Anzahl Trackpunkte
  * Start-/Enddatum
  * Start-/Endzeit
  * Dauer
  * Zeitzone und UTC-Offset
* zeigt Trackinfos in der linken Sidebar und bei Aktivierung die Anzahl der Bilder, die innerhalb des Tracks liegen (Zuordnung über die Zeit).

**Track entfernen:**

`GPX Track → Clear GPX File`

---

## Geotagging über GPX und exiftool

Für Bilder ohne GPS-Daten:

### Voraussetzungen

* Bilder ausgewählt und GPX-Datei geladen, siehe oben.

### Ablauf

1. In linker Sidebar (Tracklog-Bereich):

   * Zeitverschiebung angeben (falls Kamera-Uhrzeit von Tracklog abweicht)
   * TIPP: Am besten zu Beginn des Tracks ein Foto von dem verwendeten Gerät mit Uhrzeit machen, dann ist die Abweichung dokumentiert.
   * RESET-Button klicken, um die Verschiebung auf Null zu setzen, wenn keine Zeitabweichung, oder diese nicht mehr rekonstruiert werden kann.
2. Geotagging mit Klick auf Button starten:

   * Aufruf im Main-Prozess:

     ```
     geotagImageExiftool(gpxPath, imagePath, options)
     ```
3. ExifTool schreibt GPS-Daten unmittelbar anhand Zeitstempel. Exiftool erzeugt auch ein Backup im selben Ordner, welches bei Fehlern zurückgeschrieben werden kann.

4. Nach Abschluss werden die Bilder neu geladen und auf der Karte angezeigt. DIe Prüfung des Ergebnisses ist damit möglich.

#### Nach erfolgreichem Lauf

* Bildstatus → `geotagged`
* Thumbnail-Markierung wird angepasst
* Metadaten neu laden (`Reload Data`), wird automatisch ausgelöst.

---

## Geotagging OHNE GPX-Track

### Ablauf

1. Bilder laden. Diese werden in der Thumbnail rot hinterlegt. Links wird die Anzahl der Bilder OHNE GPS-Daten angzeigt. Falls man Bilder mit GPS-Daten geladen hat UND der Haken zur Anzeige aktiv ist, ist die Anzahl Null. Der Haken muss also deaktiviert sein, um vorhandene GPS-Daten zu überschreiben!
2. Gewünschte Bilder in der Thumbnail aktivieren (einfach oder mehrfach Auswahl)
3. Gewünschten Ort auf der Karte auswählen, entweder direkt oder mit Ortssuche.
4. STRG + Links-Klick weist die GPS-Daten und Höhe den gewählten Bildern zu.
5. Unmittelbares Speichern der neuen Daten mit dem Button in der RECHTEN Sidebar. Es werden nur die gerade AKTIVEN Bilder gespeichert!
6. Prüfung des Ergebnisses: Menüpunkt : Metadaten neu laden (`Reload Data`),

---

## Bilder auf der Karte anzeigen

Sobald Bilder mit GPS-Daten vorhanden sind:

* Marker werden auf der Karte platziert
  (ggf. unterschiedliche Icons für Bild/Video)
* Hover über Marker:

  * Popup mit Bildindex, Titel und Thumbnail
* Klick auf Bild-Marker:

  * Marker wird aktiv (Icon-Farbe/-Form ändert sich)
  * entsprechendes Thumbnail wird aktiviert. Evtl. vorhandene Mehrfachauswahl wird rückgesetzt.

---

## Bilder auswählen

### mittels Thumbnails

**Einfacher Klick:**

* Bild wird aktiv
* Metadaten erscheinen rechts und können editiert werden, siehe unten.
* Achtung: Das Löschen von Titel und Beschreibung ist derzeit nicht möglich.
* Karte zoomt/zentriert (konfigurationsabhängig) auf das aktive Bild.

**Mehrfachauswahl mit Shift-Klick:**

* Shift-Taste + Links-Klick auf erstes und letztes Bild des gewünschten Bereichs: mehrere Thumbnails aktiv markieren
* Metadaten zeigen und editieren (wie bei Einzelbild):

  * gemeinsame Werte als Wert, wenn diese identisch sind.
  * oder `multiple` bei unterschiedlichen Werten.
  * Die Werte können überschrieben werden und sollten anschließend unmittelbar gespeichert werden. Achtung: Die Änderungen werden NUR übernommen, wenn abschließend zu JEDEM Eingabefeld `ENTER` gedrückt wird!
  * Achtung: Das Löschen von Titel und Beschreibung ist derzeit nicht möglich. (Oder man gibt einfach '' oder ein Leerzeichen '_'. ein.)

---

### Über die Karte

**Klick auf Marker:**

* löst `mapmarkerclick`-Event aus
* aktiviert entsprechendes Thumbnail
* aktualisiert Metadaten in der Sidebar

---

## Metadaten bearbeiten (rechte Sidebar)

Bearbeitbare Felder (für ein oder mehrere Bilder):

Achtung: Die Änderungen werden NUR übernommen, wenn abschließend zu JEDEM Eingabefeld `ENTER` gedrückt wird! Das Löschen von Titel und Beschreibung ist derzeit nicht möglich.

### GPS-Position (Lat/Lon)

* Eingabe z. B.:
  `48.8588443, 2.2943506`
* unterstützt Formate, die `coordinate-parser` versteht
* `Enter`:

  * bestätigt
  * konvertiert in normalisiertes Format
  * Status z. B. `gps-manually-changed`, welches als andere Farbe in der Thumbnail-bar angezeigt wird.

### Höhe (Altitude) & Richtung (Direction)

* numerische Eingaben, Bereichsprüfung aktiv, sonst wie bei GPS.

### Titel & Beschreibung

* Textfelder
* Speichern per:

  * `Enter`
  * Speichern-Button

---

### Verhalten bei Mehrfachauswahl

* Unterschiedliche Werte → Anzeige `multiple`
* Änderungen können auf alle ausgewählten Bilder angewendet werden

---

## Metadaten speichern

Nach Änderungen:

**Button:** `Accept / Speichern`

### Ablauf

1. Sammeln der geänderten Felder
2. Validierung:

   * GPS-Format
   * Höhenbereich
   * etc.
3. Senden an Main-Prozess (`save-meta-to-image`)
4. Schreiben in Datei via `exiftool.write`

### Fortschritt

IPC-Events:

* `save-meta-progress`

  * `done`
  * `error`
  * `skipped`

---

### Beenden mit offenen Änderungen

Dialogoptionen:

* **Save**

  * schreibt nicht gespeicherte Metadaten
  * beendet danach die App
* **Discard**

  * verwirft Änderungen
  * beendet sofort

---

## Menü-Übersicht

### File

* `Reload` (Dev/Test) – UI neu laden
* `Reload Data` – Bilddaten erneut einlesen
* `Quit` – Anwendung beenden

### GPX Track

* `Open GPX File`
* `Clear GPX File`

### Image Folder

* `Select Folder`
* `Clear Image Folder`

### Development (nur Dev-Modus)

* `Open DevTools` (F12)

---

## Tastatur- & Interaktionshinweise

* **Shift + Klick (Thumbnail)**
  → Bereichsauswahl

* **Rechtsklick (Thumbnail)**
  → Mehrfachauswahl-Modus

* **Shift + Pfeil links/rechts** (bei Fokus auf Thumbnail-Bar)
  → aktive Auswahl verschieben

---

## Fehlerbehandlung & Logs

### Log-Datei (Main-Prozess)

Beispielsweise für:

* EXIF-Ladefehler
* ExifTool-Ausführungsfehler
* Datei-/Pfadprobleme

### Typische Fehlerdialoge

* `GpxFileNotFound`
* `ImageFileNotFound`
* `NoExiftool`

---

## Bekannte Einschränkungen
* Die App war mehr zur Elernung von electron gedacht. Die App ist funktionsfähig hat aber ihre Macken und muss dann neu gestartet werden.
Abstürze sind nicht zu erwarten. Es gibt auch noch einige TODOs, die in den jeweiligen *.js - Dateien enthalten sind, diese sind aber alle keine "Showstopper". Haupterkenntnis: Ohne saubere Architektur, API-Definitionen und Vor-Entwicklung wird es eben doch ziemlicher Spaghetti-Code.
* Große Bildordner (Hunderte/Tausende Dateien, HDD/USB3)
  → Einlesen & Thumbnail-Erzeugung kann mehrere Sekunden dauern
* ExifTool muss installiert und erreichbar sein
* Einige Event-Listener (z. B. Thumbnail-Bar) werden bewusst nicht entfernt, da die UI-Struktur stabil bleibt
