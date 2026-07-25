/**
 * Incrementally parses an SSE text buffer into complete events.
 *
 * Returns the JSON-parsed `data` payloads of any complete frames (separated by a blank line)
 * plus the leftover `rest` that should be prepended to the next chunk. Comment/heartbeat
 * frames (lines starting with `:`) and frames without a `data:` line are ignored.
 */
export const parseSseBuffer = (buffer) => {
  const events = [];
  let rest = buffer;
  let separatorIndex = rest.indexOf('\n\n');

  while (separatorIndex !== -1) {
    const frame = rest.slice(0, separatorIndex);
    rest = rest.slice(separatorIndex + 2);

    const dataLines = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim());

    if (dataLines.length > 0) {
      try {
        events.push(JSON.parse(dataLines.join('\n')));
      } catch {
        // Ignore malformed frames.
      }
    }

    separatorIndex = rest.indexOf('\n\n');
  }

  return { events, rest };
};
