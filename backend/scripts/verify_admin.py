import sys
from pathlib import Path

from sqlalchemy.orm import Session

sys.path.append(str(Path(__file__).parent.parent))

from database import Base, engine  # noqa: E402
from models import User  # noqa: E402


def main():
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine)
    try:
        admin_user = session.query(User).filter_by(username="admin").first()
        if admin_user:
            print("Admin user found:")
            print(f"  Username: {admin_user.username}")
            print(f"  Email: {admin_user.email}")
            print(f"  Active: {admin_user.is_active}")
            print(f"  Created: {admin_user.created_at}")

            # Test password verification
            test_password = "your-admin-password-here"  # nosec B105
            if admin_user.verify_password(test_password):
                print(f"  Password verification: ✅ '{test_password}' is correct")
            else:
                print(f"  Password verification: ❌ '{test_password}' is incorrect")
        else:
            print("Admin user not found. Run create_admin_user.py first.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
