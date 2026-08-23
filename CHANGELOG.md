# Changelog

All notable changes to the backend API are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

Nothing yet.

## [0.1.0]

### Added
- Auth module: sign-up/sign-in for senders and carriers, JWT sessions,
  Stellar address linking
- Shipments module: create, accept, confirm pickup/delivery (with
  pickup-share payout math), cancel, browse open shipments
- Tracking module: free-text status updates against a shipment
- Disputes module: raise a dispute, arbiter-only resolve with a
  sender/carrier basis-point split
- Reviews module: post-delivery ratings that roll up into a carrier's
  average rating
- Stellar module: non-custodial `POST /stellar/build` /
  `POST /stellar/submit` REST endpoints that build and relay unsigned
  XDR for the `escrow` Soroban contract
- GraphQL API (code-first schema, Apollo Server via `@nestjs/apollo`)
  over a Prisma/PostgreSQL data layer
- CI workflow running lint, the Jest unit suite, and a build against a
  real Postgres service
