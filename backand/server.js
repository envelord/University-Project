import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

const readDB = () => JSON.parse(readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

const ALLOWED_CATEGORIES = ['SKILL', 'FITNESS', 'READING'];
const ALLOWED_STATUSES   = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
const UNIT_MAP = { SKILL: 'chapters', FITNESS: 'sessions', READING: 'books' };

function getUnsupportedKeys(body, allowedKeys) {
  return Object.keys(body).filter(k => !allowedKeys.includes(k));
}

function validateDtoIn(body, rules) {
  const invalidTypeKeyMap = {};
  const invalidValueKeyMap = {};
  const missingKeyMap = {};

  for (const [key, rule] of Object.entries(rules)) {
    const value = body[key];
    if (rule.required && (value === undefined || value === null || value === '')) {
      missingKeyMap[key] = `Field "${key}" is required`;
      continue;
    }
    if (value === undefined || value === null) continue;
    if (rule.type === 'string' && typeof value !== 'string') {
      invalidTypeKeyMap[key] = `Field "${key}" must be a string`; continue;
    }
    if (rule.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) { invalidTypeKeyMap[key] = `Field "${key}" must be a number`; continue; }
      if (rule.min !== undefined && num < rule.min) invalidValueKeyMap[key] = `Field "${key}" must be >= ${rule.min}`;
      if (rule.max !== undefined && num > rule.max) invalidValueKeyMap[key] = `Field "${key}" must be <= ${rule.max}`;
    }
    if (rule.type === 'string') {
      if (rule.minLength && value.length < rule.minLength) invalidValueKeyMap[key] = `Field "${key}" must be at least ${rule.minLength} characters`;
      if (rule.maxLength && value.length > rule.maxLength) invalidValueKeyMap[key] = `Field "${key}" must be at most ${rule.maxLength} characters`;
      if (rule.enum && !rule.enum.includes(value)) invalidValueKeyMap[key] = `Field "${key}" must be one of: ${rule.enum.join(', ')}`;
    }
    if (rule.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalidValueKeyMap[key] = `Field "${key}" must be YYYY-MM-DD`;
      else if (rule.notFuture && value > new Date().toISOString().split('T')[0]) invalidValueKeyMap[key] = `Field "${key}" cannot be a future date`;
    }
  }
  return { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap };
}

function hasErrors(r) {
  return Object.keys(r.invalidTypeKeyMap).length > 0 || Object.keys(r.invalidValueKeyMap).length > 0 || Object.keys(r.missingKeyMap).length > 0;
}

function paginate(items, query) {
  const pageIndex = Math.max(0, parseInt(query.pageIndex) || 0);
  const pageSize  = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10));
  const total = items.length;
  const paged = items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  return { itemList: paged, pageInfo: { pageIndex, pageSize, total } };
}

// ═══════════════════════════════════════════════════════════
//  PROJECT endpoints
// ═══════════════════════════════════════════════════════════

// project/list   GET /api/projects
app.get('/api/projects', (req, res) => {
  const db = readDB();
  const warnings = [];
  const allowedQuery = ['pageIndex', 'pageSize', 'status'];
  const uk = Object.keys(req.query).filter(k => !allowedQuery.includes(k));
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.',
      invalidTypeKeyMap: {}, missingKeyMap: {},
      invalidValueKeyMap: { status: `Must be one of: ${ALLOWED_STATUSES.join(', ')}` }
    });
  }

  let items = req.query.status ? db.projects.filter(p => p.status === req.query.status) : [...db.projects];
  const result = paginate(items, req.query);
  res.json({ ...result, ...(warnings.length && { warnings }) });
});

// project/get   GET /api/projects/:id
app.get('/api/projects/:id', (req, res) => {
  const db = readDB();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: req.params.id });
  res.json(project);
});

// project/create   POST /api/projects
app.post('/api/projects', (req, res) => {
  const db = readDB();
  const body = req.body;
  const warnings = [];

  const allowedKeys = ['title', 'category', 'description', 'targetValue', 'endDate', 'unit'];
  const uk = getUnsupportedKeys(body, allowedKeys);
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  const v = validateDtoIn(body, {
    title:       { required: true,  type: 'string', minLength: 3, maxLength: 100 },
    category:    { required: true,  type: 'string', enum: ALLOWED_CATEGORIES },
    description: { required: false, type: 'string', maxLength: 500 },
    targetValue: { required: true,  type: 'number', min: 1, max: 10000 },
    endDate:     { required: false, type: 'date' },
  });
  if (hasErrors(v)) return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.', ...v });

  if (body.endDate && body.endDate < new Date().toISOString().split('T')[0]) {
    return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.',
      invalidTypeKeyMap: {}, missingKeyMap: {}, invalidValueKeyMap: { endDate: 'End date cannot be in the past' }
    });
  }

  const project = {
    id: uuidv4(), title: body.title, category: body.category, description: body.description || '',
    targetValue: parseInt(body.targetValue), currentValue: 0,
    startDate: new Date().toISOString().split('T')[0], endDate: body.endDate || null,
    status: 'ACTIVE', unit: body.unit || UNIT_MAP[body.category] || 'units',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };

  db.projects.push(project);
  writeDB(db);
  res.status(201).json({ ...project, ...(warnings.length && { warnings }) });
});

