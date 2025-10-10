/**
 * Fuel Log Functionality
 * This file handles the fuel log entries section of the Car Maintenance Tracker.
 */

// DOM Elements
let fuelLogTableBody;
let fuelForm;
let saveFuelBtn;
let fuelDateInput; // Renamed for clarity

// State to track current fuel log being edited
let currentFuelLogId = null;

// Module state
const fuelLogModule = {
    isSubmitting: false
};

// Initialize fuel log
async function initFuelLog() {
    try {
        // Get form elements
        fuelForm = document.getElementById('fuelForm');
        saveFuelBtn = document.getElementById('saveFuelBtn');
        if (fuelForm && saveFuelBtn) {
            saveFuelBtn.addEventListener('click', handleSaveFuel);
            
            // Set default date to today
            const fuelDate = document.getElementById('fuelDate');
            if (fuelDate) {
                fuelDate.valueAsDate = new Date();
            }
        }
        
        // Display existing fuel logs
        await displayFuelLogs();
    } catch (error) {
        console.error('Error initializing fuel log:', error);
        showToast('Failed to initialize fuel log', 'error');
    }
}

// Handle save fuel log
async function handleSaveFuel() {
    try {
        const fuelForm = document.getElementById('fuelForm');
        
        // Get form data
        const formData = new FormData(fuelForm);
        const fuelLog = {
            date: formData.get('fuelDate'),
            odometer: parseFloat(formData.get('odometer')),
            liters: parseFloat(formData.get('liters')),
            pricePerLiter: parseFloat(formData.get('pricePerLiter')),
            totalCost: parseFloat(formData.get('totalCost')),
            notes: formData.get('notes') || ''
        };
        
        // Validate data
        if (!fuelLog.date || isNaN(fuelLog.odometer) || isNaN(fuelLog.liters) || 
            isNaN(fuelLog.pricePerLiter) || isNaN(fuelLog.totalCost)) {
            showToast('Please fill in all required fields with valid values', 'error');
            return;
        }
        
        // Save to database
        let message;
        if (currentFuelLogId !== null) {
 fuelLog.id = currentFuelLogId; // Include the ID for update operation
            await window.dbManager.updateRecord(window.dbManager.STORES.FUEL_LOG, fuelLog);
            message = 'Fuel log updated successfully';
        } else {
            await window.dbManager.addRecord(window.dbManager.STORES.FUEL_LOG, fuelLog);
            message = 'Fuel log added successfully';
        }
        
        // Reset form
        fuelForm.reset();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFuelModal'));
        if (modal) {
            modal.hide();
        }
        
        // Update display
        await displayFuelLogs();
        
        // Reset state
        currentFuelLogId = null;
        
        // Show success message
        showToast(message, 'success');
    } catch (error) {
        console.error('Error saving fuel log:', error);
        showToast('Failed to save fuel log', 'error');
    }
}

// Display fuel logs
async function displayFuelLogs() {
    try {
 fuelLogTableBody = document.getElementById('fuelTableBody');
        if (!fuelTableBody) return;
        
        // Get all fuel logs
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        
        // Sort by date (newest first)
        fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
 // Build and update the table HTML
        fuelTableBody.innerHTML = fuelLogs.length > 0 ? 
            fuelLogs.map(log => `
                <tr>
                    <td>${new Date(log.date).toLocaleDateString()}</td>
                    <td>${log.odometer.toFixed(1)} km</td>
                    <td>${log.liters.toFixed(2)} L</td>
                    <td>EGP ${log.pricePerLiter.toFixed(2)}</td>
                    <td>EGP ${log.totalCost.toFixed(2)}</td>
                    <td>${log.notes || '-'}</td>
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
                <td colspan="7">
                    <div>
                        <i class="fas fa-gas-pump"></i>
                        <p>No fuel logs recorded yet</p>
                    </div>
                </td>
            </tr>`;
    } catch (error) {
        console.error('Error displaying fuel logs:', error);
        showToast('Failed to display fuel logs', 'error');
    }
}

// Edit fuel log
async function editFuelLog(id) {
    try {
        // Retrieve the fuel log record by ID
 id = parseInt(id); // Ensure ID is an integer
        const fuelLog = await window.dbManager.getRecordById(window.dbManager.STORES.FUEL_LOG, id);
        if (!fuelLog) {
            showToast('Fuel log not found', 'error');
            return;
        }
        
        // Populate form
 fuelForm = document.getElementById('fuelForm');
        if (fuelForm) {
 // Use specific element IDs for clarity
 document.getElementById('fuelDate').value = fuelLog.date;
 document.getElementById('odometer').value = fuelLog.odometer;
 document.getElementById('liters').value = fuelLog.liters;
 document.getElementById('pricePerLiter').value = fuelLog.pricePerLiter;
 document.getElementById('totalCost').value = fuelLog.totalCost;
 document.getElementById('notes').value = fuelLog.notes || '';
        }

        // Set the current ID to indicate editing mode
        currentFuelLogId = id;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addFuelModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing fuel log:', error);
        showToast('Failed to edit fuel log', 'error');
    }
}

// Delete fuel log
async function deleteFuelLog(id) {
    try {
 id = parseInt(id); // Ensure ID is an integer
        if (!confirm('Are you sure you want to delete this fuel log?')) {
            return;
        }
        
        await window.dbManager.deleteRecord(window.dbManager.STORES.FUEL_LOG, id);
        await displayFuelLogs();
        showToast('Fuel log deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting fuel log:', error);
        showToast('Failed to delete fuel log', 'error');
    }
}

// Calculate fuel efficiency (MPG or L/100km)
function calculateFuelEfficiency(entries) {
    if (entries.length < 2) {
        return null; // Need at least 2 entries to calculate
    }
    
    // Sort by mileage (ascending)
    const sortedEntries = [...entries].sort((a, b) => a.mileage - b.mileage);
    
    const results = [];
    
    for (let i = 1; i < sortedEntries.length; i++) {
        const current = sortedEntries[i];
        const previous = sortedEntries[i-1];
        
        const distanceTraveled = current.mileage - previous.mileage;
        const fuelUsed = current.amount;
        
        if (distanceTraveled <= 0 || fuelUsed <= 0) {
            continue; // Skip invalid data
 }
        
        // Calculate MPG (miles per gallon)
        const mpg = distanceTraveled / (fuelUsed * 0.264172); // Convert liters to gallons
        
        // Calculate L/100km
        const l100km = (fuelUsed * 100) / distanceTraveled;
        
        results.push({
            date: current.date,
            mpg: mpg.toFixed(2),
            l100km: l100km.toFixed(2)
        });
    }
    
 // Returns an array of efficiency results
    return results;
}

// Export fuel log functions
window.fuelLogManager = {
    initFuelLog,
    displayFuelLogs
};
