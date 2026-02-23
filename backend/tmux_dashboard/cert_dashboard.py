from __future__ import annotations

import json
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def _parse_iso(value: str) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _empty_state() -> Dict[str, List[Dict[str, Any]]]:
    return {"devices": [], "requests": [], "links": [], "audit": []}


class CertDashboardService:
    def __init__(self, data_file: str) -> None:
        self._path = Path(data_file)
        self._lock = threading.Lock()
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> Dict[str, List[Dict[str, Any]]]:
        try:
            with self._path.open(encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = _empty_state()
        for key in ("devices", "requests", "links", "audit"):
            if key not in data or not isinstance(data[key], list):
                data[key] = []
        return data

    def _save(self, state: Dict[str, List[Dict[str, Any]]]) -> None:
        tmp = self._path.with_suffix(self._path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=True, indent=2)
        tmp.replace(self._path)

    def _add_audit(
        self,
        state: Dict[str, List[Dict[str, Any]]],
        *,
        actor: str,
        action: str,
        target_type: str,
        target_id: str,
        detail: str,
    ) -> None:
        state["audit"].append(
            {
                "id": str(uuid4()),
                "at": _iso(_utc_now()),
                "actor": actor,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "detail": detail,
            }
        )

    def list_devices(self) -> List[Dict[str, Any]]:
        with self._lock:
            state = self._load()
            return sorted(state["devices"], key=lambda item: item.get("updated_at", ""), reverse=True)

    def list_requests(self) -> List[Dict[str, Any]]:
        with self._lock:
            state = self._load()
            return sorted(state["requests"], key=lambda item: item.get("requested_at", ""), reverse=True)

    def list_links(self) -> List[Dict[str, Any]]:
        with self._lock:
            state = self._load()
            now = _utc_now()
            changed = False
            for link in state["links"]:
                if link.get("status") != "active":
                    continue
                expires_at = _parse_iso(str(link.get("expires_at", "")))
                if expires_at and expires_at <= now:
                    link["status"] = "expired"
                    changed = True
            if changed:
                self._save(state)
            return sorted(state["links"], key=lambda item: item.get("created_at", ""), reverse=True)

    def list_audit(self) -> List[Dict[str, Any]]:
        with self._lock:
            state = self._load()
            return sorted(state["audit"], key=lambda item: item.get("at", ""), reverse=True)

    def create_request(self, *, actor: str, device_name: str, platform: str, note: str) -> Dict[str, Any]:
        now = _iso(_utc_now())
        record = {
            "id": str(uuid4()),
            "device_name": device_name,
            "platform": platform,
            "note": note,
            "status": "requested",
            "requested_at": now,
            "issued_at": "",
            "expires_at": "",
            "device_id": "",
        }
        with self._lock:
            state = self._load()
            state["requests"].append(record)
            self._add_audit(
                state,
                actor=actor,
                action="request.create",
                target_type="request",
                target_id=record["id"],
                detail=f"device_name={device_name}",
            )
            self._save(state)
        return record

    def mark_request_issued(
        self,
        *,
        actor: str,
        request_id: str,
        issued_at: str,
        expires_at: str,
        cert_cn: str,
    ) -> Dict[str, Any] | None:
        with self._lock:
            state = self._load()
            req = next((item for item in state["requests"] if item.get("id") == request_id), None)
            if req is None:
                return None

            now = _iso(_utc_now())
            req["status"] = "issued"
            req["issued_at"] = issued_at
            req["expires_at"] = expires_at

            device = next((item for item in state["devices"] if item.get("request_id") == request_id), None)
            if device is None:
                device = {
                    "id": str(uuid4()),
                    "request_id": request_id,
                    "name": req.get("device_name", ""),
                    "platform": req.get("platform", ""),
                    "cert_cn": cert_cn,
                    "issued_at": issued_at,
                    "expires_at": expires_at,
                    "status": "active",
                    "created_at": now,
                    "updated_at": now,
                }
                state["devices"].append(device)
            else:
                device["cert_cn"] = cert_cn
                device["issued_at"] = issued_at
                device["expires_at"] = expires_at
                device["status"] = "active"
                device["updated_at"] = now

            req["device_id"] = device["id"]
            self._add_audit(
                state,
                actor=actor,
                action="request.mark_issued",
                target_type="request",
                target_id=request_id,
                detail=f"device_id={device['id']}",
            )
            self._save(state)
            return req

    def create_distribution_link(
        self,
        *,
        actor: str,
        request_id: str,
        expires_in_sec: int,
        note: str,
    ) -> Dict[str, Any] | None:
        with self._lock:
            state = self._load()
            req = next((item for item in state["requests"] if item.get("id") == request_id), None)
            if req is None:
                return None

            now = _utc_now()
            expires_at = now + timedelta(seconds=max(expires_in_sec, 60))
            token = secrets.token_urlsafe(24)
            link = {
                "id": str(uuid4()),
                "request_id": request_id,
                "token": token,
                "status": "active",
                "created_at": _iso(now),
                "expires_at": _iso(expires_at),
                "note": note,
                "distribution_url_path": f"/api/certs/distribution/{token}",
            }
            state["links"].append(link)
            self._add_audit(
                state,
                actor=actor,
                action="link.create",
                target_type="link",
                target_id=link["id"],
                detail=f"request_id={request_id}",
            )
            self._save(state)
            return link

    def revoke_link(self, *, actor: str, link_id: str) -> Dict[str, Any] | None:
        with self._lock:
            state = self._load()
            link = next((item for item in state["links"] if item.get("id") == link_id), None)
            if link is None:
                return None
            link["status"] = "revoked"
            self._add_audit(
                state,
                actor=actor,
                action="link.revoke",
                target_type="link",
                target_id=link_id,
                detail="",
            )
            self._save(state)
            return link

    def resolve_distribution_token(self, token: str) -> Dict[str, Any] | None:
        with self._lock:
            state = self._load()
            link = next((item for item in state["links"] if item.get("token") == token), None)
            if link is None:
                return None

            if link.get("status") != "active":
                return None
            expires_at = _parse_iso(str(link.get("expires_at", "")))
            if not expires_at or expires_at <= _utc_now():
                link["status"] = "expired"
                self._save(state)
                return None

            req = next((item for item in state["requests"] if item.get("id") == link.get("request_id")), None)
            if req is None:
                return None

            return {
                "request_id": req.get("id", ""),
                "device_name": req.get("device_name", ""),
                "platform": req.get("platform", ""),
                "note": req.get("note", ""),
                "status": req.get("status", ""),
                "manual_steps": [
                    "1. 配布担当者から p12 ファイルを受け取ってください。",
                    "2. iPhone でファイルを開き、構成プロファイルをインストールしてください。",
                    "3. インストール後、Safari で対象URLにアクセスして確認してください。",
                ],
            }
