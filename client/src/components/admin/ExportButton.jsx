import { useState } from 'react';
import { exportCsv } from '../../services/adminService';
import { csvName, saveBlob } from '../../utils/download';
import { errorMessage } from '../../utils/errors';
import { Icon } from './Icons';

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Downloads the list as a CSV file (opens in Excel / Sheets). `params` are the list's own filters, so what you see is what you get.
export default function ExportButton({ kind, params, label = 'Export CSV', onError }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (busy) return;
    setBusy(true);
    onError?.('');
    try {
      saveBlob(await exportCsv(kind, clean(params)), csvName(kind));
    } catch (e) {
      onError?.(errorMessage(e, 'The export did not work. Try again.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn btn-outline" onClick={go} disabled={busy} aria-busy={busy}>
      <Icon name="download" /> {busy ? 'Preparing…' : label}
    </button>
  );
}
