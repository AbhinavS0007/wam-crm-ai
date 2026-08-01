import { AiProviderError, AiProviderNotReadyError } from '../ai.errors.js';
import { AI_PROVIDER_NAMES, assertAiProvider } from '../ai-provider.interface.js';

const DEFAULT_MODEL = 'grok-3-mini';
const DEFAULT_MAX_OUTPUT_TOKENS = 300;
const XAI_API_BASE_URL = 'https://api.x.ai/v1';

// xAI's Grok API is OpenAI-chat-completions-compatible, so a plain fetch call covers the one
// method this adapter needs — no extra SDK dependency for a single endpoint.
export const createGrokProvider = ({
  apiKey,
  model = DEFAULT_MODEL,
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  fetchImpl = fetch,
} = {}) => {
  return assertAiProvider({
    name: AI_PROVIDER_NAMES.GROK,

    async generateReplyDraft({ systemPrompt, threadText, instructions } = {}) {
      if (!apiKey) {
        throw new AiProviderNotReadyError('XAI_API_KEY is not configured.');
      }

      const userContent = [threadText, instructions].filter(Boolean).join('\n\n');

      const response = await fetchImpl(`${XAI_API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new AiProviderError(`Grok API request failed (${response.status}): ${errorBody}`);
      }

      const payload = await response.json();
      const draftText = payload?.choices?.[0]?.message?.content?.trim() ?? '';

      return { draftText };
    },
  });
};
