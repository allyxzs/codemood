# Validação da versão 1.0.0

Verificações realizadas em 24/11/2026:

| Verificação                           | Resultado                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------- |
| 31 testes automatizados               | Aprovados                                                                   |
| TypeScript em modo strict             | Aprovado                                                                    |
| Build Next.js de produção             | Aprovado                                                                    |
| Consulta real à API GitHub            | `octocat/Hello-World`, branch `master`: 3 commits importados, datas válidas |
| Auditoria de dependências de produção | Nenhuma vulnerabilidade reportada na execução                               |
| Sessões cifradas                      | Round trip, nonce distinto e rejeição de adulteração testados               |
| Erros GitHub                          | 401, 403, 404, 422, 429 e 500 cobertos com respostas simuladas              |
| Paginação e amostras parciais         | Testadas com respostas simuladas                                            |

## Verificações pendentes

A prévia do navegador neste ambiente injeta parâmetros incompatíveis com o CLI do Next.js. Por isso, navegação, responsividade e downloads PNG/JSON ainda precisam de uma conferência manual no navegador. O build e a checagem de tipos não substituem essa conferência visual.

O fluxo OAuth está implementado, mas o login completo depende das credenciais do OAuth App e não foi exercitado contra uma conta real. Os testes de criptografia não equivalem a uma auditoria de segurança.

## Roteiro rápido de conferência manual

1. Abrir o app, alternar temas e percorrer Visão geral, Comparar projetos e Melhores commits.
2. Importar um repositório público válido e testar uma branch inexistente.
3. Testar filtros e busca sem resultados, limpar filtros e navegar pelas páginas.
4. Abrir um commit, conferir as expressões identificadas e exportar o cartão.
5. Exportar a timeline e o JSON; conferir os arquivos baixados.
6. Recarregar para verificar a persistência e remover um projeto.
7. Em uma janela estreita, conferir navegação inferior, campos e rolagem da tabela.
8. Com OAuth configurado, conectar a conta, importar e sair.
