# Quick Task 005: MongoDB Admin Auth Bootstrap

## Objective

Alinhar o bootstrap do MongoDB para que o usuario da aplicacao autentique via `admin`, mantendo apenas `readWrite` no banco definido por ambiente.

## Scope

- remover hardcode de `emprestapp_dev` do init do Mongo
- parametrizar `MONGODB_DATABASE` e `MONGODB_URI` nos exemplos de ambiente
- ajustar o `docker-compose.yml` para usar o banco dinamico e um arquivo de ambiente compativel com local e VPS
- atualizar a documentacao operacional do repositório
- validar bootstrap limpo, autenticacao Mongo e `/health`

## Files

- `docker/mongo/init/01-create-app-user.sh`
- `docker-compose.yml`
- `.env.example`
- `.env.production.example`
- `README.md`
- `deploy-api.md`

## Verification

- `docker compose down -v`
- `docker compose up -d --build`
- `docker exec emprestapp-mongodb mongosh "mongodb://emprestapp_app:...@localhost:27017/<db>?authSource=admin"`
- `Invoke-WebRequest http://127.0.0.1:<port>/health`

## Residual Risks

- o ambiente local ainda depende de valores consistentes em `.env` ou de overrides no shell para os segredos do compose
- o usuario de aplicacao continua autenticando por senha; a migracao para segredos gerenciados e rotacao automatica permanece fora deste escopo
