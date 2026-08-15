# Rewam

Plataforma pessoal para registrar filmes e séries assistidos, com uma única conta sincronizada entre Web, Android e iOS.

O briefing completo de produto e arquitetura está em [`rewam-platform-plan.md`](./rewam-platform-plan.md).

## Stack

- **TypeScript** em todo o monorepo (app, pacotes e MCP).
- **Expo + React Native + React Native Web** com **Expo Router** para as três plataformas.
- **Supabase** (PostgreSQL, Auth e RLS) como backend.
- **TMDB** como fonte de catálogo.
- **pnpm workspaces + Turborepo**, **TanStack Query**, **React Hook Form + Zod**, **Vitest**.

## Estrutura

```text
apps/
  app/          Expo (Web, Android, iOS)
  mcp-server/   Servidor MCP independente
packages/
  ui/ tokens/ types/ database/ tmdb/ auth/ utils/
supabase/
  migrations/ seed.sql
```

## Começando

```bash
pnpm install
cp .env.example .env
pnpm db:start                 # sobe o Supabase local (requer Docker)
pnpm --filter @rewam/app dev
```

`pnpm db:start` imprime as URLs e chaves do stack local — use-as no `.env`. O Studio fica em `http://127.0.0.1:54323` e os e-mails de teste (confirmação, recuperação de senha) chegam no Mailpit, em `http://127.0.0.1:54324`.

Para trabalhar contra o projeto remoto, faça `npx supabase login` e `npx supabase link --project-ref <ref>` uma vez, e troque os valores do `.env` pelos do painel.

## Scripts

| Comando          | O que faz                                                    |
| ---------------- | ------------------------------------------------------------ |
| `pnpm dev`       | Sobe as tarefas de desenvolvimento via Turborepo.            |
| `pnpm lint`      | ESLint em todos os pacotes.                                  |
| `pnpm typecheck` | Checagem de tipos.                                           |
| `pnpm test`      | Vitest.                                                      |
| `pnpm format`    | Prettier.                                                    |
| `pnpm db:start`  | Sobe o Supabase local.                                       |
| `pnpm db:stop`   | Derruba o Supabase local.                                    |
| `pnpm db:status` | Mostra URLs e chaves do stack local.                         |
| `pnpm db:reset`  | Recria o banco local aplicando migrações e seed do zero.     |
| `pnpm db:diff`   | Gera o SQL da diferença entre o banco local e as migrações.  |
| `pnpm db:push`   | Aplica as migrações versionadas no projeto remoto vinculado. |
| `pnpm db:test`   | Roda as verificações de RLS e do trigger de perfil.          |

## Migrações e tipos do banco

Depois de escrever uma migração, regenere os tipos e faça commit do resultado:

```bash
pnpm db:reset                            # aplica as migrações do zero
pnpm --filter @rewam/database gen:types  # regenera packages/database/src/types.generated.ts
pnpm db:test                             # confere RLS e trigger de perfil
```

O CI repete esses passos num job próprio — subindo só os serviços que as verificações usam — e falha se os tipos versionados não corresponderem às migrações, de modo que schema e tipos não saiam de sincronia sem ninguém notar. A versão da CLI do Supabase é fixada exatamente, porque a checagem compara a saída do gerador byte a byte. `types.generated.ts` é arquivo gerado: fica fora do Prettier e do ESLint para bater byte a byte com o gerador — não edite à mão.

## Variáveis de ambiente

Todas documentadas em `.env.example`, sem valores reais. Variáveis `EXPO_PUBLIC_*` são embarcadas no bundle e só podem conter dados públicos: URL do Supabase, chave anônima e token de leitura do TMDB. `SUPABASE_SERVICE_ROLE_KEY` e demais segredos ficam apenas no servidor.

## Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
