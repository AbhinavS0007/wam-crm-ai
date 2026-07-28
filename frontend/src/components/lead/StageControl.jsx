import { useCallback, useEffect, useState } from 'react';

import { changeStage, listStages } from '../../api/endpoints.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { BUILTIN_STAGES, mergeStages } from '../../lib/stages.js';

const StageControl = ({ conversationId, stage, onStageChange }) => {
  const { authedRequest } = useAuth();
  const [stages, setStages] = useState(mergeStages());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadStages = useCallback(async () => {
    try {
      const payload = await authedRequest((token) => listStages({ token, status: 'active' }));
      setStages(mergeStages(payload?.data ?? []));
    } catch {
      // Falls back to the built-ins only; the picker still works, just without custom stages.
    }
  }, [authedRequest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStages();
  }, [loadStages]);

  // The conversation's current stage might have since been archived — keep it selectable so the
  // dropdown doesn't silently fall back to a different value out from under the user.
  const options =
    stage && !stages.some((option) => option.key === stage)
      ? [...stages, { key: stage, label: stage }]
      : stages;

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
        value={stage ?? BUILTIN_STAGES[0].key}
        onChange={handleChange}
        disabled={saving}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
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
