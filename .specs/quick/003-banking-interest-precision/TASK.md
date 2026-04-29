# Quick Task 003: Banking-Style Interest Precision

## Goal

Correct the loan interest engine so that the contractual schedule matches the monthly rate semantics shown in the product and better approximates common bank financing behavior.

## Scope

- Align `interestRate` semantics to monthly rate usage
- Replace day-based compound accrual with monthly fixed-installment financing behavior
- Keep simple interest on the original principal, but over contractual monthly periods
- Preserve integer-cent persistence and explicit last-installment residual adjustment
- Revalidate unit and e2e flows affected by schedule amounts and authorization hardening side effects

## Verification

- `npm run test -- --runInBand`
- `npm run test:e2e -- --runInBand`
- `npm run build`

## References

- Banco Central do Brasil: metodologia de financiamento com prestações fixas e juros compostos com capitalização mensal
- CAIXA: explicação pública sobre Tabela Price e SAC como sistemas amplamente utilizados

## Residual Notes

- The product still models only total installment amounts, not the full amortization breakdown of principal vs. interest in each installment
- If SAC or another amortization regime becomes a product requirement later, it should be introduced as an explicit schedule type rather than overloading `interestType`
