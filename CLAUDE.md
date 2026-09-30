# PRUMO SYSTEM — roteiro de correção aprovado

Esta branch implementa as correções em fases. A autorização atual cobre apenas a Fase 1 em branch e PR. Não faça merge em `main`, migrações remotas, scripts `--apply` ou deploy sem nova confirmação do proprietário.

## Regras invioláveis

1. Nenhum dado registrado pode sumir. São proibidos `DROP TABLE`, `DROP COLUMN`, exclusões de produções, horas ou comprovantes e reescritas destrutivas dos JSONs históricos.
2. Migrações são somente aditivas e devem ser geradas a partir de `db/schema.ts`, revisadas e testadas localmente.
3. Correções de dados usam scripts idempotentes em `scripts/data-fixes/`, com `--dry-run` como padrão, relatório sem dados pessoais e preservação do valor anterior em `data_fix_log`.
4. Campos novos são opcionais e devem manter a leitura de registros antigos.
5. O fluxo móvel de coleta não pode ganhar toques desnecessários nem trocar teclado numérico por alfanumérico.
6. Credenciais, tokens e dados pessoais não entram em código, commits, logs ou relatórios.
7. Dietas especiais nunca entram nos totais das GNs/recipientes normais.
8. Equipamentos cadastrados em Ajustes são a fonte compartilhada para fichas técnicas e recipientes da coleta, sem duplicação inconsistente.

## Fases

- Fase 1 / v30: segurança, isolamento de proprietário, cálculos rápidos, limites, catálogo resiliente, fotos e PDFs técnicos.
- Fase 2 / v31: trilha de auditoria detalhada, conflitos operacionais e regras de cálculo.
- Fase 3 / v32: armazenamento escalável e migração em modo duplo.
- Fase 4: identidade, interface e manutenção.

## Fluxo Git

- Base: `claude-review-v29`.
- Trabalho: `fix/v30-correcoes`.
- Um commit por achado ou grupo pequeno coeso.
- Nunca use `push --force`.
- Abra PR para `main`, mas não faça merge sem autorização.

## Verificação obrigatória

```bash
pnpm test
pnpm lint
pnpm build
```

Não declare uma fase concluída se algum comando falhar. Backups, relatórios reais e artefatos locais não devem ser commitados.
