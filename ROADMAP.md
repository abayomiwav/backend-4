# Roadmap

- [x] Auth (sender/carrier), JWT sessions, Stellar address linking
- [x] Shipments, tracking, disputes, and reviews (GraphQL)
- [x] Non-custodial Stellar integration (`/stellar/build` + `/stellar/submit`)
- [ ] Delivery-deadline reminder jobs — `ScheduleModule` is already
      wired up in `src/app.module.ts` but no `@Cron` jobs are
      registered yet
- [ ] Rate limiting on auth endpoints
- [ ] A `/health` endpoint for uptime checks and container orchestration
- [ ] Webhook or push notifications for shipment status changes
- [ ] e2e test suite against a real Postgres + Soroban RPC (CI
      currently runs the mocked unit suite only)
- [ ] On-chain event indexer to keep the off-chain shipment mirror in
      sync without relying solely on client-driven `recordOnChainShipment`
      calls
