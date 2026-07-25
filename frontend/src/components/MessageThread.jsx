import { formatClockTime } from '../lib/format.js';

const OUTBOUND_STATUS_LABEL = {
  created: 'Pending',
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed — will retry',
  failed_permanent: 'Failed',
};

const MessageBubble = ({ message }) => {
  const isOutbound = message.direction === 'out';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isOutbound ? 'bg-blue-600 text-white' : 'bg-white text-slate-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${
            isOutbound ? 'text-blue-100' : 'text-slate-400'
          }`}
        >
          <span>{formatClockTime(message.sentAt)}</span>
          {isOutbound ? (
            <span>{OUTBOUND_STATUS_LABEL[message.status] ?? message.status}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const MessageThread = ({ messages, hasMore, loadingOlder, onLoadOlder }) => (
  <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-100 p-4">
    {hasMore ? (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onLoadOlder}
          disabled={loadingOlder}
          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {loadingOlder ? 'Loading…' : 'Load older messages'}
        </button>
      </div>
    ) : null}

    {messages.map((message) => (
      <MessageBubble key={message.id} message={message} />
    ))}
  </div>
);

export default MessageThread;
