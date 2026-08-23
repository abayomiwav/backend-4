# Contributing to StellarExpress/backend

## Development setup

```bash
cp .env.example .env
docker compose up -d          # starts Postgres 16 on localhost:5432
npm install
npx prisma generate
npx prisma migrate dev        # applies prisma/migrations, prompts for new ones
npm run start:dev             # http://localhost:4000/graphql
```

## Before opening a PR

```bash
npm run lint
npm test
npm run build
```

`npm test` runs the Jest unit suite with `PrismaService` mocked — no
database is required. If your change touches `prisma/schema.prisma`,
run `npx prisma migrate dev` to generate a migration and commit the
resulting `prisma/migrations/` directory alongside your change.

## Commit style

Keep commits scoped to one logical change with an imperative subject
line (e.g. `fix: guard confirmDelivery against already-cancelled
shipments`). Prefixing with `feat:`, `fix:`, `docs:`, `chore:`, or
`refactor:` is encouraged but not enforced.

## Branches and PRs

Branch off `main`, open a PR against `main`, and describe what changed
and why. Link any related issue. CI (`.github/workflows/ci.yml`) runs
lint, the unit suite, and a build against a real Postgres instance —
it must be green before merge.
