# Testing

27 Jest unit tests across four spec files, colocated with the code
they test (`src/**/*.spec.ts`), all with `PrismaService` mocked — no
real database is needed to run `npm test`.

- `src/auth/auth.service.spec.ts` — sign-up conflict handling,
  password hashing, carrier-profile creation on carrier sign-up,
  sign-in success/failure
- `src/shipments/shipments.service.spec.ts` — accept/pickup/delivery/
  cancel status transitions and their guards, the pickup-share payout
  math, ownership checks
- `src/disputes/disputes.service.spec.ts` — party-only dispute
  raising, status-gated raising, arbiter-address-matched resolution,
  double-resolution rejection
- `src/reviews/reviews.service.spec.ts` — delivered-only reviewing,
  sender↔carrier review direction, the carrier rolling-average-rating
  calculation

```bash
npm test          # run the suite
npm run test:watch
npm run test:cov  # with coverage, output in coverage/
```

## What's not covered yet

There's no end-to-end suite exercising a real Postgres database or a
real Soroban RPC call — `StellarService` itself isn't unit tested for
the same reason (it wraps `@stellar/stellar-sdk`, which needs network
access to simulate/submit against Soroban RPC). CI
(`.github/workflows/ci.yml`) provisions a real Postgres service and
runs `prisma migrate deploy` before `npm test`, but the tests
themselves still run against the mocked `PrismaService`, not that
database. See [ROADMAP.md](../ROADMAP.md) for adding a real e2e suite.
