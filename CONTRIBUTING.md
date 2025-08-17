# Contributing to ArcanaAI

Thank you for your interest in contributing to ArcanaAI! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/vanloc1808/tarot-reader-agent/issues) page
- Provide a clear description of the problem
- Include steps to reproduce the issue
- Add relevant screenshots or logs if applicable

### Suggesting Features
- Use the [GitHub Discussions](https://github.com/vanloc1808/tarot-reader-agent/discussions) page
- Describe the feature you'd like to see
- Explain why this feature would be useful
- Consider implementation complexity

### Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 🛠️ Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git
- Docker (optional)

### Local Development
1. Clone your fork
2. Set up the backend:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start the development servers:
   ```bash
   # Backend (in backend directory)
   uvicorn app:app --reload --host 0.0.0.0 --port 8000

   # Frontend (in frontend directory)
   npm run dev
   ```

## 📝 Code Style

### Python (Backend)
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines
- Use type hints where possible
- Keep functions focused and single-purpose
- Add docstrings for public functions and classes

### TypeScript/JavaScript (Frontend)
- Follow the existing code style
- Use TypeScript for type safety
- Prefer functional components with hooks
- Use meaningful variable and function names

### General Guidelines
- Write clear, readable code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful commit messages

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov=./ --cov-report=html  # For coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage  # For coverage report
```

### Test Guidelines
- Write tests for new functionality
- Ensure existing tests pass
- Aim for good test coverage
- Use descriptive test names

## 📚 Documentation

- Update README.md if you add new features
- Add inline code comments for complex logic
- Update API documentation if you modify endpoints
- Include examples in your documentation

## 🔒 Security

- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Follow security best practices
- Report security vulnerabilities privately

## 🚀 Pull Request Process

1. **Title**: Use a clear, descriptive title
2. **Description**: Explain what changes you made and why
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update relevant documentation
5. **Screenshots**: Include screenshots for UI changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 📋 Issue Labels

We use the following labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `priority: low`: Low priority issue

## 🎯 Areas for Contribution

- **Frontend**: UI improvements, new components, accessibility
- **Backend**: API enhancements, performance optimizations
- **Testing**: More test coverage, new test scenarios
- **Documentation**: Better guides, examples, tutorials
- **DevOps**: CI/CD improvements, deployment scripts
- **Monitoring**: Better metrics, alerting, logging

## 📞 Getting Help

- **Discussions**: [GitHub Discussions](https://github.com/vanloc1808/tarot-reader-agent/discussions)
- **Issues**: [GitHub Issues](https://github.com/vanloc1808/tarot-reader-agent/issues)
- **Wiki**: [Project Wiki](https://github.com/vanloc1808/tarot-reader-agent/wiki)

## 🙏 Recognition

Contributors will be recognized in:
- The project README
- Release notes
- GitHub contributors page

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to ArcanaAI! 🎴✨
