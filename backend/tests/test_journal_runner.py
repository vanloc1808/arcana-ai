#!/usr/bin/env python3
"""
Test runner for Journal feature tests
Run this to execute all journal-related tests with detailed output
"""

import subprocess  # nosec
import sys
from pathlib import Path


def run_command(command, description):
    """Run a command and display results"""
    print(f"\n{'='*60}")
    print(f"🧪 {description}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=Path(__file__).parent)  # nosec

        if result.returncode == 0:
            print(f"✅ SUCCESS: {description}")
            if result.stdout:
                print("\nOutput:")
                print(result.stdout)
        else:
            print(f"❌ FAILED: {description}")
            if result.stderr:
                print("\nError:")
                print(result.stderr)
            if result.stdout:
                print("\nOutput:")
                print(result.stdout)

        return result.returncode == 0

    except Exception as e:
        print(f"❌ EXCEPTION: {description}")
        print(f"Error: {str(e)}")
        return False


def main():
    """Main test runner"""
    print("🚀 Running Journal Feature Tests")
    print("=" * 60)

    # Check if we're in the right directory
    if not Path("tests/test_journal.py").exists():
        print("❌ Error: test_journal.py not found. Please run from backend directory.")
        sys.exit(1)

    # Activate virtual environment if it exists
    venv_activate = Path(".venv/bin/activate")
    if venv_activate.exists():
        print("🔧 Activating virtual environment...")
        activate_cmd = f"source {venv_activate} && "
    else:
        print("⚠️  No virtual environment found, using system Python")
        activate_cmd = ""

    tests_passed = 0
    tests_failed = 0

    # Test configurations
    test_configs = [
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py -v --tb=short",
            "description": "Journal API Tests (Verbose)",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestJournalAPI -v",
            "description": "Journal Entry CRUD Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestPersonalCardMeaningsAPI -v",
            "description": "Personal Card Meanings Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestJournalAnalyticsAPI -v",
            "description": "Analytics API Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestRemindersAPI -v",
            "description": "Reminders API Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestJournalSecurity -v",
            "description": "Security & Privacy Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py::TestJournalBackgroundTasks -v",
            "description": "Background Tasks Tests",
        },
        {
            "command": f"{activate_cmd}python -m pytest tests/test_journal.py --cov=routers.journal --cov=models --cov-report=term-missing",
            "description": "Coverage Report",
        },
    ]

    # Run each test configuration
    for config in test_configs:
        success = run_command(config["command"], config["description"])
        if success:
            tests_passed += 1
        else:
            tests_failed += 1

    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📈 Total: {tests_passed + tests_failed}")

    if tests_failed == 0:
        print("\n🎉 All journal tests passed!")
        return 0
    else:
        print(f"\n⚠️  {tests_failed} test group(s) failed. Check output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
