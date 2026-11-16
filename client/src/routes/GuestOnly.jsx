import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { postLoginPath } from '../utils/authRedirect';

// /login and /register are for people who are signed out. Anyone already signed in is sent on.
export default function GuestOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (user) return <Navigate to={postLoginPath(user, location)} replace />;
  return <Outlet />;
}
