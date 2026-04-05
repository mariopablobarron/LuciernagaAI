# Tres Mil Millones de LatidosAI - Architecture Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Directory Structure](#directory-structure)
4. [Core Layers](#core-layers)
5. [Routes & Pages](#routes--pages)
6. [Key Components](#key-components)
7. [API Architecture](#api-architecture)
8. [Data Models](#data-models)
9. [Services & Business Logic](#services--business-logic)
10. [Technology Stack](#technology-stack)

---

## Executive Summary

**Tres Mil Millones de Latidos** is a behavior transformation platform built on Next.js 16 that uses AI coaching to help users overcome avoidance and build sustainable habits.

### Core Value Proposition
- **Interactive exploration**: Users identify what they're avoiding via circular canvas UI
- **AI coaching**: OpenRouter-powered conversational mentor
- **State tracking**: Real-time emotional/behavioral state detection
- **Impulso mode**: Gamified challenge system with daily check-ins
- **Admin dashboard**: Operational metrics, user management, crisis response

### Key Technical Characteristics
- **Full-stack Next.js 16** with React 19
- **Prisma ORM** with PostgreSQL
- **Real-time state management** through Redis (optional)
- **Builder.io CMS** integration for marketing pages
- **OpenRouter AI API** for LLM responses
- **Telegram integration** for notifications and messaging
- **Tailwind CSS 4** with shadcn/ui components

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (React 19)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │  Public Pages    │  │ Main Workspace   │  │  Admin    │ │
│  │  /landing        │  │ /app             │  │  /admin   │ │
│  │  /explore        │  │ /dashboard       │  │ /editor   │ │
│  │  /contact        │  │ /impulso/*       │  │           │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│                                                              │
│  Components: home/, explore/, impulse/, layout/, ui/       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              NEXT.JS SERVER LAYER (16.2.1)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Handlers (src/app/api/*/route.ts)            │  │
│  │  - Chat & messaging                                  │  │
│  │  - User state & goals                                │  │
│  │  - Authentication & sessions                         │  │
│  │  - Admin operations                                  │  │
│  │  - Telegram webhooks                                 │  │
│  │  - Check-ins & diagnostics                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Server Components (src/app/*/page.tsx, **/layout.tsx)     │
│  - Fetch data server-side                                   │
│  - Pass to Client Components                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           BUSINESS LOGIC LAYER (src/services/*)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ State Engine │  │ AI Coach     │  │ Impulso Logic    │  │
│  │ - Detect     │  │ - OpenRouter │  │ - Diagnostics    │  │
│  │   emotional  │  │   integration│  │ - Challenges     │  │
│  │   state      │  │ - Streaming  │  │ - Daily logs     │  │
│  │ - Risk       │  │   responses  │  │ - Insights       │  │
│  │   detection  │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Goals/Actions│  │ Reminders &  │  │ Decision Engine  │  │
│  │ - CRUD ops   │  │ Messaging    │  │ - Metrics→Ops    │  │
│  │ - Completion │  │ - Telegram   │  │ - Segmentation   │  │
│  │   tracking   │  │ - Email      │  │                  │  │
│  │ - Avoidance  │  │ - Future msg │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           INFRASTRUCTURE LAYER (src/lib/*)                  │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Authentication │  │ Environment  │  │ Rate Limiting  │  │
│  │ - Session mgmt │  │ - Config val │  │ - API guards   │  │
│  │ - JWT tokens   │  │ - Type-safe  │  │                │  │
│  │ - Admin auth   │  │   env access │  │                │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ AI Integration │  │ Logging &    │  │ Builder.io CMS │  │
│  │ - OpenRouter   │  │ Monitoring   │  │ - Fetch pages  │  │
│  │ - Streaming    │  │ - Metrics    │  │ - Register     │  │
│  │ - Promptwork   │  │ - Alerts     │  │   components   │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              DATA PERSISTENCE LAYER                         │
│  ┌────────────────────────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL (via Prisma ORM)    │  │ Redis (optional)│   │
│  │ - Users, Conversations         │  │ - Sessions      │   │
│  │ - Messages, Goals, Actions     │  │ - Rate limits   │   │
│  │ - Check-ins, Challenges        │  │ - Caches        │   │
│  │ - Streaks, Insights            │  │                 │   │
│  │ - Crisis events, Decisions     │  │                 │   │
│  └────────────────────────────────┘  └─────────────────┘   │
│  External APIs: OpenRouter, Telegram, Builder.io           │
└───────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
luciernaga-ai/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── not-found.tsx             # 404 handler
│   │   ├── globals.css               # Tailwind base + theme variables
│   │   │
│   │   ├── (public)/                 # Route group for public pages
│   │   │   ├── layout.tsx            # Public layout (Header + Footer)
│   │   │   ├── landing/page.tsx      # Marketing page (/landing)
│   │   │   ├── contact/page.tsx      # Contact form (/contact)
│   │   │   └── explore/page.tsx      # Interactive explore (/explore)
│   │   │
│   │   ├── app/page.tsx              # Main workspace (/app) - PROTECTED
│   │   ├── dashboard/                # User analytics (/dashboard)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/                    # Admin panel (/admin/*) - PROTECTED
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── users/[id]/page.tsx
│   │   ├── editor/page.tsx           # BlockNote editor (/editor)
│   │   ├── impulso/                  # Gamified challenges (/impulso/*)
│   │   │   ├── page.tsx
│   │   │   ├── diagnostico/page.tsx
│   │   │   ├── perfil/page.tsx
│   │   │   ├── checkin/page.tsx
│   │   │   └── retos/page.tsx
│   │   │
│   │   ├── api/                      # Route handlers
│   │   │   ├── auth/                 # Authentication
│   │   │   ├── chat/                 # Chat & messaging
│   │   │   ├── conversations/        # Conversation management
│   │   │   ├── goals/                # Goal CRUD
│   │   │   ├── actions/              # Action management
│   │   │   ├── checkin/              # Daily check-ins
│   │   │   ├── impulso/              # Impulso diagnostics/challenges
│   │   │   ├── admin/                # Admin operations
│   │   │   ├── telegram/             # Telegram webhooks
│   │   │   ├── cron/                 # Scheduled jobs
│   │   │   ├── user/                 # User state
│   │   │   └── health/               # System health checks
│   │   │
│   │   └── [[...page]]/page.tsx      # Builder.io catch-all
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/radix primitives
│   │   ├── home/                     # Marketing & onboarding
│   │   │   ├── Header.tsx            # Navigation header
│   │   │   ├── Footer.tsx            # Page footer
│   │   │   ├── LandingPage.tsx       # Landing composition
│   │   │   ├── HomeCanvas.tsx        # Demo canvas
│   │   │   ├── HomeWorkspace.tsx     # Main app shell
│   │   │   ├── HomeHero.tsx          # Welcome card
│   │   │   ├── HomeOnboarding.tsx    # Setup flow
│   │   │   ├── HowItWorks.tsx        # Section
│   │   │   ├── BenefitsSection.tsx   # Section
│   │   │   └── ...
│   │   ├── explore/                  # Explore canvas experience
│   │   │   ├── ExploreCanvas.tsx     # Main circular UI
│   │   │   ├── ActionNode.tsx        # Circular node button
│   │   │   ├── ActionModal.tsx       # Input dialog
│   │   │   ├── UserCore.tsx          # Center element
│   │   │   └── ProgressIndicator.tsx
│   │   ├── impulse/                  # Impulso dashboard
│   │   │   └── ImpulseDashboard.tsx
│   │   ├── layout/                   # Reusable shells
│   │   │   ├── AppLayout.tsx         # 3-column workspace
│   │   │   ├── Sidebar.tsx           # Left nav drawer
│   │   │   └── RightPanel.tsx        # Right panel wrapper
│   │   ├── Chat.tsx                  # Chat message stream + input
│   │   ├── Sidebar.tsx               # Feature-specific sidebar
│   │   ├── InsightsPanel.tsx         # Right panel insights
│   │   ├── BlockEditor.tsx           # BlockNote editor
│   │   ├── BuilderContent.tsx        # Builder.io renderer
│   │   ├── BuilderRegistrations.tsx  # Builder component registration
│   │   └── theme-provider.tsx        # next-themes wrapper
│   │
│   ├── features/                     # Feature-scoped code
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   └── types.ts
│   │   └── auth/
│   │       └── components/
│   │
│   ├── services/                     # Business logic layer
│   │   ├── ai.ts                     # OpenRouter integration
│   │   ├── chat.ts                   # Chat orchestration
│   │   ├── state.ts                  # Emotional state detection
│   │   ├── risk.ts                   # Crisis detection & response
│   │   ├── goals.ts                  # Goal intent & completion
│   │   ├── coach.ts                  # Coaching flows
│   │   ├── mentor-protocol.ts        # Mentor interaction rules
│   │   ├── impulse-diagnostic.ts     # Diagnostic logic
│   │   ├── impulse-challenges.ts     # Challenge assignment
│   │   ├── impulse-insights.ts       # Challenge insights
│   │   ├── reminders.ts              # Scheduled notifications
│   │   ├── telegram.ts               # Telegram integration
│   │   ├── decision.ts               # Metrics → operations decisions
│   │   ├── metrics.ts                # Telemetry aggregation
│   │   ├── alerts.ts                 # Admin/user alert dispatch
│   │   ├── user.ts                   # User profile/state
│   │   ├── events.ts                 # Event logging
│   │   └── ...others
│   │
│   ├── domain/                       # Domain models & logic
│   │   ├── types.ts                  # Core domain types
│   │   ├── userStateEngine.ts        # State machine logic
│   │   └── decisionEngine.ts         # Decision logic
│   │
│   ├── lib/                          # Infrastructure & utilities
│   │   ├── auth.ts                   # Session management
│   │   ├── admin-auth.ts             # Admin auth helpers
│   │   ├── session-client.ts         # Browser session utilities
│   │   ├── env.ts                    # Environment validation
│   │   ├── saas.ts                   # App configuration
│   │   ├── builder.ts                # Builder.io SDK helpers
│   │   ├── logger.ts                 # Logging
│   │   ├── rate-limit.ts             # Rate limiting
│   │   ├── email.ts                  # Email sending
│   │   ├── telegram-link.ts          # Telegram linking
│   │   ├── fetchWithTimeout.ts       # HTTP with timeout
│   │   ├── alerts.ts                 # Alert utilities
│   │   ├── metrics.ts                # Metric helpers
│   │   └── utils.ts                  # General utilities
│   │
│   ├── types/                        # TypeScript types
│   │   ├── emotional-profile.ts      # Profile type definitions
│   │   └── impulse.ts                # Impulso DTOs
│   │
│   └── db/
│       └── prisma.ts                 # Prisma client singleton
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Migration history
│
├── scripts/
│   ├── system-check.sh               # Health check
│   └── testing-agent.sh              # Test agent runner
│
├── docs/
│   ├── ARCHITECTURE.md               # This file
│   └── api/README.md                 # API documentation
│
├── public/
│   ├── favicon.ico
│   └── placeholder.png
│
├── .env.local                        # Local environment variables
├── .env.example                      # Environment template
├── package.json                      # Dependencies
├── next.config.ts                    # Next.js config
├── tsconfig.json                     # TypeScript config
├── jest.config.mjs                   # Testing config
├── eslint.config.mjs                 # Linting rules
└── README.md                         # Main readme
```

---

## Core Layers

### 1. Presentation Layer (`src/app`, `src/components`)

Responsible for UI rendering and user interaction.

**Routes & Pages:**
- **Public pages** under `(public)/` route group
  - Landing, explore, contact
  - Wrapped with Header + Footer
- **Protected pages**
  - `/app` - Main workspace (requires auth)
  - `/dashboard` - User progress
  - `/admin/*` - Admin panel (requires admin auth via proxy)
  - `/impulso/*` - Gamified challenges
  - `/editor` - BlockNote workspace
- **Builder.io catch-all** (`[[...page]]`)
  - Dynamically renders CMS pages
  - Falls back to 404 for unmapped routes

**Key Components:**
- **Layout shells:** `AppLayout`, `Sidebar`, `RightPanel`, `Layout`
- **Feature surfaces:** `HomeWorkspace`, `ExploreCanvas`, `ImpulseDashboard`
- **Atomic components:** UI primitives from shadcn/radix-ui

**State Management:**
- React hooks (`useState`, `useEffect`)
- Browser `localStorage` for session token persistence
- Context for theme/providers
- URL search params for navigation context

---

### 2. Business Logic Layer (`src/services`, `src/domain`)

Orchestrates domain logic, external API calls, and data transformations.

**Key Responsibilities:**

| Service | Purpose |
|---------|---------|
| `state.ts` | Detects emotional state from conversation history |
| `risk.ts` | Identifies crisis risk and generates safety responses |
| `goals.ts` | Manages goal CRUD, completion, avoidance detection |
| `coach.ts` | Coaching flow orchestration |
| `ai.ts` | OpenRouter API integration, streaming responses |
| `impulse-diagnostic.ts` | Diagnostic questionnaire logic |
| `impulse-challenges.ts` | Challenge assignment & tracking |
| `reminders.ts` | Telegram/email notification scheduling |
| `decision.ts` | Metrics → operational decisions |
| `metrics.ts` | Aggregates telemetry for analytics |
| `user.ts` | User profile, plan, anonymity linking |
| `events.ts` | Event logging & audit trail |

**Domain Types** (`src/domain/types.ts`):
```typescript
type UserState = 'neutral' | 'bloqueo' | 'ansiedad' | 'duda' | 'claridad'
type EventType = 'message' | 'goal_created' | 'action_completed' | 'crisis' | ...
type Decision = 'upsell' | 'at_risk' | 'engaged' | ...
```

---

### 3. Infrastructure Layer (`src/lib`, `src/app/api`)

Provides low-level utilities and handles HTTP requests.

**Key Utilities:**

| Module | Purpose |
|--------|---------|
| `auth.ts` | Session identity, token validation, cookie management |
| `admin-auth.ts` | Admin session creation, verification, JWT creation |
| `env.ts` | Typed environment variable access & startup validation |
| `builder.ts` | Builder.io SDK wrapper for CMS page fetching |
| `logger.ts` | Structured logging (local, telemetry) |
| `rate-limit.ts` | Request throttling per user/IP |
| `email.ts` | Email sending via SMTP/service |
| `telegram-link.ts` | Telegram account linking flow |
| `alerts.ts` | Admin/user alert dispatch |
| `metrics.ts` | Event telemetry aggregation |

**API Route Handlers** (`src/app/api/*/route.ts`):
- Receive HTTP requests
- Extract body/query/headers
- Call service layer functions
- Return JSON responses
- Handle auth via middleware/guards

---

### 4. Data Persistence Layer

**PostgreSQL** (via Prisma ORM):
- Primary database for all persistent data
- Models: Users, Conversations, Messages, Goals, Actions, etc.

**Redis** (optional):
- Session store
- Rate limiting buckets
- Ephemeral caches

**External APIs:**
- **OpenRouter** → LLM responses
- **Telegram** → Messaging, webhooks
- **Builder.io** → CMS page content
- **Email service** → Notifications
- **Stripe/payment** → Subscriptions (via user.subscription)

---

## Routes & Pages

### Public Routes (Marketing)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `(public)/layout.tsx` + catch-all | Homepage (Builder.io or fallback) |
| `/landing` | `components/home/LandingPage.tsx` | Marketing landing page |
| `/contact` | `(public)/contact/page.tsx` | Contact form |
| `/explore` | `(public)/explore/page.tsx` | Interactive exploration flow |

### Protected Routes (App)

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---|
| `/app` | `app/page.tsx` | Main workspace (chat, goals, check-in) | User session |
| `/dashboard` | `dashboard/page.tsx` | User progress overview | User session |
| `/editor` | `editor/page.tsx` | BlockNote editor | User session |

### Admin Routes

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---|
| `/admin` | `admin/page.tsx` | Admin dashboard | Admin login |
| `/admin/login` | `admin/login/page.tsx` | Admin auth | None (public) |
| `/admin/users` | `admin/users/page.tsx` | User management | Admin login |
| `/admin/users/[id]` | `admin/users/[id]/page.tsx` | User detail view | Admin login |

### Impulso Routes (Gamification)

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---|
| `/impulso` | `impulso/page.tsx` | Challenge dashboard | User session |
| `/impulso/diagnostico` | `impulso/diagnostico/page.tsx` | Diagnostic flow | User session |
| `/impulso/perfil` | `impulso/perfil/page.tsx` | Profile view | User session |
| `/impulso/checkin` | `impulso/checkin/page.tsx` | Daily check-in | User session |
| `/impulso/retos` | `impulso/retos/page.tsx` | Challenge catalog | User session |

### API Routes

**Authentication:**
- `POST /api/auth/bootstrap` - Create anonymous session
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/capture-email` - Upgrade anonymous → registered
- `POST /api/auth/link-telegram` - Link Telegram account

**Chat & Messaging:**
- `POST /api/chat` - Stream AI response
- `POST /api/chat-direct` - Direct chat (non-streaming)
- `GET /api/messages` - Fetch conversation messages
- `GET /api/conversations` - Fetch user conversations

**Goals & Actions:**
- `POST /api/goals` - Create goal
- `POST /api/actions/trigger` - Complete action
- `GET /api/goals` - Fetch user goals

**Check-ins & Diagnostics:**
- `POST /api/checkin` - Submit daily check-in
- `POST /api/diagnostic` - Submit diagnostic answers
- `GET /api/diagnostic` - Fetch diagnostic progress

**Challenges (Impulso):**
- `GET /api/challenge/assign` - Get assigned challenges
- `POST /api/challenge/assign` - Assign new challenge
- `GET /api/impulso/insights` - Challenge insights

**Admin:**
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/users` - User list with filters
- `GET /api/admin/users/[id]` - User detail
- `GET /api/admin/insights` - Operational metrics

**System:**
- `GET /api/health` - Health check
- `GET /api/user/state` - Current user emotional state
- `POST /api/telegram/webhook` - Telegram message webhook

---

## Key Components

### Main Workspace Shell (`/app`)

```
AppLayout
├── Sidebar (left)
│   └── Conversations list, nav, progress
├── HomeWorkspace (main)
│   ├── HomeHero (onboarding card)
│   ├── Tabs: Chat | Plan | Check-in
│   │   ├── Chat.tsx (selected)
│   │   │   ├── MessageList
│   │   │   └── MessageInput
│   │   ├── PlanTab
│   │   └── CheckinTab
│   └── CTA footer
└── InsightsPanel (right)
    ├── Emotional profile
    ├── Insights
    └── Engine signals
```

### Explore Experience (`/explore`)

```
ExplorePage (server + client hybrid)
├── ExploreCanvas (client)
│   ├── Background gradient (emotional state)
│   ├── Central UserCore
│   ├── 4 ActionNodes (circular)
│   │   └── onClick → ActionModal
│   ├── SVG connecting lines
│   ├── Progress indicator
│   ├── Reset button
│   └── Motivational messages
└── CTA: "Continue to chat" button
```

**Key Props:**
- `actions`: Array of action nodes to render
- `userState`: Emotional state + completion progress
- `activeNodeId`: Currently selected node
- `onNodeClick`: Toggle modal
- `onActionComplete`: Persist & update state
- `onReset`: Clear progress

### Impulso Dashboard

Self-contained component:
```
ImpulseDashboard
├── Header (title, progress summary)
├── Diagnostics section
├── Active challenges list
├── Daily log
├── Insights
└── Call-to-action
```

---

## API Architecture

### Request/Response Pattern

**Example: POST /api/chat**

```typescript
// Request
{
  conversationId: string
  message: string
  context?: { actionType, emotionalState }
}

// Response (SSE streaming)
{
  id: string
  type: 'chunk' | 'complete' | 'error'
  content: string  // streaming text
}
```

### Authentication

**Two auth systems:**

1. **User sessions** (session-based)
   - Cookies store JWT token
   - `src/lib/auth.ts` validates & decodes
   - Routes check `req.headers.cookie` for `auth_token`

2. **Admin sessions** (JWT-based)
   - Admin login generates JWT in `src/lib/admin-auth.ts`
   - Proxy gate `src/proxy.ts` validates all `/admin/*` requests
   - Redirects to login if not authenticated

### Error Handling

- API routes return `{ success: false, error: string }`
- Client catches and displays toast notifications
- Critical errors (auth, rate limit) return specific HTTP status codes
- Unhandled errors logged to monitoring service

### Rate Limiting

- `src/lib/rate-limit.ts` implements per-user limits
- Applies to: chat, goal creation, check-ins, admin endpoints
- Returns `429 Too Many Requests` when exceeded
- Limits reset hourly or per day depending on endpoint

---

## Data Models

### Core Entities (Prisma Schema)

**User**
- Identity: id, email, telegramId
- Profile: name, avatar, plan (free/pro)
- State: onboarded, preferences

**Conversation**
- Foreign key: userId
- Track: createdAt, updatedAt
- Metadata: goal context, emotional state at start

**Message**
- Foreign keys: conversationId, userId
- Content: text, role (user/assistant)
- Metadata: emotionalState, actionTriggered

**Goal**
- Foreign key: userId
- Content: title, description, status (active/completed/archived)
- Tracking: createdAt, dueDate, completedAt, avoidanceCount

**Action**
- Foreign key: goalId
- Type: task step, decision point, commitment
- Status: pending, completed, postponed
- Completion: completedAt, avoidanceReason

**UserState**
- Foreign key: userId
- Current emotional state (neutral, bloqueo, ansiedad, duda, claridad)
- Last updated timestamp

**DailyLog**
- Daily telemetry snapshot (mood, progress, habits)

**CrisisEvent**
- Foreign key: userId
- Tracked when risk algorithm flags crisis
- Response action taken

**Challenge** (Impulso)
- Catalog of challenges
- Difficulty, duration, category

**UserChallenge**
- Assignment tracking
- Progress, completionDate

**Insight**
- AI-generated insights about user progress
- Associated with conversation or state

---

## Services & Business Logic

### State Detection (`services/state.ts`)

**Input:** Message history
**Output:** `UserState` (emotional classification)

Heuristics:
- `claridad` → actionable messages, clear next steps
- `duda` → uncertainty, back-and-forth
- `ansiedad` → mentions of worry, rush, overwhelm
- `bloqueo` → stuck, stuck, inaction mentioned
- `neutral` → no strong signals

### Risk Detection (`services/risk.ts`)

**Input:** Message, user history
**Output:** `{ riskLevel, recommendation, resources }`

Flagged keywords & patterns:
- Suicide/self-harm language → **CRITICAL**
- Substance abuse mention → **HIGH**
- Isolation/hopelessness → **MEDIUM**

Response: Generate crisis resources, notify admin, optional escalation.

### Goal Intent (`services/goals.ts`)

**Input:** Latest message
**Output:** `{ action, goalId?, description? }`

Detects:
- Goal creation intent → create record
- Goal completion claim → mark complete
- Avoidance language → increment avoidanceCount
- Goal editing → update record

### Coach (`services/coach.ts`)

Orchestrates coaching flows:
1. **Welcome flow** - Onboarding, build rapport
2. **Exploration flow** - Deep dive into avoidance
3. **Action flow** - Break avoidance into small steps
4. **Reflection flow** - Review progress, celebrate wins

### AI Response Generation (`services/ai.ts`)

**Engine:** OpenRouter (supports multiple LLMs)

**Process:**
1. Build system prompt from `luciernaga-identity.ts`
2. Include context: goal, emotional state, conversation history
3. Stream response via `POST /api/chat` handler
4. Client receives chunks via Server-Sent Events
5. Extract any meta-actions (goal created, action completed, etc.)

### Impulso Diagnostic (`services/impulse-diagnostic.ts`)

**Flow:**
1. Present diagnostic questions (psychological assessment)
2. Gather answers → calculate scores
3. Map to `EmotionalProfile`
4. Assign initial challenges based on profile

**Output:** User profile with recommended challenges & daily habits.

### Reminders (`services/reminders.ts`)

**Scheduled jobs** (via cron or Telegram Webhook):
1. Daily reminder at preferred time (Telegram push or SMS)
2. Check-in prompt at scheduled times
3. Streak celebrations
4. Challenge milestone notifications

---

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Next.js 16** - Framework & server
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui + Radix** - Component library
- **next-themes** - Dark mode
- **Lucide icons** - Icons

### Backend
- **Node.js 22** - Runtime
- **Next.js API Routes** - HTTP handling
- **Prisma 7** - ORM & migrations

### Data
- **PostgreSQL** - Primary database
- **Redis** (optional) - Sessions, caching, rate limits

### External Services
- **OpenRouter** - LLM API (GPT, Claude, etc.)
- **Telegram Bot API** - Messaging, notifications
- **Builder.io** - CMS for marketing pages
- **SMTP service** - Email notifications
- **Stripe** (optional) - Billing/subscriptions

### Testing & Quality
- **Jest 30** - Testing framework
- **ESLint 9** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Static analysis

### DevOps
- **Docker** - Containerization
- **GitHub** - Version control
- **Turbopack** - Fast bundler (Next.js 16)
- **Vercel** (optional) - Hosting

---

## Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run dev server
npm run dev

# Visit http://localhost:3000
```

### Database Migrations

```bash
# Create migration after schema change
npx prisma migrate dev --name feature_name

# Apply existing migrations (production)
npx prisma migrate deploy
```

### Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building for Production

```bash
# Build the app
npm run build

# Start production server
npm run start
```

---

## Key Design Decisions

1. **App Router (Next.js 13+)**
   - Provides server components by default
   - Better data fetching, built-in caching
   - Reduced client bundle size

2. **Service-based architecture**
   - Clean separation of concerns
   - Testable business logic
   - Reusable across API routes & scheduled jobs

3. **Prisma ORM**
   - Type-safe database queries
   - Automatic migrations
   - Built-in client generation

4. **Builder.io CMS**
   - Non-technical content editing
   - A/B testing support
   - Fallback pages for dynamic routing

5. **OpenRouter abstraction**
   - Multi-LLM support without code changes
   - Cost monitoring & optimization
   - Fallback providers

6. **Session-based auth for users, JWT for admin**
   - Simple user experience (no token management)
   - Admin isolation (separate JWT signing)
   - Clear role separation

---

## Deployment Considerations

### Environment Variables Required

**Critical:**
- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_BUILDER_API_KEY` - Builder.io API key
- `OPENROUTER_API_KEY` - LLM API access
- `AUTH_TOKEN_SECRET` - Session JWT signing key

**Optional but recommended:**
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Default admin credentials
- `TELEGRAM_BOT_TOKEN` - Telegram integration
- `STRIPE_SECRET_KEY` - Billing (if enabled)
- `SMTP_URL` - Email service

### Performance Optimization

- Turbopack bundling (Next.js 16)
- Image optimization with `next/image`
- CSS compression & tree-shaking
- Database query optimization via Prisma logs
- Redis caching for session & rate limit data

### Monitoring & Observability

- Structured logging (`src/lib/logger.ts`)
- Error tracking (Sentry, LogRocket, etc.)
- Performance monitoring (Web Vitals)
- Analytics telemetry (`src/lib/metrics.ts`)

---

## Future Improvements

1. **Offline support** - Service Worker, local IndexedDB
2. **Real-time collaboration** - WebSocket for shared goals
3. **Voice interface** - Telegram voice note transcription
4. **Analytics dashboard** - Drill-down into user segments
5. **ML-powered recommendations** - Personalized challenge suggestions
6. **Mobile app** - React Native wrapper for iOS/Android

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintainer:** Development Team
