# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side single-page expense tracker using HTML, CSS, and Vanilla JavaScript. The app is built in layered increments: file structure and HTML shell first, then CSS, then the JavaScript storage/validation/state/render layers, then event wiring and initialization. Each step is independently verifiable and builds on the previous one.

## Tasks

- [x] 1. Set up project file structure and HTML shell
  - [x] 1.1 Create the project file structure and `index.html`
    - Create `index.html` at the project root, `css/style.css`, and `js/app.js` (empty stubs for now)
    - In `index.html`, add the full HTML skeleton: `#loading-indicator`, `#error-banner` (with close button), `<header>` containing `#balance-display`, `<main>` with `section.input-section` > `#transaction-form` (fields: `#input-name`, `#error-name`, `#input-amount`, `#error-amount`, `#input-category`, `#error-category`, submit button), `section.list-section` > `#transaction-list`, `section.chart-section` > `#chart-container` > `canvas#spending-chart` + `#chart-empty-state`, and `<footer>`
    - Add ARIA attributes: `role="alert"` on `#error-name`, `#error-amount`, `#error-category`, `#error-banner`; `aria-describedby` on each input referencing its error element
    - Add Chart.js CDN `<script>` tag before `js/app.js` script tag: `https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js`
    - Reference CSS as `css/style.css` and JS as `js/app.js` using relative paths
    - _Requirements: 6.1, 6.2, 6.3_

  - [x]* 1.2 Write unit test: HTML file references and required element presence
    - Read `index.html` and assert `link[href]` starts with `css/`, `script[src^="js/"]` exists, and all required element IDs are present
    - Assert Chart.js CDN script tag is present before `js/app.js`
    - _Requirements: 6.3_

- [x] 2. Implement CSS styling
  - [x] 2.1 Write `css/style.css` with layout and component styles
    - Style the page with a clean minimal design: centered content column, readable typography, clear visual hierarchy between header, form, list, and chart sections
    - Style `#transaction-list` with `max-height` and `overflow-y: auto` to make it independently scrollable
    - Style `#loading-indicator` as a full-page overlay (visible by default; hidden via a `.hidden` utility class)
    - Style `#error-banner` as a fixed-position top banner with a close (×) button
    - Style inline error elements (`#error-name`, `#error-amount`, `#error-category`) with a muted/red color below their respective fields; hidden by default
    - Style `#chart-empty-state` as centered placeholder text; visible by default, hidden when chart is rendered
    - Apply responsive layout so the app is usable on narrow viewports (min-width: 320px)
    - _Requirements: 2.3, 2.4, 7.1_

- [x] 3. Implement the Storage Layer in `js/app.js`
  - [x] 3.1 Implement `loadTransactions` and `saveTransactions`
    - Define the Local Storage key constant: `"expense-visualizer-transactions"`
    - `loadTransactions()`: read from `localStorage`, parse with `JSON.parse()`; if access throws, parse throws, or result is not an array — call `showError(message)` and return `[]`
    - `saveTransactions(transactions)`: serialize to JSON and write with `localStorage.setItem()`; return `true` on success, return `false` and call `showError(message)` if `setItem` throws
    - Use `crypto.randomUUID()` with `Date.now().toString()` as fallback for generating transaction IDs (define a helper `generateId()`)
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x]* 3.2 Write property test for malformed storage handling (Property 9)
    - **Property 9: Malformed or unavailable Local Storage data is handled gracefully**
    - **Validates: Requirements 5.4**
    - For any arbitrary string stored under the transactions key (including empty, truncated JSON, non-JSON, `"null"`, `"[]abc"`), `loadTransactions()` SHALL return an empty array and SHALL NOT throw

  - [x]* 3.3 Write unit tests for Storage Layer
    - Test: `loadTransactions()` with empty localStorage returns `[]`
    - Test: `saveTransactions()` then `loadTransactions()` round-trip returns identical array
    - Test: mock `localStorage.setItem` to throw; `saveTransactions()` returns `false`
    - _Requirements: 5.4, 5.5_

- [x] 4. Implement the Validator in `js/app.js`
  - [x] 4.1 Implement `validateForm(name, amount, category)`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - Name valid: non-empty after trim, length ≤ 100
    - Amount valid: parseable as float, value in range [0.01, 999999999.99]
    - Category valid: one of `"Food"`, `"Transport"`, `"Fun"`
    - Return `valid: true` only when all three fields pass; populate `errors` object for each failing field
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x]* 4.2 Write property test for validation correctness (Property 1)
    - **Property 1: Validation correctly accepts valid inputs and rejects invalid inputs**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
    - For any combination of (name, amount, category), `validateForm` SHALL return `valid: true` if and only if all three fields satisfy their constraints simultaneously

