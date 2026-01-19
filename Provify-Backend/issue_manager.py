import json
import hashlib
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime
import os
from google import genai
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from models import BugInput, DeveloperBug, VerificationStatus


BUGS_INPUT_FILE = "bugs.json"
DEVELOPER_FILE = "developer.json"


# Normalize app name to Title Case
def normalize_app_name(app_name: str) -> str:
    return app_name.strip().title()


# Resolve app package name from app name using Gemini LLM
def resolve_app_package(app_name: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[LLM] No GOOGLE_API_KEY set")
        return f"com.{app_name.lower().replace(' ', '').replace('-', '')}"
    
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""Given the app name "{app_name}", return ONLY the Android package name.
For example: "WhatsApp" -> "com.whatsapp", "Instagram" -> "com.instagram.android"
Return ONLY the package name, nothing else."""
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        package = response.text.strip().lower().replace(" ", "")
        print(f"[LLM] Package for {app_name}: {package}")
        return package if package else f"com.{app_name.lower().replace(' ', '')}"
    except Exception as e:
        print(f"[LLM] Package resolution failed: {e}")
        return f"com.{app_name.lower().replace(' ', '').replace('-', '')}"


# Analyze bug severity using LLM (1-5 scale)
def analyze_bug_severity(bug_description: str) -> int:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[LLM] No GOOGLE_API_KEY set, defaulting severity to 3")
        return 3
    
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""Rate this bug severity 1-5:
1=Minor cosmetic, 2=Low, 3=Medium, 4=High, 5=Critical (crash/data loss)
Bug: "{bug_description}"
Return ONLY a number 1-5."""
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        severity = int(response.text.strip())
        print(f"[LLM] Severity for bug: {severity}")
        return max(1, min(5, severity))
    except Exception as e:
        print(f"[LLM] Severity analysis failed: {e}")
        return 3


# Manages bug storage, deduplication, and persistence
class IssueManager:
    def __init__(self):
        self.bugs_input_path = Path(BUGS_INPUT_FILE)
        self.developer_path = Path(DEVELOPER_FILE)
        self.bugs: Dict[str, DeveloperBug] = {}
        self._load_developer_bugs()

    # Load existing bugs from developer.json into memory
    def _load_developer_bugs(self):
        if self.developer_path.exists():
            with open(self.developer_path, "r") as f:
                data = json.load(f)
                for bug_data in data:
                    bug_data["status"] = VerificationStatus(bug_data["status"])
                    bug = DeveloperBug(**bug_data)
                    self.bugs[bug.id] = bug

    # Save bugs to developer.json sorted by created_at (newest first)
    def _save_developer_bugs(self):
        data = []
        for bug in self.bugs.values():
            bug_dict = bug.model_dump()
            bug_dict["status"] = bug.status.value
            data.append(bug_dict)
        
        data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        with open(self.developer_path, "w") as f:
            json.dump(data, f, indent=2)

    # Generate unique 8-character ID from app package and bug description
    def _generate_id(self, app_package: str, bug: str) -> str:
        content = f"{app_package}:{bug.lower()[:100]}"
        return hashlib.sha256(content.encode()).hexdigest()[:8]

    # Calculate Jaccard similarity between two bug descriptions
    def _compute_similarity(self, text1: str, text2: str) -> float:
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        if not words1 or not words2:
            return 0.0
        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union)

    # Find existing bug with similar description in same app
    def find_duplicate(self, app_package: str, bug: str) -> Optional[DeveloperBug]:
        for existing in self.bugs.values():
            if existing.app_package != app_package:
                continue
            if self._compute_similarity(existing.bug, bug) > 0.7:
                return existing
        return None

    # Load bugs from bugs.json input file
    def load_bugs_from_input(self) -> List[BugInput]:
        if not self.bugs_input_path.exists():
            return []
        with open(self.bugs_input_path, "r") as f:
            data = json.load(f)
            return [BugInput(**b) for b in data]

    # Add new bug with LLM processing for package and severity
    def add_bug(self, bug_input: BugInput) -> DeveloperBug:
        # Normalize app name to Title Case
        app_name = normalize_app_name(bug_input.app_name)
        
        # Resolve app_package using LLM if not provided
        app_package = bug_input.app_package
        if not app_package:
            app_package = resolve_app_package(app_name)
        
        existing = self.find_duplicate(app_package, bug_input.bug)
        
        if existing:
            return existing  # Return existing bug, no count increment

        bug_id = self._generate_id(app_package, bug_input.bug)
        
        # Get severity from LLM
        severity = analyze_bug_severity(bug_input.bug)
        
        new_bug = DeveloperBug(
            id=bug_id,
            app_name=app_name,
            app_package=app_package,
            bug=bug_input.bug,
            severity=severity
        )
        
        self.bugs[bug_id] = new_bug
        self._save_developer_bugs()
        return new_bug

    # Process all bugs from bugs.json and add them to database
    def process_all_input_bugs(self) -> int:
        inputs = self.load_bugs_from_input()
        count = 0
        for bug_input in inputs:
            self.add_bug(bug_input)
            count += 1
        return count

    # Update bug verification status and add notes
    def update_status(self, bug_id: str, status: VerificationStatus, notes: str = ""):
        if bug_id not in self.bugs:
            raise ValueError(f"Bug {bug_id} not found")
        
        bug = self.bugs[bug_id]
        bug.status = status
        bug.last_verified = datetime.now().isoformat()
        if notes:
            bug.notes = notes
        self._save_developer_bugs()

    # Mark bug as verified
    def mark_verified(self, bug_id: str):
        self.update_status(bug_id, VerificationStatus.VERIFIED)

    # Mark bug as not reproducible
    def mark_not_reproducible(self, bug_id: str):
        self.update_status(bug_id, VerificationStatus.NOT_REPRODUCIBLE)

    # Mark bug as fixed by developer
    def mark_fixed(self, bug_id: str):
        self.update_status(bug_id, VerificationStatus.FIXED)

    # Get all bugs sorted by created_at (newest first)
    def get_all_bugs(self) -> List[DeveloperBug]:
        return sorted(self.bugs.values(), key=lambda x: x.created_at, reverse=True)

    # Get bugs filtered by verification status
    def get_by_status(self, status: VerificationStatus) -> List[DeveloperBug]:
        return [b for b in self.bugs.values() if b.status == status]

    # Get bugs filtered by app package name
    def get_by_app(self, app_package: str) -> List[DeveloperBug]:
        return [b for b in self.bugs.values() if b.app_package == app_package]

    # Get all pending bugs awaiting verification
    def get_pending(self) -> List[DeveloperBug]:
        return self.get_by_status(VerificationStatus.PENDING)

    # Get all verified bugs
    def get_verified(self) -> List[DeveloperBug]:
        return self.get_by_status(VerificationStatus.VERIFIED)

    # Get all fixed bugs
    def get_fixed(self) -> List[DeveloperBug]:
        return self.get_by_status(VerificationStatus.FIXED)

    # Create sample bugs.json file with example data
    def create_sample_bugs_file(self):
        sample = [
            {
                "app_name": "My App",
                "app_package": "com.example.myapp",
                "bug": "App crashes when uploading photo"
            },
            {
                "app_name": "My App",
                "app_package": "com.example.myapp",
                "bug": "Login button not responding"
            }
        ]
        with open(self.bugs_input_path, "w") as f:
            json.dump(sample, f, indent=2)
        print(f"Created sample {BUGS_INPUT_FILE}")
