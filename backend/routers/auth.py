import hashlib
import hmac
import os
import secrets
import string
import traceback
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_mail import FastMail, MessageSchema
from jose import JWTError, jwt
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import AuthSession, Deck, PasswordResetToken, User
from schemas import (
    DeckResponse,
    ForgotPasswordRequest,
    RefreshToken,
    ResetPasswordRequest,
    TokenData,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from utils.avatar_utils import avatar_manager
from utils.celery_utils import EmailTaskManager
from utils.error_handlers import (
    AuthenticationError,
    ServiceUnavailableError,
    TarotAPIException,
    UserNotFoundError,
    ValidationError,
    logger,
)
from utils.metrics import record_auth_attempt
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/api/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def create_access_token(data: dict, session_id: str | None = None, family_id: str | None = None):
    """
    Create JWT Access Token

    Generate a JWT access token with expiration time for user authentication.

    Args:
        data (dict): Token payload data, typically contains {"sub": username}

    Returns:
        str: Encoded JWT token

    Raises:
        ServiceUnavailableError: If token creation fails
    """
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access", "jti": uuid.uuid4().hex})
        if session_id:
            to_encode["sid"] = session_id
        if family_id:
            to_encode["fid"] = family_id
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.logger.error("Error creating access token", extra={"error": str(e)})
        raise ServiceUnavailableError(message="Error creating access token", details={"error": str(e)})


def create_refresh_token(data: dict, session_id: str | None = None, family_id: str | None = None):
    """
    Create JWT Refresh Token

    Generate a JWT refresh token with longer expiration time for token rotation.

    Args:
        data (dict): Token payload data, typically contains {"sub": username}

    Returns:
        str: Encoded JWT refresh token

    Raises:
        ServiceUnavailableError: If token creation fails
    """
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh", "jti": uuid.uuid4().hex})
        if session_id:
            to_encode["sid"] = session_id
        if family_id:
            to_encode["fid"] = family_id
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.logger.error(
            "Error creating refresh token", extra={"error": str(e), "traceback": traceback.format_exc()}
        )
        raise ServiceUnavailableError(message="Error creating refresh token", details={"error": str(e)})


def hash_token(token: str) -> str:
    """Hash a token before storing it so database access cannot mint sessions."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    common = {
        "secure": settings.AUTH_COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "domain": settings.AUTH_COOKIE_DOMAIN,
        "path": settings.AUTH_COOKIE_PATH,
    }
    response.set_cookie(
        settings.ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        **common,
    )
    response.set_cookie(
        settings.CSRF_COOKIE_NAME,
        secrets.token_urlsafe(32),
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=False,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    for name in (settings.ACCESS_COOKIE_NAME, settings.REFRESH_COOKIE_NAME, settings.CSRF_COOKIE_NAME):
        response.delete_cookie(
            name,
            domain=settings.AUTH_COOKIE_DOMAIN,
            path=settings.AUTH_COOKIE_PATH,
        )


def revoke_session(session: AuthSession, reason: str) -> None:
    session.revoked_at = datetime.utcnow()
    session.revoked_reason = reason


def revoke_user_sessions(db: Session, user_id: int, reason: str) -> None:
    sessions = db.query(AuthSession).filter(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).all()
    for session in sessions:
        revoke_session(session, reason)


def request_metadata(request: Request) -> tuple[str | None, str | None]:
    return request.client.host if request.client else None, request.headers.get("user-agent")


async def get_auth_token(request: Request, bearer_token: str | None = Depends(optional_oauth2_scheme)) -> str | None:
    """Prefer the browser access cookie while retaining bearer-token API compatibility."""
    return bearer_token or request.cookies.get(settings.ACCESS_COOKIE_NAME)


async def get_current_user(
    token: str | None = Depends(get_auth_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Get Current Authenticated User

    Validate a JWT from the browser cookie or bearer header and return the current user.

    Args:
        token (str): JWT token from the access cookie or Authorization header
        db (Session): Database session

    Returns:
        User: The authenticated user object

    Raises:
        AuthenticationError: If token is invalid or malformed
        UserNotFoundError (401): If user doesn't exist
    """
    try:
        if not token:
            raise AuthenticationError(message="Authentication required")
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise AuthenticationError(
                message="Invalid token payload",
                details={"error": "Missing username in token"},
            )
        if payload.get("type") == "refresh":
            raise AuthenticationError(
                message="Invalid token",
                details={"error": "Refresh tokens cannot be used for authentication"},
            )
        token_data = TokenData(username=username)
    except JWTError as e:
        logger.logger.error("JWT decode error", extra={"error": str(e)})
        raise AuthenticationError(message="Invalid token", details={"error": str(e)})

    session_id = payload.get("sid")
    if session_id:
        session = db.query(AuthSession).filter(AuthSession.id == session_id).first()
        if not session or session.revoked_at or session.expires_at <= datetime.utcnow():
            raise AuthenticationError(message="Session is no longer valid")

    user = db.query(User).filter(User.username == token_data.username, User.is_deleted == False).first()  # noqa: E712
    if user is None:
        raise UserNotFoundError(message="User not found", details={"username": token_data.username})

    return user


async def get_optional_current_user(
    token: str | None = Depends(get_auth_token),
    db: Session = Depends(get_db),
) -> User | None:
    """Return the authenticated user when a valid token is present, otherwise None.

    Used by endpoints that personalize behavior for logged-in users but remain
    accessible to anonymous visitors.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None or payload.get("type") == "refresh":
            return None
    except JWTError:
        return None

    session_id = payload.get("sid")
    if session_id:
        session = db.query(AuthSession).filter(AuthSession.id == session_id).first()
        if not session or session.revoked_at or session.expires_at <= datetime.utcnow():
            return None

    return db.query(User).filter(User.username == username, User.is_deleted == False).first()  # noqa: E712


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get Current Admin User

    Validate that the current authenticated user has administrator privileges.

    Args:
        current_user (User): The authenticated user from get_current_user dependency

    Returns:
        User: The admin user object

    Raises:
        HTTPException (403): If the user does not have admin privileges
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return current_user


def generate_reset_token() -> str:
    """
    Generate Secure Reset Token

    Generate a cryptographically secure random token for password reset.

    Returns:
        str: 32-character random token

    Raises:
        ServiceUnavailableError: If token generation fails
    """
    try:
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(32))
    except Exception as e:
        logger.logger.error("Error generating reset token", extra={"error": str(e)})
        raise ServiceUnavailableError(message="Error generating reset token", details={"error": str(e)})


async def send_reset_email(email: str, token: str, db: Session):
    """
    Send Password Reset Email

    Send a password reset email with token to the specified email address.
    Creates a database record for the reset token and sends the email.

    Args:
        email (str): Email address to send the reset token to
        token (str): Reset token to include in the email
        db (Session): Database session

    Raises:
        ServiceUnavailableError: If email sending fails

    Note:
        For security, this function doesn't raise an error if the email doesn't exist.
        Reset tokens expire after 1 hour.
    """
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return

        # Create reset token
        reset_token = PasswordResetToken(
            token_hash=hash_token(token),
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(reset_token)
        db.commit()

        # Send email
        message = MessageSchema(
            subject="Password Reset Request",
            recipients=[email],
            body=f"Your password reset token is: {token}",
            subtype="html",
        )

        fm = FastMail(settings.email_config)
        await fm.send_message(message)

        logger.logger.info("Reset email sent successfully", extra={"user_id": user.id, "email": email})
    except Exception as e:
        logger.logger.error("Error sending reset email", extra={"error": str(e), "email": email})
        raise ServiceUnavailableError(message="Error sending reset email", details={"error": str(e)})


@router.post("/register", response_model=UserResponse)
@limiter.limit(RATE_LIMITS["auth"])
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    """
    Register New User

    Create a new user account with username, email, and password.

    Args:
        request (Request): FastAPI request object for rate limiting
        user (UserCreate): User registration data
            - username (str): Unique username for the account
            - email (EmailStr): Valid email address
            - password (str): Password for the account (will be hashed)

    Returns:
        UserResponse: Created user information
            - id (int): Unique user ID
            - username (str): Username
            - email (str): Email address
            - created_at (datetime): Account creation timestamp
            - is_active (bool): Account status

    Raises:
        ValidationError (400): Username or email already exists
        ValidationError (422): Invalid email format or missing fields

    Example Request:
        ```json
        {
            "username": "john_doe",
            "email": "john@example.com",
            "password": "secure_password123"
        }
        ```
    """
    try:
        # Check if username exists
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            record_auth_attempt(
                settings.FASTAPI_ENV,
                action="register",
                status="validation_error",
            )
            raise ValidationError(
                message="Username already registered",
                details={"username": user.username},
            )

        # Check if email exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            record_auth_attempt(
                settings.FASTAPI_ENV,
                action="register",
                status="validation_error",
            )
            raise ValidationError(message="Email already registered", details={"email": user.email})

        # Create new user
        db_user = User(username=user.username, email=user.email)
        db_user.password = user.password  # This will hash the password
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        EmailTaskManager.send_welcome_email_async(db_user.email, db_user.username)

        logger.logger.info(
            "User registered successfully",
            extra={"user_id": db_user.id, "username": db_user.username},
        )
        record_auth_attempt(
            settings.FASTAPI_ENV,
            action="register",
            status="success",
        )
        return db_user
    except ValidationError:
        raise
    except Exception as e:
        record_auth_attempt(
            settings.FASTAPI_ENV,
            action="register",
            status="error",
        )
        logger.logger.error("Error registering user", extra={"error": str(e), "username": user.username})
        raise TarotAPIException(message="Error registering user", details={"error": str(e)})


@router.post("/token")
@limiter.limit(RATE_LIMITS["auth"])
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    User Login

    Authenticate user and return access and refresh tokens for subsequent API calls.
    Users can log in using either their username or email address in the username field.

    Args:
        request (Request): FastAPI request object for rate limiting
        form_data (OAuth2PasswordRequestForm): Login credentials
            - username (str): Username or email address
            - password (str): User password

    Returns:
        dict: Authentication token information
            - access_token (str): JWT access token
            - refresh_token (str): JWT refresh token
            - token_type (str): Always "bearer"

    Raises:
        AuthenticationError (401): Invalid username/email or password
    """
    try:
        logger.logger.info(
            "Login attempt",
            extra={"username_or_email": form_data.username},
        )

        user = (
            db.query(User)
            .filter(
                or_(User.username == form_data.username, User.email == form_data.username),
                User.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if not user:
            record_auth_attempt(
                settings.FASTAPI_ENV,
                action="login",
                status="rejected",
            )
            logger.logger.warning(
                "Login failed: User not found",
                extra={"username_or_email": form_data.username},
            )
            raise AuthenticationError(
                message="Incorrect username or password",
                details={"username_or_email": form_data.username},
            )

        if user.login_locked_until and user.login_locked_until > datetime.utcnow():
            record_auth_attempt(settings.FASTAPI_ENV, action="login", status="rejected")
            raise AuthenticationError(message="Incorrect username or password")

        if not user.verify_password(form_data.password):
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.login_locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
            record_auth_attempt(
                settings.FASTAPI_ENV,
                action="login",
                status="rejected",
            )
            logger.logger.warning(
                "Login failed: Invalid password",
                extra={"username_or_email": form_data.username},
            )
            raise AuthenticationError(
                message="Incorrect username or password",
                details={"username_or_email": form_data.username},
            )

        user.failed_login_attempts = 0
        user.login_locked_until = None
        try:
            session_id = str(uuid.uuid4())
            family_id = str(uuid.uuid4())
            refresh_token = create_refresh_token(
                data={"sub": user.username},
                session_id=session_id,
                family_id=family_id,
            )
            access_token = create_access_token(
                data={"sub": user.username},
                session_id=session_id,
                family_id=family_id,
            )
            ip_address, user_agent = request_metadata(request)
            db.add(
                AuthSession(
                    id=session_id,
                    user_id=user.id,
                    family_id=family_id,
                    refresh_token_hash=hash_token(refresh_token),
                    expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            )
            db.commit()
            set_auth_cookies(response, access_token, refresh_token)
        except Exception as token_error:
            record_auth_attempt(
                settings.FASTAPI_ENV,
                action="login",
                status="error",
            )
            logger.logger.error(
                "Error creating tokens",
                extra={"error": str(token_error), "username_or_email": form_data.username},
            )
            raise TarotAPIException(message="Error creating tokens", details={"error": str(token_error)})

        logger.logger.info(
            "User logged in successfully",
            extra={"user_id": user.id, "username": user.username},
        )
        record_auth_attempt(
            settings.FASTAPI_ENV,
            action="login",
            status="success",
        )
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
    except AuthenticationError:
        raise
    except Exception as e:
        record_auth_attempt(
            settings.FASTAPI_ENV,
            action="login",
            status="error",
        )
        logger.logger.error(
            "Error during login",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "username_or_email": form_data.username,
                "traceback": traceback.format_exc(),
            },
        )
        raise TarotAPIException(message="Error during login", details={"error": str(e)})


@router.post("/refresh")
@limiter.limit(RATE_LIMITS["auth"])
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token_data: RefreshToken | None = Body(default=None),
    db: Session = Depends(get_db),
):
    """
    Refresh Access Token

    Generate a new access token using a valid refresh token.

    Args:
        request (Request): FastAPI request object for rate limiting
        refresh_token_data (RefreshToken): Refresh token data
            - refresh_token (str): Valid refresh token

    Returns:
        dict: New authentication token information
            - access_token (str): New JWT access token
            - refresh_token (str): New JWT refresh token
            - token_type (str): Always "bearer"

    Raises:
        AuthenticationError (401): Invalid or expired refresh token
    """
    try:
        refresh_token_value = (refresh_token_data.refresh_token if refresh_token_data else None) or request.cookies.get(
            settings.REFRESH_COOKIE_NAME
        )
        if not refresh_token_value:
            raise AuthenticationError(message="Refresh token required")

        # Verify refresh token
        payload = jwt.decode(
            refresh_token_value, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="rejected")
            raise AuthenticationError(message="Invalid token type")

        username: str = payload.get("sub")
        if username is None:
            record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="rejected")
            raise AuthenticationError(message="Invalid token payload")

        # Verify user exists
        user = db.query(User).filter(User.username == username, User.is_deleted == False).first()  # noqa: E712
        if user is None:
            record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="rejected")
            raise AuthenticationError(message="User not found")

        session_id = payload.get("sid")
        family_id = payload.get("fid") or str(uuid.uuid4())
        old_session = db.query(AuthSession).filter(AuthSession.id == session_id).first() if session_id else None
        if old_session:
            if old_session.revoked_at:
                sessions = db.query(AuthSession).filter(AuthSession.family_id == old_session.family_id).all()
                for session in sessions:
                    revoke_session(session, "refresh_token_reuse")
                db.commit()
                record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="rejected")
                raise AuthenticationError(message="Refresh token has already been used")
            if old_session.expires_at <= datetime.utcnow() or not hmac.compare_digest(
                old_session.refresh_token_hash, hash_token(refresh_token_value)
            ):
                raise AuthenticationError(message="Invalid refresh token")
            family_id = old_session.family_id
            revoke_session(old_session, "rotated")

        new_session_id = str(uuid.uuid4())
        new_refresh_token = create_refresh_token(
            data={"sub": user.username},
            session_id=new_session_id,
            family_id=family_id,
        )
        access_token = create_access_token(
            data={"sub": user.username},
            session_id=new_session_id,
            family_id=family_id,
        )
        ip_address, user_agent = request_metadata(request)
        db.add(
            AuthSession(
                id=new_session_id,
                user_id=user.id,
                family_id=family_id,
                refresh_token_hash=hash_token(new_refresh_token),
                expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )
        db.commit()
        set_auth_cookies(response, access_token, new_refresh_token)

        record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="success")
        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}
    except JWTError as e:
        record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="rejected")
        logger.logger.error("JWT decode error", extra={"error": str(e)})
        raise AuthenticationError(message="Invalid refresh token", details={"error": str(e)})
    except AuthenticationError:
        raise
    except TarotAPIException:
        record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="error")
        raise
    except Exception as e:
        record_auth_attempt(settings.FASTAPI_ENV, action="refresh", status="error")
        logger.logger.error("Error refreshing token", extra={"error": str(e)})
        raise TarotAPIException(message="Error refreshing token", details={"error": str(e)})


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, token: str | None = Depends(get_auth_token), db: Session = Depends(get_db)):
    """Revoke the current browser/API session and clear authentication cookies."""
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            session_id = payload.get("sid")
            if session_id:
                session = db.query(AuthSession).filter(AuthSession.id == session_id).first()
                if session and not session.revoked_at:
                    revoke_session(session, "logout")
                    db.commit()
        except JWTError:
            pass
    clear_auth_cookies(response)


