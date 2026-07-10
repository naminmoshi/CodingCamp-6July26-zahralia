// js/app.js - Expense & Budget Visualizer application logic

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'expense-visualizer-transactions';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Generates a unique ID for a transaction.
 * Prefers crypto.randomUUID() and falls back to Date.now().toString().
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

// ---------------------------------------------------------------------------
// Error Display  (Requirements 1.3, 1.4, 1.5, 1.7)
// ---------------------------------------------------------------------------

/** @type {number|null} Timer handle for the auto-dismiss timeout. */
let errorDismissTimer = null;

/**
 * Displays a global error message in #error-banner and auto-dismisses it
 * after 5 seconds. Also wires the close button to hideError().
 * @param {string} message
 */
function showError(message) {
  const banner = document.getElementById('error-banner');
  const messageEl = document.getElementById('error-banner-message');
  const closeBtn = document.getElementById('error-banner-close');

  if (!banner || !messageEl) {
    // DOM not ready — fall back to console so errors are never swallowed.
    console.error('[showError]', message);
    return;
  }

  messageEl.textContent = message;

  // Remove both the HTML hidden attribute and any .hidden CSS class.
  banner.removeAttribute('hidden');
  banner.classList.remove('hidden');

  // Wire the close button (replace any previous listener by cloning).
  if (closeBtn) {
    const freshBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(freshBtn, closeBtn);
    freshBtn.addEventListener('click', hideError);
  }

  // Cancel any existing auto-dismiss timer before starting a new one.
  if (errorDismissTimer !== null) {
    clearTimeout(errorDismissTimer);
  }
  errorDismissTimer = setTimeout(hideError, 5000);
}

/**
 * Hides the global error banner by adding the .hidden CSS class.
 */
function hideError() {
  const banner = document.getElementById('error-banner');
  if (banner) {
    banner.classList.add('hidden');
  }
  if (errorDismissTimer !== null) {
    clearTimeout(errorDismissTimer);
    errorDismissTimer = null;
  }
}

/**
 * Displays inline validation errors for form fields.
 * For each key in `errors`, sets the text of #error-{field} and removes
 * its .hidden class so it becomes visible.
 * @param {{ name?: string, amount?: string, category?: string }} errors
 */
function displayValidationErrors(errors) {
  Object.keys(errors).forEach(function(field) {
    const el = document.getElementById('error-' + field);
    if (el) {
      el.textContent = errors[field];
      el.classList.remove('hidden');
    }
  });
}

/**
 * Clears all inline validation errors for the three form fields.
 * Sets text to empty and adds .hidden class to each error element.
 */
function clearValidationErrors() {
  ['name', 'amount', 'category'].forEach(function(field) {
    const el = document.getElementById('error-' + field);
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  });
}

/**
 * Resets the transaction form to its empty / unselected state:
 *   - #input-name value → ""
 *   - #input-amount value → ""
 *   - #input-category selectedIndex → 0 (the "-- Select a category --" placeholder)
 */
function resetForm() {
  const nameInput = document.getElementById('input-name');
  const amountInput = document.getElementById('input-amount');
  const categorySelect = document.getElementById('input-category');

  if (nameInput) nameInput.value = '';
  if (amountInput) amountInput.value = '';
  if (categorySelect) categorySelect.selectedIndex = 0;
}

// ---------------------------------------------------------------------------
// Storage Layer  (Requirements 5.1, 5.2, 5.4, 5.5)
// ---------------------------------------------------------------------------

/**
 * Loads the transaction array from Local Storage.
 *
 * Returns the parsed array on success.
 * If localStorage access throws, JSON.parse throws, or the parsed value is
 * not an array, calls showError() and returns an empty array.
 *
 * @returns {Array<Object>}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // getItem returns null when the key does not exist — treat as empty list
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      showError('Transaction data is corrupted. Starting with an empty list.');
      return [];
    }
    return parsed;
  } catch (err) {
    showError('Unable to load transactions. Storage may be unavailable or data is malformed.');
    return [];
  }
}

/**
 * Saves the transaction array to Local Storage.
 *
 * Returns true on success.
 * If localStorage.setItem throws (e.g. quota exceeded), calls showError()
 * and returns false.
 *
 * @param {Array<Object>} transactions
 * @returns {boolean}
 */
