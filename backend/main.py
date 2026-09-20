import os
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.models.job import (
    JobItem, JDParseRequest, DuplicateCheckRequest, 
    DuplicateCheckResponse, ChatRequest, ChatResponse
)
from backend.services import (
    excel_service, ai_parser, duplicate_service, 
    chatbot_service, cloud_storage_service
)

app = FastAPI(
    title="AI Job Tracker API",
    description="Backend API for AI Job Tracking Web Application with authoritative openpyxl Excel management",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    excel_service.init_tracker_workbook()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI Job Tracker Backend is running."}


@app.post("/api/jd/parse")
def parse_jd(payload: JDParseRequest):
    if not payload.jd_text or not payload.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job Description text cannot be empty.")

    parsed = ai_parser.parse_job_description(payload.jd_text)
    return parsed


@app.post("/api/jd/parse-image")
async def parse_image_job(
    jd_text: str = Form(default=""),
    files: List[UploadFile] = File(default_factory=list)
):
    if not jd_text.strip() and not files:
        raise HTTPException(status_code=400, detail="Please provide either text or at least one image.")

    valid_images = []
    max_size = 10 * 1024 * 1024
    allowed = {"image/jpeg", "image/png", "image/webp"}

    for file in files:
        content_type = (file.content_type or "").lower()
        if content_type and content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported file type for {file.filename}. Use JPG, JPEG, PNG, or WEBP.")
        if file.size and file.size > max_size:
            raise HTTPException(status_code=400, detail=f"{file.filename} is too large. Please upload images under 10 MB.")
        contents = await file.read()
        if len(contents) > max_size:
            raise HTTPException(status_code=400, detail=f"{file.filename} is too large. Please upload images under 10 MB.")
        valid_images.append(contents)

    parsed = ai_parser.parse_job_description_with_images(jd_text or "", valid_images)
    return parsed


@app.post("/api/jobs/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(payload: DuplicateCheckRequest):
    is_dup, matching_id, matching_job = duplicate_service.check_duplicate(
        company=payload.company,
        job_role=payload.job_role,
        location=payload.location
    )
    if is_dup:
        return DuplicateCheckResponse(
            is_duplicate=True,
            matching_job_id=matching_id,
            matching_job=matching_job,
            message=f"This job may already exist as {matching_id} ({payload.company} - {payload.job_role} - {payload.location})."
        )
    return DuplicateCheckResponse(is_duplicate=False)


@app.get("/api/jobs")
def list_jobs():
    jobs = excel_service.get_all_jobs()
    return {"total": len(jobs), "jobs": jobs}


@app.post("/api/jobs")
def save_job(job: JobItem):
    job_dict = job.dict(by_alias=False)
    added = excel_service.add_job(job_dict)
    return {"success": True, "message": f"Job {added['job_id']} added to Excel workbook successfully.", "job": added}


@app.put("/api/jobs/{job_id}")
def update_job_endpoint(job_id: str, updates: Dict[str, Any]):
    success, updated_job = excel_service.update_job(job_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found in Excel workbook.")
    return {"success": True, "message": f"Job {job_id} updated.", "job": updated_job}


@app.delete("/api/jobs/{job_id}")
def delete_job_endpoint(job_id: str):
    success = excel_service.delete_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return {"success": True, "message": f"Job {job_id} deleted."}


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    res = chatbot_service.process_chat_message(payload.message)
    return ChatResponse(**res)


@app.get("/api/summary")
def get_summary():
    data = excel_service.get_summary_data()
    return data


@app.post("/api/excel/import-preview")
async def import_preview(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")
    
    contents = await file.read()
    try:
        preview = excel_service.preview_import_file(contents, file.filename)
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/excel/import-confirm")
async def import_confirm(file: UploadFile = File(...), mode: str = Form(...)):
    if mode not in ["new", "merge"]:
        raise HTTPException(status_code=400, detail="Mode must be 'new' or 'merge'.")
        
    contents = await file.read()
    try:
        res = excel_service.confirm_import_file(contents, mode)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/excel/download")
def download_excel():
    path = excel_service.get_workbook_path()
    if not os.path.exists(path):
        excel_service.init_tracker_workbook()
    return FileResponse(
        path=path,
        filename="AI_Job_Tracker.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.get("/api/excel/share-info")
def share_info():
    info = cloud_storage_service.cloud_service.get_cloud_metadata()
    return info
