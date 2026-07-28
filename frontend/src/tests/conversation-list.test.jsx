import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App.jsx';
import * as endpoints from '../api/endpoints.js';

vi.mock('../api/endpoints.js');

const authPayload = {
  data: {
    accessToken: 'access-token-1',
    user: { id: 'u1', name: 'Asha Menon' },
    organization: { id: 'o1', name: 'Acme' },
    permissions: ['conversations.read_all'],
  },
};

const conversations = [
  {
    id: 'c1',
    displayName: 'Riya Sharma',
    stage: 'qualified',
    unreadCount: 3,
    lastMessagePreview: 'Is the flat still available?',
    lastMessageAt: new Date().toISOString(),
    leadId: 'LEAD-20260724-ABC123',
  },
  {
    id: 'c2',
    displayName: 'WhatsApp Lead',
    stage: 'new',
    unreadCount: 0,
    lastMessagePreview: 'Hello',
    lastMessageAt: new Date().toISOString(),
    leadId: 'LEAD-20260724-DEF456',
  },
];

beforeEach(() => {
  endpoints.refresh.mockResolvedValue(authPayload);
  endpoints.listConversations.mockResolvedValue({ data: conversations });
  endpoints.getConversation.mockResolvedValue({
    data: {
      conversation: conversations[0],
      contact: { id: 'ct1', leadId: 'LEAD-20260724-ABC123' },
    },
  });
  endpoints.getMessages.mockResolvedValue({
    data: [
      {
        id: 'm2',
        direction: 'out',
        body: 'Yes it is available.',
        status: 'sent',
        sentAt: new Date().toISOString(),
      },
      {
        id: 'm1',
        direction: 'in',
        body: 'Is the flat still available?',
        status: 'received',
        sentAt: new Date(Date.now() - 60000).toISOString(),
      },
    ],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('inbox and thread', () => {
  it('renders conversations with unread and stage, and opens a thread on select', async () => {
    render(<App />);

    const [riyaRow] = await screen.findAllByText('Riya Sharma');
    expect(riyaRow).toBeInTheDocument();
    expect(screen.getByText('Qualified')).toBeInTheDocument();
    expect(screen.getByLabelText('3 unread')).toBeInTheDocument();

    fireEvent.click(riyaRow);

    await waitFor(() =>
      expect(endpoints.getMessages).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'c1' }),
      ),
    );

    // The outbound message body and its status label are unique to the thread.
    expect(await screen.findByText('Yes it is available.')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('never renders a phone field from conversation data', async () => {
    const { container } = render(<App />);
    await screen.findAllByText('Riya Sharma');
    expect(container.innerHTML).not.toMatch(/phone/i);
  });

  it('sends a reply with a generated idempotency key and clears the composer', async () => {
    endpoints.sendMessage.mockResolvedValue({
      data: {
        id: 'm3',
        direction: 'out',
        body: 'On my way',
        status: 'queued',
        sentAt: new Date().toISOString(),
      },
      meta: { queued: true },
    });

    render(<App />);
    const [riyaRow] = await screen.findAllByText('Riya Sharma');
    fireEvent.click(riyaRow);

    const input = await screen.findByLabelText('Message');
    fireEvent.change(input, { target: { value: 'On my way' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(endpoints.sendMessage).toHaveBeenCalledTimes(1));
    const sendArgs = endpoints.sendMessage.mock.calls[0][0];
    expect(sendArgs).toMatchObject({ conversationId: 'c1', body: 'On my way' });
    expect(sendArgs.idempotencyKey).toMatch(/[0-9a-f-]{8,}/i);

    await waitFor(() => expect(input).toHaveValue(''));
  });
});
