import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

const DATA_DIR = "./data";
const DB_PATH = "./data/db.json";

const EMPTY_DB = { projects: [], activities: [] };

// ── helpers ──────────────────────────────────────────────────────────────────

function read() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
    return structuredClone(EMPTY_DB);
  }
  const raw = readFileSync(DB_PATH, "utf-8").trim();
  if (!raw) {
    writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
    return structuredClone(EMPTY_DB);
  }
  return JSON.parse(raw);
}

function write(db) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Recalculate project progress based on its activities
function recalc(db, projectId) {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return;

  const acts = db.activities.filter((a) => a.projectId === projectId);
  const total = acts.reduce((sum, a) => sum + (a.metricValue ?? 0), 0);
  project.currentValue = total;

  const pct = project.targetValue > 0 ? total / project.targetValue : 0;

  if (project.status === "ARCHIVED") return;

  if (pct >= 1) {
    project.status = "COMPLETED";
  } else {
    project.status = "ACTIVE";
  }
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────

export function getProjects() {
  return read().projects;
}

export function getProject(id) {
  const db = read();
  const p = db.projects.find((p) => p.id === id);
  if (!p) return null;
  return p;
}

export function createProject({ title, category, description, targetValue, endDate }) {
  const db = read();

  const project = {
    id: uid(),
    title,
    category,
    description: description ?? "",
    targetValue: Number(targetValue),
    currentValue: 0,
    endDate: endDate ?? null,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  db.projects.push(project);
  write(db);
  return project;
}

export function updateProject(id, fields) {
  const db = read();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const allowed = ["title", "targetValue", "endDate", "description"];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      db.projects[idx][key] = key === "targetValue" ? Number(fields[key]) : fields[key];
    }
  }

  recalc(db, id);
  write(db);
  return db.projects[idx];
}

export function archiveProject(id) {
  const db = read();
  const project = db.projects.find((p) => p.id === id);
  if (!project) return null;
  project.status = "ARCHIVED";
  write(db);
  return project;
}

export function deleteProject(id) {
  const db = read();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.projects.splice(idx, 1);
  db.activities = db.activities.filter((a) => a.projectId !== id);
  write(db);
  return true;
}

// ── ACTIVITIES ────────────────────────────────────────────────────────────────

export function getActivities({ projectId, limit } = {}) {
  const db = read();
  let acts = db.activities;
  if (projectId) acts = acts.filter((a) => a.projectId === projectId);
  acts = acts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (limit) acts = acts.slice(0, Number(limit));
  return acts;
}

export function getActivity(id) {
  return read().activities.find((a) => a.id === id) ?? null;
}

export function createActivity({ projectId, durationMinutes, intensity, metricValue, date, notes }) {
  const db = read();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const activity = {
    id: uid(),
    projectId,
    durationMinutes: Number(durationMinutes),
    intensity: Number(intensity),
    metricValue: Number(metricValue),
    date: date ?? new Date().toISOString().slice(0, 10),
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  db.activities.push(activity);
  recalc(db, projectId);
  write(db);
  return activity;
}

export function deleteActivity(id) {
  const db = read();
  const idx = db.activities.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  const { projectId } = db.activities[idx];
  db.activities.splice(idx, 1);
  recalc(db, projectId);
  write(db);
  return true;
}

// ── STATS ─────────────────────────────────────────────────────────────────────

export function getStats(projectId) {
  const db = read();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const acts = db.activities
    .filter((a) => a.projectId === projectId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalMinutes = acts.reduce((s, a) => s + a.durationMinutes, 0);
  const avgIntensity = acts.length
    ? (acts.reduce((s, a) => s + a.intensity, 0) / acts.length).toFixed(1)
    : 0;

  const dateSet = new Set(acts.map((a) => a.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) streak++;
    else break;
  }

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of acts) dist[a.intensity] = (dist[a.intensity] ?? 0) + 1;

  const heatmap = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayActs = acts.filter((a) => a.date === key);
    const totalMin = dayActs.reduce((s, a) => s + a.durationMinutes, 0);
    heatmap.push({
      date: key,
      level: totalMin === 0 ? "none" : totalMin < 30 ? "medium" : "high",
    });
  }

  return {
    totalMinutes,
    avgIntensity: Number(avgIntensity),
    streak,
    intensityDist: dist,
    heatmap,
    progress: {
      current: project.currentValue,
      target: project.targetValue,
      pct: project.targetValue > 0
        ? Math.min(100, Math.round((project.currentValue / project.targetValue) * 100))
        : 0,
    },
  };
}
