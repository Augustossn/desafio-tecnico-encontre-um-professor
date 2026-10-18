# Língua — busca de professores

API em C# / .NET 8 e interface React com TypeScript. Os dados oficiais estão versionados em `api/professores.json` e são carregados em memória na inicialização. Não há dependência de rede durante a busca.

## Executar

Requisitos: SDK .NET 8 e Node.js 22.12+ (ou 24 LTS), com npm.

No Windows, também é possível iniciar a API com dois cliques em `iniciar-api.cmd`, mantendo a janela aberta. O arquivo usa o SDK .NET instalado e não exige caminhos pessoais. O frontend continua sendo iniciado com os comandos abaixo.

Na raiz deste projeto, em um terminal:

```sh
dotnet run --project api --urls http://localhost:5080
```

Em outro terminal:

```sh
cd web
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. O servidor do Vite encaminha `/api` para `http://localhost:5080`, dispensando CORS em desenvolvimento. Se mudar a porta da API, ajuste `web/vite.config.ts`.

## Documentação interativa (Swagger)

Com a API em execução, abra **http://localhost:5080/swagger**. O endereço raiz http://localhost:5080/ também redireciona para essa documentação.

Expanda `POST /api/professores/busca`, clique em **Try it out** e depois em **Execute**. O exemplo já vem preenchido com a busca por Espanhol na segunda-feira, das 18:00 às 20:00, por 60 minutos. A documentação inclui os contratos e exemplos de resposta 200 e 400, tanto para validação quanto para JSON inválido.

O documento OpenAPI está em http://localhost:5080/swagger/v1/swagger.json. O Swagger fica habilitado em todos os ambientes para facilitar a avaliação local, inclusive pelo arquivo `iniciar-api.cmd`. Em uma implantação pública, revise essa decisão conforme a política do ambiente.

## Testar e compilar

Na raiz:

```sh
dotnet test tests/Idiomas.Tests.csproj
dotnet build api/Idiomas.Api.csproj
cd web
npm run build
```

Os 19 testes de unidade instanciam diretamente `BuscaService`, sem subir a API. Cobrem interseção de dias, sobreposição parcial, contato entre aulas, blocos separados, faixa inteira, grade de meia hora, três durações, prioridade de motivos, ordenação, normalização e validações.

Outros 16 casos HTTP usam `WebApplicationFactory`/`TestServer` em memória, sem abrir portas nem exigir que a API esteja rodando. Conferem o contrato 200, lista vazia, cada validação 400, JSON malformado, tipos incorretos, o documento e a página Swagger e o redirecionamento da raiz. O total C# é **35 casos**, contando os parametrizados. A solução `Idiomas.sln` ajuda a infraestrutura de testes a localizar o projeto.

### Testes da interação de horários

Na pasta `web`, após `npm ci`:

```sh
npx playwright install chromium
npm run test:e2e
```

São **16 testes de navegador**: 7 para escolha de horários e 9 para estados da busca. Conferem atalhos, teclado, digitação, rolagem, cancelamento, minutos precisos e celular; mensagens de faixa curta, idioma ausente e agendas bloqueadas; ajustes e novas requisições; foco nos campos; resumo de exclusões; carregamento, validação e falha de comunicação. O Playwright sobe a tela na porta 5174; os testes não exigem a API. Respostas HTTP são simuladas para verificar o comportamento da interface, sem substituir os testes C# das regras e da camada HTTP.

Também é possível usar o Edge já instalado. No PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

## Contrato

`POST /api/professores/busca`, com `Content-Type: application/json`:

```json
{"idioma":"Espanhol","dias":["segunda"],"inicioFaixa":"18:00","fimFaixa":"20:00","duracaoMinutos":60}
```

```json
{"professores":[{"id":1,"nome":"Ana","aulasNaSemana":1,"horarios":["18:00"]},{"id":4,"nome":"Diego","aulasNaSemana":1,"horarios":["18:00","18:30","19:00"]}],"naoElegiveis":[{"id":2,"nome":"Bruno","motivo":"Não ensina o idioma"}]}
```

A lista de não elegíveis acima está resumida; a API devolve todos. Campos inválidos retornam 400 com `title` e `errors` (mapa de campo para lista de mensagens). JSON malformado ou tipos incorretos retornam 400 com `mensagem`.

