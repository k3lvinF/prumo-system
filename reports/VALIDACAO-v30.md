# PRUMO SYSTEM — validação antes da publicação

Data: 30/09/2026 (UTC)
Branch: `fix/v30-correcoes`

## Proteção dos dados

- Backup lógico completo do D1 e dos objetos R2 concluído antes das correções.
- Restauração validada em SQLite e no emulador local do D1, com `integrity_check=ok`, nenhuma violação de chave estrangeira e hashes conferidos.
- A função temporária de exportação foi desativada no ambiente e removida desta versão do código.
- Nenhuma migração ou correção de dados desta versão foi aplicada ao banco publicado.

## Correções preparadas

- Migração aditiva 0009 gerada pelo Drizzle e registrada no journal; não contém `DROP`, exclusão ou reescrita de JSON histórico.
- Escrita de produção, auditoria e entradas normalizadas em uma única transação D1.
- Motivo obrigatório para correções de pesagem, cancelamentos, reaberturas e remoção de finalização.
- Produções encerradas precisam ser reabertas em operação separada antes de qualquer alteração.
- Resumo paginado do histórico usa colunas próprias e limita o backfill oportunista a 20 registros.
- Entradas normalizadas usam chave composta por produção e registro, com atualização em edições.
- Fichas técnicas e equipamentos usam tabelas separadas, versão otimista, arquivamento reversível e validação de duplicidade no servidor.
- Cada gravação de ficha cria uma revisão imutável na mesma transação.
- A foto da ficha exige uma ficha ativa pertencente à conta autenticada.
- PDF técnico inclui revisão/data reais, equipamentos, ingredientes com conversão de unidade, custos, modo de preparo e nutrientes. Um documento extremo de sete páginas foi renderizado e inspecionado sem cortes ou sobreposição.
- Identidades de e-mail e ID estável da conta apontam para o mesmo proprietário, preservando o histórico quando o e-mail muda.
- Pacotes mensais de comprovantes verificam objetos com concorrência 10, aceitam até 60.000 arquivos, respeitam 3,9 GB por mês e 2 GB por ZIP e oferecem divisão semanal.
- Confirmações nativas do navegador foram substituídas por diálogos do sistema.
- A função administrativa temporária de backup não faz parte da versão final.

## Migração dos dados antigos

Os scripts continuam em `dry-run` por padrão:

- C1: auditoria de proprietário; nenhum candidato no backup real.
- M5: correção de data; nenhum candidato no backup real.
- A1: uma produção candidata ao preenchimento das colunas de resumo. O teste local aplicou a correção sem alterar o JSON de 547.369 caracteres; a segunda execução encontrou zero candidatos.
- A2: nenhuma ficha/equipamento candidato no backup real. O script preserva o catálogo JSON e é idempotente.

A cópia restaurada recebeu localmente as migrações 0008 e 0009, os scripts A1/A2 e nova verificação de integridade. Resultado: `integrity_check=ok` e zero violações de chave estrangeira.

## Verificações do código

- `pnpm guard:migrations`: aprovado.
- `pnpm test`: aprovado, incluindo auditoria transacional, identidade estável, catálogos estruturados, restauração de backup, isolamento entre contas, dietas especiais e PDF técnico extenso.
- `pnpm exec tsc --noEmit`: aprovado.
- `pnpm lint`: aprovado sem erros.
- `pnpm build`: aprovado. Restam apenas avisos informativos do Vite sobre configuração futura e tamanho de um chunk.

## Ordem segura para publicar

1. Criar um novo checkpoint imediatamente antes da mudança remota.
2. Aplicar as migrações 0008 e 0009.
3. Executar C1, M5, A1 e A2 em `dry-run` remoto e revisar as contagens.
4. Aplicar somente A1/A2 aprovados e repetir os dry-runs até zero candidatos.
5. Publicar a versão privada e fazer smoke tests autenticados de leitura e gravação.
6. Manter `productions.storage=1`: o JSON legado continua sendo a fonte de leitura durante o período de comparação. A troca para leitura estruturada só poderá ocorrer depois de 30 dias sem divergências.

## Gate

Autorização final do proprietário registrada em 30/09/2026.

## Conclusão em produção

- Checkpoint pré-migração concluído e restaurado com `integrity_check=ok` e zero violações de chave estrangeira. A tabela transitória `request_limits` foi deliberadamente restaurada vazia porque muda durante a própria exportação e não contém dados de negócio.
- Diagnóstico do checkpoint: C1=0, M5=0, A1=1 e A2=0, conforme o ensaio anterior.
- Migrações 0008 e 0009 aplicadas pelo fluxo de publicação do Sites.
- Versão 31 publicada de forma privada em `https://uan-controle-producao.kelvinribeiro69.chatgpt.site`.
- Banco publicado confirmado com as tabelas `accounts`, `account_identities`, `data_fix_log`, `production_audit`, `production_entries`, `technical_sheets`, `technical_sheet_revisions` e `equipment`.
- Credenciais e rotas temporárias de backup foram removidas; permanecem somente as variáveis privadas do módulo de horas.
- O preenchimento A1 é idempotente e será concluído automaticamente no primeiro acesso autenticado ao histórico; o JSON original permanece a fonte de leitura durante a janela de comparação de 30 dias.
- Pull request nº 1 aprovado e integrado à `main` no commit `b40595636e39ccc266f73ab192128bb32190b6d3`.
