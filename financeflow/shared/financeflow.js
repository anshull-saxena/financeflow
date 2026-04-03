// FinanceFlow Shared Library
const API_BASE = window.location.origin + '/api';

const FinanceFlow = {
  formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN');
  },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  },

  getTransactionIcon(category) {
    const icons = {
      'Technology': 'shopping_bag', 'Food': 'restaurant', 'Salary': 'work',
      'Housing': 'home', 'Transport': 'directions_car', 'Entertainment': 'movie'
    };
    return icons[category] || 'receipt';
  },

  async fetchDashboard() {
    const response = await fetch(`${API_BASE}/dashboard`);
    return await response.json();
  },

  async fetchTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/transactions?${query}`);
    return await response.json();
  },

  async createTransaction(data) {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async deleteTransaction(id) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE'
    });
    return await response.json();
  },

  async fetchAnalytics() {
    const response = await fetch(`${API_BASE}/analytics`);
    return await response.json();
  },

  async fetchSettings() {
    const response = await fetch(`${API_BASE}/settings`);
    return await response.json();
  },

  async updateSettings(data) {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  }
};

window.FinanceFlow = FinanceFlow;
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('-translate-x-full');
  document.getElementById('sidebar-overlay')?.classList.toggle('active');
}
window.toggleSidebar = toggleSidebar;
