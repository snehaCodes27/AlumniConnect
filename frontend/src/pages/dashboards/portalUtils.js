export async function collectPortalPages(fetchPage, key, params = {}) {
  const records = [];
  let page = 1, totalPages = 1;
  do {
    const result = await fetchPage({ ...params, page, limit: 50 });
    if (result?.success === false) throw new Error(result.message || 'Could not load records.');
    records.push(...(result?.data?.[key] || []));
    totalPages = result?.data?.pagination?.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return records;
}

export function eventHasEnded(event, now = Date.now()) {
  return event.status === 'COMPLETED' || new Date(event.endDate || event.startDate).getTime() < now;
}

export function eventRegistrationClosed(event, now = Date.now()) {
  return event.status !== 'PUBLISHED' || eventHasEnded(event, now) || event.isSpotsFull ||
    Boolean(event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now);
}

export function safeExternalUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
