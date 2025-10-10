/**
 * Enhanced Maintenance Records Functionality
 */

let currentMaintenanceId = null;
let isSubmitting = false;

// Initialize maintenance records
async function initMaintenanceRecords() {
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (!maintenanceForm) return;

    // Load saved service types and suppliers
    await Promise.all([
        loadServiceTypes(),
        loadSuppliers()
    ]);

    // Add form submit handler
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveMaintenance();
    });

    // Add part button handler
    const addPartBtn = document.getElementById('addPartBtn');
    if (addPartBtn) {
        addPartBtn.addEventListener('click', addPartToForm);
    }

    // Initialize modal
    const modal = document.getElementById('addMaintenanceModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', () => {
            resetMaintenanceForm();
        });
    }

    // Display existing records
    await displayMaintenanceRecords();
}

// Load saved service types
async function loadServiceTypes() {
    try {
        const serviceTypeSelect = document.getElementById('serviceType');
        if (!serviceTypeSelect) return;

        const types = await window.dbManager.getAllRecords(window.dbManager.STORES.SERVICE_TYPES);
        
        if (types.length === 0) return;

        const otherOption = serviceTypeSelect.querySelector('option[value="Other"]');
        
        types.forEach(type => {
            if (!serviceTypeSelect.querySelector(`option[value="${type.name}"]`)) {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name;
                serviceTypeSelect.insertBefore(option, otherOption);
            }
        });
    } catch (error) {
        console.error('Error loading service types:', error);
        showToast('Failed to load service types', 'error');
    }
}

// Handle save maintenance
async function handleSaveMaintenance() {
    try {
        if (isSubmitting) return;
        isSubmitting = true;

        const maintenanceForm = document.getElementById('maintenanceForm');
        if (!maintenanceForm.checkValidity()) {
            maintenanceForm.reportValidity();
            return;
        }

        // Get service type
        const serviceTypeSelect = document.getElementById('serviceType');
        const customServiceType = document.getElementById('customServiceType');
        let finalServiceType = serviceTypeSelect.value;
        
        if (finalServiceType === 'Other' && customServiceType.value.trim()) {
            finalServiceType = customServiceType.value.trim();
            
            // Save custom service type
            try {
                await window.dbManager.addRecord(window.dbManager.STORES.SERVICE_TYPES, {
                    name: finalServiceType
                });
                
                // Add to select element
                const option = document.createElement('option');
                option.value = finalServiceType;
                option.textContent = finalServiceType;
                const otherOption = serviceTypeSelect.querySelector('option[value="Other"]');
                serviceTypeSelect.insertBefore(option, otherOption);
            } catch (error) {
                console.error('Error saving custom service type:', error);
            }
        }

        // Get parts
        const parts = [];
        const partElements = document.querySelectorAll('.part-item');
        partElements.forEach(partElement => {
            const partName = partElement.querySelector('.part-name');
            const partNumber = partElement.querySelector('.part-number');
            const partCost = partElement.querySelector('.part-cost');
            const partSupplier = partElement.querySelector('.part-supplier');
            
            if (partName && partName.value.trim() && partCost && !isNaN(parseFloat(partCost.value))) {
                parts.push({
                    name: partName.value.trim(),
                    number: partNumber ? partNumber.value.trim() : '',
                    cost: parseFloat(partCost.value),
                    supplierId: partSupplier && partSupplier.value ? parseInt(partSupplier.value) : null
                });
            }
        });

        // Prepare maintenance record
        const maintenanceRecord = {
            date: document.getElementById('maintenanceDate').value,
            serviceType: finalServiceType,
            description: document.getElementById('maintenanceDescription').value,
            mileage: parseInt(document.getElementById('maintenanceMileage').value),
            cost: parseFloat(document.getElementById('maintenanceCost').value),
            parts: parts
        };

        // If editing, update existing record
        if (currentMaintenanceId) {
            maintenanceRecord.id = currentMaintenanceId;
            await window.dbManager.updateRecord(window.dbManager.STORES.MAINTENANCE, maintenanceRecord);
            
            // Update linked expense if it exists
            const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
            const linkedExpense = expenses.find(e => e.linkedMaintenanceId === currentMaintenanceId);
            if (linkedExpense) {
                linkedExpense.date = maintenanceRecord.date;
                linkedExpense.amount = maintenanceRecord.cost;
                linkedExpense.description = `${maintenanceRecord.serviceType} - ${maintenanceRecord.description || 'No description'}`;
                await window.dbManager.updateRecord(window.dbManager.STORES.EXPENSES, linkedExpense);
            }
            
            showToast('Maintenance record updated successfully', 'success');
        } else {
            // Save new record
            const savedId = await window.dbManager.addRecord(window.dbManager.STORES.MAINTENANCE, maintenanceRecord);
            
            // Create expense entry if checkbox is checked
            const createExpenseCheckbox = document.getElementById('createExpenseEntry');
            if (createExpenseCheckbox && createExpenseCheckbox.checked) {
                const expense = {
                    date: maintenanceRecord.date,
                    category: 'Maintenance',
                    description: `${maintenanceRecord.serviceType} - ${maintenanceRecord.description || 'No description'}`,
                    amount: maintenanceRecord.cost,
                    linkedMaintenanceId: savedId
                };
                await window.dbManager.addRecord(window.dbManager.STORES.EXPENSES, expense);
            }
            
            showToast('Maintenance record added successfully', 'success');
        }

        // Reset form and close modal
        resetMaintenanceForm();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMaintenanceModal'));
        if (modal) {
            modal.hide();
        }

        // Update displays
        await Promise.all([
            displayMaintenanceRecords(),
            updateStats() // Update dashboard stats
        ]);

    } catch (error) {
        console.error('Error saving maintenance record:', error);
        showToast('Failed to save maintenance record', 'error');
    } finally {
        isSubmitting = false;
    }
}

