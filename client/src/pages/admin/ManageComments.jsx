import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import usePaginatedQuery from '../../hooks/usePaginatedQuery';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDateTime } from '../../utils/format';

export default function ManageComments() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = usePaginatedQuery(adminApi.comments, {
    page,
    limit: 15,
  });

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await adminApi.deleteComment(comment._id);
      toast.success('Comment deleted');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'content',
      header: 'Comment',
      className: 'max-w-md',
      render: (c) => <p className="line-clamp-2 text-slate-700">{c.content}</p>,
    },
    { key: 'author', header: 'Author', render: (c) => c.author?.name || 'Deleted user' },
    {
      key: 'post',
      header: 'Post',
      render: (c) =>
        !c.post ? (
          <span className="text-slate-400">—</span>
        ) : c.post.isDeleted ? (
          <span className="text-slate-400 line-through">{c.post.title}</span>
        ) : (
          <Link to={`/posts/${c.post.slug}`} className="text-brand-600 hover:underline">
            {c.post.title}
          </Link>
        ),
    },
    { key: 'createdAt', header: 'Posted', render: (c) => formatDateTime(c.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <button type="button" className="btn-ghost px-2 py-1 text-red-600" onClick={() => remove(c)}>
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Comments</h1>
      <ErrorMessage message={error} onRetry={reload} />
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No comments yet" />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
