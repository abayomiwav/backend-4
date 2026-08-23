# Architecture

For the full picture (stack, environment variables, GraphQL reference,
deployment) see the root [README](../README.md). This page is a
shorter reference for the module layout and the request paths through
it.

## Module layout

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

Each feature module (`auth`, `shipments`, `tracking`, `disputes`,
`reviews`) follows the same shape:

- `*.service.ts` — Prisma queries and authorization checks
- `*.resolver.ts` — the GraphQL surface (queries/mutations) for that module
- `dto/` — GraphQL input types, validated with `class-validator`
- `models/` — GraphQL output types (`@ObjectType()`)

`stellar/` is the exception: it's exposed over REST
(`stellar.controller.ts`), not GraphQL, because it moves a raw XDR
string rather than structured data — see the README's
"Why REST *and* GraphQL?" note.

## Two data paths, one source of truth

Every module that touches money keeps a fast, queryable **off-chain
mirror** of shipment state in Postgres (via Prisma) — that's what
`shipments`, `tracking`, `disputes`, and `reviews` read and write.
Final authority over fund releases always sits with the on-chain
`escrow` Soroban contract, not with this database.

`StellarService` is the only module that talks to Soroban RPC. Every
on-chain write follows the same two-step shape:

1. `POST /stellar/build` simulates the call and returns an unsigned
   XDR envelope.
2. The caller's wallet (Freighter, a hardware wallet, or a passkey
   signer) signs it client-side.
3. `POST /stellar/submit` relays the signed envelope to the network.

No module other than `StellarService` builds or submits a Soroban
call — that keeps the "this backend never holds a key" invariant in
one place. `Shipment.contractShipmentId` / `contractAddress` link an
off-chain row to its on-chain counterpart once
`recordOnChainShipment` confirms the creation transaction ran; both
columns are nullable because a shipment can exist off-chain briefly
before its on-chain creation is confirmed.

## Auth

`JwtAuthGuard` (backed by `passport-jwt`) protects every resolver
except `signUp` and `signIn`. Passwords are hashed with `bcryptjs`;
`resolveDispute` additionally checks the caller's linked
`stellarPublicKey` against `ARBITER_STELLAR_ADDRESS` before allowing a
resolution.
