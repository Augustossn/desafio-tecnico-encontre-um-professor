# Uso de IA

## Ferramentas e uso

Esta solução foi preparada com o agente Codex. A IA gerou a primeira implementação da API, a função de busca, os testes C#, a interface React/TypeScript e a documentação. Também executou compilação, testes e verificações HTTP. O Context7 MCP foi usado para consultar a documentação de ASP.NET Core e React, com atenção à versão .NET 8.

O código foi organizado para que a regra possa ser lida e testada sem servidor HTTP: enumeração de candidatos de meia em meia hora, verificação de todos os dias, contenção em um bloco e exclusão por interseção de intervalos.

## Erro identificado e corrigido

A primeira implementação da IA adicionou um middleware que capturava `BadHttpRequestException` e supôs que isso garantiria uma mensagem clara para JSON malformado. Ao enviar apenas `{` ao endpoint em execução, o teste HTTP retornou status 400 com corpo vazio: o binding da Minimal API encerrava a resposta sem lançar a exceção naquela configuração.

A correção foi configurar explicitamente `RouteHandlerOptions.ThrowOnBadRequest = true`, permitindo que o middleware retornasse a mensagem JSON definida. A verificação HTTP foi repetida após a mudança. Isso demonstrou que compilar e passar testes de negócio não prova o comportamento da camada HTTP.

## Revisão pelo candidato

Na melhoria dos resultados vazios, a IA implementou explicações baseadas nos motivos reais de exclusão e botões que reexecutam a busca com critérios explícitos. Foram adicionados 9 testes de interface e 16 testes HTTP em memória, além de um workflow do GitHub Actions. Os 35 testes C# e 16 testes de interface passaram localmente. O workflow ainda depende de publicação para ter sua primeira execução no GitHub.

Outro erro percebido pelo usuário foi a documentação Swagger não abrir na porta 5080, apesar de a IA ter informado que estava pronta. O código havia sido atualizado, mas o processo em execução continuava com a versão anterior. O usuário identificou o 404; a IA confirmou o processo antigo, recompilou, reiniciou a API e executou uma busca pelo Swagger na porta correta. A falha foi afirmar disponibilidade no ambiente sem verificar a instância efetivamente usada.

A IA pesquisou o Wheel Picker do Kokonut UI e implementou uma versão própria para o contexto do desafio, usando Radix Popover, React e CSS scroll-snap. Foram adicionados 7 testes de navegador com Playwright e executados no Edge. A implementação preserva minutos arbitrários nos limites da faixa, pois restringir a entrada a :00/:30 alteraria indevidamente as regras do desafio. As bibliotecas foram consultadas via Context7.

Na etapa de documentação da API, o Codex adicionou Swashbuckle.AspNetCore, exemplos OpenAPI de requisição e respostas 200/400 e redirecionamento da raiz para `/swagger`. O exemplo de sucesso é derivado do serviço e dos dados carregados, evitando divergência com a busca real. A configuração foi consultada no Context7 e verificada por compilação, testes e requisições HTTP.

Na segunda etapa, o Codex refez o frontend com componentes próprios, hook de busca tipado, ilustrações CSS, Motion e um modal de visualização. Consultou Context7 para React, Motion e o plugin oficial de React no Vite, e consultou sites de referência visual. As referências orientaram a direção; seus componentes não foram copiados para o projeto.
