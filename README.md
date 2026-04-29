# EmprestApp API

Backend MVP em NestJS para gestao de contatos, emprestimos, pagamentos, dashboard e fluxos basicos de compliance.

## Ambiente

Nao armazene segredos reais no repositorio ou em arquivos compartilhados.
Use `.env.example` apenas como referencia estrutural e injete segredos reais fora do versionamento.

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
Antes de expor a API publicamente, gere e injete segredos fortes e exclusivos para:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

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

O compose sobe MongoDB e API com configuracao pronta para validacao local do MVP.
Por seguranca, a porta do Mongo nao e publicada para o host por padrao.

```bash
docker compose up --build
```

Endpoints uteis:

- API: `http://localhost:${API_HOST_PORT}`
- Health: `http://localhost:${API_HOST_PORT}/health`
- MongoDB: acessivel apenas na rede interna do compose

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
