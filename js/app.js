/**
 * Main Application Script
 * This file provides UI functions for the Car Maintenance Tracker.
 * Initialization is handled by index.js
 */

// Initialize navigation
function initializeNavigation() {
    // Get all navigation items
    const navItems = document.querySelectorAll('.nav-item');
    
    // Add click event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the section to show
            const sectionId = this.getAttribute('data-section');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show the selected section
            const selectedSection = document.getElementById(sectionId);
            if (selectedSection) {
                selectedSection.classList.add('active');
            }
        });
    });
    
    // Initialize sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.app-sidebar').classList.toggle('collapsed');
            document.querySelector('.app-main').classList.toggle('expanded');
        });
    }
}

// Initialize UI components
function initializeUI() {
    // Initialize navigation
    initializeNavigation();
    
    // Set default active section
    const defaultSection = document.querySelector('.nav-item.active');
    if (defaultSection) {
        const sectionId = defaultSection.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
        }
    }
}

// Initialize stats
function initializeStats() {
    // Update stats periodically
    setInterval(updateStats, 5000);
    updateStats();
}

// Update stats
async function updateStats() {
    try {
        // Get all expenses
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Get all fuel logs
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
        
        // Get all maintenance records
        const maintenance = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        const totalMaintenanceCost = maintenance.reduce((sum, record) => sum + record.cost, 0);
        
        // Get car savings
        const carSavingsRecords = await window.dbManager.getAllRecords(window.dbManager.STORES.CAR_SAVINGS);
        const carSavings = carSavingsRecords.length > 0 ? carSavingsRecords[0].amount : 0;
        
        // Calculate total cost
        const totalCost = totalExpenses + totalFuelCost + totalMaintenanceCost;
        
        // Update DOM - only update elements that exist
        const fuelCostElement = document.getElementById('totalFuelCost');
        if (fuelCostElement) fuelCostElement.textContent = `EGP ${totalFuelCost.toFixed(2)}`;
        
        const maintenanceCostElement = document.getElementById('totalMaintenanceCost');
        if (maintenanceCostElement) maintenanceCostElement.textContent = `EGP ${totalMaintenanceCost.toFixed(2)}`;
        
        const carSavingsElement = document.getElementById('carSavings');
        if (carSavingsElement) carSavingsElement.textContent = `EGP ${carSavings.toFixed(2)}`;
        
        const remainingBalanceElement = document.getElementById('remainingBalance');
        if (remainingBalanceElement) remainingBalanceElement.textContent = `EGP ${(carSavings - totalCost).toFixed(2)}`;
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Initialize tables
function initializeTables() {
    const tables = document.querySelectorAll('.table');
    
    tables.forEach(table => {
        // Add hover effects
        table.addEventListener('mouseover', (e) => {
            const row = e.target.closest('tr');
            if (row && !row.classList.contains('empty-state')) {
                row.style.backgroundColor = 'var(--background-color)';
            }
        });
        
        table.addEventListener('mouseout', (e) => {
            const row = e.target.closest('tr');
            if (row && !row.classList.contains('empty-state')) {
                row.style.backgroundColor = '';
            }
        });
        
        // Add responsive behavior
        const container = table.closest('.table-responsive');
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollLeft = container.scrollLeft;
                const maxScroll = container.scrollWidth - container.clientWidth;
                
                if (scrollLeft > 0) {
                    container.classList.add('scrolled-left');
                } else {
                    container.classList.remove('scrolled-left');
                }
                
                if (scrollLeft < maxScroll) {
                    container.classList.add('scrolled-right');
                } else {
                    container.classList.remove('scrolled-right');
                }
            });
        }
    });
}

// Initialize modals
function initializeModals() {
    // Add event listener for "Add New" button
    const addNewBtn = document.getElementById('addNewBtn');
    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => {
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const sectionId = activeSection.id;
                switch (sectionId) {
                    case 'expenses':
                        const expenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
                        expenseModal.show();
                        break;
                    case 'fuel':
                        const fuelModal = new bootstrap.Modal(document.getElementById('addFuelModal'));
                        fuelModal.show();
                        break;
                    case 'maintenance':
                        const maintenanceModal = new bootstrap.Modal(document.getElementById('addMaintenanceModal'));
                        maintenanceModal.show();
                        break;
                    case 'suppliers':
                        const supplierModal = new bootstrap.Modal(document.getElementById('addSupplierModal'));
                        supplierModal.show();
                        break;
                    default:
                        showToast('Please select a section to add new items', 'warning');
                }
            }
        });
    }
}

