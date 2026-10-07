import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';

export default function MyPosts() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = usePaginatedQuery(postsApi.mine, {
    page,
    limit: 10,
  });

  const handleDelete = async (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      await postsApi.remove(post._id);
      toast.success('Post deleted');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My posts</h1>
        <Link to="/posts/new" className="btn-primary">
          New post
        </Link>
      </div>

      <ErrorMessage message={error} onRetry={reload} />
      {loading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState
          title="You haven't written anything yet"
          action={
            <Link to="/posts/new" className="btn-primary">
              Write your first post
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              actions={
                <>
                  <Link to={`/posts/${post.slug}/edit`} className="btn-secondary">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost text-red-600"
                    onClick={() => handleDelete(post)}
                  >
                    Delete
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
