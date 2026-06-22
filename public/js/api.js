const API = {
  async request(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  // Categories
  getCategories: () => API.request('GET', '/api/categories'),
  createCategory: (body) => API.request('POST', '/api/categories', body),
  updateCategory: (id, body) => API.request('PUT', `/api/categories/${id}`, body),
  deleteCategory: (id) => API.request('DELETE', `/api/categories/${id}`),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return API.request('GET', `/api/tasks${qs ? '?' + qs : ''}`);
  },
  getTask: (id) => API.request('GET', `/api/tasks/${id}`),
  createTask: (body) => API.request('POST', '/api/tasks', body),
  updateTask: (id, body) => API.request('PUT', `/api/tasks/${id}`, body),
  deleteTask: (id) => API.request('DELETE', `/api/tasks/${id}`),
  toggleComplete: (id) => API.request('PATCH', `/api/tasks/${id}/complete`),
  getTaskActivity: (id) => API.request('GET', `/api/tasks/${id}/activity`),

  // Activity
  getActivity: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return API.request('GET', `/api/activity${qs ? '?' + qs : ''}`);
  },
  createActivity: (body) => API.request('POST', '/api/activity', body),
  updateActivity: (id, body) => API.request('PUT', `/api/activity/${id}`, body),
  deleteActivity: (id) => API.request('DELETE', `/api/activity/${id}`),
};