// Display maintenance records
async function displayMaintenanceRecords() {
    try {
        const records = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        const tableBody = document.getElementById('maintenanceTableBody');
        if (!tableBody) return;

        if (records.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">
                        <div>
                            <i class="fas fa-wrench"></i>
                            <p>No maintenance records yet</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        tableBody.innerHTML = records.map(record => `
            <tr>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${record.serviceType}</td>
                <td>${record.description || '-'}</td>
                <td>${record.mileage}</td>
                <td>EGP ${record.cost.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editMaintenanceRecord(${record.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMaintenanceRecord(${record.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error displaying maintenance records:', error);
        showToast('Failed to load maintenance records', 'error');
    }
}

// Edit maintenance record
async function editMaintenanceRecord(id) {
    try {
        const record = await window.dbManager.getRecordById(window.dbManager.STORES.MAINTENANCE, id);
        if (!record) {
            showToast('Maintenance record not found', 'error');
            return;
        }

        // Reset form first
        resetMaintenanceForm();

        // Set current maintenance ID
        currentMaintenanceId = id;

        // Populate form
        document.getElementById('maintenanceDate').value = record.date;
        
        const serviceTypeSelect = document.getElementById('serviceType');
        if (serviceTypeSelect) {
            if (!serviceTypeSelect.querySelector(`option[value="${record.serviceType}"]`)) {
                // Add service type if it doesn't exist
                const option = document.createElement('option');
                option.value = record.serviceType;
                option.textContent = record.serviceType;
                const otherOption = serviceTypeSelect.querySelector('option[value="Other"]');
                serviceTypeSelect.insertBefore(option, otherOption);
            }
            serviceTypeSelect.value = record.serviceType;
        }

        document.getElementById('maintenanceDescription').value = record.description || '';
        document.getElementById('maintenanceMileage').value = record.mileage;
        document.getElementById('maintenanceCost').value = record.cost;

        // Add parts
        if (record.parts && record.parts.length > 0) {
            const partsContainer = document.getElementById('partsContainer');
            const noPartsMessage = document.getElementById('noPartsMessage');
            
            if (noPartsMessage) {
                noPartsMessage.style.display = 'none';
            }

            for (const part of record.parts) {
                const partTemplate = document.getElementById('partTemplate');
                if (!partTemplate) continue;

                const partElement = partTemplate.content.cloneNode(true).querySelector('.part-item');
                
                const partName = partElement.querySelector('.part-name');
                const partNumber = partElement.querySelector('.part-number');
                const partCost = partElement.querySelector('.part-cost');
                const partSupplier = partElement.querySelector('.part-supplier');

                if (partName) partName.value = part.name;
                if (partNumber) partNumber.value = part.number || '';
                if (partCost) partCost.value = part.cost;
                if (partSupplier && part.supplierId) partSupplier.value = part.supplierId;

                partsContainer.appendChild(partElement);
            }
        }

        // Update modal title and button text
        const modalTitle = document.querySelector('#addMaintenanceModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Edit Maintenance Record';
        
        const submitButton = document.querySelector('#maintenanceForm button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Update';

        // Check if there's a linked expense
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const hasLinkedExpense = expenses.some(e => e.linkedMaintenanceId === id);
        const createExpenseCheckbox = document.getElementById('createExpenseEntry');
        if (createExpenseCheckbox) {
            createExpenseCheckbox.checked = hasLinkedExpense;
            createExpenseCheckbox.disabled = hasLinkedExpense;
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addMaintenanceModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing maintenance record:', error);
        showToast('Failed to edit maintenance record', 'error');
    }
}

// Delete maintenance record
async function deleteMaintenanceRecord(id) {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
        return;
    }

    try {
        // Delete maintenance record
        await window.dbManager.deleteRecord(window.dbManager.STORES.MAINTENANCE, id);
        
        // Delete linked expense if it exists
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const linkedExpense = expenses.find(e => e.linkedMaintenanceId === id);
        if (linkedExpense) {
            await window.dbManager.deleteRecord(window.dbManager.STORES.EXPENSES, linkedExpense.id);
        }
        
        // Update displays
        await Promise.all([
            displayMaintenanceRecords(),
            updateStats() // Update dashboard stats
        ]);
        
        showToast('Maintenance record deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        showToast('Failed to delete maintenance record', 'error');
    }
}

// Export functionality
window.maintenanceManager = {
    initMaintenanceRecords,
    editMaintenanceRecord,
    deleteMaintenanceRecord,
    displayMaintenanceRecords
};
