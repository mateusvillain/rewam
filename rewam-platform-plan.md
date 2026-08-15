# Rewam — briefing técnico de plataforma

## Objetivo

Construir uma plataforma pessoal para registrar filmes e séries assistidos. A pessoa usuária deve conseguir buscar títulos no TMDB, registrar cada exibição, diferenciar primeira vez de reassistidas e acompanhar o tempo total consumido.

Plataformas-alvo: Web, Android e iOS, com uma única conta sincronizada.

## Princípios do projeto

- Priorizar custo inicial próximo de zero.
- Compartilhar o máximo possível de código entre Web, Android e iOS.
- Começar com escopo pessoal e simples; não criar recursos sociais ou de recomendação no MVP.
- Garantir que os dados de consumo pertencem ao usuário e que ações via IA respeitam autenticação e confirmação.
- Manter a arquitetura pronta para evoluir, sem antecipar complexidade desnecessária.

## Stack recomendada

| Área                 | Escolha                                | Motivo                                                                 |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Linguagem            | TypeScript                             | Tipagem compartilhada entre app, backend e MCP.                        |
| App universal        | Expo + React Native + React Native Web | Uma base para Android, iOS e Web.                                      |
| Navegação            | Expo Router                            | Rotas por arquivos e suporte às três plataformas.                      |
| Backend              | Supabase                               | PostgreSQL, Auth, API e políticas de acesso no plano gratuito inicial. |
| Banco                | PostgreSQL (Supabase)                  | Dados relacionais, consultas de totais e segurança com RLS.            |
| Autenticação         | Supabase Auth                          | Cadastro e sessão por e-mail/senha.                                    |
| Catálogo             | TMDB API                               | Busca, metadados, duração e imagens de filmes/séries.                  |
| Monorepo             | pnpm workspaces + Turborepo            | Pacotes compartilhados e tarefas rápidas.                              |
| Dados remotos no app | TanStack Query                         | Cache, estados de carregamento e invalidação previsíveis.              |
| Formulários          | React Hook Form + Zod                  | Validação reutilizável.                                                |
| Testes               | Vitest + Testing Library               | Testes unitários e de componentes.                                     |
| CI                   | GitHub Actions                         | Validar lint, tipos e testes sem custo inicial.                        |
| Deploy Web           | Vercel ou Cloudflare Pages             | Plano gratuito para a aplicação web.                                   |

Não iniciar com Next.js. Expo Web atende o produto inicial e evita manter duas interfaces independentes.

## Estrutura do monorepo

```text
rewam/
├── apps/
│   ├── app/                     # Expo: Web, Android e iOS
│   │   ├── app/                 # Rotas Expo Router
│   │   ├── features/            # Fluxos por domínio
│   │   ├── components/          # Componentes específicos do app
│   │   └── lib/                 # Clientes e configuração
│   └── mcp-server/              # Servidor MCP independente
├── packages/
│   ├── ui/                      # Componentes visuais compartilhados
│   ├── tokens/                  # Cores, espaçamentos, tipografia
│   ├── types/                   # Tipos e schemas Zod compartilhados
│   ├── database/                # Tipos gerados do Supabase e queries
│   ├── tmdb/                    # Cliente e normalização do TMDB
│   ├── auth/                    # Helpers de autenticação
│   └── utils/                   # Funções puras, inclusive cálculo de tempo
├── supabase/
│   ├── migrations/              # Migrações SQL versionadas
│   ├── seed.sql                 # Dados locais opcionais
│   └── config.toml
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Regra: nenhuma chave secreta no app. Variáveis públicas Expo podem conter apenas URL Supabase, chave anônima e token público do TMDB; `service_role`, token privado do TMDB e segredos do MCP ficam somente no servidor.

## Modelo de dados

O TMDB é fonte de catálogo, não fonte dos registros pessoais. Salvar uma cópia mínima dos dados necessários para histórico e desempenho; sincronizar/atualizar detalhes do TMDB quando necessário.

### Tabelas

| Tabela         | Campos principais                                                                                                                    | Finalidade                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `profiles`     | `id`, `name`, `created_at`, `updated_at`                                                                                             | Perfil, com `id` igual a `auth.users.id`.                                           |
| `titles`       | `id`, `tmdb_id`, `media_type`, `title`, `original_title`, `poster_path`, `release_date`, `runtime_minutes`, `metadata`, `updated_at` | Cache normalizado de filme ou série.                                                |
| `seasons`      | `id`, `title_id`, `tmdb_season_number`, `name`, `episode_count`, `poster_path`                                                       | Temporadas de uma série.                                                            |
| `episodes`     | `id`, `title_id`, `season_id`, `tmdb_episode_id`, `season_number`, `episode_number`, `name`, `runtime_minutes`, `air_date`           | Episódios; necessários para total preciso de séries.                                |
| `watch_events` | `id`, `user_id`, `title_id`, `episode_id` nulo, `watched_at`, `duration_minutes`, `notes`, `created_at`                              | Uma exibição. Se `episode_id` nulo, representa filme ou registro agregado de série. |

### Restrições e índices

- `titles`: `unique(tmdb_id, media_type)`.
- `episodes`: `unique(title_id, season_number, episode_number)`.
- `watch_events`: `check(duration_minutes > 0)` e exatamente um alvo lógico: filme/série via `title_id` ou episódio via `episode_id`.
- Índices em `watch_events(user_id, watched_at desc)`, `watch_events(user_id, title_id)` e `episodes(title_id, season_number, episode_number)`.
- `media_type`: enum `movie | tv`.

### Reassistida

Não salvar um booleano `rewatched`. Ele é derivado: um evento é reassistida quando já existe evento anterior do mesmo usuário para o mesmo alvo (`title_id` para filme; `episode_id` para episódio). Isso evita inconsistência quando eventos são removidos ou editados.

Exibir no histórico: `Exibição #1`, `Reassistida #2`, etc.

