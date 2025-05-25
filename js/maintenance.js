/**
 * Maintenance Records Functionality
 * This file handles the maintenance records section of the Car Maintenance Tracker.
 */

// DOM Elements
let maintenanceForm;
let maintenanceDate;
let serviceType;
let customServiceTypeContainer;
let customServiceType;
let maintenanceDescription;
let maintenanceMileage;
let maintenanceCost;
let partsContainer;
let noPartsMessage;
let addPartBtn;
let saveMaintenanceBtn;
let maintenanceTableBody;
let addMaintenanceModal;
let createExpenseEntry;
let currentMaintenanceId = null;

// Flag to prevent duplicate submissions
let isSubmitting = false;

// Initialize maintenance records display
async function initMaintenanceRecords() {
    console.log('Initializing maintenance records...');
    
    try {
        // Initialize DOM elements
        maintenanceForm = document.getElementById('maintenanceForm');
        maintenanceDate = document.getElementById('maintenanceDate');
        serviceType = document.getElementById('serviceType');
        customServiceTypeContainer = document.getElementById('customServiceTypeContainer');
        customServiceType = document.getElementById('customServiceType');
        maintenanceDescription = document.getElementById('maintenanceDescription');
        maintenanceMileage = document.getElementById('maintenanceMileage');
        maintenanceCost = document.getElementById('maintenanceCost');
        partsContainer = document.getElementById('partsContainer');
        noPartsMessage = document.getElementById('noPartsMessage');
        addPartBtn = document.getElementById('addPartBtn');
        saveMaintenanceBtn = document.getElementById('saveMaintenanceBtn');
        maintenanceTableBody = document.getElementById('maintenanceTableBody');
        createExpenseEntry = document.getElementById('createExpenseEntry');
        
        // Initialize modal
        const addMaintenanceModalElement = document.getElementById('addMaintenanceModal');
        if (addMaintenanceModalElement) {
            addMaintenanceModal = new bootstrap.Modal(addMaintenanceModalElement);
            
            // Reset form when modal is hidden
            addMaintenanceModalElement.addEventListener('hidden.bs.modal', resetMaintenanceForm);
        }
        
        // Set default date to today
        if (maintenanceDate) {
            maintenanceDate.valueAsDate = new Date();
        }
        
        // Handle custom service type
        if (serviceType && customServiceTypeContainer) {
            serviceType.addEventListener('change', function() {
                if (this.value === 'Other') {
                    customServiceTypeContainer.classList.remove('d-none');
                    customServiceType.setAttribute('required', 'required');
                } else {
                    customServiceTypeContainer.classList.add('d-none');
                    customServiceType.removeAttribute('required');
                }
            });
        }
        
        // Add event listener to add part button
        if (addPartBtn) {
            addPartBtn.addEventListener('click', addPartToForm);
        }
        
        // Add event listener to save button
        if (saveMaintenanceBtn) {
            // Remove any existing event listeners to prevent duplicates
            saveMaintenanceBtn.removeEventListener('click', handleSaveMaintenance);
            // Add the event listener
            saveMaintenanceBtn.addEventListener('click', handleSaveMaintenance);
        }
        
        // Add event listener to export button
        const exportMaintenancePDFBtn = document.getElementById('exportMaintenancePDF');
        if (exportMaintenancePDFBtn) {
            exportMaintenancePDFBtn.addEventListener('click', function() {
                if (window.pdfExportManager) {
                    window.pdfExportManager.exportMaintenanceToPDF();
                } else {
                    showError('PDF export functionality not available');
                }
            });
        }
        
        // Load saved service types
        await loadServiceTypes();
        
        // Load saved suppliers for parts dropdown
        await loadSuppliers();
        
        // Display maintenance records
        await displayMaintenanceRecords();
        
        console.log('Maintenance records initialized successfully');
    } catch (error) {
        console.error('Error initializing maintenance records:', error);
        showError('Failed to initialize maintenance records');
    }
}