@router.post("/logout-all", status_code=204)
async def logout_all(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke every active session for the authenticated user."""
    revoke_user_sessions(db, current_user.id, "logout_all")
    db.commit()
    clear_auth_cookies(response)


@router.post("/forgot-password")
@limiter.limit(RATE_LIMITS["auth"])
async def forgot_password(request: Request, request_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request Password Reset

    Send a password reset token to the user's email address.
    For security, this endpoint always returns success even if the email doesn't exist.

    Args:
        request (Request): FastAPI request object for rate limiting
        request_data (ForgotPasswordRequest): Password reset request
            - email (EmailStr): Email address to send reset token to

    Returns:
        dict: Success message
            - message (str): Confirmation message

    Example Request:
        ```json
        {
            "email": "john@example.com"
        }
        ```

    Example Response:
        ```json
        {
            "message": "If an account exists with this email, a password reset token has been sent."
        }
        ```

    Note:
        The reset token expires after 1 hour.
    """
    try:
        token = generate_reset_token()
        # Find user by email or username
        user = (
            db.query(User)
            .filter(or_(User.email == request_data.email_or_username, User.username == request_data.email_or_username))
            .first()
        )
        if user:
            # Queue the email task — log but don't fail the request if dispatch errors out.
            try:
                EmailTaskManager.send_password_reset_email_async(user.email, token, user.id)
            except Exception as dispatch_error:
                logger.logger.error(
                    "Failed to dispatch password reset email task",
                    extra={"user_id": user.id, "error": str(dispatch_error)},
                )
        record_auth_attempt(settings.FASTAPI_ENV, action="forgot_password", status="success")
        return {"message": "If an account exists with this email or username, a password reset token has been sent."}
    except Exception as e:
        record_auth_attempt(settings.FASTAPI_ENV, action="forgot_password", status="error")
        logger.logger.error(
            "Error in forgot password process",
            extra={"error": str(e), "email_or_username": request_data.email_or_username},
        )
        raise TarotAPIException(message="Error processing password reset request", details={"error": str(e)})


@router.post("/reset-password")
@limiter.limit(RATE_LIMITS["auth"])
async def reset_password(request: Request, request_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset User Password

    Reset a user's password using a valid reset token received via email.

    Args:
        request (Request): FastAPI request object for rate limiting
        request_data (ResetPasswordRequest): Password reset data
            - token (str): Reset token received via email
            - new_password (str): New password for the account

    Returns:
        dict: Success message
            - message (str): Confirmation message

    Raises:
        ValidationError (400): Invalid, expired, or already used reset token

    Example Request:
        ```json
        {
            "token": "abc123def456ghi789",
            "new_password": "new_secure_password123"
        }
        ```

    Example Response:
        ```json
        {
            "message": "Password has been reset successfully"
        }
        ```

    Note:
        Reset tokens expire after 1 hour and can only be used once.
    """
    try:
        # Find valid reset token
        reset_token = (
            db.query(PasswordResetToken)
            .filter(
                or_(
                    PasswordResetToken.token_hash == hash_token(request_data.token),
                    PasswordResetToken.token == request_data.token,
                ),
                PasswordResetToken.expires_at > datetime.utcnow(),
                PasswordResetToken.is_used == False,  # noqa: E712
            )
            .first()
        )

        if not reset_token:
            record_auth_attempt(settings.FASTAPI_ENV, action="reset_password", status="validation_error")
            raise ValidationError(
                message="Invalid or expired reset token",
                details={},
            )

        # Update user's password
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        user.password = request_data.new_password

        # Mark token as used
        reset_token.is_used = True
        revoke_user_sessions(db, user.id, "password_reset")

        db.commit()

        EmailTaskManager.send_password_changed_email_async(user.email, user.username)

        logger.logger.info("Password reset successful", extra={"user_id": user.id})
        record_auth_attempt(settings.FASTAPI_ENV, action="reset_password", status="success")
        return {"message": "Password has been reset successfully"}
    except ValidationError:
        raise
    except Exception as e:
        record_auth_attempt(settings.FASTAPI_ENV, action="reset_password", status="error")
        logger.logger.error("Error resetting password", extra={"error": str(e)})
        raise TarotAPIException(message="Error resetting password", details={"error": str(e)})


@router.get("/me", response_model=UserResponse)
@limiter.limit(RATE_LIMITS["default"])
async def get_current_user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Current User Profile

    Get the profile information of the currently authenticated user.

    Returns:
        UserResponse: Current user information
            - id (int): Unique user ID
            - username (str): Username
            - email (str): Email address
            - created_at (datetime): Account creation timestamp
            - is_active (bool): Account status
            - avatar_url (str, optional): URL to user's avatar image

    Raises:
        AuthenticationError (401): If token is invalid or user not found
    """
    try:
        # Get the favorite deck
        favorite_deck = None
        if current_user.favorite_deck_id:
            favorite_deck = db.query(Deck).filter(Deck.id == current_user.favorite_deck_id).first()

        # Get avatar URL
        base_url = str(request.base_url).rstrip("/").replace("http://", "https://")
        avatar_url = avatar_manager.get_avatar_url(current_user.avatar_filename, base_url)

        user_response = UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            full_name=current_user.full_name,
            created_at=current_user.created_at,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            is_specialized_premium=current_user.is_specialized_premium,
            favorite_deck_id=current_user.favorite_deck_id,
            favorite_deck=DeckResponse.model_validate(favorite_deck) if favorite_deck else None,
            lemon_squeezy_customer_id=current_user.lemon_squeezy_customer_id,
            subscription_status=current_user.subscription_status,
            number_of_free_turns=current_user.number_of_free_turns,
            number_of_paid_turns=current_user.number_of_paid_turns,
            last_free_turns_reset=current_user.last_free_turns_reset,
            avatar_url=avatar_url,
            bio=current_user.bio,
            timezone=current_user.timezone,
            lunar_phase_awareness=(
                current_user.lunar_phase_awareness if current_user.lunar_phase_awareness is not None else True
            ),
            card_animations=current_user.card_animations or "cinematic",
            reading_language=current_user.reading_language or "English",
            reversed_cards=current_user.reversed_cards if current_user.reversed_cards is not None else True,
        )
        return user_response
    except Exception as e:
        logger.logger.error("Error getting user profile", extra={"error": str(e), "user_id": current_user.id})
        raise ServiceUnavailableError(message="Error getting user profile", details={"error": str(e)})


@router.put("/me", response_model=UserResponse)
@limiter.limit(RATE_LIMITS["default"])
async def update_current_user_profile(
    request: Request,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update Current User Profile

    Update the profile information of the currently authenticated user.

    Args:
        request (Request): FastAPI request object for rate limiting
        user_update (UserUpdate): User update data
            - favorite_deck_id (int, optional): ID of the user's favorite tarot deck
            - full_name (str, optional): Full name of the user
            - bio (str, optional): Short profile biography
            - timezone (str, optional): IANA timezone name
            - lunar_phase_awareness (bool, optional): Color readings with the moon phase
            - card_animations (str, optional): Card reveal animation style
            - reading_language (str, optional): Preferred interpretation language
            - reversed_cards (bool, optional): Allow reversed cards in spreads

    Returns:
        UserResponse: Updated user information

    Raises:
        AuthenticationError (401): If token is invalid or user not found
        ValidationError (400): If favorite_deck_id doesn't exist
    """
    try:
        # Update favorite deck if provided
        if "favorite_deck_id" in user_update.model_fields_set and user_update.favorite_deck_id is not None:
            # Verify the deck exists
            deck = db.query(Deck).filter(Deck.id == user_update.favorite_deck_id).first()
            if not deck:
                raise ValidationError(
                    message="Invalid deck ID", details={"favorite_deck_id": user_update.favorite_deck_id}
                )
            current_user.favorite_deck_id = user_update.favorite_deck_id

        # Update full name if provided in the request
        if "full_name" in user_update.model_fields_set:
            current_user.full_name = user_update.full_name

        # Update profile details and reading preferences when explicitly provided
        for field in (
            "bio",
            "timezone",
            "lunar_phase_awareness",
            "card_animations",
            "reading_language",
            "reversed_cards",
        ):
            if field in user_update.model_fields_set:
                setattr(current_user, field, getattr(user_update, field))

        db.commit()
        db.refresh(current_user)

        return current_user
    except ValidationError:
        raise
    except Exception as e:
        logger.logger.error("Error updating user profile", extra={"error": str(e), "user_id": current_user.id})
        raise TarotAPIException(message="Error updating user profile", details={"error": str(e)})


@router.get("/decks", response_model=list[DeckResponse])
@limiter.limit(RATE_LIMITS["default"])
async def get_available_decks(request: Request, db: Session = Depends(get_db)):
    """
    Get Available Tarot Decks

    Get a list of all available tarot decks that users can set as their favorite.

    Returns:
        list[DeckResponse]: List of available tarot decks
            - id (int): Unique deck ID
            - name (str): Deck name
            - description (str): Deck description
            - created_at (datetime): Deck creation timestamp
    """
    decks = db.query(Deck).all()
    return decks


@router.post("/avatar/upload")
@limiter.limit(RATE_LIMITS["upload"])
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload User Avatar

    Upload and process a user's avatar image. The image will be resized to 400x400 pixels
    and compressed to be under 1MB.

    Args:
        request (Request): FastAPI request object for rate limiting
        file (UploadFile): Image file to upload
        current_user (User): Current authenticated user
        db (Session): Database session

    Returns:
        dict: Upload result
            - message (str): Success message
            - avatar_url (str): URL to the uploaded avatar

    Raises:
        HTTPException (400): If file is invalid or processing fails
        HTTPException (413): If file is too large
        HTTPException (401): If user is not authenticated
        HTTPException (503): If avatar functionality is disabled (local environment)

    Supported Formats:
        - JPEG (.jpg, .jpeg)
        - PNG (.png)
        - GIF (.gif)
        - WebP (.webp)

    File Requirements:
        - Maximum upload size: 10MB
        - Final size after processing: ≤1MB
        - Output dimensions: 400x400 pixels

    Note:
        Avatar functionality is disabled in local development environment (FASTAPI_ENV=local).
    """
    # Check if avatar functionality is disabled (local environment)
    fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
    if fastapi_env == "local":
        return {"message": "Avatar upload is disabled in local development environment", "avatar_url": None}

    try:
        # Store old avatar filename for later cleanup
        old_avatar_filename = current_user.avatar_filename

        # Save new avatar with username
        filename = avatar_manager.save_avatar(file, current_user.username)

        # Update user record with new avatar
        current_user.avatar_filename = filename
        db.commit()

        # Only delete old avatar after new one is successfully saved and database is updated
        if old_avatar_filename:
            deletion_success = avatar_manager.delete_avatar(old_avatar_filename)
            if deletion_success:
                logger.logger.info(
                    "Old avatar deleted successfully",
                    extra={"user_id": current_user.id, "old_filename": old_avatar_filename},
                )
            else:
                logger.logger.warning(
                    "Failed to delete old avatar file",
                    extra={"user_id": current_user.id, "old_filename": old_avatar_filename},
                )

        # Get avatar URL
        base_url = str(request.base_url).rstrip("/").replace("http://", "https://")
        avatar_url = avatar_manager.get_avatar_url(filename, base_url)

        logger.logger.info(
            "Avatar uploaded successfully",
            extra={
                "user_id": current_user.id,
                "avatar_filename": filename,
                "replaced_old": old_avatar_filename is not None,
            },
        )

        return {"message": "Avatar uploaded successfully", "avatar_url": avatar_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.logger.error(
            "Error uploading avatar",
            extra={"error": str(e), "user_id": current_user.id, "traceback": traceback.format_exc()},
        )
        raise HTTPException(status_code=500, detail=f"Error uploading avatar: {str(e)}")


@router.delete("/avatar")
@limiter.limit(RATE_LIMITS["default"])
async def delete_avatar(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete User Avatar

    Delete the current user's avatar image.

    Args:
        request (Request): FastAPI request object for rate limiting
        current_user (User): Current authenticated user
        db (Session): Database session

    Returns:
        dict: Deletion result
            - message (str): Success message

    Raises:
        HTTPException (401): If user is not authenticated
        HTTPException (404): If no avatar exists

    Note:
        Avatar functionality is disabled in local development environment (FASTAPI_ENV=local).
    """
    # Check if avatar functionality is disabled (local environment)
    fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
    if fastapi_env == "local":
        return {"message": "Avatar deletion is disabled in local development environment"}

    try:
        if not current_user.avatar_filename:
            raise HTTPException(status_code=404, detail="No avatar found")

        # Delete avatar file
        avatar_manager.delete_avatar(current_user.avatar_filename)

        # Update user record
        current_user.avatar_filename = None
        db.commit()

        logger.logger.info("Avatar deleted successfully", extra={"user_id": current_user.id})

        return {"message": "Avatar deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.logger.error("Error deleting avatar", extra={"error": str(e), "user_id": current_user.id})
        raise HTTPException(status_code=500, detail="Error deleting avatar")


@router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    """
    Get Avatar Image

    Serve an avatar image file.

    Args:
        filename (str): Name of the avatar file to serve

    Returns:
        FileResponse: The avatar image file

    Raises:
        HTTPException (404): If avatar file not found

    Note:
        Avatar functionality is disabled in local development environment (FASTAPI_ENV=local).
        In local mode, returns a 404 error for all avatar requests.
    """
    # Check if avatar functionality is disabled (local environment)
    fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
    if fastapi_env == "local":
        raise HTTPException(status_code=404, detail="Avatar functionality disabled in local environment")

    try:
        file_path = avatar_manager.get_avatar_path(filename)
        if not file_path:
            raise HTTPException(status_code=404, detail="Avatar not found")

        return FileResponse(
            file_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},  # Cache for 24 hours
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.logger.error("Error serving avatar", extra={"error": str(e), "avatar_filename": filename})
        raise HTTPException(status_code=500, detail="Error serving avatar")
