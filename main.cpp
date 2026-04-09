#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <ctime>
#include <iomanip>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

// ─────────────────────────────────────────────
// Transaction Class
// ─────────────────────────────────────────────
class Transaction {
public:
    int id;
    int accountId;
    std::string type;       // "deposit" | "withdraw"
    double amount;
    double balanceAfter;
    std::string timestamp;
    std::string accountName;
    std::string accountNumber;

    Transaction() : id(0), accountId(0), amount(0), balanceAfter(0) {}

    Transaction(int id, int accId, const std::string& type, double amount,
                double balAfter, const std::string& ts,
                const std::string& name, const std::string& accNo)
        : id(id), accountId(accId), type(type), amount(amount),
          balanceAfter(balAfter), timestamp(ts), accountName(name), accountNumber(accNo) {}

    std::string toCSV() const {
        return std::to_string(id) + "," + std::to_string(accountId) + "," +
               type + "," + std::to_string(amount) + "," +
               std::to_string(balanceAfter) + "," + timestamp + "," +
               accountName + "," + accountNumber;
    }

    std::string toJSON() const {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(2);
        oss << "{\"id\":" << id
            << ",\"accountId\":" << accountId
            << ",\"type\":\"" << type << "\""
            << ",\"amount\":" << amount
            << ",\"balanceAfter\":" << balanceAfter
            << ",\"timestamp\":\"" << timestamp << "\""
            << ",\"accountName\":\"" << accountName << "\""
            << ",\"accountNumber\":\"" << accountNumber << "\"}";
        return oss.str();
    }
};

// ─────────────────────────────────────────────
// Account Class
// ─────────────────────────────────────────────
class Account {
public:
    int id;
    std::string name;
    std::string accountNumber;
    double balance;
    std::string createdAt;
    bool isDeleted;

    Account() : id(0), balance(0), isDeleted(false) {}

    Account(int id, const std::string& name, const std::string& accNo,
            double balance, const std::string& createdAt)
        : id(id), name(name), accountNumber(accNo),
          balance(balance), createdAt(createdAt), isDeleted(false) {}

    std::string toCSV() const {
        return std::to_string(id) + "," + name + "," + accountNumber + "," +
               std::to_string(balance) + "," + createdAt + "," +
               (isDeleted ? "1" : "0");
    }

    std::string toJSON() const {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(2);
        oss << "{\"id\":" << id
            << ",\"name\":\"" << name << "\""
            << ",\"accountNumber\":\"" << accountNumber << "\""
            << ",\"balance\":" << balance
            << ",\"createdAt\":\"" << createdAt << "\""
            << ",\"isDeleted\":" << (isDeleted ? "true" : "false") << "}";
        return oss.str();
    }
};

// ─────────────────────────────────────────────
// Analytics Class
// ─────────────────────────────────────────────
class Analytics {
public:
    double totalDeposits;
    double totalWithdrawals;
    double totalBalance;
    int activeAccounts;
    int totalTransactions;

    Analytics() : totalDeposits(0), totalWithdrawals(0), totalBalance(0),
                  activeAccounts(0), totalTransactions(0) {}
};

// ─────────────────────────────────────────────
// BankSystem Class
// ─────────────────────────────────────────────
class BankSystem {
private:
    std::vector<Account> accounts;
    std::vector<Transaction> transactions;
    int nextAccountId;
    int nextTransactionId;

    std::string getCurrentTimestamp() {
        time_t now = time(nullptr);
        char buf[64];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", localtime(&now));
        return std::string(buf);
    }

    std::string generateAccountNumber() {
        return "MC" + std::to_string(10000000 + nextAccountId);
    }

    void saveAccounts() {
        std::ofstream f("accounts.txt");
        for (auto& acc : accounts)
            f << acc.toCSV() << "\n";
    }

    void saveTransactions() {
        std::ofstream f("transactions.txt");
        for (auto& tx : transactions)
            f << tx.toCSV() << "\n";
    }

    void loadAccounts() {
        std::ifstream f("accounts.txt");
        if (!f.is_open()) return;
        std::string line;
        while (std::getline(f, line)) {
            std::istringstream ss(line);
            std::string tok;
            Account acc;
            std::getline(ss, tok, ','); acc.id = std::stoi(tok);
            std::getline(ss, acc.name, ',');
            std::getline(ss, acc.accountNumber, ',');
            std::getline(ss, tok, ','); acc.balance = std::stod(tok);
            std::getline(ss, acc.createdAt, ',');
            std::getline(ss, tok, ','); acc.isDeleted = (tok == "1");
            accounts.push_back(acc);
            if (acc.id >= nextAccountId) nextAccountId = acc.id + 1;
        }
    }