function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (err) {
    showError('Unable to save transactions. Storage may be full or unavailable.');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Validator  (Requirements 1.2, 1.3, 1.4, 1.5)
// ---------------------------------------------------------------------------

/**
 * Validates the three Input_Form fields before a transaction is created.
 *
 * Rules:
 *   name     — non-empty after trimming whitespace; at most 100 characters
 *   amount   — parseable as a finite float; value in [0.01, 999999999.99]
 *   category — one of the three allowed values: "Food", "Transport", "Fun"
 *
 * @param {string} name      Raw value from #input-name
 * @param {string} amount    Raw value from #input-amount (string representation)
 * @param {string} category  Raw value from #input-category
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(name, amount, category) {
  const errors = {};

  // --- Name validation ---
  const trimmedName = (typeof name === 'string' ? name : '').trim();
  if (trimmedName.length === 0) {
    errors.name = 'Item name is required.';
  } else if (name.length > 100) {
    errors.name = 'Item name must be 100 characters or fewer.';
  }

  // --- Amount validation ---
  const parsedAmount = parseFloat(amount);
  if (amount === '' || amount === null || amount === undefined || isNaN(parsedAmount)) {
    errors.amount = 'Amount must be a valid number.';
  } else if (!isFinite(parsedAmount)) {
    errors.amount = 'Amount must be a finite number.';
  } else if (parsedAmount < 0.01) {
    errors.amount = 'Amount must be at least 0.01.';
  } else if (parsedAmount > 999999999.99) {
    errors.amount = 'Amount must not exceed 999,999,999.99.';
  }

  // --- Category validation ---
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid category (Food, Transport, or Fun).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Render Layer — Balance  (Requirements 3.1, 3.2, 3.3, 3.4)
// ---------------------------------------------------------------------------

/**
 * Reads all transactions from Local Storage, sums their amounts, formats the
 * result as a currency string (e.g. "$12.50"), and sets it as the text content
 * of #balance-display.
 *
 * - An empty transaction list results in "$0.00".
 * - Uses the same loadTransactions() helper so storage errors are handled
 *   consistently (showError + fall back to empty array).
 */
function renderBalance() {
  const transactions = loadTransactions();

  const total = transactions.reduce(function(sum, transaction) {
    return sum + transaction.amount;
  }, 0);

  const formatted = '$' + total.toFixed(2);

  const balanceDisplay = document.getElementById('balance-display');
  if (balanceDisplay) {
    balanceDisplay.textContent = formatted;
  }
}

// ---------------------------------------------------------------------------
// Render Layer — Transaction List  (Requirements 2.1, 2.2, 2.3, 2.4)
// ---------------------------------------------------------------------------

/**
 * Rebuilds the #transaction-list DOM from the current transactions in storage.
 *
 * - Loads transactions via loadTransactions() (most-recent-first order,
 *   since addTransaction uses unshift).
 * - If the list is empty, renders a single <li class="empty-state"> with
 *   the text "No transactions yet".
 * - For each transaction, creates a <li class="transaction-item"> containing:
 *     - Item name (truncated to 100 chars)
 *     - Amount formatted to two decimal places with "$" currency symbol
 *     - Category
 *     - A delete button with class "transaction-delete" and data-id attribute
 * - Replaces the entire contents of #transaction-list with the new items.
 */
function renderTransactionList() {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  const transactions = loadTransactions();

  // Clear current contents
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No transactions yet';
    listEl.appendChild(emptyItem);
    return;
  }

  transactions.forEach(function(transaction) {
    const truncatedName = transaction.name.length > 100
      ? transaction.name.slice(0, 100)
      : transaction.name;

    const formattedAmount = '$' + transaction.amount.toFixed(2);

    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = transaction.id;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'transaction-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = truncatedName;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'transaction-meta';
    metaSpan.textContent = transaction.category;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(metaSpan);

    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = formattedAmount;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'transaction-delete';
    deleteBtn.dataset.id = transaction.id;
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', 'Delete transaction: ' + truncatedName);

    li.appendChild(infoDiv);
    li.appendChild(amountSpan);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// Chart Data Helper  (Requirements 4.1, 4.2, 4.6)
// ---------------------------------------------------------------------------

/**
 * Fixed hex colors per category.
 * @type {Object.<string, string>}
 */
const CATEGORY_COLORS = {
  Food:      '#f59e0b',
  Transport: '#3b82f6',
  Fun:       '#10b981',
};

/**
 * Computes Chart.js-compatible pie chart data from a transactions array.
 *
 * - Filters to only transactions where amount > 0
 * - Groups by category and sums amounts
 * - Computes each category's percentage of total, rounded to 1 decimal place
 * - Labels are formatted as "CategoryName (X.X%)"
 * - Returns empty labels/data arrays when no positive-amount transactions exist
 *
 * This function is PURE: no DOM access, no localStorage access.
 *
 * @param {Array<{ amount: number, category: string }>} transactions
 * @returns {{ labels: string[], datasets: [{ data: number[], backgroundColor: string[] }] }}
 */
function computeChartData(transactions) {
  // Filter to only positive-amount transactions
  const positive = transactions.filter(function(t) {
    return t.amount > 0;
  });

  if (positive.length === 0) {
    return {
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }],
    };
  }

  // Group by category and sum amounts
  const totals = {};
  positive.forEach(function(t) {
    if (totals[t.category] === undefined) {
      totals[t.category] = 0;
    }
    totals[t.category] += t.amount;
  });

  // Compute grand total for percentage calculation
  const grandTotal = Object.values(totals).reduce(function(sum, val) {
    return sum + val;
  }, 0);

  // Build labels, data, and backgroundColor arrays
  const labels = [];
  const data = [];
  const backgroundColor = [];

  Object.keys(totals).forEach(function(category) {
    const categoryTotal = totals[category];
    const percentage = ((categoryTotal / grandTotal) * 100).toFixed(1);
    labels.push(category + ' (' + percentage + '%)');
    data.push(categoryTotal);
    backgroundColor.push(CATEGORY_COLORS[category] || '#6b7280'); // fallback gray
  });

  return {
    labels: labels,
    datasets: [{ data: data, backgroundColor: backgroundColor }],
  };
}

// ---------------------------------------------------------------------------
// Render Layer — Chart  (Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6)
// ---------------------------------------------------------------------------

/**
 * Module-scoped singleton reference to the Chart.js instance.
 * null when no chart has been created yet.
 * @type {Chart|null}
 */
let chartInstance = null;

/**
 * Renders or updates the spending pie chart using Chart.js.
 *
 * - Loads transactions via loadTransactions() and computes chart data via
 *   computeChartData().
 * - If no data (empty labels array):
 *     • Destroys the existing chartInstance if one exists, then sets it to null.
 *     • Shows #chart-empty-state (removes .hidden).
 *     • Hides canvas#spending-chart (adds .hidden).
 * - If data exists:
 *     • Hides #chart-empty-state (adds .hidden).
 *     • Shows canvas#spending-chart (removes .hidden).
 *     • If chartInstance already exists: mutates chart.data in-place and calls
 *       chart.update() to avoid a destroy/recreate flicker.
 *     • If chartInstance is null: creates a new Chart Pie instance and stores
 *       the reference in chartInstance.
 * - Wrapped in try/catch: any Chart.js error calls showError(message) and
 *   shows #chart-empty-state.
 */
function renderChart() {
  try {
    const transactions = loadTransactions();
    const chartData = computeChartData(transactions);

    const canvas = document.getElementById('spending-chart');
    const emptyState = document.getElementById('chart-empty-state');

    if (chartData.labels.length === 0) {
      // No positive-amount transactions — show empty state
      if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
      }
      if (emptyState) emptyState.classList.remove('hidden');
      if (canvas) canvas.classList.add('hidden');
      return;
    }

    // Data exists — show chart, hide empty state
    if (emptyState) emptyState.classList.add('hidden');
    if (canvas) canvas.classList.remove('hidden');

    if (chartInstance !== null) {
      // Mutate existing chart data to avoid destroy/recreate flickering
      chartInstance.data.labels = chartData.labels;
      chartInstance.data.datasets[0].data = chartData.datasets[0].data;
      chartInstance.data.datasets[0].backgroundColor = chartData.datasets[0].backgroundColor;
      chartInstance.update();
    } else {
      // Create a new Chart.js Pie instance
      chartInstance = new Chart(canvas, {
        type: 'pie',
        data: chartData,
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      });
    }
  } catch (err) {
    showError('Unable to render the spending chart: ' + err.message);
    const emptyState = document.getElementById('chart-empty-state');
    if (emptyState) emptyState.classList.remove('hidden');
  }
}

