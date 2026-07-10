# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It enables users to record personal expenses, review their transaction history, and understand their spending distribution through a live pie chart — all without a backend or build step.

The app follows a simple three-layer architecture: a static HTML shell, a CSS presentation layer, and a single JavaScript module that handles state management, DOM manipulation, Chart.js integration, and Local Storage persistence. All state is derived from Local Storage on every render, making the architecture stateless and deterministic.

### Key Technical Decisions

- **No framework**: Vanilla JS keeps the app loadable as a plain HTML file without any tooling. React/Vue would require a build step.
- **Chart.js via CDN**: Avoids a build step while providing a robust, well-maintained charting library. The CDN script tag is included in the HTML file.
- **Render-on-change approach**: Every state mutation (add/delete) triggers a full re-render of the affected UI sections from the source of truth (Local Storage). This keeps the rendering logic simple and free of state-sync bugs.
- **Single JS file**: All logic lives in `js/app.js` to stay within the file structure requirement (Requirement 6.1). Internal organization uses clearly named function groups.

---

## Architecture

The application has no server component. The browser is the entire runtime.

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │           index.html (root)           │  │
│  │  ┌────────────┐  ┌────────────────┐   │  │
│  │  │ css/style  │  │  js/app.js     │   │  │
│  │  │   .css     │  │                │   │  │
│  │  └────────────┘  │  ┌──────────┐  │   │  │
│  │                  │  │ Storage  │  │   │  │
│  │                  │  │ Layer    │◄─┼───┼──┤ localStorage
│  │                  │  └────┬─────┘  │   │  │
│  │                  │       │        │   │  │
│  │                  │  ┌────▼─────┐  │   │  │
│  │                  │  │  State   │  │   │  │
│  │                  │  │  Engine  │  │   │  │
│  │                  │  └────┬─────┘  │   │  │
│  │                  │       │        │   │  │
│  │                  │  ┌────▼─────┐  │   │  │
│  │                  │  │  Render  │  │   │  │
│  │                  │  │  Layer   │  │   │  │
│  │                  │  └──────────┘  │   │  │
│  │                  └────────────────┘   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  External CDN: Chart.js                     │
└─────────────────────────────────────────────┘
```

### Data Flow

```
User Action (add/delete)
        │
        ▼
  Validate Input
        │
   (valid only)
        ▼
  Write to LocalStorage ──► (on failure) Display Error, abort
        │
        ▼
  Re-render UI (Balance, Transaction List, Chart)
```

On page load:
```
DOMContentLoaded
        │
        ▼
  Read from LocalStorage
        │
  (malformed/unavailable)──► Display Error, render empty state
        │
  (success)
        ▼
  Render UI (Balance, Transaction List, Chart)
```

---

## Components and Interfaces

### HTML Structure (`index.html`)

```
body
├── #loading-indicator          (hidden after render, visible during load)
├── #error-banner               (global error notifications)
├── header
│   └── #balance-display        (total balance text)
├── main
│   ├── section.input-section
│   │   └── #transaction-form
│   │       ├── #input-name     (text, max 100 chars)
│   │       ├── #error-name     (inline error message)
│   │       ├── #input-amount   (number, 0.01–999999999.99)
│   │       ├── #error-amount   (inline error message)
│   │       ├── #input-category (select: Food / Transport / Fun)
│   │       ├── #error-category (inline error message)
│   │       └── button[type=submit]
│   ├── section.list-section
│   │   └── #transaction-list   (scrollable, max-height with overflow-y: auto)
│   └── section.chart-section
│       ├── #chart-container
│       │   └── canvas#spending-chart
│       └── #chart-empty-state  (shown when no positive transactions)
└── footer
```

### JavaScript Module (`js/app.js`)

The file is organized into the following functional sections:

#### 1. Storage Layer

```js
// Returns array of Transaction objects, or [] on failure (with error display)
function loadTransactions(): Transaction[]

// Writes transactions array to localStorage. Returns true on success, false on failure.
function saveTransactions(transactions: Transaction[]): boolean
```

#### 2. Validator

```js
// Returns { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
function validateForm(name: string, amount: string, category: string): ValidationResult
```

#### 3. State Engine

```js
// Reads from storage, adds new transaction, writes back. Returns success boolean.
function addTransaction(name: string, amount: number, category: string): boolean

// Reads from storage, removes transaction by id, writes back. Returns success boolean.
function deleteTransaction(id: string): boolean
```

#### 4. Render Layer

```js
// Updates #balance-display from current transactions in storage
function renderBalance(): void

// Rebuilds #transaction-list DOM from current transactions in storage
function renderTransactionList(): void

// Updates or creates Chart.js instance from current transactions in storage
function renderChart(): void

// Convenience: calls renderBalance, renderTransactionList, renderChart
function renderAll(): void

