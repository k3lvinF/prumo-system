# PRUMO SYSTEM — roteiro de avaliação técnica

Esta branch contém uma cópia de revisão da versão 28 do PRUMO SYSTEM. Não publique, não conecte a dados reais e não altere a infraestrutura de produção durante a avaliação.

## Objetivo

Faça uma revisão técnica completa e entregue recomendações priorizadas. O sistema controla produção de refeições transportadas, pesagens, recipientes, destinos/obras, temperaturas, marmitas normais e especiais, rendimento, custos, fichas técnicas, PDFs e horas trabalhadas.

## Escopo da análise

1. Segurança: autenticação, autorização por proprietário, validação de entrada, concorrência, exposição de dados, uploads e geração de arquivos.
2. Integridade: cálculos de peso líquido, rendimento, CMV, custos, dietas especiais, horas e intervalos; preservação do histórico e rastreabilidade.
3. Banco e API: esquema D1/SQLite, migrações, consultas, limites, conflitos de versão, idempotência e desempenho.
4. Arquitetura: separação de responsabilidades, componentes excessivamente grandes, tipagem, tratamento de erros e facilidade de manutenção.
5. Interface: responsividade, acessibilidade, fluxos de coleta em celular, estados vazios, formulários e prevenção de erros operacionais.
6. Relatórios: consistência entre tela, JSON e PDF; totais parciais; separação de dietas especiais; paginação e legibilidade.
7. Testes: lacunas críticas e proposta de uma suíte mínima com maior retorno.

## Formato esperado

- Resumo executivo.
- Achados classificados em crítico, alto, médio e baixo.
- Para cada achado: evidência com arquivo/trecho, impacto, cenário de falha e correção recomendada.
- Melhorias rápidas separadas de mudanças estruturais.
- Plano de execução em fases, preservando dados existentes.
- Não faça alterações automáticas: primeiro gere apenas o relatório para aprovação do proprietário.

## Restrições

- Não inclua credenciais, tokens ou dados pessoais no relatório.
- Não proponha apagar ou recriar o banco como solução padrão.
- Preserve compatibilidade com registros antigos e com uso em celular.
- Considere que dietas especiais não devem contaminar os totais de rendimento das GNs normais.
