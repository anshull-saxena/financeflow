// Fetch user data for the top bar (reusing logic if you add a topbar later, currently income doesn't show user in sidebar but we can fetch it silently)

const ICONS = { Salary:'payments', Freelance:'work', Investment:'show_chart', Food:'restaurant', Housing:'home', Transport:'flight', Entertainment:'movie', Technology:'shopping_bag', Other:'more_horiz' };
const CAT_COLORS = { Salary:'primary', Freelance:'blue', Investment:'emerald', Other:'purple' };

function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function getMonthLabel(key) {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-US', { month: 'short' });
}

let allIncomeTxns = [];

async function loadIncomeData() {
    try {
        const data = await API.get('/transactions');
        const income = (data.transactions || []).filter(t => t.type === 'income');
        const hydrated = await API.hydrateTransactionsForDisplay(income);
        allIncomeTxns = hydrated.sort((a, b) => API.parseTxnDate(b.occurredAt || b.date) - API.parseTxnDate(a.occurredAt || a.date));
        renderIncome();
    } catch (e) {
        if (e.message.includes('token')) window.location.href = 'index.html';
        else console.error('Failed to load income data:', e);
    }
}

function renderIncome() {
    const incomeTxns = allIncomeTxns;
    const now = new Date();
    const curMonth = getMonthKey(now);
    const prevMonth = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    // Update Stats
    const total = incomeTxns.reduce((sum, t) => sum + (t.displayAmount ?? t.amount), 0);
    const curMonthIncome = incomeTxns
        .filter(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === curMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    const prevMonthIncome = incomeTxns
        .filter(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === prevMonth)
        .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0);
    
    document.getElementById('statTotalIncome').textContent = API.formatMoney(total);

    // Unique months with income
    const monthSet = new Set(incomeTxns.map(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date))));
    const numMonths = monthSet.size || 1;
    const avgMonthly = total / numMonths;
    document.getElementById('statAvgIncome').textContent = API.formatMoney(avgMonthly);
    document.getElementById('statIncomeCount').textContent = incomeTxns.length.toString().padStart(2, '0');

    // Trend badges
    const incomeBadge = document.getElementById('incomeTrendBadge');
    const avgBadge = document.getElementById('avgTrendBadge');
    if (prevMonthIncome > 0) {
        const pctChange = ((curMonthIncome - prevMonthIncome) / prevMonthIncome) * 100;
        const isUp = pctChange >= 0;
        incomeBadge.className = `flex items-center ${isUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'} px-2 py-1 rounded-lg text-xs font-bold`;
        incomeBadge.innerHTML = `<span class="material-symbols-outlined text-sm">${isUp ? 'arrow_upward' : 'arrow_downward'}</span> ${Math.abs(pctChange).toFixed(1)}%`;
    } else {
        incomeBadge.className = 'flex items-center text-slate-500 bg-slate-500/10 px-2 py-1 rounded-lg text-xs font-bold';
        incomeBadge.innerHTML = '<span class="material-symbols-outlined text-sm">remove</span> —';
    }
    avgBadge.className = 'flex items-center text-slate-500 bg-slate-500/10 px-2 py-1 rounded-lg text-xs font-bold';
    avgBadge.innerHTML = `<span class="material-symbols-outlined text-sm">show_chart</span> ${monthSet.size > 0 ? numMonths : 0} mo`;

    // Bar chart - last 6 months
    renderBarChart(incomeTxns);

    // Update Table
    const tbody = document.getElementById('incomeTbody');
    if (incomeTxns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No income records yet. Click <span class="text-primary font-bold">Add Income</span> to start tracking.</td></tr>`;
    } else {
        tbody.innerHTML = incomeTxns.map(t => {
            const d = API.parseTxnDate(t.occurredAt || t.date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const icon = ICONS[t.category] || 'payments';
            const c = CAT_COLORS[t.category] || 'blue';
            const amount = t.displayAmount ?? t.amount;
            return `<tr class="hover:bg-primary/5 group transition-all duration-300">
                <td class="px-6 py-6 text-slate-400 text-sm">${dateStr}</td>
                <td class="px-6 py-6">
                    <div class="flex items-center gap-3">
                        <div class="size-8 rounded-lg bg-${c}-500/20 flex items-center justify-center text-${c}-400">
                            <span class="material-symbols-outlined text-lg">${icon}</span>
                        </div>
                        <div>
                            <span class="font-bold block text-white">${t.description || t.desc}</span>
                            <span class="text-xs text-slate-500">${t.category}</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-6 text-slate-400 text-sm">${t.category}</td>
                <td class="px-6 py-6 font-bold text-primary">${API.formatMoney(amount)}</td>
                <td class="px-6 py-6 flex items-center justify-end gap-3">
                    <span class="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">Cleared</span>
                    <button class="delete-inc opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all ml-2" data-id="${t.id}">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }
}

