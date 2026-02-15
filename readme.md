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
Nach dem Start öffnet sich das Hauptfenster mit: hier geht es weiter!---------------------


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

### Typischer Workflow
1. Bildordner auswählen
Menü: Image Folder → Select Folder
Einen Ordner mit Bildern auswählen (unterstützte Endungen u.a. jpg, webp, avif, heic, tiff, dng, nef, cr3).
Die App:
liest alle Dateien im Ordner
filtert nach den erlaubten Erweiterungen
extrahiert EXIF-Metadaten mit exiftool-vendored
erzeugt (optional) Thumbnails
sortiert Bilder nach Aufnahmedatum (DateTimeOriginal)
zeigt eine Thumbnail-Leiste im unteren Bereich
zeigt Metadaten des ersten Bildes in der rechten Sidebar
Du siehst in der Konsole (falls DevTools/Terminal offen) die Ladezeiten für:

Einlesen der Dateiliste
EXIF-Extraktion
Sortierung
Index-Zuweisung
2. GPX-Track laden
Menü: GPX Track → Open GPX File
Eine .gpx-Datei auswählen.
Die App:
lädt den Track und zeigt ihn auf der Karte
berechnet Trackinformationen:
Anzahl Trackpunkte
Datum Start/Ende
Start-/Endzeit
Dauer
Zeitzone und UTC-Offset
zeigt die Trackinfos in der linken Sidebar
Du kannst den GPX-Track jederzeit mit GPX Track → Clear GPX File wieder entfernen.

3. Bilder auf Karte anzeigen
Sobald Bilder mit GPS-Daten vorhanden sind:

Marker werden auf der Karte platziert (Unterscheidung ggf. Bild/Video-Icons).
Hover über einen Marker öffnet ein Popup mit:
Bildindex und Titel
Thumbnail
Klick auf einen Marker:
setzt den Marker als aktiv (andere Iconfarbe/-form)
synchronisiert mit der Thumbnail-Leiste (Thumbnail wird aktiv)
4. Bilder über Karte oder Thumbnails auswählen
Über Thumbnails:

Klick auf ein Thumbnail → Bild wird aktiv:
Metadaten des Bildes erscheinen rechts.
Karte zoomt/zentriert (abhängig von Konfiguration) auf die Koordinate des Bildes.
Shift-Klick / Rechtsklick → Mehrfachauswahl:
mehrere Thumbnails können als aktiv markiert werden.
Metadaten rechts zeigen gemeinsame/abweichende Werte (z.B. „multiple“).
Über Karte:

Klick auf Marker:
löst ein mapmarkerclick-Event aus
setzt das entsprechende Thumbnail aktiv
aktualisiert Metadaten rechts
5. Metadaten bearbeiten (rechte Sidebar)
In der rechten Sidebar kannst du für das/ die ausgewählten Bilder u.a. bearbeiten:

GPS-Position (Lat/Lon):
Eingabeformate wie 48.8588443, 2.2943506 oder andere, die coordinate-parser versteht.
Enter bestätigt und konvertiert in ein normalisiertes Format.
Der Status wechselt zu z.B. gps-manually-changed.
Höhe (Altitude) und Richtung (Direction):
numerische Eingaben mit Bereichsprüfung.
Titel und Beschreibung:
Textfelder, Eingabe mit Enter oder über den Speichern-Button.
Bei Mehrfachauswahl:

Felder mit unterschiedlichen Werten zeigen multiple.
Änderungen können auf alle ausgewählten Bilder übernommen werden.
6. Metadaten speichern
Nach Anpassung von Metadaten:

Button Accept / Speichern in der rechten Sidebar:
sammelt die geänderten Felder
validiert Werte (GPS-Format, Höhenbereich, etc.)
sendet die Daten an den Main-Prozess (save-meta-to-image)
dort übernimmt exiftool.write das Schreiben in die Bilddateien
Fortschritt wird ggf. über IPC-Events in der UI angezeigt:
save-meta-progress mit Status (done, error, skipped).
Beim Beenden mit offenen Änderungen:

Es erscheint ein Dialog:
Save → Metadaten werden geschrieben, App beendet danach.
Discard → Änderungen gehen verloren, App beendet sofort.
7. Geotagging über GPX
Für Bilder ohne GPS-Daten kannst du exiftool mit einem GPX-Track verwenden:

GPX-Datei ist geladen.
Bilder sind ausgewählt (z.B. via Thumbnail-Leiste).
In der linken Sidebar im Tracklog-Bereich:
Zeitdifferenz (tzoffset) angeben, falls Uhrzeit der Kamera nicht exakt passt.
Button zum Starten von ExifTool-Geotagging:
geotagImageExiftool(gpxPath, imagePath, options) wird im Main-Prozess aufgerufen.
ExifTool schreibt GPS-Infos anhand der Zeitstempel in die Bilder.
Nach erfolgreichem Lauf:
Bildstatus wird auf geotagged gesetzt.
Thumbnail-Farbe/Markierung wird angepasst.
Optional Neu-Laden der Metadaten (z.B. über „Reload data“).
Menüübersicht
File
Reload (Dev/Test): lädt die UI neu.
Reload Data: liest die Bilddaten aus dem zuletzt genutzten Ordner erneut ein.
Quit: beendet die Anwendung.
GPX Track
Open GPX File: GPX-Datei laden.
Clear GPX File: GPX-Datei entfernen, Karte bleibt ohne Track.
Image Folder
Select Folder: Bildordner wählen und Bilder einlesen.
Clear Image Folder: aktuellen Bildordner vergessen und UI zurücksetzen.
Development (nur im Dev-Modus)
Open DevTools: öffnet die Browser-Entwicklertools (F12).
Tastatur-/Interaktionshinweise
Shift + Klick auf Thumbnail: Bereichsauswahl zwischen vorherigem und aktuellem Thumbnail.
Rechtsklick auf Thumbnail: initialisiert Mehrfachauswahl-Modus.
Shift + Pfeil links/rechts (bei Fokus auf Thumbnail-Bar):
verschiebt die aktive Auswahl um ein Bild nach links/rechts.
Fehlerbehandlung & Logs
Logs im Main-Prozess werden in eine Datei geschrieben (über logStream), z.B. für:
EXIF-Ladefehler
ExifTool-Ausführungsfehler
Datei-/Pfadprobleme
Typische Fehlerdialoge:
GpxFileNotFound: GPX-Datei fehlt.
ImageFileNotFound: Bilddatei fehlt.
NoExiftool: ExifTool nicht gefunden.
Bekannte Einschränkungen
Bei sehr großen Bildordnern (Hunderte/ Tausende Bilder, HDD/USB3) kann das initiale Einlesen und Erzeugen von Thumbnails einige Sekunden dauern.
ExifTool muss im System installiert und erreichbar sein; sonst sind Geotagging und Schreiben von Metadaten begrenzt.
Einige Event-Listener (z.B. Thumbnail-Bar) werden bewusst nicht entfernt, da die UI-Struktur über die Laufzeit stabil bleibt.