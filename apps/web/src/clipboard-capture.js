export const MAX_CAPTURE_TEXT_CHARS = 100_000;

/**
 * Append text read from the clipboard to a capture draft without silently
 * overwriting existing work or exceeding the UI's capture size limit.
 */
export function appendClipboardText(currentValue, clipboardValue, maxLength = MAX_CAPTURE_TEXT_CHARS) {
  const current = String(currentValue ?? "");
  const incoming = String(clipboardValue ?? "");
  const limit = Math.max(0, Math.floor(Number(maxLength) || 0));
  if (!incoming.trim()) return { ok: false, reason: "empty", text: current, addedChars: 0, truncated: false };
  if (current.length >= limit) return { ok: false, reason: "limit", text: current, addedChars: 0, truncated: false };
  const separator = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  const room = Math.max(0, limit - current.length - separator.length);
  if (room <= 0) return { ok: false, reason: "limit", text: current, addedChars: 0, truncated: false };
  const appended = incoming.slice(0, room);
  return {
    ok: appended.length > 0,
    reason: appended.length > 0 ? "" : "limit",
    text: current + separator + appended,
    addedChars: appended.length,
    truncated: appended.length < incoming.length
  };
}
