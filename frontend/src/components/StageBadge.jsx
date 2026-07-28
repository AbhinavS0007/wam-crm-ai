import { getBuiltinStageStyle } from '../lib/stages.js';

// `label` and `color` are for a custom (non-built-in) stage, resolved by the caller from the
// merged stage list — StageBadge itself never fetches the catalog.
const StageBadge = ({ stage, label, color }) => {
  if (!stage) {
    return null;
  }

  const builtinClassName = getBuiltinStageStyle(stage);
  const displayLabel = label ?? stage;

  if (builtinClassName) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${builtinClassName}`}
      >
        {displayLabel}
      </span>
    );
  }

  // A custom stage: render a light tint of its own color instead of a fixed Tailwind class.
  const tintStyle = color
    ? { backgroundColor: `${color}26`, color }
    : { backgroundColor: '#f1f5f9', color: '#334155' };

  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={tintStyle}>
      {displayLabel}
    </span>
  );
};

export default StageBadge;
