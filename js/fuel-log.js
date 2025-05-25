/**
 * Fuel Log Functionality
 * This file handles the fuel log entries section of the Car Maintenance Tracker.
 */

// DOM Elements
let fuelLogForm;
let fuelDate;
let fuelAmount;
let fuelCost;
let fuelMileage;
let fuelType;
let saveFuelLogBtn;
let fuelLogTableBody;
let addFuelLogModal;
let fuelStation;
let stationRating;
let stationNotes;

// Add new DOM elements
let customStationContainer;
let customStation;
let saveStationBtn;

// Module state
const fuelLogModule = {
    isSubmitting: false
};

// Initialize fuel log
async function initFuelLog() {
    try {
        // Get form elements
        const fuelForm = document.getElementById('fuelForm');
        const saveFuelBtn = document.getElementById('saveFuelBtn');
        
        if (fuelForm && saveFuelBtn) {
            // Add event listener to save button
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
        if (!fuelForm) return;
        
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
        await window.dbManager.addRecord(window.dbManager.STORES.FUEL_LOG, fuelLog);
        
        // Reset form
        fuelForm.reset();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFuelModal'));
        if (modal) {
            modal.hide();
        }
        
        // Update display
        await displayFuelLogs();
        
        // Show success message
        showToast('Fuel log added successfully', 'success');
    } catch (error) {
        console.error('Error saving fuel log:', error);
        showToast('Failed to save fuel log', 'error');
    }
}

// Display fuel logs
async function displayFuelLogs() {
    try {
        const fuelTableBody = document.getElementById('fuelTableBody');
        if (!fuelTableBody) return;
        
        // Get all fuel logs
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        
        // Sort by date (newest first)
        fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update table
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
        const fuelLog = await window.dbManager.getRecordById(window.dbManager.STORES.FUEL_LOG, id);
        if (!fuelLog) {
            showToast('Fuel log not found', 'error');
            return;
        }
        
        // Populate form
        const fuelForm = document.getElementById('fuelForm');
        if (fuelForm) {
            document.getElementById('fuelDate').value = fuelLog.date;
            document.getElementById('odometer').value = fuelLog.odometer;
            document.getElementById('liters').value = fuelLog.liters;
            document.getElementById('pricePerLiter').value = fuelLog.pricePerLiter;
            document.getElementById('totalCost').value = fuelLog.totalCost;
            document.getElementById('notes').value = fuelLog.notes || '';
        }
        
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

// Load saved stations
async function loadSavedStations() {
    try {
        const stations = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_STATIONS);
        
        if (stations.length === 0) return;
        
        // Add to select element
        if (fuelStation) {
            const otherOption = fuelStation.querySelector('option[value="Other"]');
            
            stations.forEach(station => {
                if (!fuelStation.querySelector(`option[value="${station.name}"]`)) {
                    const option = document.createElement('option');
                    option.value = station.name;
                    option.textContent = station.name;
                    fuelStation.insertBefore(option, otherOption);
                }
            });
        }
    } catch (error) {
        console.error('Error loading saved stations:', error);
    }
}

// Handle save station
async function handleSaveStation() {
    try {
        const stationName = customStation.value.trim();
        
        if (!stationName) {
            showError('Please enter a station name');
            return;
        }
        
        // Save station
        await window.dbManager.addRecord(window.dbManager.STORES.FUEL_STATIONS, {
            name: stationName
        });
        
        // Add to select element
        const option = document.createElement('option');
        option.value = stationName;
        option.textContent = stationName;
        const otherOption = fuelStation.querySelector('option[value="Other"]');
        fuelStation.insertBefore(option, otherOption);
        
        // Select the new option
        fuelStation.value = stationName;
        
        // Hide custom station input
        customStationContainer.classList.add('d-none');
        customStation.removeAttribute('required');
        customStation.value = '';
        
        showSuccess('Station added successfully');
    } catch (error) {
        console.error('Error saving station:', error);
        showError('Failed to save station');
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
    
    return results;
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

// Export fuel log functions
window.fuelLogManager = {
    initFuelLog,
    displayFuelLogs
};
