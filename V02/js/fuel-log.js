/**
 * Enhanced Fuel Log Functionality
 */

let currentEditId = null;
let isSubmitting = false;

// Initialize fuel log
async function initFuelLog() {
    const fuelForm = document.getElementById('fuelForm');
    if (!fuelForm) return;

    // Load saved stations
    await loadSavedStations();

    // Event listeners
    fuelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveFuel();
    });

    // Auto-calculate total cost
    const litersInput = document.getElementById('liters');
    const priceInput = document.getElementById('pricePerLiter');
    const totalCostInput = document.getElementById('totalCost');

    if (litersInput && priceInput && totalCostInput) {
        const calculateTotal = () => {
            const liters = parseFloat(litersInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            totalCostInput.value = (liters * price).toFixed(2);
        };

        litersInput.addEventListener('input', calculateTotal);
        priceInput.addEventListener('input', calculateTotal);
    }

    // Initialize modal
    const modal = document.getElementById('addFuelModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', () => {
            resetFuelForm();
        });
    }

    // Display existing logs
    await displayFuelLogs();
}

// Handle save fuel log
async function handleSaveFuel() {
    try {
        if (isSubmitting) return;
        isSubmitting = true;

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
            station: formData.get('station'),
            notes: formData.get('notes') || ''
        };

        // Validate data
        if (!fuelLog.date || isNaN(fuelLog.odometer) || isNaN(fuelLog.liters) || 
            isNaN(fuelLog.pricePerLiter) || isNaN(fuelLog.totalCost)) {
            showToast('Please fill in all required fields with valid values', 'error');
            return;
        }

        // If editing, update existing record
        if (currentEditId) {
            fuelLog.id = currentEditId;
            await window.dbManager.updateRecord(window.dbManager.STORES.FUEL_LOG, fuelLog);
            showToast('Fuel log updated successfully', 'success');
        } else {
            // Save new record
            await window.dbManager.addRecord(window.dbManager.STORES.FUEL_LOG, fuelLog);
            showToast('Fuel log added successfully', 'success');
        }

        // Reset form and close modal
        resetFuelForm();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFuelModal'));
        if (modal) {
            modal.hide();
        }

        // Update display
        await displayFuelLogs();
        await updateStats(); // Update dashboard stats

    } catch (error) {
        console.error('Error saving fuel log:', error);
        showToast('Failed to save fuel log', 'error');
    } finally {
        isSubmitting = false;
    }
}

// Display fuel logs
async function displayFuelLogs() {
    try {
        const fuelLogs = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        const tableBody = document.getElementById('fuelLogTableBody');
        if (!tableBody) return;

        if (fuelLogs.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
                        <div>
                            <i class="fas fa-gas-pump"></i>
                            <p>No fuel log entries yet</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        // Sort by date (newest first)
        fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        tableBody.innerHTML = fuelLogs.map(log => `
            <tr>
                <td>${new Date(log.date).toLocaleDateString()}</td>
                <td>${log.odometer}</td>
                <td>${log.liters.toFixed(2)}</td>
                <td>EGP ${log.pricePerLiter.toFixed(2)}</td>
                <td>EGP ${log.totalCost.toFixed(2)}</td>
                <td>${log.station || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editFuelLog(${log.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFuelLog(${log.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Calculate and display fuel efficiency
        const efficiencyResults = calculateFuelEfficiency(fuelLogs);
        if (efficiencyResults && efficiencyResults.length > 0) {
            const latestEfficiency = efficiencyResults[efficiencyResults.length - 1];
            const efficiencyDisplay = document.getElementById('fuelEfficiencyDisplay');
            if (efficiencyDisplay) {
                efficiencyDisplay.innerHTML = `
                    <p>Latest Fuel Efficiency:</p>
                    <p>${latestEfficiency.l100km} L/100km (${latestEfficiency.mpg} MPG)</p>
                `;
            }
        }
    } catch (error) {
        console.error('Error displaying fuel logs:', error);
        showToast('Failed to load fuel logs', 'error');
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

        // Set current edit ID
        currentEditId = id;

        // Populate form
        const fuelForm = document.getElementById('fuelForm');
        if (fuelForm) {
            document.getElementById('fuelDate').value = fuelLog.date;
            document.getElementById('odometer').value = fuelLog.odometer;
            document.getElementById('liters').value = fuelLog.liters;
            document.getElementById('pricePerLiter').value = fuelLog.pricePerLiter;
            document.getElementById('totalCost').value = fuelLog.totalCost;
            
            const stationSelect = document.getElementById('fuelStation');
            if (stationSelect) {
                if (fuelLog.station && !stationSelect.querySelector(`option[value="${fuelLog.station}"]`)) {
                    // Add station if it doesn't exist in options
                    const option = document.createElement('option');
                    option.value = fuelLog.station;
                    option.textContent = fuelLog.station;
                    const otherOption = stationSelect.querySelector('option[value="Other"]');
                    stationSelect.insertBefore(option, otherOption);
                }
                stationSelect.value = fuelLog.station || '';
            }
            
            const notesInput = document.getElementById('notes');
            if (notesInput) notesInput.value = fuelLog.notes || '';

            // Update modal title and button text
            const modalTitle = document.querySelector('#addFuelModal .modal-title');
            if (modalTitle) modalTitle.textContent = 'Edit Fuel Log';
            
            const submitButton = document.querySelector('#addFuelModal .btn-primary');
            if (submitButton) submitButton.textContent = 'Update';
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
    if (!confirm('Are you sure you want to delete this fuel log?')) {
        return;
    }

    try {
        await window.dbManager.deleteRecord(window.dbManager.STORES.FUEL_LOG, id);
        await displayFuelLogs();
        await updateStats(); // Update dashboard stats
        showToast('Fuel log deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting fuel log:', error);
        showToast('Failed to delete fuel log', 'error');
    }
}

// Reset fuel form
function resetFuelForm() {
    const fuelForm = document.getElementById('fuelForm');
    if (fuelForm) {
        fuelForm.reset();
        currentEditId = null;

        // Reset modal title and button text
        const modalTitle = document.querySelector('#addFuelModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Add Fuel Log';
        
        const submitButton = document.querySelector('#addFuelModal .btn-primary');
        if (submitButton) submitButton.textContent = 'Save';
    }
}

// Export functionality
window.fuelLogManager = {
    initFuelLog,
    editFuelLog,
    deleteFuelLog,
    displayFuelLogs
};
