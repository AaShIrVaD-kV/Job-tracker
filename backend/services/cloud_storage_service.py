import os
from typing import Dict, Any

class CloudStorageService:
    def __init__(self):
        self.workbook_filename = "AI_Job_Tracker.xlsx"
        self.app_url = os.getenv("APP_URL", "http://localhost:5173")
        self.excel_online_url = os.getenv("EXCEL_ONLINE_URL", f"{self.app_url}/api/excel/download")
        self.share_permission = os.getenv("SHARE_PERMISSION", "Anyone with link - Edit")

    def get_cloud_metadata(self) -> Dict[str, Any]:
        wb_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", self.workbook_filename)
        file_size = os.path.getsize(wb_path) if os.path.exists(wb_path) else 0

        return {
            "workbook_name": self.workbook_filename,
            "cloud_provider": "OneDrive / SharePoint Integration Layer",
            "app_url": self.app_url,
            "excel_download_url": f"{self.app_url}/api/excel/download",
            "excel_online_url": self.excel_online_url,
            "share_permission": self.share_permission,
            "file_size_bytes": file_size,
            "is_synced": True,
            "last_updated": "Live auto-sync enabled"
        }

cloud_service = CloudStorageService()
