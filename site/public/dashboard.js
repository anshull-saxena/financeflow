// ── Global State ─────────────────────────────────────
let appData = {
    txns: [],
    goals: [],
    user: {}
};

const ICONS = { Salary:'payments', Freelance:'work', Investment:'show_chart', Food:'restaurant', Housing:'home', Transport:'flight', Entertainment:'movie', Technology:'shopping_bag', Other:'more_horiz' };

// ── Helpers ─────────────────────────────────────────
function fmt(n) { 
    return API.formatMoney(n);
}

function calcPctChange(current, previous) {
    if (previous === 0 && current === 0) return { text: '—', positive: true };
    if (previous === 0) return { text: '+100%', positive: true };
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? '+' : '';
    return { text: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

function buildSparkline(svgEl, values, color) {
    if (!svgEl || values.length === 0) return;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const points = values.map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * 100;
        const y = 38 - ((v - min) / range) * 36 + 2;
        return `${x},${y}`;
    });
    svgEl.innerHTML = `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ── Portfolio Chart ─────────────────────────────────
let chartPeriod = 30;

function renderPortfolioChart() {
    const txns = appData.txns;
    const now = new Date();
    const daysAgo = new Date(now);
    daysAgo.setDate(daysAgo.getDate() - chartPeriod);

    const sorted = txns.slice().sort((a, b) => API.parseTxnDate(a.occurredAt || a.date) - API.parseTxnDate(b.occurredAt || b.date));
    let balance = 0;
    const dailyMap = {};

    sorted.forEach(t => {
        const d = API.parseTxnDate(t.occurredAt || t.date);
        const amt = t.displayAmount ?? t.amount;
        if (d < daysAgo) {
            balance += t.type === 'income' ? amt : -amt;
        }
    });

    const numPoints = Math.min(chartPeriod, 60);
    const stepDays = Math.max(1, Math.floor(chartPeriod / numPoints));
    const points = [];
    const labels = [];
    let runBal = balance;
    
    for (let i = 0; i <= chartPeriod; i += stepDays) {
        const d = new Date(daysAgo);
        d.setDate(d.getDate() + i);
        const dayKey = d.toISOString().slice(0, 10);
        
        sorted.forEach(t => {
            const td = API.parseTxnDate(t.occurredAt || t.date).toISOString().slice(0, 10);
            if (td <= dayKey && !dailyMap[t.id]) {
                const amt = t.displayAmount ?? t.amount;
                if (API.parseTxnDate(t.occurredAt || t.date) >= daysAgo) {
                    runBal += t.type === 'income' ? amt : -amt;
                    dailyMap[t.id] = true;
                }
            }
        });
        
        points.push(runBal);
        if (chartPeriod <= 7) labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        else if (chartPeriod <= 30) labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        else if (chartPeriod <= 90) labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        else labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    const svg = document.getElementById('portfolioChart');
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    
    const svgPoints = points.map((v, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * 1000;
        const y = 280 - ((v - min) / range) * 260 + 10;
        return { x, y };
    });

    const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${svgPoints[svgPoints.length-1].x} 300 L ${svgPoints[0].x} 300 Z`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#a855f7" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#00eeff" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#chartGradient)"/>
        <path d="${linePath}" fill="none" stroke="#a855f7" stroke-linecap="round" stroke-width="4"/>
    `;

    const yAxis = document.getElementById('chartYAxis');
    const steps = 4;
    yAxis.innerHTML = '';
    const symbol = API.getCurrencySymbol();
    for (let i = 0; i < steps; i++) {
        const val = max - (i * range / (steps - 1));
        const label = Math.abs(val) >= 1000 ? `${symbol}${(val / 1000).toFixed(0)}k` : `${symbol}${val.toFixed(0)}`;
        yAxis.innerHTML += `<span>${label}</span>`;
    }

    const xAxis = document.getElementById('chartXAxis');
    const maxLabels = 7;
    const labelStep = Math.max(1, Math.floor(labels.length / maxLabels));
    xAxis.innerHTML = labels.filter((_, i) => i % labelStep === 0 || i === labels.length - 1)
        .map(l => `<span>${l}</span>`).join('');
}

// ── Fetch & Render ──────────────────────────────────
async function loadDashboard() {
    try {
        const dashData = await API.get('/dashboard');
        const txData = await API.get('/transactions'); // Need full history for graph mapping
        
        appData.user = dashData.user;
        appData.goals = await API.hydrateGoalsForDisplay(dashData.goals || []);
        appData.txns = await API.hydrateTransactionsForDisplay(txData.transactions || []);
        
        await renderUI(dashData.stats);
    } catch (e) {
        console.error('Failed to load dashboard:', e);
        if (e.message.includes('token') || e.message.includes('Auth')) {
            window.location.href = 'index.html';
        }
        else { window.showAppAlert('Backend server not connected. Ensure proxy is running.'); }
    }
}

async function renderUI(serverStats) {
    const txns = appData.txns;
    const goals = appData.goals;
    const now = new Date();
    const curMonth = getMonthKey(now);
    const prevMonth = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const curIncome = txns
        .filter(t => t.type === 'income' && getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === curMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const prevIncome = txns
        .filter(t => t.type === 'income' && getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === prevMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const curExpense = txns
        .filter(t => t.type === 'expense' && getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === curMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const prevExpense = txns
        .filter(t => t.type === 'expense' && getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === prevMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    
    // User Profile
    const rawName = appData.user?.name || (localStorage.getItem('ff_userName') || '').trim();
    const firstName = rawName && rawName !== 'Demo User' ? rawName.split(' ')[0] : 'there';
    document.getElementById('dashboardGreeting').textContent = `Welcome back, ${firstName}!`;

    const cardHolder = document.getElementById('cardHolderName');
    if (cardHolder) cardHolder.textContent = rawName && rawName !== 'Demo User' ? rawName.toUpperCase() : '—';

    // Current balances (computed from displayed currency amounts)
    const balance = txns
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0) -
        txns
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    
    document.querySelector('[data-stat="balance"]').textContent = fmt(balance);
    document.querySelector('[data-stat="income"]').textContent = fmt(curIncome);
    document.querySelector('[data-stat="expenses"]').textContent = fmt(curExpense);

    const prevBalance = balance - (curIncome - curExpense);
    
    document.getElementById('balanceBadge').textContent = calcPctChange(balance, prevBalance || 0).text;
    document.getElementById('incomeBadge').textContent = calcPctChange(curIncome, prevIncome).text;
    document.getElementById('expenseBadge').textContent = calcPctChange(curExpense, prevExpense).text;

    const last7 = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().slice(0, 10), income: 0, expense: 0 };
    });
    txns.forEach(t => {
        const dk = API.parseTxnDate(t.occurredAt || t.date).toISOString().slice(0, 10);
        const day = last7.find(d => d.date === dk);
        if (day) {
            const amt = Math.abs(t.displayAmount ?? t.amount);
            if (t.type === 'income') day.income += amt;
            else day.expense += amt;
        }
    });

    let runBal = balance - last7.reduce((s, d) => s + d.income - d.expense, 0);
    buildSparkline(document.getElementById('balanceSpark'), last7.map(d => { runBal += d.income - d.expense; return runBal; }), '#00eeff');
    buildSparkline(document.getElementById('incomeSpark'), last7.map(d => d.income), '#a855f7');
    buildSparkline(document.getElementById('expenseSpark'), last7.map(d => d.expense), '#f87171');

    renderPortfolioChart();

    const tbody = document.getElementById('txnBody');
    const recentTxns = txns.slice().sort((a, b) => API.parseTxnDate(b.occurredAt || b.date) - API.parseTxnDate(a.occurredAt || a.date)).slice(0, 8);
    
    if (recentTxns.length === 0) {
        tbody.innerHTML = `<div class="glass p-6 rounded-2xl border border-white/10 text-center">
            <p class="text-white font-bold mb-1">No transactions yet</p>
            <p class="text-slate-400 text-sm">Click <span class="text-primary font-semibold">New Transaction</span> to add your first income or expense.</p>
        </div>`;
    } else {
        tbody.innerHTML = recentTxns.map(t => {
            const d = API.parseTxnDate(t.occurredAt || t.date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const icon = ICONS[t.category] || 'receipt';
            const isIncome = t.type === 'income';
            const amt = Math.abs(t.displayAmount ?? t.amount);
            return `<div class="glass flex items-center justify-between p-5 rounded-2xl border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all cursor-pointer group">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl ${isIncome ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-white'} flex items-center justify-center">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div>
                        <p class="text-white font-bold">${t.description || t.desc}</p>
                        <p class="text-slate-400 text-sm">${t.category}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <p class="${isIncome ? 'text-primary' : 'text-white'} font-bold">${isIncome ? '+' : '-'}${API.formatMoney(amt)}</p>
                        <p class="text-slate-500 text-xs uppercase font-bold mt-1">${dateStr}</p>
                    </div>
                    <button class="delete-txn opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all" data-id="${t.id}">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    const gc = document.getElementById('goalsContainer');
    if (goals.length === 0) {
        gc.innerHTML = `<div class="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p class="text-white font-bold mb-1">No goals yet</p>
            <p class="text-slate-400 text-sm">Click the <span class="text-primary font-semibold">+</span> button to create your first goal.</p>
        </div>`;
        return;
    }
    
    gc.innerHTML = goals.map((g, index) => {
        const saved = g.displaySavedAmount ?? g.saved ?? g.savedAmount ?? 0;
        const target = g.displayTargetAmount ?? g.target ?? g.targetAmount ?? 0;
        const pct = g.progress || Math.min(100, Math.round(((saved) / (target || 1)) * 100));
        const colorClass = index % 2 === 1 ? 'accent-purple' : 'primary';
        const barShadow = index % 2 === 1 ? 'shadow-[0_0_10px_#a855f7]' : 'neon-glow';
        return `<div class="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-${colorClass}/30 transition-all cursor-pointer" data-goal-id="${g.id}">
            <div class="flex justify-between items-center mb-4">
                <p class="text-sm font-semibold text-white">${g.name}</p>
                <div class="flex items-center gap-2">
                    <p class="text-xs text-${colorClass}">${pct}%</p>
                    <button class="edit-goal opacity-0 group-hover:opacity-100 text-slate-500 hover:text-primary transition-all" data-id="${g.id}"><span class="material-symbols-outlined text-sm">edit</span></button>
                </div>
            </div>
            <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div class="bg-${colorClass} h-full ${barShadow} transition-all duration-700" style="width: ${pct}%"></div>
            </div>
            <div class="flex justify-between mt-3">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saved: ${API.formatMoney(saved)}</p>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Target: ${API.formatMoney(target)}</p>
            </div>
        </div>`;
    }).join('');
}

// Global Event Listeners
document.getElementById('txnBody').addEventListener('click', async e => {
    const delBtn = e.target.closest('.delete-txn');
    if (delBtn) {
        e.stopPropagation();
        const id = delBtn.dataset.id;
        if (await window.showAppConfirm('Delete this transaction?')) {
            try {
                await API.delete(`/transactions/${id}`);
                await loadDashboard(); // Reload from server
            } catch (err) {
                window.showAppAlert('Failed to delete transaction.');
            }
        }
    }
});

// ── Transaction Modal ───────────────────────────────
const txnModal = document.getElementById('txnModal');
document.getElementById('newTxnBtnHeader').addEventListener('click', () => {
    txnModal.classList.remove('hidden'); txnModal.classList.add('flex');
});
document.getElementById('closeTxnModal').addEventListener('click', () => { txnModal.classList.add('hidden'); txnModal.classList.remove('flex'); });
txnModal.addEventListener('click', e => { if (e.target === txnModal) { txnModal.classList.add('hidden'); txnModal.classList.remove('flex'); }});

document.querySelectorAll('.txn-type-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.txn-type-btn').forEach(b => { b.classList.remove('bg-primary', 'text-background-dark'); b.classList.add('bg-white/5', 'text-slate-300', 'border', 'border-white/10'); });
    btn.classList.add('bg-primary', 'text-background-dark'); btn.classList.remove('bg-white/5', 'text-slate-300', 'border', 'border-white/10');
    document.getElementById('txnType').value = btn.dataset.type;
}));

