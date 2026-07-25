const STAGE_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-slate-200 text-slate-600',
};

const StageBadge = ({ stage }) => {
  if (!stage) {
    return null;
  }

  const className = STAGE_STYLES[stage] ?? 'bg-slate-100 text-slate-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${className}`}>
      {stage}
    </span>
  );
};

export default StageBadge;
