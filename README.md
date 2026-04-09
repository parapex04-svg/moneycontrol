# MoneyControl – Personal Savings Account System

> A hybrid C++ / WebAssembly / JavaScript banking dashboard for personal savings account management, built for the modern browser.

---

## Overview

MoneyControl is a full-stack, client-side savings account management system that leverages the performance of **C++ compiled to WebAssembly** for its core banking engine, integrated with a modern **JavaScript frontend dashboard**. The system allows users to create and manage savings accounts, perform deposits and withdrawals, track transaction histories, visualize financial analytics, and generate downloadable PDF receipts — all within a single-page browser application with no server dependency.

The architecture is intentionally hybrid: the banking logic is authored in C++ using object-oriented design principles and compiled to WebAssembly via Emscripten, while the JavaScript layer handles DOM interaction, chart rendering, and PDF generation. This design demonstrates how systems-level code can be deployed directly in the browser at near-native execution speed.

---

## Key Features

- **Account Management** — Create named savings accounts with optional initial deposits; perform soft deletes with data integrity preserved
- **Transactions** — Deposit and withdraw funds with overdraft protection enforced at the C++ logic layer
- **Transaction History** — Full ledger of all operations with timestamps, account references, and running balances
- **Real-Time Dashboard** — Live summary cards showing total accounts, total balance, transaction count, and average balance
- **Analytics & Charts** — Bar, line, and doughnut charts (Chart.js) for deposit/withdrawal volume, transaction frequency, and balance distribution
- **PDF Receipts** — Per-transaction downloadable receipts generated client-side via jsPDF
- **Search & Filtering** — Account lookup by name or account number; low-balance account detection with configurable threshold
- **File-Based Persistence** — C++ backend writes account and transaction state to `accounts.txt` and `transactions.txt` via `fstream`
- **Responsive UI** — Mobile-aware layout with sidebar navigation, modal dialogs, and animated stat counters

---

## Tech Stack

| Layer | Technology |
|---|---|
| Core Banking Logic | C++17 (OOP, STL) |
| Browser Execution | WebAssembly (compiled via Emscripten `em++`) |
| Frontend & Integration | Vanilla JavaScript (ES6+) |
| Data Visualization | Chart.js 4.x |
| PDF Generation | jsPDF 2.x |
| Styling | CSS3 (custom properties, CSS Grid, Flexbox) |
| Typography | Sora (display), JetBrains Mono (data) |
| Persistence (C++ layer) | `fstream` — `accounts.txt`, `transactions.txt` |
| Persistence (browser) | `localStorage` |

---

## System Architecture

MoneyControl is structured around a **two-layer hybrid model** that separates banking computation from presentation concerns.

### Layer 1 — C++ Banking Engine (WebAssembly)

The core logic is implemented in `main.cpp` using three primary classes:

- **`Account`** — Encapsulates account identity, balance state, account number generation, and serialization to JSON and CSV formats
- **`Transaction`** — Records each financial event with full metadata: type, amount, pre/post balance, timestamp, and account reference
- **`BankSystem`** — Orchestrates all operations; manages in-memory collections of accounts and transactions; handles file I/O via `fstream`; exposes JSON-returning functions decorated with `EMSCRIPTEN_KEEPALIVE` for export to the WebAssembly boundary

The C++ source is compiled with Emscripten to produce a `.wasm` binary and a JS glue module. Exported functions are called from JavaScript using `Module.ccall()`, passing primitive arguments and receiving JSON strings across the WASM boundary.

### Layer 2 — JavaScript Integration & UI

The JavaScript layer is responsible for:

- **WASM detection** — On load, the application checks for `Module.ccall` availability. If the WASM runtime has initialized, all banking operations are routed through it. The backend indicator in the sidebar reflects the active engine.
- **Bridge dispatcher (`Bridge`)** — A unified API object that routes every operation (create, deposit, withdraw, delete, query) to the correct backend, keeping all UI code backend-agnostic
- **DOM rendering** — All section views (Dashboard, Accounts, Transactions, Analytics) are rendered dynamically from backend data
- **Chart management** — Chart.js instances are created and destroyed on section navigation to ensure accurate, up-to-date visualizations
- **PDF generation** — jsPDF constructs styled A5 receipts directly in the browser on demand

### Data Flow

```
User Action (UI)
      │
      ▼
Bridge Dispatcher (script.js)
      │
      ├─── WASM available? ──► Module.ccall(fn, ...) ──► C++ BankSystem
      │                                                         │
      │                                                    fstream I/O
      │                                               (accounts.txt / transactions.txt)
      │
      └─── JS mode ──────────► JSBackend.fn(...) ──► localStorage
                
      ▼
JSON response parsed
      │
      ▼
DOM update + Chart refresh + Toast notification
```

---

## Project Structure

```
moneycontrol/
│
├── main.cpp                  # C++ banking engine (Account, Transaction, BankSystem)
│                             # Emscripten KEEPALIVE exports, fstream persistence
│
├── moneycontrol.js           # Emscripten-generated JS glue (produced by em++)
├── moneycontrol.wasm         # Compiled WebAssembly binary (produced by em++)
│
├── backend.js                # JavaScript banking engine (mirrors C++ API surface)
│                             # Uses localStorage for browser-side persistence
│
├── script.js                 # Application controller
│                             # WASM detection, Bridge dispatcher, UI rendering,
│                             # chart management, PDF receipt logic
│
├── index.html                # Single-page application shell
│                             # Dashboard, Accounts, Transactions, Analytics sections
│                             # Modal dialogs for account creation and transactions
│
├── styles.css                # Full UI stylesheet
│                             # Dark theme, CSS variables, responsive grid layout
│
└── INSTRUCTIONS.md           # Build and deployment reference
```

