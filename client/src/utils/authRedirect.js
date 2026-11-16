// Where to send someone once they are signed in: staff to /admin, everyone else back to the page they wanted.
export function postLoginPath(user, location) {
  if (['admin', 'editor'].includes(user?.role)) return '/admin';
  const from = location?.state?.from;
  return from?.pathname ? `${from.pathname}${from.search || ''}` : '/';
}
