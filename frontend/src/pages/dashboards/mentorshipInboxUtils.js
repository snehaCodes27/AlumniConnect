export const requestName = (request) =>
  `${request.student?.firstName || ""} ${request.student?.lastName || ""}`.trim() ||
  "Student";
export const requestSkills = (request) => [
  ...new Set([
    ...(request.student?.studentProfile?.skills || []),
    ...(request.student?.studentProfile?.technicalSkills || []),
  ]),
];
export function selectRequests(
  requests,
  { status = "ALL", search = "", sort = "newest" } = {},
) {
  const query = search.trim().toLowerCase();
  return requests
    .filter(
      (request) =>
        (status === "ALL" || request.status === status) &&
        (!query ||
          [requestName(request), request.topic, ...requestSkills(request)]
            .join(" ")
            .toLowerCase()
            .includes(query)),
    )
    .sort((a, b) =>
      sort === "match"
        ? (b.matchScore ?? -1) - (a.matchScore ?? -1)
        : sort === "oldest"
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt),
    );
}
