# ArcanaAI Frontend

A modern, responsive Next.js application for AI-powered tarot readings with comprehensive subscription management, dual payment systems, and a beautiful user interface.

## 🌟 Features

- 🎴 **Interactive Tarot Readings**: AI-powered interpretations with multiple deck support
- 💬 **Chat-based Interface**: Real-time tarot consultations with conversation history
- 💳 **Dual Payment System**: Credit cards (Lemon Squeezy) + MetaMask (Ethereum)
- 👑 **Subscription Management**: Turn tracking with premium features
- 📱 **Mobile-First Design**: Responsive design optimized for all devices
- 🌙 **Theme Support**: Dark/light theme with system preference detection
- 🔒 **Secure Authentication**: JWT-based authentication with profile management
- 📚 **Journal System**: Personal tarot journal with analytics and insights
- 🎨 **Beautiful UI**: Modern design with Tailwind CSS and custom components
- 🔮 **Multiple Decks**: Support for various tarot deck styles
- 📊 **Reading Analytics**: Track your tarot journey and insights

## 🛠️ Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **React Context** - State management
- **React Hook Form** - Form handling and validation
- **React Hot Toast** - Beautiful notifications
- **Lucide React** - Modern icon library
- **Framer Motion** - Smooth animations and transitions

## 📋 Prerequisites

- Node.js 20+
- Backend server running (see [../backend/README.md](../backend/README.md))
- Lemon Squeezy account (for credit card payments)
- MetaMask wallet (for Ethereum payments)

## 🚀 Getting Started

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/vanloc1808/tarot-reader-agent.git
cd tarot-reader-agent/frontend

# Install dependencies
npm install
# or
yarn install
```

### 2. Configuration

```bash
# Create environment file
cp .env.example .env.local

# Edit with your configuration
nano .env.local
```

#### Required Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Environment
NODE_ENV=development
```

### 3. Development Server

```bash
# Start development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 💳 Payment Integration

The frontend supports two payment methods for a seamless user experience:

### Primary: Credit Card (Lemon Squeezy)
- **Default payment option** for most users
- **Secure checkout** via Lemon Squeezy's platform
- **Multiple currencies** support
- **Automatic subscription management**
- **Webhook integration** for real-time updates

### Secondary: MetaMask (Ethereum)
- **Cryptocurrency payment option** for crypto enthusiasts
- **Real-time ETH price conversion** using CoinGecko API
- **On-chain transaction verification** with block confirmations
- **Network validation** (Ethereum Mainnet)
- **Gas fee optimization** and transaction status tracking

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin panel pages
│   │   ├── auth/              # Authentication pages
│   │   ├── journal/           # Journal system pages
│   │   ├── pricing/           # Subscription pricing
│   │   ├── profile/           # User profile management
│   │   ├── reading/           # Tarot reading interface
│   │   └── shared/            # Shared reading pages
│   ├── components/             # Reusable UI components
│   │   ├── ui/                # Base UI components
│   │   ├── journal/           # Journal-specific components
│   │   ├── freemium/          # Subscription components
│   │   └── icons/             # Custom icon components
│   ├── contexts/               # React context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── tailwind.config.ts          # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

## 🎨 Key Components

### Core Components
- **SubscriptionModal**: Main payment interface with dual payment options
- **TurnCounter**: Displays remaining turns with visual indicators
- **TarotCard**: Interactive card display with animations
- **EnhancedNavigation**: Main navigation with user menu and theme toggle
- **MysticalSidebar**: Tarot-specific navigation and deck selection

### Subscription Components
- **SubscriptionModal**: Unified payment interface
- **SubscriptionHistory**: Payment and subscription tracking
- **TurnCounter**: Visual turn management
- **PricingPage**: Subscription plan comparison

### Journal Components
- **CreateJournalEntry**: New journal entry creation
- **JournalEntries**: Entry listing and management
- **JournalAnalytics**: Reading insights and trends
- **PersonalCardMeanings**: Custom card interpretations

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Code Quality Tools

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Jest**: Testing framework
- **Testing Library**: React component testing

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=SubscriptionModal
```

### Test Structure

- **Unit Tests**: Component functionality testing
- **Integration Tests**: Component interaction testing
- **Mock Services**: External API mocking
- **Test Utilities**: Common testing helpers

## 🚀 Building for Production

### Build Process

```bash
# Create production build
npm run build

# Start production server
npm start

# Analyze bundle size
npm run analyze
```

### Production Optimization

- **Code splitting** for optimal loading
- **Image optimization** with Next.js Image component
- **Bundle analysis** for size optimization
- **Performance monitoring** with Core Web Vitals

## 🌐 Environment Configuration

### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

### Production
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NODE_ENV=production
```

## 📱 Responsive Design

The frontend is built with a **mobile-first approach**:
- **Mobile optimization** for touch interfaces
- **Responsive breakpoints** for all screen sizes
- **Progressive enhancement** for older browsers
- **Accessibility features** for inclusive design

## 🎨 Theme System

### Theme Features
- **Dark/Light themes** with system preference detection
- **Theme persistence** across sessions
- **Smooth transitions** between themes
- **Custom CSS variables** for consistent theming

### Theme Toggle
- **Automatic detection** of system preference
- **Manual toggle** in user settings
- **Persistent storage** in localStorage
- **CSS transitions** for smooth theme changes

## 🔒 Security Features

- **JWT token management** with secure storage
- **Input validation** and sanitization
- **XSS protection** with React's built-in security
- **CSRF protection** for form submissions
- **Secure cookie handling** for authentication

## 📊 Performance Features

- **Next.js optimization** for fast loading
- **Image optimization** with WebP support
- **Code splitting** for reduced bundle sizes
- **Lazy loading** for non-critical components
- **Service worker** for offline capabilities

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run code quality checks**
6. **Submit a pull request**

### Development Guidelines
- **TypeScript**: Use strict typing
- **Component Design**: Follow React best practices
- **Testing**: Maintain high test coverage
- **Accessibility**: Ensure inclusive design
- **Performance**: Optimize for Core Web Vitals

## 📚 Documentation

- **Main Project Documentation**: [../README.md](../README.md)
- **Backend Documentation**: [../backend/README.md](../backend/README.md)
- **Lemon Squeezy Setup**: [../docs/LEMON_SQUEEZY.md](../docs/LEMON_SQUEEZY.md)
- **MetaMask Integration**: [../docs/METAMASK_ETHEREUM_SETUP.md](../docs/METAMASK_ETHEREUM_SETUP.md)
- **Subscription System**: [../docs/SUBSCRIPTION.md](../docs/SUBSCRIPTION.md)

## 🆘 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules .next
   npm install
   npm run build
   ```

2. **TypeScript Errors**
   ```bash
   # Check types
   npm run type-check

   # Fix type issues
   npm run lint:fix
   ```

3. **Test Failures**
   ```bash
   # Clear test cache
   npm test -- --clearCache

   # Run specific test
   npm test -- --testNamePattern="ComponentName"
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: For the excellent React framework
- **Tailwind CSS**: For the utility-first CSS framework
- **React Community**: For amazing libraries and tools
- **Open Source Contributors**: For continuous improvements

---

**Note**: This frontend is designed to work seamlessly with the ArcanaAI backend. Ensure both services are properly configured and running for full functionality.
