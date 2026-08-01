import { describe, expect, it, vi } from 'vitest';

import { AiProviderError, AiProviderNotReadyError } from '../src/modules/ai/ai.errors.js';
import { createGroqProvider } from '../src/modules/ai/providers/groq.provider.js';

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe('createGroqProvider', () => {
  it('throws AiProviderNotReadyError when no API key is configured', async () => {
    const provider = createGroqProvider({ fetchImpl: vi.fn() });

    await expect(
      provider.generateReplyDraft({ systemPrompt: 'sys', threadText: 'thread' }),
    ).rejects.toBeInstanceOf(AiProviderNotReadyError);
  });

  it('calls the Groq chat-completions endpoint and returns the draft text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '  Yes, still available!  ' } }],
      }),
    );

    const provider = createGroqProvider({ apiKey: 'test-key', fetchImpl });

    const result = await provider.generateReplyDraft({
      systemPrompt: 'You are a helpful assistant.',
      threadText: 'Customer: is it available?',
    });

    expect(result).toEqual({ draftText: 'Yes, still available!' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Customer: is it available?' },
    ]);
  });

  it('throws AiProviderError when the API responds with a non-OK status', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'bad request' }, { ok: false, status: 400 }));

    const provider = createGroqProvider({ apiKey: 'test-key', fetchImpl });

    await expect(
      provider.generateReplyDraft({ systemPrompt: 'sys', threadText: 'thread' }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });
});
