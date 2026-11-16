// Hands a Blob to the browser as a file download.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvName = (kind, date = new Date()) => `souley-${kind}-${date.toISOString().slice(0, 10)}.csv`;
