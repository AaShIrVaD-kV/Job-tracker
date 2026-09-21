import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.models.job import JDParseRequest
from backend.services import ai_parser, excel_service

load_dotenv()


def build_allowed_origins() -> List[str]:
    origins = {
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    }
    for value in [
        os.getenv("FRONTEND_URL", ""),
        os.getenv("APP_URL", ""),
    ]:
        if value:
            origins.add(value.rstrip("/"))
    return sorted(origins)


app = FastAPI(
    title="AI Job Tracker API",
    description="Backend API for AI Job Tracking Web Application with local browser-first persistence using Excel export/import and AI parsing.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=build_allowed_origins(),
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
    files: List[UploadFile] = File(default_factory=list),
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




@app.post("/api/excel/import-preview")
async def import_preview(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")

    contents = await file.read()
    try:
        return excel_service.preview_import_file(contents, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/excel/import-confirm")
async def import_confirm(file: UploadFile = File(...), mode: str = Form(...)):
    if mode not in ["new", "merge"]:
        raise HTTPException(status_code=400, detail="Mode must be 'new' or 'merge'.")

    contents = await file.read()
    try:
        return excel_service.confirm_import_file(contents, mode)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/excel/download")
def download_excel():
    path = excel_service.get_workbook_path()
    if not os.path.exists(path):
        excel_service.init_tracker_workbook()
    return FileResponse(
        path=path,
        filename="AI_Job_Tracker.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/api/excel/share-info")
def share_info():
    return {
        "success": True,
        "mode": "local_storage",
        "message": "The browser local storage is the source of truth for this job tracker.",
        "workbook_name": "AI_Job_Tracker.xlsx",
        "cloud_provider": "Local Storage",
    }
