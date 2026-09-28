# PRUMO SYSTEM — auditoria técnica da versão 29

Esta branch contém uma cópia de revisão da versão 29 atualmente publicada do PRUMO SYSTEM. O objetivo é exclusivamente avaliar o sistema e produzir um relatório técnico. Não publique, não execute migrações contra dados reais, não altere a infraestrutura de produção e não faça commits ou correções automáticas durante esta primeira análise.

## Contexto do sistema

O PRUMO SYSTEM controla a produção de refeições transportadas, incluindo pesagens, recipientes, destinos/obras, temperaturas, marmitas normais e especiais, rendimento, custos, fichas técnicas, equipamentos, PDFs e horas trabalhadas.

As atualizações mais recentes incluem:

- navegação lateral com Início, Ajustes e Fichas Técnicas;
- cadastro central de utensílios e equipamentos reutilizado pelas fichas técnicas;
- fichas técnicas com foto do preparo, dados de rendimento, porção, custos, nutrientes, ingredientes, equipamentos e modo de preparo;
- rota protegida para upload e leitura das fotos técnicas;
- geração de documento/PDF de ficha técnica no padrão visual GSI;
- revisão do catálogo de cardápios e das integrações de dados relacionadas.

## Escopo da auditoria

1. Segurança: autenticação, autorização e isolamento por proprietário, validação de entrada, concorrência, exposição de dados, uploads de imagens, armazenamento R2 e geração de arquivos.
2. Integridade: cálculos de peso líquido, rendimento, quantidade produzida, CMV, custos, nutrientes, dietas especiais, horas e intervalos; preservação do histórico e rastreabilidade.
3. Regras operacionais: separação correta entre GNs/recipientes da produção normal e marmitas normais ou especiais, evitando dupla contagem nos totais.
4. Banco e API: esquema D1/SQLite, migrações, consultas, limites, conflitos de versão, idempotência, desempenho e compatibilidade com registros antigos.
5. Fichas técnicas: estrutura dos dados, equipamentos vinculados, upload/recuperação de fotos, cálculos, legibilidade e consistência entre formulário, persistência e documento gerado.
6. Arquitetura: separação de responsabilidades, componentes excessivamente grandes, tipagem, tratamento de erros, estado do cliente e facilidade de manutenção.
7. Interface: responsividade, acessibilidade, fluxos de coleta em celular, estados vazios, formulários, feedback ao usuário e prevenção de erros operacionais.
8. Relatórios: consistência entre tela, JSON e PDF; totais parciais; separação de dietas especiais; identidade visual GSI; paginação, cortes, sobreposições e legibilidade.
9. Testes: lacunas críticas e proposta de uma suíte mínima de testes unitários, integração e ponta a ponta, priorizada pelo risco.

## Formato obrigatório do relatório

- Resumo executivo com os cinco maiores riscos.
- Achados classificados em crítico, alto, médio e baixo.
- Para cada achado: arquivo e linha/trecho como evidência, impacto, cenário reproduzível e correção recomendada.
- Separação entre defeitos confirmados, riscos prováveis e sugestões de melhoria.
- Melhorias rápidas separadas de mudanças estruturais.
- Plano de execução em fases, preservando dados existentes e compatibilidade móvel.
- Lista final de testes de aceitação para validar as correções futuramente.

## Restrições

- Nesta etapa, gere somente o relatório; não edite arquivos, não faça commits, não abra PR e não implante nada.
- Não inclua credenciais, tokens, dados pessoais ou conteúdo real de usuários no relatório.
- Não proponha apagar ou recriar o banco como solução padrão.
- Preserve compatibilidade com registros antigos e com o uso em celular.
- Considere que dietas especiais não devem contaminar os totais de rendimento das GNs normais.
- Considere que equipamentos cadastrados em Ajustes devem permanecer disponíveis às fichas técnicas sem duplicação inconsistente.
