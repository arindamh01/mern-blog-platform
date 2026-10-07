import { initials } from '../utils/format';

export default function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  const className = `${sizes[size]} shrink-0 rounded-full`;

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={`${className} flex items-center justify-center bg-brand-100 font-semibold text-brand-700`}
    >
      {initials(user?.name || '?')}
    </span>
  );
}
