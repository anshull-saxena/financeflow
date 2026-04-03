// FinanceFlow API Client
// All API calls go to the same origin (server serves both static files and API)

function getToken() {
  return localStorage.getItem('ff_token');
}

async function apiCall(method, endpoint, data) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  const res = await fetch(endpoint, opts);
  const json = await res.json();

  if (res.status === 401) {
    localStorage.removeItem('ff_token');
    const current = window.location.pathname;
    if (!current.endsWith('index.html') && current !== '/') {
      window.location.href = 'index.html';
    }
    throw new Error(json.error || 'Not authenticated');
  }

  return json;
}

window.API = {
  isLoggedIn() { return !!getToken(); },

  // Auth
  login(email, password) {
    return apiCall('POST', '/api/auth/login', { email, password });
  },
  signup(name, email, password, currency, monthlyGoal) {
    return apiCall('POST', '/api/auth/signup', { name, email, password, currency, monthlyGoal });
  },
  logout() {
    return apiCall('POST', '/api/auth/logout');
  },
  changePassword(currentPassword, newPassword) {
    return apiCall('PUT', '/api/auth/password', { currentPassword, newPassword });
  },

  // Dashboard
  getDashboard() { return apiCall('GET', '/api/dashboard'); },

  // Transactions
  getTransactions(params) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiCall('GET', '/api/transactions' + q);
  },
  createTransaction(data) { return apiCall('POST', '/api/transactions', data); },
  deleteTransaction(id) { return apiCall('DELETE', '/api/transactions/' + id); },

  // Goals
  getGoals() { return apiCall('GET', '/api/goals'); },
  createGoal(data) { return apiCall('POST', '/api/goals', data); },
  updateGoal(id, data) { return apiCall('PUT', '/api/goals/' + id, data); },
  deleteGoal(id) { return apiCall('DELETE', '/api/goals/' + id); },

  // Settings
  getSettings() { return apiCall('GET', '/api/settings'); },
  updateSettings(data) { return apiCall('PUT', '/api/settings', data); },

  // Categories
  getCategories() { return apiCall('GET', '/api/categories'); },

  // Analytics
  getAnalytics() { return apiCall('GET', '/api/analytics'); }
};
