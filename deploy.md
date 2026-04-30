# EmprestApp API VPS Deploy Guide

## Scope

Operational guide to deploy `emprestapp-api` on a Linux VPS.

## Recommended topology

Prefer this layout:

1. Nginx on the public VPS
2. API container bound only to localhost or a private Docker network
3. MongoDB on a managed service or separate private host

If MongoDB must run on the same VPS for a temporary setup:

- do not publish port `27017`
- keep MongoDB reachable only from Docker internal networking

## 1. Server prerequisites

On the VPS, install:

- Docker
- Docker Compose plugin
- Nginx
- Certbot
- Git

Create working directories:

- `/srv/emprestapp-api/app`
- `/srv/emprestapp-api/env`
- `/srv/emprestapp-api/logs`

## 2. Application files to place on the VPS

You can deploy in two ways.

### Option A: deploy from source on the VPS

Copy or clone:

- `package.json`
- `package-lock.json`
- `src/`
- `Dockerfile`
- `docker-compose.yml`
- `tsconfig*.json`
- `nest-cli.json`
- `docker/`

### Option B: deploy by image

1. Build the image in CI or locally.
2. Push to a private registry.
3. Pull the tagged image on the VPS.

Option B is preferred for repeatability.

## 3. Environment file

Create `/srv/emprestapp-api/env/.env` with production values for:

- `NODE_ENV=production`
- `PORT=3000`
- `API_HOST_PORT=3000`
- `API_BIND_ADDRESS=127.0.0.1`
- `MONGODB_URI`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY=true`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`
- `BCRYPT_SALT_ROUNDS`

If MongoDB runs through the provided compose setup, also define:

- `MONGODB_ROOT_USERNAME`
- `MONGODB_ROOT_PASSWORD`
- `MONGODB_APP_USERNAME`
- `MONGODB_APP_PASSWORD`

Rules:

- never reuse local example secrets
- keep JWT secrets long and unique
- keep `CORS_ALLOWED_ORIGINS` exact

## 4. Deploy with Docker Compose

Inside `/srv/emprestapp-api/app`:

```bash
docker compose --env-file /srv/emprestapp-api/env/.env up -d --build
```

Useful commands:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f mongodb
docker compose pull
docker compose down
```

## 5. Nginx example

Typical API virtual host:

```nginx
server {
    server_name api.example.com;

    listen 80;
    return 301 https://$host$request_uri;
}

server {
    server_name api.example.com;

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## 6. Verification after deploy

Run:

```bash
curl https://api.example.com/health
```

Also verify:

- register/login/refresh flow
- protected routes with a valid token
- invalid token rejection
- database connectivity after container restart

## 7. Rollback

If deploying by image:

1. switch the compose file or tag back to the previous image
2. run `docker compose up -d`

If deploying by source:

1. checkout the previous release tag or commit
2. run `docker compose up -d --build`

Always verify `/health` and auth after rollback.

## 8. VPS-specific cautions

- do not expose MongoDB publicly
- do not keep `.env` in the repo clone
- monitor disk growth from logs and volumes
- keep TLS renewal automated
