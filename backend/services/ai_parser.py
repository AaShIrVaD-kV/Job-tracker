import base64
import io
import json
import os
import re
import requests
from typing import Any, Dict, List, Optional

from backend.services import excel_service

CATEGORIES = [
    "Data Analytics", "Business Analytics", "Finance", "Accounting",
    "HR", "Business Intelligence", "IT", "Consulting", "MIS", "Other"
]

CITIES = [
    "Bangalore", "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Cochin",
    "Pune", "Mumbai", "Delhi", "Gurgaon", "Gurugram", "Noida", "Kolkata",
    "Ahmedabad", "Trivandrum", "Thiruvananthapuram", "Coimbatore", "Remote"
]

WORK_MODES = ["On-site", "Hybrid", "Remote", "Not Mentioned"]


def _default_job_result(job_id: str, *, include_review: bool = False) -> Dict[str, Any]:
    company = "Needs Review" if include_review else "Not Mentioned"
    job_role = "Needs Review" if include_review else "Not Mentioned"
    location = "Needs Review" if include_review else "Not Mentioned"
    return {
        "job_id": job_id,
        "priority": "Medium",
        "company": company,
        "job_role": job_role,
        "function_category": "Other",
        "location": location,
        "work_mode": "Not Mentioned",
        "experience_eligibility": "Needs Review" if include_review else "Not Mentioned",
        "application_date": "",
        "application_status": "Saved",
        "interview": "No",
        "offer": "No",
        "assessment": "No",
    }


def _normalize_value(value: Any, fallback: str = "Not Mentioned") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _coerce_job_fields(parsed: Dict[str, Any], job_id: str) -> Dict[str, Any]:
    result = {
        "job_id": job_id,
        "priority": parsed.get("priority") or "Medium",
        "company": _normalize_value(parsed.get("company"), "Not Mentioned"),
        "job_role": _normalize_value(parsed.get("job_role"), "Not Mentioned"),
        "function_category": _normalize_value(parsed.get("function_category"), "Other"),
        "location": _normalize_value(parsed.get("location"), "Not Mentioned"),
        "work_mode": _normalize_value(parsed.get("work_mode"), "Not Mentioned"),
        "experience_eligibility": _normalize_value(parsed.get("experience_eligibility"), "Not Mentioned"),
        "application_date": parsed.get("application_date") or "",
        "application_status": parsed.get("application_status") or "Saved",
        "interview": parsed.get("interview") or "No",
        "offer": parsed.get("offer") or "No",
        "assessment": parsed.get("assessment") or "No",
    }

    if result["priority"] not in ["High", "Medium", "Low"]:
        result["priority"] = "Medium"
    if result["function_category"] not in CATEGORIES:
        result["function_category"] = "Other"
    if result["work_mode"] not in WORK_MODES:
        result["work_mode"] = "Not Mentioned"
    if result["application_status"] not in ["Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn", "On Hold"]:
        result["application_status"] = "Saved"
    if result["interview"] not in ["Yes", "No"]:
        result["interview"] = "No"
    if result["offer"] not in ["Yes", "No"]:
        result["offer"] = "No"
    if result["assessment"] not in ["Yes", "No"]:
        result["assessment"] = "No"

    return result