// project/update   PUT /api/projects/:id
app.put('/api/projects/:id', (req, res) => {
  const db = readDB();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: req.params.id });

  const body = req.body;
  const warnings = [];
  const allowedKeys = ['title', 'targetValue', 'endDate', 'status'];
  const uk = getUnsupportedKeys(body, allowedKeys);
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  const v = validateDtoIn(body, {
    title:       { required: false, type: 'string', minLength: 3, maxLength: 100 },
    targetValue: { required: false, type: 'number', min: 1, max: 10000 },
    endDate:     { required: false, type: 'date' },
    status:      { required: false, type: 'string', enum: ALLOWED_STATUSES },
  });
  if (hasErrors(v)) return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.', ...v });

  const updated = { ...db.projects[idx] };
  if (body.title !== undefined)       updated.title = body.title;
  if (body.targetValue !== undefined) updated.targetValue = parseInt(body.targetValue);
  if (body.endDate !== undefined)     updated.endDate = body.endDate || null;
  if (body.status !== undefined)      updated.status = body.status;
  updated.updatedAt = new Date().toISOString();

  if (updated.currentValue >= updated.targetValue && updated.status === 'ACTIVE') updated.status = 'COMPLETED';

  db.projects[idx] = updated;
  writeDB(db);
  res.json({ ...updated, ...(warnings.length && { warnings }) });
});

// project/delete   DELETE /api/projects/:id
app.delete('/api/projects/:id', (req, res) => {
  const db = readDB();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: req.params.id });

  const projectId = req.params.id;
  db.projects.splice(idx, 1);
  const deletedActivitiesCount = db.activities.filter(a => a.projectId === projectId).length;
  db.activities = db.activities.filter(a => a.projectId !== projectId);
  writeDB(db);
  res.json({ deleted: true, deletedActivitiesCount });
});

// ═══════════════════════════════════════════════════════════
//  ACTIVITY endpoints
// ═══════════════════════════════════════════════════════════

// activity/list   GET /api/activities
app.get('/api/activities', (req, res) => {
  const db = readDB();
  const warnings = [];
  const allowedQuery = ['projectId', 'pageIndex', 'pageSize'];
  const uk = Object.keys(req.query).filter(k => !allowedQuery.includes(k));
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  let items = [...db.activities];
  if (req.query.projectId) {
    const exists = db.projects.some(p => p.id === req.query.projectId);
    if (!exists) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: req.query.projectId });
    items = items.filter(a => a.projectId === req.query.projectId);
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const result = paginate(items, req.query);
  res.json({ ...result, ...(warnings.length && { warnings }) });
});

// activity/get   GET /api/activities/:id
app.get('/api/activities/:id', (req, res) => {
  const db = readDB();
  const activity = db.activities.find(a => a.id === req.params.id);
  if (!activity) return res.status(404).json({ code: 'activityNotFound', message: 'Activity with given id does not exist.', id: req.params.id });
  res.json(activity);
});

// activity/create   POST /api/activities
app.post('/api/activities', (req, res) => {
  const db = readDB();
  const body = req.body;
  const warnings = [];

  const allowedKeys = ['projectId', 'duration', 'intensity', 'date', 'notes', 'metricValue'];
  const uk = getUnsupportedKeys(body, allowedKeys);
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  const v = validateDtoIn(body, {
    projectId:   { required: true,  type: 'string' },
    duration:    { required: true,  type: 'number', min: 1, max: 480 },
    intensity:   { required: true,  type: 'number', min: 1, max: 5 },
    date:        { required: true,  type: 'date', notFuture: true },
    notes:       { required: false, type: 'string', maxLength: 300 },
    metricValue: { required: true,  type: 'number', min: 0 },
  });
  if (hasErrors(v)) return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.', ...v });

  const project = db.projects.find(p => p.id === body.projectId);
  if (!project) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: body.projectId });
  if (project.status !== 'ACTIVE') return res.status(422).json({ code: 'projectNotActive', message: 'Cannot log activity for a project that is not ACTIVE.', status: project.status });

  const activity = {
    id: uuidv4(), projectId: body.projectId, duration: parseInt(body.duration),
    intensity: parseInt(body.intensity), date: body.date, notes: body.notes || '',
    metricValue: parseInt(body.metricValue) || 0, createdAt: new Date().toISOString()
  };

  db.activities.push(activity);
  const projIdx = db.projects.findIndex(p => p.id === body.projectId);
  db.projects[projIdx].currentValue += activity.metricValue;
  if (db.projects[projIdx].currentValue >= db.projects[projIdx].targetValue) db.projects[projIdx].status = 'COMPLETED';
  db.projects[projIdx].updatedAt = new Date().toISOString();

  writeDB(db);
  res.status(201).json({ activity, project: db.projects[projIdx], ...(warnings.length && { warnings }) });
});

