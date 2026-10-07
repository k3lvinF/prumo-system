# PRUMO SYSTEM — plataforma independente

## Objetivo

Publicar o PRUMO SYSTEM em uma conta controlada pelo proprietário, com endereço próprio, cadastro individual, confirmação de e-mail, aprovação de função e permissões verificadas no servidor. O sistema atual permanece disponível até a migração final dos dados.

## Arquitetura

```text
Navegador / celular
        |
Domínio próprio ou endereço workers.dev
        |
Cloudflare Worker (aplicação e APIs)
        |-- Better Auth (contas, sessões e senhas)
        |-- D1 (dados operacionais, horas e usuários)
        |-- R2 (fotos e arquivos existentes)
        `-- Resend (confirmação de e-mail e recuperação de senha)
```

As senhas são tratadas pela biblioteca de autenticação e nunca ficam disponíveis para administradores. Toda rota operacional exige sessão válida e verifica a permissão da função no servidor.

## Fluxo de cadastro

1. A pessoa informa nome, e-mail, senha e função solicitada.
2. Confirma o endereço pelo link recebido por e-mail.
3. O cadastro permanece pendente, sem acesso aos dados.
4. O administrador aprova a função ou suspende a conta.
5. O usuário entra com acesso limitado à função aprovada.

Ninguém pode se cadastrar diretamente como administrador. A conta definida em `PRUMO_OWNER_EMAIL` é reconhecida como proprietária.

## Perfis iniciais

| Perfil | Acesso inicial |
| --- | --- |
| Administrador | Sistema completo, equipe e permissões |
| Supervisor | Operação completa e consulta da equipe |
| Nutricionista | Produção, cardápio, fichas e equipamentos |
| Operador | Produção e consulta dos cadastros técnicos |
| Consulta | Somente leitura da operação |
| Pendente | Sem acesso até aprovação |

O controle pessoal de horas continua separado por conta. Os dados operacionais da UAN permanecem no espaço compartilhado definido por `PRUMO_WORKSPACE_OWNER`.

## Configuração de produção

Variáveis públicas do Worker:

- `AUTH_MODE=independent`
- `BETTER_AUTH_URL=https://endereco-do-sistema`
- `AUTH_EMAIL_FROM=PRUMO SYSTEM <acesso@dominio>`
- `PRUMO_OWNER_EMAIL=email-do-proprietario`
- `PRUMO_WORKSPACE_OWNER=email-do-proprietario`
- `HOURS_CONTACT_OWNER=email-do-proprietario`

Segredos do Worker, cadastrados com o gerenciador seguro da Cloudflare:

- `BETTER_AUTH_SECRET`: valor aleatório forte, com pelo menos 32 bytes
- `RESEND_API_KEY`: chave para e-mails transacionais
- `HOURS_PERSONAL_EMAIL` e `HOURS_PERSONAL_WHATSAPP`: contatos pessoais usados pelo módulo de horas

Variáveis usadas apenas para preparar a publicação:

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_DATABASE_NAME`
- `CLOUDFLARE_R2_BUCKET_NAME`
- `CLOUDFLARE_WORKER_NAME`
- `PRUMO_DOMAIN` (opcional enquanto for usado o endereço `workers.dev`)

## Migração sem perda de dados

1. Criar D1 e R2 na conta Cloudflare do proprietário.
2. Exportar o banco atual e inventariar os objetos existentes.
3. Restaurar a cópia no novo D1 e copiar os objetos para o novo R2.
4. Executar as migrações, incluindo as tabelas de autenticação.
5. Publicar primeiro em um endereço de homologação.
6. Conferir totais, relatórios, horas, fotos e permissões com contas de teste.
7. Fazer uma exportação final, pausar gravações por poucos minutos e repetir a sincronização incremental.
8. Apontar o domínio para a nova versão e manter o backup anterior durante o período de validação.

O banco novo recebe tabelas adicionais; as tabelas operacionais existentes não são removidas nem renomeadas.

## Publicação

Depois do `pnpm build`, o comando `pnpm prepare:independent` cria `dist/server/wrangler.production.json` com os recursos da conta de destino. As migrações devem ser aplicadas ao D1 remoto antes de executar `pnpm deploy:independent`.

O domínio pode ser ligado depois da homologação. Assim, a validação inicial pode acontecer no endereço `workers.dev` sem comprar ou transferir um domínio antes dos testes.
