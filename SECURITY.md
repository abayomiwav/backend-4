# Security Policy

## Reporting a vulnerability

This API is non-custodial: it never receives, stores, or has the
ability to reconstruct a user's Stellar secret key. All escrow funds
and payout logic are enforced by the [`escrow`](https://github.com/StellarExpress/contracts)
Soroban contract, not by this service — see the "Non-custodial Stellar
flow" section of the [README](./README.md).

If you find an authorization bypass (e.g. a way to act on another
user's shipment), a way to forge or replay a JWT, an injection vector,
or a way to get this API to submit a transaction the caller didn't
authorize, please report it privately through the
[StellarExpress GitHub organization](https://github.com/stellXpress)
rather than opening a public issue.

Please include steps to reproduce and the affected endpoint or
resolver. We'll acknowledge reports as quickly as we can and keep you
updated as a fix is developed.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | :white_check_mark: |
