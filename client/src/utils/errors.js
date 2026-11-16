export const isNetworkError = (e) => !!e && !e.response;

export function errorMessage(e, fallback = 'Something went wrong. Try again.') {
  if (!e) return '';
  if (isNetworkError(e)) return "Can't reach the server.";
  const d = e.response?.data;
  return d?.errors?.[0]?.message || d?.message || fallback;
}

// API validation errors [{field,message}] -> { field: message }
export function fieldErrors(e) {
  const out = {};
  (e?.response?.data?.errors || []).forEach((x) => {
    if (x?.field && !out[x.field]) out[x.field] = x.message;
  });
  return out;
}
