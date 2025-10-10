/* maintenance.js - Enhanced maintenance logging functionality */

// Helper function to format a date for input fields
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Helper function to create Google Maps link
function createGoogleMapsLink(location) {
    const query = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Add new maintenance record
async function addMaintenanceRecord(data) {
    const record = {
        date: data.date,
        odometer: parseInt(data.odometer),
        supplier: {
            name: data.supplierName,
            location: data.supplierLocation
        },
        services: data.services.map(service => ({
            name: service.name,
            cost: parseFloat(service.cost),
            notes: service.notes || '',
            nextService: service.nextService ? {
                type: service.nextService.type, // 'date' or 'odometer'
                value: service.nextService.type === 'date' ? 
                    service.nextService.value :
                    parseInt(service.nextService.value)
            } : null
        })),
        totalCost: data.services.reduce((sum, service) => sum + parseFloat(service.cost), 0),
        createdAt: new Date().toISOString()
    };

    await db.add('maintenance', record);
    return record;
}

// Update existing maintenance record
async function updateMaintenanceRecord(id, data) {
    const record = {
        id: parseInt(id),
        date: data.date,
        odometer: parseInt(data.odometer),
        supplier: {
            name: data.supplierName,
            location: data.supplierLocation
        },
        services: data.services.map(service => ({
            name: service.name,
            cost: parseFloat(service.cost),
            notes: service.notes || '',
            nextService: service.nextService ? {
                type: service.nextService.type,
                value: service.nextService.type === 'date' ? 
                    service.nextService.value :
                    parseInt(service.nextService.value)
            } : null
        })),
        totalCost: data.services.reduce((sum, service) => sum + parseFloat(service.cost), 0)
    };

    await db.put('maintenance', record);
    return record;
}

// Delete maintenance record
async function deleteMaintenanceRecord(id) {
    await db.delete('maintenance', parseInt(id));
}

// Get all maintenance records
async function getAllMaintenanceRecords() {
    return await db.getAll('maintenance');
}

// Get upcoming service reminders
async function getUpcomingServices() {
    const records = await getAllMaintenanceRecords();
    const currentDate = new Date();
    const currentOdometer = await getCurrentOdometer();
    const reminders = [];

    records.forEach(record => {
        record.services.forEach(service => {
            if (!service.nextService) return;

            const reminder = {
                serviceName: service.name,
                originalDate: record.date,
                originalOdometer: record.odometer
            };

            if (service.nextService.type === 'date') {
                const nextDate = new Date(service.nextService.value);
                const daysRemaining = Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24));
                reminder.type = 'date';
                reminder.dueDate = service.nextService.value;
                reminder.remaining = daysRemaining;
                reminder.status = daysRemaining <= 0 ? 'overdue' : 'upcoming';
            } else {
                const kmRemaining = service.nextService.value - currentOdometer;
                reminder.type = 'odometer';
                reminder.dueKm = service.nextService.value;
                reminder.remaining = kmRemaining;
                reminder.status = kmRemaining <= 0 ? 'overdue' : 'upcoming';
            }

            reminders.push(reminder);
        });
    });

    return reminders.sort((a, b) => {
        if (a.status === b.status) {
            return a.remaining - b.remaining;
        }
        return a.status === 'overdue' ? -1 : 1;
    });
}

// Get current odometer reading
async function getCurrentOdometer() {
    const profile = await db.get('profile', 'profile');
    return profile ? profile.odometer : 0;
}

