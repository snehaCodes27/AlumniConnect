import { test } from "node:test";
import assert from "node:assert/strict";
import { selectConnections } from "../src/pages/dashboards/connectionInboxUtils.js";
const records = [
  {
    id: "one",
    status: "PENDING",
    createdAt: "2026-10-01",
    sender: {
      firstName: "Asha",
      lastName: "Rao",
      studentProfile: { branch: "Computer Science", preferredDomain: "Web" },
    },
    receiver: { firstName: "Zoe", lastName: "Shah" },
  },
  {
    id: "two",
    status: "ACCEPTED",
    createdAt: "2026-10-03",
    sender: {
      firstName: "Dev",
      lastName: "Shah",
      alumniProfile: { domain: "Cloud" },
    },
    receiver: { firstName: "Arun", lastName: "Patel" },
  },
  {
    id: "three",
    status: "REJECTED",
    createdAt: "2026-10-02",
    sender: { firstName: "Ben", lastName: "Roy" },
    receiver: { firstName: "Mira", lastName: "Singh" },
  },
];
test("incoming and sent search use the correct participant and profile fields", () => {
  assert.deepEqual(
    selectConnections(records, { search: " asha rao " }).map((r) => r.id),
    ["one"],
  );
  assert.deepEqual(
    selectConnections(records, { search: "cloud", status: "ACCEPTED" }).map(
      (r) => r.id,
    ),
    ["two"],
  );
  assert.equal(
    selectConnections(records, { search: "cloud", status: "PENDING" }).length,
    0,
  );
  assert.deepEqual(
    selectConnections(records, { direction: "sent", search: "Zoe" }).map(
      (r) => r.id,
    ),
    ["one"],
  );
  assert.equal(
    selectConnections(records, { direction: "sent", search: "Asha" }).length,
    0,
  );
});
test("sorts correctly without mutating API data or merging request directions", () => {
  assert.deepEqual(
    selectConnections(records, { sort: "oldest" }).map((r) => r.id),
    ["one", "three", "two"],
  );
  assert.deepEqual(
    selectConnections(records, { sort: "name" }).map((r) => r.id),
    ["one", "three", "two"],
  );
  assert.deepEqual(
    selectConnections(records, { direction: "sent", sort: "name" }).map(
      (r) => r.id,
    ),
    ["two", "three", "one"],
  );
  assert.deepEqual(
    records.map((r) => r.id),
    ["one", "two", "three"],
  );
});
