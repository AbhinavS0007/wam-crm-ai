const EmptyState = ({ title, description }) => (
  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
    <p className="text-base font-semibold text-slate-700">{title}</p>
    {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
  </div>
);

export default EmptyState;
