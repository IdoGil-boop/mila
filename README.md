# Mila - Personalized Place Discovery Platform

A next-generation place discovery platform that learns user preferences through an interactive onboarding process and provides personalized recommendations.

## Project Status

### ✅ Completed

- **Project Setup**: Next.js 14 with TypeScript, Tailwind CSS, Framer Motion
- **Dependencies**: All core packages installed (AWS SDK, OpenAI, Paddle, etc.)
- **Type Definitions**: Complete TypeScript types for all data structures
- **DynamoDB Library**: Full CRUD operations for all tables
- **DynamoDB Tables Script**: Script to create all required tables
- **Authentication System**: Google OAuth + manual signup with JWT
- **Auth API Routes**: `/api/auth/google`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- **Google Places Integration**: Complete with cost-optimized field masks
- **OpenAI BIO Generation**: Multi-select & A/B comparison analysis
- **Paddle Subscriptions**: Checkout, webhooks, subscription management
- **Dynamic Message System**: 50+ templates with seed script
- **Onboarding API Routes**: Complete flow (initialize, get-question, submit-answer, etc.)
- **Onboarding UI Components**: CategoryCard, PlaceCard, ABComparison

### 🚧 In Progress

- Subscription/payment API routes
- Main search interface with personalization
- Saved places functionality

### 📋 Next Up

- Home page with map integration
- Results display with rich cards
- Saved places dropdown with rate modal
- Profile page with voluntary BIO access

See detailed status in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

## Getting Started

### Prerequisites

- Node.js 18+
- AWS account with DynamoDB access
- Google Cloud Platform account (for Maps & OAuth)
- OpenAI API key
- Paddle account (Israeli merchant)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.local.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Create DynamoDB tables**:
   ```bash
   npm run create-tables
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
mila/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoints
│   └── ...
├── components/            # React components
│   ├── auth/              # Auth components
│   ├── onboarding/        # Onboarding flow components
│   ├── home/              # Home page components
│   └── results/           # Results display components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication logic
│   ├── dynamodb.ts       # DynamoDB operations
│   └── ...
├── types/                 # TypeScript type definitions
└── scripts/               # Utility scripts
    └── create-dynamodb-tables.ts
```

## Key Features

- **Interactive Onboarding**: Multi-step preference discovery with A/B comparisons
- **Personalized BIO**: AI-generated user profile (subtle, voluntary)
- **Cost-Optimized**: Pro SKU fields only during onboarding
- **Mobile-First**: List/map toggle with adjustable split
- **Rating System**: Only from saved places dropdown
- **Paddle Subscriptions**: Apple Pay + Google Pay support (Israeli merchants)

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes, DynamoDB
- **Payments**: Paddle (Apple Pay + Google Pay)
- **AI**: OpenAI GPT-4o
- **Maps**: Google Places API (New)

## Environment Variables

See `.env.local.example` for all required variables.

## License

Private project
