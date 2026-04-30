# EmprestApp API Launch Guide

## Scope

Production publication guide for the NestJS API in `emprestapp-api`.

## Production readiness summary

Current strengths already present in the project:

- Dockerfile with non-root runtime user
- container hardening in `docker-compose.yml` (`read_only`, `tmpfs`, `no-new-privileges`, `cap_drop: ALL`)
- health endpoint
- CORS allowlist support with stricter production validation
- explicit security headers middleware
- auth route rate limiting
- environment validation for JWT strength, CORS, and MongoDB production settings

Verified on 2026-04-30:

- `npm run test -- --runInBand` passed: 27/27 suites, 151/151 tests
- `npm run test:e2e -- --runInBand` passed: 6/6 suites, 35/35 tests
- `npm run build` passed

## Mandatory security conditions before go-live

Do not publish until all items below are verified:

- [ ] Replace every placeholder secret from `.env.example`
- [ ] Remove any real secrets from local `.env` files before sharing/building images
- [ ] Set `NODE_ENV=production`
- [ ] Set `TRUST_PROXY=true` only when a known reverse proxy/load balancer is in front of the API
- [ ] Set `CORS_ALLOWED_ORIGINS` to the exact public frontend origin(s), never `*`
- [ ] Keep MongoDB private; do not expose port `27017` publicly
- [ ] Use a dedicated production MongoDB database and credentials
- [ ] Enable backups and test restore
- [ ] Enable centralized logging and 4xx/5xx alerting
- [ ] Run tests and build successfully

## Required production environment variables

Minimum required values:

- `NODE_ENV=production`
- `PORT`
- `API_HOST_PORT` if the platform needs host port mapping
- `API_BIND_ADDRESS=0.0.0.0` only when the runtime must accept external traffic inside a container/VM
- `MONGODB_URI`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`
- `BCRYPT_SALT_ROUNDS`

Bootstrap-only variables, if you manage MongoDB yourself:

- `MONGODB_ROOT_USERNAME`
- `MONGODB_ROOT_PASSWORD`
- `MONGODB_APP_USERNAME`
- `MONGODB_APP_PASSWORD`

## Secret generation guidance

Use long random values for:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- MongoDB passwords

Rules:

- minimum 32 characters in production; use at least 32 random bytes encoded safely when generating new secrets
- unique secret per environment
- rotate immediately if ever exposed

The current environment validation rejects production JWT secrets shorter than 32 characters and rejects placeholder-like values.

## Recommended production architecture

Platform-agnostic target layout:

1. Reverse proxy / load balancer with TLS
2. API service/container in a private network
3. MongoDB in a private subnet or managed database
4. Secret manager for environment injection
5. Centralized logs + metrics + alerts

## Publish steps

### Option A: container-based platform

1. Build the image:
   - `npm ci`
   - `npm run test -- --runInBand`
   - `npm run test:e2e -- --runInBand`
   - `npm run build`
   - `docker build -t emprestapp-api:<version> .`
2. Push the image to a private registry.
3. Create runtime secrets in the platform.
4. Deploy with:
   - one or more replicas
   - health check on `/health`
   - private database connectivity
   - restart policy enabled
5. Validate smoke tests.

### Option B: VM / bare server

1. Install Node.js LTS and a process manager.
2. Copy only built artifacts and production dependencies.
3. Inject environment variables from a secret store or protected service file.
4. Put Nginx/Caddy/Apache or a cloud load balancer in front.
5. Terminate TLS at the proxy and forward only to the internal app port.

## MongoDB publication rules

- Prefer managed MongoDB with private networking.
- If self-hosted, bind MongoDB to private interfaces only.
- Create separate admin and app users.
- Never use root credentials from the application.
- Enable authentication and backups.
- Restrict inbound traffic to the API network only.

## Reverse proxy rules

- Enforce HTTPS
- forward `X-Forwarded-Proto` correctly
- set `TRUST_PROXY=true` only when this forwarding path is trusted
- apply request size/body limits if relevant
- enable access logs without leaking auth headers
- remember that HSTS is only added in production when the app sees trusted HTTPS forwarding

## Pre-launch verification

Run before approval:

- `npm run test -- --runInBand`
- `npm run test:e2e -- --runInBand`
- `npm run build`

Functional smoke tests:

- `GET /health`
- register/login/refresh
- protected route access with valid token
- invalid token rejection
- database connectivity after restart

Current built-in HTTP protections to preserve in production:

- CORS credentials mode enabled with explicit origin allowlist
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-DNS-Prefetch-Control`
- narrow API CSP for non-HTML responses
- auth rate limits:
  - `POST /auth/login`: 10 attempts per 15 minutes per client IP
  - `POST /auth/register`: 5 attempts per 60 minutes per client IP
  - `POST /auth/refresh`: 30 attempts per 5 minutes per client IP

## Post-launch checks

- confirm health endpoint from the platform
- inspect logs for CORS, auth, and database failures
- verify no MongoDB port is public
- verify rate limiting on auth endpoints works
- verify only approved frontend origins can call the API
- verify monitoring is externalized; the app emits logs and health signals, but alert routing is still an infrastructure responsibility

## Rollback plan

- keep previous image/artifact available
- rollback the service to the last known good version
- if a schema/data migration was introduced, confirm backward compatibility before rollout

## Launch blockers

Do not mark this API production-ready if any of these remain unresolved:

- secrets still stored in repo/local shared files
- MongoDB publicly reachable
- wildcard or overly broad CORS policy
- no backups/restore test
- no logs/alerts for auth and health failures
- production `MONGODB_URI` still targets localhost or omits `authSource` when credentials are present