// Displays inline validation errors on form fields
function displayValidationErrors(errors: ValidationResult['errors']): void

// Clears all inline validation errors
function clearValidationErrors(): void

// Resets the form to empty/unselected state
function resetForm(): void

// Shows/hides the global error banner with a message
function showError(message: string): void
function hideError(): void
```

#### 5. Event Handlers

```js
// Bound to #transaction-form submit event
function handleFormSubmit(event: Event): void

// Bound to delete buttons inside #transaction-list (event delegation)
function handleDeleteClick(event: Event): void
```

#### 6. Initialization

```js
// Runs on DOMContentLoaded: shows loading indicator, loads transactions, renders all, hides loading indicator
function init(): void
```

### Chart.js Integration

Chart.js is loaded from CDN before `js/app.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script src="js/app.js"></script>
```

The `renderChart()` function:
- Computes per-category totals from positive-amount transactions only
- If no data: destroys existing chart instance (if any), shows `#chart-empty-state`
- If data exists: hides `#chart-empty-state`, creates or updates the Chart.js `Pie` instance on `canvas#spending-chart`
- Uses `chart.data` mutation + `chart.update()` to avoid flickering on updates (avoids destroy/recreate)
- Labels format: `"Food (45.2%)"`, `"Transport (30.1%)"`, `"Fun (24.7%)"`

The chart module holds a single module-scoped reference `let chartInstance = null` to manage the singleton chart.

---

## Data Models

### Transaction Object

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString() fallback
  name: string,        // 1–100 characters, user-entered item name
  amount: number,      // 0.01–999999999.99, parsed float
  category: string,    // "Food" | "Transport" | "Fun"
  createdAt: string    // ISO 8601 datetime string: new Date().toISOString()
}
```

### Local Storage Schema

Key: `"expense-visualizer-transactions"`  
Value: JSON-serialized array of Transaction objects

```json
[
  {
    "id": "1720000000000",
    "name": "Lunch",
    "amount": 12.50,
    "category": "Food",
    "createdAt": "2024-07-03T12:00:00.000Z"
  }
]
```

On load, the value is parsed with `JSON.parse()`. If parsing throws or the result is not an array, the app treats it as malformed, displays an error, and proceeds with an empty array.

### ValidationResult Object

```js
{
  valid: boolean,
  errors: {
    name?: string,      // error message if name invalid
    amount?: string,    // error message if amount invalid
    category?: string   // error message if category invalid
  }
}
```

### Chart Data Object (internal, passed to Chart.js)

```js
{
  labels: string[],   // e.g. ["Food (45.2%)", "Transport (30.1%)", "Fun (24.7%)"]
  datasets: [{
    data: number[],   // sum of positive amounts per category, same order as labels
    backgroundColor: string[]  // fixed hex colors per category
  }]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validation correctly accepts valid inputs and rejects invalid inputs

*For any* combination of (name, amount, category), the `validateForm` function SHALL return `valid: true` if and only if the name is non-empty and non-whitespace-only (≤100 chars), the amount is a numeric value in the range [0.01, 999999999.99], and the category is one of "Food", "Transport", or "Fun".

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

---

### Property 2: Transaction creation round-trip preserves all fields

*For any* valid (name, amount, category) tuple, after calling `addTransaction`, reading back transactions from Local Storage SHALL yield an array containing exactly one transaction with the submitted name, amount, category, and a valid ISO 8601 `createdAt` timestamp.

**Validates: Requirements 1.6, 5.1**

---

### Property 3: Form resets to empty state after every successful submission

*For any* valid transaction submission, after the transaction is successfully saved, the name field SHALL be empty, the amount field SHALL be empty, and the category selector SHALL have no selection.

**Validates: Requirements 1.7**

---

### Property 4: Transaction list always reflects exactly the current contents of Local Storage

*For any* sequence of add and delete operations, the rendered transaction list SHALL display exactly the transactions currently stored in Local Storage — no more, no fewer — with the most recently added transaction appearing first.

**Validates: Requirements 2.1, 2.5**

---

### Property 5: Transaction rendering includes all required fields with correct formatting

*For any* transaction with arbitrary name, amount, and category, the rendered list item HTML SHALL contain the item name (truncated to 100 characters if longer), the amount formatted to exactly two decimal places with a leading currency symbol, and the category string.

**Validates: Requirements 2.2**

---

### Property 6: Balance equals the sum of all transaction amounts

*For any* non-empty set of transactions in Local Storage, the displayed balance SHALL equal the arithmetic sum of all transaction amounts, formatted to exactly two decimal places with a leading currency symbol.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 7: Chart data aggregates only positive transaction amounts by category

*For any* set of transactions (including those with zero or negative amounts), the chart data object computed by the chart rendering function SHALL contain one entry per category that has at least one positive-amount transaction, where each entry's value equals the sum of positive amounts for that category only, and zero/negative-amount transactions SHALL be excluded entirely.

**Validates: Requirements 4.1, 4.6**

---

### Property 8: Chart labels display category name and correct percentage

*For any* chart data object, each generated label SHALL contain the category name and the category's percentage of total spending rounded to one decimal place, formatted as `"CategoryName (X.X%)"`.

**Validates: Requirements 4.2**

---

### Property 9: Malformed or unavailable Local Storage data is handled gracefully

*For any* string value stored under the transactions key (including empty strings, truncated JSON, non-JSON content, and null), loading the app SHALL not throw an uncaught exception, SHALL display an error message to the user, and SHALL render an empty state for the balance (0.00), transaction list (empty state message), and chart (chart empty state).

**Validates: Requirements 5.4**

---

## Error Handling

### Error Categories and Responses

| Error Source | Condition | User-Facing Response | Behavior |
|---|---|---|---|
| Validation | Name empty/whitespace | Inline error on name field | Block submission |
| Validation | Amount invalid/out of range | Inline error on amount field | Block submission |
| Validation | No category selected | Inline error on category selector | Block submission |
| Local Storage write | `setItem` throws (e.g., quota exceeded) | Global error banner | Abort add/delete, no UI update |
| Local Storage read | `JSON.parse` throws or returns non-array | Global error banner | Render empty state, continue |
| Local Storage unavailable | `localStorage` access throws | Global error banner | Render empty state, continue |
| Chart.js render | Any Chart.js error | Global error banner | Show chart empty state |

### Inline Validation Errors

- Displayed immediately below the respective form field
- Cleared when the user modifies the field value (on `input` event)
- All cleared when a submission succeeds
- ARIA: each error element has `role="alert"` and is referenced by the input via `aria-describedby`

### Global Error Banner

- `#error-banner` is a fixed-position banner at the top of the page
- Contains a close button (×)
- Auto-dismisses after 5 seconds
- Uses `role="alert"` for screen reader accessibility

### Local Storage Write Ordering

Per Requirements 5.1 and 5.2, the storage write MUST complete before any UI re-render is triggered. The implementation guarantees this by synchronous ordering:

```js
function addTransaction(name, amount, category) {
  const transactions = loadTransactions();
  transactions.unshift(newTransaction);          // mutate array
  const saved = saveTransactions(transactions);  // write first
  if (!saved) { showError(...); return false; }
  renderAll();                                   // render only after confirmed write
  return true;
}
```

---

## Testing Strategy

### Overview

Given the nature of this feature (pure data transformation functions, formatting logic, and validation logic), property-based testing is well-suited for verifying correctness across the full input space. The testing approach combines:

- **Property-based tests** for core logic functions (validation, rendering, storage serialization, chart data computation)
- **Unit tests** for specific examples and edge cases
- **Integration tests** for end-to-end UI behavior (add transaction → balance updates, delete → list re-renders)
- **Smoke tests** for file structure and browser compatibility

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library, no build step required in test environment)

