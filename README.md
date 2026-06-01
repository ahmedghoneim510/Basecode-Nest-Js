# NestJS Enterprise API

Production-ready REST API built with NestJS, Prisma, Redis, and BullMQ.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma 7 ORM
- **Cache**: Redis (via cache-manager + ioredis)
- **Queue**: BullMQ (Redis-backed job processing)
- **Auth**: JWT + Passport (access + refresh tokens)
- **Validation**: class-validator + class-transformer
- **i18n**: nestjs-i18n (English + Arabic)
- **Security**: Helmet, CORS, rate limiting (Throttler)

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── config/                  # Typed configuration (app, db, jwt, redis, mail)
├── common/                  # Cross-cutting concerns
│   ├── decorators/          # @CurrentUser, @Roles, @Cached, @Invalidate, @Public
│   ├── guards/              # RolesGuard
│   ├── interceptors/        # Logging, ResponseTransform, Cache
│   └── filters/             # GlobalExceptionFilter
├── infrastructure/          # External services
│   ├── prisma/              # Database (PrismaService, PrismaExceptionFilter)
│   ├── cache/               # Redis cache module
│   ├── queue/               # BullMQ root config
│   └── mail/                # Email service + queue processor
├── shared/                  # Shared business utilities
│   ├── response/            # ResponseService, ApiResponse interface
│   └── i18n/                # TranslationService wrapper
├── modules/                 # Feature modules
│   ├── auth/                # Full auth cycle (register, login, OTP, reset)
│   └── users/               # User CRUD with repository pattern
└── i18n/                    # Translation files (en/, ar/)
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL & Redis)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL & PgAdmin
docker compose up -d

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run start:dev
```

### Environment Variables

Copy `.env.example` or create `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5433/app_db?schema=public"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRATION="15m"

REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=60

MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-app-password"
MAIL_FROM='"App" <noreply@app.com>'
```

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register + sends verification OTP |
| POST | `/auth/verify-email` | — | Verify email with OTP |
| POST | `/auth/resend-verification` | — | Resend verification OTP |
| POST | `/auth/login` | — | Login (requires verified email) |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| POST | `/auth/forgot-password` | — | Send password reset OTP |
| POST | `/auth/reset-password` | — | Reset password with OTP |
| POST | `/auth/change-password` | JWT | Change password (authenticated) |
| GET | `/auth/profile` | JWT | Get current user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | JWT | List users (paginated, cached) |
| GET | `/users/:id` | JWT | Get user detail (cached) |
| DELETE | `/users/:id` | JWT + ADMIN | Delete user (invalidates cache) |

## Key Features

### Standardized Responses

All endpoints return:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": { "page": 1, "perPage": 10, "total": 50, "totalPages": 5 }
}
```

### Caching

```ts
@Get()
@Cached('users:all', 30)       // cache GET for 30s
findAll() { ... }

@Delete(':id')
@Invalidate('users:all')       // clear cache after mutation
remove() { ... }
```

### Role-Based Access

```ts
@Delete(':id')
@Roles('ADMIN')
remove() { ... }
```

### i18n

```ts
this.trans.t('user.not_found')  // auto-detects language from request
```

Supports: `?lang=ar`, `x-lang: ar` header, or `Accept-Language` header.

## Scripts

```bash
npm run start:dev      # Development (watch mode)
npm run build          # Compile to dist/
npm run start:prod     # Run compiled build
npm run lint           # Lint + fix
npm run test           # Unit tests
npm run test:e2e       # E2E tests
```

## Database (Prisma)

### Common Commands

```bash
npx prisma studio                        # Open visual DB browser (localhost:5555)
npx prisma generate                      # Regenerate Prisma client after schema changes
npx prisma db seed                       # Run seed file (prisma/seed.ts)
```

### Migrations

```bash
npx prisma migrate dev --name <name>     # Create + apply migration (development)
npx prisma migrate deploy                # Apply pending migrations (production)
npx prisma migrate reset                 # Drop DB + re-migrate + re-seed
npx prisma migrate status                # Check migration status
npx prisma migrate dev --create-only     # Generate migration SQL without applying
```

### Schema & Introspection

```bash
npx prisma db push                       # Push schema to DB without migration history
npx prisma db pull                       # Pull existing DB schema into schema.prisma
npx prisma validate                      # Validate schema.prisma syntax
npx prisma format                        # Format schema.prisma
```

### Debugging

```bash
npx prisma version                       # Show Prisma version info
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma  # Preview SQL
```

### Tips

- After changing `schema.prisma`, always run `npx prisma generate`
- To rename a column without data loss: use `--create-only`, edit the SQL, then apply
- `migrate reset` drops everything — use only in development
- `db push` is for prototyping — use `migrate dev` for tracked changes

## Docker Services

```bash
docker compose up -d    # Start PostgreSQL + PgAdmin
```

- **PostgreSQL**: `localhost:5433`
- **PgAdmin**: `localhost:5050` (admin@admin.com / admin)
- **Redis**: `localhost:6379`
