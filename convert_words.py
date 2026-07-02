"""将 Excel 词汇表转换为 JSON 单词库"""
import json
import sys
from pathlib import Path

import pandas as pd

EXCEL_PATH = Path(r"C:\Users\14897\Desktop\雅思IELTS词汇大全 正序版.xlsx")
OUTPUT_PATH = Path(__file__).parent / "data" / "words.json"


def convert():
    if not EXCEL_PATH.exists():
        print(f"错误：找不到文件 {EXCEL_PATH}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_PATH, header=0)
    df.columns = ["id", "word", "us_phonetic", "uk_phonetic", "meaning"]

    words = []
    for _, row in df.iterrows():
        word = str(row["word"]).strip()
        if not word or word == "nan":
            continue
        words.append({
            "id": int(row["id"]) if pd.notna(row["id"]) else len(words) + 1,
            "word": word,
            "uk_phonetic": str(row["uk_phonetic"]).strip() if pd.notna(row["uk_phonetic"]) else "",
            "us_phonetic": str(row["us_phonetic"]).strip() if pd.notna(row["us_phonetic"]) else "",
            "meaning": str(row["meaning"]).strip() if pd.notna(row["meaning"]) else "",
        })

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"成功转换 {len(words)} 个单词 → {OUTPUT_PATH}")


if __name__ == "__main__":
    convert()
