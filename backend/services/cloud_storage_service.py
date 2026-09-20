import os
from typing import Any, Dict, Optional

from backend.services import excel_service
from backend.services.microsoft_auth_service import MicrosoftAuthService
from backend.services.microsoft_graph_service import MicrosoftGraphService


class CloudStorageService:
    def __init__(self):
        self.workbook_filename = os.getenv("EXCEL_FILE_NAME", "AI_Job_Tracker.xlsx")
        self.folder_path = os.getenv("EXCEL_FOLDER_PATH", "").strip()
        self.share_permission = os.getenv("EXCEL_SHARE_PERMISSION", "view").strip().lower()
        self.app_url = os.getenv("APP_URL", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", self.app_url)
        self.excel_download_url = f"{self.app_url}/api/excel/download"
        self.excel_online_url = os.getenv("EXCEL_ONLINE_URL", self.excel_download_url)
        self.auth_service = MicrosoftAuthService()
        self.graph_service = MicrosoftGraphService(auth_service=self.auth_service)
        self.file_id: Optional[str] = None
        self.etag: Optional[str] = None
        self.last_modified: Optional[str] = None

    def is_connected(self) -> bool:
        return self.auth_service.is_connected()

    def get_remote_file_metadata(self) -> Optional[Dict[str, Any]]:
        if not self.is_connected():
            return None
        return self.graph_service.get_file_metadata(self.workbook_filename, self.folder_path)

    def ensure_cloud_workbook(self) -> Dict[str, Any]:
        if not self.is_connected():
            raise RuntimeError("Microsoft authentication required before cloud sync can begin.")

        existing = self.get_remote_file_metadata()
        if existing:
            self.file_id = existing.get("id")
            self.etag = existing.get("eTag")
            self.last_modified = existing.get("lastModifiedDateTime")
            return existing

        local_path = excel_service.get_workbook_path()
        if not os.path.exists(local_path):
            excel_service.init_tracker_workbook()

        with open(local_path, "rb") as workbook_file:
            uploaded = self.graph_service.upload_file(workbook_file.read(), self.workbook_filename, self.folder_path)

        metadata = self.get_remote_file_metadata()
        if metadata:
            self.file_id = metadata.get("id")
            self.etag = metadata.get("eTag")
            self.last_modified = metadata.get("lastModifiedDateTime")
        return metadata or uploaded

    def download_cloud_workbook(self) -> bytes:
        if not self.is_connected():
            raise RuntimeError("Microsoft OneDrive authentication required. Sign in to access the workbook.")

        metadata = self.ensure_cloud_workbook()
        if not metadata:
            raise FileNotFoundError("No workbook was found in OneDrive and it could not be created.")

        file_id = metadata.get("id")
        if not file_id:
            raise FileNotFoundError("OneDrive workbook metadata did not include a file identifier.")

        self.file_id = file_id
        self.etag = metadata.get("eTag")
        self.last_modified = metadata.get("lastModifiedDateTime")
        return self.graph_service.download_file(file_id=file_id)

    def sync_workbook_to_cloud(self, workbook_path: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_connected():
            return {
                "success": False,
                "error": "auth_required",
                "message": "Microsoft OneDrive authentication required before uploading the workbook.",
            }

        local_path = workbook_path or excel_service.get_workbook_path()
        if not os.path.exists(local_path):
            excel_service.init_tracker_workbook()

        with open(local_path, "rb") as workbook_file:
            workbook_bytes = workbook_file.read()

        metadata = self.get_remote_file_metadata()
        if metadata:
            self.file_id = metadata.get("id")
            self.etag = metadata.get("eTag")
            self.last_modified = metadata.get("lastModifiedDateTime")
            try:
                result = self.graph_service.upload_file(
                    workbook_bytes,
                    file_name=self.workbook_filename,
                    folder_path=self.folder_path,
                    item_id=self.file_id,
                    if_match=self.etag,
                )
                refreshed = self.get_remote_file_metadata() or {}
                self.file_id = refreshed.get("id") or self.file_id
                self.etag = refreshed.get("eTag") or self.etag
                self.last_modified = refreshed.get("lastModifiedDateTime") or self.last_modified
                return {
                    "success": True,
                    "message": "Cloud workbook uploaded successfully.",
                    "file_id": self.file_id,
                    "etag": self.etag,
                    "last_modified": self.last_modified,
                    "metadata": refreshed,
                    "result": result,
                }
            except Exception as exc:
                message = str(exc)
                if "412" in message or "eTag conflict" in message.lower() or "excel_conflict" in message.lower():
                    return {
                        "success": False,
                        "error": "excel_conflict",
                        "message": "The Excel file changed in OneDrive while this update was being prepared. Please reload the tracker and try again.",
                    }
                return {"success": False, "error": "upload_failed", "message": message}

        upload_result = self.graph_service.upload_file(workbook_bytes, self.workbook_filename, self.folder_path)
        refreshed = self.get_remote_file_metadata() or {}
        self.file_id = refreshed.get("id") or self.file_id
        self.etag = refreshed.get("eTag") or self.etag
        self.last_modified = refreshed.get("lastModifiedDateTime") or self.last_modified
        return {
            "success": True,
            "message": "Cloud workbook created and uploaded successfully.",
            "file_id": self.file_id,
            "etag": self.etag,
            "last_modified": self.last_modified,
            "metadata": refreshed,
            "result": upload_result,
        }

    def get_cloud_metadata(self) -> Dict[str, Any]:
        if not self.is_connected():
            return {
                "success": False,
                "connected": False,
                "provider": "Microsoft OneDrive",
                "workbook_name": self.workbook_filename,
                "file_name": self.workbook_filename,
                "file_exists": False,
                "file_id": None,
                "web_url": None,
                "share_url": None,
                "permission": self.share_permission,
                "is_synced": False,
                "last_updated": None,
                "message": "Microsoft authentication required. Connect OneDrive to access the cloud workbook.",
                "app_url": self.app_url,
                "excel_download_url": self.excel_download_url,
                "excel_online_url": self.excel_online_url,
                "share_permission": self.share_permission,
                "file_size_bytes": 0,
            }

        try:
            metadata = self.ensure_cloud_workbook()
        except Exception as exc:
            return {
                "success": False,
                "connected": False,
                "provider": "Microsoft OneDrive",
                "workbook_name": self.workbook_filename,
                "file_name": self.workbook_filename,
                "file_exists": False,
                "file_id": None,
                "web_url": None,
                "share_url": None,
                "permission": self.share_permission,
                "is_synced": False,
                "last_updated": None,
                "message": str(exc),
                "app_url": self.app_url,
                "excel_download_url": self.excel_download_url,
                "excel_online_url": self.excel_online_url,
                "share_permission": self.share_permission,
                "file_size_bytes": 0,
            }

        if not metadata:
            return {
                "success": False,
                "connected": True,
                "provider": "Microsoft OneDrive",
                "workbook_name": self.workbook_filename,
                "file_name": self.workbook_filename,
                "file_exists": False,
                "file_id": None,
                "web_url": None,
                "share_url": None,
                "permission": self.share_permission,
                "is_synced": False,
                "last_updated": None,
                "message": "The workbook could not be found in OneDrive.",
                "app_url": self.app_url,
                "excel_download_url": self.excel_download_url,
                "excel_online_url": self.excel_online_url,
                "share_permission": self.share_permission,
                "file_size_bytes": 0,
            }

        self.file_id = metadata.get("id")
        self.etag = metadata.get("eTag")
        self.last_modified = metadata.get("lastModifiedDateTime")
        share_info = self.graph_service.get_share_link(file_id=self.file_id, permission=self.share_permission)
        web_url = metadata.get("webUrl") or self.graph_service.get_file_web_url(self.workbook_filename, self.folder_path)

        file_size = 0
        local_path = excel_service.get_workbook_path()
        if os.path.exists(local_path):
            file_size = os.path.getsize(local_path)

        return {
            "success": True,
            "connected": True,
            "provider": "Microsoft OneDrive",
            "workbook_name": self.workbook_filename,
            "file_name": self.workbook_filename,
            "file_exists": True,
            "file_id": self.file_id,
            "web_url": web_url,
            "share_url": share_info.get("share_url") or web_url,
            "share_supported": share_info.get("share_supported", bool(share_info.get("share_url"))),
            "permission": self.share_permission,
            "is_synced": True,
            "last_updated": self.last_modified,
            "etag": self.etag,
            "message": "Cloud workbook is available in Microsoft OneDrive.",
            "app_url": self.app_url,
            "excel_download_url": self.excel_download_url,
            "excel_online_url": self.excel_online_url,
            "share_permission": self.share_permission,
            "file_size_bytes": file_size,
            "cloud_provider": "Microsoft OneDrive",
        }

    def get_cloud_status(self) -> Dict[str, Any]:
        metadata = self.get_cloud_metadata()
        return {
            "connected": metadata.get("connected", False),
            "provider": metadata.get("provider", "Microsoft OneDrive"),
            "file_name": metadata.get("file_name", self.workbook_filename),
            "file_exists": metadata.get("file_exists", False),
            "file_id": metadata.get("file_id"),
            "web_url": metadata.get("web_url"),
            "share_url": metadata.get("share_url"),
            "last_modified": metadata.get("last_updated"),
            "etag": metadata.get("etag"),
            "message": metadata.get("message", "Cloud workbook is available"),
        }


cloud_service = CloudStorageService()
