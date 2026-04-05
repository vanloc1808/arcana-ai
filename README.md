# ArcanaAI - AI-Powered Tarot Reading Service

A comprehensive, AI-powered tarot reading service built with FastAPI, Next.js, and modern web technologies. This application provides interactive tarot readings, subscription management, user authentication, and a beautiful, responsive interface.

## 🌐 Live Demo

**🚀 [Try ArcanaAI Now](https://arcanaai.nguyenvanloc.com/)**

Experience the full application with live tarot readings, user authentication, and all premium features.

## 🌟 Features

- **AI-Powered Tarot Readings**: Get personalized tarot interpretations using OpenAI's GPT models
- **Multiple Tarot Decks**: Support for various tarot deck styles and interpretations
- **User Authentication**: JWT-based authentication with email verification
- **Subscription Management**: Turn-based system with premium features
- **Interactive Chat Interface**: Real-time chat sessions with tarot readings
- **Journal System**: Save and track your tarot reading history
- **Responsive Design**: Mobile-first design with modern UI components
- **Admin Panel**: Comprehensive admin interface for user and content management
- **Multi-language Support**: Internationalization ready
- **Real-time Notifications**: WebSocket-based notifications
- **Image Management**: Cloudflare R2 integration for tarot card images
- **Dual Payment System**: Credit cards (Lemon Squeezy) + MetaMask (Ethereum)

## 🚀 Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **PostgreSQL/SQLite**: Database support with full migration system
- **Redis**: Caching and message broker
- **Celery**: Asynchronous task processing
- **JWT**: Authentication and authorization
- **OpenAI API**: AI-powered tarot interpretations
- **Alembic**: Database migration management
- **uv**: Fast Python package manager

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form handling and validation
- **Zustand**: State management
- **React Query**: Server state management

### Infrastructure
- **Docker**: Containerization
- **Traefik**: Reverse proxy and load balancer
- **Prometheus & Grafana**: Monitoring and observability
- **GitHub Actions**: CI/CD pipeline with automated testing
- **Cloudflare R2**: Object storage for tarot card images

## 📋 Prerequisites

- Python 3.11+
- Node.js 20+
- Docker and Docker Compose
- Redis
- PostgreSQL (optional, SQLite supported for development/CI)
- OpenAI API key
- Cloudflare R2 account (for image storage)
- uv (Python package manager)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/vanloc1808/tarot-reader-agent.git
cd tarot-reader-agent
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies using uv (recommended)
uv sync

# Or using pip (alternative)
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
python migrate.py

# Start the backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start the development server
npm run dev
```

### 4. Docker Setup (Recommended)

```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit environment files with your configuration

# Start all services
docker-compose up -d
```

## ⚙️ Configuration

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/tarot_db
# or for SQLite: DATABASE_URL=sqlite:///./tarot.db

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

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🗄️ Database Setup

### Using SQLite (Development/CI)
The application will automatically create a SQLite database file. Perfect for development and CI/CD pipelines.

### Using PostgreSQL (Production)
1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in your `.env` file
4. Run migrations: `python migrate.py`

### Migration System
The project uses Alembic for database migrations with full SQLite and PostgreSQL compatibility:
- **27 migrations** covering all schema changes
- **Automatic migration resolution** for multiple heads
- **Cross-database compatibility** (SQLite ↔ PostgreSQL)
- **CI/CD integration** with automated testing

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment
1. Set `FASTAPI_ENV=production` in backend environment
2. Configure your reverse proxy (Traefik, Nginx, etc.)
3. Set up SSL certificates
4. Configure monitoring and logging

### CI/CD Pipeline
The project includes a comprehensive GitHub Actions workflow:
- **Automated testing** with database setup
- **Database migrations** in CI environment
- **Frontend and backend** testing
- **Docker image building**
- **Automated deployment** to VPS

## 📱 Features Overview

### Tarot Readings
- **Daily Cards**: Get a new tarot card interpretation each day
- **Custom Spreads**: Choose from various tarot spreads
- **AI Interpretations**: Personalized readings using OpenAI
- **Card Meanings**: Comprehensive upright and reversed interpretations
- **Multiple Decks**: Support for various tarot deck styles

### User Management
- **Registration & Login**: Secure user authentication
- **Profile Management**: Update personal information and preferences
- **Avatar Upload**: Custom profile pictures with Cloudflare R2
- **Reading History**: Track all your tarot sessions
- **Journal System**: Personal tarot journal with analytics

### Subscription System
- **Turn-based System**: Limited free readings per month
- **Premium Features**: Unlock unlimited readings
- **Dual Payment**: Lemon Squeezy (credit cards) + MetaMask (Ethereum)
- **Subscription Management**: Comprehensive admin interface

### Admin Features
- **User Management**: View and manage all users
- **Content Management**: Manage tarot cards and spreads
- **Analytics**: User activity and system metrics
- **Support System**: Handle user support requests
- **Specialized Premium**: VIP user management

## 🔧 Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Backend
cd backend
black .
isort .
mypy .

# Frontend
cd frontend
npm run lint
npm run type-check
```

### Database Migrations
```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
python migrate.py

# Check migration status
alembic current
alembic heads
```

### Development Tools
- **uv**: Fast Python package management
- **Pre-commit hooks**: Automated code quality checks
- **Ruff**: Fast Python linter and formatter
- **ESLint**: JavaScript/TypeScript linting

## 📊 Monitoring

The application includes comprehensive monitoring:

- **Prometheus Metrics**: Application and system metrics
- **Grafana Dashboards**: Beautiful visualization of metrics
- **Health Checks**: API health endpoints
- **Logging**: Structured logging with different levels
- **Performance Monitoring**: Database and API performance tracking

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **Python**: Black, isort, mypy, ruff
- **TypeScript**: ESLint, Prettier
- **Git**: Conventional commit messages
- **Testing**: Comprehensive test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: For providing the AI capabilities
- **Tarot Community**: For the rich tradition of tarot interpretation
- **Open Source Community**: For the amazing tools and libraries
- **Cloudflare**: For R2 object storage
- **Lemon Squeezy**: For payment processing

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/vanloc1808/tarot-reader-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vanloc1808/tarot-reader-agent/discussions)
- **Documentation**: [Wiki](https://github.com/vanloc1808/tarot-reader-agent/wiki)

## 🔮 Roadmap

- [x] **Completed**: Database migration system with SQLite/PostgreSQL compatibility
- [x] **Completed**: CI/CD pipeline with automated testing
- [x] **Completed**: Dual payment system (Lemon Squeezy + MetaMask)
- [x] **Completed**: Cloudflare R2 integration for image storage
- [x] **Completed**: Comprehensive admin panel
- [ ] Mobile app (React Native)
- [ ] Additional Tarot decks
- [ ] Advanced AI features
- [ ] Community features
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] API rate limiting improvements
- [ ] Enhanced security features

## 🚨 Recent Updates

### v2.1.0 - User Experience & Security Improvements
- ✅ **Terms Agreement**: Added required checkbox for Terms of Service and Privacy Policy on registration
- ✅ **Enhanced Validation**: Improved form validation with custom error messages
- ✅ **Better UX**: Custom checkbox styling that matches the dark theme
- ✅ **Security**: Ensures users explicitly agree to terms before account creation

---

**Note**: This is an open-source project. Please ensure you comply with all applicable laws and regulations when using this software, especially regarding AI-generated content and user data privacy.
