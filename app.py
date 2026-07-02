"""IELTS 单词背诵应用"""
import json
import webbrowser
from pathlib import Path
from threading import Timer

from flask import Flask, jsonify, send_from_directory

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "words.json"

app = Flask(__name__, static_folder="static")


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/api/words")
def get_words():
    with open(DATA_FILE, encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR / "static", filename)


def open_browser():
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    if not DATA_FILE.exists():
        print("单词库不存在，正在从 Excel 转换...")
        import convert_words
        convert_words.convert()

    print("IELTS 单词背诵应用已启动 → http://127.0.0.1:5000")
    Timer(1.0, open_browser).start()
    app.run(host="127.0.0.1", port=5000, debug=False)
