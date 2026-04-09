# MoneyControl – Build & Deployment Instructions

## Project Structure

```
moneycontrol/
├── main.cpp        ← C++ backend (WASM-ready)
├── backend.js      ← JavaScript fallback backend
├── script.js       ← Main app logic + WASM bridge
├── styles.css      ← Dashboard styles
├── index.html      ← Full UI
└── INSTRUCTIONS.md
```

---

## 1. Running Without WebAssembly (Instant – No Build Needed)

The app works **out of the box** using the JavaScript fallback backend.

```bash
# Option A: Python
python3 -m http.server 8080

# Option B: Node.js
npx serve .

# Option C: VS Code Live Server
# Just open index.html with Live Server extension
```

Then open: **http://localhost:8080**

Data is persisted to `localStorage` in JS mode.

---

## 2. Compiling C++ to WebAssembly (Optional)

### Prerequisites

```bash
# Install Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh   # Linux/macOS
# emsdk_env.bat         # Windows
```

### Compile

```bash
em++ main.cpp -o moneycontrol.js \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s NO_EXIT_RUNTIME=1 \
  -s MODULARIZE=0 \
  -O2
```

This generates:
- `moneycontrol.js`   ← JS glue code
- `moneycontrol.wasm` ← WebAssembly binary

### Enable WASM in index.html

Uncomment this line in `index.html` (inside `<head>`):

```html
<script src="moneycontrol.js"></script>
```

The app will automatically detect `Module.ccall` and switch the badge to **⚡ WebAssembly**.

---

## 3. GitHub Pages Deployment

### Step 1 – Initialize repository

```bash
git init
git add .
git commit -m "Initial MoneyControl deployment"
```

### Step 2 – Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/moneycontrol.git
git branch -M main
git push -u origin main
```

### Step 3 – Enable GitHub Pages

1. Go to your repository → **Settings**
2. Click **Pages** in the sidebar
3. Source: **Deploy from a branch**
4. Branch: `main` / `/ (root)`
5. Click **Save**

Your app will be live at:
`https://YOUR_USERNAME.github.io/moneycontrol/`

### Step 4 – Ensure WASM MIME type (if using WASM)

GitHub Pages serves `.wasm` files correctly by default.
If using a custom server, ensure `Content-Type: application/wasm` for `.wasm` files.

---

## 4. WASM Detection Logic

The bridge in `script.js` automatically detects which backend to use:

```
detectWASM()
  ├─ typeof Module !== 'undefined' && Module.ccall is function?
  │     └─ YES → useWASM = true  → badge shows "⚡ WebAssembly"
  └─ NO  → useWASM = false → badge shows "🔷 JavaScript"

Bridge.createAccount(name, amount)
  ├─ useWASM? → Module.ccall('createAccount', ...)
  └─ else     → JSBackend.createAccount(name, amount)
```

---

## 5. Features

| Feature              | JS Mode | WASM Mode |
|----------------------|---------|-----------|
| Create Account       | ✅      | ✅        |
| Deposit / Withdraw   | ✅      | ✅        |
| Soft Delete          | ✅      | ✅        |
| Transaction History  | ✅      | ✅        |
| Search Accounts      | ✅      | ✅        |
| Low Balance Alerts   | ✅      | ✅        |
| PDF Receipt (jsPDF)  | ✅      | ✅        |
| Bar/Line/Pie Charts  | ✅      | ✅        |
| File Persistence     | localStorage | accounts.txt / transactions.txt |
| Data Persistence     | Browser session | Server filesystem |

---

## 6. Demo Data

On first load, 6 demo accounts are seeded automatically with sample transactions.
Clear `localStorage` to reset JS-mode data.

---

## Notes

- The app is **fully functional without WASM** — JS mode is production-ready
- WASM adds performance for heavy computation and server-side file persistence
- All charts update dynamically after every operation
- PDF receipts download instantly via jsPDF (no server required)
