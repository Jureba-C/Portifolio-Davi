# Mods do Caio

Dois mods para o Claude Code, prontos para instalar em qualquer projeto.

## O que cada um faz

- **savvy-progress** (2.0.0): barra de progresso acima do prompt e painel de agentes (`/agents-info`). Mostra quanto do plano já foi usado (janela de 5 h e semana) e avisa em 80% e 90%. Em português. Baseado no savvy-progress de johnnyvizz (licença MIT, crédito mantido em `plugins/savvy-progress/LICENSE` e `NOTICE.md`).
- **escolha-de-modelo** (1.0.0): escolhe Haiku, Sonnet ou Opus sozinho para cada pedido.

## Comandos do /modelo

- `/modelo` mostra como está agora.
- `/modelo auto` liga a escolha automática.
- `/modelo haiku`, `/modelo sonnet` ou `/modelo opus` fixa um modelo até você mandar `/modelo auto`.
- `/modelo desligado` desliga a escolha; vale o modelo do `/model`.

Se você trocar o modelo pelo `/model`, a escolha automática se desliga sozinha. Use `/modelo auto` para religar.

## Instalar a partir deste projeto

Os mods estão em `.claude/mods-do-caio` no repositório do portfólio. Na pasta do projeto, dentro do Claude Code:

```
/plugin marketplace add ./.claude/mods-do-caio
/plugin install savvy-progress@mods-do-caio
/plugin install escolha-de-modelo@mods-do-caio
```

## Instalar

⚠️ Antes: o seu savvy-progress tem o mesmo nome do original do marketplace claude-kit. Desative o original primeiro, para a mesma ferramenta não ser registrada duas vezes:

```
/plugin disable savvy-progress@claude-kit
```

Depois, dentro do Claude Code (em qualquer projeto):

```
/plugin marketplace add "/Users/caio/Documents/Mods do Caio"
/plugin install savvy-progress@mods-do-caio
/plugin install escolha-de-modelo@mods-do-caio
```

Reinicie o Claude Code para valer.

Pelo terminal também funciona:

```
claude plugin disable savvy-progress@claude-kit
claude plugin marketplace add "/Users/caio/Documents/Mods do Caio"
claude plugin install savvy-progress@mods-do-caio
claude plugin install escolha-de-modelo@mods-do-caio
```

## Levar para outro computador

Copie a pasta `Mods do Caio` (ou o `Mods do Caio.zip` e descompacte). Depois faça o `marketplace add` apontando para onde a pasta ficou nesse computador e os dois `install`.

## Atualizar

Depois de mudar algo na pasta, suba a versão no `plugin.json` do mod e no `.claude-plugin/marketplace.json`, e rode:

```
/plugin marketplace update mods-do-caio
/plugin update savvy-progress@mods-do-caio
/plugin update escolha-de-modelo@mods-do-caio
```

Reinicie o Claude Code em seguida.
