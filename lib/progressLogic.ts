/**
 * Pure server-side watch-progress rules (unit-tested).
 *
 * The client reports its playhead position. We never take that as "watched": validated progress can
 * only advance as fast as real time allows (MAX_PLAYBACK_RATE x seconds since the last report), so
 * seeking to the end or replaying requests cannot fake completion.
 */
export const POINTS_THRESHOLD = 0.9; // 90% watched
export const MAX_PLAYBACK_RATE = 2; // allow up to 2x playback speed
// Credit for any single report is capped to this much elapsed time, so idling (or skipping heartbeats)
// and then reporting a big jump can't bank time.
export const MAX_ELAPSED_SECONDS = 45;

export function advanceValidated(input: {
  validatedSeconds: number;
  reportedPosition: number;
  elapsedSeconds: number;
  durationSeconds: number;
}) {
  const { validatedSeconds, reportedPosition, elapsedSeconds, durationSeconds } = input;
  if (!(durationSeconds > 0) || !Number.isFinite(reportedPosition) || !Number.isFinite(elapsedSeconds)) {
    return validatedSeconds;
  }
  const position = Math.min(Math.max(reportedPosition, 0), durationSeconds);
  const wanted = Math.max(position - validatedSeconds, 0);
  const allowed = Math.min(Math.max(elapsedSeconds, 0), MAX_ELAPSED_SECONDS) * MAX_PLAYBACK_RATE;
  return Math.min(validatedSeconds + Math.min(wanted, allowed), durationSeconds);
}

export function percentWatched(validatedSeconds: number, durationSeconds: number) {
  if (!(durationSeconds > 0)) return 0;
  return Math.min(100, Math.floor((validatedSeconds / durationSeconds) * 100));
}

export function reachedPointsThreshold(validatedSeconds: number, durationSeconds: number) {
  return durationSeconds > 0 && validatedSeconds >= durationSeconds * POINTS_THRESHOLD;
}
