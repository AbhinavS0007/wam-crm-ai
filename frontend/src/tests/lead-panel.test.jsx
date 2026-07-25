import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LeadPanel from '../components/lead/LeadPanel.jsx';
import * as endpoints from '../api/endpoints.js';
import { PERMISSIONS } from '../lib/permissions.js';
import { AUTH_PAYLOAD, renderAuthed } from './lead-helpers.jsx';

vi.mock('../api/endpoints.js');

const conversation = {
  id: 'c1',
  displayName: 'Riya Sharma',
  leadId: 'LEAD-1',
  stage: 'new',
  tags: [],
};

const withAllPermissions = () =>
  endpoints.refresh.mockResolvedValue(
    AUTH_PAYLOAD({
      role: 'admin',
      permissions: [
        PERMISSIONS.CRM_TAGS_MANAGE,
        PERMISSIONS.CRM_TASKS_MANAGE,
        PERMISSIONS.CLIENT_PII_REVEAL,
        PERMISSIONS.CONVERSATIONS_READ_ALL,
      ],
    }),
  );

beforeEach(() => {
  withAllPermissions();
  endpoints.listNotes.mockResolvedValue({ data: [] });
  endpoints.listTags.mockResolvedValue({ data: [] });
  endpoints.listConversationFollowUps.mockResolvedValue({ data: [] });
  endpoints.getActivity.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeadPanel — stage + reveal', () => {
  it('changes the stage through the API and calls onStageChange', async () => {
    endpoints.changeStage.mockResolvedValue({ data: { ...conversation, stage: 'qualified' } });
    const onStageChange = vi.fn();

    renderAuthed(
      <LeadPanel conversation={conversation} contactId="ct1" onStageChange={onStageChange} />,
    );

    const select = await screen.findByLabelText('Stage');
    fireEvent.change(select, { target: { value: 'qualified' } });

    await waitFor(() =>
      expect(endpoints.changeStage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'c1', stage: 'qualified' }),
      ),
    );
    expect(onStageChange).toHaveBeenCalledWith('qualified');
  });

  it('reveals the phone only after the audited call and never renders it before', async () => {
    endpoints.revealPhone.mockResolvedValue({
      data: { contactId: 'ct1', leadId: 'LEAD-1', phone: '919876500123' },
    });

    const { container } = renderAuthed(
      <LeadPanel conversation={conversation} contactId="ct1" onStageChange={vi.fn()} />,
    );

    const revealButton = await screen.findByRole('button', { name: 'Reveal phone' });
    expect(container.innerHTML).not.toContain('919876500123');

    fireEvent.click(revealButton);

    expect(await screen.findByText('919876500123')).toBeInTheDocument();
    expect(screen.getByText(/audited/i)).toBeInTheDocument();
  });

  it('hides the reveal button without client_pii.reveal', async () => {
    endpoints.refresh.mockResolvedValue(
      AUTH_PAYLOAD({ role: 'staff', permissions: [PERMISSIONS.CRM_TASKS_MANAGE] }),
    );

    renderAuthed(<LeadPanel conversation={conversation} contactId="ct1" onStageChange={vi.fn()} />);

    await screen.findByLabelText('Stage');
    expect(screen.queryByRole('button', { name: 'Reveal phone' })).not.toBeInTheDocument();
  });
});
