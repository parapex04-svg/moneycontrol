// ═══════════════════════════════════════════════════════════
// MoneyControl – JavaScript Fallback Backend
// Mirrors all C++ BankSystem logic
// ═══════════════════════════════════════════════════════════

const JSBackend = (() => {
  let accounts = JSON.parse(localStorage.getItem('mc_accounts') || '[]');
  let transactions = JSON.parse(localStorage.getItem('mc_transactions') || '[]');
  let nextAccountId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
  let nextTransactionId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;

  function save() {
    localStorage.setItem('mc_accounts', JSON.stringify(accounts));
    localStorage.setItem('mc_transactions', JSON.stringify(transactions));
  }

  function getTimestamp() {
    return new Date().toISOString().slice(0, 19);
  }

  function generateAccountNumber(id) {
    return 'MC' + String(10000000 + id);
  }

  function createAccount(name, initialDeposit) {
    if (!name || initialDeposit < 0) {
      return { success: false, message: 'Invalid input' };
    }
    const id = nextAccountId++;
    const accNo = generateAccountNumber(id);
    const ts = getTimestamp();
    const account = { id, name, accountNumber: accNo, balance: initialDeposit, createdAt: ts, isDeleted: false };
    accounts.push(account);

    if (initialDeposit > 0) {
      const tx = {
        id: nextTransactionId++, accountId: id, type: 'deposit',
        amount: initialDeposit, balanceAfter: initialDeposit,
        timestamp: ts, accountName: name, accountNumber: accNo
      };
      transactions.push(tx);
    }
    save();
    return { success: true, account };
  }

  function deposit(accountId, amount) {
    const acc = accounts.find(a => a.id === accountId && !a.isDeleted);
    if (!acc) return { success: false, message: 'Account not found' };
    if (amount <= 0) return { success: false, message: 'Amount must be positive' };
    acc.balance += amount;
    const ts = getTimestamp();
    const tx = {
      id: nextTransactionId++, accountId, type: 'deposit',
      amount, balanceAfter: acc.balance, timestamp: ts,
      accountName: acc.name, accountNumber: acc.accountNumber
    };
    transactions.push(tx);
    save();
    return { success: true, transaction: tx };
  }

  function withdraw(accountId, amount) {
    const acc = accounts.find(a => a.id === accountId && !a.isDeleted);
    if (!acc) return { success: false, message: 'Account not found' };
    if (amount <= 0) return { success: false, message: 'Amount must be positive' };
    if (acc.balance < amount) return { success: false, message: 'Insufficient balance' };
    acc.balance -= amount;
    const ts = getTimestamp();
    const tx = {
      id: nextTransactionId++, accountId, type: 'withdraw',
      amount, balanceAfter: acc.balance, timestamp: ts,
      accountName: acc.name, accountNumber: acc.accountNumber
    };
    transactions.push(tx);
    save();
    return { success: true, transaction: tx };
  }

  function deleteAccount(accountId) {
    const acc = accounts.find(a => a.id === accountId && !a.isDeleted);
    if (!acc) return { success: false, message: 'Account not found' };
    acc.isDeleted = true;
    save();
    return { success: true, message: 'Account deleted' };
  }

  function getAccounts() {
    return accounts.filter(a => !a.isDeleted);
  }

  function getTransactions() {
    return [...transactions];
  }

  function getDashboardStats() {
    const active = accounts.filter(a => !a.isDeleted);
    const totalBalance = active.reduce((s, a) => s + a.balance, 0);
    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    return {
      totalAccounts: active.length,
      totalBalance,
      totalTransactions: transactions.length,
      averageBalance: active.length ? totalBalance / active.length : 0,
      totalDeposits,
      totalWithdrawals
    };
  }

  function getTransactionReceipt(txnId) {
    return transactions.find(t => t.id === txnId) || null;
  }

  function getLastFiveTransactions() {
    return transactions.slice(-5).reverse();
  }

  function searchAccounts(query) {
    const q = query.toLowerCase();
    return accounts.filter(a => !a.isDeleted &&
      (a.name.toLowerCase().includes(q) || a.accountNumber.toLowerCase().includes(q)));
  }

  function getLowBalanceAccounts(threshold = 500) {
    return accounts.filter(a => !a.isDeleted && a.balance < threshold);
  }

  return {
    createAccount, deposit, withdraw, deleteAccount,
    getAccounts, getTransactions, getDashboardStats,
    getTransactionReceipt, getLastFiveTransactions,
    searchAccounts, getLowBalanceAccounts
  };
})();
