import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import msal


DEFAULT_SCOPES = ["Files.ReadWrite", "User.Read", "offline_access", "openid", "profile"]
TOKEN_CACHE_PATH = Path(__file__).resolve().parents[1] / ".msal_tokens.json"


def _parse_scopes(raw_scopes: Optional[str]) -> List[str]:
    if not raw_scopes:
        return DEFAULT_SCOPES
    values = []
    for part in raw_scopes.replace(";", ",").split(","):
        value = part.strip()
        if value and value not in values:
            values.append(value)
    return values or DEFAULT_SCOPES


def get_microsoft_config() -> Dict[str, Any]:
    return {
        "client_id": os.getenv("MICROSOFT_CLIENT_ID", ""),
        "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
        "tenant_id": os.getenv("MICROSOFT_TENANT_ID", "common"),
        "redirect_uri": os.getenv("MICROSOFT_REDIRECT_URI", ""),
        "scopes": _parse_scopes(os.getenv("MICROSOFT_SCOPES", "")),
        "frontend_url": os.getenv("FRONTEND_URL", os.getenv("APP_URL", "http://localhost:5173")),
        "app_url": os.getenv("APP_URL", "http://localhost:8000"),
        "file_name": os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx"),
        "folder_path": os.getenv("EXCEL_FOLDER_PATH", "").strip(),
        "share_permission": os.getenv("EXCEL_SHARE_PERMISSION", "view").strip().lower(),
    }


class MicrosoftAuthService:
    def __init__(self):
        self.config = get_microsoft_config()
        self.pending_state: Optional[str] = None

    def is_configured(self) -> bool:
        return bool(
            self.config["client_id"]
            and self.config["tenant_id"]
            and self.config["redirect_uri"]
            and self.config["client_secret"]
        )

    def build_login_url(self, state: Optional[str] = None) -> str:
        if not self.is_configured():
            raise RuntimeError("Microsoft OAuth is not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, MICROSOFT_REDIRECT_URI, and MICROSOFT_SCOPES.")

        state_value = state or uuid.uuid4().hex
        self.pending_state = state_value
        authority = f"https://login.microsoftonline.com/{self.config['tenant_id']}"
        params = {
            "client_id": self.config["client_id"],
            "response_type": "code",
            "redirect_uri": self.config["redirect_uri"],
            "response_mode": "query",
            "scope": " ".join(self.config["scopes"]),
            "state": state_value,
            "prompt": "select_account",
        }
        return f"{authority}/oauth2/v2.0/authorize?{urlencode(params)}"

    def _get_client(self) -> msal.ConfidentialClientApplication:
        if not self.is_configured():
            raise RuntimeError("Microsoft OAuth is not configured.")
        return msal.ConfidentialClientApplication(
            client_id=self.config["client_id"],
            authority=f"https://login.microsoftonline.com/{self.config['tenant_id']}",
            client_credential=self.config["client_secret"],
            token_cache=None,
        )

    def _load_token_response(self) -> Optional[Dict[str, Any]]:
        if not TOKEN_CACHE_PATH.exists():
            return None
        try:
            with open(TOKEN_CACHE_PATH, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, dict) and data.get("access_token"):
                return data
        except (OSError, ValueError, json.JSONDecodeError):
            return None
        return None

    def _save_token_response(self, response: Dict[str, Any]) -> None:
        if not isinstance(response, dict):
            return
        payload = {
            "access_token": response.get("access_token"),
            "refresh_token": response.get("refresh_token"),
            "expires_in": response.get("expires_in"),
            "ext_expires_in": response.get("ext_expires_in"),
            "scope": response.get("scope"),
            "token_type": response.get("token_type"),
            "expires_at": response.get("expires_at") or int(time.time()) + int(response.get("expires_in") or 0),
        }
        TOKEN_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_CACHE_PATH, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)

    def handle_callback(self, code: Optional[str], received_state: Optional[str], expected_state: Optional[str] = None) -> Dict[str, Any]:
        if not code:
            return {"success": False, "error": "missing_code", "message": "The Microsoft callback did not include an authorization code."}

        expected = expected_state or self.pending_state
        if expected and received_state and received_state != expected:
            return {"success": False, "error": "invalid_state", "message": "Microsoft authentication state mismatch. Please retry login."}

        if received_state and expected and not received_state:
            return {"success": False, "error": "invalid_state", "message": "Missing OAuth state during Microsoft callback."}

        try:
            app = self._get_client()
            result = app.acquire_token_by_authorization_code(
                code=code,
                scopes=self.config["scopes"],
                redirect_uri=self.config["redirect_uri"],
            )
        except Exception as exc:  # pragma: no cover - defensive safeguard
            return {"success": False, "error": "oauth_error", "message": str(exc)}

        if not result or "error" in result:
            error_code = result.get("error", "oauth_error") if isinstance(result, dict) else "oauth_error"
            error_message = result.get("error_description", "Authentication failed.") if isinstance(result, dict) else "Authentication failed."
            return {"success": False, "error": error_code, "message": error_message}

        self._save_token_response(result)
        self.pending_state = None
        return {"success": True, "message": "Microsoft authentication successful."}

    def get_access_token(self) -> str:
        if not self.is_configured():
            raise RuntimeError("Microsoft OAuth is not configured.")

        cached = self._load_token_response()
        if cached and cached.get("access_token"):
            expires_at = int(cached.get("expires_at") or 0)
            if expires_at > int(time.time()) + 60:
                return cached["access_token"]

        app = self._get_client()
        accounts = app.get_accounts()
        if accounts:
            result = app.acquire_token_silent(self.config["scopes"], account=accounts[0])
            if result and "access_token" in result:
                self._save_token_response(result)
                return result["access_token"]

        raise RuntimeError("Microsoft authentication required. Sign in to connect OneDrive.")

    def is_connected(self) -> bool:
        try:
            self.get_access_token()
            return True
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "connected": False,
                "provider": "Microsoft OneDrive",
                "status": "authentication_required",
                "message": "Microsoft authentication is not configured. Add MICROSOFT_* values in Render.",
            }

        if self.is_connected():
            return {
                "connected": True,
                "provider": "Microsoft OneDrive",
                "status": "connected",
                "message": "Connected to Microsoft OneDrive.",
            }

        return {
            "connected": False,
            "provider": "Microsoft OneDrive",
            "status": "authentication_required",
            "message": "Authentication required. Sign in with Microsoft to connect OneDrive.",
        }

    def logout(self) -> Dict[str, Any]:
        try:
            if TOKEN_CACHE_PATH.exists():
                TOKEN_CACHE_PATH.unlink()
        except OSError:
            pass
        self.pending_state = None
        return {"success": True, "message": "Microsoft OneDrive session cleared."}
