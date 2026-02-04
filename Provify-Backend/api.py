from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import asyncio
from datetime import datetime

from models import BugInput, DeveloperBug, VerificationStatus, VerificationSummary
from issue_manager import IssueManager
from bug_verifier import BugVerifier
from device_pool import device_pool


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

# Refresh device pool on startup
@app.on_event("startup")
async def startup_event():
    device_pool.refresh()
    print(f"[Provify] Found {device_pool.device_count()} connected devices")


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


# Get connected devices info
@app.get("/devices")
async def get_devices():
    device_pool.refresh()
    return {
        "count": device_pool.device_count(),
        "devices": device_pool.get_all()
    }


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


# Helper function to determine confidence score based on verification result
def calculate_confidence(success: bool, steps_count: int) -> str:
    if success:
        if steps_count >= 3:
            return "HIGH"
        elif steps_count >= 1:
            return "MEDIUM"
        else:
            return "LOW"
    else:
        if steps_count >= 5:
            return "HIGH"
        elif steps_count >= 2:
            return "MEDIUM"
        else:
            return "LOW"


# Verify a single bug on ALL connected devices in parallel
@app.post("/bugs/{bug_id}/verify")
async def verify_bug(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    bug = manager.bugs[bug_id]
    device_pool.refresh()
    
    if device_pool.device_count() == 0:
        raise HTTPException(status_code=503, detail="No devices connected")
    
    result = await verify_bug_on_all_devices(bug)
    
    return {
        "success": result["status"] == "verified",
        "status": result["status"],
        "message": result["message"],
        "devices_tested": result["devices_tested"],
        "reproduced": result["reproduced"],
        "not_reproduced": result["not_reproduced"],
        "verification_summary": result["verification_summary"]
    }


# Get verification summary for a bug
@app.get("/bugs/{bug_id}/summary")
async def get_bug_summary(bug_id: str):
    if bug_id not in manager.bugs:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    summary = manager.get_verification_summary(bug_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No verification summary found for this bug")
    
    return summary.model_dump()


# Verify all pending bugs (each bug tested on all devices)
@app.post("/bugs/verify-all")
async def verify_all_pending():
    device_pool.refresh()
    pending = manager.get_pending()
    
    if not pending:
        return {"verified": 0, "total": 0, "devices_used": 0, "results": []}
    
    if device_pool.device_count() == 0:
        raise HTTPException(status_code=503, detail="No devices connected")
    
    results = []
    
    # Verify each bug sequentially (each bug runs on all devices in parallel)
    for bug in pending:
        try:
            # Call the verify endpoint logic for each bug
            result = await verify_bug_on_all_devices(bug)
            results.append({
                "bug_id": bug.id,
                "status": result["status"],
                "devices_tested": result["devices_tested"],
                "reproduced": result["reproduced"],
                "message": result["message"]
            })
        except Exception as e:
            results.append({
                "bug_id": bug.id,
                "status": "error",
                "devices_tested": 0,
                "reproduced": 0,
                "message": str(e)
            })
    
    verified_count = len([r for r in results if r["status"] == "verified"])
    return {
        "verified": verified_count,
        "total": len(results),
        "devices_used": device_pool.device_count(),
        "results": results
    }


# Helper to verify a bug on all devices (used by verify-all)
async def verify_bug_on_all_devices(bug: DeveloperBug):
    devices = device_pool.get_all()
    
    # Test bug on a single device
    async def test_on_device(device_info: dict):
        serial = device_info["serial"]
        name = device_info["name"]
        try:
            result = await verifier.verify_bug(bug, serial)
            return {
                "device": name,
                "serial": serial,
                "reproduced": result.success,
                "steps": result.steps_executed,
                "observations": result.observations
            }
        except Exception as e:
            return {
                "device": name,
                "serial": serial,
                "reproduced": False,
                "steps": [],
                "observations": f"Error: {str(e)}"
            }
    
    # Run on ALL devices in parallel
    device_results = await asyncio.gather(*[test_on_device(d) for d in devices])
    
    # Aggregate results
    devices_tested = len(device_results)
    reproduced = sum(1 for r in device_results if r["reproduced"])
    not_reproduced = devices_tested - reproduced
    
    # Collect all steps and observations
    all_steps = []
    all_observations = []
    device_names = []
    for r in device_results:
        device_names.append(r["device"])
        if r["steps"]:
            all_steps.extend(r["steps"])
        all_observations.append(f"[{r['device']}] {r['observations']}")
    
    steps = all_steps if all_steps else ["Launch app", "Execute test scenario", "Observe behavior"]
    
    # Calculate confidence
    if devices_tested == 1:
        confidence = calculate_confidence(reproduced > 0, len(steps))
    else:
        agreement_rate = max(reproduced, not_reproduced) / devices_tested
        if agreement_rate >= 0.8:
            confidence = "HIGH"
        elif agreement_rate >= 0.5:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"
    
    # Majority vote
    bug_verified = reproduced > not_reproduced
    status_str = "verified" if bug_verified else "not_reproducible"
    
    timestamp = datetime.now().isoformat()
    device_list = ", ".join(device_names)
    summary_text = (
        f"Bug {'reproduced' if bug_verified else 'not reproduced'} on {reproduced}/{devices_tested} devices ({device_list}). "
        f"Executed {len(steps)} verification steps. Confidence: {confidence}."
    )
    
    verification_summary = VerificationSummary(
        timestamp=timestamp,
        status=status_str,
        steps=steps,
        result="\n\n".join(all_observations),
        devices_tested=devices_tested,
        reproduced=reproduced,
        not_reproduced=not_reproduced,
        confidence=confidence,
        summary=summary_text,
        device_name=device_list
    )
    
    if bug_verified:
        manager.update_status(bug.id, VerificationStatus.VERIFIED, verification_summary.result)
    else:
        manager.update_status(bug.id, VerificationStatus.NOT_REPRODUCIBLE, verification_summary.result)
    
    manager.update_verification_summary(bug.id, verification_summary)
    
    return {
        "status": status_str,
        "message": summary_text,
        "devices_tested": devices_tested,
        "reproduced": reproduced,
        "not_reproduced": not_reproduced,
        "verification_summary": verification_summary.model_dump()
    }


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