## Organização e algoritmo

- `api/Models.cs`: contratos e dados.
- `api/BuscaService.cs`: validação e regra de negócio independente de HTTP.
- `api/Program.cs`: carregamento do JSON, injeção e endpoint.
- `tests/BuscaTests.cs`: testes de unidade com dados específicos de cada cenário.
- `tests/HttpTests.cs`: verificações da camada HTTP, contratos e Swagger, em servidor em memória.
- `web/src/main.tsx`: inicialização com StrictMode e configuração de movimento reduzido.
- `web/src/App.tsx`: composição da página e estado do formulário.
- `web/src/SearchForm.tsx`: controles acessíveis e seletores animados.
- `web/src/Results.tsx`: estados da consulta, cards e visualização de horário.
- `web/src/useTeacherSearch.ts`: hook com comunicação HTTP, cancelamento, timeout e proteção contra respostas antigas.
- `web/src/types.ts`: contratos TypeScript e configuração dos dias.
- `web/src/TimeRangeField.tsx`: faixa de horários, atalhos e resumo da duração disponível.
- `web/src/TimePicker.tsx`: seletor com rolagem, teclado e entrada precisa, usando Radix Popover para foco e posicionamento.
- `web/e2e/time-picker.spec.ts`: testes automatizados da escolha de horário.
- `web/src/EmptySearchResult.tsx`: explicação do resultado vazio e ações para rever a consulta.
- `web/e2e/search-states.spec.ts`: testes das mensagens, sugestões e estados da busca.
- `.github/workflows/ci.yml`: compilação e testes automáticos no GitHub.

Para cada professor, a busca verifica idioma e bloqueio nessa ordem. Depois enumera os inícios na grade de 30 minutos dentro da faixa do aluno. Um início só entra se, em **todos** os dias, a aula couber em um único bloco e não intersectar aulas existentes. Intervalos são tratados como `[início, fim)`: o conflito é `inicio < fimExistente && inicioExistente < fim`. Assim, encostar é permitido. Na ausência de início comum, registra o terceiro motivo.

## Decisões

