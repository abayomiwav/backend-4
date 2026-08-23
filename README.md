# StellarExpress Backend

The API behind **StellarExpress**, a logistics platform on Stellar. A
NestJS + GraphQL service over a Postgres/Prisma data layer, with a thin
Stellar/Soroban integration layer that builds unsigned transactions for
the [`escrow`](https://github.com/StellarExpress/contracts) contract and
hands them to the client to sign — the backend never touches a user's
private key.

This is one of three StellarExpress repos:

| Repo | Purpose |
|---|---|
| [`contracts`](https://github.com/StellarExpress/contracts) | The Soroban `escrow` contract |
| [`backend`](https://github.com/StellarExpress/backend) *(this repo)* | GraphQL API, Postgres data layer, non-custodial Stellar integration |
| [`frontend`](https://github.com/StellarExpress/frontend) | Marketing site + product preview (Next.js) |

## Table of contents

- [New to this stack? Start here](#new-to-this-stack-start-here)
- [Stack](#stack)
- [Architecture](#architecture)
- [Why an off-chain API on top of an on-chain escrow](#why-an-off-chain-api-on-top-of-an-on-chain-escrow)
- [Non-custodial Stellar flow](#non-custodial-stellar-flow)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [GraphQL API reference](#graphql-api-reference)
- [REST: the Stellar signing flow](#rest-the-stellar-signing-flow)
- [Data model](#data-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## New to this stack? Start here

- **NestJS** structures a backend around **modules** (a feature area,
  e.g. `shipments/`), **services** (the actual logic and database
  queries), and **resolvers** (GraphQL) or **controllers** (REST).
- **GraphQL** exposes a single `/graphql` endpoint where the client
  specifies exactly which fields it wants back, instead of many fixed
  REST routes. A **query** reads; a **mutation** writes. This schema is
  **code-first** — TypeScript classes with `@ObjectType()`/`@Field()`
  decorators generate the schema automatically (`src/schema.gql`).
- **Prisma** is the ORM — `prisma/schema.prisma` becomes a fully-typed
  client (`this.prisma.shipment.findMany(...)`), with schema changes
  tracked as versioned **migrations**.
- **JWT** keeps a user "logged in" between requests: `signIn` returns a
  signed token, the client sends it as `Authorization: Bearer <token>`,
  and `JwtAuthGuard` verifies it on every subsequent call.
- **Escrow**, in plain terms: funds held by a neutral party until agreed
  conditions are met. Here, that neutral party is the `escrow` Soroban
  contract, not StellarExpress's servers — see the
  [contracts README's glossary](https://github.com/StellarExpress/contracts#new-to-stellarsoroban-start-here)
  for Stellar/Soroban terms (XDR, ledger, Stellar Asset Contract).
- **Why REST *and* GraphQL?** `/stellar/build` and `/stellar/submit` move
  a raw XDR string — Stellar's transaction wire format — which doesn't
  benefit from GraphQL's field-selection, so they're plain REST. Every
  other resource (shipments, tracking, disputes, reviews) goes through
  GraphQL.

## Stack

NestJS 11 · GraphQL (code-first, Apollo Server 5 via `@nestjs/apollo`) ·
Prisma 6 / PostgreSQL · `@stellar/stellar-sdk` 16 · JWT auth
(`passport-jwt`, `bcryptjs`) · `@nestjs/schedule` (available for future
delivery-deadline reminder jobs) · `class-validator` / `class-transformer`.

## Architecture

```
src/
  auth/         signup/signin (sender or carrier), JWT issuance, Stellar address linking
  shipments/    the core resource — create, accept, pickup/delivery confirmation, cancel
  tracking/     free-text status updates a sender or carrier posts against a shipment
  disputes/     raise + arbiter-only resolve, mirroring the on-chain dispute flow
  reviews/      post-delivery ratings; rolls up into a carrier's average rating
  stellar/      non-custodial XDR builder + submitter for the escrow contract
  prisma/       PrismaService (a thin, injectable wrapper over @prisma/client)
```

Each feature module follows the same shape: a `*.service.ts` with the
Prisma queries and authorization checks, a `*.resolver.ts` exposing it
over GraphQL, `dto/` input types, and `models/` GraphQL output types.

Every module that touches money defers final authority to the on-chain
`escrow` contract: this API keeps a fast, queryable **off-chain mirror**
of shipment state (for dashboards and notifications that shouldn't wait
on a ledger round-trip) — but the actual payment releases are enforced
by the Soroban contract, not by this service.

## Why an off-chain API on top of an on-chain escrow

1. **Speed.** Rendering "your 6 active shipments" by simulating six
   contract reads on every page load doesn't scale; Prisma mirrors it.
2. **Off-chain-only data.** A receiver's name, a tracking note ("left
   with the front desk"), a dispute's free-text reason — none of this
   belongs on a public ledger, but it's exactly what the product needs.
3. **Marketplace browsing.** `openShipments` lets a carrier browse jobs
   without an RPC round-trip per listing.

## Non-custodial Stellar flow

`POST /stellar/build` returns **unsigned** XDR for an escrow contract
call. The client signs it with Freighter, a hardware wallet, or a
passkey signer, then posts the signed envelope to `POST /stellar/submit`.
The backend never receives, stores, or has the ability to reconstruct a
user's secret key — see `src/stellar/stellar.service.ts`.

```
 ┌──────────┐  1. build unsigned XDR   ┌─────────┐  3. simulate + prepare  ┌──────────────┐
 │ Frontend │ ───────────────────────▶ │ Backend │ ──────────────────────▶│ Soroban RPC   │
 └──────────┘                          └─────────┘                        └──────────────┘
      │ 2. sign with Freighter /                │
      │    hardware wallet / passkey             │
      ▼                                          │
 ┌──────────┐  4. submit signed XDR    ┌─────────┐  5. send to network     ┌──────────────┐
 │ Frontend │ ───────────────────────▶ │ Backend │ ──────────────────────▶│ escrow        │
 └──────────┘                          └─────────┘                        │ contract      │
                                                                            └──────────────┘
```

## Environment variables

See `.env.example` for the full list.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string used by Prisma |
| `JWT_SECRET` | Signs and verifies session JWTs |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint (defaults to Stellar's public testnet RPC) |
| `STELLAR_NETWORK_PASSPHRASE` | Network passphrase used when building/submitting transactions |
| `ESCROW_CONTRACT_ID` | The deployed `escrow` contract's id — see [`contracts`](https://github.com/StellarExpress/contracts) |
| `STELLAR_READ_SOURCE_ACCOUNT` | A funded account used as the simulation source for read-only contract calls |
| `ARBITER_STELLAR_ADDRESS` | The Stellar address of the platform's dispute arbiter; only a user whose linked address matches this can resolve a dispute |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |
| `PORT` | HTTP port (default `4000`) |

## Getting started

```bash
cp .env.example .env
docker compose up -d          # starts Postgres 16 on localhost:5432
npm install
npx prisma generate
npx prisma migrate deploy     # applies prisma/migrations
npm run start:dev             # http://localhost:4000/graphql
```

```bash
npm test          # unit tests (Jest, Prisma mocked — no DB required)
npm run lint
npm run build
```

## GraphQL API reference

All resolvers except `signUp`/`signIn` require a `Bearer` JWT.

**Auth**
```graphql
mutation { signUp(input: { email: "amaka@express.com", password: "••••••••", displayName: "Amaka", isCarrier: false }) { accessToken } }
mutation { signIn(input: { email: "amaka@express.com", password: "••••••••" }) { accessToken } }
```

**Shipments**
```graphql
query   { openShipments { id originLabel destinationLabel category totalAmount pickupReleaseBps } }
query   { myShipmentsAsSender { id status releasedAmount } }
query   { myShipmentsAsCarrier { id status } }
query   { shipment(id: "shp_1") { id status receiverName originLabel destinationLabel } }
mutation{ createShipment(input: { receiverName: "Chidi", receiverAddress: "G...", originLabel: "Lagos", destinationLabel: "Abuja", category: FOOD, assetCode: USDC, totalAmount: 5000, pickupReleaseBps: 4000, deliveryDeadlineAt: "2026-09-01T00:00:00Z" }) { id } }
mutation{ recordOnChainShipment(input: { shipmentId: "shp_1", contractShipmentId: "1", contractAddress: "C..." }) { id } }
mutation{ acceptShipment(shipmentId: "shp_1") { status } }
mutation{ confirmPickup(shipmentId: "shp_1") { status releasedAmount } }
mutation{ confirmDelivery(shipmentId: "shp_1") { status releasedAmount } }
mutation{ cancelShipment(shipmentId: "shp_1") { status } }
```

**Tracking**
```graphql
query   { trackingUpdates(shipmentId: "shp_1") { status location note createdAt } }
mutation{ addTrackingUpdate(input: { shipmentId: "shp_1", status: "Out for delivery", location: "Wuse, Abuja" }) { id } }
```

**Disputes**
```graphql
query   { disputesForShipment(shipmentId: "shp_1") { id status reason } }
mutation{ raiseDispute(input: { shipmentId: "shp_1", reason: "Package arrived damaged" }) { id status } }
mutation{ resolveDispute(input: { disputeId: "dsp_1", resolutionNote: "70/30 split per photos submitted", senderBps: 7000 }) { status } }
```

**Reviews**
```graphql
query   { myReviews { rating comment } }
query   { carrierProfile(userId: "usr_1") { averageRating completedDeliveries } }
mutation{ createReview(input: { shipmentId: "shp_1", rating: 5, comment: "Fast and careful with the food order" }) { id } }
```

## REST: the Stellar signing flow

```http
POST /stellar/build
Content-Type: application/json

{
  "sourcePublicKey": "GABC...",
  "method": "confirm_pickup",
  "args": ["1"]
}
→ { "xdr": "AAAAAg..." }
```

```http
POST /stellar/submit
Content-Type: application/json

{ "signedXdr": "AAAAAg..." }
→ { "hash": "abcd1234...", "status": "SUCCESS" }
```

`method` must be one of `create_shipment`, `accept_shipment`,
`confirm_pickup`, `confirm_delivery`, `cancel_shipment`,
`reclaim_expired`, `raise_dispute`, `resolve_dispute` — see
`src/stellar/dto/build-invocation.dto.ts`. Argument encoding (including
the `ShipmentCategory` enum, which Soroban represents as a one-element
vector containing the variant name) lives in `src/stellar/stellar.service.ts`.

## Data model

See `prisma/schema.prisma` for the full model. Money fields are
`Decimal(20, 7)` to match Stellar's 7 decimal places of precision.

```
User ──< Shipment (as sender) >── CarrierProfile
     ──< Shipment (as carrier)
              │
              ├─< TrackingUpdate
              ├─< Dispute
              └─< Review >── CarrierProfile (rolling average rating)
```

`Shipment.contractShipmentId` / `contractAddress` link an off-chain row
to its on-chain counterpart once `recordOnChainShipment` confirms the
creation transaction; both are nullable because a shipment can exist
off-chain briefly before its on-chain creation confirms.

## Testing

27 Jest unit tests across four spec files, all with `PrismaService`
mocked (no database needed):

- `auth.service.spec.ts` — sign-up conflict handling, password hashing,
  carrier-profile creation on carrier sign-up, sign-in success/failure
- `shipments.service.spec.ts` — accept/pickup/delivery/cancel status
  transitions and their guards, the pickup-share payout math, ownership
  checks
- `disputes.service.spec.ts` — party-only dispute raising, status-gated
  raising, arbiter-address-matched resolution, double-resolution
  rejection
- `reviews.service.spec.ts` — delivered-only reviewing, sender↔carrier
  review direction, the carrier rolling-average-rating calculation

```bash
npm test
npm run test:cov
```

## Deployment

```bash
docker build -t stellarexpress-backend .
docker run -p 4000:4000 --env-file .env stellarexpress-backend
```

Two-stage `Dockerfile`: `npm ci` + `prisma generate` + `npm run build`
in the build stage, then a slim runtime image with only production
dependencies. Run `npx prisma migrate deploy` against your production
`DATABASE_URL` before starting the container for the first time.

## Troubleshooting

- **`PrismaClientInitializationError: Can't reach database server`** —
  Postgres isn't running; `docker compose up -d`.
- **`/stellar/build` fails with a simulation error** — usually
  `ESCROW_CONTRACT_ID` isn't a real deployed contract yet, or
  `STELLAR_READ_SOURCE_ACCOUNT` isn't funded on the target network.
- **`resolveDispute` always throws `ForbiddenException`** —
  `ARBITER_STELLAR_ADDRESS` must exactly match the `stellarPublicKey`
  linked to the resolving user's account.

## Contributing

Issues and PRs are welcome. Before opening a PR: `npm run lint`,
`npm test`, and `npm run build` should all pass. See
[`StellarExpress/contracts`](https://github.com/StellarExpress/contracts)
for the on-chain rules this API defers to, and
[`StellarExpress/frontend`](https://github.com/StellarExpress/frontend)
for the client that consumes this API.
