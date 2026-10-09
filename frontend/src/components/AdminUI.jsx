import React from 'react';
import { PortalDialog } from './PortalUI';
export { PortalDialog as AdminDialog };
export function AdminLoading() {
  return <div className="admin-loading" role="status" aria-label="Loading admin data">{[1, 2, 3].map(i => <div key={i} />)}</div>;
}
export function AdminEmpty({
  children
}) {
  return <div className="admin-empty">{children}</div>;
}
export function AdminError({
  error,
  retry
}) {
  return error && <div className="admin-error" role="alert"><span>{error}</span>{retry && <button onClick={retry}>Retry</button>}</div>;
}
export function AdminPager({
  pagination,
  onPage,
  loading
}) {
  return <nav className="admin-pagination" aria-label="List pages"><button className="admin-secondary" disabled={loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><span>{pagination.total} records · {pagination.page} / {pagination.totalPages}</span><button className="admin-secondary" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Next</button></nav>;
}
