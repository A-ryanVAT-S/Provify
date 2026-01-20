from typing import List, Optional
from pydantic import BaseModel, Field

from droidrun import DroidAgent, DroidrunConfig

from models import DeveloperBug, VerificationResult


# Structured output from DroidRun agent
class VerificationOutput(BaseModel):
    bug_reproduced: bool = Field(description="Whether the bug was successfully reproduced")
    observations: str = Field(description="Detailed observations during verification")


# Handles bug verification using DroidRun agents
class BugVerifier:
    def __init__(self, config: Optional[DroidrunConfig] = None):
        self.config = config or DroidrunConfig()

    # Verify bug by reproducing it on device using DroidRun agent
    async def verify_bug(self, bug: DeveloperBug) -> VerificationResult:
        goal = f"""Attempt to reproduce this bug in {bug.app_name} ({bug.app_package}):

BUG: {bug.bug}

INSTRUCTIONS:
1. Open the app {bug.app_package}
2. Try to reproduce the reported bug
3. Observe the app's behavior carefully
4. Report whether you observed: crashes, freezes, UI glitches, or errors
5. If the bug occurs, describe exactly what you saw
6. If the app behaves normally, report that the bug was not reproduced
7. Dont perform any actions unrelated to bug verification like file handling or social media interactions.
Be thorough and report all observations."""

        agent = DroidAgent(
            goal=goal,
            config=self.config,
            output_model=VerificationOutput,
        )

        try:
            result = await agent.run()
            
            if result.success and result.structured_output:
                output: VerificationOutput = result.structured_output
                return VerificationResult(
                    success=output.bug_reproduced,
                    steps_executed=[],
                    observations=output.observations
                )
            else:
                return VerificationResult(
                    success=False,
                    steps_executed=[],
                    observations=result.reason or "Verification incomplete"
                )
        except Exception as e:
            return VerificationResult(
                success=False,
                steps_executed=[],
                observations=f"Verification failed: {str(e)}"
            )

    # Re-verify a fixed bug to check if regression occurred
    async def reverify_fixed_bug(self, bug: DeveloperBug) -> VerificationResult:
        result = await self.verify_bug(bug)
        
        if result.success:
            result.observations = f"REGRESSION: Bug still exists! {result.observations}"
        else:
            result.observations = f"FIX CONFIRMED: {result.observations}"
        
        return result
