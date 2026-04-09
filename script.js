// ═══════════════════════════════════════════════════════════
// MoneyControl – Main Application Script
// WASM Detection + Bridge + UI Controller
// ═══════════════════════════════════════════════════════════

// ─── WASM / JS Bridge ───────────────────────────────────────
let useWASM = false;
let wasmReady = false;

const Bridge = {
  _call(fn, ...args) {
    if (useWASM && wasmReady) {
      try {
        const result = Module.ccall(fn, 'string', args.map(() => 'string'), args.map(String));
        return JSON.parse(result);
      } catch (e) {
        console.warn('WASM call failed, falling back to JS:', e);
        useWASM = false;
        updateBackendBadge();
      }
    }
    return null; // falls through to JS
  },

  createAccount(name, amount) {
    if (useWASM && wasmReady) {
      try {
        const r = Module.ccall('createAccount', 'string', ['string', 'number'], [name, amount]);
        return JSON.parse(r);
      } catch(e) { useWASM = false; }
    }
    return JSBackend.createAccount(name, amount);
  },

  deposit(accountId, amount) {
    if (useWASM && wasmReady) {
      try {
        const r = Module.ccall('deposit', 'string', ['number', 'number'], [accountId, amount]);
        return JSON.parse(r);
      } catch(e) { useWASM = false; }
    }
    return JSBackend.deposit(accountId, amount);
  },

  withdraw(accountId, amount) {
    if (useWASM && wasmReady) {
      try {
        const r = Module.ccall('withdraw', 'string', ['number', 'number'], [accountId, amount]);
        return JSON.parse(r);
      } catch(e) { useWASM = false; }
    }
    return JSBackend.withdraw(accountId, amount);
  },

  deleteAccount(accountId) {
    if (useWASM && wasmReady) {
      try {
        const r = Module.ccall('deleteAccount', 'string', ['number'], [accountId]);
        return JSON.parse(r);
      } catch(e) { useWASM = false; }
    }
    return JSBackend.deleteAccount(accountId);
  },

  getAccounts() {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('getAllAccountsJSON', 'string', [], []));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.getAccounts();
  },

  getTransactions() {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('getAllTransactionsJSON', 'string', [], []));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.getTransactions();
  },

  getDashboardStats() {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('getDashboardStatsJSON', 'string', [], []));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.getDashboardStats();
  },

  getTransactionReceipt(txnId) {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('getTransactionReceiptJSON', 'string', ['number'], [txnId]));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.getTransactionReceipt(txnId);
  },

  getLowBalanceAccounts(threshold = 500) {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('getLowBalanceAccountsJSON', 'string', ['number'], [threshold]));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.getLowBalanceAccounts(threshold);
  },

  searchAccounts(query) {
    if (useWASM && wasmReady) {
      try {
        return JSON.parse(Module.ccall('searchAccountsJSON', 'string', ['string'], [query]));
      } catch(e) { useWASM = false; }
    }
    return JSBackend.searchAccounts(query);
  }
};

// ─── WASM Detection ─────────────────────────────────────────
function detectWASM() {
  try {
    if (typeof Module !== 'undefined' && typeof Module.ccall === 'function') {
      useWASM = true;
      wasmReady = true;
      console.log('✅ WebAssembly backend active');
    } else {
      useWASM = false;
      console.log('ℹ️ Using JavaScript fallback backend');
    }
  } catch(e) {
    useWASM = false;
  }
  updateBackendBadge();
}

function updateBackendBadge() {
  const badge = document.getElementById('backend-badge');
  if (!badge) return;

  if (useWASM) {
    badge.textContent = '💠 C++ / ⚡ WASM';
    badge.className = 'backend-badge wasm';
  } else {
    badge.textContent = '💠 C++ (JS Fallback)';
    badge.className = 'backend-badge wasm';
  }
}

