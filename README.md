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
pnpm --filter @rewam/app dev
```

## Scripts

| Comando          | O que faz                                         |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Sobe as tarefas de desenvolvimento via Turborepo. |
| `pnpm lint`      | ESLint em todos os pacotes.                       |
| `pnpm typecheck` | Checagem de tipos.                                |
| `pnpm test`      | Vitest.                                           |
| `pnpm format`    | Prettier.                                         |

## Variáveis de ambiente

Todas documentadas em `.env.example`, sem valores reais. Variáveis `EXPO_PUBLIC_*` são embarcadas no bundle e só podem conter dados públicos: URL do Supabase, chave anônima e token de leitura do TMDB. `SUPABASE_SERVICE_ROLE_KEY` e demais segredos ficam apenas no servidor.

## Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
