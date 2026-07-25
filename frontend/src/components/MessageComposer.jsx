import { useState } from 'react';

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const MessageComposer = ({ onSend }) => {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await onSend({ body: trimmed, idempotencyKey: generateIdempotencyKey() });
      setBody('');
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
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Message"
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
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