// Update tables
async function updateTables() {
    try {
        // Update expenses table
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const expensesTableBody = document.getElementById('expensesTableBody');
        if (expensesTableBody) {
            expensesTableBody.innerHTML = expenses.length > 0 ? 
                expenses.map(expense => `
                    <tr>
                        <td>${new Date(expense.date).toLocaleDateString()}</td>
                        <td>${expense.description}</td>
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
                    <td colspan="4">
                        <div>
                            <i class="fas fa-receipt"></i>
                            <p>No expenses recorded yet</p>
                        </div>
                    </td>
                </tr>`;
        }
        
        // Update fuel log table
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        const fuelLogTableBody = document.getElementById('fuelLogTableBody');
        if (fuelLogTableBody) {
            fuelLogTableBody.innerHTML = fuelLogs.length > 0 ?
                fuelLogs.map(log => `
                    <tr>
                        <td>${new Date(log.date).toLocaleDateString()}</td>
                        <td>${log.amount}</td>
                        <td>EGP ${log.cost.toFixed(2)}</td>
                        <td>${log.mileage}</td>
                        <td>${log.type}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="editFuelLog('${log.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteFuelLog('${log.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('') : `
                <tr class="empty-state">
                    <td colspan="6">
                        <div>
                            <i class="fas fa-gas-pump"></i>
                            <p>No fuel log entries yet</p>
                        </div>
                    </td>
                </tr>`;
        }
        
        // Update maintenance table
        const maintenance = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        const maintenanceTableBody = document.getElementById('maintenanceTableBody');
        if (maintenanceTableBody) {
            maintenanceTableBody.innerHTML = maintenance.length > 0 ?
                maintenance.map(record => `
                    <tr>
                        <td>${new Date(record.date).toLocaleDateString()}</td>
                        <td>${record.service}</td>
                        <td>${record.description}</td>
                        <td>${record.mileage}</td>
                        <td>EGP ${record.cost.toFixed(2)}</td>
                        <td>${record.parts?.length || 0} parts</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewMaintenance('${record.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMaintenance('${record.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('') : `
                <tr class="empty-state">
                    <td colspan="7">
                        <div>
                            <i class="fas fa-tools"></i>
                            <p>No maintenance records yet</p>
                        </div>
                    </td>
                </tr>`;
        }
        
        // Update suppliers table
        const suppliers = await window.dbManager.getAllRecords(window.dbManager.STORES.SUPPLIERS);
        const suppliersTableBody = document.getElementById('suppliersTableBody');
        if (suppliersTableBody) {
            suppliersTableBody.innerHTML = suppliers.length > 0 ?
                suppliers.map(supplier => `
                    <tr>
                        <td>${supplier.name}</td>
                        <td>${supplier.address || '-'}</td>
                        <td>${'★'.repeat(supplier.rating)}${'☆'.repeat(5 - supplier.rating)}</td>
                        <td>${supplier.description || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="editSupplier('${supplier.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier('${supplier.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('') : `
                <tr class="empty-state">
                    <td colspan="5">
                        <div>
                            <i class="fas fa-store"></i>
                            <p>No suppliers added yet</p>
                        </div>
                    </td>
                </tr>`;
        }
        
    } catch (error) {
        console.error('Error updating tables:', error);
        showToast('Failed to update tables', 'error');
    }
}

// Show toast message
function showToast(message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove toast after animation
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.remove();
        }, 300);
    }, 3000);
}

// Initialize a single component with error handling
async function initializeComponent(name, initFn) {
    try {
        if (typeof initFn === 'function') {
            await initFn();
            console.log(`${name} initialized successfully`);
        } else {
            console.warn(`${name} initialization function not found`);
        }
    } catch (error) {
        console.error(`Error initializing ${name}:`, error);
        throw error;
    }
}

// Add the missing deleteMaintenance function to app.js
function deleteMaintenance(id) {
    // Convert id to integer if it's a string
    id = parseInt(id);
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
        return;
    }
    
    try {
        // Delete maintenance record
        window.dbManager.deleteRecord(window.dbManager.STORES.MAINTENANCE, id)
            .then(() => {
                // Delete linked expense if it exists
                return window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
            })
            .then(expenses => {
                const linkedExpense = expenses.find(expense => expense.linkedMaintenanceId === id);
                if (linkedExpense) {
                    return window.dbManager.deleteRecord(window.dbManager.STORES.EXPENSES, linkedExpense.id);
                }
                return Promise.resolve();
            })
            .then(() => {
                // Refresh display
                if (typeof updateTables === 'function') {
                    updateTables();
                }
                
                // Show success notification
                if (typeof showToast === 'function') {
                    showToast('Maintenance record deleted successfully', 'success');
                } else {
                    alert('Maintenance record deleted successfully');
                }
            })
            .catch(error => {
                console.error('Error deleting maintenance record:', error);
                alert('Failed to delete maintenance record: ' + error.message);
            });
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        alert('Failed to delete maintenance record: ' + error.message);
    }
}

// Export functions
window.appManager = {
    initializeUI
};
