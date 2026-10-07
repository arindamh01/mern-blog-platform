import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/Spinner';

export default function OAuthCallback() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    completeOAuth()
      .then((user) => {
        toast.success(`Signed in as ${user.name}`);
        navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
      })
      .catch(() => navigate('/login?error=Social login failed, please try again', { replace: true }));
  }, [completeOAuth, navigate]);

  return <Spinner fullPage label="Completing sign in…" />;
}
