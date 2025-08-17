import os
import secrets
import string
import traceback
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_mail import FastMail, MessageSchema
from jose import JWTError, jwt
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import Deck, PasswordResetToken, User
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
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def create_access_token(data: dict):
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
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.logger.error("Error creating access token", extra={"error": str(e)})
        raise ServiceUnavailableError(message="Error creating access token", details={"error": str(e)})


def create_refresh_token(data: dict):
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
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.logger.error(
            "Error creating refresh token", extra={"error": str(e), "traceback": traceback.format_exc()}
        )
        raise ServiceUnavailableError(message="Error creating refresh token", details={"error": str(e)})


async def get_current_user(
    response: Response,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Get Current Authenticated User

    Validate JWT token and return the current user. Also handles token renewal
    by setting a new token in the response headers.

    Args:
        response (Response): FastAPI response object for setting headers
        token (str): JWT token from Authorization header
        db (Session): Database session

    Returns:
        User: The authenticated user object

    Raises:
        AuthenticationError: If token is invalid or malformed
        UserNotFoundError (401): If user doesn't exist
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise AuthenticationError(
                message="Invalid token payload",
                details={"error": "Missing username in token"},
            )
        token_data = TokenData(username=username)
    except JWTError as e:
        logger.logger.error("JWT decode error", extra={"error": str(e)})
        raise AuthenticationError(message="Invalid token", details={"error": str(e)})

    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise UserNotFoundError(message="User not found", details={"username": token_data.username})

    # Renew token
    new_access_token = create_access_token(data={"sub": user.username})
    response.headers["X-Access-Token"] = new_access_token
    response.headers["Access-Control-Expose-Headers"] = "X-Access-Token"

    return user


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
            token=token,
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
            raise ValidationError(
                message="Username already registered",
                details={"username": user.username},
            )

        # Check if email exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise ValidationError(message="Email already registered", details={"email": user.email})

        # Create new user
        db_user = User(username=user.username, email=user.email)
        db_user.password = user.password  # This will hash the password
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        logger.logger.info(
            "User registered successfully",
            extra={"user_id": db_user.id, "username": db_user.username},
        )
        return db_user
    except ValidationError:
        raise
    except Exception as e:
        logger.logger.error("Error registering user", extra={"error": str(e), "username": user.username})
        raise TarotAPIException(message="Error registering user", details={"error": str(e)})


@router.post("/token")
@limiter.limit(RATE_LIMITS["auth"])
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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

        user = db.query(User).filter(or_(User.username == form_data.username, User.email == form_data.username)).first()
        if not user:
            logger.logger.warning(
                "Login failed: User not found",
                extra={"username_or_email": form_data.username},
            )
            raise AuthenticationError(
                message="Incorrect username or password",
                details={"username_or_email": form_data.username},
            )

        if not user.verify_password(form_data.password):
            logger.logger.warning(
                "Login failed: Invalid password",
                extra={"username_or_email": form_data.username},
            )
            raise AuthenticationError(
                message="Incorrect username or password",
                details={"username_or_email": form_data.username},
            )

        try:
            access_token = create_access_token(data={"sub": user.username})
            refresh_token = create_refresh_token(data={"sub": user.username})
        except Exception as token_error:
            logger.logger.error(
                "Error creating tokens",
                extra={"error": str(token_error), "username_or_email": form_data.username},
            )
            raise TarotAPIException(message="Error creating tokens", details={"error": str(token_error)})

        logger.logger.info(
            "User logged in successfully",
            extra={"user_id": user.id, "username": user.username},
        )
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
    except AuthenticationError:
        raise
    except Exception as e:
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
async def refresh_token(request: Request, refresh_token_data: RefreshToken, db: Session = Depends(get_db)):
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
        # Verify refresh token
        payload = jwt.decode(
            refresh_token_data.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            raise AuthenticationError(message="Invalid token type")

        username: str = payload.get("sub")
        if username is None:
            raise AuthenticationError(message="Invalid token payload")

        # Verify user exists
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise AuthenticationError(message="User not found")

        # Generate new tokens
        access_token = create_access_token(data={"sub": user.username})
        refresh_token = create_refresh_token(data={"sub": user.username})

        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
    except JWTError as e:
        logger.logger.error("JWT decode error", extra={"error": str(e)})
        raise AuthenticationError(message="Invalid refresh token", details={"error": str(e)})


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
            # Queue the email task (always send to user's email)
            EmailTaskManager.send_password_reset_email_async(user.email, token, user.id)
        return {"message": "If an account exists with this email or username, a password reset token has been sent."}
    except Exception as e:
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
                PasswordResetToken.token == request_data.token,
                PasswordResetToken.expires_at > datetime.utcnow(),
                PasswordResetToken.is_used == False,  # noqa: E712
            )
            .first()
        )

        if not reset_token:
            raise ValidationError(
                message="Invalid or expired reset token",
                details={"token": request_data.token},
            )

        # Update user's password
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        user.password = request_data.new_password

        # Mark token as used
        reset_token.is_used = True

        db.commit()

        logger.logger.info("Password reset successful", extra={"user_id": user.id})
        return {"message": "Password has been reset successfully"}
    except ValidationError:
        raise
    except Exception as e:
        logger.logger.error("Error resetting password", extra={"error": str(e), "token": request_data.token})
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
