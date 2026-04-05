/**
 * Central API Helper
 * Manages communication with the FinanceFlow Express backend.
 */
// On Vercel and in local server mode, the frontend and API share the same origin.
// Using a relative base keeps this working across environments.
const API_BASE = '/api';

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

    formatMoney(amount, currency = null) {
        const cur = currency || this.getCurrency();
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: cur,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        } catch {
            const symbol = this.getCurrencySymbol();
            return `${symbol}${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    },

    parseTxnDate(value) {
        if (!value) return new Date(0);
        if (value instanceof Date) return value;
        const asString = String(value);
        // Handle MySQL DATETIME like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm:ss.SSS"
        const normalized = asString.includes(' ') && !asString.includes('T') ? asString.replace(' ', 'T') : asString;
        const d = new Date(normalized);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
    },

    async getFxRates(baseCurrency) {
        const base = String(baseCurrency || '').toUpperCase();
        if (!/^[A-Z]{3}$/.test(base)) throw new Error('Invalid base currency');

        const cacheKey = `ff_fx_${base}`;
        const cacheTtlMs = 60 * 60 * 1000; // 1 hour in browser
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const cached = JSON.parse(raw);
                if (cached && cached.fetchedAt && (Date.now() - cached.fetchedAt) < cacheTtlMs && cached.rates) {
                    return cached;
                }
            }
        } catch {
            // ignore cache errors
        }

        const data = await this.get(`/fx/latest?base=${encodeURIComponent(base)}`);
        const payload = { base: data.base, rates: data.rates, fetchedAt: Date.now() };
        try {
            localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {
            // ignore cache write errors
        }
        return payload;
    },

    async convertAmount(amount, fromCurrency, toCurrency) {
        const from = String(fromCurrency || this.getCurrency()).toUpperCase();
        const to = String(toCurrency || this.getCurrency()).toUpperCase();
        const numericAmount = Number(amount) || 0;
        if (from === to) return numericAmount;

        try {
            const fx = await this.getFxRates(from);
            const rate = fx?.rates?.[to];
            if (!rate) return numericAmount;
            return numericAmount * Number(rate);
        } catch {
            return numericAmount;
        }
    },

    async hydrateTransactionsForDisplay(transactions, targetCurrency = null) {
        const to = String(targetCurrency || this.getCurrency()).toUpperCase();
        const list = Array.isArray(transactions) ? transactions : [];
        const currencies = [...new Set(list.map((t) => String(t.currency || 'INR').toUpperCase()))];

        const rateByBase = {};
        for (const base of currencies) {
            if (base === to) continue;
            try {
                rateByBase[base] = await this.getFxRates(base);
            } catch {
                rateByBase[base] = null;
            }
        }

        return list.map((t) => {
            const from = String(t.currency || 'INR').toUpperCase();
            const baseRates = rateByBase[from]?.rates;
            const rate = from === to ? 1 : Number(baseRates?.[to] || 0);
            const displayAmount = from === to || !rate ? Number(t.amount) || 0 : (Number(t.amount) || 0) * rate;
            return { ...t, displayCurrency: to, displayAmount };
        });
    },

    async hydrateGoalsForDisplay(goals, targetCurrency = null) {
        const to = String(targetCurrency || this.getCurrency()).toUpperCase();
        const list = Array.isArray(goals) ? goals : [];
        const currencies = [...new Set(list.map((g) => String(g.currency || 'INR').toUpperCase()))];

        const rateByBase = {};
        for (const base of currencies) {
            if (base === to) continue;
            try {
                rateByBase[base] = await this.getFxRates(base);
            } catch {
                rateByBase[base] = null;
            }
        }

        return list.map((g) => {
            const from = String(g.currency || 'INR').toUpperCase();
            const baseRates = rateByBase[from]?.rates;
            const rate = from === to ? 1 : Number(baseRates?.[to] || 0);
            const saved = Number(g.savedAmount ?? g.saved ?? 0) || 0;
            const target = Number(g.targetAmount ?? g.target ?? 0) || 0;
            const displaySaved = from === to || !rate ? saved : saved * rate;
            const displayTarget = from === to || !rate ? target : target * rate;
            return {
                ...g,
                displayCurrency: to,
                displaySavedAmount: displaySaved,
                displayTargetAmount: displayTarget
            };
        });
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
