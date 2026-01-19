from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# Enum for bug verification status
class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    NOT_REPRODUCIBLE = "not_reproducible"
    FIXED = "fixed"


# Input model for new bugs from bugs.json
class BugInput(BaseModel):
    app_name: str
    app_package: Optional[str] = None  # Optional - LLM will resolve from app_name
    bug: str


# Full bug model stored in developer.json
class DeveloperBug(BaseModel):
    id: str
    app_name: str
    app_package: str
    bug: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: VerificationStatus = VerificationStatus.PENDING
    severity: Optional[int] = Field(default=None, ge=1, le=5)  # None until LLM analyzes
    last_verified: Optional[str] = None
    notes: str = ""


# Result model from DroidRun verification
class VerificationResult(BaseModel):
    success: bool = Field(description="Whether the bug was reproduced")
    steps_executed: List[str] = Field(description="Steps that were executed")
    observations: str = Field(description="What was observed during verification")