- Idioma ignora maiúsculas e espaços nas pontas, mas preserva acentos. Idioma não vazio e desconhecido é aceito e produz nenhum elegível. A tela oferece as três opções pedidas.
- Dias são os identificadores exatos do enunciado; dias repetidos são considerados uma única vez. `null` e lista vazia são inválidos.
- Horários exigem exatamente `HH:mm`, entre 00:00 e 23:59. `24:00` é inválido. Inícios fora da grade são arredondados para o próximo múltiplo de 30 minutos.
- Faixa menor que a duração é uma consulta válida, sem resultados.
- Quantidade semanal conta todos os registros de `aulasMarcadas`, inclusive em dias não solicitados.
- Nomes usam comparação alfabética `pt-BR`, ignorando caixa. Empates completos são resolvidos pelo ID. Não elegíveis mantêm a ordem do arquivo.
- Os dados de origem são confiáveis conforme as garantias do desafio; falhas de leitura impedem a inicialização, em vez de simular uma lista vazia.
- A agenda é semanal, sem datas, feriados ou conversão de fuso. A busca não agenda nem reserva aulas.
- Durante a requisição, o formulário fica desabilitado. O resultado guarda um resumo da consulta efetivamente executada. Há timeout de 15 segundos e mensagens para validação, erro de comunicação e nenhum resultado.
- Fontes do Google são opcionais; fontes locais de sistema funcionam sem acesso externo.
- O frontend usa React em StrictMode e Motion para transições de estado, entrada dos cards e indicadores compartilhados (`layoutId`). `MotionConfig` e CSS respeitam movimento reduzido.
- Rádios e checkboxes nativos mantêm navegação por teclado. A interface anuncia estados com uma região viva e oferece um link para pular à busca.
- Clicar em um horário abre um `dialog` nativo com professor, idioma, dias e início/fim da aula. O modal gerencia foco e Escape pelo navegador e informa explicitamente que não faz reserva.
- A consulta exibida guarda os critérios enviados; mudar o formulário não altera silenciosamente os resultados anteriores.
- Componentes e ilustrações são próprios. Referências visuais consultadas: [Kokonut UI](https://kokonutui.com), [Spell UI](https://spell.sh), [Bklit UI](https://bklit.com) e [Refero](https://refero.design). Motion é a dependência de animação efetivamente instalada; não foram instaladas todas as bibliotecas citadas.
- A escolha de horário foi inspirada no [Wheel Picker do Kokonut UI](https://kokonutui.com/docs/inputs/wheel-picker), com implementação própria e Radix Popover. Não foi copiado o componente da biblioteca. A rolagem usa CSS scroll-snap e as colunas são listboxes com navegação por setas, Home/End, PageUp/PageDown e números. Aplicar confirma o rascunho; Escape ou fechar descarta.
- Horas seguem o formato de 24 horas e minutos de 00 a 59. Atalhos de 15 minutos são conveniências, sem restringir a API: os limites da faixa podem ser 18:15 ou 18:17. A restrição a :00/:30 continua aplicada apenas aos inícios de aula calculados no backend.
- Os atalhos de período preenchem manhã 08:00–12:00, tarde 13:00–18:00 e noite 18:00–22:00. Todos podem ser ajustados depois. A faixa é do aluno; não afirma disponibilidade dos professores antes da busca.
- O resumo avisa se o fim precede o início ou se a faixa é menor que a duração. Faixa curta continua sendo consulta válida sem resultados, conforme a decisão da API. A validação HTTP continua funcionando independentemente dos avisos da tela.
- Resultados vazios explicam a limitação concreta: faixa menor que a duração, ausência de professores do idioma, agendas do idioma bloqueadas ou falta de início comum. As conclusões sobre professores são derivadas apenas dos motivos reais de `naoElegiveis`, preservando os três textos obrigatórios da API. Sem dados suficientes, a mensagem é genérica.
- O resumo dos motivos de exclusão aparece sem precisar abrir o acordeão, inclusive quando há professores elegíveis. Os nomes e motivos individuais continuam em Transparência na busca.
- As ações partem dos critérios da consulta executada, mesmo se o formulário foi editado depois. Ampliar uma faixa curta mantém o início e estende o fim para caber uma aula; se ultrapassaria 23:59, desloca o início para trás. Testar uma duração menor oferece apenas 30/60/90 que caibam na faixa atual. Buscar no dia inteiro usa 00:00–23:59, preservando os dias, idioma e duração. Nenhuma ação promete vagas antes da nova busca.
- Rever dias e escolher idioma restauram os critérios da consulta e movem o foco para o controle correspondente; não removem dias ou mudam idioma sem decisão do usuário.

## Verificação automática no GitHub

Ao publicar o projeto, coloque **o conteúdo da pasta `idiomas` na raiz do repositório**, incluindo `.github/workflows/ci.yml`, `api`, `tests`, `web` e `Idiomas.sln`.

A rotina roda em `push`, `pull_request` e por execução manual na aba **Actions**. Ela usa .NET 8 para os 35 testes C# e Node 24 para instalar dependências, compilar a tela, instalar Chromium e rodar os 16 testes de navegador. Não exige banco, credenciais ou API em uma porta pública. O workflow foi preparado e seus comandos foram verificados localmente; a execução hospedada só poderá ser confirmada após publicação no GitHub.

## Validação realizada e limites

Os 35 testes C# passaram em Release, e a compilação de produção do frontend passou. O exemplo foi conferido por HTTP com os dados oficiais. Os estados da interface também foram conferidos no navegador.

Os 16 testes automatizados de interface passaram no Microsoft Edge e no Chromium. O seletor também foi conferido em larguras de 320, 390, 768, 1024 e 1440 pixels.

Não foram adicionados persistência, autenticação, agendamento de aulas ou implantação em produção. Os testes de interface cobrem os principais estados e interações, sem equivaler a uma auditoria completa de acessibilidade ou de todos os navegadores. A publicação no GitHub e o envio ao recrutador devem ser feitos pelo candidato, que também deve revisar e compreender o código antes da entrevista.

Dados: https://github.com/KingOfLanguages/desafio-tecnico-dev-junior/blob/main/professores.json
