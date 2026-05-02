import { useState } from 'react';
import { createProject } from '../api';
import { useToast } from '../hooks/useToast';

const CATS = ['SKILL', 'FITNESS', 'READING'];

export default function CreateProjectModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '', category: 'SKILL', description: '',
    targetValue: '', endDate: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await createProject({
        ...form,
        targetValue: Number(form.targetValue),
      });
      toast('Project created!');
      onCreated(p);
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
          <h2 className="modal-title">New project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Learn Rust"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target value</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.targetValue}
                onChange={e => set('targetValue', e.target.value)}
                placeholder="e.g. 100"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What are you working on?"
            />
          </div>

          <div className="form-group">
            <label className="form-label">End date (optional)</label>
            <input
              className="form-input"
              type="date"
              value={form.endDate}
              onChange={e => set('endDate', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
