import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../api';
import CreateProjectModal from '../components/CreateProjectModal';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">{projects.length} total</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New project
          </button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading…</div>
        ) : projects.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">◈</span>
            <div className="empty-title">No projects yet</div>
            <p className="empty-text">Create your first project to start tracking</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => <ProjectRow key={p.id} project={p} />)}
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

function ProjectRow({ project: p }) {
  const pct = p.targetValue > 0
    ? Math.min(100, Math.round((p.currentValue / p.targetValue) * 100))
    : 0;

  return (
    <Link
      to={`/projects/${p.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span className={`project-category cat-${p.category}`}>{p.category}</span>
            <span className="project-title" style={{ fontSize: 16 }}>{p.title}</span>
          </div>
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div
              className={`progress-fill${pct >= 100 ? ' complete' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 60 }}>
          <div className="progress-pct" style={{ fontSize: 20 }}>{pct}%</div>
          <div className="progress-values">{p.currentValue}/{p.targetValue}</div>
        </div>
        <span className={`project-status status-${p.status}`}>{p.status}</span>
      </div>
    </Link>
  );
}
