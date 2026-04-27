# EmprestApp API

Backend MVP em NestJS para gestao de contatos, emprestimos, pagamentos, dashboard e fluxos basicos de compliance.

## Ambiente

Este repositorio inclui variaveis temporarias para validacao do MVP em `.env`.
Esses valores nao sao seguros para producao e devem ser trocados depois.

Variaveis esperadas:

- `NODE_ENV`
- `PORT`
- `API_HOST_PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`
- `BCRYPT_SALT_ROUNDS`

O arquivo de referencia e `.env.example`.

## Rodando localmente

Pre-requisitos:

- Node.js 22+
- npm 10+
- MongoDB disponivel em `mongodb://localhost:27017/emprestapp_dev`

Comandos:

```bash
npm ci
npm run start:dev
```

Smoke check:

```bash
curl http://localhost:3000/health
```

## Rodando com Docker Compose

O compose sobe MongoDB e API com configuracao pronta para validacao do MVP.

```bash
docker compose up --build
```

Endpoints uteis:

- API: `http://localhost:${API_HOST_PORT}`
- Health: `http://localhost:${API_HOST_PORT}/health`
- MongoDB: `mongodb://localhost:27017/emprestapp_dev`

Para derrubar os containers:

```bash
docker compose down
```

Para derrubar e limpar o volume local do Mongo:

```bash
docker compose down -v
```

## Verificacao

Gate completo de release:

```bash
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

## Escopo atual

O MVP ja inclui:

- autenticacao com registro, login e refresh token
- CRUD principal de contatos
- cadastro e leitura de emprestimos
- registro e cancelamento de pagamentos
- dashboard resumido e historico
- exportacao e exclusao de conta
