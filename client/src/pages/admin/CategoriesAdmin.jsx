import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../services/categoryService';
import { useLoader } from '../../hooks/useLoader';
import { errorMessage } from '../../utils/errors';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusPill from '../../components/admin/StatusPill';
import { Icon } from '../../components/admin/Icons';
import { categoryGlyph } from '../../utils/categoryGlyph';

const load = () => listCategories();
const input = 'field mt-1.5 normal-case tracking-normal font-normal text-base';

export default function CategoriesAdmin() {
  const { data, loading, error, reload } = useLoader(load, []);
  const [banner, setBanner] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | category
  const [form, setForm] = useState({ name: '', description: '', icon: '', displayOrder: 0, isActive: true });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (c) => {
    setEditing(c);
    setFormError('');
    setForm(c._id ? { name: c.name, description: c.description || '', icon: c.icon || '', displayOrder: c.displayOrder ?? 0, isActive: c.isActive !== false } : { name: '', description: '', icon: '', displayOrder: 0, isActive: true });
  };

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) return setFormError('Name required.');
    setSaving(true);
    setFormError('');
    try {
      const body = { ...form, name: form.name.trim(), displayOrder: Number(form.displayOrder) || 0 };
      if (editing._id) await updateCategory(editing._id, body); else await createCategory(body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  async function remove(c) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    setBanner('');
    try { await deleteCategory(c._id); reload(); } catch (err) { setBanner(errorMessage(err)); }
  }

  const rows = data || [];
  return (
    <div>
      <AdminHeader eyebrow="Content" title="Categories" subtitle="The groups that visitors filter by, such as Waterfalls or Beaches.">
        <button type="button" onClick={() => open({})} className="btn btn-dark"><Icon name="plus" /> Add category</button>
      </AdminHeader>
      <Banner>{banner}</Banner>
      {loading && !data && <Loading />}
      {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
      {!error && data && rows.length === 0 && <EmptyState title="No categories yet." />}
      {!error && rows.length > 0 && (
        <div className="adm-card adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Active</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {rows.map((c, n) => (
                <tr key={c._id} className="adm-row" style={{ '--n': Math.min(n, 12) }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f6f3ee] font-display text-lg text-ember">{categoryGlyph(c.icon) || String(c.name || '?').charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 truncate font-display text-lg leading-tight">{c.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{c.slug}</td>
                  <td>{c.displayOrder}</td>
                  <td><StatusPill status={c.isActive === false ? 'archived' : 'active'} label={c.isActive === false ? 'Inactive' : 'Active'} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => open(c)} className="adm-icon-btn" aria-label={`Edit ${c.name}`} title="Edit"><Icon name="edit" /></button>
                      <button type="button" onClick={() => remove(c)} className="adm-icon-btn adm-icon-btn-danger" aria-label={`Delete ${c.name}`} title="Delete"><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Drawn on <body>: the page fade-in on the admin content would otherwise make this "fixed" box fit the content area only. */}
      {editing && createPortal(
        <div className="adm-modal-back fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={editing._id ? 'Edit category' : 'Add category'}>
          <form onSubmit={save} noValidate className="adm-modal w-full max-w-md space-y-4 border-t-2 border-orange bg-white p-7">
            <h2 className="font-display text-2xl">{editing._id ? 'Edit category' : 'Add category'}</h2>
            <label className="adm-label">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
            <label className="adm-label">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="adm-label">Icon (emoji)<input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={input} /></label>
              <label className="adm-label">Display order<input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className={input} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <Banner>{formError}</Banner>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-dark">{saving ? 'Saving…' : 'Save category'}</button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
