import { useState } from 'react';

import ConversationList from '../components/ConversationList.jsx';
import ConversationView from '../components/ConversationView.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getInitials } from '../lib/format.js';

const AppShell = () => {
  const { user, organization, logout } = useAuth();
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-600">WAM CRM AI</span>
          {organization?.name ? (
            <span className="text-sm text-slate-400">· {organization.name}</span>
          ) : null}
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
    </div>
  );
};

export default AppShell;
