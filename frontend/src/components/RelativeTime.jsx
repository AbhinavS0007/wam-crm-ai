import { formatRelativeTime } from '../lib/format.js';

const RelativeTime = ({ value, className }) => {
  if (!value) {
    return null;
  }

  return (
    <time dateTime={value} className={className}>
      {formatRelativeTime(value)}
    </time>
  );
};

export default RelativeTime;