// activity/update   PUT /api/activities/:id
app.put('/api/activities/:id', (req, res) => {
  const db = readDB();
  const idx = db.activities.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ code: 'activityNotFound', message: 'Activity with given id does not exist.', id: req.params.id });

  const body = req.body;
  const warnings = [];
  const allowedKeys = ['duration', 'intensity', 'date', 'notes', 'metricValue'];
  const uk = getUnsupportedKeys(body, allowedKeys);
  if (uk.length) warnings.push({ code: 'unsupportedKeys', message: 'DtoIn contains unsupported keys.', unsupportedKeyList: uk });

  const v = validateDtoIn(body, {
    duration:    { required: false, type: 'number', min: 1, max: 480 },
    intensity:   { required: false, type: 'number', min: 1, max: 5 },
    date:        { required: false, type: 'date', notFuture: true },
    notes:       { required: false, type: 'string', maxLength: 300 },
    metricValue: { required: false, type: 'number', min: 0 },
  });
  if (hasErrors(v)) return res.status(400).json({ code: 'invalidDtoIn', message: 'DtoIn is not valid.', ...v });

  const oldMetric = db.activities[idx].metricValue;
  const newMetric = body.metricValue !== undefined ? parseInt(body.metricValue) : oldMetric;
  const diff = newMetric - oldMetric;

  const updated = { ...db.activities[idx] };
  if (body.duration    !== undefined) updated.duration    = parseInt(body.duration);
  if (body.intensity   !== undefined) updated.intensity   = parseInt(body.intensity);
  if (body.date        !== undefined) updated.date        = body.date;
  if (body.notes       !== undefined) updated.notes       = body.notes;
  if (body.metricValue !== undefined) updated.metricValue = newMetric;
  db.activities[idx] = updated;

  const projIdx = db.projects.findIndex(p => p.id === updated.projectId);
  if (projIdx !== -1 && diff !== 0) {
    db.projects[projIdx].currentValue = Math.max(0, db.projects[projIdx].currentValue + diff);
    if (db.projects[projIdx].currentValue >= db.projects[projIdx].targetValue) db.projects[projIdx].status = 'COMPLETED';
    else if (db.projects[projIdx].status === 'COMPLETED') db.projects[projIdx].status = 'ACTIVE';
    db.projects[projIdx].updatedAt = new Date().toISOString();
  }

  writeDB(db);
  res.json({ ...updated, ...(warnings.length && { warnings }) });
});

// activity/delete   DELETE /api/activities/:id
app.delete('/api/activities/:id', (req, res) => {
  const db = readDB();
  const idx = db.activities.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ code: 'activityNotFound', message: 'Activity with given id does not exist.', id: req.params.id });

  const activity = db.activities[idx];
  db.activities.splice(idx, 1);

  const projIdx = db.projects.findIndex(p => p.id === activity.projectId);
  if (projIdx !== -1) {
    db.projects[projIdx].currentValue = Math.max(0, db.projects[projIdx].currentValue - activity.metricValue);
    if (db.projects[projIdx].status === 'COMPLETED' && db.projects[projIdx].currentValue < db.projects[projIdx].targetValue)
      db.projects[projIdx].status = 'ACTIVE';
    db.projects[projIdx].updatedAt = new Date().toISOString();
  }

  writeDB(db);
  res.json({ deleted: true, project: projIdx !== -1 ? db.projects[projIdx] : null });
});

// ═══════════════════════════════════════════════════════════
//  STATS (bonus)
// ═══════════════════════════════════════════════════════════
app.get('/api/projects/:id/stats', (req, res) => {
  const db = readDB();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ code: 'projectNotFound', message: 'Project with given id does not exist.', id: req.params.id });

  const activities = db.activities.filter(a => a.projectId === req.params.id).sort((a,b) => new Date(a.date)-new Date(b.date));
  const totalMinutes = activities.reduce((s,a) => s+a.duration, 0);
  const avgIntensity = activities.length ? (activities.reduce((s,a) => s+a.intensity,0)/activities.length).toFixed(1) : 0;
  const today = new Date().toISOString().split('T')[0];
  const dateSet = new Set(activities.map(a => a.date));
  let streak = 0, checkDate = new Date(today);
  while (dateSet.has(checkDate.toISOString().split('T')[0])) { streak++; checkDate.setDate(checkDate.getDate()-1); }
  const dist = {1:0,2:0,3:0,4:0,5:0};
  activities.forEach(a => { dist[a.intensity]=(dist[a.intensity]||0)+1; });
  const heatmap = [];
  for (let i=20; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const da = activities.filter(a => a.date===ds);
    heatmap.push({ date:ds, level: da.length===0?'none':da.reduce((s,a)=>s+a.intensity,0)>=4?'high':'med' });
  }
  res.json({ project, totalMinutes, totalHours:(totalMinutes/60).toFixed(1), streak,
    avgIntensity:parseFloat(avgIntensity), activityCount:activities.length, intensityDist:dist, heatmap,
    progressPercent:Math.min(100,Math.round((project.currentValue/project.targetValue)*100)) });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Elevate API running on http://localhost:${PORT}`));
