#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для генерации визуального контента через OpenAI DALL-E.
Запуск: OPENAI_API_KEY=sk-... python scripts/generate_visuals.py
Сохраняет изображения в frontend/public/images/
"""

import os
import sys
from pathlib import Path

# На macOS Python часто не видит корневые сертификаты — подключаем certifi
CA_BUNDLE = None
try:
    import certifi
    CA_BUNDLE = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", CA_BUNDLE)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", CA_BUNDLE)
except ImportError:
    pass

# Добавляем корень проекта в path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.chdir(Path(__file__).resolve().parent.parent.parent)

def main():
    try:
        from openai import OpenAI
    except ImportError:
        print("Установите openai: pip install openai")
        return 1

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        print("Задайте OPENAI_API_KEY в окружении")
        return 1

    output_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "images"
    output_dir.mkdir(parents=True, exist_ok=True)

    client = OpenAI(api_key=key)

    # Промпты для B2B SaaS — номенклатура, документы, маркировка
    prompts = [
        ("hero-dashboard", "Modern SaaS dashboard on laptop screen showing product catalog, QR codes and analytics charts. Clean interface, soft blue accent, professional B2B style. No text on screen."),
        ("office-team", "Diverse professional team in bright modern office collaborating, laptops and documents. Warm natural light, confident atmosphere."),
        ("warehouse-qr", "Modern warehouse with worker scanning QR code on product box. Clean organized shelves, natural light, professional logistics."),
    ]

    for name, prompt in prompts:
        out_path = output_dir / f"{name}.png"
        if out_path.exists():
            print(f"Пропуск {name} — уже есть")
            continue
        print(f"Генерация: {name}...")
        try:
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            url = resp.data[0].url
            import httpx
            verify = CA_BUNDLE or True
            r = httpx.get(url, timeout=30, verify=verify)
            r.raise_for_status()
            out_path.write_bytes(r.content)
            print(f"  Сохранено: {out_path}")
        except Exception as e:
            print(f"  Ошибка: {e}")

    print("Готово.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
