/**
 * Main Application Entry Point
 * This file initializes the application and handles errors
 */

// Wrap all initialization in a function
async function initialize() {
    // Add global error event listener
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showErrorModal('Application Error', `An error occurred: ${event.message}<br>Line: ${event.lineno}, Column: ${event.colno}<br>File: ${event.filename}`);
        return false;
    });

    try {
        // Check if all required managers are loaded
        if (!window.dbManager) {
            throw new Error('Database manager not loaded');
        }
        
        // Initialize database first
        await window.dbManager.initDatabase().catch(err => {
            throw new Error(`Database initialization failed: ${err.message}`);
        });
        console.log('Database initialized');
        
        try {
            // Initialize all managers in order
            if (window.partsManager && typeof window.partsManager.initParts === 'function') {
                await window.partsManager.initParts();
            }
            
            if (window.suppliersManager && typeof window.suppliersManager.initSuppliers === 'function') {
                await window.suppliersManager.initSuppliers();
            }
            
            if (window.maintenanceManager && typeof window.maintenanceManager.initMaintenanceRecords === 'function') {
                await window.maintenanceManager.initMaintenanceRecords();
            }
            
            if (window.fuelLogManager && typeof window.fuelLogManager.initFuelLog === 'function') {
                await window.fuelLogManager.initFuelLog();
            }
            
            if (window.expensesManager && typeof window.expensesManager.initExpenses === 'function') {
                await window.expensesManager.initExpenses();
            }
            
            if (window.pdfExportManager && typeof window.pdfExportManager.initPDFExport === 'function') {
                await window.pdfExportManager.initPDFExport();
            }
            
            // Initialize car savings
            if (window.carSavingsManager && typeof window.carSavingsManager.initCarSavings === 'function') {
                await window.carSavingsManager.initCarSavings();
            }
            
            // Initialize overview
            await initializeOverview();
            
            // Initialize UI components
            initializeUI();
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Error initializing managers:', error);
            showErrorModal('Initialization Error', `Failed to initialize application: ${error.message}`);
        }
    } catch (error) {
        console.error('Fatal error:', error);
        showErrorModal('Fatal Error', `Application failed to start: ${error.message}`);
    }
}

// Initialize overview
async function initializeOverview() {
    try {
        // Get all records
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        const maintenance = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        
        // Calculate totals
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
        const totalMaintenanceCost = maintenance.reduce((sum, record) => sum + record.cost, 0);
        const totalCost = totalExpenses + totalFuelCost + totalMaintenanceCost;
        
        // Get car savings
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        const carSavings = carSavingsRecords.length > 0 ? carSavingsRecords[0].amount : 0;
        
        // Update overview cards
        // Only update elements that exist
        const fuelCostElement = document.getElementById('totalFuelCost');
        if (fuelCostElement) fuelCostElement.textContent = `EGP ${totalFuelCost.toFixed(2)}`;
        
        const maintenanceCostElement = document.getElementById('totalMaintenanceCost');
        if (maintenanceCostElement) maintenanceCostElement.textContent = `EGP ${totalMaintenanceCost.toFixed(2)}`;
        
        const carSavingsElement = document.getElementById('carSavings');
        if (carSavingsElement) carSavingsElement.textContent = `EGP ${carSavings.toFixed(2)}`;
        
        const remainingBalanceElement = document.getElementById('remainingBalance');
        if (remainingBalanceElement) remainingBalanceElement.textContent = `EGP ${(carSavings - totalCost).toFixed(2)}`;
        
        // Update recent activity
        const recentActivityList = document.getElementById('recentActivityList');
        if (recentActivityList) {
            // Combine all activities
            const activities = [
                ...expenses.map(expense => ({
                    type: 'expense',
                    date: expense.date,
                    description: expense.description || 'Expense',
                    amount: expense.amount
                })),
                ...fuelLogs.map(log => ({
                    type: 'fuel',
                    date: log.date,
                    description: 'Fuel Purchase',
                    amount: log.totalCost
                })),
                ...maintenance.map(record => ({
                    type: 'maintenance',
                    date: record.date,
                    description: record.serviceType,
                    amount: record.cost
                }))
            ];
            
            // Sort by date (newest first)
            activities.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Display top 5 activities
            recentActivityList.innerHTML = activities.slice(0, 5).map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-${activity.type === 'expense' ? 'wallet' : activity.type === 'fuel' ? 'gas-pump' : 'tools'}"></i>
                    </div>
                    <div class="activity-info">
                        <h4>${activity.description}</h4>
                        <p class="activity-date">${new Date(activity.date).toLocaleDateString()}</p>
                        <p class="activity-amount">EGP ${activity.amount.toFixed(2)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error initializing overview:', error);
        showError('Failed to initialize overview');
    }
}

// Initialize UI components (navigation, sidebar, etc.)
function initializeUI() {
    // Initialize all UI components from app.js
    if (typeof initializeNavigation === 'function') initializeNavigation();
    // initializeSidebar is not defined, sidebar initialization is handled in initializeNavigation
    if (typeof initializeStats === 'function') initializeStats();
    if (typeof initializeTables === 'function') initializeTables();
    if (typeof initializeModals === 'function') initializeModals();
    
    // Update tables with current data
    if (typeof updateTables === 'function') {
        setTimeout(updateTables, 500); // Slight delay to ensure database is ready
    }
}

// Show error modal
function showErrorModal(title, message) {
    // Create modal element
    const modalHtml = `
        <div class="modal fade" id="errorModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Make sure Bootstrap is loaded before showing modal
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modal = new bootstrap.Modal(document.getElementById('errorModal'));
        modal.show();
    } else {
        // Fallback to alert if Bootstrap is not available
        alert(`${title}: ${message.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '')}`);
    }
}

// Start initialization
setTimeout(initialize, 100); // Small delay to ensure all scripts are loaded 