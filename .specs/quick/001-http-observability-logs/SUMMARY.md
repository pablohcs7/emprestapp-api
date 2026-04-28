# Summary

Foi adicionada observabilidade HTTP centralizada na API via middleware global e integração com o filtro global de exceções.

## Outcome

- Cada request recebe ou reutiliza um `x-request-id`
- Cada resposta gera um access log estruturado
- Exceções 4xx/5xx geram error logs estruturados com o mesmo `requestId`
- Dados operacionais essenciais ficam disponíveis sem logar body ou tokens

## Verification

- `npm run build`
