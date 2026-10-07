import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { formatDate } from '../utils/format';

export default function PostCard({ post, actions }) {
  return (
    <article className="card p-5 transition hover:shadow-md">
      <div className="mb-3 flex items-center gap-3 text-sm text-slate-500">
        <Avatar user={post.author} size="sm" />
        <span className="font-medium text-slate-700">{post.author?.name || 'Deleted user'}</span>
        <span>·</span>
        <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
        {post.isDeleted && <span className="badge bg-red-100 text-red-700">Deleted</span>}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">
        {post.isDeleted ? (
          post.title
        ) : (
          <Link to={`/posts/${post.slug}`} className="hover:text-brand-600">
            {post.title}
          </Link>
        )}
      </h2>
      {post.excerpt && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {post.excerpt}
          {post.excerpt.length >= 220 && '…'}
        </p>
      )}
      {actions && <div className="mt-4 flex gap-2">{actions}</div>}
    </article>
  );
}
