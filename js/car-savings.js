/**
 * Car Savings Manager
 * This file handles the car savings functionality for the Car Maintenance Tracker.
 */

// Initialize the car savings functionality
async function initCarSavings() {
    try {
        // Get the current car savings
        await updateCarSavings();
        
        // Set up event listener for the savings button
        const saveSavingsBtn = document.getElementById('saveSavingsBtn');
        if (saveSavingsBtn) {
            saveSavingsBtn.addEventListener('click', handleSaveSavings);
        }
        
        // Initialize the modal properly using Bootstrap
        const updateSavingsModal = document.getElementById('updateSavingsModal');
        if (updateSavingsModal) {
            // Make sure we create a proper Bootstrap modal instance
            new bootstrap.Modal(updateSavingsModal);
        }
    } catch (error) {
        console.error('Error initializing car savings:', error);
        showErrorModal('Car Savings Error', 'Failed to initialize car savings functionality.');
    }
}

// Update car savings display
async function updateCarSavings() {
    try {
        // Get car savings from database
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        const carSavings = carSavingsRecords.length > 0 ? carSavingsRecords[0].amount : 0;
        
        // Update the display
        const carSavingsElement = document.getElementById('carSavings');
        if (carSavingsElement) {
            carSavingsElement.textContent = `EGP ${carSavings.toFixed(2)}`;
        }
        
        // Update remaining balance if possible
        await updateRemainingBalance(carSavings);
    } catch (error) {
        console.error('Error updating car savings:', error);
    }
}

// Update remaining balance
async function updateRemainingBalance(carSavings) {
    try {
        // Get all expenses, fuel logs, and maintenance records
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        const maintenance = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        
        // Calculate total costs
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
        const totalMaintenanceCost = maintenance.reduce((sum, record) => sum + record.cost, 0);
        
        // Calculate total cost
        const totalCost = totalExpenses + totalFuelCost + totalMaintenanceCost;
        
        // Calculate remaining balance
        const remainingBalance = carSavings - totalCost;
        
        // Update the remaining balance display
        const remainingBalanceElement = document.getElementById('remainingBalance');
        if (remainingBalanceElement) {
            remainingBalanceElement.textContent = `EGP ${remainingBalance.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error updating remaining balance:', error);
    }
}

// Handle save savings button click
async function handleSaveSavings() {
    try {
        const savingsAmount = document.getElementById('savingsAmount');
        if (!savingsAmount) return;
        
        const amount = parseFloat(savingsAmount.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
        }
        
        // Get current savings
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        
        if (carSavingsRecords.length > 0) {
            // Update existing record
            const record = carSavingsRecords[0];
            record.amount += amount;
            await window.dbManager.updateRecord(window.dbManager.STORES.CAR_SAVINGS, record);
        } else {
            // Create new record
            await window.dbManager.addRecord(window.dbManager.STORES.CAR_SAVINGS, { amount });
        }
        
        // Update display
        await updateCarSavings();
        
        // Reset form and close modal
        const savingsForm = document.getElementById('savingsForm');
        if (savingsForm) savingsForm.reset();
        
        // Close the Bootstrap modal properly
        const modal = bootstrap.Modal.getInstance(document.getElementById('updateSavingsModal'));
        if (modal) modal.hide();
        
        // Show success message
        alert('Car savings updated successfully!');
    } catch (error) {
        console.error('Error saving car savings:', error);
        alert('Failed to update car savings. Please try again.');
    }
}

// Export functionality
window.carSavingsManager = {
    initCarSavings
};
