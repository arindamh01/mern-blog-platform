import { useState } from 'react';
import { adminApi } from '../../api';
import usePaginatedQuery from '../../hooks/usePaginatedQuery';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDateTime } from '../../utils/format';

const ACTIONS = [
  'REGISTER',
  'LOGIN',
  'OAUTH_LOGIN',
  'LOGOUT',
  'POST_CREATE',
  'POST_UPDATE',
  'POST_DELETE',
  'POST_RESTORE',
  'COMMENT_CREATE',
  'COMMENT_UPDATE',
  'COMMENT_DELETE',
  'USER_UPDATE',
  'USER_DELETE',
];

const tone = (action) => {
  if (action.endsWith('DELETE')) return 'bg-red-100 text-red-700';
  if (action.endsWith('CREATE') || action === 'REGISTER') return 'bg-emerald-100 text-emerald-700';
  if (action.includes('LOGIN') || action === 'LOGOUT') return 'bg-sky-100 text-sky-700';
  return 'bg-amber-100 text-amber-700';
};

export function ActionBadge({ action }) {
  return <span className={`badge font-mono ${tone(action)}`}>{action}</span>;
}

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, meta, loading, error, reload } = usePaginatedQuery(adminApi.activity, {
    page,
    limit: 20,
    ...(action && { action }),
  });

  const columns = [
    { key: 'action', header: 'Action', render: (l) => <ActionBadge action={l.action} /> },
    {
      key: 'user',
      header: 'User',
      render: (l) =>
        l.user ? (
          <div>
            <div className="text-slate-800">{l.user.name}</div>
            <div className="text-xs text-slate-500">{l.user.email}</div>
          </div>
        ) : (
          <span className="text-slate-400">Deleted user</span>
        ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (l) =>
        l.targetType ? (
          <span className="font-mono text-xs text-slate-500">
            {l.targetType}:{String(l.targetId).slice(-6)}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'ip', header: 'IP', render: (l) => <span className="font-mono text-xs">{l.ip}</span> },
    { key: 'createdAt', header: 'When', render: (l) => formatDateTime(l.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Activity log</h1>
        <select
          className="input w-52"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <ErrorMessage message={error} onRetry={reload} />
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No activity recorded" />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
