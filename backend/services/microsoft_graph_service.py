import os
from typing import Any, Dict, Optional
from urllib.parse import quote

import requests

from backend.services.microsoft_auth_service import MicrosoftAuthService

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


class MicrosoftGraphService:
    def __init__(self, auth_service: Optional[MicrosoftAuthService] = None):
        self.auth_service = auth_service or MicrosoftAuthService()

    def _get_headers(self, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.auth_service.get_access_token()}",
            "Accept": "application/json",
        }
        if extra_headers:
            headers.update(extra_headers)
        return headers

    def _request(self, method: str, path: str, **kwargs):
        url = f"{GRAPH_BASE_URL}{path}"
        response = requests.request(method, url, timeout=60, **kwargs)
        if response.status_code == 412:
            raise requests.HTTPError("Conditional request failed due to an eTag conflict.")
        if response.status_code >= 400:
            try:
                payload = response.json()
                detail = payload.get("error", {}).get("message", response.text)
            except ValueError:
                detail = response.text
            raise requests.HTTPError(f"Microsoft Graph request failed ({response.status_code}): {detail}")
        return response

    def get_me_profile(self) -> Dict[str, Any]:
        response = self._request("GET", "/me", headers=self._get_headers())
        return response.json()

    def _encode_path_segment(self, segment: str) -> str:
        return quote(segment.replace("\\", "/"), safe="")

    def resolve_target_path(self, file_name: Optional[str] = None, folder_path: Optional[str] = None) -> str:
        file_name = file_name or os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx")
        folder = (folder_path or os.getenv("EXCEL_FOLDER_PATH", "")).strip()
        if folder:
            sanitized = folder.strip("/")
            encoded_parts = "/".join(self._encode_path_segment(part) for part in sanitized.split("/") if part)
            return f"/{encoded_parts}/{self._encode_path_segment(file_name)}"
        return f"/{self._encode_path_segment(file_name)}"

    def get_file_metadata(self, file_name: Optional[str] = None, folder_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        remote_path = self.resolve_target_path(file_name=file_name, folder_path=folder_path)
        try:
            response = self._request("GET", f"/me/drive/root:{remote_path}", headers=self._get_headers())
            return response.json()
        except requests.HTTPError:
            try:
                response = self._request(
                    "GET",
                    "/me/drive/root/search",
                    params={"q": file_name or os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx")},
                    headers=self._get_headers(),
                )
                items = response.json().get("value", [])
                for item in items:
                    if item.get("name") == (file_name or os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx")):
                        return item
            except requests.HTTPError:
                return None
            return None

    def download_file(self, file_id: Optional[str] = None, file_name: Optional[str] = None, folder_path: Optional[str] = None) -> bytes:
        item = None
        if file_id:
            response = self._request("GET", f"/me/drive/items/{file_id}/content", headers=self._get_headers())
            return response.content

        item = self.get_file_metadata(file_name=file_name, folder_path=folder_path)
        if not item:
            raise FileNotFoundError("AI_Job_Tracker.xlsx was not found in Microsoft OneDrive.")
        response = self._request("GET", f"/me/drive/items/{item['id']}/content", headers=self._get_headers())
        return response.content

    def upload_file(self, file_bytes: bytes, file_name: Optional[str] = None, folder_path: Optional[str] = None, item_id: Optional[str] = None, if_match: Optional[str] = None) -> Dict[str, Any]:
        file_name = file_name or os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx")
        target_path = self.resolve_target_path(file_name=file_name, folder_path=folder_path)
        headers = self._get_headers()
        headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if if_match:
            headers["If-Match"] = if_match

        if item_id:
            url = f"/me/drive/items/{item_id}/content"
            response = self._request("PUT", url, data=file_bytes, headers=headers)
        else:
            url = f"/me/drive/root:{target_path}:/content"
            response = self._request("PUT", url, data=file_bytes, headers=headers)

        payload = response.text.strip()
        if not payload:
            return {"success": True, "status": "uploaded"}
        try:
            return response.json()
        except ValueError:
            return {"success": True, "status": "uploaded", "raw": payload}

    def get_share_link(self, file_id: Optional[str] = None, permission: Optional[str] = None) -> Dict[str, Any]:
        permission = (permission or os.getenv("EXCEL_SHARE_PERMISSION", "view")).strip().lower()
        if permission not in {"view", "edit"}:
            permission = "view"

        item_id = file_id
        if not item_id:
            metadata = self.get_file_metadata()
            if not metadata:
                return {"share_supported": False, "permission": permission, "message": "Workbook not found in OneDrive; no share link could be created."}
            item_id = metadata.get("id")

        if not item_id:
            return {"share_supported": False, "permission": permission, "message": "Workbook metadata is unavailable; share link could not be created."}

        body = {"type": permission, "scope": "anonymous"}
        headers = self._get_headers({"Content-Type": "application/json"})
        try:
            response = self._request("POST", f"/me/drive/items/{item_id}/createLink", json=body, headers=headers)
            payload = response.json()
            link = payload.get("link", {})
            share_url = link.get("webUrl") or link.get("link") or ""
            if share_url:
                return {
                    "share_supported": True,
                    "permission": permission,
                    "share_url": share_url,
                    "web_url": payload.get("webUrl") or share_url,
                    "message": "Microsoft OneDrive sharing link is available.",
                }
            return {"share_supported": False, "permission": permission, "message": "Microsoft sharing policy prevents a public link for this OneDrive account."}
        except requests.HTTPError as exc:
            return {"share_supported": False, "permission": permission, "message": f"Microsoft sharing policy prevents that link type: {exc}"}

    def get_file_web_url(self, file_name: Optional[str] = None, folder_path: Optional[str] = None) -> Optional[str]:
        metadata = self.get_file_metadata(file_name=file_name, folder_path=folder_path)
        if not metadata:
            return None
        return metadata.get("webUrl") or metadata.get("web_url")
