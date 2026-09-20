import requests

BASE_URL = "http://127.0.0.1:8000"

def test_e2e():
    print("--- 1. Testing Health Endpoint ---")
    res = requests.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("Health check OK:", res.json())

    print("\n--- 2. Testing AI JD Parsing ---")
    jd_payload = {
        "jd_text": "Accenture is hiring a Data Analyst in Bangalore. Work Mode: Hybrid. Experience: 0-2 years. Requirements: SQL, Power BI, Excel reporting."
    }
    res_parse = requests.post(f"{BASE_URL}/api/jd/parse", json=jd_payload)
    assert res_parse.status_code == 200, f"Parse failed: {res_parse.text}"
    parsed_job = res_parse.json()
    print("Extracted 13 fields:")
    for k, v in parsed_job.items():
        print(f"  {k}: {v}")
    
    assert parsed_job["company"] == "Accenture"
    assert parsed_job["job_role"] == "Data Analyst"
    assert parsed_job["location"] == "Bangalore"
    assert parsed_job["work_mode"] == "Hybrid"

    print("\n--- 3. Testing Duplicate Check (Before Saving) ---")
    dup_res = requests.post(f"{BASE_URL}/api/jobs/check-duplicate", json={
        "company": "Accenture",
        "job_role": "Data Analyst",
        "location": "Bangalore"
    })
    print("Duplicate Check Result (empty tracker):", dup_res.json())

    print("\n--- 4. Saving Job J001 to AI_Job_Tracker.xlsx ---")
    res_save = requests.post(f"{BASE_URL}/api/jobs", json=parsed_job)
    assert res_save.status_code == 200, f"Save failed: {res_save.text}"
    print("Saved J001:", res_save.json()["message"])

    print("\n--- 5. Saving Job J002 (IBM Hyderabad) ---")
    job2 = {
        "job_id": "J002",
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
    res_save2 = requests.post(f"{BASE_URL}/api/jobs", json=job2)
    print("Saved J002:", res_save2.json()["message"])

    print("\n--- 6. Testing Duplicate Check (After Saving) ---")
    dup_res2 = requests.post(f"{BASE_URL}/api/jobs/check-duplicate", json={
        "company": "Accenture",
        "job_role": "Data Analyst",
        "location": "Bangalore"
    })
    assert dup_res2.json()["is_duplicate"] == True, "Should detect Accenture Data Analyst duplicate"
    print("Duplicate Check Result:", dup_res2.json())

    print("\n--- 7. Testing Chatbot Status Command ('J001 applied') ---")
    chat_res = requests.post(f"{BASE_URL}/api/chat", json={"message": "J001 applied"})
    assert chat_res.status_code == 200
    print("Chatbot Reply:", chat_res.json()["reply"])

    print("\n--- 8. Testing Chatbot Milestone Command ('J001 interview scheduled') ---")
    chat_res2 = requests.post(f"{BASE_URL}/api/chat", json={"message": "J001 interview scheduled"})
    assert chat_res2.status_code == 200
    print("Chatbot Reply:", chat_res2.json()["reply"])

    print("\n--- 9. Testing Summary Endpoint ---")
    summary_res = requests.get(f"{BASE_URL}/api/summary")
    summary = summary_res.json()
    print("Summary Metrics:")
    print("  Total Jobs:", summary["total_jobs"])
    print("  Applied:", summary["applied"])
    print("  Interviews:", summary["interviews"])
    print("  Location Breakdown (City Level):", summary["location_breakdown"])

    assert summary["total_jobs"] >= 2
    assert summary["location_breakdown"]["Bangalore"] >= 1
    assert summary["location_breakdown"]["Hyderabad"] >= 1

    print("\n--- 10. Testing Excel Download Endpoint ---")
    dl_res = requests.get(f"{BASE_URL}/api/excel/download")
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 0
    print(f"Downloaded AI_Job_Tracker.xlsx size: {len(dl_res.content)} bytes")

    print("\n🎉 ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_e2e()
