# Contribuindo com CodeMood

Boas contribuições tornam o projeto mais humano: frases regionais, melhores regras de negação, acessibilidade e interpretações transparentes.

## Ambiente

Node.js 20.9 ou superior. Execute `npm ci` e `npm run dev`. Antes de propor uma alteração, execute `npm test`, `npm run typecheck` e `npm run build`.

## Alterando a análise

As regras ficam em `lib/sentiment.ts`. Inclua exemplos positivos e contraexemplos em `tests/sentiment.test.ts`. Uma palavra técnica, como `fix`, não deve virar um indicador de frustração por padrão. Não apresente uma pontuação textual como medida de saúde ou desempenho.

## Boas propostas

Descreva o problema, o comportamento esperado e como verificou a alteração. Use commits fictícios em testes e exemplos. Não inclua tokens, mensagens privadas ou dados pessoais em capturas de tela.

## Direção do projeto

O roadmap está no README. Melhorias na interpretação contextual são bem-vindas desde que expliquem a classificação e preservem a privacidade das mensagens.
