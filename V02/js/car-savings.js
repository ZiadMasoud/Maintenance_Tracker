/**
 * Enhanced Car Savings Manager
 */

let isSubmitting = false;

// Initialize car savings
async function initCarSavings() {
    // Initialize event listeners
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) {
        savingsForm.addEventListener('submit', handleSaveSavings);
    }

    // Initialize modal
    const modal = document.getElementById('addSavingsModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', () => {
            resetSavingsForm();
        });
    }

    // Display current savings
    await updateCarSavings();
}

// Update car savings display
async function updateCarSavings() {
    try {
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        const carSavings = carSavingsRecords.length > 0 ? carSavingsRecords[0].amount : 0;

        // Update savings display
        const savingsDisplay = document.getElementById('carSavings');
        if (savingsDisplay) {
            savingsDisplay.textContent = `EGP ${carSavings.toFixed(2)}`;
        }

        // Update remaining balance
        await updateRemainingBalance(carSavings);

    } catch (error) {
        console.error('Error updating car savings:', error);
        showToast('Failed to update car savings display', 'error');
    }
}

// Update remaining balance
async function updateRemainingBalance(carSavings) {
    try {
        // Get all costs
        const [expenses, fuelLogs, maintenance] = await Promise.all([
            window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES),
            window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG),
            window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE)
        ]);

        // Calculate totals
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
        const totalMaintenanceCost = maintenance.reduce((sum, record) => sum + record.cost, 0);
        
        const totalCost = totalExpenses + totalFuelCost + totalMaintenanceCost;
        const remainingBalance = carSavings - totalCost;

        // Update display
        const remainingBalanceDisplay = document.getElementById('remainingBalance');
        if (remainingBalanceDisplay) {
            remainingBalanceDisplay.textContent = `EGP ${remainingBalance.toFixed(2)}`;
            
            // Add color coding based on remaining balance
            remainingBalanceDisplay.className = 'balance-amount ' + 
                (remainingBalance < 0 ? 'text-danger' : 
                 remainingBalance < 1000 ? 'text-warning' : 'text-success');
        }

        // Update progress bar if it exists
        const progressBar = document.getElementById('savingsProgressBar');
        if (progressBar && carSavings > 0) {
            const percentage = Math.max(0, Math.min(100, (remainingBalance / carSavings) * 100));
            progressBar.style.width = `${percentage}%`;
            progressBar.className = `progress-bar ${
                remainingBalance < 0 ? 'bg-danger' : 
                remainingBalance < 1000 ? 'bg-warning' : 'bg-success'
            }`;
        }

    } catch (error) {
        console.error('Error updating remaining balance:', error);
        showToast('Failed to update remaining balance', 'error');
    }
}

// Handle save savings
async function handleSaveSavings(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const savingsForm = document.getElementById('savingsForm');
        if (!savingsForm) return;

        // Get form data
        const formData = new FormData(savingsForm);
        const amount = parseFloat(formData.get('amount'));
        const operation = formData.get('operation');

        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        // Get current savings
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        const currentSavings = carSavingsRecords.length > 0 ? carSavingsRecords[0] : { id: 1, amount: 0 };

        // Calculate new amount
        const newAmount = operation === 'add' ? 
            currentSavings.amount + amount : 
            Math.max(0, currentSavings.amount - amount);

        // Update savings
        await window.dbManager.updateRecord(window.dbManager.STORES.CAR_SAVINGS, {
            id: currentSavings.id,
            amount: newAmount
        });

        // Update displays
        await updateCarSavings();
        await updateStats(); // Update dashboard stats

        // Reset form and close modal
        resetSavingsForm();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addSavingsModal'));
        if (modal) {
            modal.hide();
        }

        showToast('Car savings updated successfully', 'success');

    } catch (error) {
        console.error('Error saving car savings:', error);
        showToast('Failed to update car savings', 'error');
    } finally {
        isSubmitting = false;
    }
}

// Reset savings form
function resetSavingsForm() {
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) {
        savingsForm.reset();
    }
}

// Export functionality
window.carSavingsManager = {
    initCarSavings,
    updateCarSavings,
    updateRemainingBalance
};
