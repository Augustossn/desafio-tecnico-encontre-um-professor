# Desafio técnico: Encontre um Professor

## Contexto

Uma escola de idiomas precisa encontrar professores disponíveis para cada novo aluno. O aluno informa o idioma, os dias da semana, a faixa de horário em que pode ter aula e a duração da aula; o sistema devolve os professores que conseguem atendê-lo e em quais horários.

Você vai construir uma API em C# que resolve essa busca e uma tela em React para usá-la.

**Estimativa:** 6 a 8 horas de trabalho. O prazo de entrega é informado no convite do processo seletivo.

## Como começar

1. Clique em **Use this template** para criar o seu próprio repositório a partir deste.
2. Desenvolva a solução no seu repositório.
3. Envie o link pelo mesmo canal em que recebeu o desafio. O repositório precisa estar público ou com acesso liberado para quem enviou o desafio.

## Dados

Os professores estão em [`professores.json`](professores.json). Carregue-os desse arquivo; você pode mantê-los em memória.

Cada professor tem:

| Campo | Descrição |
|---|---|
| `id`, `nome` | Identificação do professor |
| `idiomas` | Idiomas que ele ensina |
| `agendaBloqueada` | Quando `true`, o professor não pode receber novos alunos |
| `disponibilidade` | Blocos semanais em que ele pode dar aula (`dia`, `inicio`, `fim`) |
| `aulasMarcadas` | Aulas que ele já tem na semana (`dia`, `inicio`, `duracaoMinutos`) |

**Garantias dos dados:**

- Horários no formato `HH:mm`.
- Nada atravessa a meia-noite.
- Blocos de disponibilidade de um mesmo dia nunca se sobrepõem nem se encostam.
- Dias da semana: `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo`.

## O que construir

### 1. API (C# e .NET 8)

`POST /api/professores/busca`

**Requisição:**

```json
{
  "idioma": "Espanhol",
  "dias": ["segunda"],
  "inicioFaixa": "18:00",
  "fimFaixa": "20:00",
  "duracaoMinutos": 60
}
```

**Resposta:**

```json
{
  "professores": [
    { "id": 1, "nome": "Ana",   "aulasNaSemana": 1, "horarios": ["18:00"] },
    { "id": 4, "nome": "Diego", "aulasNaSemana": 1, "horarios": ["18:00", "18:30", "19:00"] }
  ],
  "naoElegiveis": [
    { "id": 2, "nome": "Bruno", "motivo": "Não ensina o idioma" }
  ]
}
```

A lista `naoElegiveis` do exemplo está resumida a um item.

### 2. Regras da busca

1. O professor precisa ensinar o idioma pedido.
2. Professor com agenda bloqueada não aparece.
3. **O aluno quer horário fixo:** o mesmo horário de início precisa estar livre em **todos** os dias pedidos.
4. A aula precisa caber **inteira** dentro de um bloco de disponibilidade do professor e dentro da faixa pedida pelo aluno.
5. A aula não pode se sobrepor a uma aula já marcada. **Encostar é permitido:** uma aula que termina às 19:00 permite outra começando às 19:00.
6. A aula só pode começar em hora cheia ou meia hora (`:00` ou `:30`).
7. **Ordenação:** primeiro quem tem menos aulas marcadas na semana; em caso de empate, ordem alfabética do nome. Os horários de cada professor vêm em ordem crescente.

**Diferencial:** preencher `naoElegiveis` com o motivo de cada professor que ficou de fora, usando exatamente um destes textos:

- `Não ensina o idioma`
- `Agenda bloqueada`
- `Sem horário em comum nos dias pedidos`

Quando houver mais de um motivo, informe o primeiro nessa ordem.

### 3. Validação

A API responde **400** com uma mensagem clara quando:

- o idioma está vazio;
- nenhum dia foi informado;
- algum dia é inválido;
- algum horário está fora do formato `HH:mm`;
- o fim da faixa é igual ou anterior ao início;
- a duração é diferente de 30, 60 ou 90 minutos.

### 4. Tela (React, de preferência com TypeScript)

- **Formulário:** idioma (Inglês, Espanhol ou Francês), dias da semana, faixa de horário e duração.
- **Resultado:** cada professor com os horários possíveis e a quantidade de aulas na semana.
- **Estados:** carregando, nenhum professor encontrado, falha de comunicação com a API e erros de validação devolvidos pela API.
- **Diferencial:** mostrar os professores que ficaram de fora e o motivo.

### 5. Testes

No mínimo **5 testes automatizados em C#** sobre as regras da busca. Os testes não devem depender de subir a API.

## Se algo não estiver coberto

Se encontrar uma situação que as regras não cobrem, decida, implemente e registre a decisão no README. Isso faz parte da avaliação.

## Entrega

- **`README.md`** no seu repositório, com: como rodar a API e a tela, as decisões que você tomou e o que ficou faltando.
- **`USO_DE_IA.md`**, com: quais ferramentas de IA você usou, como usou e **pelo menos um caso em que a IA errou** e como você percebeu. Usar IA é permitido; o que avaliamos é se você entende tudo o que entregou.

## O que vamos avaliar

1. As regras estão corretas, inclusive nos casos de fronteira.
2. Os testes provam as regras.
3. O código é organizado, com a regra de negócio separada da camada HTTP.
4. A validação e o tratamento de erros funcionam.
5. A tela cobre todos os estados.
6. O README é claro e registra as decisões.

Na entrevista técnica, você vai apresentar a solução e fazer uma pequena alteração ao vivo.