Each property test runs a minimum of **100 iterations**.

Each test is tagged with a comment referencing its design property:
```js
// Feature: expense-budget-visualizer, Property 1: Validation correctly accepts valid inputs and rejects invalid inputs
```

#### Property Test Implementations

**Property 1 — Validation correctness**
```
// Feature: expense-budget-visualizer, Property 1: Validation correctly accepts valid inputs and rejects invalid inputs
fc.assert(fc.property(
  fc.record({
    name: fc.oneof(fc.string(), fc.constant(''), fc.constant('   ')),
    amount: fc.oneof(fc.float({ min: 0.01, max: 999999999.99 }), fc.constant(0), fc.float({ max: -0.01 })),
    category: fc.oneof(fc.constantFrom('Food', 'Transport', 'Fun'), fc.constant(''))
  }),
  ({ name, amount, category }) => {
    const result = validateForm(name, String(amount), category);
    const expectedValid =
      name.trim().length > 0 && name.length <= 100 &&
      amount >= 0.01 && amount <= 999999999.99 &&
      ['Food', 'Transport', 'Fun'].includes(category);
    return result.valid === expectedValid;
  }
), { numRuns: 100 });
```

**Property 2 — Transaction creation round-trip**
```
// Feature: expense-budget-visualizer, Property 2: Transaction creation round-trip preserves all fields
fc.assert(fc.property(
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    amount: fc.float({ min: 0.01, max: 999999999.99 }),
    category: fc.constantFrom('Food', 'Transport', 'Fun')
  }),
  ({ name, amount, category }) => {
    localStorage.clear();
    addTransaction(name, amount, category);
    const stored = loadTransactions();
    return stored.length === 1 &&
           stored[0].name === name &&
           stored[0].amount === amount &&
           stored[0].category === category &&
           /^\d{4}-\d{2}-\d{2}T/.test(stored[0].createdAt);
  }
), { numRuns: 100 });
```

