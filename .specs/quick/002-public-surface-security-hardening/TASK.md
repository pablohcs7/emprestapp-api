# Quick Task 002: Public Surface Security Hardening

## Goal

Reduce the most immediate security risks before public exposure of the API.

## Scope

- Invalidate refresh sessions when an account is deleted
- Reject access tokens for deleted or inactive users
- Stop leaking cross-user resource existence through `403` vs `404`
- Validate Mongo `ObjectId` inputs at the DTO boundary
- Add baseline defensive HTTP headers and auth route rate limiting
- Reduce PII and oversized payload leakage in structured logs
- Tighten environment validation for weak JWT secret values
- Remove Mongo host port exposure from the default local Docker Compose path

## Verification

- `npm run test -- --runInBand`
- `npm run build`

## Residual Risk

- The API still uses bearer tokens returned in JSON bodies because the web app has not yet moved to `httpOnly` cookie auth
- The built-in auth rate limiting is in-memory and should be replaced by a shared store if the API is deployed across multiple instances
- Any secrets already used locally must still be rotated outside the repository after this hardening pass
