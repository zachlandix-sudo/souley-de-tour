import { useOnline } from '../hooks/useOnline';

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="bg-orange px-4 py-2 text-center text-sm font-semibold text-black">
      You are offline. Showing saved pages and spots; new reviews, AI and sign-in need a connection.
    </div>
  );
}
