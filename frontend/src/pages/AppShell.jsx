import { useState } from 'react';

import ChangePasswordGate from '../components/ChangePasswordGate.jsx';
import ConversationList from '../components/ConversationList.jsx';
import ConversationView from '../components/ConversationView.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getInitials } from '../lib/format.js';
import { hasPermission, PERMISSIONS } from '../lib/permissions.js';
import AccountsPage from './AccountsPage.jsx';
import AiKnowledgePage from './AiKnowledgePage.jsx';
import StagesPage from './StagesPage.jsx';
import TeamPage from './TeamPage.jsx';

const NavButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active}
    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
      active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

const AppShell = () => {
  const { user, organization, logout, permissions } = useAuth();
  const [view, setView] = useState('inbox');
  const [selectedId, setSelectedId] = useState(null);
  const canReadAccounts = hasPermission(permissions, PERMISSIONS.ACCOUNTS_READ);
  const canReadUsers = hasPermission(permissions, PERMISSIONS.USERS_READ);
  const canManageStages = hasPermission(permissions, PERMISSIONS.CRM_STAGE_MANAGE);
  const canManageAiKnowledge = hasPermission(permissions, PERMISSIONS.AI_KNOWLEDGE_MANAGE);

  // A temporary password must be replaced before anything else is reachable. The backend
  // enforces this too, so this is UX rather than the security boundary.
  if (user?.mustChangePassword) {
    return <ChangePasswordGate />;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-blue-600">WAM CRM AI</span>
          {organization?.name ? (
            <span className="text-sm text-slate-400">· {organization.name}</span>
          ) : null}
          <nav className="flex items-center gap-1">
            <NavButton active={view === 'inbox'} onClick={() => setView('inbox')}>
              Inbox
            </NavButton>
            {canReadAccounts ? (
              <NavButton active={view === 'accounts'} onClick={() => setView('accounts')}>
                Accounts
              </NavButton>
            ) : null}
            {canReadUsers ? (
              <NavButton active={view === 'team'} onClick={() => setView('team')}>
                Team
              </NavButton>
            ) : null}
            {canManageStages ? (
              <NavButton active={view === 'stages'} onClick={() => setView('stages')}>
                Stages
              </NavButton>
            ) : null}
            {canManageAiKnowledge ? (
              <NavButton active={view === 'ai-knowledge'} onClick={() => setView('ai-knowledge')}>
                Knowledge
              </NavButton>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {getInitials(user?.name)}
            </span>
            <span className="text-sm text-slate-700">{user?.name}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {view === 'accounts' && canReadAccounts ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AccountsPage />
        </div>
      ) : view === 'team' && canReadUsers ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TeamPage />
        </div>
      ) : view === 'stages' && canManageStages ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StagesPage />
        </div>
      ) : view === 'ai-knowledge' && canManageAiKnowledge ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AiKnowledgePage />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
          {selectedId ? (
            <ConversationView key={selectedId} conversationId={selectedId} />
          ) : (
            <div className="flex-1">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation from the list to view its thread."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppShell;