// ---------------------------------------------------------------------------
// Render Layer — renderAll  (Requirements 3.3, 3.4, 4.3, 4.4)
// ---------------------------------------------------------------------------

/**
 * Convenience function that re-renders all dynamic UI sections in sequence:
 * balance, transaction list, and chart.
 *
 * Called after any state mutation (add or delete) so the entire UI stays in
 * sync with Local Storage in a single pass.
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

// ---------------------------------------------------------------------------
// State Engine — addTransaction  (Requirements 1.6, 5.1)
// ---------------------------------------------------------------------------

/**
 * Adds a new transaction to Local Storage and re-renders the UI.
 *
 * Steps:
 *   1. Load existing transactions from storage.
 *   2. Unshift a new transaction object (most-recent-first order).
 *   3. Save the updated array; if save fails, return false (error already
 *      displayed by saveTransactions).
 *   4. Re-render the full UI via renderAll().
 *   5. Return true.
 *
 * @param {string} name       Validated item name.
 * @param {number} amount     Validated positive float amount.
 * @param {string} category   One of "Food", "Transport", or "Fun".
 * @returns {boolean} true on success, false if the storage write failed.
 */
function addTransaction(name, amount, category) {
  const transactions = loadTransactions();

  const newTransaction = {
    id: generateId(),
    name: name,
    amount: amount,
    category: category,
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(newTransaction);

  const saved = saveTransactions(transactions);
  if (!saved) {
    return false;
  }

  renderAll();
  return true;
}

// ---------------------------------------------------------------------------
// State Engine — deleteTransaction  (Requirements 2.5, 5.2)
// ---------------------------------------------------------------------------

/**
 * Removes a transaction by its id from Local Storage and re-renders the UI.
 *
 * Steps:
 *   1. Load existing transactions from storage.
 *   2. Filter out the transaction whose id matches the provided id.
 *   3. Save the filtered array; if save fails, return false (error already
 *      displayed by saveTransactions).
 *   4. Re-render the full UI via renderAll().
 *   5. Return true.
 *
 * @param {string} id  The id of the transaction to delete.
 * @returns {boolean} true on success, false if the storage write failed.
 */
function deleteTransaction(id) {
  const transactions = loadTransactions();

  const filtered = transactions.filter(function(transaction) {
    return transaction.id !== id;
  });

  const saved = saveTransactions(filtered);
  if (!saved) {
    return false;
  }

  renderAll();
  return true;
}

// ---------------------------------------------------------------------------
// Event Handlers — handleFormSubmit  (Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7)
// ---------------------------------------------------------------------------

/**
 * Handles the #transaction-form submit event.
 *
 * Steps:
 *   1. Prevent the default form submission (page reload).
 *   2. Read raw values from #input-name, #input-amount, #input-category.
 *   3. Clear any existing inline validation errors.
 *   4. Validate the values; if invalid, display errors and return early.
 *   5. Parse the amount string to a float.
 *   6. Call addTransaction(); on success, reset the form.
 *
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const nameInput     = document.getElementById('input-name');
  const amountInput   = document.getElementById('input-amount');
  const categoryInput = document.getElementById('input-category');

  const name      = nameInput     ? nameInput.value     : '';
  const amountStr = amountInput   ? amountInput.value   : '';
  const category  = categoryInput ? categoryInput.value : '';

  clearValidationErrors();

  const result = validateForm(name, amountStr, category);
  if (!result.valid) {
    displayValidationErrors(result.errors);
    return;
  }

  const amount = parseFloat(amountStr);
  const success = addTransaction(name, amount, category);
  if (success) {
    resetForm();
  }
}

// ---------------------------------------------------------------------------
// Event Handlers — handleDeleteClick  (Requirements 2.5, 5.2)
// ---------------------------------------------------------------------------

/**
 * Handles click events delegated from #transaction-list.
 *
 * Uses event delegation so a single listener covers all delete buttons,
 * including ones added dynamically by renderTransactionList().
 *
 * Identifies a delete-button click by checking for the closest
 * button element that carries a data-id attribute, then calls
 * deleteTransaction() with that id.
 *
 * @param {Event} event
 */
function handleDeleteClick(event) {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;

  const id = btn.dataset.id;
  if (id) {
    deleteTransaction(id);
  }
}

// ---------------------------------------------------------------------------
// Initialization  (Requirements 5.3, 5.4, 7.2, 7.4)
// ---------------------------------------------------------------------------

/**
 * Initializes the application on DOMContentLoaded.
 *
 * Steps:
 *   1. Ensure #loading-indicator is visible (remove .hidden class).
 *   2. Load transactions from storage (triggers error display if malformed).
 *   3. Render the full UI.
 *   4. Hide #loading-indicator (add .hidden class).
 *   5. Attach handleFormSubmit to #transaction-form submit event.
 *   6. Attach handleDeleteClick to #transaction-list click event (delegation).
 *   7. Attach input listeners on each form field to clear its specific inline
 *      error element whenever the user modifies that field's value.
 */
function init() {
  // Step 1 — show loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.remove('hidden');
  }

  // Step 2 — load transactions (errors displayed internally by loadTransactions)
  loadTransactions();

  // Step 3 — render the full UI
  renderAll();

  // Step 4 — hide loading indicator
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }

  // Step 5 — attach form submit handler
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Step 6 — attach delegated delete handler
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', handleDeleteClick);
  }

  // Step 7 — attach per-field listeners to clear inline errors when the user edits a field.
  // Text/number inputs use 'input'; <select> uses 'change' (select elements don't fire 'input'
  // reliably across all browsers).
  ['name', 'amount'].forEach(function(field) {
    const inputEl = document.getElementById('input-' + field);
    if (inputEl) {
      inputEl.addEventListener('input', function() {
        const errorEl = document.getElementById('error-' + field);
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.add('hidden');
        }
      });
    }
  });

  // Category uses a <select> — must listen for 'change', not 'input'
  const categorySelect = document.getElementById('input-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      const errorEl = document.getElementById('error-category');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', init);
