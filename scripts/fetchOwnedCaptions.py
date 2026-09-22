#!/usr/bin/env python3
"""Download captions for owned YouTube videos using OAuth.

This is intentionally bounded and resumable. It writes the same transcript JSON
and manifest shape used by fetchMemoryTranscripts.js, so the existing memory
builder can consume the result without a conversion step.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow


SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
VIDEO_ID = re.compile(r"^[\w-]{11}$")
API = "https://youtube.googleapis.com/youtube/v3"
TIMESTAMP = re.compile(r"^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$")
TAG = re.compile(r"<[^>]*>")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def atomic_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{__import__('os').getpid()}.tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def load_ids(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = data.get("videos", data.get("entries", []))
    if not isinstance(data, list):
        raise ValueError("入力ファイルの形式が不正です")
    ids = []
    for value in data:
        video_id = value if isinstance(value, str) else value.get("id") if isinstance(value, dict) else None
        if video_id and VIDEO_ID.fullmatch(video_id) and video_id not in ids:
            ids.append(video_id)
    if not ids:
        raise ValueError("動画IDが見つかりません")
    return ids


def credentials(secret: Path, token: Path) -> Credentials:
    creds = None
    if token.exists():
        creds = Credentials.from_authorized_user_file(str(token), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
            creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
        atomic_json(token, json.loads(creds.to_json()))
    return creds


def api_json(creds: Credentials, endpoint: str, params: dict[str, str]) -> dict:
    if not creds.valid:
        if not creds.refresh_token:
            raise RuntimeError("OAuthトークンを更新できません")
        creds.refresh(GoogleRequest())
    query = urlencode(params)
    request = Request(f"{API}/{endpoint}?{query}", headers={"Authorization": f"Bearer {creds.token}"})
    try:
        with urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(body).get("error", {}).get("errors", [{}])[0]
            reason = detail.get("reason") or detail.get("message") or f"HTTP {error.code}"
        except json.JSONDecodeError:
            reason = f"HTTP {error.code}"
        raise RuntimeError(f"YouTube API {reason}") from error
    except URLError as error:
        raise RuntimeError(f"YouTube API 接続エラー: {error.reason}") from error


def api_text(creds: Credentials, caption_id: str) -> str:
    if not creds.valid:
        if not creds.refresh_token:
            raise RuntimeError("OAuthトークンを更新できません")
        creds.refresh(GoogleRequest())
    url = f"{API}/captions/{caption_id}?tfmt=srt"
    request = Request(url, headers={"Authorization": f"Bearer {creds.token}"})
    try:
        with urlopen(request, timeout=60) as response:
            return response.read().decode("utf-8-sig")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"字幕ダウンロード HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"字幕ダウンロード接続エラー: {error.reason}") from error


def seconds(value: str) -> float:
    match = TIMESTAMP.fullmatch(value.strip())
    if not match:
        raise ValueError(f"字幕時刻が不正です: {value}")
    hours = int(match.group(1) or 0)
    minutes, secs, millis = (int(match.group(i)) for i in (2, 3, 4))
    if minutes > 59 or secs > 59:
        raise ValueError(f"字幕時刻が不正です: {value}")
    return hours * 3600 + minutes * 60 + secs + millis / 1000


def parse_srt(text: str) -> list[dict]:
    rows = []
    for block in re.split(r"\n\s*\n", text.replace("\r\n", "\n").replace("\r", "\n")):
        lines = block.split("\n")
        index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if index is None:
            continue
        match = re.match(r"^(\S+)\s+-->\s+(\S+)(?:\s.*)?$", lines[index])
        if not match:
            raise ValueError("字幕区間の形式が不正です")
        start, end = seconds(match.group(1)), seconds(match.group(2))
        content = TAG.sub("", "\n".join(lines[index + 1:]))
        content = html.unescape(content).strip()
        if end <= start:
            raise ValueError("字幕区間の長さが不正です")
        if content:
            if rows and start < rows[-1]["start"]:
                raise ValueError("字幕の時刻が逆順です")
            rows.append({"start": start, "end": end, "text": content})
    if not rows:
        raise ValueError("字幕区間が見つかりません")
    return rows


def choose_caption(items: list[dict]) -> dict | None:
    if not items:
        return None

    def rank(item: dict) -> tuple[int, int]:
        snippet = item.get("snippet", {})
        language = snippet.get("language", "")
        # Prefer Japanese, then English, then any other available language.
        language_rank = 0 if language.startswith("ja") else 1 if language.startswith("en") else 2
        # If both exist, prefer a manually supplied track over ASR.
        kind_rank = 1 if snippet.get("trackKind") == "ASR" else 0
        return language_rank, kind_rank

    return sorted(items, key=rank)[0]


def fetch(ids: list[str], args: argparse.Namespace) -> dict[str, int]:
    manifest_path = args.output / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        manifest = {}
    if not isinstance(manifest, dict):
        raise ValueError("字幕マニフェストの形式が不正です")

    creds = credentials(args.client_secret, args.token)
    attempted = saved = 0
    skipped = 0
    for video_id in ids:
        if attempted >= args.limit:
            break
        previous = manifest.get(video_id, {})
        if previous.get("status") == "available" or (previous and not args.retry):
            skipped += 1
            continue

        manifest[video_id] = {"status": "attempted", "method": "youtube-data-api-oauth", "checkedAt": now()}
        atomic_json(manifest_path, manifest)
        attempted += 1
        try:
            listing = api_json(creds, "captions", {"part": "snippet", "videoId": video_id})
            chosen = choose_caption(listing.get("items", []))
            if not chosen:
                manifest[video_id] = {"status": "unavailable", "method": "youtube-data-api-oauth", "checkedAt": now()}
            else:
                snippet = chosen.get("snippet", {})
                rows = parse_srt(api_text(creds, chosen["id"]))
                atomic_json(args.output / f"{video_id}.json", rows)
                manifest[video_id] = {
                    "status": "available",
                    "method": "youtube-data-api-oauth",
                    "language": snippet.get("language"),
                    "generated": snippet.get("trackKind") == "ASR",
                    "segments": len(rows),
                    "checkedAt": now(),
                }
                saved += 1
        except Exception as error:  # Keep the manifest resumable after one failure.
            manifest[video_id] = {"status": "error", "method": "youtube-data-api-oauth", "error": str(error), "checkedAt": now()}
        atomic_json(manifest_path, manifest)
        print(f"{attempted}/{args.limit} {video_id}: {manifest[video_id]['status']}", flush=True)
        if attempted < args.limit:
            time.sleep(args.delay)
    return {"attempted": attempted, "saved": saved, "skipped": skipped,
            "available": sum(v.get("status") == "available" for v in manifest.values())}


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--client-secret", type=Path, default=next(root.glob(".local/client_secret_*.json"), root / ".local/client_secret.json"))
    parser.add_argument("--token", type=Path, default=root / ".local/youtube-oauth-token.json")
    parser.add_argument("--output", type=Path, default=root / ".local/jev-transcripts")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--retry", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.limit <= 100 or args.delay < 0:
        raise SystemExit("--limit は1〜100、--delay は0以上です")
    if not args.client_secret.exists():
        raise SystemExit(f"OAuthクライアントファイルがありません: {args.client_secret}")
    result = fetch(load_ids(args.input), args)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("中断しました。次回はマニフェストから再開できます。", file=sys.stderr)
        raise SystemExit(130)
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
