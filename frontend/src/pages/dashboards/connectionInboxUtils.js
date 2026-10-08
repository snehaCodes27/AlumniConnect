export const connectionUser = (record, direction = "incoming") =>
  direction === "sent" ? record.receiver : record.sender;
export const connectionName = (user) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  "Platform member";
export const connectionProfile = (user) =>
  user?.studentProfile || user?.alumniProfile || {};
export function selectConnections(
  records,
  { direction = "incoming", status = "ALL", search = "", sort = "newest" } = {},
) {
  const q = search.trim().toLowerCase();
  return records
    .filter((r) => {
      const user = connectionUser(r, direction),
        p = connectionProfile(user);
      return (
        (status === "ALL" || r.status === status) &&
        (!q ||
          [
            connectionName(user),
            p.domain,
            p.preferredDomain,
            p.branch,
            p.college,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q))
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? connectionName(connectionUser(a, direction)).localeCompare(
            connectionName(connectionUser(b, direction)),
          )
        : sort === "oldest"
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt),
    );
}
