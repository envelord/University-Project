import { useState } from 'react';
import { createActivity } from '../api';
import { useToast } from '../hooks/useToast';

export default function LogActivityModal({ project, onClose, onLogged }) {
  const toast = useToast();
  const [form, setForm] = useState({
    durationMinutes: '',
    intensity: 3,
    metricValue: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const a = await createActivity({
        projectId: project.id,
        durationMinutes: Number(form.durationMinutes),
        intensity: Number(form.intensity),
        metricValue: Number(form.metricValue),
        date: form.date,
        notes: form.notes,
      });
      toast('Activity logged!');
      onLogged(a);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const metricPlaceholder = {
    SKILL: 'e.g. hours practiced',
    FITNESS: 'e.g. km / reps',
    READING: 'e.g. pages read',
  }[project.category] ?? 'value';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Log activity</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={e => set('durationMinutes', e.target.value)}
                placeholder="e.g. 45"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Metric value — {metricPlaceholder}</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="any"
              value={form.metricValue}
              onChange={e => set('metricValue', e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Intensity</label>
            <div className="intensity-slider">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`intensity-option${form.intensity === n ? ' selected' : ''}`}
                  onClick={() => set('intensity', n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="How did it go?"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Log activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
