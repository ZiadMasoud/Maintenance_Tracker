/**
 * Parts Functionality
 * This file handles the parts-related functionality for the Car Maintenance Tracker.
 * It provides utility functions for working with parts in maintenance records.
 */

// Get parts from maintenance record form
function getPartsFromForm() {
    try {
        const parts = [];
        const partsContainer = document.getElementById('partsContainer');
        
        if (!partsContainer) {
            console.error('Parts container not found');
            return parts;
        }
        
        // Get all part items
        const partElements = partsContainer.querySelectorAll('.part-item');
        
        // Process each part
        partElements.forEach(partElement => {
            const partName = partElement.querySelector('.part-name');
            const partNumber = partElement.querySelector('.part-number');
            const partCost = partElement.querySelector('.part-cost');
            const partSupplier = partElement.querySelector('.part-supplier');
            
            if (!partName || !partCost) {
                console.warn('Part element missing required fields');
                return;
            }
            
            // Validate part name and cost
            if (!partName.value.trim() || isNaN(parseFloat(partCost.value))) {
                console.warn('Part has invalid name or cost');
                return;
            }
            
            // Add part to array
            parts.push({
                name: partName.value.trim(),
                number: partNumber ? partNumber.value.trim() : '',
                cost: parseFloat(partCost.value),
                supplierId: partSupplier && partSupplier.value ? parseInt(partSupplier.value) : null
            });
        });
        
        return parts;
    } catch (error) {
        console.error('Error getting parts from form:', error);
        return [];
    }
}

// Populate form with parts
function populatePartsForm(parts) {
    try {
        // Get parts container
        const partsContainer = document.getElementById('partsContainer');
        const noPartsMessage = document.getElementById('noPartsMessage');
        
        if (!partsContainer) {
            console.error('Parts container not found');
            return;
        }
        
        // Clear existing parts
        partsContainer.querySelectorAll('.part-item').forEach(item => item.remove());
        
        // Show no parts message if no parts
        if (!parts || parts.length === 0) {
            if (noPartsMessage) {
                noPartsMessage.style.display = 'block';
            }
            return;
        }
        
        // Hide no parts message
        if (noPartsMessage) {
            noPartsMessage.style.display = 'none';
        }
        
        // Get part template
        const partTemplate = document.getElementById('partTemplate');
        if (!partTemplate) {
            console.error('Part template not found');
            return;
        }
        
        // Add each part
        parts.forEach(part => {
            // Clone template
            const partElement = document.importNode(partTemplate.content, true);
            
            // Set values
            const partNameInput = partElement.querySelector('.part-name');
            const partNumberInput = partElement.querySelector('.part-number');
            const partCostInput = partElement.querySelector('.part-cost');
            const partSupplierSelect = partElement.querySelector('.part-supplier');
            
            if (partNameInput) partNameInput.value = part.name;
            if (partNumberInput) partNumberInput.value = part.number || '';
            if (partCostInput) partCostInput.value = part.cost;
            if (partSupplierSelect && part.supplierId) {
                partSupplierSelect.value = part.supplierId;
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
        });
    } catch (error) {
        console.error('Error populating parts form:', error);
    }
}

// Calculate total cost of parts
function calculatePartsTotalCost(parts) {
    try {
        if (!parts || !Array.isArray(parts)) {
            return 0;
        }
        
        return parts.reduce((total, part) => {
            return total + (parseFloat(part.cost) || 0);
        }, 0);
    } catch (error) {
        console.error('Error calculating parts total cost:', error);
        return 0;
    }
}

// Format parts for display
function formatPartsForDisplay(parts, suppliers) {
    try {
        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return 'None';
        }
        
        const totalCost = calculatePartsTotalCost(parts);
        const formattedCost = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(totalCost);
        
        return `${parts.length} part${parts.length > 1 ? 's' : ''} (${formattedCost})`;
    } catch (error) {
        console.error('Error formatting parts for display:', error);
        return 'Error';
    }
}

// Get supplier name by ID
async function getSupplierNameById(id) {
    try {
        if (!id) {
            return 'None';
        }
        
        const supplier = await window.dbManager.getRecordById(window.dbManager.STORES.SUPPLIERS, id);
        return supplier ? supplier.name : 'Unknown';
    } catch (error) {
        console.error('Error getting supplier name:', error);
        return 'Error';
    }
}

// Export parts functions for use in other modules
window.partsManager = {
    getPartsFromForm,
    populatePartsForm,
    calculatePartsTotalCost,
    formatPartsForDisplay
};
