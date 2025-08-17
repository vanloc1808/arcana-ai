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
        user = session.query(User).filter_by(username="admin").first()
        if user:
            user.is_admin = True
            session.commit()
            print(f"Updated user '{user.username}' to have admin privileges")
        else:
            print("Admin user not found. Please run create_admin_user.py first.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