    void loadTransactions() {
        std::ifstream f("transactions.txt");
        if (!f.is_open()) return;
        std::string line;
        while (std::getline(f, line)) {
            std::istringstream ss(line);
            std::string tok;
            Transaction tx;
            std::getline(ss, tok, ','); tx.id = std::stoi(tok);
            std::getline(ss, tok, ','); tx.accountId = std::stoi(tok);
            std::getline(ss, tx.type, ',');
            std::getline(ss, tok, ','); tx.amount = std::stod(tok);
            std::getline(ss, tok, ','); tx.balanceAfter = std::stod(tok);
            std::getline(ss, tx.timestamp, ',');
            std::getline(ss, tx.accountName, ',');
            std::getline(ss, tx.accountNumber, ',');
            transactions.push_back(tx);
            if (tx.id >= nextTransactionId) nextTransactionId = tx.id + 1;
        }
    }

public:
    BankSystem() : nextAccountId(1), nextTransactionId(1) {
        loadAccounts();
        loadTransactions();
    }

    // ── CREATE ACCOUNT ──
    std::string createAccount(const std::string& name, double initialDeposit) {
        if (name.empty() || initialDeposit < 0) {
            return "{\"success\":false,\"message\":\"Invalid input\"}";
        }
        std::string accNo = generateAccountNumber();
        std::string ts = getCurrentTimestamp();
        Account acc(nextAccountId++, name, accNo, initialDeposit, ts);
        accounts.push_back(acc);

        if (initialDeposit > 0) {
            Transaction tx(nextTransactionId++, acc.id, "deposit",
                           initialDeposit, initialDeposit, ts, name, accNo);
            transactions.push_back(tx);
        }

        saveAccounts();
        saveTransactions();

        std::ostringstream oss;
        oss << std::fixed << std::setprecision(2);
        oss << "{\"success\":true,\"account\":" << acc.toJSON() << "}";
        return oss.str();
    }

    // ── DEPOSIT ──
    std::string deposit(int accountId, double amount) {
        for (auto& acc : accounts) {
            if (acc.id == accountId && !acc.isDeleted) {
                if (amount <= 0) return "{\"success\":false,\"message\":\"Amount must be positive\"}";
                acc.balance += amount;
                std::string ts = getCurrentTimestamp();
                Transaction tx(nextTransactionId++, accountId, "deposit",
                               amount, acc.balance, ts, acc.name, acc.accountNumber);
                transactions.push_back(tx);
                saveAccounts();
                saveTransactions();
                std::ostringstream oss;
                oss << std::fixed << std::setprecision(2);
                oss << "{\"success\":true,\"transaction\":" << tx.toJSON() << "}";
                return oss.str();
            }
        }
        return "{\"success\":false,\"message\":\"Account not found\"}";
    }

    // ── WITHDRAW ──
    std::string withdraw(int accountId, double amount) {
        for (auto& acc : accounts) {
            if (acc.id == accountId && !acc.isDeleted) {
                if (amount <= 0) return "{\"success\":false,\"message\":\"Amount must be positive\"}";
                if (acc.balance < amount) return "{\"success\":false,\"message\":\"Insufficient balance\"}";
                acc.balance -= amount;
                std::string ts = getCurrentTimestamp();
                Transaction tx(nextTransactionId++, accountId, "withdraw",
                               amount, acc.balance, ts, acc.name, acc.accountNumber);
                transactions.push_back(tx);
                saveAccounts();
                saveTransactions();
                std::ostringstream oss;
                oss << std::fixed << std::setprecision(2);
                oss << "{\"success\":true,\"transaction\":" << tx.toJSON() << "}";
                return oss.str();
            }
        }
        return "{\"success\":false,\"message\":\"Account not found\"}";
    }

    // ── SOFT DELETE ──
    std::string deleteAccount(int accountId) {
        for (auto& acc : accounts) {
            if (acc.id == accountId && !acc.isDeleted) {
                acc.isDeleted = true;
                saveAccounts();
                return "{\"success\":true,\"message\":\"Account deleted\"}";
            }
        }
        return "{\"success\":false,\"message\":\"Account not found\"}";
    }

    // ── GET ALL ACCOUNTS JSON ──
    std::string getAllAccountsJSON() {
        std::ostringstream oss;
        oss << "[";
        bool first = true;
        for (auto& acc : accounts) {
            if (!acc.isDeleted) {
                if (!first) oss << ",";
                oss << acc.toJSON();
                first = false;
            }
        }
        oss << "]";
        return oss.str();
    }

    // ── GET ALL TRANSACTIONS JSON ──
    std::string getAllTransactionsJSON() {
        std::ostringstream oss;
        oss << "[";
        for (size_t i = 0; i < transactions.size(); i++) {
            if (i > 0) oss << ",";
            oss << transactions[i].toJSON();
        }
        oss << "]";
        return oss.str();
    }