// Load saved service types
async function loadServiceTypes() {
    try {
        // Get all service types
        const serviceTypes = await window.dbManager.getAllRecords(window.dbManager.STORES.SERVICE_TYPES);
        
        if (serviceTypes.length === 0) {
            return;
        }
        
        // Add to select element
        if (serviceType) {
            // Get the "Other" option
            const otherOption = serviceType.querySelector('option[value="Other"]');
            
            // Add each service type before the "Other" option
            serviceTypes.forEach(type => {
                // Check if option already exists
                if (!serviceType.querySelector(`option[value="${type.name}"]`)) {
                    const option = document.createElement('option');
                    option.value = type.name;
                    option.textContent = type.name;
                    serviceType.insertBefore(option, otherOption);
                }
            });
        }
    } catch (error) {
        console.error('Error loading service types:', error);
    }
}

// Load suppliers for parts dropdown
async function loadSuppliers() {
    try {
        // Get all suppliers
        const suppliers = await window.dbManager.getAllRecords(window.dbManager.STORES.SUPPLIERS);
        
        if (suppliers.length === 0) {
            return;
        }
        
        // Update supplier template
        const partTemplate = document.getElementById('partTemplate');
        if (partTemplate) {
            const supplierSelect = partTemplate.content.querySelector('.part-supplier');
            if (supplierSelect) {
                // Clear existing options except the first one
                while (supplierSelect.options.length > 1) {
                    supplierSelect.remove(1);
                }
                
                // Add each supplier
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    supplierSelect.appendChild(option);
                });
            }
        }
        
        // Update existing part supplier dropdowns
        const partSupplierSelects = document.querySelectorAll('.part-supplier');
        partSupplierSelects.forEach(select => {
            // Save current value
            const currentValue = select.value;
            
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add each supplier
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                select.appendChild(option);
            });
            
            // Restore value if possible
            if (currentValue) {
                select.value = currentValue;
            }
        });
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

// Reset maintenance form
function resetMaintenanceForm() {
    if (maintenanceForm) {
        maintenanceForm.reset();
    }
    
    if (maintenanceDate) {
        maintenanceDate.valueAsDate = new Date();
    }
    
    if (customServiceTypeContainer) {
        customServiceTypeContainer.classList.add('d-none');
    }
    
    if (customServiceType) {
        customServiceType.removeAttribute('required');
    }
    
    if (partsContainer) {
        // Remove all parts except the message
        const parts = partsContainer.querySelectorAll('.part-item');
        parts.forEach(part => {
            part.remove();
        });
        
        // Show no parts message
        if (noPartsMessage) {
            noPartsMessage.style.display = 'block';
        }
    }
    
    // Reset current maintenance ID
    currentMaintenanceId = null;
    
    // Reset submission flag
    isSubmitting = false;
    
    // Reset save button text
    if (saveMaintenanceBtn) {
        saveMaintenanceBtn.textContent = 'Save';
    }
}

// Add part to form
function addPartToForm() {
    try {
        // Get template
        const partTemplate = document.getElementById('partTemplate');
        if (!partTemplate) {
            console.error('Part template not found');
            return;
        }
        
        // Clone template
        const partElement = document.importNode(partTemplate.content, true);
        
        // Add event listener to remove button
        const removeBtn = partElement.querySelector('.remove-part-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                this.closest('.part-item').remove();
                
                // Show no parts message if no parts left
                if (partsContainer.querySelectorAll('.part-item').length === 0 && noPartsMessage) {
                    noPartsMessage.style.display = 'block';
                }
            });
        }
        
        // Hide no parts message
        if (noPartsMessage) {
            noPartsMessage.style.display = 'none';
        }
        
        // Add to container
        if (partsContainer) {
            partsContainer.appendChild(partElement);
        }
    } catch (error) {
        console.error('Error adding part to form:', error);
        showError('Failed to add part to form');
    }
}

