import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotAllowed from '../pages/NotAllowed';

// Children never mount while denied, so no admin data request fires.
export default function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <NotAllowed />;
  return <Outlet />;
}
