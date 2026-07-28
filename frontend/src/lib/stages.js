// The 7 permanent built-in stages — never deletable, unaffected by the custom stage catalog.
export const BUILTIN_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'closed', label: 'Closed' },
];

const BUILTIN_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-slate-200 text-slate-600',
};

export const getBuiltinStageStyle = (key) => BUILTIN_STYLES[key] ?? null;

/**
 * Combines the permanent built-ins with an org's custom stages (from `listStages()`) into one
 * list, so the picker (StageControl) and the display (StageBadge) work off a single source.
 * Custom entries keep their `status` and `color` so callers can filter/style as needed.
 */
export const mergeStages = (customStages = []) => [
  ...BUILTIN_STAGES.map((stage) => ({ ...stage, status: 'active', color: null })),
  ...customStages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    color: stage.color,
    status: stage.status,
  })),
];

export const findStageByKey = (stages, key) => stages.find((stage) => stage.key === key) ?? null;