- [x] 5. Implement the Render Layer (non-chart) in `js/app.js`
  - [x] 5.1 Implement `showError`, `hideError`, `displayValidationErrors`, `clearValidationErrors`, `resetForm`
    - `showError(message)`: set text on `#error-banner`, remove `.hidden` class, auto-dismiss after 5 seconds, wire close button to `hideError()`
    - `hideError()`: add `.hidden` class to `#error-banner`
    - `displayValidationErrors(errors)`: for each key in `errors`, set the text of `#error-{field}` and remove its `.hidden` class
    - `clearValidationErrors()`: clear text and add `.hidden` class to `#error-name`, `#error-amount`, `#error-category`
    - `resetForm()`: set `#input-name` value to `""`, `#input-amount` value to `""`, `#input-category` selectedIndex to `0` (no selection)
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

  - [x] 5.2 Implement `renderBalance`
    - Call `loadTransactions()`, sum all `transaction.amount` values
    - Format as currency symbol + value to two decimal places (e.g., `"$0.00"`)
    - Set formatted value as the text content of `#balance-display`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x]* 5.3 Write property test for balance sum correctness (Property 6)
    - **Property 6: Balance equals the sum of all transaction amounts**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - For any array of transactions saved to localStorage, the text content of `#balance-display` after `renderBalance()` SHALL contain the arithmetic sum formatted to exactly two decimal places

  - [x] 5.4 Implement `renderTransactionList`
    - Call `loadTransactions()`; if empty, render an empty-state message ("No transactions yet") inside `#transaction-list`
    - For each transaction (most-recent-first order): create a list item containing item name (truncated to 100 chars), amount formatted to two decimal places with currency symbol, category, and a delete button with `data-id` attribute set to the transaction's `id`
    - Replace the contents of `#transaction-list` with the newly built items
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x]* 5.5 Write property test for transaction list reflecting storage (Property 4)
    - **Property 4: Transaction list always reflects exactly the current contents of Local Storage**
    - **Validates: Requirements 2.1, 2.5**
    - For any sequence of add operations, the count of `.transaction-item` elements in `#transaction-list` after `renderTransactionList()` SHALL equal the count of transactions in localStorage, and each item's `data-id` SHALL match the corresponding stored transaction's `id`

  - [x]* 5.6 Write property test for transaction rendering fields (Property 5)
    - **Property 5: Transaction rendering includes all required fields with correct formatting**
    - **Validates: Requirements 2.2**
    - For any transaction with arbitrary name, amount, and category, the rendered list item SHALL contain the item name (truncated to 100 chars), amount formatted to two decimal places with a currency symbol, and the category string

- [x] 6. Implement the Chart Render Layer in `js/app.js`
  - [x] 6.1 Implement `computeChartData(transactions)` (pure helper)
    - Filter to only transactions with `amount > 0`
    - Group by category and sum amounts
    - Compute percentage per category; format labels as `"CategoryName (X.X%)"`
    - Return `{ labels: string[], datasets: [{ data: number[], backgroundColor: string[] }] }` with fixed hex colors per category
    - Export or expose this function for direct testing
    - _Requirements: 4.1, 4.2, 4.6_

  - [x]* 6.2 Write property test for chart data (Property 7)
    - **Property 7: Chart data aggregates only positive transaction amounts by category**
    - **Validates: Requirements 4.1, 4.6**
    - For any array of transactions (including zero/negative amounts), `computeChartData` SHALL include only categories with at least one positive-amount transaction, and each category's value SHALL equal the sum of its positive amounts only

  - [x]* 6.3 Write property test for chart labels (Property 8)
    - **Property 8: Chart labels display category name and correct percentage**
    - **Validates: Requirements 4.2**
    - For any chart data object, each label SHALL match the pattern `"CategoryName (X.X%)"` where the percentage is rounded to one decimal place and the category's share sums correctly across all labels

  - [x] 6.4 Implement `renderChart`
    - Declare module-scoped `let chartInstance = null`
    - Call `loadTransactions()`, compute chart data via `computeChartData()`
    - If no data (empty labels): destroy existing chart instance if any, show `#chart-empty-state`, hide `canvas#spending-chart`
    - If data exists: hide `#chart-empty-state`, show `canvas#spending-chart`; if `chartInstance` exists mutate `chart.data` and call `chart.update()` (avoid destroy/recreate); if `chartInstance` is null create a new `Chart` Pie instance
    - Wrap in try/catch; on any Chart.js error call `showError(message)` and show `#chart-empty-state`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Checkpoint — Verify render layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the State Engine and `renderAll` in `js/app.js`
  - [x] 8.1 Implement `addTransaction(name, amount, category)`
    - Call `loadTransactions()`, unshift new transaction object (`{ id: generateId(), name, amount, category, createdAt: new Date().toISOString() }`)
    - Call `saveTransactions(transactions)`; if it returns `false`, return `false` (error already shown by storage layer)
    - If save succeeded, call `renderAll()`, then return `true`
    - _Requirements: 1.6, 5.1_

  - [x]* 8.2 Write property test for transaction creation round-trip (Property 2)
    - **Property 2: Transaction creation round-trip preserves all fields**
    - **Validates: Requirements 1.6, 5.1**
    - For any valid (name, amount, category), after `addTransaction()`, `loadTransactions()` SHALL return an array of length 1 whose single entry has matching name, amount, category, and a valid ISO 8601 `createdAt`

  - [x] 8.3 Implement `deleteTransaction(id)`
    - Call `loadTransactions()`, filter out the transaction with matching `id`
    - Call `saveTransactions(filtered)`; if it returns `false`, return `false`
    - If save succeeded, call `renderAll()`, then return `true`
    - _Requirements: 2.5, 5.2_

  - [x] 8.4 Implement `renderAll`
    - Call `renderBalance()`, `renderTransactionList()`, `renderChart()` in sequence
    - _Requirements: 3.3, 3.4, 4.3, 4.4_

  - [x]* 8.5 Write unit tests for State Engine
    - Test: `addTransaction` with valid inputs → `loadTransactions()` returns array with new item at index 0
    - Test: `deleteTransaction` removes correct item by id
    - Test: mock `localStorage.setItem` to throw on `addTransaction` → returns `false`, error shown, no render
    - Test: mock `localStorage.setItem` to throw on `deleteTransaction` → returns `false`, error shown, no render
    - _Requirements: 1.6, 2.5, 5.1, 5.2, 5.5_

