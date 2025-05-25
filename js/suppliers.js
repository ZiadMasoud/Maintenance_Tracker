/**
 * Suppliers Functionality
 * This file handles the suppliers section of the Car Maintenance Tracker.
 */

// DOM Elements
let supplierRating;
let supplierForm;
let supplierName;
let supplierAddress;
let supplierDescription;
let saveSupplierBtn;
let suppliersTableBody;
let addSupplierModal;
let currentSupplierId = null;

// Module state
const suppliersModule = {
    isSubmitting: false
};

// Initialize suppliers display
async function initSuppliers() {
    console.log('Initializing suppliers...');
    
    try {
        // Initialize DOM elements
        supplierForm = document.getElementById('supplierForm');
        supplierName = document.getElementById('supplierName');
        supplierAddress = document.getElementById('supplierAddress');
        supplierRating = document.getElementsByName('supplierRating');
        supplierDescription = document.getElementById('supplierDescription');
        saveSupplierBtn = document.getElementById('saveSupplierBtn');
        suppliersTableBody = document.getElementById('suppliersTableBody');
        
        const addSupplierModalElement = document.getElementById('addSupplierModal');
        if (addSupplierModalElement) {
            addSupplierModal = new bootstrap.Modal(addSupplierModalElement);
            addSupplierModalElement.addEventListener('hidden.bs.modal', resetSupplierForm);
        }
        
        if (saveSupplierBtn) {
            saveSupplierBtn.removeEventListener('click', handleSaveSupplier);
            saveSupplierBtn.addEventListener('click', handleSaveSupplier);
        }
        
        await displaySuppliers();
        
        console.log('Suppliers initialized successfully');
    } catch (error) {
        console.error('Error initializing suppliers:', error);
        showError('Failed to initialize suppliers');
    }
}

// Reset supplier form
function resetSupplierForm() {
    if (supplierForm) {
        supplierForm.reset();
    }
    
    if (supplierRating) {
        for (const radio of supplierRating) {
            if (parseInt(radio.value) === 3) {
                radio.checked = true;
                break;
            }
        }
    }
    
    currentSupplierId = null;
    suppliersModule.isSubmitting = false;
    
    if (saveSupplierBtn) {
        saveSupplierBtn.textContent = 'Save';
    }
}

// Save supplier
async function handleSaveSupplier() {
    try {
        // Prevent duplicate submissions
        if (suppliersModule.isSubmitting) return;
        suppliersModule.isSubmitting = true;
        
        // Get form data
        const supplier = {
            name: supplierName.value.trim(),
            address: supplierAddress.value.trim() || '',
            rating: parseInt(document.querySelector('input[name="supplierRating"]:checked')?.value) || 3,
            description: supplierDescription.value.trim() || ''
        };
        
        // Validate data
        if (!supplier.name) {
            showError('Please enter a supplier name');
            suppliersModule.isSubmitting = false;
            return;
        }
        
        // Save to database
        await window.dbManager.addRecord(window.dbManager.STORES.SUPPLIERS, supplier);
        
        // Reset form
        resetSupplierForm();
        
        // Close modal
        if (addSupplierModal) {
            addSupplierModal.hide();
        }
        
        // Update display
        await displaySuppliers();
        
        // Show success message
        showSuccess('Supplier added successfully');
    } catch (error) {
        console.error('Error saving supplier:', error);
        showError('Failed to save supplier: ' + error.message);
    } finally {
        suppliersModule.isSubmitting = false;
    }
}

// Display suppliers
async function displaySuppliers() {
    try {
        if (!suppliersTableBody) {
            suppliersTableBody = document.getElementById('suppliersTableBody');
            if (!suppliersTableBody) {
                console.error('Suppliers table body not found');
                return;
            }
        }

        suppliersTableBody.innerHTML = '';
        
        const suppliers = await window.dbManager.getAllRecords(window.dbManager.STORES.SUPPLIERS);
        
        suppliers.sort((a, b) => a.name.localeCompare(b.name));
        
        if (suppliers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No suppliers found</td>';
            suppliersTableBody.appendChild(row);
            return;
        }
        
        suppliers.forEach(supplier => {
            const row = document.createElement('tr');
            
            const stars = '★'.repeat(supplier.rating) + '☆'.repeat(5 - supplier.rating);
            
            row.innerHTML = `
                <td class="fw-medium">${supplier.name}</td>
                <td>${supplier.address || '-'}</td>
                <td><span class="text-warning">${stars}</span></td>
                <td>${supplier.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info action-btn edit-supplier me-1" data-id="${supplier.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger action-btn delete-supplier" data-id="${supplier.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            suppliersTableBody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-supplier').forEach(button => {
            button.addEventListener('click', handleEditSupplier);
        });
        
        document.querySelectorAll('.delete-supplier').forEach(button => {
            button.addEventListener('click', handleDeleteSupplier);
        });
    } catch (error) {
        console.error('Error displaying suppliers:', error);
        showError('Failed to display suppliers: ' + error.message);
    }
}

// Handle edit supplier
async function handleEditSupplier(event) {
    try {
        const id = parseInt(event.currentTarget.getAttribute('data-id'));
        console.log(`Editing supplier with ID: ${id}`);
        
        const supplier = await window.dbManager.getRecordById(window.dbManager.STORES.SUPPLIERS, id);
        
        if (!supplier) {
            showError('Supplier not found');
            return;
        }
        
        currentSupplierId = id;
        
        if (supplierName) supplierName.value = supplier.name;
        if (supplierAddress) supplierAddress.value = supplier.address || '';
        if (supplierDescription) supplierDescription.value = supplier.description || '';
        
        // Set rating
        if (supplierRating) {
            for (const radio of supplierRating) {
                if (parseInt(radio.value) === supplier.rating) {
                    radio.checked = true;
                    break;
                }
            }
        }
        
        if (saveSupplierBtn) {
            saveSupplierBtn.textContent = 'Update';
        }
        
        if (addSupplierModal) {
            addSupplierModal.show();
        }
    } catch (error) {
        console.error('Error editing supplier:', error);
        showError('Failed to edit supplier: ' + error.message);
    }
}

// Handle delete supplier
async function handleDeleteSupplier(event) {
    try {
        const id = parseInt(event.currentTarget.getAttribute('data-id'));
        console.log(`Deleting supplier with ID: ${id}`);
        
        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }
        
        await window.dbManager.deleteRecord(window.dbManager.STORES.SUPPLIERS, id);
        
        await displaySuppliers();
        
        showSuccess('Supplier deleted successfully');
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showError('Failed to delete supplier: ' + error.message);
    }
}

// Show success message
function showSuccess(message) {
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
    
    const toastElement = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// Show error message
function showError(message) {
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
    
    const toastElement = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// Export suppliers functions for use in other modules
window.suppliersManager = {
    initSuppliers,
    displaySuppliers,
    isSubmitting: suppliersModule.isSubmitting
};
