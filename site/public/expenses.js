// User Profile
async function loadUser() {
    try {
        const stats = await API.get('/dashboard');
        const user = stats.user || {};
        document.getElementById('sidebarUserName').textContent = user.name || (localStorage.getItem('ff_userName') || '').trim() || 'User';
        document.getElementById('sidebarUserEmail').textContent = user.email || (localStorage.getItem('ff_userEmail') || '').trim() || '—';
    } catch (e) {
        document.getElementById('sidebarUserName').textContent = (localStorage.getItem('ff_userName') || '').trim() || 'User';
        document.getElementById('sidebarUserEmail').textContent = (localStorage.getItem('ff_userEmail') || '').trim() || '—';
    }
}
loadUser();
document.getElementById('expAmountCurrencyLabel')?.replaceChildren(document.createTextNode(API.getCurrencySymbol()));

const catIcons = { Housing: 'home', Food: 'shopping_cart', Transport: 'directions_car', Entertainment: 'movie', Technology: 'devices', Other: 'more_horiz' };
const catColors = { Housing: 'orange', Food: 'emerald', Transport: 'blue', Entertainment: 'purple', Technology: 'indigo', Other: 'slate' };
const DONUT_COLORS = ['#00eeff', '#a855f7', '#f97316', '#34d399', '#60a5fa', '#94a3b8'];

function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

let allExpenses = [];

async function loadExpensesData() {
    try {
        const data = await API.get('/transactions');
        const transactions = data.transactions || [];
        const expenses = transactions.filter(t => t.type === 'expense');
        const hydrated = await API.hydrateTransactionsForDisplay(expenses);
        allExpenses = hydrated.sort((a, b) => API.parseTxnDate(b.occurredAt || b.date) - API.parseTxnDate(a.occurredAt || a.date));
        renderExpenses();
    } catch (error) {
        if (error.message.includes('token')) window.location.href = 'index.html';
        else console.error(error);
    }
}

