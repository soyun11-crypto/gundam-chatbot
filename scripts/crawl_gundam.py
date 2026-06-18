"""
gundam.fandom.com 기체 데이터 크롤러 (MediaWiki API)
사용법: python scripts/crawl_gundam.py
결과: scripts/gundam_units.json
"""

import json
import time
import re
from urllib.parse import urljoin
import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://gundam.fandom.com"
API_URL = f"{BASE_URL}/api.php"
OUTPUT_FILE = "scripts/gundam_units.json"
DELAY = 1.2

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# 카테고리 API로 못 가져올 경우 사용할 주요 기체 목록
FALLBACK_UNITS = [
    # UC
    "RX-78-2 Gundam", "MS-06 Zaku II", "MS-06S Zaku II", "MSM-07 Z'Gok",
    "RX-78-3 Gundam G-3", "RX-78-6 Mudrock Gundam", "YMS-15 Gyan",
    "MSN-02 Zeong", "MA-08 Big Zam", "MSM-03 Gogg", "MS-09 Dom",
    "RGM-79 GM", "MS-07B Gouf", "MSM-10 Zock", "MS-14A Gelgoog",
    # Z Gundam
    "MSZ-006 Zeta Gundam", "RX-178 Gundam Mk-II", "NRX-055 Baund Doc",
    "RMS-099 Rick Dias", "PMX-003 The O", "AMX-004 Qubeley",
    "NRX-044 Asshimar", "ORX-005 Gaplant", "AMX-003 Gaza-C",
    # ZZ Gundam
    "MSZ-010 ZZ Gundam", "AMX-004G Qubeley Mass Production Type",
    "AMX-107 Bawoo", "AMA-01X Jamru Fin",
    # CCA
    "RX-93 Nu Gundam", "MSN-04 Sazabi", "MSN-03 Jagd Doga",
    "RGZ-91 Re-GZ", "AMS-119 Geara Doga",
    # Gundam 0080
    "RX-78NT-1 Gundam NT-1", "MS-18E Kampfer", "MS-06FZ Zaku II Kai",
    # Gundam 0083
    "RX-78GP01 Gundam GP01", "RX-78GP02A Gundam GP02A", "RX-78GP03 Gundam GP03",
    "MS-21C Dra-C", "AGX-04 Gerbera Tetra",
    # Char's Counterattack / Unicorn
    "RX-0 Unicorn Gundam", "MSN-06S Sinanju", "RX-0 Full Armor Unicorn Gundam",
    "NZ-666 Kshatriya", "MSN-001A1 Delta Plus",
    # Gundam Wing
    "XXXG-01W Wing Gundam", "XXXG-01D Gundam Deathscythe",
    "XXXG-01H Gundam Heavyarms", "XXXG-01SR Gundam Sandrock",
    "XXXG-01SR2 Gundam Sandrock Kai", "XXXG-00W0 Wing Gundam Zero",
    "OZ-13MS Gundam Epyon", "WMS-03 Maganac", "OZ-00MS Tallgeese",
    # Gundam SEED
    "ZGMF-X10A Freedom Gundam", "ZGMF-X09A Justice Gundam",
    "GAT-X105 Strike Gundam", "ZGMF-X20A Strike Freedom Gundam",
    "ZGMF-X19A Infinite Justice Gundam", "GAT-X303 Aegis Gundam",
    "ZGMF-X42S Destiny Gundam", "GAT-X102 Duel Gundam",
    "GAT-X207 Blitz Gundam", "GAT-X103 Buster Gundam",
    # Gundam 00
    "GN-001 Gundam Exia", "GN-002 Gundam Dynames",
    "GN-003 Gundam Kyrios", "GN-005 Gundam Virtue",
    "GN-0000 00 Gundam", "GNT-0000 00 Qan[T]",
    "GN-007 Arios Gundam", "GN-008 Seravee Gundam",
    "CB-0000G/C Reborns Gundam", "GNX-Y901TW Susanowo",
    # Iron-Blooded Orphans
    "ASW-G-08 Gundam Barbatos", "ASW-G-08 Gundam Barbatos Lupus",
    "ASW-G-08 Gundam Barbatos Lupus Rex",
    "ASW-G-11 Gundam Gusion", "STH-20 Hekija",
    "EB-06 Graze", "V08-1228 Grimgerde",
    # Witch from Mercury
    "XVX-016 Gundam Aerial", "XVX-016RN Gundam Aerial Rebuild",
    "CEK-040 Michaelis", "CFK-029 Dilanza", "MD-0064 Darilbalde",
    # Gundam AGE
    "AGE-1 Gundam AGE-1 Normal", "AGE-2 Gundam AGE-2 Normal",
    "AGE-3 Gundam AGE-3 Normal", "AGE-FX Gundam AGE-FX",
    # X Gundam
    "GX-9900 Gundam X", "GX-9900-DV Gundam X Divider",
    "GT-9600 Gundam Leopard",
    # G Gundam
    "GF13-017NJ Shining Gundam", "GF13-017NJII God Gundam",
    "GF13-001NHII Master Gundam", "GF13-011NC Dragon Gundam",
    "GF13-006NA Gundam Maxter", "GF13-003NEL Bolt Gundam",
]

