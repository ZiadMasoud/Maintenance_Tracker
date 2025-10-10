// Update overview section with current data
async function updateOverview() {
    try {
        // Initialize database if not already initialized
        if (!window.dbManager.db) {
            await window.dbManager.initDatabase();
        }
        
        // Get total fuel cost
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOGS);
        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.pricePerLiter * log.liters), 0);
        
        // Get total maintenance cost
        const maintenanceRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
        
        // Get car savings
        const savingsStore = window.dbManager.db.transaction(window.dbManager.STORES.CAR_SAVINGS, 'readonly').objectStore(window.dbManager.STORES.CAR_SAVINGS);
        const savings = await new Promise((resolve, reject) => {
            const request = savingsStore.get(1);
            request.onsuccess = () => resolve(request.result?.amount || 0);
            request.onerror = () => reject(request.error);
        });
        
        // Update overview section
        document.getElementById('total-fuel-cost').textContent = `$${totalFuelCost.toFixed(2)}`;
        document.getElementById('total-maintenance-cost').textContent = `$${totalMaintenanceCost.toFixed(2)}`;
        document.getElementById('car-savings').textContent = `$${savings.toFixed(2)}`;
        document.getElementById('remaining-balance').textContent = `$${(savings - totalFuelCost - totalMaintenanceCost).toFixed(2)}`;
        
    } catch (error) {
        console.error('Error updating overview:', error);
        alert('Failed to update overview. Please try refreshing the page.');
    }
}

// Handle update savings
async function updateSavings(amount) {
    try {
        // Initialize database if not already initialized
        if (!window.dbManager.db) {
            await window.dbManager.initDatabase();
        }
        
        const savingsStore = window.dbManager.db.transaction(window.dbManager.STORES.CAR_SAVINGS, 'readwrite').objectStore(window.dbManager.STORES.CAR_SAVINGS);
        
        // Get current savings
        const currentSavings = await new Promise((resolve, reject) => {
            const request = savingsStore.get(1);
            request.onsuccess = () => resolve(request.result?.amount || 0);
            request.onerror = () => reject(request.error);
        });
        
        // Update savings
        await new Promise((resolve, reject) => {
            const request = savingsStore.put({ id: 1, amount: currentSavings + amount });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        // Update overview
        await updateOverview();
        
        // Close modal
        document.getElementById('update-savings-modal').style.display = 'none';
        
    } catch (error) {
        console.error('Error updating savings:', error);
        alert('Failed to update savings. Please try again.');
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize database
        await window.dbManager.initDatabase();
        
        // Update overview on page load
        await updateOverview();
        
        // Handle update savings form submission
        document.getElementById('update-savings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('savings-amount').value);
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            await updateSavings(amount);
        });
        
        // Handle modal close button
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('update-savings-modal').style.display = 'none';
        });
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Failed to initialize dashboard. Please try refreshing the page.');
    }
});

// Car Savings Modal
const savingsModal = document.getElementById('savingsModal');
const updateSavingsBtn = document.getElementById('updateSavingsBtn');
const closeSavingsModal = document.getElementById('closeSavingsModal');
const savingsForm = document.getElementById('savingsForm');

// Open modal when update button is clicked
updateSavingsBtn.addEventListener('click', () => {
    savingsModal.style.display = 'block';
});

// Close modal when close button is clicked
closeSavingsModal.addEventListener('click', () => {
    savingsModal.style.display = 'none';
});

// Close modal when clicking outside the modal
window.addEventListener('click', (event) => {
    if (event.target === savingsModal) {
        savingsModal.style.display = 'none';
    }
});

// Handle form submission
savingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('savingsAmount').value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    try {
        const response = await fetch('/api/savings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
        });

        if (response.ok) {
            const data = await response.json();
            // Update the savings amount display
            document.getElementById('currentSavings').textContent = `$${data.totalSavings.toFixed(2)}`;
            // Close the modal
            savingsModal.style.display = 'none';
            // Reset the form
            savingsForm.reset();
        } else {
            throw new Error('Failed to update savings');
        }
    } catch (error) {
        console.error('Error updating savings:', error);
        alert('Failed to update savings. Please try again.');
    }
}); 