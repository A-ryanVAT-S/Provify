from typing import List, Optional
from pydantic import BaseModel, Field

from droidrun import DroidAgent, DroidrunConfig
from droidrun.agent.codeact.events import CodeActResponseEvent, CodeActOutputEvent

from models import DeveloperBug, VerificationResult


# Structured output from DroidRun agent
class VerificationOutput(BaseModel):
    bug_reproduced: bool = Field(description="Whether the bug was successfully reproduced")
    observations: str = Field(description="Detailed observations during verification")


# Handles bug verification using DroidRun agents
class BugVerifier:
    def __init__(self, config: Optional[DroidrunConfig] = None):
        self.config = config or DroidrunConfig()

    # Verify bug on specific device using DroidRun agent
    async def verify_bug(self, bug: DeveloperBug, device_serial: Optional[str] = None) -> VerificationResult:
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

        # Create config for specific device if provided
        config = DroidrunConfig()
        if device_serial:
            config.device.serial = device_serial

        agent = DroidAgent(
            goal=goal,
            config=config,
            output_model=VerificationOutput,
        )

        try:
            # Use streaming to capture steps from events
            steps = []
            handler = agent.run()
            
            # Stream events to capture step information
            async for event in handler.stream_events():
                # Capture CodeAct responses (contains thought/reasoning for each step)
                if isinstance(event, CodeActResponseEvent):
                    if event.thought:
                        steps.append(event.thought)
                # Capture execution outputs
                elif isinstance(event, CodeActOutputEvent):
                    if event.output and not event.output.startswith("Error"):
                        # Clean up the output for display
                        output = event.output.strip()
                        if output and len(output) < 200:  # Skip long outputs
                            steps.append(f"Result: {output}")
            
            result = await handler
            
            # Fallback: try shared_state if no steps captured from events
            if not steps and hasattr(agent, 'shared_state') and agent.shared_state:
                if hasattr(agent.shared_state, 'summary_history') and agent.shared_state.summary_history:
                    steps = agent.shared_state.summary_history
                elif hasattr(agent.shared_state, 'action_history') and agent.shared_state.action_history:
                    steps = [
                        action.get('description', str(action.get('action', 'Action executed')))
                        for action in agent.shared_state.action_history
                    ]
            
            if result.success and result.structured_output:
                output: VerificationOutput = result.structured_output
                return VerificationResult(
                    success=output.bug_reproduced,
                    steps_executed=steps,
                    observations=output.observations
                )
            else:
                return VerificationResult(
                    success=False,
                    steps_executed=steps,
                    observations=result.reason or "Verification incomplete"
                )
        except Exception as e:
            return VerificationResult(
                success=False,
                steps_executed=[],
                observations=f"Verification failed: {str(e)}"
            )

    # Re-verify a fixed bug to check if regression occurred
    async def reverify_fixed_bug(self, bug: DeveloperBug, device_serial: Optional[str] = None) -> VerificationResult:
        result = await self.verify_bug(bug, device_serial)
        
        if result.success:
            result.observations = f"REGRESSION: Bug still exists! {result.observations}"
        else:
            result.observations = f"FIX CONFIRMED: {result.observations}"
        
        return result
