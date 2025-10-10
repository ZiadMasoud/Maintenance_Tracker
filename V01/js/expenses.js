/**
 * Expenses Functionality
 * This file handles the car expenses section of the Car Maintenance Tracker.
 */

// DOM Elements
let expenseForm;
let expenseDate;
let expenseDescription;
let expenseAmount;
let saveExpenseBtn;
let expensesTableBody;
let addExpenseModal;
let currentExpenseId = null;

// Module state
const expensesModule = {
    isSubmitting: false
};

// Initialize expenses
async function initExpenses() {
    try {
        // console.log('Initializing expenses...'); // Keep console log for debugging during development
        
        // Get form elements
        expenseForm = document.getElementById('expenseForm');
        expenseDate = document.getElementById('expenseDate');
        expenseDescription = document.getElementById('expenseDescription');
        expenseAmount = document.getElementById('expenseAmount');
        saveExpenseBtn = document.getElementById('saveExpenseBtn');
        expensesTableBody = document.getElementById('expensesTableBody');
        
        if (expenseForm && saveExpenseBtn) {
            // Add event listener to save button
            saveExpenseBtn.addEventListener('click', handleSaveExpense);
            
            // Set default date to today
            if (expenseDate) {
                expenseDate.valueAsDate = new Date();
            }
        }
        
        // Display existing expenses
        await displayExpenses();
        // console.log('Expenses initialized successfully'); // Keep console log for debugging during development
    } catch (error) {
        console.error('Error initializing expenses:', error); // Keep console error for debugging
        showError('Failed to initialize expenses');
    }
}

// Reset expense form
function resetExpenseForm() {
    if (expenseForm) {
        expenseForm.reset();
    }
    
    if (expenseDate) {
        expenseDate.valueAsDate = new Date();
    }
    
    // Reset current expense ID
    currentExpenseId = null;
    
    // Reset submission flag
    expensesModule.isSubmitting = false;
    
    // Reset save button text
    if (saveExpenseBtn) {
        saveExpenseBtn.textContent = 'Save';
    }
}

// Handle save expense
async function handleSaveExpense() {
    try {
        // Prevent duplicate submissions
        if (expensesModule.isSubmitting) return;
        expensesModule.isSubmitting = true;
        
        // Get form data
        const expense = {
            date: expenseDate.value,
            description: expenseDescription.value || '',
            amount: parseFloat(expenseAmount.value)
        };
        
        // Validate data
        if (!expense.date || isNaN(expense.amount) || expense.amount <= 0) {
            showError('Please enter a valid date and amount');
            expensesModule.isSubmitting = false;
            return;
        }
        
        // Save to database
        if (currentExpenseId) {
            expense.id = currentExpenseId; // Add ID for update
            await window.dbManager.updateRecord(window.dbManager.STORES.EXPENSES, expense);
        } else {
            await window.dbManager.addRecord(window.dbManager.STORES.EXPENSES, expense);
        }        

        
        // Reset form
        resetExpenseForm();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        if (modal) {
            modal.hide();
        }
        
        // Update display
        await displayExpenses();
        
        // Show toast notification
        showToast(currentExpenseId ? 'Expense updated successfully' : 'Expense added successfully', 'success');
    } catch (error) {
        console.error('Error saving expense:', error);
        showError('Failed to save expense: ' + error.message);
    } finally {
        expensesModule.isSubmitting = false;
    }
}

// Display expenses
async function displayExpenses() {
    try {
        const expensesTableBody = document.getElementById('expensesTableBody');
        if (!expensesTableBody) return;
        
        // Get all expenses
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        
        // Sort by date (newest first)
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update table
        expensesTableBody.innerHTML = expenses.length > 0 ? 
 expenses.map(expense => `
                <tr>
                    <td>${new Date(expense.date).toLocaleDateString()}</td>
                    <td>${expense.description || '-'}</td>
                    <td>EGP ${expense.amount.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editExpense('${expense.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${expense.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
 `).join('') : `
            <tr class="empty-state">
                <td colspan="5">
                    <div>
                        <i class="fas fa-receipt"></i>
                        <p>No expenses recorded yet</p>
                    </div>
                </td>
            </tr>`;
    } catch (error) {
        console.error('Error displaying expenses:', error);
        showError('Failed to display expenses'); // Use showError for consistency
    }
}

// Edit expense
async function editExpense(id) {
    try {
        const expense = await window.dbManager.getRecordById(window.dbManager.STORES.EXPENSES, id);
        if (!expense) {
            showError('Expense not found'); // Use showError for consistency
            return;
        }
        
        // Populate form
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseDescription').value = expense.description || '';
            document.getElementById('expenseAmount').value = expense.amount;
        }

        // Set current expense ID
 currentExpenseId = id;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing expense:', error);
        showError('Failed to edit expense'); // Use showError for consistency
    }
}

// Delete expense
async function deleteExpense(id) {
    try {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }
        
        await window.dbManager.deleteRecord(window.dbManager.STORES.EXPENSES, id);
        await displayExpenses();
        showToast('Expense deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting expense:', error); // Keep console error for debugging
        showToast('Failed to delete expense', 'error');
    }
}

// Show success message
function showSuccess(message) {
    // Create toast element
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '11';
    
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    document.body.appendChild(toastContainer);
    
    // Initialize and show toast
    const toastElement = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// Show error message
function showError(message) {
    // Create toast element
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '11';
    
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    document.body.appendChild(toastContainer);
    
    // Initialize and show toast
    const toastElement = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// The showSuccess and showError functions are now defined globally in app.js
// Export expenses functions
window.expensesManager = {
    initExpenses,
    displayExpenses
};