---

## Setup Instructions

### Running Locally

No build step is required to run the application in JavaScript mode. Serve the project directory with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser. The application will initialize with the JavaScript backend active.

> **Note:** Opening `index.html` directly via `file://` protocol may block module loading in some browsers. A local server is recommended.

### Compiling with Emscripten (`em++`)

To enable the WebAssembly backend, install the Emscripten SDK and compile `main.cpp`:

**Step 1 — Install emsdk**

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh        # Linux / macOS
# emsdk_env.bat              # Windows
```

**Step 2 — Compile**

```bash
em++ main.cpp -o moneycontrol.js \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s EXPORTED_FUNCTIONS='[
      "_malloc","_free",
      "_createAccount","_deposit","_withdraw","_deleteAccount",
      "_getAllAccountsJSON","_getAllTransactionsJSON",
      "_getDashboardStatsJSON","_getTransactionReceiptJSON",
      "_getLowBalanceAccountsJSON","_searchAccountsJSON",
      "_getLastFiveTransactionsJSON"
  ]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s NO_EXIT_RUNTIME=1 \
  -s MODULARIZE=0 \
  -O2
```

**Step 3 — Enable in `index.html`**

Uncomment the following line in the `<head>` section of `index.html`:

```html
<script src="moneycontrol.js"></script>
```

**Step 4 — Serve and verify**

Reload the application. The backend indicator in the sidebar will display **⚡ WebAssembly** once the WASM runtime has initialized successfully.

---

## How the System Works

1. On page load, `detectWASM()` checks whether `Module.ccall` is available as a function
2. If WASM is active, the `Bridge` dispatcher routes all operations to `Module.ccall()`, which executes the corresponding C++ function and returns a JSON string
3. If WASM is not available, the same `Bridge` interface routes operations to `JSBackend`, which implements identical logic using JavaScript arrays and `localStorage`
4. Every operation returns a structured JSON response (`{ success, account | transaction | message }`) parsed by the UI layer
5. After each mutation, the active section re-renders, chart instances are refreshed, and animated stat counters update to reflect the new state
6. The C++ layer additionally writes account and transaction state to `accounts.txt` and `transactions.txt` after every operation, providing file-based persistence when running in a WASM-capable server environment

---

## Advanced Features

### Analytics Dashboard

The Analytics section provides three synchronized views of account and transaction data, each rendered from live backend queries. Charts update on every navigation to the section and after any data-mutating operation.

### Charts (Chart.js)

| Chart | Type | Data Source |
|---|---|---|
| Deposit vs. Withdrawal Volume | Bar | `getDashboardStats()` |
| Transaction Activity Over Time | Line | `getAllTransactions()` grouped by date |
| Balance Distribution by Account | Doughnut | `getAccounts()` sorted by balance |

All charts use a consistent dark-theme palette with CSS variable-aligned colors. Chart instances are explicitly destroyed before re-creation to prevent canvas context leaks.

### PDF Receipts (jsPDF)

Each transaction row in the Transactions section includes a **PDF** button. Clicking it calls `getTransactionReceipt(id)` on the active backend, constructs a styled A5 document using jsPDF, and triggers an automatic browser download. Receipts include:

- Transaction ID, type, and timestamp
- Account holder name and account number
- Amount transacted and resulting balance
- MoneyControl branding header

No server request is made; the entire PDF is generated in-browser.

### Search and Filtering

The Accounts section provides real-time search across account holder names and account numbers. Queries are dispatched to `searchAccountsJSON()` on the C++ backend (or its JavaScript equivalent), and results update without page reload. The Dashboard additionally surfaces a low-balance table using a configurable ₹500 threshold via `getLowBalanceAccountsJSON()`.

### Soft Delete

Account deletion is implemented as a soft delete. The `isDeleted` flag is set to `true` on the account record; the account is excluded from all active queries, balance calculations, and UI renders, but the underlying data is preserved in `accounts.txt` for audit or recovery purposes.

---

## Future Enhancements

- **User Authentication** — Multi-user support with session-based account isolation
- **Interest Calculation** — Configurable compound interest computation scheduled at monthly intervals
- **Export to CSV / Excel** — Bulk transaction export for external accounting integration
- **Server-Side Persistence** — Replace file I/O with a SQLite or PostgreSQL backend over a REST API
- **WASM Threads** — Enable `SharedArrayBuffer`-based parallelism for batch analytics across large account sets
- **Audit Log** — Immutable append-only log of all mutations including soft deletes and balance corrections
- **Dark / Light Theme Toggle** — User-configurable theme preference persisted across sessions
- **Internationalisation** — Multi-currency support and locale-aware number formatting

---

## Author

**MoneyControl** was designed and developed as a portfolio project demonstrating hybrid WebAssembly + JavaScript application architecture, client-side PDF generation, and real-time data visualization in the browser.

Built with C++17 · Emscripten · Vanilla JS · Chart.js · jsPDF

---

*This project is intended for educational and portfolio purposes.*
