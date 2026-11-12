import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceValidated, percentWatched, reachedPointsThreshold } from "../lib/progressLogic";

test("seeking to the end cannot jump progress beyond real time", () => {
  const v = advanceValidated({ validatedSeconds: 0, reportedPosition: 480, elapsedSeconds: 15, durationSeconds: 480 });
  assert.equal(v, 30); // 15s * 2x max
});

test("normal playback advances by what was played", () => {
  const v = advanceValidated({ validatedSeconds: 30, reportedPosition: 45, elapsedSeconds: 15, durationSeconds: 480 });
  assert.equal(v, 45);
});

test("idle time before a report is capped, so it can't be banked", () => {
  const v = advanceValidated({ validatedSeconds: 0, reportedPosition: 480, elapsedSeconds: 600, durationSeconds: 480 });
  assert.equal(v, 90); // 45s cap * 2x
});

test("rewinding or standing still adds nothing; never exceeds duration", () => {
  assert.equal(advanceValidated({ validatedSeconds: 100, reportedPosition: 20, elapsedSeconds: 15, durationSeconds: 480 }), 100);
  assert.equal(advanceValidated({ validatedSeconds: 470, reportedPosition: 999, elapsedSeconds: 40, durationSeconds: 480 }), 480);
});

test("bad input is ignored", () => {
  assert.equal(advanceValidated({ validatedSeconds: 5, reportedPosition: NaN, elapsedSeconds: 10, durationSeconds: 60 }), 5);
  assert.equal(advanceValidated({ validatedSeconds: 5, reportedPosition: 30, elapsedSeconds: 10, durationSeconds: 0 }), 5);
});

test("90% threshold", () => {
  assert.equal(reachedPointsThreshold(53.9, 60), false);
  assert.equal(reachedPointsThreshold(54, 60), true);
  assert.equal(percentWatched(30, 60), 50);
});
