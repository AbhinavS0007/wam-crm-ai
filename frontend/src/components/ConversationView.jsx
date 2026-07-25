import { useCallback, useEffect, useMemo, useState } from 'react';

import { getConversation, getMessages, sendMessage } from '../api/endpoints.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useRealtime } from '../realtime/RealtimeProvider.jsx';
import EmptyState from './EmptyState.jsx';
import LeadPanel from './lead/LeadPanel.jsx';
import MessageComposer from './MessageComposer.jsx';
import MessageThread from './MessageThread.jsx';
import Spinner from './Spinner.jsx';
import StageBadge from './StageBadge.jsx';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 60000;

// Newest-first, unique by id.
const mergeDesc = (existing, incoming) => {
  const byId = new Map();
  [...existing, ...incoming].forEach((message) => byId.set(message.id, message));

  return [...byId.values()].sort((a, b) => {
    const timeDiff = new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    return timeDiff !== 0 ? timeDiff : b.id.localeCompare(a.id);
  });
};

const ConversationView = ({ conversationId }) => {
  const { authedRequest } = useAuth();
  const { subscribe } = useRealtime();
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [stageOverride, setStageOverride] = useState(null);

  const loadInitial = useCallback(async () => {
    try {
      const [conversationPayload, messagesPayload] = await Promise.all([
        authedRequest((token) => getConversation({ token, conversationId })),
        authedRequest((token) => getMessages({ token, conversationId, limit: PAGE_SIZE })),
      ]);

      const page = messagesPayload?.data ?? [];
      setDetail(conversationPayload?.data ?? null);
      setMessages(page);
      setHasMore(page.length === PAGE_SIZE);
      setError(null);
    } catch (loadError) {
      setError(loadError?.message ?? 'Unable to load conversation.');
    } finally {
      setLoading(false);
    }
  }, [authedRequest, conversationId]);

  const pollLatest = useCallback(async () => {
    try {
      const payload = await authedRequest((token) =>
        getMessages({ token, conversationId, limit: PAGE_SIZE }),
      );
      setMessages((current) => mergeDesc(current, payload?.data ?? []));
    } catch {
      // Polling failures are non-fatal; the next tick retries.
    }
  }, [authedRequest, conversationId]);

  useEffect(() => {
    // Fetch-on-mount: state updates happen after the awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const timer = setInterval(pollLatest, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pollLatest]);

  // Realtime: refetch this thread when its own conversation changes.
  useEffect(
    () =>
      subscribe((event) => {
        if (event?.conversationId === conversationId) {
          pollLatest();
        }
      }),
    [subscribe, conversationId, pollLatest],
  );

  const loadOlder = useCallback(async () => {
    const oldest = messages[messages.length - 1];
    if (!oldest) {
      return;
    }

    setLoadingOlder(true);

    try {
      const payload = await authedRequest((token) =>
        getMessages({
          token,
          conversationId,
          beforeSentAt: oldest.sentAt,
          beforeId: oldest.id,
          limit: PAGE_SIZE,
        }),
      );
      const page = payload?.data ?? [];
      setMessages((current) => mergeDesc(current, page));
      setHasMore(page.length === PAGE_SIZE);
    } catch (olderError) {
      setError(olderError?.message ?? 'Unable to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }, [authedRequest, conversationId, messages]);

  const handleSend = useCallback(
    async ({ body, idempotencyKey }) => {
      const payload = await authedRequest((token) =>
        sendMessage({ token, conversationId, body, idempotencyKey }),
      );

      if (payload?.data) {
        setMessages((current) => mergeDesc(current, [payload.data]));
      }
    },
    [authedRequest, conversationId],
  );

  // Oldest → newest for rendering.
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-100">
        <Spinner label="Loading conversation…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-100">
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      </div>
    );
  }

  const conversation = detail?.conversation;
  const effectiveStage = stageOverride ?? conversation?.stage;
  const contactId = detail?.contact?.id ?? null;

  return (
    <div className="flex min-w-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">{conversation?.displayName}</h2>
            <p className="text-xs text-slate-400">{conversation?.leadId}</p>
          </div>
          <div className="flex items-center gap-3">
            <StageBadge stage={effectiveStage} />
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-pressed={detailsOpen}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {detailsOpen ? 'Hide details' : 'Details'}
            </button>
          </div>
        </header>

        {orderedMessages.length === 0 ? (
          <div className="flex-1 bg-slate-100">
            <EmptyState title="No messages yet" description="Send the first message below." />
          </div>
        ) : (
          <MessageThread
            messages={orderedMessages}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onLoadOlder={loadOlder}
          />
        )}

        <MessageComposer onSend={handleSend} />
      </section>

      {detailsOpen && conversation ? (
        <LeadPanel
          conversation={{ ...conversation, stage: effectiveStage }}
          contactId={contactId}
          onStageChange={setStageOverride}
        />
      ) : null}
    </div>
  );
};

export default ConversationView;