session = requests.Session()
session.headers.update(HEADERS)


def api_get(params: dict) -> dict:
    params["format"] = "json"
    try:
        res = session.get(API_URL, params=params, timeout=15, verify=False)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"  [API 오류] {e}")
        return {}


def get_category_members(category: str, limit: int = 500) -> list[str]:
    members = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{category}",
        "cmlimit": 500,
        "cmtype": "page",
    }

    while True:
        data = api_get(params)
        if not data:
            break

        items = data.get("query", {}).get("categorymembers", [])
        members.extend([item["title"] for item in items])
        print(f"    수집 중: {len(members)}개...")

        cont = data.get("continue", {})
        if "cmcontinue" not in cont or len(members) >= limit:
            break
        params["cmcontinue"] = cont["cmcontinue"]
        time.sleep(DELAY)

    return members[:limit]


def search_gundam_pages(limit: int = 500) -> list[str]:
    """검색 API로 건담 기체 페이지 찾기"""
    titles = []
    params = {
        "action": "query",
        "list": "search",
        "srsearch": "Gundam mobile suit specifications",
        "srlimit": 100,
        "srnamespace": 0,
    }
    data = api_get(params)
    for item in data.get("query", {}).get("search", []):
        titles.append(item["title"])
    return titles


def get_page_html(title: str) -> str:
    params = {
        "action": "parse",
        "page": title,
        "prop": "text",
        "disablelimitreport": 1,
        "disableeditsection": 1,
    }
    data = api_get(params)
    return data.get("parse", {}).get("text", {}).get("*", "")


def parse_infobox(soup: BeautifulSoup) -> dict:
    specs = {}

    # portable-infobox (최신 Fandom)
    infobox = soup.find("aside", class_=re.compile(r"portable-infobox"))
    if infobox:
        for item in infobox.find_all("div", attrs={"data-source": True}):
            label = item.find(class_=re.compile(r"pi-data-label"))
            value = item.find(class_=re.compile(r"pi-data-value"))
            if label and value:
                key = label.get_text(strip=True)
                val = re.sub(r"\s+", " ", value.get_text(separator=" ", strip=True))
                if key and val:
                    specs[key] = val

        if not specs:
            for item in infobox.find_all("div", class_=re.compile(r"pi-data")):
                label = item.find(class_=re.compile(r"pi-data-label"))
                value = item.find(class_=re.compile(r"pi-data-value"))
                if label and value:
                    key = label.get_text(strip=True)
                    val = re.sub(r"\s+", " ", value.get_text(separator=" ", strip=True))
                    if key and val:
                        specs[key] = val
        return specs

    # 구형 table.infobox
    infobox = soup.find("table", class_=re.compile(r"infobox"))
    if infobox:
        for row in infobox.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) == 2:
                key = cells[0].get_text(strip=True)
                val = re.sub(r"\s+", " ", cells[1].get_text(separator=" ", strip=True))
                if key and val:
                    specs[key] = val

    return specs