// Initialize maintenance interface
async function initMaintenance() {
    const maintenanceForm = document.getElementById('maintenanceForm');
    const servicesList = document.getElementById('servicesList');
    const maintenanceRecords = document.getElementById('maintenanceRecords');
    const addServiceBtn = document.getElementById('addService');

    // Add new service row
    function addServiceRow(service = {}) {
        const row = document.createElement('div');
        row.className = 'service-row';
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="service-name" placeholder="Service Name" 
                       value="${service.name || ''}" required>
            </div>
            <div class="form-group">
                <input type="number" class="service-cost" placeholder="Cost" step="0.01" 
                       value="${service.cost || ''}" required>
            </div>
            <div class="form-group">
                <textarea class="service-notes" placeholder="Notes">${service.notes || ''}</textarea>
            </div>
            <div class="form-group reminder-group">
                <select class="reminder-type">
                    <option value="">No Reminder</option>
                    <option value="date" ${service.nextService?.type === 'date' ? 'selected' : ''}>By Date</option>
                    <option value="odometer" ${service.nextService?.type === 'odometer' ? 'selected' : ''}>By Odometer</option>
                </select>
                <div class="reminder-value-container" style="display: none;">
                    <input type="date" class="reminder-date" style="display: none;">
                    <input type="number" class="reminder-odometer" placeholder="Odometer" style="display: none;">
                </div>
            </div>
            <button type="button" class="btn red remove-service">Remove</button>
        `;

        // Set reminder value if exists
        if (service.nextService) {
            const container = row.querySelector('.reminder-value-container');
            const dateInput = row.querySelector('.reminder-date');
            const odometerInput = row.querySelector('.reminder-odometer');
            container.style.display = 'block';
            
            if (service.nextService.type === 'date') {
                dateInput.style.display = 'block';
                dateInput.value = service.nextService.value;
            } else {
                odometerInput.style.display = 'block';
                odometerInput.value = service.nextService.value;
            }
        }

        // Handle reminder type change
        const reminderType = row.querySelector('.reminder-type');
        reminderType.addEventListener('change', (e) => {
            const container = row.querySelector('.reminder-value-container');
            const dateInput = row.querySelector('.reminder-date');
            const odometerInput = row.querySelector('.reminder-odometer');
            
            container.style.display = e.target.value ? 'block' : 'none';
            dateInput.style.display = e.target.value === 'date' ? 'block' : 'none';
            odometerInput.style.display = e.target.value === 'odometer' ? 'block' : 'none';
            
            if (e.target.value === 'date') {
                dateInput.value = formatDateForInput(new Date());
            }
        });

        // Remove service button
        row.querySelector('.remove-service').addEventListener('click', () => {
            row.remove();
            updateTotalCost();
        });

        // Update total cost on input
        row.querySelector('.service-cost').addEventListener('input', updateTotalCost);

        servicesList.appendChild(row);
        updateTotalCost();
    }

    // Calculate and update total cost
    function updateTotalCost() {
        const total = Array.from(servicesList.querySelectorAll('.service-cost'))
            .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
        document.getElementById('totalCost').textContent = `$${total.toFixed(2)}`;
    }

    // Add service button
    addServiceBtn.addEventListener('click', () => addServiceRow());

    // Form submission
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const services = Array.from(servicesList.querySelectorAll('.service-row')).map(row => {
            const reminderType = row.querySelector('.reminder-type').value;
            const reminderDate = row.querySelector('.reminder-date').value;
            const reminderOdometer = row.querySelector('.reminder-odometer').value;

            return {
                name: row.querySelector('.service-name').value,
                cost: row.querySelector('.service-cost').value,
                notes: row.querySelector('.service-notes').value,
                nextService: reminderType ? {
                    type: reminderType,
                    value: reminderType === 'date' ? reminderDate : reminderOdometer
                } : null
            };
        });

        const data = {
            date: document.getElementById('maintenanceDate').value,
            odometer: document.getElementById('maintenanceOdometer').value,
            supplierName: document.getElementById('supplierName').value,
            supplierLocation: document.getElementById('supplierLocation').value,
            services: services
        };

        await addMaintenanceRecord(data);
        refreshMaintenanceList();
        maintenanceForm.reset();
        servicesList.innerHTML = '';
        addServiceRow(); // Add one empty row
    });

    // Refresh maintenance records list
    async function refreshMaintenanceList() {
        const records = await getAllMaintenanceRecords();
        maintenanceRecords.innerHTML = records.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        ).map(record => `
            <div class="list-item maintenance-record" data-id="${record.id}">
                <div class="list-item-content">
                    <div class="list-item-title">
                        ${new Date(record.date).toLocaleDateString()} - ${record.odometer}km
                    </div>
                    <div class="list-item-subtitle">
                        ${record.supplier.name} - 
                        <a href="${createGoogleMapsLink(record.supplier.location)}" 
                           target="_blank">View Location</a>
                    </div>
                    <div class="services-summary">
                        ${record.services.map(service => `
                            <div class="service-item">
                                <strong>${service.name}</strong> - $${service.cost}
                                ${service.nextService ? `
                                    <span class="reminder">
                                        Next: ${service.nextService.type === 'date' ? 
                                            new Date(service.nextService.value).toLocaleDateString() :
                                            service.nextService.value + ' km'}
                                    </span>
                                ` : ''}
                            </div>
                        `).join('')}
                        <div class="total-cost">Total: $${record.totalCost.toFixed(2)}</div>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn" onclick="editMaintenanceRecord(${record.id})">Edit</button>
                    <button class="btn red" onclick="deleteMaintenanceRecord(${record.id})">Delete</button>
                </div>
            </div>
        `).join('');

        // Update dashboard reminders
        const reminders = await getUpcomingServices();
        const upcomingServices = document.getElementById('upcomingServices');
        if (upcomingServices) {
            upcomingServices.innerHTML = reminders.map(reminder => `
                <div class="list-item ${reminder.status}">
                    <div class="list-item-content">
                        <div class="list-item-title">${reminder.serviceName}</div>
                        <div class="list-item-subtitle">
                            ${reminder.type === 'date' ? 
                                `Due: ${new Date(reminder.dueDate).toLocaleDateString()} (${Math.abs(reminder.remaining)} days ${reminder.remaining < 0 ? 'overdue' : 'remaining'})` :
                                `Due at: ${reminder.dueKm}km (${Math.abs(reminder.remaining)}km ${reminder.remaining < 0 ? 'overdue' : 'remaining'})`}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Edit maintenance record
    window.editMaintenanceRecord = async (id) => {
        const record = await db.get('maintenance', id);
        if (!record) return;

        // Create edit form
        const form = document.createElement('form');
        form.className = 'form';
        form.innerHTML = `
            <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" value="${record.date}" required>
            </div>
            <div class="form-group">
                <label>Odometer (km)</label>
                <input type="number" name="odometer" value="${record.odometer}" required>
            </div>
            <div class="form-group">
                <label>Supplier Name</label>
                <input type="text" name="supplierName" value="${record.supplier.name}" required>
            </div>
            <div class="form-group">
                <label>Supplier Location</label>
                <input type="text" name="supplierLocation" value="${record.supplier.location}" required>
            </div>
            <div class="services-list" id="editServicesList"></div>
            <button type="button" class="btn" id="editAddService">Add Service</button>
            <div class="total-container">
                Total Cost: <span id="editTotalCost">$${record.totalCost.toFixed(2)}</span>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn">Save Changes</button>
                <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        `;

        // Show in modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Maintenance Record</h3>
                ${form.outerHTML}
            </div>
        `;

        document.body.appendChild(modal);

        const editForm = modal.querySelector('form');
        const editServicesList = modal.querySelector('#editServicesList');

        // Add existing services
        record.services.forEach(service => addServiceRow.call({ editMode: true }, service));

        // Add service button
        modal.querySelector('#editAddService').addEventListener('click', () => 
            addServiceRow.call({ editMode: true }));

        // Handle form submission
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const services = Array.from(editServicesList.querySelectorAll('.service-row')).map(row => ({
                name: row.querySelector('.service-name').value,
                cost: row.querySelector('.service-cost').value,
                notes: row.querySelector('.service-notes').value,
                nextService: row.querySelector('.reminder-type').value ? {
                    type: row.querySelector('.reminder-type').value,
                    value: row.querySelector('.reminder-type').value === 'date' ?
                        row.querySelector('.reminder-date').value :
                        row.querySelector('.reminder-odometer').value
                } : null
            }));

            await updateMaintenanceRecord(id, {
                date: formData.get('date'),
                odometer: formData.get('odometer'),
                supplierName: formData.get('supplierName'),
                supplierLocation: formData.get('supplierLocation'),
                services: services
            });

            modal.remove();
            refreshMaintenanceList();
        });
    };

    // Delete confirmation
    window.deleteMaintenanceRecord = async (id) => {
        if (confirm('Are you sure you want to delete this maintenance record?')) {
            await deleteMaintenanceRecord(id);
            refreshMaintenanceList();
        }
    };

    // Initial setup
    addServiceRow(); // Add one empty service row
    maintenanceForm.querySelector('#maintenanceDate').value = formatDateForInput(new Date());
    refreshMaintenanceList();
}

// Export functions
window.editMaintenanceRecord = editMaintenanceRecord;
window.deleteMaintenanceRecord = deleteMaintenanceRecord;
window.initMaintenance = initMaintenance;
