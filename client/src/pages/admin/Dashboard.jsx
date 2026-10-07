import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import { ActionBadge } from './ActivityLogs';
import { timeAgo } from '../../utils/format';

function StatCard({ label, value, hint, to }) {
  return (
    <Link to={to} className="card block p-5 transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    adminApi
      .stats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(load, [load]);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!stats) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Platform overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total users"
          value={stats.totalUsers}
          hint={`${stats.totalAdmins} admin${stats.totalAdmins === 1 ? '' : 's'}`}
          to="/admin/users"
        />
        <StatCard
          label="Total posts"
          value={stats.totalPosts}
          hint={`${stats.deletedPosts} soft-deleted`}
          to="/admin/posts"
        />
        <StatCard label="Total comments" value={stats.totalComments} to="/admin/comments" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold">Recent activity</h2>
          <Link to="/admin/activity" className="text-sm text-brand-600">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {stats.recentActivity.length === 0 && (
            <li className="px-5 py-6 text-sm text-slate-500">No activity yet.</li>
          )}
          {stats.recentActivity.map((log) => (
            <li key={log._id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <ActionBadge action={log.action} />
                <span className="text-slate-700">{log.user?.name || 'Deleted user'}</span>
              </div>
              <span className="text-xs text-slate-400">{timeAgo(log.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
