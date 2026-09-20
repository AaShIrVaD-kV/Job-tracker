import os
import sys
import unittest

# Add workspace root to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services import excel_service, ai_parser, duplicate_service, chatbot_service

class TestAIJobTrackerBackend(unittest.TestCase):

    def setUp(self):
        # Reset tracker workbook before testing
        path = excel_service.get_workbook_path()
        if os.path.exists(path):
            os.remove(path)
        excel_service.init_tracker_workbook()

    def test_01_workbook_initialization(self):
        path = excel_service.get_workbook_path()
        self.assertTrue(os.path.exists(path), "Workbook file should exist")
        jobs = excel_service.get_all_jobs()
        self.assertEqual(len(jobs), 0, "Initial jobs should be 0")

    def test_02_add_and_generate_ids(self):
        job1 = {
            "priority": "High",
            "company": "Accenture",
            "job_role": "Data Analyst",
            "function_category": "Data Analytics",
            "location": "Bangalore",
            "work_mode": "Hybrid",
            "experience_eligibility": "0–2 years",
            "application_date": "",
            "application_status": "Saved",
            "interview": "No",
            "offer": "No",
            "assessment": "No"
        }
        res1 = excel_service.add_job(job1)
        self.assertEqual(res1["job_id"], "J001")

        job2 = {
            "priority": "Medium",
            "company": "IBM",
            "job_role": "Data Analyst",
            "function_category": "Data Analytics",
            "location": "Hyderabad",
            "work_mode": "Remote",
            "experience_eligibility": "Fresher",
            "application_date": "",
            "application_status": "Saved",
            "interview": "No",
            "offer": "No",
            "assessment": "No"
        }
        res2 = excel_service.add_job(job2)
        self.assertEqual(res2["job_id"], "J002")

        jobs = excel_service.get_all_jobs()
        self.assertEqual(len(jobs), 2)

    def test_03_duplicate_check(self):
        job = {
            "priority": "High",
            "company": "Accenture",
            "job_role": "Data Analyst",
            "function_category": "Data Analytics",
            "location": "Bangalore",
            "work_mode": "Hybrid"
        }
        excel_service.add_job(job)

        is_dup, matching_id, _ = duplicate_service.check_duplicate("Accenture", "Data Analyst", "Bangalore")
        self.assertTrue(is_dup, "Should detect duplicate for Accenture Data Analyst Bangalore")
        self.assertEqual(matching_id, "J001")

    def test_04_chatbot_commands(self):
        job = {
            "priority": "High",
            "company": "Accenture",
            "job_role": "Data Analyst",
            "location": "Bangalore"
        }
        excel_service.add_job(job)  # J001

        # Test "J001 applied"
        res = chatbot_service.process_chat_message("J001 applied")
        self.assertEqual(res["action_taken"], "update_status")
        
        jobs = excel_service.get_all_jobs()
        self.assertEqual(jobs[0]["application_status"], "Applied")
        self.assertTrue(len(jobs[0]["application_date"]) > 0, "Application date should be set")

        # Test "J001 interview scheduled"
        res_int = chatbot_service.process_chat_message("J001 interview scheduled")
        self.assertEqual(res_int["action_taken"], "update_status")
        
        jobs_after = excel_service.get_all_jobs()
        self.assertEqual(jobs_after[0]["interview"], "Yes")
        self.assertEqual(jobs_after[0]["application_status"], "Interview")

    def test_05_summary_data(self):
        excel_service.add_job({"company": "Co1", "job_role": "R1", "location": "Bangalore", "application_status": "Applied"})
        excel_service.add_job({"company": "Co2", "job_role": "R2", "location": "Chennai", "application_status": "Saved"})
        excel_service.add_job({"company": "Co3", "job_role": "R3", "location": "Bangalore", "application_status": "Interview", "interview": "Yes"})

        summary = excel_service.get_summary_data()
        self.assertEqual(summary["total_jobs"], 3)
        self.assertEqual(summary["location_breakdown"].get("Bangalore"), 2)
        self.assertEqual(summary["location_breakdown"].get("Chennai"), 1)

    def test_06_parse_text_plus_images_combines_sources(self):
        combined = ai_parser.parse_job_description_with_images(
            "Found this on LinkedIn. Please track it.",
            [b"fake-image-bytes-1", b"fake-image-bytes-2"]
        )

        self.assertIn(combined["job_id"], ["J001", "J002", "J003"])
        self.assertIn(combined["application_status"], ["Saved", "Applied"])
        self.assertIn(combined["priority"], ["High", "Medium", "Low"])
        self.assertIsInstance(combined["company"], str)
        self.assertIsInstance(combined["job_role"], str)
        self.assertIsInstance(combined["location"], str)

if __name__ == "__main__":
    unittest.main()