def extract_field(specs: dict, *keywords: str) -> str:
    for kw in keywords:
        for k, v in specs.items():
            if kw.lower() in k.lower():
                return v
    return ""


def get_description(soup: BeautifulSoup) -> str:
    content = soup.find("div", class_="mw-parser-output")
    if not content:
        return ""
    for p in content.find_all("p", recursive=False):
        text = re.sub(r"\[\d+\]", "", p.get_text(strip=True))
        if len(text) > 40:
            return text
    return ""


def parse_unit(title: str) -> dict | None:
    html = get_page_html(title)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")
    specs = parse_infobox(soup)

    if len(specs) < 1:
        return None

    return {
        "name": title,
        "url": f"{BASE_URL}/wiki/{title.replace(' ', '_')}",
        "pilot": extract_field(specs, "Pilot", "Crew", "Operator"),
        "series": extract_field(specs, "Series", "Appears in", "Anime", "OVA", "Television"),
        "unit_type": extract_field(specs, "Unit Type", "Classification", "Type"),
        "manufacturer": extract_field(specs, "Manufacturer", "Built by", "Developed"),
        "height": extract_field(specs, "Height", "Overall Height"),
        "weight": extract_field(specs, "Weight", "Base Weight"),
        "power_plant": extract_field(specs, "Power Plant", "Power Source"),
        "armament": extract_field(specs, "Armament", "Weapons", "Equipment"),
        "description": get_description(soup),
        "raw_specs": specs,
    }


def crawl(max_units: int = 500):
    print("=" * 50)
    print("건담 기체 크롤러 시작")
    print("=" * 50)

    # 1. 카테고리 API 시도
    all_titles = []
    for cat in ["Mobile suits", "Mobile Suits", "Gundam mobile suits"]:
        print(f"\n[카테고리 시도] {cat}")
        titles = get_category_members(cat, limit=max_units)
        if titles:
            all_titles.extend(titles)
            print(f"  -> {len(titles)}개 수집")
            break
        time.sleep(DELAY)

    # 2. 카테고리 실패 시 폴백 목록 사용
    if not all_titles:
        print("\n[폴백] 미리 정의된 기체 목록 사용")
        all_titles = FALLBACK_UNITS

    all_titles = list(dict.fromkeys(all_titles))
    total = min(len(all_titles), max_units)
    print(f"\n총 {total}개 기체 처리 시작\n")

    # 3. 개별 페이지 파싱
    units = []
    for i, title in enumerate(all_titles[:max_units], 1):
        print(f"[{i}/{total}] {title}")
        unit = parse_unit(title)
        if unit:
            units.append(unit)
            pilot_preview = (unit["pilot"] or "정보없음")[:30]
            series_preview = (unit["series"] or "정보없음")[:30]
            print(f"  OK | 파일럿: {pilot_preview} | 시리즈: {series_preview}")
        else:
            print(f"  SKIP (인포박스 없음)")
        time.sleep(DELAY)

    # JSON 저장
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(units, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 50}")
    print(f"완료! {len(units)}개 기체 저장 -> {OUTPUT_FILE}")
    print(f"{'=' * 50}")

    if units:
        s = units[0]
        print(f"\n[샘플]")
        print(f"  기체명: {s['name']}")
        print(f"  파일럿: {s['pilot']}")
        print(f"  시리즈: {s['series']}")
        print(f"  전고:   {s['height']}")
        print(f"  무장:   {s['armament'][:60]}")


if __name__ == "__main__":
    crawl(max_units=500)