// Save maintenance record
async function handleSaveMaintenance() {
    try {
        // Prevent duplicate submissions
        if (isSubmitting) {
            console.log('Submission already in progress, ignoring duplicate click');
            return;
        }
        
        isSubmitting = true;
        console.log('Saving maintenance record...');
        
        // Validate form
        if (!maintenanceForm.checkValidity()) {
            maintenanceForm.reportValidity();
            isSubmitting = false;
            return;
        }
        
        // Get service type
        let finalServiceType = serviceType.value;
        if (finalServiceType === 'Other' && customServiceType.value.trim()) {
            finalServiceType = customServiceType.value.trim();
            
            // Save custom service type for future use
            try {
                await window.dbManager.addRecord(window.dbManager.STORES.SERVICE_TYPES, {
                    name: finalServiceType
                });
                
                // Add to select element
                const option = document.createElement('option');
                option.value = finalServiceType;
                option.textContent = finalServiceType;
                const otherOption = serviceType.querySelector('option[value="Other"]');
                serviceType.insertBefore(option, otherOption);
            } catch (error) {
                console.error('Error saving custom service type:', error);
                // Continue with the rest of the function
            }
        }

        // Get parts using the utility function from parts.js
        const parts = window.partsManager ? window.partsManager.getPartsFromForm() : [];
        
        // Fallback if partsManager is not available
        if (parts.length === 0 && partsContainer.querySelectorAll('.part-item').length > 0) {
            const partElements = partsContainer.querySelectorAll('.part-item');
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
        }

        // Prepare data
        const maintenanceRecord = {
            date: maintenanceDate.value,
            serviceType: finalServiceType,
            description: maintenanceDescription.value,
            mileage: parseInt(maintenanceMileage.value),
            cost: parseFloat(maintenanceCost.value),
            parts: parts
        };
        
        console.log('Maintenance record data:', maintenanceRecord);

        // Save to database
        const savedId = await window.dbManager.addRecord(window.dbManager.STORES.MAINTENANCE, maintenanceRecord);

        // Create expense entry if checkbox is checked
        if (createExpenseEntry && createExpenseEntry.checked) {
            const expense = {
                date: maintenanceDate.value,
                category: 'Maintenance',
                description: `${finalServiceType} - ${maintenanceDescription.value || 'No description'}`,
                amount: parseFloat(maintenanceCost.value),
                linkedMaintenanceId: savedId
            };

            await window.dbManager.addRecord(window.dbManager.STORES.EXPENSES, expense);
        }
        
        // Reset form and close modal
        resetMaintenanceForm();
        if (addMaintenanceModal) {
            addMaintenanceModal.hide();
        }
        
        // Refresh display
        await displayMaintenanceRecords();
        
        // Show success message
        const message = currentMaintenanceId ? 'Maintenance record updated successfully' : 'Maintenance record added successfully';
        showSuccess(message);
    } catch (error) {
        console.error('Error saving maintenance record:', error);
        showError('Failed to save maintenance record: ' + error.message);
    } finally {
        // Reset submission flag
        isSubmitting = false;
    }
}

// Display maintenance records
async function displayMaintenanceRecords() {
    try {
        console.log('Displaying maintenance records...');
        
        // Check if table body exists
        if (!maintenanceTableBody) {
            maintenanceTableBody = document.getElementById('maintenanceTableBody');
            if (!maintenanceTableBody) {
                console.error('Maintenance table body not found');
                return;
            }
        }

        // Clear table
        maintenanceTableBody.innerHTML = '';
        
        // Get all records
        const records = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        console.log(`Retrieved ${records.length} maintenance records`);
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (records.length === 0) {
            // Display message if no records
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">No maintenance records found</td>';
            maintenanceTableBody.appendChild(row);
            return;
        }
        
        // Add each record to table
        records.forEach(record => {
            const row = document.createElement('tr');
            
            // Format date
            const formattedDate = new Date(record.date).toLocaleDateString();
            
            // Format cost
            const formattedCost = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EGP'
            }).format(record.cost);
            
            // Format parts
            let partsText = 'None';
            if (record.parts && record.parts.length > 0) {
                partsText = `${record.parts.length} part${record.parts.length > 1 ? 's' : ''}`;
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.serviceType}</td>
                <td>${record.description || '-'}</td>
                <td>${record.mileage.toLocaleString()} km</td>
                <td>${formattedCost}</td>
                <td>${partsText}</td>
                <td>
                    <button class="btn btn-sm btn-secondary action-btn view-maintenance me-1" data-id="${record.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-info action-btn edit-maintenance me-1" data-id="${record.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger action-btn delete-maintenance" data-id="${record.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            maintenanceTableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.view-maintenance').forEach(button => {
            button.addEventListener('click', handleViewMaintenance);
        });
        
        document.querySelectorAll('.edit-maintenance').forEach(button => {
            button.addEventListener('click', handleEditMaintenance);
        });
        
        document.querySelectorAll('.delete-maintenance').forEach(button => {
            button.addEventListener('click', handleDeleteMaintenance);
        });
        
        console.log('Maintenance records displayed successfully');
    } catch (error) {
        console.error('Error displaying maintenance records:', error);
        showError('Failed to display maintenance records: ' + error.message);
    }
}

