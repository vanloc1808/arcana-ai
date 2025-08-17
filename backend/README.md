# ArcanaAI Backend

A modern, high-performance FastAPI backend for AI-powered tarot reading services with comprehensive subscription management, user authentication, and real-time features.

## 🚀 Features

- **AI-Powered Tarot Readings**: OpenAI GPT integration for personalized interpretations
- **User Authentication**: JWT-based authentication with email verification
- **Subscription Management**: Turn-based system with premium features
- **Real-time Chat**: WebSocket support for interactive tarot sessions
- **Journal System**: Personal tarot journal with analytics
- **Admin Panel**: Comprehensive user and content management
- **Payment Integration**: Lemon Squeezy + MetaMask (Ethereum) support
- **Image Management**: Cloudflare R2 integration for tarot card images
- **Database Migrations**: Full Alembic migration system with SQLite/PostgreSQL support
- **CI/CD Ready**: Automated testing and deployment pipeline

## 🛠️ Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **PostgreSQL/SQLite**: Database support with full migration system
- **Redis**: Caching and message broker
- **Celery**: Asynchronous task processing
- **JWT**: Authentication and authorization
- **OpenAI API**: AI-powered tarot interpretations
- **Alembic**: Database migration management
- **uv**: Fast Python package manager
- **Pydantic**: Data validation and settings management

## 📋 Prerequisites

- Python 3.11+
- Redis
- PostgreSQL (optional, SQLite supported for development/CI)
- OpenAI API key
- Cloudflare R2 account (for image storage)
- uv (Python package manager)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/vanloc1808/tarot-reader-agent.git
cd tarot-reader-agent/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies using uv (recommended)
uv sync

# Or using pip (alternative)
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

#### Required Environment Variables

```env
# Database
DATABASE_URL=sqlite:///./tarot.db  # For development/CI
# DATABASE_URL=postgresql://user:password@localhost/tarot_db  # For production

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# JWT
JWT_SECRET_KEY=your-secret-key

# Email (Gmail)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2 (optional)
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=tarot-images
```

### 3. Database Setup

```bash
# Run database migrations
python migrate.py

# Check migration status
alembic current
alembic heads
```

### 4. Start the Server

```bash
# Development mode
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app:app --host 0.0.0.0 --port 8000
```

## 🗄️ Database Management

### Migration System

The backend uses Alembic for database migrations with full SQLite and PostgreSQL compatibility:

- **27 migrations** covering all schema changes
- **Automatic migration resolution** for multiple heads
- **Cross-database compatibility** (SQLite ↔ PostgreSQL)
- **CI/CD integration** with automated testing

### Migration Commands

```bash
# Check current migration
alembic current

# Check migration heads
alembic heads

# View migration history
alembic history

# Create new migration
alembic revision --autogenerate -m "Description"

# Run migrations
python migrate.py

# Rollback migration
alembic downgrade -1
```

### Database Support

- **SQLite**: Perfect for development and CI/CD pipelines
- **PostgreSQL**: Recommended for production deployments
- **Automatic switching** based on DATABASE_URL environment variable

## 🔧 Development

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app

# Run tests in CI mode
CI=true pytest
```

### Code Quality

```bash
# Format code
black .
isort .

# Lint code
ruff check .
ruff format .

# Type checking
mypy .

# Run pre-commit hooks
pre-commit run --all-files
```

### Development Tools

- **uv**: Fast Python package management
- **Pre-commit hooks**: Automated code quality checks
- **Ruff**: Fast Python linter and formatter
- **Black**: Code formatting
- **isort**: Import sorting
- **mypy**: Type checking

## 🏗️ Project Structure

```
backend/
├── app/                    # Main application package
│   ├── api/               # API endpoints
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   └── app.py            # FastAPI application
├── routers/               # API route handlers
│   ├── auth.py           # Authentication routes
│   ├── chat.py           # Chat and tarot routes
│   ├── admin.py          # Admin panel routes
│   ├── subscription.py   # Subscription management
│   └── journal.py        # Journal system routes
├── services/              # Business logic services
├── migrations/            # Alembic migration files
│   └── versions/         # Migration version files
├── tests/                 # Test suite
├── utils/                 # Utility functions
├── config.py             # Configuration management
├── database.py           # Database connection
├── migrate.py            # Migration runner
└── requirements.txt      # Python dependencies
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Tarot Readings
- `POST /api/tarot/reading` - Create tarot reading
- `GET /api/tarot/cards` - Get available tarot cards
- `GET /api/tarot/spreads` - Get available spreads

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload avatar

