# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to track personal spending by entering transactions with a name, amount, and category. The app displays a running balance, a scrollable transaction list with delete capability, and a pie chart showing spending distribution by category. All data is persisted in the browser's Local Storage with no backend required.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of a name, an amount, and a category
- **Category**: A classification for a transaction — one of: Food, Transport, or Fun
- **Balance**: The total sum of all transaction amounts currently stored
- **Transaction_List**: The scrollable UI component that displays all stored transactions
- **Input_Form**: The UI form used to create a new transaction
- **Chart**: The pie chart component that visualizes spending distribution by category
- **Local_Storage**: The browser's built-in client-side storage API
- **Validator**: The logic component responsible for validating Input_Form field values before submission

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (max 100 characters), a numeric field for amount (accepting values between 0.01 and 999,999,999.99), and a dropdown selector for category with options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form, THE Validator SHALL check that the item name field is not empty, the amount field contains a positive number within the accepted range, and a category has been selected.
3. IF the item name field is empty when the Input_Form is submitted, THEN THE App SHALL display an inline error message on the item name field and SHALL NOT add a transaction.
4. IF the amount field is empty, zero, negative, or outside the accepted range when the Input_Form is submitted, THEN THE App SHALL display an inline error message on the amount field and SHALL NOT add a transaction.
5. IF no category is selected when the Input_Form is submitted, THEN THE App SHALL display an inline error message on the category selector and SHALL NOT add a transaction.
6. WHEN the Input_Form passes validation, THE App SHALL create a new Transaction record containing the item name, amount, category, and current date and time, and add it to Local_Storage.
7. WHEN a Transaction is successfully saved to Local_Storage, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category selector to unselected.

---

### Requirement 2: Display the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all Transactions stored in Local_Storage on page load, ordered with the most recently added Transaction first.
2. THE Transaction_List SHALL display the item name (truncated at 100 characters if necessary), amount formatted to two decimal places with a currency symbol, and category for each Transaction.
3. WHILE no Transactions are present in Local_Storage, THE Transaction_List SHALL display an empty state message (e.g., "No transactions yet") instead of an empty list.
4. WHEN the number of Transactions exceeds the visible height of the Transaction_List container, THE Transaction_List SHALL become vertically scrollable without affecting the layout of elements outside the container.
5. WHEN the user clicks the delete button on a Transaction entry, THE App SHALL remove that Transaction from Local_Storage and trigger a full re-render of the Transaction_List.
6. IF the delete operation on Local_Storage fails, THEN THE App SHALL display an error message to the user and SHALL NOT remove the Transaction entry from the visible Transaction_List.

---

### Requirement 3: Display and Update Total Balance

**User Story:** As a user, I want to see a total balance at the top of the page, so that I know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the total Balance at the top of the page on load, calculated as the sum of all Transaction amounts in Local_Storage, formatted to two decimal places with a currency symbol.
2. WHILE no Transactions are present in Local_Storage, THE App SHALL display a Balance of 0.00.
3. WHEN a new Transaction is added, THE App SHALL recalculate and update the displayed Balance within 500ms without requiring a page reload.
4. WHEN a Transaction is deleted, THE App SHALL recalculate and update the displayed Balance within 500ms without requiring a page reload.

---

### Requirement 4: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution as a pie chart, with one segment per category that has at least one Transaction with a positive amount, where each segment's arc length is proportional to that category's percentage of the total absolute Transaction amounts.
2. THE Chart SHALL display a label for each segment showing the category name and its percentage of total spending rounded to one decimal place.
3. WHEN a new Transaction is added, THE Chart SHALL update to reflect the new spending distribution within 500ms without requiring a page reload.
4. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution within 500ms without requiring a page reload.
5. WHILE no Transactions with positive amounts are present in Local_Storage, THE Chart SHALL display an empty state message (e.g., "No spending data") in place of the chart.
6. Transactions with zero or negative amounts SHALL be excluded from Chart segment calculations.

---

### Requirement 5: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved when I close and reopen the browser tab, so that I don't lose my spending history.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL write the Transaction to Local_Storage before triggering any UI re-render.
2. WHEN a Transaction is deleted, THE App SHALL remove the Transaction from Local_Storage before triggering any UI re-render.
3. WHEN the App is loaded in a browser, THE App SHALL read all Transactions from Local_Storage and render them in the Transaction_List, Balance, and Chart within 500ms.
4. IF Local_Storage is unavailable or contains malformed data when the App loads, THEN THE App SHALL display an error message and render an empty state for the Transaction_List, Balance, and Chart without crashing.
5. IF a write to or delete from Local_Storage fails during a session, THEN THE App SHALL display an error message to the user and SHALL NOT update the UI to reflect the failed operation.

---

### Requirement 6: Project File Structure

**User Story:** As a developer, I want the project to follow a defined folder structure, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL function as a standalone web application loadable by opening the HTML file directly in a modern browser (Chrome, Firefox, Edge, or Safari) without requiring a build step or local server.
3. THE HTML file SHALL reference the CSS file using a relative path in the format `css/[filename].css` and the JavaScript file using a relative path in the format `js/[filename].js`.

---

### Requirement 7: Performance and Responsiveness

**User Story:** As a user, I want the app to respond instantly to my interactions, so that using it feels smooth and effortless.

#### Acceptance Criteria

1. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance, and Chart within 100ms on a modern desktop browser.
2. THE App SHALL load and render all persisted Transactions on startup within 500ms for up to 500 stored Transactions on a modern desktop browser.
3. IF the Transaction_List, Balance, or Chart fails to update within the specified time bound after an add or delete operation, THEN THE App SHALL display an error indicator to the user.
4. IF the App fails to complete the startup render within 500ms, THEN THE App SHALL display a loading indicator until rendering is complete.
