from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import asyncio

from models import BugInput, DeveloperBug, VerificationStatus
from issue_manager import IssueManager
from bug_verifier import BugVerifier


app = FastAPI(title="Provify API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = IssueManager()
verifier = BugVerifier()


# Request model for creating a new bug
class BugCreateRequest(BaseModel):
    app_name: str
    app_package: Optional[str] = None  # Optional - resolved by LLM if not provided
    bug: str


# Request model for updating bug status and notes
class BugUpdateRequest(BaseModel):
    status: Optional[VerificationStatus] = None
    notes: Optional[str] = None


# Response model for bug statistics
class StatsResponse(BaseModel):
    total: int
    pending: int
    verified: int
    not_reproducible: int
    fixed: int


# Root endpoint with API info
@app.get("/")
async def root():
    return {"message": "Provify API", "version": "1.0.0"}


# Get overall bug statistics
@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    return StatsResponse(
        total=len(manager.bugs),
        pending=len(manager.get_pending()),
        verified=len(manager.get_verified()),
        not_reproducible=len(manager.get_by_status(VerificationStatus.NOT_REPRODUCIBLE)),
        fixed=len(manager.get_fixed())
    )


# Get all bugs with optional filters
@app.get("/bugs", response_model=List[DeveloperBug])
async def get_all_bugs(
    status: Optional[VerificationStatus] = None,
    app_package: Optional[str] = None
):
    if app_package:
        return manager.get_by_app(app_package)
    if status:
        return manager.get_by_status(status)
    return manager.get_all_bugs()


# Get specific bug by ID
@app.get("/bugs/{bug_id}", response_model=DeveloperBug)
async def get_bug(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    return manager.bugs[bug_id]


# Create a single new bug
@app.post("/bugs", response_model=DeveloperBug)
async def create_bug(request: BugCreateRequest):
    bug_input = BugInput(
        app_name=request.app_name,
        app_package=request.app_package,
        bug=request.bug
    )
    bug = manager.add_bug(bug_input)
    return bug


# Create multiple bugs in batch
@app.post("/bugs/bulk", response_model=List[DeveloperBug])
async def create_bugs_bulk(requests: List[BugCreateRequest]):
    bugs = []
    for req in requests:
        bug_input = BugInput(
            app_name=req.app_name,
            app_package=req.app_package,
            bug=req.bug
        )
        bug = manager.add_bug(bug_input)
        bugs.append(bug)
    return bugs


# Upload JSON file with multiple bugs and append to bugs.json
@app.post("/bugs/bulk-upload")
async def bulk_upload_bugs(bugs_data: List[BugCreateRequest]):
    """
    Accept a JSON array of bugs and append them to the system.
    Expected format: [{"app_name": "...", "app_package": "...", "bug": "..."}, ...]
    """
    if not bugs_data:
        raise HTTPException(status_code=400, detail="No bugs provided")
    
    added_bugs = []
    for bug_data in bugs_data:
        bug_input = BugInput(
            app_name=bug_data.app_name,
            app_package=bug_data.app_package,
            bug=bug_data.bug
        )
        bug = manager.add_bug(bug_input)
        added_bugs.append(bug)
    
    return {
        "success": True,
        "count": len(added_bugs),
        "message": f"Successfully added {len(added_bugs)} bugs",
        "bugs": added_bugs
    }


# Verify a single bug using DroidRun
@app.post("/bugs/{bug_id}/verify")
async def verify_bug(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    bug = manager.bugs[bug_id]
    result = await verifier.verify_bug(bug)
    
    if result.success:
        manager.update_status(bug_id, VerificationStatus.VERIFIED, result.observations)
        return {
            "success": True,
            "status": "verified",
            "message": result.observations
        }
    else:
        manager.update_status(bug_id, VerificationStatus.NOT_REPRODUCIBLE, result.observations)
        return {
            "success": False,
            "status": "not_reproducible",
            "message": result.observations
        }


# Verify all pending bugs in batch
@app.post("/bugs/verify-all")
async def verify_all_pending():
    pending = manager.get_pending()
    results = []
    
    for bug in pending:
        result = await verifier.verify_bug(bug)
        
        if result.success:
            manager.update_status(bug.id, VerificationStatus.VERIFIED, result.observations)
            results.append({
                "bug_id": bug.id,
                "status": "verified",
                "message": result.observations
            })
        else:
            manager.update_status(bug.id, VerificationStatus.NOT_REPRODUCIBLE, result.observations)
            results.append({
                "bug_id": bug.id,
                "status": "not_reproducible",
                "message": result.observations
            })
    
    return {"verified": len([r for r in results if r["status"] == "verified"]), "results": results}


# Update bug status and notes
@app.patch("/bugs/{bug_id}", response_model=DeveloperBug)
async def update_bug(bug_id: str, request: BugUpdateRequest):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    if request.status:
        manager.update_status(bug_id, request.status, request.notes or "")
    
    return manager.bugs[bug_id]


# Mark bug as fixed by developer
@app.post("/bugs/{bug_id}/fix")
async def mark_bug_fixed(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    manager.mark_fixed(bug_id)
    return {"success": True, "message": f"Bug {bug_id} marked as fixed"}


# Re-verify all fixed bugs to detect regressions
@app.post("/bugs/reverify-fixed")
async def reverify_fixed():
    fixed = manager.get_fixed()
    results = []
    
    for bug in fixed:
        result = await verifier.reverify_fixed_bug(bug)
        
        if result.success:
            manager.update_status(bug.id, VerificationStatus.VERIFIED, "REGRESSION: Bug still exists!")
            results.append({
                "bug_id": bug.id,
                "status": "regression",
                "message": result.observations
            })
        else:
            results.append({
                "bug_id": bug.id,
                "status": "confirmed_fixed",
                "message": result.observations
            })
    
    return {"regressions": len([r for r in results if r["status"] == "regression"]), "results": results}


# Delete a bug from database
@app.delete("/bugs/{bug_id}")
async def delete_bug(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    del manager.bugs[bug_id]
    manager._save_developer_bugs()
    return {"success": True, "message": f"Bug {bug_id} deleted"}


# Load bugs from bugs.json file
@app.post("/load-from-file")
async def load_bugs_from_file():
    count = manager.process_all_input_bugs()
    return {"success": True, "loaded": count, "message": f"Loaded {count} bugs from bugs.json"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
