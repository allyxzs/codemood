# Configuração

A demonstração e a análise de repositórios públicos funcionam sem variáveis secretas. O código usa a API REST do GitHub no servidor, sem chave de IA.

## Desenvolvimento

Requisito: Node.js 20.9+ e npm. Node.js 22 LTS é usado na integração contínua.

```sh
npm ci
npm run dev
```

A aplicação abre em `http://localhost:3000`.

## Login opcional com GitHub

1. Crie um OAuth App nas configurações de desenvolvedor da sua conta GitHub.
2. Use a URL da aplicação como Homepage URL.
3. Defina o callback como `http://localhost:3000/api/auth/callback` em desenvolvimento ou `https://SEU-DOMINIO/api/auth/callback` em produção.
4. Copie `.env.example` para `.env.local` e configure `APP_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e `SESSION_SECRET`.
5. Gere uma chave de 32 bytes em hexadecimal para `SESSION_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

6. Reinicie a aplicação. O botão Conectar GitHub passa a iniciar o OAuth.

O aplicativo solicita somente `read:user`. Não solicita escrita ou acesso a repositórios privados. O token autenticado permite consultar projetos públicos com a cota aplicável à conta. A expiração exige novo login. Encerrar a sessão apaga o cookie local; revogar a autorização do aplicativo é feito nas configurações da conta GitHub.

## Produção

```sh
npm run build
npm start
```

Compatível com hospedagens que executem Next.js com rotas Node.js, incluindo Vercel. O framework é detectado pelo `package.json`. Configure as variáveis opcionais no ambiente da hospedagem. `APP_URL` deve ser a origem HTTPS definitiva e coincidir com o OAuth App. Não é uma exportação estática: as rotas `/api` precisam de servidor.

## Dados locais

Repositórios analisados são armazenados no navegador atual. Limpar os projetos em Como funciona remove os dados da aplicação desse navegador. O tema é salvo separadamente. A demonstração substitui os projetos locais quando reaberta. Exportações já baixadas e cookies de autenticação são independentes; use Sair para remover a sessão.

## Problemas comuns

| Situação                            | O que verificar                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Repositório não encontrado          | URL exata, visibilidade pública e nome da branch                                 |
| Zero commits                        | Repositório vazio ou filtros restritivos                                         |
| Limite do GitHub                    | Aguardar a renovação da cota ou conectar a conta                                 |
| Conectar GitHub apenas mostra aviso | Preencher todas as variáveis do OAuth                                            |
| Callback falhou                     | Origem/callback corretos, credenciais válidas, fluxo iniciado no mesmo navegador |
| Dados não persistem                 | Armazenamento bloqueado, cheio ou modo de navegação restrito                     |
| Dados antigos fora do gráfico       | A amostra contém somente até 500 commits mais recentes                           |

Referências oficiais: [Next.js](https://nextjs.org/docs), [commits REST](https://docs.github.com/en/rest/commits/commits) e [OAuth GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