// ─── State ───────────────────────────────────────────────────
let currentSection = 'dashboard';
let selectedAccountId = null;
let charts = {};
let toastTimeout;

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'success') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Navigation ─────────────────────────────────────────────
function navigateTo(section) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${section}`)?.classList.add('active');
  currentSection = section;

  if (section === 'dashboard') renderDashboard();
  if (section === 'accounts') renderAccounts();
  if (section === 'transactions') renderTransactions();
  if (section === 'analytics') renderAnalytics();
}

// ─── Format helpers ──────────────────────────────────────────
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtShortDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Dashboard ───────────────────────────────────────────────
function renderDashboard() {
  const stats = Bridge.getDashboardStats();
  const txns = Bridge.getTransactions();

  animateCounter('stat-accounts', stats.totalAccounts);
  animateCounter('stat-balance', stats.totalBalance, true);
  animateCounter('stat-transactions', stats.totalTransactions);
  animateCounter('stat-avg', stats.averageBalance, true);

  renderRecentTxnsTable(txns.slice(-8).reverse());
  renderLowBalanceTable();

  renderBarChart(stats);
  renderLineChart(txns);
  renderPieChart();
}

function animateCounter(id, target, isCurrency = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = isCurrency ? fmt(current) : Math.round(current).toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Charts ─────────────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#a0aec0', font: { family: 'Sora' } } } }
};

function renderBarChart(stats) {
  const ctx = document.getElementById('chart-bar')?.getContext('2d');
  if (!ctx) return;
  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Deposits', 'Withdrawals'],
      datasets: [{
        data: [stats.totalDeposits, stats.totalWithdrawals],
        backgroundColor: ['rgba(99, 255, 180, 0.75)', 'rgba(255, 99, 132, 0.75)'],
        borderColor: ['#63ffb4', '#ff6384'],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: '#718096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#718096', callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderLineChart(txns) {
  const ctx = document.getElementById('chart-line')?.getContext('2d');
  if (!ctx) return;
  if (charts.line) charts.line.destroy();

  // Group by date
  const grouped = {};
  txns.forEach(t => {
    const d = fmtShortDate(t.timestamp);
    grouped[d] = (grouped[d] || 0) + 1;
  });
  const labels = Object.keys(grouped).slice(-10);
  const data = labels.map(l => grouped[l]);

  charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Transactions',
        data,
        borderColor: '#7c6fff',
        backgroundColor: 'rgba(124, 111, 255, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#7c6fff',
        pointRadius: 4
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: '#718096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#718096' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderPieChart() {
  const ctx = document.getElementById('chart-pie')?.getContext('2d');
  if (!ctx) return;
  if (charts.pie) charts.pie.destroy();

  const accs = Bridge.getAccounts();
  if (!accs.length) return;

  const sorted = [...accs].sort((a, b) => b.balance - a.balance).slice(0, 6);
  charts.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(a => a.name),
      datasets: [{
        data: sorted.map(a => a.balance),
        backgroundColor: ['#63ffb4','#7c6fff','#ff6384','#ffa94d','#38bdf8','#fb7185'],
        borderWidth: 2,
        borderColor: '#0f172a'
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '65%'
    }
  });
}

// ─── Tables ──────────────────────────────────────────────────
function renderRecentTxnsTable(txns) {
  const tbody = document.getElementById('recent-txns-body');
  if (!tbody) return;
  if (!txns.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>'; return; }
  tbody.innerHTML = txns.map(t => `
    <tr class="fade-in">
      <td><span class="txn-badge ${t.type}">${t.type === 'deposit' ? '↑' : '↓'}</span></td>
      <td>${t.accountName}</td>
      <td class="${t.type === 'deposit' ? 'amount-green' : 'amount-red'}">${fmt(t.amount)}</td>
      <td>${fmt(t.balanceAfter)}</td>
      <td>${fmtDate(t.timestamp)}</td>
    </tr>`).join('');
}

function renderLowBalanceTable() {
  const tbody = document.getElementById('low-balance-body');
  if (!tbody) return;
  const accs = Bridge.getLowBalanceAccounts(500);
  if (!accs.length) { tbody.innerHTML = '<tr><td colspan="3" class="empty-row">No low balance accounts</td></tr>'; return; }
  tbody.innerHTML = accs.map(a => `
    <tr class="fade-in">
      <td>${a.name}</td>
      <td class="mono">${a.accountNumber}</td>
      <td class="amount-red">${fmt(a.balance)}</td>
    </tr>`).join('');
}

// ─── Accounts Section ────────────────────────────────────────
function renderAccounts(searchQuery = '') {
  const list = document.getElementById('accounts-list');
  if (!list) return;
  const accs = searchQuery ? Bridge.searchAccounts(searchQuery) : Bridge.getAccounts();
  if (!accs.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏦</div><p>No accounts found. Create your first account!</p></div>';
    return;
  }
  list.innerHTML = accs.map(a => `
    <div class="account-card fade-in" data-id="${a.id}">
      <div class="acc-header">
        <div class="acc-avatar">${a.name[0].toUpperCase()}</div>
        <div class="acc-info">
          <div class="acc-name">${a.name}</div>
          <div class="acc-number mono">${a.accountNumber}</div>
        </div>
        <div class="acc-balance">${fmt(a.balance)}</div>
      </div>
      <div class="acc-footer">
        <span class="acc-date">Since ${fmtDate(a.createdAt)}</span>
        <div class="acc-actions">
          <button class="btn-sm btn-green" onclick="openTxnModal(${a.id}, 'deposit', '${a.name}')">+ Deposit</button>
          <button class="btn-sm btn-red" onclick="openTxnModal(${a.id}, 'withdraw', '${a.name}')">- Withdraw</button>
          <button class="btn-sm btn-gray" onclick="confirmDelete(${a.id}, '${a.name}')">Delete</button>
        </div>
      </div>
    </div>`).join('');
}

// ─── Transactions Section ────────────────────────────────────
function renderTransactions() {
  const tbody = document.getElementById('all-txns-body');
  if (!tbody) return;
  const txns = Bridge.getTransactions().reverse();
  if (!txns.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No transactions yet</td></tr>'; return; }
  tbody.innerHTML = txns.map(t => `
    <tr class="fade-in">
      <td class="mono">#${t.id}</td>
      <td>${t.accountName}</td>
      <td class="mono">${t.accountNumber}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td class="${t.type === 'deposit' ? 'amount-green' : 'amount-red'}">${fmt(t.amount)}</td>
      <td>${fmtDate(t.timestamp)}</td>
      <td><button class="btn-sm btn-purple" onclick="downloadReceipt(${t.id})">PDF</button></td>
    </tr>`).join('');
}

// ─── Analytics Section ───────────────────────────────────────
function renderAnalytics() {
  renderBarChart(Bridge.getDashboardStats());
  renderLineChart(Bridge.getTransactions());
  renderPieChart();
}

// ─── Modals ──────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function openTxnModal(accountId, type, name) {
  selectedAccountId = accountId;
  document.getElementById('txn-modal-title').textContent =
    type === 'deposit' ? `Deposit to ${name}` : `Withdraw from ${name}`;
  document.getElementById('txn-type').value = type;
  document.getElementById('txn-amount').value = '';
  openModal('txn-modal');
  setTimeout(() => document.getElementById('txn-amount').focus(), 100);
}

function confirmDelete(accountId, name) {
  selectedAccountId = accountId;
  document.getElementById('delete-name').textContent = name;
  openModal('delete-modal');
}

// ─── Actions ─────────────────────────────────────────────────
function handleCreateAccount(e) {
  e.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const amount = parseFloat(document.getElementById('new-amount').value) || 0;
  if (!name) { showToast('Please enter account holder name', 'error'); return; }
  const result = Bridge.createAccount(name, amount);
  if (result.success) {
    showToast(`Account created: ${result.account.accountNumber}`, 'success');
    closeModal('create-modal');
    document.getElementById('create-form').reset();
    refreshAll();
  } else {
    showToast(result.message, 'error');
  }
}

function handleTransaction(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const type = document.getElementById('txn-type').value;
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  const result = type === 'deposit'
    ? Bridge.deposit(selectedAccountId, amount)
    : Bridge.withdraw(selectedAccountId, amount);
  if (result.success) {
    showToast(`${type === 'deposit' ? 'Deposited' : 'Withdrawn'} ${fmt(amount)} successfully`, 'success');
    closeModal('txn-modal');
    refreshAll();
  } else {
    showToast(result.message, 'error');
  }
}

function handleDeleteConfirm() {
  const result = Bridge.deleteAccount(selectedAccountId);
  if (result.success) {
    showToast('Account deleted', 'success');
    closeModal('delete-modal');
    refreshAll();
  } else {
    showToast(result.message, 'error');
  }
}

// ─── PDF Receipt ─────────────────────────────────────────────
function downloadReceipt(txnId) {
  const tx = Bridge.getTransactionReceipt(txnId);
  if (!tx) { showToast('Transaction not found', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

  // Background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 148, 210, 'F');

  // Header bar
  doc.setFillColor(99, 255, 180);
  doc.rect(0, 0, 148, 18, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MoneyControl', 10, 12);
  doc.setFontSize(8);
  doc.text('Transaction Receipt', 100, 12);

  // Divider
  doc.setDrawColor(99, 255, 180);
  doc.setLineWidth(0.5);
  doc.line(10, 30, 138, 30);

  // Receipt body
  const rows = [
    ['Transaction ID', `#${tx.id}`],
    ['Account Holder', tx.accountName],
    ['Account Number', tx.accountNumber],
    ['Type', tx.type.toUpperCase()],
    ['Amount', `Rs. ${Number(tx.amount).toFixed(2)}`],
    ['Balance After', `Rs. ${Number(tx.balanceAfter).toFixed(2)}`],
    ['Date & Time', new Date(tx.timestamp).toLocaleString('en-IN')]
  ];

  let y = 40;
  rows.forEach(([label, value], i) => {
    doc.setFillColor(i % 2 === 0 ? 20 : 27, i % 2 === 0 ? 30 : 38, i % 2 === 0 ? 50 : 58);
    doc.rect(10, y - 5, 128, 10, 'F');
    doc.setTextColor(160, 174, 192);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, 14, y);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 75, y);
    y += 12;
  });

  // Footer
  doc.setTextColor(99, 255, 180);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for banking with MoneyControl', 74, 195, { align: 'center' });

  doc.save(`receipt-txn-${txnId}.pdf`);
  showToast('Receipt downloaded!', 'success');
}