## Segurança e autenticação

Cadastro inicial:

1. Nome, e-mail e senha.
2. Criar conta por `supabase.auth.signUp`.
3. Criar `profiles` por trigger SQL após inclusão em `auth.users`; preencher nome a partir de metadados seguros do cadastro.
4. Confirmar e-mail se essa opção estiver habilitada no projeto Supabase.
5. Criar sessão, restaurada automaticamente pelo cliente Supabase.

Aplicar Row Level Security em todas as tabelas pessoais:

- `profiles`: somente `id = auth.uid()`.
- `watch_events`: somente `user_id = auth.uid()`.
- Catálogo (`titles`, `seasons`, `episodes`): leitura autenticada; inserção/atualização apenas por Edge Function ou backend confiável, se necessário.

Nunca confiar em `user_id` enviado pelo cliente: políticas e funções devem usar `auth.uid()`.

## Integração TMDB

### Fluxos

1. Busca: usar endpoint multi-search ou buscas separadas de filme e TV.
2. Seleção do título: buscar detalhes (`movie/{id}` ou `tv/{id}`) e salvar/atualizar `titles`.
3. Séries: carregar temporadas e episódios sob demanda. Não baixar todo o catálogo.
4. Cartaz e backdrop: construir URL com a configuração de imagens do TMDB.

### Normalização obrigatória

- Filme: `title`, `original_title`, `release_date`, `runtime`.
- Série: `name`, `original_name`, `first_air_date`, `number_of_seasons`, `episode_run_time`.
- Episódio: números de temporada/episódio, nome e `runtime` individual.
- Quando a duração for ausente, marcar como desconhecida; não inventar número.

### Proteção de credenciais

Para o MVP, é aceitável usar o token de leitura do TMDB configurado como variável pública, pois é destinado a clientes. Preferir uma Supabase Edge Function (`tmdb-search`, `tmdb-details`) quando quiser ocultar token, aplicar rate limit ou cache central.

Respeitar os termos e a atribuição exigida pelo TMDB no produto.

## Cálculo de tempo assistido

O total é a soma de `watch_events.duration_minutes`; cada registro guarda a duração usada naquele momento. Isso preserva o histórico mesmo se o TMDB corrigir uma duração depois.

- Filme: ao marcar como assistido, pré-preencher duração do filme; permitir ajuste manual.
- Episódio: criar um evento para cada episódio marcado; duração individual quando disponível.
- Série inteira: oferecer ação que registra todos os episódios selecionados e mostra a soma antes de confirmar.
- Reassistida: cada nova exibição soma novamente ao total.
- Duração desconhecida: permitir salvar a exibição sem total, ou pedir duração manual. Não incluí-la em totais até haver minutos válidos.

Exemplos de métricas:

- Total geral: `sum(duration_minutes)`.
- Este mês/ano: filtrar por `watched_at`.
- Por filme/série: soma por `title_id`.
- Reassistidas: eventos cuja posição cronológica no alvo é maior que 1.

Usar visualização SQL ou RPC para agregados quando as consultas crescerem; no MVP, consultas indexadas podem calcular o necessário.

## Telas do MVP

1. **Cadastro e login** — nome, e-mail, senha, recuperação de senha.
2. **Início** — total assistido, itens recentes e ação de busca.
3. **Busca** — resultados TMDB de filmes e séries, com filtros básicos.
4. **Detalhe de filme** — metadados, histórico pessoal, marcar como assistido/reassistido.
5. **Detalhe de série** — temporadas/episódios, progresso e seleção em lote.
6. **Histórico** — eventos ordenados por data, com identificação de reassistida.
7. **Estatísticas** — total em minutos, horas e dias; filtros por período.
8. **Perfil** — nome, e-mail, sair e exclusão de conta/dados.

## Escopo fechado do MVP

- Cadastro por e-mail e senha.
- Busca e detalhes TMDB.
- Registro de filmes e episódios assistidos.
- Reassistidas derivadas do histórico.
- Total de tempo e estatísticas básicas.
- Sincronização entre Web, Android e iOS.
- MCP separado com operações pessoais básicas.

## Fora do MVP

