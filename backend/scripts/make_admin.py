"""Set is_admin=True for a user by username."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from database import SessionLocal  # noqa: E402
from models import User  # noqa: E402


def make_admin(username: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found.")
            sys.exit(1)
        if user.is_admin:
            print(f"User '{username}' is already an admin.")
            return
        user.is_admin = True
        db.commit()
        print(f"User '{username}' is now an admin.")
    finally:
        db.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "vanloc1808"
    make_admin(target)
