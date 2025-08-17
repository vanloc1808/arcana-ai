import sys
from pathlib import Path

from sqlalchemy.orm import Session

sys.path.append(str(Path(__file__).parent.parent))


from database import Base, engine  # noqa: E402
from models import User  # noqa: E402

# You can change these as needed
default_username = "admin"
default_email = "admin@example.com"
default_password = "your-admin-password-here"  # nosec B105


def main():
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine)
    try:
        user = session.query(User).filter_by(username=default_username).first()
        if user:
            print(f"User '{default_username}' already exists.")
            return
        user = User(username=default_username, email=default_email, is_active=True, is_admin=True)
        user.password = default_password
        session.add(user)
        session.commit()
        print(f"Admin user '{default_username}' created with password '{default_password}'")
    finally:
        session.close()


if __name__ == "__main__":
    main()
