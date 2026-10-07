import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AdminRoute, ProtectedRoute } from './ProtectedRoute';

function LoginProbe() {
  const location = useLocation();
  return <div>Login page (from {location.state?.from?.pathname})</div>;
}

function renderAt(path, auth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>Home page</div>} />
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/my-posts" element={<div>My posts page</div>} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div>Admin dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const guest = { loading: false, isAuthenticated: false, isAdmin: false };
const member = { loading: false, isAuthenticated: true, isAdmin: false };
const admin = { loading: false, isAuthenticated: true, isAdmin: true };

describe('ProtectedRoute', () => {
  it('shows a spinner while the session is being restored', () => {
    renderAt('/my-posts', { ...guest, loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects guests to login and remembers where they came from', () => {
    renderAt('/my-posts', guest);
    expect(screen.getByText('Login page (from /my-posts)')).toBeInTheDocument();
  });

  it('renders the page for authenticated users', () => {
    renderAt('/my-posts', member);
    expect(screen.getByText('My posts page')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  it('redirects guests to login', () => {
    renderAt('/admin', guest);
    expect(screen.getByText('Login page (from /admin)')).toBeInTheDocument();
  });

  it('redirects non-admin users home', () => {
    renderAt('/admin', member);
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });

  it('renders the admin page for admins', () => {
    renderAt('/admin', admin);
    expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
  });
});