- [x] 9. Implement Event Handlers and Initialization in `js/app.js`
  - [x] 9.1 Implement `handleFormSubmit` and attach to `#transaction-form`
    - `event.preventDefault()`
    - Read values from `#input-name`, `#input-amount`, `#input-category`
    - Call `clearValidationErrors()`
    - Call `validateForm(name, amountStr, category)`; if `!result.valid`, call `displayValidationErrors(result.errors)` and return
    - Parse amount with `parseFloat`; call `addTransaction(name, amount, category)`
    - On success: call `resetForm()`
    - Attach `input` event listeners on `#input-name`, `#input-amount`, `#input-category` to clear the corresponding inline error element on change
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 9.2 Implement `handleDeleteClick` with event delegation and attach to `#transaction-list`
    - Listen on `#transaction-list` for `click` events; check `event.target` is a delete button (or use `closest('[data-id]')`)
    - Extract `id` from `data-id` attribute; call `deleteTransaction(id)`
    - _Requirements: 2.5, 5.2_

  - [x] 9.3 Implement `init` and call on `DOMContentLoaded`
    - Show `#loading-indicator` (ensure it is visible)
    - Call `loadTransactions()` (triggers error display if malformed)
    - Call `renderAll()`
    - Hide `#loading-indicator` (add `.hidden` class)
    - Attach `handleFormSubmit` to `#transaction-form` `submit` event
    - Attach `handleDeleteClick` to `#transaction-list` `click` event
    - _Requirements: 5.3, 5.4, 7.2, 7.4_

  - [x]* 9.4 Write property test for form reset after submission (Property 3)
    - **Property 3: Form resets to empty state after every successful submission**
    - **Validates: Requirements 1.7**
    - For any valid (name, amount, category), after a successful `handleFormSubmit`, `#input-name` SHALL be empty, `#input-amount` SHALL be empty, and `#input-category` SHALL have no selection

  - [x]* 9.5 Write unit tests for Event Handlers and Initialization
    - Test: submit form with empty name → `#error-name` is visible, no transaction added
    - Test: submit form with invalid amount → `#error-amount` is visible
    - Test: submit form with no category → `#error-category` is visible
    - Test: submit valid form → `loadTransactions().length === 1`, form fields are reset
    - Test: `init()` — verify `#loading-indicator` hidden after call completes
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 7.4_

- [x] 10. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass. Open `index.html` directly in a browser (no server), verify the full flow: add a transaction, confirm it appears in the list and updates the balance and chart, delete it, confirm empty states restore correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Storage write ordering (write-before-render) is a hard constraint enforced in tasks 8.1 and 8.3 per Requirements 5.1 and 5.2
- The `computeChartData` helper (task 6.1) is kept pure (no DOM/storage access) to make it directly unit/property testable
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per run
- The app must load and function by opening `index.html` directly in a browser — no build step or local server required (Requirement 6.2)
- Inline validation error elements are hidden by default via CSS and revealed/hidden by JS class toggling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.1"] },
    { "id": 5, "tasks": ["5.5", "5.6", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["8.1", "8.3", "8.4"] },
    { "id": 7, "tasks": ["8.2", "8.5", "9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "9.5"] }
  ]
}
```
