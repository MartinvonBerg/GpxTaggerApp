import json
import requests
import sys
import base64
from pathlib import Path
import re

# This is a simple script to send an image and a prompt to an Ollama LLM and print the response. Just for testing it.
# TODO:  Aufnahmedatum/-uhrzeit aus der Datei auslesen und zum Prompt ergänzen
# TODO:  GPS-Coords aus der Datei auslesen, Reverse Geocoding ausführen und zum Prompt ergänzen. Fallback ist ein leerer String.
# Ergänzung in dieser Form zum Prompt:
# Zusatzinformationen zum Bild:
# - Aufnahmedatum/-uhrzeit	14.11.2025 - 16:35:42
# - Ort: Scilla, Kalabrien, Italien

class OllamaClient:
    def __init__(self, config: dict):
        self.base_url = config["ollama"]["base_url"]
        self.model = config["ollama"]["model"]
        self.timeout = config["ollama"].get("timeout", 120)
        self.generation = config["generation"]

    def generate(self, prompt: str, image_path: Path) -> str:
        url = f"{self.base_url}/api/generate"

        # Bild laden und Base64 kodieren
        try:
            with open(image_path, "rb") as img_file:
                encoded_image = base64.b64encode(img_file.read()).decode("utf-8")
        except Exception as e:
            print(f"Fehler beim Laden des Bildes: {e}")
            sys.exit(1)

        payload = {
            "model": self.model,
            "prompt": prompt,
            "images": [encoded_image],
            "stream": self.generation.get("stream", False),
            "options": {
                "temperature": self.generation.get("temperature", 0.3),
                "top_p": self.generation.get("top_p", 0.9)
            }
        }

        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Fehler bei der Anfrage an Ollama: {e}")
            sys.exit(1)

        data = response.json()

        if "response" in data:
            return data["response"]
        else:
            print("Unerwartetes Antwortformat von Ollama:")
            print(data)
            sys.exit(1)


def load_json_config(path: Path) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Fehler beim Laden der Konfigurationsdatei: {e}")
        sys.exit(1)


def load_prompt(path: Path) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Fehler beim Laden der Prompt-Datei: {e}")
        sys.exit(1)

def extract_json_from_response(response_text: str) -> dict:
    """
    Extrahiert JSON aus einer LLM-Antwort, entfernt Markdown-Code-Fences
    und parsed das Ergebnis sicher.
    """

    # 1. Entferne ```json ... ``` oder ``` ... ```
    cleaned = re.sub(r"```json\s*", "", response_text)
    cleaned = re.sub(r"```", "", cleaned)

    cleaned = cleaned.strip()

    # 2. Falls noch Text vor/nach dem JSON steht → nur {...} extrahieren
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("Kein gültiges JSON-Objekt gefunden.")

    json_str = match.group(0)

    # 3. Parsen
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON Parsing Fehler: {e}")

def main():
    if len(sys.argv) < 2:
        print("Verwendung: python main.py <bildpfad>")
        sys.exit(0)

    image_path = Path(sys.argv[1])

    if not image_path.exists():
        print("Fehler: Bilddatei existiert nicht.")
        sys.exit(1)

    base_path = Path(__file__).parent
    config_path = base_path / "config.json"
    prompt_path = base_path / "prompt_de.txt"

    config = load_json_config(config_path)
    prompt = load_prompt(prompt_path)

    client = OllamaClient(config)

    print(f"Sende Bild '{image_path.name}' an Ollama...\n")
    result = client.generate(prompt, image_path)
    print(result)
    
    # parse the result as JSON
    try:
        asjson = extract_json_from_response(result)
    except json.JSONDecodeError as e:
        print(f"Fehler beim Parsen der Antwort: {e}")
        sys.exit(0)

    if config["output"].get("print_raw_response", True):
        print("Antwort vom Modell:\n")
        print(asjson)

if __name__ == "__main__":
    main()