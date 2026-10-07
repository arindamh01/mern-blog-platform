import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <p className="text-slate-600">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-2">
        Back home
      </Link>
    </div>
  );
}
