import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postsApi } from '../api';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useAuth from '../hooks/useAuth';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebouncedValue(search.trim());

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        if (debouncedSearch !== (prev.get('q') || '')) next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const { data, meta, loading, error, reload } = usePaginatedQuery(postsApi.list, {
    page,
    limit: 8,
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const goToPage = (nextPage) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });

  return (
    <div>
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Latest stories</h1>
          <p className="mt-1 text-slate-500">Ideas and tutorials from the community.</p>
        </div>
        <input
          type="search"
          className="input sm:w-72"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search posts"
        />
      </section>

      <ErrorMessage message={error} onRetry={reload} />

      {loading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No posts match your search' : 'No posts yet'}
          description={debouncedSearch ? 'Try a different keyword.' : 'Be the first to write one!'}
          action={
            isAuthenticated && (
              <Link to="/posts/new" className="btn-primary">
                Write a post
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={goToPage} />
    </div>
  );
}
