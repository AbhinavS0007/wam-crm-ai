import { useState } from 'react';

import { changeStage } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed'];

const StageControl = ({ conversationId, stage, onStageChange }) => {
  const { authedRequest } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = async (event) => {
    const nextStage = event.target.value;
    setSaving(true);
    setError(null);

    try {
      const payload = await authedRequest((token) =>
        changeStage({ token, conversationId, stage: nextStage }),
      );
      onStageChange?.(payload?.data?.stage ?? nextStage);
    } catch (changeError) {
      setError(changeError?.message ?? 'Unable to change stage.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="lead-stage"
        className="mb-1 block text-xs font-semibold uppercase text-slate-500"
      >
        Stage
      </label>
      <select
        id="lead-stage"
        value={stage ?? 'new'}
        onChange={handleChange}
        disabled={saving}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm capitalize text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60"
      >
        {STAGES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default StageControl;
