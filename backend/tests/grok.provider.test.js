import { describe, expect, it, vi } from 'vitest';

import { AiProviderError, AiProviderNotReadyError } from '../src/modules/ai/ai.errors.js';
import { createGrokProvider } from '../src/modules/ai/providers/grok.provider.js';

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe('createGrokProvider', () => {
  it('throws AiProviderNotReadyError when no API key is configured', async () => {
    const provider = createGrokProvider({ fetchImpl: vi.fn() });

    await expect(
      provider.generateReplyDraft({ systemPrompt: 'sys', threadText: 'thread' }),
    ).rejects.toBeInstanceOf(AiProviderNotReadyError);
  });

  it('calls the xAI chat-completions endpoint and returns the draft text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '  Yes, still available!  ' } }],
      }),
    );

    const provider = createGrokProvider({ apiKey: 'test-key', fetchImpl });

    const result = await provider.generateReplyDraft({
      systemPrompt: 'You are a helpful assistant.',
      threadText: 'Customer: is it available?',
    });

    expect(result).toEqual({ draftText: 'Yes, still available!' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.x.ai/v1/chat/completions',
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

    const provider = createGrokProvider({ apiKey: 'test-key', fetchImpl });

    await expect(
      provider.generateReplyDraft({ systemPrompt: 'sys', threadText: 'thread' }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });
});
