import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Loading from '../components/Loading';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import Home from '../pages/Home'; // the landing page stays in the first bundle (it is the LCP page); every other page is its own chunk
import NotFound from '../pages/NotFound';
import RequireAuth from './RequireAuth';
import RequireRole from './RequireRole';
import GuestOnly from './GuestOnly';
// INP (update 66): a page is its own chunk, so the first bundle holds only the layout, the router and Home. Without this a visit to
// /about-dev downloaded and parsed every page and Leaflet as well. Each chunk is also fetched while the browser is idle after the page
// has loaded (prefetchPages), so a click on a link never waits for the network: the click handler only has to render.
const loaders = [];
const page = (load) => { loaders.push(load); return lazy(load); };
const Spots = page(() => import('../pages/Spots'));
const SpotDetails = page(() => import('../pages/SpotDetails'));
const Login = page(() => import('../pages/Login'));
const Register = page(() => import('../pages/Register'));
const Account = page(() => import('../pages/Account'));
const Ask = page(() => import('../pages/Ask'));
const AboutDev = page(() => import('../pages/AboutDev'));
const Food = page(() => import('../pages/Food'));
const Passport = page(() => import('../pages/Passport'));
const Saved = page(() => import('../pages/Saved'));
const Trips = page(() => import('../pages/Trips'));
const Journey = page(() => import('../pages/Journey'));
const Experience = lazy(() => import('../pages/Experience')); // heavy: fetched only when asked for

// Fetch the page chunks one at a time while the browser is idle (never competing with the user's own clicks).
export function prefetchPages() {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 200));
  let i = 0;
  const next = () => { if (i < loaders.length) { loaders[i++]().catch(() => {}); idle(next, { timeout: 4000 }); } };
  idle(next, { timeout: 4000 });
}

const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const SpotsAdmin = lazy(() => import('../pages/admin/SpotsAdmin'));
const SpotForm = lazy(() => import('../pages/admin/SpotForm'));
const CategoriesAdmin = lazy(() => import('../pages/admin/CategoriesAdmin'));
const ReviewsAdmin = lazy(() => import('../pages/admin/ReviewsAdmin'));
const UsersAdmin = lazy(() => import('../pages/admin/UsersAdmin'));
const ContentHealth = lazy(() => import('../pages/admin/ContentHealth'));
const Activity = lazy(() => import('../pages/admin/Activity'));

// Heavy pages (map, 3D/experience, admin) load on demand to keep the first bundle small.
const S = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;

export const routes = [
  {
    // ONE MainLayout for all public and signed-in pages: moving between them (Map <-> Login, Spots <-> Account...)
    // keeps the layout mounted, so the intro splash is not replayed.
    element: <MainLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/spots', element: S(<Spots />) },
      { path: '/map', element: <Navigate to="/spots" replace /> }, // Map and Spots are one page now
      { path: '/experience', element: S(<Experience />) },
      { path: '/ask', element: S(<Ask />) },
      { path: '/about-dev', element: S(<AboutDev />) },
      { path: '/food', element: S(<Food />) },
      { path: '/passport', element: S(<Passport />) },
      { path: '/spots/:slug', element: S(<SpotDetails />) },
      { element: <GuestOnly />, children: [{ path: '/login', element: S(<Login />) }, { path: '/register', element: S(<Register />) }] },
      { element: <RequireAuth />, children: [{ path: '/journey', element: S(<Journey />) }, { path: '/account', element: S(<Account />) }, { path: '/saved', element: S(<Saved />) }, { path: '/trips', element: S(<Trips />) }] },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/admin',
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['admin', 'editor']} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: S(<Dashboard />) },
              { path: 'spots', element: S(<SpotsAdmin />) },
              { path: 'spots/new', element: S(<SpotForm />) },
              { path: 'spots/:id/edit', element: S(<SpotForm />) },
              { path: 'health', element: S(<ContentHealth />) },
              {
                element: <RequireRole roles={['admin']} />,
                children: [
                  { path: 'categories', element: S(<CategoriesAdmin />) },
                  { path: 'reviews', element: S(<ReviewsAdmin />) },
                  { path: 'users', element: S(<UsersAdmin />) },
                  { path: 'activity', element: S(<Activity />) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
