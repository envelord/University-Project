import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../api';
import CreateProjectModal from '../components/CreateProjectModal';

const FILTER_OPTS = ['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => filter === 'ALL' || p.status === filter);
  const active = projects.filter(p => p.status === 'ACTIVE').length;
  const completed = projects.filter(p => p.status === 'COMPLETED').length;

  return (
    <>
      <div className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {active} active · {completed} completed
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New project
          </button>
        </div>

        <div className="filter-bar">
          {FILTER_OPTS.map(f => (
            <button
              key={f}
              className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">◈</span>
            <div className="empty-title">
              {projects.length === 0 ? 'No projects yet' : 'No projects match this filter'}
            </div>
            <p className="empty-text">
              {projects.length === 0
                ? 'Create your first project to start tracking progress'
                : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="projects-grid">
            {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </>
  );
}

function ProjectCard({ project: p }) {
  const pct = p.targetValue > 0
    ? Math.min(100, Math.round((p.currentValue / p.targetValue) * 100))
    : 0;

  return (
    <Link to={`/projects/${p.id}`} className="project-card">
      <div className="project-card-header">
        <span className={`project-category cat-${p.category}`}>{p.category}</span>
        <span className={`project-status status-${p.status}`}>{p.status}</span>
      </div>

      <div className="project-title">{p.title}</div>
      {p.description && (
        <p className="project-desc">{p.description}</p>
      )}
      {p.endDate && (
        <div className="enddate-tag">⌛ {p.endDate}</div>
      )}

      <div className="progress-wrap" style={{ marginTop: 20 }}>
        <div className="progress-label">
          <span className="progress-pct">{pct}%</span>
          <span className="progress-values">
            {p.currentValue} / {p.targetValue}
          </span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill${pct >= 100 ? ' complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
