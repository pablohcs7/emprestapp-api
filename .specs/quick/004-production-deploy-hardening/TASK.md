# Quick Task 004: Production Deploy Hardening

## Objective

Endurecer a configuracao de deploy do `emprestapp-api` para reduzir riscos evidentes antes de expor a API online.

## Scope

- exigir autenticacao no Mongo do `docker-compose`
- separar usuario root e usuario de aplicacao no banco
- bindar a API local do compose em `127.0.0.1` por padrao
- endurecer runtime do container da API
- tornar CORS e proxy confiavel configuraveis por ambiente
- melhorar `/health` para refletir disponibilidade real do banco fora de testes

## Files

- `.env.example`
- `docker-compose.yml`
- `docker/mongo/init/01-create-app-user.sh`
- `Dockerfile`
- `src/main.ts`
- `src/config/*`
- `src/common/http/security.middleware.ts`
- `src/health.controller.ts`
- `README.md`

## Verification

- `npm run test -- --runInBand`
- `npm run test:e2e -- --runInBand`
- `npm run build`

## Residual Risks

- o rate limit continua in-memory e por instancia; para multi-replica, o ideal futuro e um store distribuido
- o arquivo `.env` local continua contendo segredos no workspace e exige rotacao/manual cleanup fora do codigo versionado
