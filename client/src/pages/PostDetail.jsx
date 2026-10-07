import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import useAuth from '../hooks/useAuth';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import CommentSection from '../components/CommentSection';
import { formatDate } from '../utils/format';

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setPost(null);
    setError(null);
    postsApi
      .getBySlug(slug)
      .then((res) => active && setPost(res.data))
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? It can be restored by an admin.')) return;
    try {
      await postsApi.remove(post._id);
      toast.success('Post deleted');
      navigate('/my-posts');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (error) return <ErrorMessage message={error} />;
  if (!post) return <Spinner fullPage />;

  const canManage = isAdmin || post.author?._id === user?._id;
  const edited = post.updatedAt !== post.createdAt;

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-slate-500 hover:text-brand-600">
        ← All posts
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">{post.title}</h1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar user={post.author} />
          <div className="text-sm">
            <div className="font-medium text-slate-800">{post.author?.name}</div>
            <div className="text-slate-500">
              {formatDate(post.createdAt)}
              {edited && ` · Updated ${formatDate(post.updatedAt)}`}
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link to={`/posts/${post.slug}/edit`} className="btn-secondary">
              Edit
            </Link>
            <button type="button" onClick={handleDelete} className="btn-danger">
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap">{post.content}</div>

      <CommentSection postId={post._id} />
    </article>
  );
}
