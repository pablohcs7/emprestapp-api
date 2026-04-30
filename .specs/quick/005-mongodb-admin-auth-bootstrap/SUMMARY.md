# Quick Task 005 Summary

## Delivered

- bootstrap do Mongo atualizado para criar o usuario da aplicacao em `admin`
- permissao do usuario da aplicacao limitada a `readWrite` no banco definido por `MONGODB_DATABASE`
- `docker-compose.yml` ajustado para usar `MONGODB_DATABASE`, `MONGODB_URI` e arquivo de ambiente parametrizavel por `APP_ENV_FILE`
- exemplos de ambiente atualizados para desenvolvimento e producao
- documentacao do modelo de autenticacao Mongo e do deploy em VPS atualizada

## Verification

- `docker compose down -v`
- `docker compose up -d --build`
- `docker compose ps` com `api` e `mongodb` saudaveis
- `docker exec emprestapp-mongodb mongosh "mongodb://emprestapp_app:local-app-password@localhost:27017/emprestapp_dev?authSource=admin"` retornando `ping ok` e role `readWrite` em `emprestapp_dev`
- `Invoke-WebRequest http://127.0.0.1:3005/health` retornando `{"success":true,"data":{"status":"ok"},"error":null}`
- `npm run build`

## Notes

- `deploy.md` continua removido no working tree e `deploy-api.md` continua como arquivo novo nao rastreado; esse estado ja existia antes desta tarefa e nao foi revertido
