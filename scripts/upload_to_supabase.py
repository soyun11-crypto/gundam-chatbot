"""
건담 기체 데이터 → Supabase 업로드 + 임베딩 생성
사용법: python scripts/upload_to_supabase.py
"""

import json
import time
import os
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── 환경 설정 ──────────────────────────────────────────────
SUPABASE_URL = "https://aywqnmqgbjqsrparbeyr.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
JSON_FILE = "scripts/gundam_units.json"
EMBED_MODEL = "gemini-embedding-001"
EMBED_DELAY = 0.5


def supabase_request(method: str, path: str, data=None) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    res = requests.request(method, url, headers=headers, json=data, verify=False, timeout=15)
    if not res.ok:
        print(f"  [Supabase 오류] {res.status_code}: {res.text[:200]}")
        return {}
    return res.json() if res.text else {}


def generate_embedding(text: str) -> list[float] | None:
    url = f"https://generativelanguage.googleapis.com/v1/models/{EMBED_MODEL}:embedContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": GEMINI_API_KEY}
    body = {
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 768,
    }
    try:
        res = requests.post(url, headers=headers, params=params, json=body, verify=False, timeout=15)
        if not res.ok:
            print(f"  [임베딩 오류] {res.status_code}: {res.text[:200]}")
            return None
        return res.json()["embedding"]["values"]
    except Exception as e:
        print(f"  [임베딩 예외] {e}")
        return None


def make_embed_text(unit: dict) -> str:
    """임베딩용 텍스트 생성"""
    parts = [f"기체명: {unit['name']}"]
    if unit.get("pilot"):
        parts.append(f"파일럿: {unit['pilot']}")
    if unit.get("series"):
        parts.append(f"등장 시리즈: {unit['series']}")
    if unit.get("unit_type"):
        parts.append(f"기체 유형: {unit['unit_type']}")
    if unit.get("manufacturer"):
        parts.append(f"개발/제조: {unit['manufacturer']}")
    if unit.get("height"):
        parts.append(f"전고: {unit['height']}")
    if unit.get("weight"):
        parts.append(f"중량: {unit['weight']}")
    if unit.get("power_plant"):
        parts.append(f"동력원: {unit['power_plant']}")
    if unit.get("armament"):
        parts.append(f"무장: {unit['armament'][:300]}")
    if unit.get("description"):
        parts.append(f"설명: {unit['description'][:400]}")
    return "\n".join(parts)


def upload_unit(unit: dict) -> int | None:
    """기체 데이터 삽입, unit_id 반환"""
    data = {
        "name": unit["name"],
        "url": unit.get("url", ""),
        "pilot": unit.get("pilot", ""),
        "series": unit.get("series", ""),
        "unit_type": unit.get("unit_type", ""),
        "manufacturer": unit.get("manufacturer", ""),
        "height": unit.get("height", ""),
        "weight": unit.get("weight", ""),
        "power_plant": unit.get("power_plant", ""),
        "armament": unit.get("armament", ""),
        "description": unit.get("description", ""),
        "raw_specs": unit.get("raw_specs", {}),
    }
    result = supabase_request("POST", "gundam_units", data)
    if isinstance(result, list) and result:
        return result[0]["id"]
    return None


def upload_embedding(unit_id: int, content: str, embedding: list[float]):
    supabase_request("POST", "gundam_embeddings", {
        "unit_id": unit_id,
        "content": content,
        "embedding": embedding,
    })


def main():
    if not SUPABASE_SERVICE_KEY:
        print("[오류] SUPABASE_SERVICE_KEY 환경변수가 없습니다.")
        print("실행 방법: $env:SUPABASE_SERVICE_KEY='your_key'; python scripts/upload_to_supabase.py")
        return
    if not GEMINI_API_KEY:
        print("[오류] GEMINI_API_KEY 환경변수가 없습니다.")
        print("실행 방법: $env:GEMINI_API_KEY='your_key'; python scripts/upload_to_supabase.py")
        return

    with open(JSON_FILE, encoding="utf-8") as f:
        units = json.load(f)

    total = len(units)
    print(f"=== 건담 데이터 업로드 시작: {total}개 기체 ===\n")

    success = 0
    for i, unit in enumerate(units, 1):
        print(f"[{i}/{total}] {unit['name']}")

        # 1. 기체 데이터 업로드
        unit_id = upload_unit(unit)
        if not unit_id:
            print(f"  SKIP (업로드 실패)")
            continue

        # 2. 임베딩 생성
        content = make_embed_text(unit)
        embedding = generate_embedding(content)
        if not embedding:
            print(f"  WARNING: 임베딩 생성 실패 (기체 데이터는 저장됨)")
        else:
            upload_embedding(unit_id, content, embedding)
            print(f"  OK (unit_id={unit_id}, 임베딩 {len(embedding)}차원)")

        success += 1
        time.sleep(EMBED_DELAY)

    print(f"\n=== 완료: {success}/{total}개 업로드 ===")


if __name__ == "__main__":
    main()
