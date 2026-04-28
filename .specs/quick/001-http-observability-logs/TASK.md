# Quick Task 001: HTTP observability logs

**Date:** 2026-04-27
**Status:** Done

## Description

Adicionar logs estruturados na API para todas as requisições HTTP, com campos comuns de observabilidade e correlação por request id.

## Files Changed

- `src/main.ts` - registra o middleware global de observabilidade HTTP
- `src/common/http/http-observability.ts` - define request id, access log estruturado e error log estruturado
- `src/common/errors/global-http-exception.filter.ts` - propaga metadados de erro para os logs HTTP

## Verification

- [x] `npm run build`
- [x] Toda resposta HTTP passa a carregar `x-request-id`
- [x] Logs incluem `method`, `path`, `statusCode`, `durationMs`, `ip`, `userAgent`, `userId` e `errorCode` quando aplicável

## Commit

`uncommitted` - pending
