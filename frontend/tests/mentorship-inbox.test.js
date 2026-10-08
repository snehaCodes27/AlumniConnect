import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectRequests,
  requestSkills,
} from "../src/pages/dashboards/mentorshipInboxUtils.js";
const records = [
  {
    id: "a",
    status: "ACCEPTED",
    createdAt: "2026-10-01",
    matchScore: 0,
    topic: "Interview preparation",
    student: {
      firstName: "Asha",
      lastName: "Rao",
      studentProfile: {
        skills: ["Communication"],
        technicalSkills: ["React", "Communication"],
      },
    },
  },
  {
    id: "b",
    status: "PENDING",
    createdAt: "2026-10-03",
    matchScore: 75,
    topic: "Career roadmap",
    student: { firstName: "Dev", lastName: "Shah" },
  },
  {
    id: "c",
    status: "COMPLETED",
    createdAt: "2026-10-02",
    topic: "Interview preparation",
  },
];
test("search combines status with case-insensitive names, topics, and technical skills", () => {
  assert.deepEqual(
    selectRequests(records, { search: "  REACT ", status: "ACCEPTED" }).map(
      (r) => r.id,
    ),
    ["a"],
  );
  assert.deepEqual(
    selectRequests(records, { search: "asha rao" }).map((r) => r.id),
    ["a"],
  );
  assert.deepEqual(
    selectRequests(records, { search: "interview", status: "PENDING" }),
    [],
  );
});
test("sorts do not mutate API records and distinguish zero score from missing score", () => {
  assert.deepEqual(
    selectRequests(records, { sort: "match" }).map((r) => r.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    selectRequests(records, { sort: "oldest" }).map((r) => r.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    selectRequests(records).map((r) => r.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    records.map((r) => r.id),
    ["a", "b", "c"],
  );
});
test("completed records remain visible; skills tolerate absent profiles and deduplicate", () => {
  assert.deepEqual(
    selectRequests(records, { status: "COMPLETED" }).map((r) => r.id),
    ["c"],
  );
  assert.deepEqual(requestSkills(records[0]), ["Communication", "React"]);
  assert.deepEqual(requestSkills(records[2]), []);
});