// ─── Refresh All ────────────────────────────────────────────
function refreshAll() {
  if (currentSection === 'dashboard') renderDashboard();
  if (currentSection === 'accounts') renderAccounts();
  if (currentSection === 'transactions') renderTransactions();
  if (currentSection === 'analytics') renderAnalytics();
  // Always re-render dashboard stats for sidebar numbers
  const stats = Bridge.getDashboardStats();
  document.getElementById('sidebar-accounts').textContent = stats.totalAccounts;
  document.getElementById('sidebar-txns').textContent = stats.totalTransactions;
}

// ─── Seed Demo Data ──────────────────────────────────────────
function seedDemoData() {
  if (Bridge.getAccounts().length > 0) return;
  const demos = [
    ['Arjun Sharma', 15000], ['Priya Nair', 8500], ['Rahul Verma', 2200],
    ['Sneha Iyer', 42000], ['Karthik Raj', 380], ['Deepa Menon', 91000]
  ];
  demos.forEach(([name, amount]) => Bridge.createAccount(name, amount));

  // Some transactions
  const accs = Bridge.getAccounts();
  Bridge.deposit(accs[0].id, 5000);
  Bridge.withdraw(accs[1].id, 1000);
  Bridge.deposit(accs[2].id, 800);
  Bridge.withdraw(accs[3].id, 15000);
  Bridge.deposit(accs[4].id, 200);
}

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  detectWASM();
  seedDemoData();

  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.section));
  });

  // Forms
  document.getElementById('create-form')?.addEventListener('submit', handleCreateAccount);
  document.getElementById('txn-form')?.addEventListener('submit', handleTransaction);

  // Search
  document.getElementById('account-search')?.addEventListener('input', e => {
    renderAccounts(e.target.value);
  });

  // Modal close on backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) backdrop.closest('.modal')?.classList.remove('open');
    });
  });

  // Mobile sidebar toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  navigateTo('dashboard');
});

// WASM Module callback (called if WASM loads)
if (typeof window !== 'undefined') {
  window.Module = window.Module || {};
  const originalReady = window.Module.onRuntimeInitialized;
  window.Module.onRuntimeInitialized = function() {
    if (originalReady) originalReady();
    wasmReady = true;
    useWASM = true;
    updateBackendBadge();
    refreshAll();
    console.log('✅ WASM runtime initialized');
  };
}
