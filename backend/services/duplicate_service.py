import re
from typing import Dict, Any, Optional, Tuple
from backend.services import excel_service

def normalize_str(s: str) -> str:
    if not s:
        return ""
    # remove punctuation and extra spaces
    cleaned = re.sub(r"[^\w\s]", "", s.lower())
    return " ".join(cleaned.split())


def is_similar_string(s1: str, s2: str) -> bool:
    n1, n2 = normalize_str(s1), normalize_str(s2)
    if not n1 or not n2:
        return False
    if n1 == n2 or n1 in n2 or n2 in n1:
        return True
    return False


def check_duplicate(company: str, job_role: str, location: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    existing_jobs = excel_service.get_all_jobs()
    
    norm_comp = normalize_str(company)
    norm_role = normalize_str(job_role)
    norm_loc = normalize_str(location)

    for job in existing_jobs:
        ex_comp = normalize_str(job.get("company", ""))
        ex_role = normalize_str(job.get("job_role", ""))
        ex_loc = normalize_str(job.get("location", ""))

        comp_match = is_similar_string(norm_comp, ex_comp)
        role_match = is_similar_string(norm_role, ex_role)
        loc_match = is_similar_string(norm_loc, ex_loc) or norm_loc == "remote" or ex_loc == "remote"

        # Strong match: Company AND Role match, and Location matches or is flexible
        if comp_match and role_match and (loc_match or not norm_loc or not ex_loc):
            return True, job.get("job_id"), job

    return False, None, None
