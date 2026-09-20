import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services import microsoft_auth_service


class TestMicrosoftIntegration(unittest.TestCase):
    def setUp(self):
        os.environ["MICROSOFT_CLIENT_ID"] = "client-123"
        os.environ["MICROSOFT_CLIENT_SECRET"] = "secret-123"
        os.environ["MICROSOFT_TENANT_ID"] = "common"
        os.environ["MICROSOFT_REDIRECT_URI"] = "https://example.com/auth/microsoft/callback"
        os.environ["MICROSOFT_SCOPES"] = "Files.ReadWrite,User.Read,offline_access,openid,profile"
        os.environ["FRONTEND_URL"] = "https://example.com"
        os.environ["APP_URL"] = "https://api.example.com"
        os.environ["EXCEL_FILE_NAME"] = "AI_Job_Tracker.xlsx"
        os.environ["EXCEL_SHARE_PERMISSION"] = "view"

    def test_auth_configuration_loaded(self):
        cfg = microsoft_auth_service.get_microsoft_config()
        self.assertEqual(cfg["client_id"], "client-123")
        self.assertEqual(cfg["tenant_id"], "common")
        self.assertEqual(cfg["redirect_uri"], "https://example.com/auth/microsoft/callback")

    def test_login_url_contains_required_parameters(self):
        service = microsoft_auth_service.MicrosoftAuthService()
        url = service.build_login_url("state-123")
        self.assertIn("https://login.microsoftonline.com/common/oauth2/v2.0/authorize", url)
        self.assertIn("client_id=client-123", url)
        self.assertIn("state=state-123", url)
        self.assertIn("redirect_uri=https%3A%2F%2Fexample.com%2Fauth%2Fmicrosoft%2Fcallback", url)

    def test_callback_requires_state_match(self):
        service = microsoft_auth_service.MicrosoftAuthService()
        result = service.handle_callback("code-1", "bad-state", "good-state")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_state")


if __name__ == "__main__":
    unittest.main()
