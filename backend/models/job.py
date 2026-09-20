from typing import Optional, List
from pydantic import BaseModel, Field

class JobItem(BaseModel):
    job_id: str = Field(..., alias="Job ID", description="Format: J001, J002, etc.")
    priority: str = Field("Medium", alias="Priority", description="High, Medium, Low")
    company: str = Field(..., alias="Company")
    job_role: str = Field(..., alias="Job Role")
    function_category: str = Field("Other", alias="Function / Category")
    location: str = Field(..., alias="Location")
    work_mode: str = Field("Not Mentioned", alias="Work Mode")
    experience_eligibility: str = Field("Not Mentioned", alias="Experience / Eligibility")
    application_date: Optional[str] = Field("", alias="Application Date")
    application_status: str = Field("Saved", alias="Application Status")
    interview: str = Field("No", alias="Interview")
    offer: str = Field("No", alias="Offer")
    assessment: str = Field("No", alias="Assessment")

    class Config:
        populate_by_name = True

class JDParseRequest(BaseModel):
    jd_text: str

class JDParseResponse(BaseModel):
    job_id: str
    priority: str
    company: str
    job_role: str
    function_category: str
    location: str
    work_mode: str
    experience_eligibility: str
    application_date: str
    application_status: str
    interview: str
    offer: str
    assessment: str

class DuplicateCheckRequest(BaseModel):
    company: str
    job_role: str
    location: str

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    matching_job_id: Optional[str] = None
    matching_job: Optional[dict] = None
    message: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    action_taken: Optional[str] = None
    updated_job_id: Optional[str] = None
    job_data: Optional[dict] = None
    jobs_list: Optional[List[dict]] = None

class ImportPreviewRequest(BaseModel):
    filename: str

class ImportConfirmRequest(BaseModel):
    mode: str  # "new" or "merge"