def heuristic_parse_jd(jd_text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in jd_text.split('\n') if line.strip()]
    text_lower = jd_text.lower()

    company = "Unknown Company"
    company_match = re.search(r"(?:company|organization|about)\s*:\s*([A-Za-z0-9\s.,&-]+)", jd_text, re.IGNORECASE)
    if company_match:
        company = company_match.group(1).split('\n')[0].strip()
    elif lines:
        first_line = lines[0]
        if "hiring" in first_line.lower() or "looking for" in first_line.lower() or "at " in first_line.lower():
            at_match = re.search(r"\bat\s+([A-Z][A-Za-z0-9\s&]+)", first_line)
            if at_match:
                company = at_match.group(1).strip()
            else:
                company = first_line[:40]
        else:
            if len(first_line) < 40 and not any(kw in first_line.lower() for kw in ["role", "description", "job"]):
                company = first_line
            elif len(lines) > 1 and len(lines[1]) < 40:
                company = lines[1]

    company = re.sub(r"^(about|company|hiring|at)\s*:\s*", "", company, flags=re.IGNORECASE).strip()
    if len(company) > 40:
        company = company[:40].strip()

    job_role = "Job Title Not Specified"
    role_patterns = [
        r"(?:job title|role|position|designation|title)\s*:\s*([A-Za-z0-9\s/&-]+)",
        r"\b(Data Analyst|Business Analyst|MIS Executive|Financial Analyst|Software Engineer|BI Developer|HR Manager|Consultant|Data Engineer|System Analyst|Accountant)\b"
    ]
    for pattern in role_patterns:
        match = re.search(pattern, jd_text, re.IGNORECASE)
        if match:
            job_role = match.group(1).strip()
            break

    if job_role == "Job Title Not Specified" and lines:
        for line in lines[:3]:
            if any(role_kw in line.lower() for role_kw in ["analyst", "executive", "engineer", "developer", "manager", "specialist", "consultant"]):
                job_role = line.split(" - ")[0].split("|")[0].strip()
                break

    if len(job_role) > 50:
        job_role = job_role[:50].strip()

    category = "Other"
    if any(k in text_lower for k in ["data analyst", "data analytics", "data science", "sql", "pandas", "data visualization"]):
        category = "Data Analytics"
    elif any(k in text_lower for k in ["business analyst", "requirement gathering", "brd", "use case"]):
        category = "Business Analytics"
    elif any(k in text_lower for k in ["bi developer", "power bi", "tableau", "looker", "dashboard"]):
        category = "Business Intelligence"
    elif any(k in text_lower for k in ["finance", "financial", "wealth", "banking"]):
        category = "Finance"
    elif any(k in text_lower for k in ["accounting", "tally", "ledger", "tax", "gst"]):
        category = "Accounting"
    elif any(k in text_lower for k in ["mis executive", "excel reporting", "vlookup", "pivot table"]):
        category = "MIS"
    elif any(k in text_lower for k in ["hr", "human resource", "talent acquisition", "recruiter"]):
        category = "HR"
    elif any(k in text_lower for k in ["consultant", "advisory"]):
        category = "Consulting"
    elif any(k in text_lower for k in ["software", "developer", "it", "python", "java", "tech"]):
        category = "IT"

    location = "Not Mentioned"
    loc_match = re.search(r"(?:location|city|job location|work location)\s*:\s*([A-Za-z0-9\s,]+)", jd_text, re.IGNORECASE)
    if loc_match:
        raw_loc = loc_match.group(1).split('\n')[0].strip()
        primary_city = raw_loc.split(',')[0].strip()
        if primary_city:
            location = primary_city
    else:
        for city in CITIES:
            if re.search(rf"\b{city}\b", jd_text, re.IGNORECASE):
                location = "Bangalore" if city.lower() in ["bangalore", "bengaluru"] else ("Kochi" if city.lower() in ["kochi", "cochin"] else city.capitalize())
                break

    work_mode = "Not Mentioned"
    if "hybrid" in text_lower:
        work_mode = "Hybrid"
    elif "remote" in text_lower or "work from home" in text_lower or "wfh" in text_lower:
        work_mode = "Remote"
    elif "on-site" in text_lower or "onsite" in text_lower or "office" in text_lower or "in-office" in text_lower:
        work_mode = "On-site"

    exp_eligibility = "Not Mentioned"
    exp_patterns = [
        r"(?:experience|exp|eligibility|qualification)\s*:\s*([A-Za-z0-9\s+–\-yearsFRESHERfresherb.comMBAmba]+)",
        r"(\d+[\s]*[-–to]+[\s]*\d+[\s]*years?)",
        r"(0[\s]*[-–to]+[\s]*[123][\s]*years?)",
        r"\b(fresher|freshers|0 years|entry level)\b",
        r"\b(B\.?Com|MBA|B\.?Tech|B\.?E|M\.?Tech)\b"
    ]
    for ep in exp_patterns:
        match = re.search(ep, jd_text, re.IGNORECASE)
        if match:
            raw_exp = match.group(0).strip()
            if "experience" in raw_exp.lower():
                raw_exp = match.group(1).split('\n')[0].strip() if match.lastindex else raw_exp
            exp_eligibility = raw_exp[:35]
            break

    priority = "Medium"
    if any(p_kw in text_lower for k_kw in ["urgent", "immediate joiner", "high priority", "critical role"] for p_kw in [k_kw]):
        priority = "High"

    return {
        "priority": priority,
        "company": company,
        "job_role": job_role,
        "function_category": category,
        "location": location,
        "work_mode": work_mode,
        "experience_eligibility": exp_eligibility,
        "application_date": "",
        "application_status": "Saved",
        "interview": "No",
        "offer": "No",
        "assessment": "No"
    }


def _guess_image_mime(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:12]:
        return "image/webp"
    return "image/png"


