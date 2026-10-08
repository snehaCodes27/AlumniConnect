// Refresh server-owned lists and points only after persistence is confirmed.
export async function saveMentorshipCompletion(id, complete, refresh) {
  const result = await complete(id);
  if (!result.success)
    throw new Error(result.message || "Unable to complete mentorship.");
  await refresh();
  return result;
}
