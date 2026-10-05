# PRUMO SYSTEM — operação segura

## Estado de referência

- Repositório oficial: `k3lvinF/prumo-system`.
- Branch de produção: `main`.
- Hospedagem: ChatGPT Sites, com acesso privado.
- O commit publicado deve ser exatamente o commit aprovado em `main`.

## Validação obrigatória

Antes de integrar ou publicar:

```bash
pnpm install --frozen-lockfile
pnpm check
```

O build local usa os bindings lógicos `DB` e `BUCKET` quando
`.openai/hosting.json` não existe. Para operar um Site real, copie
`.openai/hosting.example.json` para `.openai/hosting.json` e informe o
`project_id` correto. O arquivo real permanece fora do GitHub.

## GitHub

- Trabalhar em branch.
- Abrir pull request para `main`.
- Exigir o check `validate`.
- Proibir push direto e force push na `main`.
- Não integrar uma branch com testes pendentes ou falhos.

## Backup

A rota `/api/admin-backup` permanece desativada por padrão. Ela somente
responde durante uma janela de até 24 horas quando `PRUMO_BACKUP_TOKEN` e
`PRUMO_BACKUP_UNTIL` são configurados no ambiente protegido do Sites.

O procedimento de backup deve:

1. abrir uma janela sem coletas;
2. criar segredo temporário e validade curta;
3. publicar a mesma versão aprovada com essas variáveis;
4. executar `scripts/collect-site-backup.mjs`;
5. validar restauração SQLite, chaves estrangeiras e hashes dos objetos;
6. guardar o pacote fora da aplicação;
7. remover imediatamente as duas variáveis e republicar a versão aprovada.

O endpoint é somente leitura e fica indisponível quando os segredos temporários
não existem. Nunca registrar o token em arquivo, argumento de processo, log ou
commit.

## Migração estrutural

- Manter `productions.storage=1` e o JSON legado como fonte de leitura durante
  a comparação.
- Não concluir a troca antes de 30/10/2026.
- Depois dessa data, verificar divergências, o preenchimento A1, integridade,
  isolamento por conta e restauração do backup.
- Qualquer corte exige nova versão, testes e registro no relatório de validação.
