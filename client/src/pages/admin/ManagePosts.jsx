import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import usePaginatedQuery from '../../hooks/usePaginatedQuery';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDate } from '../../utils/format';

const FILTERS = {
  active: {},
  all: { includeDeleted: 'true' },
  deleted: { onlyDeleted: 'true' },
};

export default function ManagePosts() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, meta, loading, error, reload } = usePaginatedQuery(adminApi.posts, {
    page,
    limit: 10,
    ...FILTERS[filter],
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const run = async (action, message, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await action();
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (p) =>
        p.isDeleted ? (
          <span className="text-slate-500 line-through">{p.title}</span>
        ) : (
          <Link to={`/posts/${p.slug}`} className="font-medium text-slate-800 hover:text-brand-600">
            {p.title}
          </Link>
        ),
    },
    { key: 'author', header: 'Author', render: (p) => p.author?.name || 'Deleted user' },
    { key: 'createdAt', header: 'Created', render: (p) => formatDate(p.createdAt) },
    {
      key: 'status',
      header: 'Status',
      render: (p) =>
        p.isDeleted ? (
          <span className="badge bg-red-100 text-red-700" title={`Deleted ${formatDate(p.deletedAt)}`}>
            Deleted
          </span>
        ) : (
          <span className="badge bg-emerald-100 text-emerald-700">Published</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.isDeleted ? (
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-emerald-700"
              onClick={() => run(() => adminApi.restorePost(p._id), 'Post restored')}
            >
              Restore
            </button>
          ) : (
            <>
              <Link to={`/posts/${p.slug}/edit`} className="btn-ghost px-2 py-1">
                Edit
              </Link>
              <button
                type="button"
                className="btn-ghost px-2 py-1"
                onClick={() => run(() => adminApi.deletePost(p._id), 'Post soft-deleted')}
              >
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-red-600"
            onClick={() =>
              run(
                () => adminApi.purgePost(p._id),
                'Post permanently deleted',
                `Permanently delete "${p.title}" and all its comments? This cannot be undone.`,
              )
            }
          >
            Purge
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Posts</h1>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {Object.keys(FILTERS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 capitalize ${
                filter === key ? 'bg-brand-600 text-white' : 'text-slate-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <ErrorMessage message={error} onRetry={reload} />
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No posts found" />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
