import asyncio
import os
from models import VerificationStatus
from bug_verifier import BugVerifier
from issue_manager import IssueManager


# Clear terminal screen for clean display
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


# Display Provify header banner
def print_header():
    print("=" * 50)
    print("PROVIFY - Bug Verification")
    print("=" * 50)


# Display interactive menu options
def print_menu():
    print("\n  1. Load bugs from bugs.json")
    print("  2. View all bugs")
    print("  3. View pending bugs")
    print("  4. View verified bugs")
    print("  5. View fixed bugs")
    print("  6. Verify a bug (DroidRun)")
    print("  7. Verify all pending bugs")
    print("  8. Mark bug as fixed")
    print("  9. Re-verify fixed bugs")
    print(" 10. Create sample bugs.json")
    print("  0. Exit")
    print("-" * 50)


# Display list of bugs with their details
def display_bugs(bugs, title):
    print(f"\n--- {title} ({len(bugs)} bugs) ---\n")
    if not bugs:
        print("  No bugs found.")
        return
    
    for i, bug in enumerate(bugs, 1):
        print(f"  {i}. [{bug.status.value.upper()}] ID: {bug.id}")
        print(f"     App: {bug.app_name} ({bug.app_package})")
        print(f"     Bug: {bug.bug}")
        print(f"     Count: {bug.count} | Severity: {bug.severity}")
        if bug.notes:
            print(f"     Notes: {bug.notes}")
        print()


# Verify a single bug selected by user using DroidRun
async def verify_single_bug(manager: IssueManager, verifier: BugVerifier):
    pending = manager.get_pending()
    if not pending:
        print("\n  No pending bugs to verify.")
        return
    
    display_bugs(pending, "Pending Bugs")
    
    bug_id = input("  Enter bug ID to verify: ").strip()
    
    if bug_id not in manager.bugs:
        print(f"  Bug {bug_id} not found.")
        return
    
    bug = manager.bugs[bug_id]
    print(f"\n  Verifying: {bug.bug}...")
    print("  Running DroidRun agent on device...\n")
    
    result = await verifier.verify_bug(bug)
    
    if result.success:
        manager.update_status(bug_id, VerificationStatus.VERIFIED, result.observations)
        print(f"  BUG VERIFIED: {result.observations}")
    else:
        manager.update_status(bug_id, VerificationStatus.NOT_REPRODUCIBLE, result.observations)
        print(f"  NOT REPRODUCIBLE: {result.observations}")


# Verify all pending bugs automatically in batch
async def verify_all_pending(manager: IssueManager, verifier: BugVerifier):
    pending = manager.get_pending()
    if not pending:
        print("\n  No pending bugs to verify.")
        return
    
    print(f"\n  Verifying {len(pending)} pending bugs...\n")
    
    for bug in pending:
        print(f"  Verifying: {bug.bug[:40]}...")
        result = await verifier.verify_bug(bug)
        
        if result.success:
            manager.update_status(bug.id, VerificationStatus.VERIFIED, result.observations)
            print(f"    VERIFIED")
        else:
            manager.update_status(bug.id, VerificationStatus.NOT_REPRODUCIBLE, result.observations)
            print(f"    NOT REPRODUCIBLE")
    
    print("\n  All pending bugs processed.")


# Re-verify fixed bugs to detect regressions
async def reverify_fixed_bugs(manager: IssueManager, verifier: BugVerifier):
    fixed = manager.get_fixed()
    if not fixed:
        print("\n  No fixed bugs to re-verify.")
        return
    
    print(f"\n  Re-verifying {len(fixed)} fixed bugs...\n")
    
    for bug in fixed:
        print(f"  Checking: {bug.bug[:40]}...")
        result = await verifier.reverify_fixed_bug(bug)
        
        if result.success:
            manager.update_status(bug.id, VerificationStatus.VERIFIED, "REGRESSION: Bug still exists!")
            print(f"    REGRESSION DETECTED!")
        else:
            print(f"    Fix confirmed")
    
    print("\n  Re-verification complete.")


# Mark a verified bug as fixed by developer
def mark_bug_fixed(manager: IssueManager):
    verified = manager.get_verified()
    if not verified:
        print("\n  No verified bugs to mark as fixed.")
        return
    
    display_bugs(verified, "Verified Bugs")
    
    bug_id = input("  Enter bug ID to mark as fixed: ").strip()
    
    if bug_id not in manager.bugs:
        print(f"  Bug {bug_id} not found.")
        return
    
    manager.mark_fixed(bug_id)
    print(f"  Bug {bug_id} marked as fixed.")


# Main CLI loop with interactive menu
async def main():
    manager = IssueManager()
    verifier = BugVerifier()
    
    while True:
        clear_screen()
        print_header()
        
        total = len(manager.bugs)
        pending = len(manager.get_pending())
        verified = len(manager.get_verified())
        fixed = len(manager.get_fixed())
        
        print(f"\n  Total: {total} | Pending: {pending} | Verified: {verified} | Fixed: {fixed}")
        
        print_menu()
        
        choice = input("  Select option: ").strip()
        
        if choice == "1":
            count = manager.process_all_input_bugs()
            print(f"\n  Loaded {count} bugs from bugs.json")
            print("  Developer.json updated.")
            input("\n  Press Enter to continue...")
        
        elif choice == "2":
            display_bugs(manager.get_all_bugs(), "All Bugs")
            input("\n  Press Enter to continue...")
        
        elif choice == "3":
            display_bugs(manager.get_pending(), "Pending Bugs")
            input("\n  Press Enter to continue...")
        
        elif choice == "4":
            display_bugs(manager.get_verified(), "Verified Bugs")
            input("\n  Press Enter to continue...")
        
        elif choice == "5":
            display_bugs(manager.get_fixed(), "Fixed Bugs")
            input("\n  Press Enter to continue...")
        
        elif choice == "6":
            await verify_single_bug(manager, verifier)
            input("\n  Press Enter to continue...")
        
        elif choice == "7":
            await verify_all_pending(manager, verifier)
            input("\n  Press Enter to continue...")
        
        elif choice == "8":
            mark_bug_fixed(manager)
            input("\n  Press Enter to continue...")
        
        elif choice == "9":
            await reverify_fixed_bugs(manager, verifier)
            input("\n  Press Enter to continue...")
        
        elif choice == "10":
            manager.create_sample_bugs_file()
            input("\n  Press Enter to continue...")
        
        elif choice == "0":
            print("\n  Goodbye!")
            break
        
        else:
            print("\n  Invalid option. Try again.")
            input("\n  Press Enter to continue...")


if __name__ == "__main__":
    asyncio.run(main())