### Subscription
- `POST /api/subscription/checkout` - Create checkout session
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/webhook` - Payment webhook

### Admin (Admin users only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{user_id}` - Update user
- `GET /api/admin/stats` - System statistics

## 🧪 Testing

### Test Configuration

The backend includes comprehensive testing with:
- **Pytest**: Testing framework
- **SQLite**: In-memory database for tests
- **Test factories**: User and data factories
- **Mock services**: External service mocking
- **CI integration**: Automated testing in GitHub Actions

### Running Tests

```bash
# Run all tests
pytest

# Run specific test category
pytest tests/test_auth.py
pytest tests/test_tarot.py
pytest tests/test_admin.py

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html
```

### Test Database

Tests use an isolated SQLite database that's automatically cleaned between test runs:
- **CI mode**: Uses existing migrated database with cleanup
- **Local mode**: Creates/drops tables for each test
- **Data isolation**: No test data leakage between tests

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production Deployment

1. **Environment Setup**
   ```bash
   FASTAPI_ENV=production
   DATABASE_URL=postgresql://user:password@localhost/tarot_db
   ```

2. **Database Migration**
   ```bash
   python migrate.py
   ```

3. **Start Server**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```

### CI/CD Pipeline

The backend includes a comprehensive GitHub Actions workflow:
- **Automated testing** with database setup
- **Database migrations** in CI environment
- **Code quality checks** (linting, formatting)
- **Docker image building**
- **Automated deployment** to VPS

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health

### Metrics
- **Prometheus**: Application and system metrics
- **Grafana**: Beautiful visualization dashboards
- **Logging**: Structured logging with different levels

### Performance
- **Database query optimization**
- **Redis caching**
- **Async task processing**
- **Rate limiting**

## 🔒 Security Features

- **JWT authentication** with secure token handling
- **Password hashing** using bcrypt
- **Rate limiting** to prevent abuse
- **Input validation** with Pydantic schemas
- **SQL injection protection** with SQLAlchemy
- **CORS configuration** for frontend integration
- **Environment variable protection**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run code quality checks
6. Submit a pull request

### Code Standards
- **Python**: Black, isort, mypy, ruff
- **Git**: Conventional commit messages
- **Testing**: Comprehensive test coverage
- **Documentation**: Clear docstrings and comments

## 📚 Documentation

- **API Documentation**: Available at `/docs` when running the server
- **Migration Guide**: See `migrations/` directory
- **Configuration**: See `config.py` and `.env.example`
- **Testing**: See `tests/` directory

## 🆘 Troubleshooting

### Common Issues

1. **Migration Errors**
   ```bash
   # Check migration status
   alembic current
   alembic heads

   # Reset database (development only)
   rm tarot.db
   python migrate.py
   ```

2. **Database Connection Issues**
   - Verify DATABASE_URL in .env
   - Check database server status
   - Verify network connectivity

3. **Test Failures**
   ```bash
   # Clean test environment
   rm -rf .pytest_cache
   pytest --tb=short
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI**: For the excellent web framework
- **SQLAlchemy**: For the powerful ORM
- **Alembic**: For database migration management
- **OpenAI**: For AI capabilities
- **Open Source Community**: For amazing tools and libraries

---

**Note**: This backend is designed for production use with proper security measures. Always follow security best practices when deploying to production environments.
