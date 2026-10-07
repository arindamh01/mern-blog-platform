import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import { timeAgo } from '../utils/format';

export default function NotificationBell() {
  const { items, unreadCount, markAllRead, clear, connected } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = () => {
    setOpen((prev) => !prev);
    if (!open) markAllRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="btn-ghost relative px-2"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-2 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm">
            <span className="font-medium">Notifications</span>
            <span className={`text-xs ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
              {connected ? '● Live' : '○ Offline'}
            </span>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">You're all caught up</li>
            )}
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm">
                {item.postSlug ? (
                  <Link
                    to={`/posts/${item.postSlug}`}
                    className="hover:text-brand-600"
                    onClick={() => setOpen(false)}
                  >
                    {item.message}
                  </Link>
                ) : (
                  item.message
                )}
                <div className="mt-0.5 text-xs text-slate-400">{timeAgo(item.createdAt)}</div>
              </li>
            ))}
          </ul>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="w-full border-t border-slate-100 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
