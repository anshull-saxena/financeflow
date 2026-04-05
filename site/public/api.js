/**
 * Central API Helper
 * Manages communication with the FinanceFlow Express backend.
 */
const API_BASE = 'http://localhost:3001/api';

const API = {
    // Get Authorization Token
    getToken() {
        return localStorage.getItem('ff_token');
    },

    // Save Authorization Token
    setToken(token) {
        localStorage.setItem('ff_token', token);
    },

    // Get Current Currency
    getCurrency() {
        return localStorage.getItem('ff_currency') || 'INR';
    },

    // Get Currency Symbol
    getCurrencySymbol() {
        const currency = this.getCurrency();
        const symbols = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        };
        return symbols[currency] || '₹';
    },

    // Generic Fetch Wrapper
    async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'API Request Failed');
            }

            return data.data || data; // Return payload or whole object if no nested data
        } catch (error) {
            console.error(`API Error on ${method} ${endpoint}:`, error);
            throw error;
        }
    },

    // Quick Methods
    get(endpoint) {
        return this.request(endpoint, 'GET');
    },

    post(endpoint, body) {
        return this.request(endpoint, 'POST', body);
    },

    put(endpoint, body) {
        return this.request(endpoint, 'PUT', body);
    },

    delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }
};

// Export to global scope
window.API = API;
