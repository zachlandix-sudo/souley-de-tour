import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import OfflineBanner from '../components/OfflineBanner';
import IntroSplash from '../components/IntroSplash';
import RouteSweep from '../components/RouteSweep';
import CustomCursor from '../components/CustomCursor';
import StickyHeader from '../components/StickyHeader';

export default function MainLayout() {
  const { pathname, state } = useLocation();
  return (
    <div className="site-dark flex min-h-dvh flex-col">
      <IntroSplash />
      <RouteSweep />
      <CustomCursor />
      <OfflineBanner />
      <StickyHeader><Navbar /></StickyHeader>
      <main className="flex-1"><div key={pathname} className={state?.vt ? '' : 'page-enter'}><Outlet /></div></main>
      <footer className="surface-dark border-t border-orange bg-night"><Footer /></footer>
    </div>
  );
}
