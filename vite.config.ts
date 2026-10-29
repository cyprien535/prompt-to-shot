import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {gateway, streamText} from 'ai';
import {defineConfig} from 'vite';

const readRequestBody = async (request: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'formation-chat-api',
        configureServer(server: any) {
          server.middlewares.use('/api/chat', async (request: any, response: any) => {
            if (request.method !== 'POST') {
              response.statusCode = 405;
              response.end('Method not allowed');
              return;
            }

            try {
              const body = await readRequestBody(request);
              const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
              const result = streamText({
                model: gateway('google/gemini-2.5-flash-lite'),
                system: `Tu es l'assistant officiel de la formation Prompt-to-Pixel Art.
Tu réponds uniquement aux questions sur : la formation, sa méthode, les exercices, les prompts, les visuels IA, le formateur Prophète Jude-Christ Exaucé et le créateur du site MEVI Cyprien.
Réponds en français, avec des conseils concrets et bienveillants. Si la question sort de ce périmètre, dis clairement que tu peux seulement aider au sujet de la formation, du formateur ou du site. Ne prétends jamais être le formateur et n'invente pas de tarifs, dates, résultats ou informations personnelles.`,
                messages,
              });
              response.statusCode = 200;
              response.setHeader('Content-Type', 'text/plain; charset=utf-8');
              response.setHeader('Cache-Control', 'no-cache');
              response.setHeader('X-Content-Type-Options', 'nosniff');
              const text = await result.text;
              response.end(text);
            } catch (error) {
              console.error('[chat-api]', error);
              response.statusCode = 500;
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify({error: 'Le service est temporairement indisponible. Réessaie dans un instant.'}));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