document.getElementById('txnForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Saving...';
    
    // Check if the backend ignores timezone
    const now = new Date();
    // Offset local timezone safely:
    const occurredAt = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');

    const payload = {
        type: document.getElementById('txnType').value,
        description: document.getElementById('txnDesc').value,
        category: document.getElementById('txnCategory').value,
        amount: parseFloat(document.getElementById('txnAmount').value),
        currency: API.getCurrency(),
        occurredAt: occurredAt
    };
    
    try {
        const result = await API.post('/transactions', payload);
        console.log('Transaction created successfully:', result);
        txnModal.classList.add('hidden'); txnModal.classList.remove('flex');
        e.target.reset();
        document.getElementById('txnType').value = 'income';
        document.querySelectorAll('.txn-type-btn')[0].click();
        await loadDashboard();
    } catch (err) {
        console.error('Failed to create transaction:', err);
        window.showAppAlert('Failed to create transaction: ' + err.message);
    } finally {
        submitBtn.textContent = 'Add Transaction';
    }
});

// ── Goal Modal (No remote POST mapping for goals in the current API, mocks edit inside memory only, but reloads gracefully) ──
const goalModal = document.getElementById('goalModal');
function openGoalModal(goal = null) {
    if (goal) {
        document.getElementById('goalModalTitle').textContent = 'Edit Goal';
        document.getElementById('goalSubmitBtn').textContent = 'Save Changes';
        document.getElementById('goalEditId').value = goal.id;
        document.getElementById('goalName').value = goal.name;
        document.getElementById('goalTarget').value = goal.displayTargetAmount ?? goal.target ?? goal.targetAmount;
        document.getElementById('goalSaved').value = goal.displaySavedAmount ?? goal.saved ?? goal.savedAmount;
    } else {
        document.getElementById('goalModalTitle').textContent = 'New Financial Goal';
        document.getElementById('goalSubmitBtn').textContent = 'Create Goal';
        document.getElementById('goalEditId').value = '';
        document.getElementById('goalForm').reset();
    }
    goalModal.classList.remove('hidden'); goalModal.classList.add('flex');
}
document.getElementById('addGoalBtn').addEventListener('click', () => openGoalModal());
document.getElementById('closeGoalModal').addEventListener('click', () => { goalModal.classList.add('hidden'); goalModal.classList.remove('flex'); });

// ── Chart period buttons & Basic Links ──────────────
document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.chart-period-btn').forEach(b => {
            b.className = 'chart-period-btn px-3 py-1 rounded-lg bg-white/5 text-white text-xs border border-white/10 hover:bg-white/10 transition-colors';
        });
        this.className = 'chart-period-btn px-3 py-1 rounded-lg bg-primary text-background-dark text-xs font-bold transition-colors';
        chartPeriod = parseInt(this.dataset.period);
        renderPortfolioChart();
    });
});

document.querySelectorAll('a').forEach(a => { if (a.textContent.includes('View All History')) a.href = 'income.html'; });
document.getElementById('dateRangeBtn')?.addEventListener('click', function() {
    const options = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'];
    const span = document.getElementById('dateRangeText');
    const idx = options.indexOf(span.textContent);
    span.textContent = options[(idx + 1) % options.length];
});

// Init
loadDashboard();
