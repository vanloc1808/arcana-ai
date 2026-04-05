import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig
from pydantic import PrivateAttr, validator
from pydantic_settings import BaseSettings

# Load environment variables
env_file = os.getenv("ENV_FILE", ".env")
load_dotenv(Path(env_file))


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file.

    This class centralizes all configuration for the backend, including JWT, database, Celery, Redis, email, OpenAI, and other service settings.
    All fields are loaded from environment variables if available, otherwise default values are used.

    Attributes:
        JWT_SECRET_KEY (str): Secret key for JWT authentication.
        JWT_ALGORITHM (str): Algorithm for JWT.
        ACCESS_TOKEN_EXPIRE_MINUTES (int): Access token expiration in minutes.
        REFRESH_TOKEN_EXPIRE_DAYS (int): Refresh token expiration in days.
        SQLALCHEMY_DATABASE_URL (str): Database connection URL.
        CELERY_BROKER_URL (str): Celery broker URL.
        CELERY_RESULT_BACKEND (str): Celery result backend URL.
        CELERY_TASK_SERIALIZER (str): Celery task serializer.
        CELERY_RESULT_SERIALIZER (str): Celery result serializer.
        CELERY_TIMEZONE (str): Celery timezone.
        CELERY_ENABLE_UTC (bool): Whether Celery uses UTC.
        REDIS_URL (str): Redis connection URL.
        REDIS_HOST (str): Redis host.
        REDIS_PORT (int): Redis port.
        REDIS_DB (int): Redis database index.
        OPENAI_API_KEY (str): OpenAI API key.
        OPENAI_MODEL (str): OpenAI model name.
        OPENAI_TEMPERATURE (float): OpenAI model temperature.
        OPENAI_MAX_TOKENS (int): Max tokens for OpenAI responses.
        MAIL_USERNAME (str): Email username.
        MAIL_PASSWORD (str): Email password.
        MAIL_FROM (str): Email sender address.
        MAIL_PORT (int): Email server port.
        MAIL_SERVER (str): Email server address.
        MAIL_FROM_NAME (str): Email sender name.
        IMGBB_API_KEY (str): ImgBB API key.
        TELEGRAM_BOT_TOKEN (str): Telegram bot token.
        TELEGRAM_CHAT_ID (str): Telegram chat ID.
        MAIL_STARTTLS (bool): Whether to use STARTTLS for email.
        MAIL_SSL_TLS (bool): Whether to use SSL/TLS for email.
        USE_CREDENTIALS (bool): Whether to use credentials for email.
        VALIDATE_CERTS (bool): Whether to validate email certificates.
        CELERY_ACCEPT_CONTENT (list): Accepted content types for Celery.
        FASTAPI_ENV (str): FastAPI environment (e.g., 'local', 'production').
        email_config (ConnectionConfig): Email connection configuration.
    """

    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 20160  # 14 * 24 * 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 180  # 180 days

    # Database Settings
    SQLALCHEMY_DATABASE_URL: str = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./tarot.db")

    # Celery Settings
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    CELERY_TASK_SERIALIZER: str = os.getenv("CELERY_TASK_SERIALIZER", "json")
    CELERY_RESULT_SERIALIZER: str = os.getenv("CELERY_RESULT_SERIALIZER", "json")
    CELERY_TIMEZONE: str = os.getenv("CELERY_TIMEZONE", "UTC")
    CELERY_ENABLE_UTC: bool = os.getenv("CELERY_ENABLE_UTC", "True").lower() == "true"

    # Pydantic validator to ensure the database URL is correctly formatted
    @validator("SQLALCHEMY_DATABASE_URL", pre=True, always=True)
    def normalize_sqlalchemy_database_url(cls, value):  # noqa: N805
        """Ensure the SQLAlchemy database URL is in the correct format.

        Args:
            value (str): The database URL to validate.
        Returns:
            str: The validated or normalized database URL.
        """
        if isinstance(value, str) and value.startswith("sqlite:///"):
            return value  # Already in correct format
        return value

    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "test-key")  # Default to test-key for testing
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "800"))

    # Email Settings
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "Tarot Reader")

    # IMGBB Settings (Legacy)
    IMGBB_API_KEY: str = os.getenv("IMGBB_API_KEY", "test-key")  # Default to test-key for testing

    # Cloudflare R2 Settings
    CLOUDFLARE_R2_ACCOUNT_ID: str = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID", "")
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
    CLOUDFLARE_R2_BUCKET_NAME: str = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "tarot-images")
    CLOUDFLARE_R2_CUSTOM_DOMAIN: str = os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN", "")

    # Image CDN URL (replaces IMGBB)
    IMAGE_CDN_URL: str = os.getenv("IMAGE_CDN_URL", "")

    # Telegram Settings
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # Email Connection Settings (already used in ConnectionConfig but needed for validation)
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
    MAIL_SSL_TLS: bool = os.getenv("MAIL_SSL_TLS", "False").lower() == "true"
    USE_CREDENTIALS: bool = os.getenv("USE_CREDENTIALS", "True").lower() == "true"
    VALIDATE_CERTS: bool = os.getenv("VALIDATE_CERTS", "True").lower() == "true"

    # Redis Settings (for caching and Celery)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/1")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "1"))

    # FastAPI Environment
    FASTAPI_ENV: str = os.getenv("FASTAPI_ENV", "local")

    # Frontend URL for password reset links
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Debug Settings
    DEBUG_SQL: bool = os.getenv("DEBUG_SQL", "False").lower() == "true"

    # Lemon Squeezy Settings
    LEMON_SQUEEZY_API_KEY: str = os.getenv("LEMON_SQUEEZY_API_KEY", "")
    LEMON_SQUEEZY_STORE_ID: str = os.getenv("LEMON_SQUEEZY_STORE_ID", "")
    LEMON_SQUEEZY_WEBHOOK_SECRET: str = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET", "")
    LEMON_SQUEEZY_PRODUCT_ID_10_TURNS: str = os.getenv("LEMON_SQUEEZY_PRODUCT_ID_10_TURNS", "")
    LEMON_SQUEEZY_PRODUCT_ID_20_TURNS: str = os.getenv("LEMON_SQUEEZY_PRODUCT_ID_20_TURNS", "")
    LEMON_SQUEEZY_ENABLE_TEST_MODE: bool = os.getenv("LEMON_SQUEEZY_ENABLE_TEST_MODE", "false").lower() == "true"

    # Ethereum Settings
    ETHEREUM_RPC_URL: str = os.getenv("ETHEREUM_RPC_URL", "https://eth-mainnet.g.alchemy.com/v2/your-api-key")
    ETHEREUM_PAYMENT_ADDRESS: str = os.getenv("ETHEREUM_PAYMENT_ADDRESS", "your-payment-address-here")

    # Private attribute to hold email ConnectionConfig (excluded from validation)
    _email_config: ConnectionConfig = PrivateAttr(default=None)

    # Slack Settings
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "")
    SLACK_CHANNEL: str = os.getenv("SLACK_CHANNEL", "")

    @property
    def email_config(self) -> ConnectionConfig:
        """Return the email ConnectionConfig instance."""
        if self._email_config is None:
            # Create email config if not already created
            self._email_config = ConnectionConfig(
                MAIL_USERNAME=self.MAIL_USERNAME,
                MAIL_PASSWORD=self.MAIL_PASSWORD,
                MAIL_FROM=self.MAIL_FROM,
                MAIL_PORT=self.MAIL_PORT,
                MAIL_SERVER=self.MAIL_SERVER,
                MAIL_FROM_NAME=self.MAIL_FROM_NAME,
                MAIL_STARTTLS=self.MAIL_STARTTLS,
                MAIL_SSL_TLS=self.MAIL_SSL_TLS,
                USE_CREDENTIALS=self.USE_CREDENTIALS,
                VALIDATE_CERTS=self.VALIDATE_CERTS,
            )
        return self._email_config

    class Config:
        """Pydantic configuration for the Settings class.

        Attributes:
            env_file (str): Path to the .env file to load environment variables from.
        """

        env_file = env_file


settings = Settings()
