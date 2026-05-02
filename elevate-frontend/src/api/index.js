const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Request failed');
  return json.data;
}

// Projects
export const getProjects = () => req('GET', '/projects');
export const getProject = (id) => req('GET', `/projects/${id}`);
export const createProject = (body) => req('POST', '/projects', body);
export const updateProject = (id, body) => req('PATCH', `/projects/${id}`, body);
export const archiveProject = (id) => req('PATCH', `/projects/${id}/archive`);
export const deleteProject = (id) => req('DELETE', `/projects/${id}`);

// Activities
export const getActivities = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return req('GET', `/activities${qs ? '?' + qs : ''}`);
};
export const createActivity = (body) => req('POST', '/activities', body);
export const deleteActivity = (id) => req('DELETE', `/activities/${id}`);

// Stats
export const getStats = (projectId) => req('GET', `/projects/${projectId}/stats`);
