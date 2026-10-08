import { test } from "node:test";
import assert from "node:assert/strict";
import { saveMentorshipCompletion } from "../src/pages/dashboards/menteeCompletion.js";
test("active list and impact refresh wait for backend confirmation", async () => {
  const calls = [];
  let confirm;
  const pending = saveMentorshipCompletion(
    "relationship",
    (id) => {
      calls.push(id);
      return new Promise((resolve) => {
        confirm = resolve;
      });
    },
    async () => calls.push("refresh"),
  );
  assert.deepEqual(calls, ["relationship"]);
  confirm({ success: true });
  await pending;
  assert.deepEqual(calls, ["relationship", "refresh"]);
});
test("rejected or unsuccessful persistence never refreshes away the active card", async () => {
  let refreshed = false;
  const refresh = async () => {
    refreshed = true;
  };
  await assert.rejects(
    saveMentorshipCompletion(
      "relationship",
      async () => ({ success: false, message: "Unable to save" }),
      refresh,
    ),
    /Unable to save/,
  );
  await assert.rejects(
    saveMentorshipCompletion(
      "relationship",
      async () => {
        throw new Error("Network unavailable");
      },
      refresh,
    ),
    /Network unavailable/,
  );
  assert.equal(refreshed, false);
});