function renderBarChart(incomeTxns) {
    const container = document.getElementById('incomeBarChart');
    const now = new Date();
    const symbol = API.getCurrencySymbol();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(getMonthKey(d));
    }
    
    const monthTotals = months.map(mk =>
        incomeTxns
            .filter(t => getMonthKey(API.parseTxnDate(t.occurredAt || t.date)) === mk)
            .reduce((s, t) => s + (t.displayAmount ?? t.amount), 0)
    );
    
    const maxVal = Math.max(...monthTotals, 1);
    const curMonthKey = getMonthKey(now);
    
    container.innerHTML = months.map((mk, i) => {
        const amt = monthTotals[i];
        const height = Math.max(8, (amt / maxVal) * 200);
        const isCurrent = mk === curMonthKey;
        const gradient = isCurrent 
            ? 'from-primary/40 to-primary/60' 
            : 'from-purple-500/20 to-purple-500/40';
        const glow = isCurrent ? 'neon-glow' : '';
        const labelColor = isCurrent ? 'text-primary' : 'text-slate-500';
        return `<div class="flex-1 flex flex-col items-center gap-3">
            <div class="w-full bg-gradient-to-t ${gradient} rounded-t-lg ${glow} transition-all duration-500" style="height: ${height}px;" title="${symbol}${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}"></div>
            <span class="text-[10px] font-bold ${labelColor} uppercase">${getMonthLabel(mk)}</span>
        </div>`;
    }).join('');

    // Growth calculation
    const firstActiveMonthIndex = monthTotals.findIndex(m => m > 0);
    const first = firstActiveMonthIndex >= 0 ? monthTotals[firstActiveMonthIndex] : 0;
    const last = monthTotals[monthTotals.length - 1];
    
    const growthEl = document.getElementById('totalGrowthPct');
    if (first > 0 && last > 0 && firstActiveMonthIndex !== monthTotals.length - 1) {
        const growth = ((last - first) / first) * 100;
        growthEl.textContent = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
        growthEl.className = `text-xl font-bold ${growth >= 0 ? 'text-primary' : 'text-red-400'}`;
    } else if (last > 0) {
        growthEl.textContent = 'New';
        growthEl.className = 'text-xl font-bold text-primary';
    } else {
        growthEl.textContent = '—';
        growthEl.className = 'text-xl font-bold text-slate-500';
    }
    
    // Update period label
    document.getElementById('trendPeriodLabel').textContent = `${months.length} Months`;
}

// Event delegation for delete buttons
document.getElementById('incomeTbody').addEventListener('click', async function(e) {
    const delBtn = e.target.closest('.delete-inc');
    if (delBtn) {
        if(await window.showAppConfirm('Delete this income record?')) {
            const id = delBtn.dataset.id;
            try {
                await API.delete(`/transactions/${id}`);
                await loadIncomeData();
            } catch (err) {
                window.showAppAlert('Failed to delete income');
            }
        }
    }
});

// Scroll to form button
document.getElementById('scrollToIncomeForm')?.addEventListener('click', () => {
    const form = document.getElementById('incomeForm');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.querySelector('#incCategory')?.focus();
    }
});

// Add income form
document.getElementById('incomeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.textContent = 'Adding...';

    const category = document.getElementById('incCategory').value;
    const desc = document.getElementById('incDesc').value;
    const amount = parseFloat(document.getElementById('incAmount').value);
    
    const now = new Date();
    const occurredAt = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');

    try {
        await API.post('/transactions', {
            type: 'income',
            category: category,
            description: desc,
            amount: amount,
            currency: API.getCurrency(),
            occurredAt: occurredAt
        });

        this.reset();
        window.showAppAlert('Income added successfully!', 'success');
        await loadIncomeData();
    } catch (err) {
        window.showAppAlert('Failed to add income: ' + err.message);
    } finally {
        btn.textContent = 'Add Income';
    }
});

// Filter button toggle
let filterOn = false;
document.querySelectorAll('button').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon && icon.textContent.trim() === 'filter_list') {
        btn.addEventListener('click', async () => {
            filterOn = !filterOn;
            btn.classList.toggle('bg-primary/20', filterOn);
            btn.classList.toggle('text-primary', filterOn);
            if (filterOn) {
                const threshold = await window.showAppPrompt(`Show income above (${API.getCurrencySymbol()}):`, '1000');
                if (threshold === null) { filterOn = false; btn.classList.remove('bg-primary/20', 'text-primary'); return; }
                const minAmt = parseFloat(threshold) || 0;
                document.querySelectorAll('#incomeTbody tr').forEach(row => {
                    const amtEl = row.querySelector('td:nth-child(4)');
                    if(!amtEl) return;
                    const amt = parseFloat(amtEl.textContent.replace(/[^0-9.-]+/g,''));
                    row.style.display = amt >= minAmt ? '' : 'none';
                });
            } else {
                document.querySelectorAll('#incomeTbody tr').forEach(row => row.style.display = '');
            }
        });
    }
});

// Search button toggle
let searchVisible = false;
document.querySelectorAll('button').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon && icon.textContent.trim() === 'search') {
        btn.addEventListener('click', () => {
            searchVisible = !searchVisible;
            let searchBar = document.getElementById('incomeSearch');
            if (!searchBar) {
                searchBar = document.createElement('input');
                searchBar.id = 'incomeSearch';
                searchBar.className = 'w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-primary outline-none transition-all placeholder:text-slate-600 mt-4';
                searchBar.placeholder = 'Search transactions...';
                btn.closest('.p-6')?.appendChild(searchBar);
                searchBar.addEventListener('input', () => {
                    const q = searchBar.value.toLowerCase();
                    document.querySelectorAll('#incomeTbody tr').forEach(row => {
                        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                    });
                });
            }
            searchBar.style.display = searchVisible ? 'block' : 'none';
            if (searchVisible) searchBar.focus();
        });
    }
});

// Upgrade to Pro
document.getElementById('upgradeProCard')?.addEventListener('click', async () => {
    await window.showAppAlert('🎉 Premium upgrade coming soon!\n\nDetailed tax insights, AI-powered analytics, and smart reporting will be available in FinanceFlow Pro.');
});

// Initial Render
document.getElementById('incAmountCurrencyLabel')?.replaceChildren(document.createTextNode(API.getCurrencySymbol()));
loadIncomeData();
