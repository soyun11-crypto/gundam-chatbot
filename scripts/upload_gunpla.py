"""
Fandom 위키에서 건프라 상품 데이터 크롤링 → Supabase 업로드 + 임베딩 생성
사용법: python scripts/upload_gunpla.py
"""

import re
import time
import os
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = "https://aywqnmqgbjqsrparbeyr.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FANDOM_API = "https://gundam.fandom.com/api.php"
EMBED_MODEL = "gemini-embedding-001"
EMBED_DELAY = 0.6
SKIP_EMBEDDING = False

GRADE_PATTERNS = [
    "Perfect Grade", "Master Grade", "Real Grade", "High Grade",
    "Entry Grade", "MGSD", "HGUC", "HGCE", "HGAC", "HGAW", "HGFC",
    "HGGT", "HGIBO", "HGBF", "HGBD", "HGCC", "PG", "MG", "RG",
    "HG", "EG", "SD", "FG", "NG",
]
SCALE_RE = re.compile(r"1/(\d+)")


def supabase_request(method: str, path: str, data=None, params=None) -> dict | list:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    res = requests.request(method, url, headers=headers, json=data, params=params, verify=False, timeout=15)
    if not res.ok:
        print(f"  [Supabase 오류] {res.status_code}: {res.text[:200]}")
        return {}
    return res.json() if res.text else {}


def generate_embedding(text: str) -> list[float] | None:
    url = f"https://generativelanguage.googleapis.com/v1/models/{EMBED_MODEL}:embedContent"
    body = {
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 768,
    }
    try:
        res = requests.post(url, params={"key": GEMINI_API_KEY}, json=body, verify=False, timeout=15)
        if not res.ok:
            print(f"  [임베딩 오류] {res.text[:100]}")
            return None
        return res.json()["embedding"]["values"]
    except Exception as e:
        print(f"  [임베딩 예외] {e}")
        return None


def get_gundam_units() -> list[dict]:
    """Supabase에서 기체 목록 가져오기"""
    result = supabase_request("GET", "gundam_units", params={"select": "id,name,url"})
    return result if isinstance(result, list) else []


def fetch_gunpla_section(page_name: str) -> str:
    """Fandom API로 위키텍스트의 Gunpla 섹션 가져오기"""
    params = {
        "action": "parse",
        "page": page_name,
        "prop": "wikitext",
        "format": "json",
    }
    try:
        res = requests.get(FANDOM_API, params=params, verify=False, timeout=15)
        if not res.ok:
            return ""
        wikitext = res.json().get("parse", {}).get("wikitext", {}).get("*", "")
        # Gunpla 섹션만 추출
        match = re.search(r"==\[?\[?Gunpla\]?\]?==(.*?)(?:==\w|\Z)", wikitext, re.DOTALL | re.IGNORECASE)
        return match.group(1) if match else ""
    except Exception as e:
        print(f"  [Fandom 오류] {e}")
        return ""


def parse_gunpla_items(gunpla_text: str, unit_name: str) -> list[dict]:
    """갤러리 텍스트에서 건프라 상품 파싱"""
    items = []
    # File:xxx.jpg|캡션 형식 추출
    entries = re.findall(r"File:[^\|]+\|([^\n\]]+)", gunpla_text)

    for caption in entries:
        # 위키 링크 제거 ([[xxx]] → xxx)
        clean = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", r"\1", caption).strip()
        if not clean or len(clean) < 3:
            continue

        # 등급 추출
        grade = None
        for g in GRADE_PATTERNS:
            if g.lower() in clean.lower():
                grade = g
                break

        # 스케일 추출
        scale_match = SCALE_RE.search(clean)
        scale = f"1/{scale_match.group(1)}" if scale_match else None

        # 설명 텍스트 생성
        parts = [f"건프라 상품명: {clean}", f"기체: {unit_name}"]
        if grade:
            parts.append(f"등급: {grade}")
        if scale:
            parts.append(f"스케일: {scale}")

        items.append({
            "name": clean[:200],
            "grade": grade,
            "scale": scale,
            "description": clean,
            "embedding_text": "\n".join(parts),
        })

    # 중복 제거 (이름 기준)
    seen = set()
    unique = []
    for item in items:
        if item["name"] not in seen:
            seen.add(item["name"])
            unique.append(item)
    return unique


def get_page_name_from_url(url: str) -> str:
    """URL에서 Fandom 페이지명 추출"""
    return url.rstrip("/").split("/wiki/")[-1] if "/wiki/" in url else ""


def main():
    if not SUPABASE_SERVICE_KEY or not GEMINI_API_KEY:
        print("[오류] 환경변수를 설정하세요:")
        print("  $env:SUPABASE_SERVICE_KEY='...'; $env:GEMINI_API_KEY='...'; python scripts/upload_gunpla.py")
        return

    units = get_gundam_units()
    if not units:
        print("[오류] gundam_units 데이터를 불러올 수 없습니다.")
        return

    print(f"=== 건프라 데이터 수집 시작: {len(units)}개 기체 ===\n")

    total_products = 0
    for i, unit in enumerate(units, 1):
        unit_id = unit["id"]
        unit_name = unit["name"]
        unit_url = unit.get("url", "")

        print(f"[{i}/{len(units)}] {unit_name}")

        page_name = get_page_name_from_url(unit_url)
        if not page_name:
            print("  SKIP (URL 없음)")
            continue

        gunpla_text = fetch_gunpla_section(page_name)
        if not gunpla_text:
            print("  건프라 섹션 없음")
            time.sleep(0.3)
            continue

        items = parse_gunpla_items(gunpla_text, unit_name)
        if not items:
            print("  상품 없음")
            time.sleep(0.3)
            continue

        print(f"  {len(items)}개 상품 발견")

        for item in items:
            # 상품 저장
            result = supabase_request("POST", "gunpla_products", {
                "unit_id": unit_id,
                "name": item["name"],
                "grade": item["grade"],
                "scale": item["scale"],
                "description": item["description"],
                "source_url": f"https://gundam.fandom.com/wiki/{page_name}#Gunpla",
            })

            if not isinstance(result, list) or not result:
                print(f"    저장 실패: {item['name'][:50]}")
                continue

            product_id = result[0]["id"]

            # 임베딩 생성 (SKIP_EMBEDDING=False 일 때만)
            if not SKIP_EMBEDDING:
                embedding = generate_embedding(item["embedding_text"])
                if embedding:
                    supabase_request("POST", "gunpla_embeddings", {
                        "product_id": product_id,
                        "embedding_text": item["embedding_text"],
                        "embedding": embedding,
                    })
                else:
                    print(f"    임베딩 실패: {item['name'][:50]}")
                time.sleep(EMBED_DELAY)

            print(f"    OK: {item['name'][:60]}")
            total_products += 1

        time.sleep(0.5)

    print(f"\n=== 완료: 총 {total_products}개 건프라 상품 저장 ===")


if __name__ == "__main__":
    main()
