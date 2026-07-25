import { useState } from 'react';

import { revealPhone } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { hasPermission, PERMISSIONS } from '../../lib/permissions.js';

const RevealPhone = ({ contactId }) => {
  const { authedRequest, permissions } = useAuth();
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!hasPermission(permissions, PERMISSIONS.CLIENT_PII_REVEAL)) {
    return null;
  }

  const handleReveal = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await authedRequest((token) => revealPhone({ token, contactId }));
      setPhone(payload?.data?.phone ?? null);
    } catch (revealError) {
      setError(revealError?.message ?? 'Unable to reveal phone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Phone</p>
      {phone ? (
        <p className="text-sm font-medium text-slate-900">{phone}</p>
      ) : (
        <button
          type="button"
          onClick={handleReveal}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? 'Revealing…' : 'Reveal phone'}
        </button>
      )}
      {phone ? (
        <p className="mt-1 text-[11px] text-slate-400">Revealed — this access is audited.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default RevealPhone;
