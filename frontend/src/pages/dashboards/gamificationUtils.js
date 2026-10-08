export function levelProgress(points, level) {
  const start = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { start, next, percent: Math.max(0, Math.min(100, Math.floor((points - start) / (next - start) * 100))) };
}
export function mentorshipImpact(requests) {
  const helped = requests.filter(r => ['ACCEPTED', 'COMPLETED'].includes(r.status));
  return { completed: requests.filter(r => r.status === 'COMPLETED').length,
    students: new Set(helped.map(r => r.studentId || r.student?.id).filter(Boolean)).size };
}
export function badgeRequirement(badge) {
  const category = { MENTOR_INITIATE: 'mentorship', MENTOR_MAESTRO: 'mentorship', OPPORTUNITY_CREATOR: 'career', WEBINAR_MASTER: 'webinar', COMMUNITY_PILLAR: 'community', NETWORK_BUILDER: 'connection', GUIDING_LIGHT: 'total impact' }[badge.code] || 'total impact';
  return `${badge.pointsRequired} ${category} points`;
}
