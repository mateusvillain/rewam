import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTmdbClient } from '@rewam/tmdb';
import { loadEnv } from './env.js';

/**
 * Esqueleto do servidor MCP. As ferramentas de leitura (`search_titles`,
 * `list_recent_watches`, `get_watch_stats`) entram primeiro; as mutáveis
 * (`record_*`, `delete_watch_event`) só depois, com confirmação explícita do host.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const tmdb = createTmdbClient({ readToken: env.TMDB_API_READ_TOKEN });

  const server = new McpServer({
    name: 'rewam',
    version: '0.1.0',
  });

  // Placeholder de sanidade: garante o carregamento do cliente TMDB no boot.
  void tmdb;

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error('Falha ao iniciar o MCP do Rewam:', error);
  process.exitCode = 1;
});
