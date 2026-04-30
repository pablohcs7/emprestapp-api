# EmprestApp API

Backend MVP em NestJS para gestao de contatos, emprestimos, pagamentos, dashboard e fluxos basicos de compliance.

## Ambiente

Nao armazene segredos reais no repositorio ou em arquivos compartilhados.
Use `.env.example` apenas como referencia estrutural e injete segredos reais fora do versionamento.

Variaveis esperadas:

- `NODE_ENV`
- `PORT`
- `API_HOST_PORT`
- `API_BIND_ADDRESS`
- `MONGODB_DATABASE`
- `MONGODB_URI`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY`
- `MONGODB_ROOT_USERNAME`
- `MONGODB_ROOT_PASSWORD`
- `MONGODB_APP_USERNAME`
- `MONGODB_APP_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`
- `BCRYPT_SALT_ROUNDS`

O arquivo de referencia e `.env.example`.
Antes de expor a API publicamente, gere e injete segredos fortes e exclusivos para:

- `MONGODB_ROOT_PASSWORD`
- `MONGODB_APP_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Em producao:

- use `MONGODB_URI` com credenciais reais e `authSource` explicito
- use `MONGODB_DATABASE` para definir o banco de aplicacao sem hardcode no bootstrap do Mongo
- defina `CORS_ALLOWED_ORIGINS` com as origins publicas exatas do frontend
- habilite `TRUST_PROXY=true` apenas quando houver proxy reverso confiavel na frente da API

### Modelo de autenticacao MongoDB

- `MONGODB_DATABASE` define o banco da aplicacao, por exemplo `emprestapp_dev` em desenvolvimento e `emprestapp` em producao
- `MONGODB_URI` deve usar `authSource=admin` quando houver credenciais, por exemplo `mongodb://emprestapp_app:...@mongodb:27017/emprestapp?authSource=admin`
- o bootstrap do Mongo cria o usuario de aplicacao no banco `admin`
- esse usuario recebe apenas `readWrite` no banco definido em `MONGODB_DATABASE`
- nao publique a porta `27017` do MongoDB em producao; mantenha o banco acessivel apenas por rede privada ou pela rede interna do Docker

## Rodando localmente

Pre-requisitos:

- Node.js 22+
- npm 10+
- MongoDB disponivel com autenticacao habilitada

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
O banco sobe com autenticacao obrigatoria: um usuario root apenas para bootstrap/admin e um usuario de aplicacao criado no banco `admin`, com `readWrite` apenas no banco definido em `MONGODB_DATABASE`.
Por padrao, a API tambem fica bindada em `127.0.0.1`, evitando exposicao involuntaria em todas as interfaces do host.

Localmente, o compose usa `.env` por padrao. Em VPS, defina `APP_ENV_FILE=/srv/emprestapp-api/env/.env` para carregar segredos fora do repositorio.

```bash
docker compose up --build
```

Endpoints uteis:

- API: `http://localhost:${API_HOST_PORT}`
- Health: `http://localhost:${API_HOST_PORT}/health`
- MongoDB: acessivel apenas na rede interna do compose

Importante:

- nao reutilize as credenciais de exemplo fora de ambiente local
- nao publique a porta do Mongo em producao
- revise explicitamente `API_BIND_ADDRESS` antes de expor a API por rede publica
- prefira um banco gerenciado ou uma rede privada entre API e banco

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