function renderExpenses() {
    const expenses = allExpenses;
    const now = new Date();
    const curMonth = getMonthKey(now);
    const prevMonth = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    
    // Stats
    const total = expenses.reduce((sum, t) => sum + (t.displayAmount ?? t.amount), 0);
    const symbol = API.getCurrencySymbol();
    document.getElementById('statTotalExp').textContent = API.formatMoney(total);
    document.getElementById('statExpCount').textContent = expenses.length;
    document.getElementById('statExpAvg').textContent = `Avg. ${API.formatMoney(total / (expenses.length || 1))} per transaction`;
    
    // Month-over-month trend
    const curMonthTotal = expenses
        .filter(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === curMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const prevMonthTotal = expenses
        .filter(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === prevMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const trendEl = document.getElementById('statExpTrend');
    if (prevMonthTotal > 0) {
        const pctChange = ((curMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
        const isDecrease = pctChange <= 0;
        trendEl.className = `mt-4 flex items-center gap-2 ${isDecrease ? 'text-emerald-400' : 'text-red-400'} text-sm font-bold`;
        trendEl.innerHTML = `<span class="material-symbols-outlined text-sm">${isDecrease ? 'trending_down' : 'trending_up'}</span> ${Math.abs(pctChange).toFixed(1)}% ${isDecrease ? 'decrease' : 'increase'} vs last month`;
    } else if (curMonthTotal > 0) {
        trendEl.className = 'mt-4 flex items-center gap-2 text-slate-500 text-sm font-bold';
        trendEl.innerHTML = `<span class="material-symbols-outlined text-sm">info</span> First month tracking`;
    } else {
        trendEl.className = 'mt-4 flex items-center gap-2 text-slate-500 text-sm font-bold';
        trendEl.innerHTML = `<span class="material-symbols-outlined text-sm">remove</span> No data yet`;
    }
    
    // Biggest Category
    const catMap = {};
    expenses.forEach(t => {
        const amt = Number(t.displayAmount ?? t.amount ?? 0) || 0;
        catMap[t.category] = (catMap[t.category] || 0) + amt;
    });
    let biggestCat = 'None', biggestAmt = 0;
    for(const [c, a] of Object.entries(catMap)) {
        if(a > biggestAmt) { biggestAmt = a; biggestCat = c; }
    }
    const biggestPct = total > 0 ? Math.round((biggestAmt / total) * 100) : 0;
    document.getElementById('statBiggestCatName').textContent = biggestCat;
    document.getElementById('statBiggestCatAmount').textContent = API.formatMoney(biggestAmt);
    document.getElementById('statBiggestCatPct').textContent = `| ${biggestPct}% of total`;

    // Distribution donut chart
    renderDonut(catMap, total);
    
    // Smart Suggestion
    renderSmartSuggestion(expenses, catMap, curMonthTotal, prevMonthTotal);

    // Table
    const tbody = document.getElementById('expenseTbody');
    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-slate-500">No expenses yet. Click <span class="text-primary font-bold">Add Expense</span> to start tracking.</td></tr>`;
    } else {
        tbody.innerHTML = expenses.map(t => {
            const d = API.parseTxnDate(t.occurredAt || t.date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            const icon = catIcons[t.category] || 'receipt';
            const color = catColors[t.category] || 'slate';
            const amount = t.displayAmount ?? t.amount;
            return `<tr class="hover:bg-white/5 transition-all group cursor-pointer" data-category="${t.category}">
                <td class="px-6 py-6 text-slate-400 text-sm font-medium italic">${dateStr}</td>
                <td class="px-6 py-6"><div class="flex items-center gap-3">
                    <div class="size-8 rounded-lg bg-${color}-500/20 flex items-center justify-center text-${color}-500">
                        <span class="material-symbols-outlined text-lg">${icon}</span>
                    </div><span class="font-bold text-white">${t.category}</span></div></td>
                <td class="px-6 py-6 text-slate-300 font-medium">${t.desc || t.description}</td>
                <td class="px-6 py-6 text-right flex items-center justify-end gap-4 h-full">
                    <span class="text-white font-black text-lg group-hover:text-primary transition-colors">${API.formatMoney(amount)}</span>
                    <button class="delete-exp opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all" data-id="${t.id}">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    applyFilter();
}

function renderDonut(catMap, total) {
    const svg = document.getElementById('donutChart');
    const legend = document.getElementById('distributionLegend');
    const donutLabel = document.getElementById('donutPctLabel');
    
    // Remove old segments
    svg.querySelectorAll('.donut-segment').forEach(el => el.remove());
    
    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        donutLabel.textContent = '0%';
        legend.innerHTML = '<p class="text-slate-500 text-sm text-center">No expense data</p>';
        return;
    }
    
    // Draw donut segments
    const circumference = 2 * Math.PI * 15.9;
    let offset = 0;
    entries.forEach(([cat, amount], i) => {
        const pct = amount / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'donut-segment');
        circle.setAttribute('cx', '21');
        circle.setAttribute('cy', '21');
        circle.setAttribute('r', '15.9');
        circle.setAttribute('fill', 'transparent');
        circle.setAttribute('stroke', DONUT_COLORS[i % DONUT_COLORS.length]);
        circle.setAttribute('stroke-width', '4');
        circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
        circle.setAttribute('stroke-dashoffset', `${-offset}`);
        circle.style.transition = 'stroke-dasharray 0.5s ease';
        svg.appendChild(circle);
        offset += dash;
    });
    
    const monthlyGoal = parseFloat(localStorage.getItem('ff_monthlyGoal') || '0');
    donutLabel.textContent = monthlyGoal > 0 ? `${Math.min(100, Math.round((total / monthlyGoal) * 100))}%` : `${entries.length}`;
    
    // Legend
    legend.innerHTML = entries.map(([cat, amount], i) => {
        const pct = Math.round((amount / total) * 100);
        return `<div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
                <div class="size-2 rounded-full" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]};box-shadow:0 0 8px ${DONUT_COLORS[i % DONUT_COLORS.length]}"></div>
                <span class="text-slate-400 font-medium">${cat}</span>
            </div>
            <span class="text-white font-bold">${pct}%</span>
        </div>`;
    }).join('');
}

function renderSmartSuggestion(expenses, catMap, curTotal, prevTotal) {
    const el = document.getElementById('smartSuggestion');
    if (expenses.length === 0) {
        el.textContent = 'Add some expenses to see personalized insights here.';
        return;
    }
    
    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const biggest = entries[0];
    const bigPct = Math.round((biggest[1] / curTotal) * 100) || 0;
    
    if (prevTotal > 0 && curTotal < prevTotal) {
        const saved = prevTotal - curTotal;
        el.innerHTML = `Great job! You've spent <span class="text-primary font-bold">${symbol}${saved.toFixed(0)} less</span> this month compared to last month. Consider adding the difference to your savings goals!`;
    } else if (bigPct > 50) {
        el.innerHTML = `<span class="text-primary font-bold">${biggest[0]}</span> accounts for ${bigPct}% of your expenses. Consider reviewing this category for potential savings.`;
    } else if (expenses.length >= 5) {
        el.innerHTML = `You have ${expenses.length} expense entries across ${entries.length} categories. Your spending looks well-distributed!`;
    } else {
        el.innerHTML = `Keep tracking your expenses for better insights. You currently have ${expenses.length} entries recorded.`;
    }
}

// Event delegation for delete buttons
document.getElementById('expenseTbody').addEventListener('click', async function(e) {
    const delBtn = e.target.closest('.delete-exp');
    if (delBtn) {
        e.stopPropagation();
        if(await window.showAppConfirm('Delete this expense?')) {
            const id = delBtn.dataset.id;
            try {
                await API.delete(`/transactions/${id}`);
                await loadExpensesData();
            } catch (err) {
                window.showAppAlert('Failed to delete expense');
            }
        }
    }
});

// Scroll to form button
document.getElementById('scrollToExpenseForm')?.addEventListener('click', () => {
    const form = document.getElementById('expenseForm');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.querySelector('#expCategory')?.focus();
    }
});

// Submit expense form
document.getElementById('expenseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.textContent = 'Adding...';

    const cat = document.getElementById('expCategory').value;
    const desc = document.getElementById('expDesc').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    
    const now = new Date();
    const occurredAt = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');

    try {
        await API.post('/transactions', {
            type: 'expense',
            category: cat,
            description: desc,
            amount: amount,
            currency: API.getCurrency(),
            occurredAt: occurredAt
        });
        this.reset();
        window.showAppAlert('Expense added successfully!', 'success');
        await loadExpensesData();
    } catch(err) {
        window.showAppAlert('Failed to add expense');
    } finally {
        btn.textContent = 'Add Expense';
    }
});

// Category filter pills
let currentFilter = 'All';
const pills = document.querySelectorAll('.filter-pill');

function applyFilter() {
    pills.forEach(b => {
        if(b.textContent.trim() === currentFilter) {
            b.className = 'filter-pill px-6 py-2 rounded-full bg-primary text-background-dark font-bold text-sm';
        } else {
            b.className = 'filter-pill px-6 py-2 rounded-full glass text-slate-300 font-medium text-sm border-white/10 hover:border-primary/50 transition-all';
        }
    });
    document.querySelectorAll('#expenseTbody tr').forEach(row => {
        if (currentFilter === 'All' || row.dataset.category === currentFilter || row.children.length === 1) row.style.display = '';
        else row.style.display = 'none';
    });
}

pills.forEach(btn => {
    btn.addEventListener('click', function() {
        currentFilter = this.textContent.trim();
        applyFilter();
    });
});

// Initial load
loadExpensesData();
