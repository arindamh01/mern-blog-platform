import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import useAuth from '../../hooks/useAuth';
import usePaginatedQuery from '../../hooks/usePaginatedQuery';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDate } from '../../utils/format';

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, meta, loading, error, reload, setData } = usePaginatedQuery(adminApi.users, {
    page,
    limit: 10,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(role && { role }),
  });

  const update = async (user, changes, message) => {
    try {
      const { data: updated } = await adminApi.updateUser(user._id, changes);
      setData((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      toast.success(message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Delete ${user.name}? Their posts will be soft-deleted and comments removed.`))
      return;
    try {
      await adminApi.deleteUser(user._id);
      toast.success('User deleted');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar user={u} size="sm" />
          <div>
            <div className="font-medium text-slate-800">{u.name}</div>
            <div className="text-xs text-slate-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (u) => <span className="capitalize text-slate-600">{u.provider}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <select
          className="input w-auto py-1"
          value={u.role}
          disabled={u._id === me._id}
          onChange={(e) => update(u, { role: e.target.value }, `Role changed to ${e.target.value}`)}
          aria-label={`Role for ${u.name}`}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <span
          className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
        >
          {u.isActive ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) =>
        u._id === me._id ? (
          <span className="text-xs text-slate-400">You</span>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost px-2 py-1"
              onClick={() =>
                update(u, { isActive: !u.isActive }, u.isActive ? 'User deactivated' : 'User activated')
              }
            >
              {u.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button type="button" className="btn-ghost px-2 py-1 text-red-600" onClick={() => remove(u)}>
              Delete
            </button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input sm:w-40"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <ErrorMessage message={error} onRetry={reload} />
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No users found" />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
