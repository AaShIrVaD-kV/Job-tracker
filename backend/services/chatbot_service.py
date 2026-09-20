import re
from datetime import datetime
from typing import Dict, Any, List
from backend.services import excel_service

def process_chat_message(message: str) -> Dict[str, Any]:
    msg = message.strip()
    msg_lower = msg.lower()

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Match Status Commands like "J052 applied", "J001 assessment received", etc.
    id_match = re.search(r"\b(J\d+)\b", msg, re.IGNORECASE)
    
    if id_match:
        job_id = id_match.group(1).upper()
        all_jobs = excel_service.get_all_jobs()
        target_job = next((j for j in all_jobs if j.get("job_id", "").upper() == job_id), None)
        
        if not target_job:
            return {
                "reply": f"Could not find job `{job_id}` in your Excel tracker.",
                "action_taken": "error"
            }

        updates = {}
        reply_msg = ""

        if "applied" in msg_lower:
            updates["application_status"] = "Applied"
            if not target_job.get("application_date"):
                updates["application_date"] = today_str
            reply_msg = f"Done! `{job_id}` updated: **Application Status** → Applied, **Application Date** → {updates.get('application_date', today_str)}."
            
        elif "assessment" in msg_lower:
            updates["assessment"] = "Yes"
            updates["application_status"] = "Assessment"
            reply_msg = f"Done! `{job_id}` updated: **Assessment** → Yes, **Application Status** → Assessment."

        elif "interview" in msg_lower:
            updates["interview"] = "Yes"
            updates["application_status"] = "Interview"
            reply_msg = f"Awesome! `{job_id}` updated: **Interview** → Yes, **Application Status** → Interview."

        elif "offer" in msg_lower:
            updates["offer"] = "Yes"
            updates["application_status"] = "Offer"
            reply_msg = f"Congratulations! 🎉 `{job_id}` updated: **Offer** → Yes, **Application Status** → Offer."

        elif "rejected" in msg_lower or "rejection" in msg_lower:
            updates["application_status"] = "Rejected"
            reply_msg = f"Noted. `{job_id}` updated: **Application Status** → Rejected."

        elif "withdrawn" in msg_lower:
            updates["application_status"] = "Withdrawn"
            reply_msg = f"`{job_id}` updated: **Application Status** → Withdrawn."

        elif "on hold" in msg_lower:
            updates["application_status"] = "On Hold"
            reply_msg = f"`{job_id}` updated: **Application Status** → On Hold."

        if updates:
            success, updated_job = excel_service.update_job(job_id, updates)
            if success:
                return {
                    "reply": reply_msg,
                    "action_taken": "update_status",
                    "updated_job_id": job_id,
                    "job_data": updated_job
                }
            else:
                return {
                    "reply": f"Failed to update `{job_id}` in Excel.",
                    "action_taken": "error"
                }

    # Handle Queries
    jobs = excel_service.get_all_jobs()

    if "how many jobs" in msg_lower or "total jobs" in msg_lower:
        # Check location query e.g. "how many jobs in Bangalore"
        city_match = re.search(r"in\s+([A-Za-z]+)", msg_lower)
        if city_match:
            city = city_match.group(1).lower()
            matching = [j for j in jobs if city in j.get("location", "").lower()]
            return {
                "reply": f"You have **{len(matching)}** job(s) in `{city.capitalize()}`.",
                "action_taken": "query_count",
                "jobs_list": matching
            }

        # Check role query e.g. "how many Data Analyst jobs"
        if "data analyst" in msg_lower:
            matching = [j for j in jobs if "data analyst" in j.get("job_role", "").lower()]
            return {
                "reply": f"You have **{len(matching)}** Data Analyst job(s).",
                "action_taken": "query_count",
                "jobs_list": matching
            }

        return {
            "reply": f"You have a total of **{len(jobs)}** job(s) in your tracker.",
            "action_taken": "query_count"
        }

    if "applied" in msg_lower or "show my applied" in msg_lower:
        matching = [j for j in jobs if j.get("application_status") == "Applied"]
        return {
            "reply": f"Found **{len(matching)}** applied job(s):",
            "action_taken": "query_list",
            "jobs_list": matching
        }

    if "interview" in msg_lower or "show my interview" in msg_lower:
        matching = [j for j in jobs if j.get("interview") == "Yes" or j.get("application_status") == "Interview"]
        return {
            "reply": f"Found **{len(matching)}** interview job(s):",
            "action_taken": "query_list",
            "jobs_list": matching
        }

    if "assessment" in msg_lower or "assessment pending" in msg_lower:
        matching = [j for j in jobs if j.get("assessment") == "Yes" or j.get("application_status") == "Assessment"]
        return {
            "reply": f"Found **{len(matching)}** assessment job(s):",
            "action_taken": "query_list",
            "jobs_list": matching
        }

    if "high priority" in msg_lower:
        matching = [j for j in jobs if j.get("priority") == "High"]
        return {
            "reply": f"Found **{len(matching)}** high priority job(s):",
            "action_taken": "query_list",
            "jobs_list": matching
        }

    if "offer" in msg_lower:
        matching = [j for j in jobs if j.get("offer") == "Yes" or j.get("application_status") == "Offer"]
        return {
            "reply": f"Found **{len(matching)}** offer(s):",
            "action_taken": "query_list",
            "jobs_list": matching
        }

    # Default fallback
    return {
        "reply": "I can help you update job status or query your tracker! Try typing:\n- `J001 applied`\n- `J001 interview scheduled`\n- `How many jobs in Bangalore?`\n- `Show my high priority jobs`",
        "action_taken": "help"
    }