    // ── DASHBOARD STATS JSON ──
    std::string getDashboardStatsJSON() {
        double totalBalance = 0, totalDeposits = 0, totalWithdrawals = 0;
        int activeAccounts = 0;

        for (auto& acc : accounts)
            if (!acc.isDeleted) { totalBalance += acc.balance; activeAccounts++; }

        for (auto& tx : transactions) {
            if (tx.type == "deposit") totalDeposits += tx.amount;
            else totalWithdrawals += tx.amount;
        }

        double avgBalance = activeAccounts > 0 ? totalBalance / activeAccounts : 0;

        std::ostringstream oss;
        oss << std::fixed << std::setprecision(2);
        oss << "{\"totalAccounts\":" << activeAccounts
            << ",\"totalBalance\":" << totalBalance
            << ",\"totalTransactions\":" << transactions.size()
            << ",\"averageBalance\":" << avgBalance
            << ",\"totalDeposits\":" << totalDeposits
            << ",\"totalWithdrawals\":" << totalWithdrawals << "}";
        return oss.str();
    }

    // ── RECEIPT JSON ──
    std::string getTransactionReceiptJSON(int txnId) {
        for (auto& tx : transactions) {
            if (tx.id == txnId) return tx.toJSON();
        }
        return "{\"error\":\"Transaction not found\"}";
    }

    // ── LAST 5 TRANSACTIONS ──
    std::string getLastFiveTransactionsJSON() {
        std::ostringstream oss;
        oss << "[";
        int start = std::max(0, (int)transactions.size() - 5);
        for (int i = (int)transactions.size() - 1; i >= start; i--) {
            if (i < (int)transactions.size() - 1) oss << ",";
            oss << transactions[i].toJSON();
        }
        oss << "]";
        return oss.str();
    }

    // ── SEARCH ACCOUNTS ──
    std::string searchAccountsJSON(const std::string& query) {
        std::ostringstream oss;
        oss << "[";
        bool first = true;
        for (auto& acc : accounts) {
            if (!acc.isDeleted &&
                (acc.name.find(query) != std::string::npos ||
                 acc.accountNumber.find(query) != std::string::npos)) {
                if (!first) oss << ",";
                oss << acc.toJSON();
                first = false;
            }
        }
        oss << "]";
        return oss.str();
    }

    // ── LOW BALANCE ACCOUNTS ──
    std::string getLowBalanceAccountsJSON(double threshold = 500.0) {
        std::ostringstream oss;
        oss << "[";
        bool first = true;
        for (auto& acc : accounts) {
            if (!acc.isDeleted && acc.balance < threshold) {
                if (!first) oss << ",";
                oss << acc.toJSON();
                first = false;
            }
        }
        oss << "]";
        return oss.str();
    }
};

// ─────────────────────────────────────────────
// Global BankSystem instance
// ─────────────────────────────────────────────
BankSystem bank;

// ─────────────────────────────────────────────
// EMSCRIPTEN Exports
// ─────────────────────────────────────────────
#ifdef EMSCRIPTEN
extern "C" {

EMSCRIPTEN_KEEPALIVE
const char* getAllAccountsJSON() {
    static std::string result;
    result = bank.getAllAccountsJSON();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* getAllTransactionsJSON() {
    static std::string result;
    result = bank.getAllTransactionsJSON();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* getDashboardStatsJSON() {
    static std::string result;
    result = bank.getDashboardStatsJSON();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* getTransactionReceiptJSON(int txnId) {
    static std::string result;
    result = bank.getTransactionReceiptJSON(txnId);
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* createAccount(const char* name, double initialDeposit) {
    static std::string result;
    result = bank.createAccount(std::string(name), initialDeposit);
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* deposit(int accountId, double amount) {
    static std::string result;
    result = bank.deposit(accountId, amount);
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* withdraw(int accountId, double amount) {
    static std::string result;
    result = bank.withdraw(accountId, amount);
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* deleteAccount(int accountId) {
    static std::string result;
    result = bank.deleteAccount(accountId);
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* getLastFiveTransactionsJSON() {
    static std::string result;
    result = bank.getLastFiveTransactionsJSON();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* searchAccountsJSON(const char* query) {
    static std::string result;
    result = bank.searchAccountsJSON(std::string(query));
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* getLowBalanceAccountsJSON(double threshold) {
    static std::string result;
    result = bank.getLowBalanceAccountsJSON(threshold);
    return result.c_str();
}

} // extern "C"
#else
int main() {
    std::cout << bank.getDashboardStatsJSON() << std::endl;
    return 0;
}
#endif