**Property 4 — List reflects storage**
```
// Feature: expense-budget-visualizer, Property 4: Transaction list always reflects exactly the current contents of Local Storage
fc.assert(fc.property(
  fc.array(fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    amount: fc.float({ min: 0.01, max: 999999999.99 }),
    category: fc.constantFrom('Food', 'Transport', 'Fun')
  }), { minLength: 0, maxLength: 20 }),
  (transactionInputs) => {
    localStorage.clear();
    transactionInputs.forEach(({ name, amount, category }) => addTransaction(name, amount, category));
    renderTransactionList();
    const listItems = document.querySelectorAll('#transaction-list .transaction-item');
    const stored = loadTransactions();
    return listItems.length === stored.length &&
           [...listItems].every((item, i) => item.dataset.id === stored[i].id);
  }
), { numRuns: 100 });
```

**Property 6 — Balance sum**
```
// Feature: expense-budget-visualizer, Property 6: Balance equals the sum of all transaction amounts
fc.assert(fc.property(
  fc.array(fc.float({ min: 0.01, max: 999999999.99 }), { minLength: 1, maxLength: 50 }),
  (amounts) => {
    const transactions = amounts.map((amount, i) => ({
      id: String(i), name: 'Item', amount, category: 'Food',
      createdAt: new Date().toISOString()
    }));
    saveTransactions(transactions);
    renderBalance();
    const expectedSum = amounts.reduce((a, b) => a + b, 0);
    const displayed = document.getElementById('balance-display').textContent;
    return displayed.includes(expectedSum.toFixed(2));
  }
), { numRuns: 100 });
```

**Property 7 — Chart data aggregates positive amounts only**
```
// Feature: expense-budget-visualizer, Property 7: Chart data aggregates only positive transaction amounts by category
fc.assert(fc.property(
  fc.array(fc.record({
    amount: fc.oneof(fc.float({ min: 0.01, max: 9999 }), fc.float({ max: 0 })),
    category: fc.constantFrom('Food', 'Transport', 'Fun')
  }), { minLength: 1, maxLength: 50 }),
  (entries) => {
    const chartData = computeChartData(entries);
    // Every entry in chart data must have a positive sum
    const allPositive = chartData.datasets[0].data.every(v => v > 0);
    // No zero/negative amounts included
    const expectedCategories = new Set(
      entries.filter(e => e.amount > 0).map(e => e.category)
    );
    const actualCategories = new Set(
      chartData.labels.map(l => l.split(' ')[0])
    );
    return allPositive && [...expectedCategories].every(c => actualCategories.has(c));
  }
), { numRuns: 100 });
```

**Property 9 — Malformed storage graceful handling**
```
// Feature: expense-budget-visualizer, Property 9: Malformed or unavailable Local Storage data is handled gracefully
fc.assert(fc.property(
  fc.oneof(
    fc.string(),          // random string (likely malformed JSON)
    fc.constant('null'),
    fc.constant('{'),     // truncated JSON
    fc.constant('[]abc')  // invalid suffix
  ),
  (malformedValue) => {
    localStorage.setItem('expense-visualizer-transactions', malformedValue);
    let threw = false;
    try {
      const result = loadTransactions();
      return Array.isArray(result) && result.length === 0;
    } catch {
      threw = true;
    }
    return !threw;
  }
), { numRuns: 100 });
```

### Unit Tests (Example-Based)

Focus on specific behaviors not covered by properties:

- **Empty state**: No transactions → balance shows "0.00", list shows "No transactions yet", chart shows "No spending data"
- **Storage write ordering**: Mock `localStorage.setItem`; verify it's called before `renderAll` (spy ordering)
- **Delete storage ordering**: Mock `localStorage.setItem`; verify delete write precedes render
- **Delete failure**: Mock `localStorage.setItem` to throw; verify error banner shown, list unchanged
- **Form reset**: Submit valid form; verify name='', amount='', category='' after submission
- **HTML file references**: Read `index.html`; verify `link[href]` starts with `css/` and `script[src]` starts with `js/`

### Integration Tests

Manual browser tests (or browser automation with Playwright/Puppeteer):

- Add a transaction in browser → verify it persists after page reload
- Add 20+ transactions → verify list scrolls, layout outside list is unaffected
- Performance: add/delete transaction, time update — must complete within 100ms
- Load 500 transactions from Local Storage → render completes within 500ms

### Browser Compatibility

Manual smoke tests on:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

Verify: load from file (`file://`), no build step needed, Chart.js CDN loads correctly.
