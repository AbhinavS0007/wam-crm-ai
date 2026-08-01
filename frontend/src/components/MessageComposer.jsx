import { useState } from 'react';

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const MessageComposer = ({ onSend, onSuggest, canSuggest = false }) => {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState(null);
  // Tracks whether the current text is an unedited AI draft, so the parent can record whether
  // it was sent as-is or edited first (ADR-005's feedback-metadata control).
  const [draftId, setDraftId] = useState(null);
  const [draftText, setDraftText] = useState(null);

  const handleBodyChange = (event) => {
    setBody(event.target.value);
  };

  const handleSuggest = async () => {
    if (suggesting || sending) {
      return;
    }

    setSuggesting(true);
    setError(null);

    try {
      const suggestion = await onSuggest();
      setBody(suggestion.draftText);
      setDraftId(suggestion.draftId);
      setDraftText(suggestion.draftText);
    } catch (suggestError) {
      setError(suggestError?.message ?? 'Unable to suggest a reply.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await onSend({
        body: trimmed,
        idempotencyKey: generateIdempotencyKey(),
        draftId,
        wasEdited: draftId ? trimmed !== draftText : false,
      });
      setBody('');
      setDraftId(null);
      setDraftText(null);
    } catch (sendError) {
      setError(sendError?.message ?? 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Send a message"
      className="border-t border-slate-200 bg-white p-3"
    >
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {canSuggest ? (
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting || sending}
            className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggesting ? 'Suggesting…' : '✨ Suggest reply'}
          </button>
          {draftId ? (
            <span className="text-xs text-slate-400">AI draft — review before sending</span>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Message"
          rows={1}
          value={body}
          onChange={handleBodyChange}
          placeholder="Type a reply…"
          className="max-h-32 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || body.trim() === ''}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
};

export default MessageComposer;
