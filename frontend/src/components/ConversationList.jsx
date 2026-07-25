import { useCallback, useEffect, useState } from 'react';

import { listConversations } from '../api/endpoints.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useRealtime } from '../realtime/RealtimeProvider.jsx';
import EmptyState from './EmptyState.jsx';
import RelativeTime from './RelativeTime.jsx';
import Spinner from './Spinner.jsx';
import StageBadge from './StageBadge.jsx';
import UnreadBadge from './UnreadBadge.jsx';

const POLL_INTERVAL_MS = 60000;

const ConversationList = ({ selectedId, onSelect }) => {
  const { authedRequest } = useAuth();
  const { subscribe } = useRealtime();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const payload = await authedRequest((token) => listConversations({ token, limit: 50 }));
      setConversations(payload?.data ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError?.message ?? 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [authedRequest]);

  useEffect(() => {
    // Fetch-on-mount + slow fallback poll: state updates happen after each request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Realtime: refetch the inbox whenever any conversation changes.
  useEffect(() => subscribe(() => load()), [subscribe, load]);

  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-r border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
        <button
          type="button"
          onClick={load}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <Spinner label="Loading conversations…" />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="p-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {!loading && !error && conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Inbound messages will appear here."
          />
        ) : null}

        <ul>
          {conversations.map((conversation) => {
            const isSelected = conversation.id === selectedId;

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={isSelected}
                  className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-900">
                      {conversation.displayName}
                    </span>
                    <RelativeTime
                      value={conversation.lastMessageAt}
                      className="shrink-0 text-xs text-slate-400"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-500">
                      {conversation.lastMessagePreview ?? 'No messages yet'}
                    </span>
                    <UnreadBadge count={conversation.unreadCount} />
                  </div>
                  <StageBadge stage={conversation.stage} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default ConversationList;
