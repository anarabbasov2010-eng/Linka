/**
 * Bounded local capture history helpers.
 * These helpers do not persist secrets or call network services.
 */
export const MAX_CAPTURE_HISTORY = 30;

export function cloneCaptureSnapshot(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && typeof item === "object")
    .map(item => ({ ...item, tags: Array.isArray(item.tags) ? [...item.tags] : [] }));
}

export function pushCaptureSnapshot(stack, items, maxCount = MAX_CAPTURE_HISTORY) {
  if (!Array.isArray(stack)) throw new TypeError("Capture history must be an array.");
  const max = Math.max(1, Math.min(100, Math.floor(Number(maxCount) || MAX_CAPTURE_HISTORY)));
  stack.push(cloneCaptureSnapshot(items));
  if (stack.length > max) stack.splice(0, stack.length - max);
  return stack.length;
}

/**
 * Reconcile deletion tombstones when a history snapshot changes the record set.
 * Records removed by undo/redo are marked deleted for cloud sync; records
 * brought back have their tombstone removed so an older cloud copy cannot
 * resurrect over an intentional restore.
 */
export function reconcileDeletedIds(currentCaptures, targetCaptures, deletedIds) {
  const currentIds = new Set(cloneCaptureSnapshot(currentCaptures).map(item => String(item.id || "")).filter(Boolean));
  const targetIds = new Set(cloneCaptureSnapshot(targetCaptures).map(item => String(item.id || "")).filter(Boolean));
  const deleted = new Set(Array.from(deletedIds || [], id => String(id)));
  for (const id of currentIds) if (!targetIds.has(id)) deleted.add(id);
  for (const id of targetIds) deleted.delete(id);
  return [...deleted];
}