// Handle view maintenance record
async function handleViewMaintenance(event) {
    try {
        const id = parseInt(event.currentTarget.getAttribute('data-id'));
        console.log(`Viewing maintenance record with ID: ${id}`);
        
        // Get record from database
        const record = await window.dbManager.getRecordById(window.dbManager.STORES.MAINTENANCE, id);
        
        if (!record) {
            showError('Maintenance record not found');
            return;
        }
        
        // Get view modal
        const viewMaintenanceModal = document.getElementById('viewMaintenanceModal');
        const viewMaintenanceBody = document.getElementById('viewMaintenanceBody');
        
        if (!viewMaintenanceModal || !viewMaintenanceBody) {
            console.error('View maintenance modal not found');
            return;
        }
        
        // Format date
        const formattedDate = new Date(record.date).toLocaleDateString();
        
        // Format cost
        const formattedCost = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(record.cost);
        
        // Prepare parts HTML
        let partsHtml = '<p>No parts recorded for this maintenance.</p>';
        
        if (record.parts && record.parts.length > 0) {
            partsHtml = '<div class="table-responsive"><table class="table table-sm table-striped">';
            partsHtml += '<thead><tr><th>Part Name</th><th>Part Number</th><th>Cost</th><th>Supplier</th></tr></thead>';
            partsHtml += '<tbody>';
            
            // Add each part
            for (const part of record.parts) {
                const formattedPartCost = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(part.cost);
                
                // Get supplier name if available
                let supplierName = 'None';
                if (part.supplierId) {
                    try {
                        const supplier = await window.dbManager.getRecordById(window.dbManager.STORES.SUPPLIERS, part.supplierId);
                        if (supplier) {
                            supplierName = supplier.name;
                        }
                    } catch (error) {
                        console.error('Error getting supplier:', error);
                    }
                }
                
                partsHtml += `<tr>
                    <td>${part.name}</td>
                    <td>${part.number || '-'}</td>
                    <td>${formattedPartCost}</td>
                    <td>${supplierName}</td>
                </tr>`;
            }
            
            partsHtml += '</tbody></table></div>';
        }
        
        // Set modal content
        viewMaintenanceBody.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Service Type:</strong> ${record.serviceType}</p>
                    <p><strong>Mileage:</strong> ${record.mileage.toLocaleString()}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Total Cost:</strong> ${formattedCost}</p>
                    <p><strong>Description:</strong> ${record.description || '-'}</p>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <h5 class="mt-3 mb-2">Parts</h5>
                    ${partsHtml}
                </div>
            </div>
        `;
        
        // Show modal
        const modal = new bootstrap.Modal(viewMaintenanceModal);
        modal.show();
    } catch (error) {
        console.error('Error viewing maintenance record:', error);
        showError('Failed to view maintenance record: ' + error.message);
    }
}

// Handle edit maintenance record
async function handleEditMaintenance(event) {
    try {
        const id = parseInt(event.currentTarget.getAttribute('data-id'));
        console.log(`Editing maintenance record with ID: ${id}`);
        
        // Get record from database
        const record = await window.dbManager.getRecordById(window.dbManager.STORES.MAINTENANCE, id);
        
        if (!record) {
            showError('Maintenance record not found');
            return;
        }
        
        // Reset form first
        resetMaintenanceForm();
        
        // Set current maintenance ID
        currentMaintenanceId = id;
        
        // Populate form
        if (maintenanceDate) maintenanceDate.value = record.date;
        
        if (serviceType) {
            // Check if service type exists in options
            const option = serviceType.querySelector(`option[value="${record.serviceType}"]`);
            if (option) {
                serviceType.value = record.serviceType;
            } else {
                // Add service type option
                const newOption = document.createElement('option');
                newOption.value = record.serviceType;
                newOption.textContent = record.serviceType;
                const otherOption = serviceType.querySelector('option[value="Other"]');
                serviceType.insertBefore(newOption, otherOption);
                serviceType.value = record.serviceType;
            }
        }
        
        if (maintenanceDescription) maintenanceDescription.value = record.description || '';
        if (maintenanceMileage) maintenanceMileage.value = record.mileage;
        if (maintenanceCost) maintenanceCost.value = record.cost;
        
        // Add parts
        if (record.parts && record.parts.length > 0 && partsContainer) {
            // Hide no parts message
            if (noPartsMessage) {
                noPartsMessage.style.display = 'none';
            }
            
            // Add each part
            for (const part of record.parts) {
                // Get template
                const partTemplate = document.getElementById('partTemplate');
                if (!partTemplate) {
                    console.error('Part template not found');
                    continue;
                }
                
                // Clone template
                const partElement = document.importNode(partTemplate.content, true);
                
                // Set values
                partElement.querySelector('.part-name').value = part.name;
                partElement.querySelector('.part-number').value = part.number || '';
                partElement.querySelector('.part-cost').value = part.cost;
                
                if (part.supplierId) {
                    const supplierSelect = partElement.querySelector('.part-supplier');
                    if (supplierSelect) {
                        supplierSelect.value = part.supplierId;
                    }
                }
                
                // Add event listener to remove button
                const removeBtn = partElement.querySelector('.remove-part-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        this.closest('.part-item').remove();
                        
                        // Show no parts message if no parts left
                        if (partsContainer.querySelectorAll('.part-item').length === 0 && noPartsMessage) {
                            noPartsMessage.style.display = 'block';
                        }
                    });
                }
                
                // Add to container
                partsContainer.appendChild(partElement);
            }
        }
        
        // Update save button text
        if (saveMaintenanceBtn) {
            saveMaintenanceBtn.textContent = 'Update';
        }
        
        // Show modal
        if (addMaintenanceModal) {
            addMaintenanceModal.show();
        }
    } catch (error) {
        console.error('Error editing maintenance record:', error);
        showError('Failed to edit maintenance record: ' + error.message);
    }
}

// Handle delete maintenance record
async function handleDeleteMaintenance(event) {
    try {
        const id = parseInt(event.currentTarget.getAttribute('data-id'));
        console.log(`Deleting maintenance record with ID: ${id}`);
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this maintenance record?')) {
            return;
        }
        
        // Delete maintenance record
        await window.dbManager.deleteRecord(window.dbManager.STORES.MAINTENANCE, id);
        
        // Delete linked expense if it exists
        const expenses = await window.dbManager.getAllRecords(window.dbManager.STORES.EXPENSES);
        const linkedExpense = expenses.find(expense => expense.linkedMaintenanceId === id);
        if (linkedExpense) {
            await window.dbManager.deleteRecord(window.dbManager.STORES.EXPENSES, linkedExpense.id);
        }
        
        // Refresh display
        await displayMaintenanceRecords();
        
        // Show success message
        showSuccess('Maintenance record deleted successfully');
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        showError('Failed to delete maintenance record: ' + error.message);
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

// Export maintenance functions for use in other modules
window.maintenanceManager = {
    initMaintenanceRecords,
    displayMaintenanceRecords
};
