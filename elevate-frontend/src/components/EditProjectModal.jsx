import { useState } from 'react';
import { updateProject } from '../api';
import { useToast } from '../hooks/useToast';

export default function EditProjectModal({ project, onClose, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: project.title,
    description: project.description ?? '',
    targetValue: project.targetValue,
    endDate: project.endDate ?? '',
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await updateProject(project.id, form);
      toast('Project updated!');
      onUpdated(p);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target value</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.targetValue}
                onChange={e => set('targetValue', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End date</label>
              <input
                className="form-input"
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
