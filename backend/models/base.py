from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

_BCRYPT_MAX_BYTES = 72


def _prepare_password(password: str | bytes) -> bytes:
    secret = password.encode("utf-8") if isinstance(password, str) else password
    return secret[:_BCRYPT_MAX_BYTES]
