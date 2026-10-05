# Segurança do PRUMO SYSTEM

Não publique vulnerabilidades, credenciais ou dados operacionais em issues.

## Relato responsável

Relate o problema diretamente ao proprietário do repositório, informando:

- área afetada;
- passos mínimos para reproduzir;
- impacto observado;
- sugestão de correção, quando houver.

Não inclua dados pessoais, fichas reais, comprovantes, tokens, arquivos de ambiente ou cópias do banco.

## Regras de correção

- Toda alteração passa por branch, pull request e validação automatizada.
- Migrações de produção são aditivas e imutáveis depois de aplicadas.
- Mudanças de banco exigem backup restaurável antes do deploy.
- Credenciais ficam apenas nos ambientes protegidos do GitHub ou do Sites.
- Nenhuma correção pode apagar ou reescrever dados históricos sem autorização expressa.