- Rede social, seguir pessoas, comentários ou feed.
- Recomendações algorítmicas.
- Streaming, reprodução de vídeo ou integração com provedores.
- Listas colaborativas e compartilhamento público.
- Avaliações complexas, gamificação e notificações push.
- Login social, modo offline completo e importação de serviços externos.
- Assinaturas, anúncios ou pagamentos.

## Infraestrutura e custo inicial

| Serviço                 | Uso inicial                                        | Custo esperado                                   |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Supabase Free           | Auth, banco, API, Edge Functions quando necessário | Gratuito dentro de limites do plano.             |
| TMDB                    | Catálogo e imagens                                 | Sem custo, conforme termos e limites aplicáveis. |
| Expo                    | Desenvolvimento e builds iniciais                  | Usar plano gratuito enquanto suficiente.         |
| Vercel/Cloudflare Pages | Web                                                | Plano gratuito.                                  |
| GitHub                  | Código e Actions                                   | Plano gratuito.                                  |
| Domínio                 | URL pública                                        | Custo anual obrigatório.                         |
| Google Play             | Publicação Android                                 | Taxa obrigatória de desenvolvedor.               |
| Apple Developer         | Publicação iOS                                     | Assinatura anual obrigatória.                    |

Adicionar monitoramento básico de limites de Supabase, TMDB e builds. Antes de produção, configurar backups e política de retenção compatíveis com o plano contratado.

## MCP para agentes de IA

Criar `apps/mcp-server` como serviço separado em TypeScript usando o SDK oficial MCP. O MCP não deve acessar o banco como administrador em nome de qualquer pessoa.

### Autorização

- Cada chamada deve carregar token de sessão Supabase do usuário, ou usar OAuth/fluxo equivalente quando o host MCP suportar.
- Validar token no servidor e usar o contexto do usuário para toda operação.
- Jamais expor `SUPABASE_SERVICE_ROLE_KEY` ao cliente ou ao modelo.
- Operações mutáveis exigem confirmação explícita do host/usuário antes da execução, especialmente ações em lote e exclusão.

### Ferramentas iniciais

| Ferramenta             | Entrada                                            | Resultado                               |
| ---------------------- | -------------------------------------------------- | --------------------------------------- |
| `search_titles`        | texto, tipo opcional, página                       | Resultados TMDB normalizados.           |
| `get_title`            | `tmdb_id`, tipo                                    | Detalhes e dados pessoais resumidos.    |
| `list_recent_watches`  | limite, período opcional                           | Histórico do usuário autenticado.       |
| `get_watch_stats`      | período opcional                                   | Minutos, horas, eventos e reassistidas. |
| `record_movie_watch`   | filme, data, duração opcional                      | Cria uma exibição de filme.             |
| `record_episode_watch` | série, temporada, episódio, data, duração opcional | Cria exibição de episódio.              |
| `delete_watch_event`   | id do evento                                       | Remove exibição após confirmação.       |

Respostas devem ser pequenas, tipadas e livres de dados de outros usuários. Registrar auditoria mínima de chamadas mutáveis (`user_id`, ferramenta, data, resultado), sem registrar conteúdo sensível desnecessário.

## Ordem de implementação

1. Inicializar monorepo, lint, formatador, testes e CI.
2. Criar projeto Supabase, migrações, tipos gerados, RLS e trigger de perfil.
3. Configurar Expo Router, tema/tokens e autenticação por e-mail/senha.
4. Integrar busca TMDB e tela de detalhes de filme.
5. Implementar `watch_events`, histórico e total de tempo para filmes.
6. Adicionar séries, temporadas, episódios e marcação em lote.
7. Criar estatísticas, edição e exclusão de eventos.
8. Extrair componentes/pacotes compartilhados e testar Web, Android e iOS.
9. Implementar MCP, autenticação e ferramentas somente de leitura; depois operações de escrita confirmadas.
10. Preparar publicação: ícones, políticas de privacidade, domínio, builds e contas das lojas.

## Critérios de aceite do MVP

- Uma pessoa cria conta com nome, e-mail e senha e acessa a mesma conta nas três plataformas.
- Busca um filme ou série pelo TMDB e vê metadados corretos.
- Marca filme ou episódio como assistido, com data e duração editáveis.
- Um segundo registro do mesmo item aparece como reassistida e aumenta o total.
- O total geral e por período corresponde à soma dos eventos com duração válida.
- Usuários não conseguem ler ou alterar eventos de outras contas.
- Um agente autenticado consegue consultar histórico/estatísticas e registrar uma exibição somente após confirmação.

## Diretrizes para o agente de desenvolvimento

- Implementar em incrementos pequenos, cada um testável e revisável.
- Antes de criar endpoint ou tabela, verificar se o Supabase/RLS já fornece a capacidade com menos código.
- Centralizar schemas Zod em `packages/types`; nunca duplicar contratos entre app e MCP.
- Gerar tipos do banco após cada migração e falhar CI se tipos/migrações estiverem incoerentes.
- Tratar estados de carregamento, vazio, erro e ausência de duração em toda tela relevante.
- Não bloquear o lançamento por dados perfeitos do TMDB: permitir ajuste de duração e histórico manual.
- Documentar todas as variáveis de ambiente em `.env.example`, sem valores reais.
