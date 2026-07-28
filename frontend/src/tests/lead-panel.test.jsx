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
  assignedTo: null,
};

const withAllPermissions = () =>
  endpoints.refresh.mockResolvedValue(
    AUTH_PAYLOAD({
      role: 'admin',
      permissions: [
        PERMISSIONS.CRM_TAGS_MANAGE,
        PERMISSIONS.CRM_TASKS_MANAGE,
        PERMISSIONS.CRM_STAGE_MANAGE,
        PERMISSIONS.CLIENT_PII_REVEAL,
        PERMISSIONS.CONVERSATIONS_READ_ALL,
        PERMISSIONS.CONVERSATIONS_ASSIGN,
      ],
    }),
  );

beforeEach(() => {
  withAllPermissions();
  endpoints.listNotes.mockResolvedValue({ data: [] });
  endpoints.listTags.mockResolvedValue({ data: [] });
  endpoints.listConversationFollowUps.mockResolvedValue({ data: [] });
  endpoints.getActivity.mockResolvedValue({ data: [] });
  endpoints.listUsers.mockResolvedValue({
    data: [
      { id: 'u1', name: 'Asha Menon' },
      { id: 'u2', name: 'Vikram Rao' },
    ],
  });
  endpoints.listStages.mockResolvedValue({ data: [] });
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

    await screen.findByText('Notes');
    expect(screen.queryByRole('button', { name: 'Reveal phone' })).not.toBeInTheDocument();
  });
});

describe('LeadPanel — stage can be applied by anyone with access', () => {
  it('lets a staff member change the stage — applying a stage is not admin-only', async () => {
    endpoints.refresh.mockResolvedValue(
      AUTH_PAYLOAD({
        role: 'staff',
        permissions: [PERMISSIONS.CRM_TASKS_MANAGE, PERMISSIONS.CONVERSATIONS_READ_ASSIGNED],
      }),
    );
    endpoints.changeStage.mockResolvedValue({ data: { ...conversation, stage: 'won' } });

    renderAuthed(<LeadPanel conversation={conversation} contactId="ct1" onStageChange={vi.fn()} />);

    const select = await screen.findByLabelText('Stage');
    fireEvent.change(select, { target: { value: 'won' } });

    await waitFor(() =>
      expect(endpoints.changeStage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'c1', stage: 'won' }),
      ),
    );
  });

  it('includes an admin-created custom stage as a pickable option', async () => {
    endpoints.listStages.mockResolvedValue({
      data: [{ key: 'hot-lead', label: 'Hot Lead', color: '#ff8800', status: 'active' }],
    });

    renderAuthed(<LeadPanel conversation={conversation} contactId="ct1" onStageChange={vi.fn()} />);

    await screen.findByLabelText('Stage');
    expect(await screen.findByRole('option', { name: 'Hot Lead' })).toBeInTheDocument();
  });
});

describe('LeadPanel — assignment', () => {
  it('lists team members and assigns the conversation through the API', async () => {
    endpoints.assignConversation.mockResolvedValue({ data: { assignedTo: 'u2' } });
    const onStageChange = vi.fn();

    renderAuthed(
      <LeadPanel conversation={conversation} contactId="ct1" onStageChange={onStageChange} />,
    );

    const select = await screen.findByLabelText('Assigned to');
    // The member list loads asynchronously after the select itself renders.
    await screen.findByRole('option', { name: 'Asha Menon' });
    expect(screen.getByRole('option', { name: 'Vikram Rao' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'u2' } });

    await waitFor(() =>
      expect(endpoints.assignConversation).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'c1', assignedTo: 'u2' }),
      ),
    );
    expect(select.value).toBe('u2');
  });

  it('unassigns by sending assignedTo: null', async () => {
    endpoints.assignConversation.mockResolvedValue({ data: { assignedTo: null } });

    renderAuthed(
      <LeadPanel
        conversation={{ ...conversation, assignedTo: 'u1' }}
        contactId="ct1"
        onStageChange={vi.fn()}
      />,
    );

    const select = await screen.findByLabelText('Assigned to');
    // Wait for the member options to load — until then there's no <option value="u1">
    // for the select to match, so its reported value briefly falls back to ''.
    await screen.findByRole('option', { name: 'Asha Menon' });
    expect(select.value).toBe('u1');

    fireEvent.change(select, { target: { value: '' } });

    await waitFor(() =>
      expect(endpoints.assignConversation).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'c1', assignedTo: null }),
      ),
    );
  });

  it('hides the assignment control without conversations.assign', async () => {
    endpoints.refresh.mockResolvedValue(
      AUTH_PAYLOAD({
        role: 'staff',
        permissions: [PERMISSIONS.CRM_TASKS_MANAGE, PERMISSIONS.CONVERSATIONS_READ_ASSIGNED],
      }),
    );

    renderAuthed(<LeadPanel conversation={conversation} contactId="ct1" onStageChange={vi.fn()} />);

    await screen.findByText('Notes');
    expect(screen.queryByLabelText('Assigned to')).not.toBeInTheDocument();
    expect(endpoints.listUsers).not.toHaveBeenCalled();
  });
});
