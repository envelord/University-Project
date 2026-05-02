import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getProject, getActivities, getStats,
  deleteProject, archiveProject, deleteActivity,
} from '../api';
import { useToast } from '../hooks/useToast';
import LogActivityModal from '../components/LogActivityModal';
import EditProjectModal from '../components/EditProjectModal';
import IntensityDots from '../components/IntensityDots';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('activities');
  const [showLog, setShowLog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, acts, st] = await Promise.all([
        getProject(id),
        getActivities({ projectId: id }),
        getStats(id),
      ]);
      setProject(p);
      setActivities(acts);
      setStats(st);
    } catch {
      toast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!confirm('Delete this project and all its activities?')) return;
    try {
      await deleteProject(id);
      toast('Project deleted');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleArchive() {
    try {
      const p = await archiveProject(id);
      setProject(p);
      toast('Project archived');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDeleteActivity(actId) {
    try {
      await deleteActivity(actId);
      setActivities(prev => prev.filter(a => a.id !== actId));
      // reload project + stats for fresh numbers
      const [p, st] = await Promise.all([getProject(id), getStats(id)]);
      setProject(p);
      setStats(st);
      toast('Activity removed');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (loading) return <div className="main"><div className="loading"><div className="spinner" /> Loading…</div></div>;
  if (!project) return <div className="main"><p>Project not found.</p></div>;

  const pct = project.targetValue > 0
    ? Math.min(100, Math.round((project.currentValue / project.targetValue) * 100))
    : 0;

  return (
    <>
      <div className="main">
        <Link to="/" className="back-link">← Back to dashboard</Link>

        {/* Top section */}
        <div className="project-detail-top">
          <div className="project-detail-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span className={`project-category cat-${project.category}`}>{project.category}</span>
              <span className={`project-status status-${project.status}`}>{project.status}</span>
            </div>
            <h2>{project.title}</h2>
            {project.description && <p style={{ marginTop: 8 }}>{project.description}</p>}
            {project.endDate && (
              <div className="enddate-tag" style={{ marginTop: 12 }}>⌛ Deadline: {project.endDate}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLog(true)}>
                + Log activity
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>
                Edit
              </button>
            </div>
          </div>

          <div className="project-detail-progress">
            <div className="big-pct">{pct}%</div>
            <div className="big-pct-label">progress</div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                {project.currentValue} / {project.targetValue}
              </div>
            </div>
            <div className="progress-track" style={{ marginTop: 12, width: 140 }}>
              <div
                className={`progress-fill${pct >= 100 ? ' complete' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${tab === 'activities' ? ' active' : ''}`} onClick={() => setTab('activities')}>
            Activities ({activities.length})
          </button>
          <button className={`tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>
            Statistics
          </button>
          <button className={`tab${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>
            Settings
          </button>
        </div>

        {/* Activities tab */}
        {tab === 'activities' && (
          <div>
            {activities.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">📋</span>
                <div className="empty-title">No activities yet</div>
                <p className="empty-text">Log your first activity to start tracking progress</p>
              </div>
            ) : (
              <div className="activity-list">
                {activities.map(a => (
                  <ActivityItem key={a.id} activity={a} onDelete={handleDeleteActivity} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats tab */}
        {tab === 'stats' && stats && (
          <StatsView stats={stats} />
        )}

        {/* Settings tab */}
        {tab === 'settings' && (
          <div>
            <div className="danger-zone">
              <div className="danger-zone-title">Danger zone</div>
              <div className="danger-actions">
                {project.status !== 'ARCHIVED' && (
                  <button className="btn btn-ghost btn-sm" onClick={handleArchive}>
                    Archive project
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                  Delete project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLog && (
        <LogActivityModal
          project={project}
          onClose={() => setShowLog(false)}
          onLogged={() => load()}
        />
      )}

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onUpdated={p => { setProject(p); load(); }}
        />
      )}
    </>
  );
}

function ActivityItem({ activity: a, onDelete }) {
  return (
    <div className="activity-item">
      <span className="activity-date">{a.date}</span>
      <span className="activity-notes">{a.notes || '—'}</span>
      <div className="activity-meta">
        <span>{a.durationMinutes}min</span>
        <IntensityDots value={a.intensity} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="activity-metric">+{a.metricValue}</span>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(a.id)}
          style={{ padding: '4px 10px', fontSize: 11 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function StatsView({ stats }) {
  const maxDist = Math.max(...Object.values(stats.intensityDist), 1);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Day streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.totalMinutes / 60)}h</div>
          <div className="stat-label">Total hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgIntensity}</div>
          <div className="stat-label">Avg intensity</div>
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Progress</div>
        <div className="progress-label">
          <span className="progress-pct">{stats.progress.pct}%</span>
          <span className="progress-values">{stats.progress.current} / {stats.progress.target}</span>
        </div>
        <div className="progress-track" style={{ marginTop: 10 }}>
          <div
            className={`progress-fill${stats.progress.pct >= 100 ? ' complete' : ''}`}
            style={{ width: `${stats.progress.pct}%` }}
          />
        </div>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Activity — last 21 days</div>
        <div className="heatmap">
          {stats.heatmap.map(day => (
            <div key={day.date} className={`heatmap-cell ${day.level}`}>
              <div className="heatmap-tooltip">{day.date}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          {[['none','No activity'],['medium','< 30min'],['high','≥ 30min']].map(([cls, label]) => (
            <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={`heatmap-cell ${cls}`} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Intensity distribution */}
      <div className="card">
        <div className="section-title">Intensity distribution</div>
        <div className="intensity-dist">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="dist-row">
              <span className="dist-label">Level {n}</span>
              <div className="dist-track">
                <div
                  className="dist-fill"
                  style={{ width: `${(stats.intensityDist[n] / maxDist) * 100}%` }}
                />
              </div>
              <span className="dist-count">{stats.intensityDist[n]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
