# Arquitetura

CodeMood 1.0 é uma aplicação Next.js App Router com interface React e API no mesmo projeto. A análise é determinística e executada no navegador, sem serviço externo de IA.

## Caminho dos dados

1. O visitante fornece `owner/repo` ou uma URL exata de repositório no github.com.
2. `GET /api/commits` valida entrada, consulta metadados, rejeita projetos privados e busca até cinco páginas de 100 commits.
3. O servidor reduz a resposta a SHA, mensagem, autor, data, URL e repositório. Credenciais nunca entram no JSON.
4. O cliente aplica as regras, grava os projetos reais em localStorage e deriva todos os gráficos do mesmo conjunto filtrado.
5. Canvas gera cartões PNG de 1200 × 630; a exportação JSON contém os commits filtrados e suas classificações.

## Organização

| Caminho                         | Responsabilidade                                        |
| ------------------------------- | ------------------------------------------------------- |
| `app/api/commits/route.ts`      | Importação pública, erros e controle de cache           |
| `app/api/auth/*`                | OAuth, callback, sessão e logout                        |
| `lib/auth.ts`                   | Cookies e criptografia AES-256-GCM                      |
| `lib/github.ts`                 | Validação da URL, paginação e mensagens de erro         |
| `lib/sentiment.ts`              | Regras PT/EN, filtros, agregação e destaques            |
| `lib/demo.ts`                   | Dados fictícios determinísticos, relativos ao dia atual |
| `lib/export.ts`                 | Exportação local de PNG e JSON                          |
| `components/dashboard.tsx`      | Estado e navegação do dashboard                         |
| `components/timeline-chart.tsx` | Gráfico Recharts carregado no cliente                   |

## Sessão OAuth

Escopo `read:user`, fluxo authorization code, state aleatório e PKCE S256. Cookie de fluxo cifrado com duração de dez minutos. O token é validado em `/user` e salvo em cookie HttpOnly, SameSite=Lax, Secure em produção, cifrado com AES-256-GCM. A sessão dura no máximo oito horas ou o tempo menor informado pelo GitHub. A versão inicial pede reconexão ao expirar; não implementa refresh tokens.

`APP_URL` é a origem canônica configurada no servidor, nunca derivada de cabeçalhos enviados pelo visitante. Em produção, deve ser HTTPS. O logout exige a origem canônica. Nenhuma credencial deve usar prefixo `NEXT_PUBLIC_`.

## Limites deliberados

- Apenas GitHub.com e repositórios públicos. Sem acesso a arquivos do projeto.
- Até 500 commits recentes por importação e oito repositórios locais. Ao adicionar um nono, o mais antigo é removido. Reimportar um projeto substitui sua branch e sua amostra.
- Os filtros são locais e não fazem uma busca retroativa fora da amostra. A branch é escolhida na importação; reimporte para alterá-la.
- Sem banco, filas, e-mail, perfil público ou armazenamento em nuvem.
- Sem rate limiter distribuído próprio nesta versão. O provedor limita requisições; o cliente evita importações simultâneas. Para uma instância pública de alto tráfego, adicione limitação distribuída na borda.
- API sem cache compartilhado de dados de sessão. Mensagens não são gravadas pelo aplicativo em logs do servidor.
- Datas e agrupamentos em UTC. Sem inferir noites cansadas a partir de horários.
- Vários autores podem estar presentes: use o filtro de autor para uma retrospectiva individual.

## Critérios de análise

Correspondências recebem pesos de 2 (feliz) ou 3 (demais humores). A categoria com a maior soma vence; empates seguem a ordem feliz, orgulhoso, neutro, frustrado, caótico, cansado. Sem correspondências: neutro. A negação simples é detectada nas palavras imediatamente anteriores; ironia e negações complexas podem falhar. A expressão “works on my machine” suprime o sinal positivo de “it works”. Apenas os primeiros 5.000 caracteres da mensagem entram na análise.

Intensidade é a soma dos pesos da categoria escolhida; não é uma probabilidade. A pontuação da linha é a média dos valores de categoria multiplicada por 100. Feliz/orgulhoso = +1, frustrado = −1, cansado = −0,7, caótico/neutro = 0. A distribuição mantém as seis categorias separadas. Semanas iniciam na segunda-feira. Períodos sem commits não geram pontos, e o gráfico conecta os períodos com dados.
