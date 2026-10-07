import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { commentsApi } from '../api';
import { getErrorMessage } from '../api/client';
import useAuth from '../hooks/useAuth';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import Avatar from './Avatar';
import Pagination from './Pagination';
import Spinner from './Spinner';
import ErrorMessage from './ErrorMessage';
import { timeAgo } from '../utils/format';

function CommentItem({ comment, canManage, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await commentsApi.update(comment._id, { content });
      onUpdated(data);
      setEditing(false);
      toast.success('Comment updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(comment._id);
      onDeleted(comment._id);
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <li className="flex gap-3 py-4">
      <Avatar user={comment.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-800">{comment.author?.name || 'Deleted user'}</span>
          <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-slate-400">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              className="input"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-primary" disabled={saving || !content.trim()} onClick={save}>
                Save
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setContent(comment.content);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
        )}

        {canManage && !editing && (
          <div className="mt-2 flex gap-3 text-xs">
            <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="text-slate-500 hover:text-red-600" onClick={remove}>
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function CommentSection({ postId }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data, meta, loading, error, reload, setData } = usePaginatedQuery(
    (params) => commentsApi.list(postId, params),
    { page, limit: 10, postId },
  );

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await commentsApi.create(postId, { content });
      setContent('');
      toast.success('Comment posted');
      if (page === 1) reload();
      else setPage(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const canManage = (comment) => isAdmin || comment.author?._id === user?._id;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">Comments {meta ? `(${meta.total})` : ''}</h2>

      {isAuthenticated ? (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <textarea
            className="input"
            rows={3}
            placeholder="Share your thoughts…"
            value={content}
            maxLength={2000}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="card p-4 text-sm text-slate-600">
          <Link to="/login" className="font-medium text-brand-600">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      <ErrorMessage message={error} onRetry={reload} />
      {loading ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.length === 0 && <li className="py-6 text-sm text-slate-500">No comments yet.</li>}
          {data.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              canManage={canManage(comment)}
              onUpdated={(updated) =>
                setData((prev) => prev.map((c) => (c._id === updated._id ? updated : c)))
              }
              onDeleted={() => reload()}
            />
          ))}
        </ul>
      )}
      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