def _ocr_image_text(image_files: List[bytes]) -> str:
    try:
        import pytesseract
        from PIL import Image

        chunks: List[str] = []
        for image_bytes in image_files:
            try:
                image = Image.open(io.BytesIO(image_bytes))
                text = pytesseract.image_to_string(image)
                if text and text.strip():
                    chunks.append(text.strip())
            except Exception:
                continue

        if chunks:
            return "\n".join(chunks)
    except Exception:
        pass
    return ""


def _extract_with_gemini(jd_text: str, image_files: List[bytes]) -> Optional[Dict[str, Any]]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or not image_files:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        prompt = """
You are extracting a job application record from uploaded screenshots and optional notes.
Combine all uploaded images into one single job record.
Extract ONLY these fields and return raw JSON:

1. priority: "High", "Medium", or "Low"
2. company: Company name or "Not Mentioned"
3. job_role: Job title or "Not Mentioned"
4. function_category: one of ["Data Analytics", "Business Analytics", "Finance", "Accounting", "HR", "Business Intelligence", "IT", "Consulting", "MIS", "Other"]
5. location: city name or "Not Mentioned"
6. work_mode: one of ["On-site", "Hybrid", "Remote", "Not Mentioned"]
7. experience_eligibility: exact experience/eligibility text or "Not Mentioned"
8. application_date: ""
9. application_status: "Saved"
10. interview: "No"
11. offer: "No"
12. assessment: "No"

Rules:
- Do not add any columns beyond these 12 fields.
- If a field is blurry or unreadable, use "Needs Review" instead of guessing.
- If a field is simply not present, use "Not Mentioned".
- Combine text from multiple screenshots to create one job, not multiple jobs.
- Use the additional text when it helps clarify a value.

Additional text from user:
"""
        if jd_text and jd_text.strip():
            prompt += jd_text.strip()
        else:
            prompt += "No additional text provided."

        prompt += "\n\nReturn ONLY raw JSON object."

        parts: List[Dict[str, Any]] = [{"text": prompt}]
        for idx, image_bytes in enumerate(image_files, start=1):
            parts.append({
                "inline_data": {
                    "mime_type": _guess_image_mime(image_bytes),
                    "data": base64.b64encode(image_bytes).decode("utf-8")
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        response = requests.post(url, json=payload, timeout=20)
        if response.status_code == 200:
            content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        pass
    return None


def parse_job_description_with_images(jd_text: str = "", image_files: Optional[List[bytes]] = None) -> Dict[str, Any]:
    next_id = excel_service.get_next_job_id()
    files = image_files or []
    normalized_text = (jd_text or "").strip()

    if not normalized_text and not files:
        return _default_job_result(next_id, include_review=True)

    if normalized_text and not files:
        return parse_job_description(normalized_text)

    try:
        if files:
            parsed = _extract_with_gemini(normalized_text, files)
            if parsed:
                return _coerce_job_fields(parsed, next_id)

            ocr_text = _ocr_image_text(files)
            combined_text = "\n".join(filter(None, [normalized_text, ocr_text]))
            if combined_text.strip():
                parsed = heuristic_parse_jd(combined_text)
                return _coerce_job_fields(parsed, next_id)
    except Exception:
        pass

    if normalized_text:
        parsed = heuristic_parse_jd(normalized_text)
        return _coerce_job_fields(parsed, next_id)

    return _default_job_result(next_id, include_review=True)


def parse_job_description(jd_text: str) -> Dict[str, Any]:
    next_id = excel_service.get_next_job_id()
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            prompt = f"""
Extract EXACTLY these fields from the following Job Description (JD) text as JSON:

1. priority: "High", "Medium", or "Low"
2. company: Company Name
3. job_role: Actual job title (e.g., Data Analyst, MIS Executive, Business Analyst)
4. function_category: Exactly one of ["Data Analytics", "Business Analytics", "Finance", "Accounting", "HR", "Business Intelligence", "IT", "Consulting", "MIS", "Other"]
5. location: Primary city name only (e.g., Bangalore, Chennai, Hyderabad, Pune, Mumbai, Kochi, Remote). If "Bangalore, Karnataka", use "Bangalore".
6. work_mode: Exactly one of ["On-site", "Hybrid", "Remote", "Not Mentioned"]
7. experience_eligibility: e.g. "0–2 years", "Freshers", "1–3 years", "B.Com / MBA", or "Not Mentioned"
8. application_date: ""
9. application_status: "Saved"
10. interview: "No"
11. offer: "No"
12. assessment: "No"

Job Description:
\"\"\"
{jd_text}
\"\"\"

Return ONLY raw JSON object.
"""
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(content)
                return _coerce_job_fields(parsed, next_id)
        except Exception:
            pass

    parsed = heuristic_parse_jd(jd_text)
    return _coerce_job_fields(parsed, next_id)
