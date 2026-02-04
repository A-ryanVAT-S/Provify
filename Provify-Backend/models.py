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


# Structured verification summary stored with each bug
class VerificationSummary(BaseModel):
    timestamp: str = Field(description="When the verification was performed")
    status: str = Field(description="verified or not_reproducible")
    steps: List[str] = Field(description="Steps that were executed during verification")
    result: str = Field(description="Result observation text")
    devices_tested: int = Field(default=1, description="Number of devices tested")
    reproduced: int = Field(description="Number of times bug was reproduced")
    not_reproduced: int = Field(description="Number of times bug was not reproduced")
    confidence: str = Field(description="HIGH, MEDIUM, or LOW confidence score")
    summary: str = Field(description="Short summary explanation of the verification")
    device_name: str = Field(default="Unknown", description="Device used for testing")


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
    verification_summary: Optional[VerificationSummary] = None


# Result model from DroidRun verification
class VerificationResult(BaseModel):
    success: bool = Field(description="Whether the bug was reproduced")
    steps_executed: List[str] = Field(description="Steps that were executed")
    observations: str = Field(description="What was observed during verification")
