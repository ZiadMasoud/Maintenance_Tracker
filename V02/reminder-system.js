/* reminder-system.js - Service reminder management system */

// Constants for warning thresholds
const THRESHOLDS = {
    DATE: {
        WARNING: 14, // Show yellow warning 14 days before due
        URGENT: 7    // Show red warning 7 days before due
    },
    ODOMETER: {
        WARNING: 1000, // Show yellow warning 1000 km before due
        URGENT: 500    // Show red warning 500 km before due
    }
};

// Helper function to calculate days between dates
function daysBetween(date1, date2) {
    return Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24));
}

// Get current vehicle information
async function getCurrentVehicleInfo() {
    const profile = await db.get('profile', 'profile');
    return {
        currentOdometer: profile.odometer || 0,
        lastUpdated: profile.updatedAt
    };
}

// Calculate reminder status
function calculateReminderStatus(type, remaining) {
    if (remaining <= 0) return 'overdue';
    if (type === 'date') {
        if (remaining <= THRESHOLDS.DATE.URGENT) return 'urgent';
        if (remaining <= THRESHOLDS.DATE.WARNING) return 'warning';
    } else {
        if (remaining <= THRESHOLDS.ODOMETER.URGENT) return 'urgent';
        if (remaining <= THRESHOLDS.ODOMETER.WARNING) return 'warning';
    }
    return 'upcoming';
}

// Get all service reminders
async function getAllServiceReminders() {
    const vehicleInfo = await getCurrentVehicleInfo();
    const records = await db.getAll('maintenance');
    const currentDate = new Date();
    const reminders = [];

    records.forEach(record => {
        record.services.forEach(service => {
            if (!service.nextService) return;

            const reminder = {
                id: record.id,
                serviceName: service.name,
                serviceNotes: service.notes,
                originalDate: record.date,
                originalOdometer: record.odometer,
                supplierName: record.supplier.name
            };

            if (service.nextService.type === 'date') {
                const nextDate = new Date(service.nextService.value);
                const daysRemaining = daysBetween(nextDate, currentDate);
                
                reminder.type = 'date';
                reminder.dueDate = service.nextService.value;
                reminder.remaining = daysRemaining;
                reminder.displayRemaining = Math.abs(daysRemaining) + ' days';
                reminder.status = calculateReminderStatus('date', daysRemaining);
            } else {
                const kmRemaining = service.nextService.value - vehicleInfo.currentOdometer;
                
                reminder.type = 'odometer';
                reminder.dueKm = service.nextService.value;
                reminder.remaining = kmRemaining;
                reminder.displayRemaining = Math.abs(kmRemaining) + ' km';
                reminder.status = calculateReminderStatus('odometer', kmRemaining);
            }

            reminders.push(reminder);
        });
    });

    return {
        reminders: reminders.sort((a, b) => {
            // Sort by status priority first
            const statusPriority = { overdue: 0, urgent: 1, warning: 2, upcoming: 3 };
            if (statusPriority[a.status] !== statusPriority[b.status]) {
                return statusPriority[a.status] - statusPriority[b.status];
            }
            // Then sort by remaining time/distance
            return a.remaining - b.remaining;
        }),
        lastUpdated: vehicleInfo.lastUpdated
    };
}

// Update vehicle odometer reading
async function updateOdometerReading(newReading) {
    const profile = await db.get('profile', 'profile');
    profile.odometer = parseInt(newReading);
    profile.updatedAt = new Date().toISOString();
    await db.put('profile', profile);
    await refreshReminders();
}

// Initialize reminder monitoring system
async function initReminderSystem() {
    const reminderPanel = document.getElementById('upcomingServices');
    const lastUpdatedSpan = document.createElement('div');
    lastUpdatedSpan.className = 'last-updated';
    reminderPanel.parentElement.insertBefore(lastUpdatedSpan, reminderPanel);

    // Create odometer update form
    const odometerForm = document.createElement('form');
    odometerForm.className = 'odometer-update-form';
    odometerForm.innerHTML = `
        <div class="form-group">
            <label>Update Current Odometer</label>
            <div class="input-group">
                <input type="number" id="newOdometer" required>
                <button type="submit" class="btn">Update</button>
            </div>
        </div>
    `;
    reminderPanel.parentElement.insertBefore(odometerForm, reminderPanel);

    // Handle odometer updates
    odometerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newReading = e.target.querySelector('#newOdometer').value;
        await updateOdometerReading(newReading);
        e.target.reset();
    });
}

// Refresh reminders display
async function refreshReminders() {
    const reminderPanel = document.getElementById('upcomingServices');
    const lastUpdatedSpan = reminderPanel.parentElement.querySelector('.last-updated');
    const { reminders, lastUpdated } = await getAllServiceReminders();

    // Update last updated timestamp
    lastUpdatedSpan.textContent = `Last odometer update: ${new Date(lastUpdated).toLocaleString()}`;

    // Update reminders display
    reminderPanel.innerHTML = reminders.length ? reminders.map(reminder => `
        <div class="reminder-item ${reminder.status}">
            <div class="reminder-content">
                <div class="reminder-title">
                    ${reminder.serviceName}
                    <span class="reminder-status ${reminder.status}">
                        ${reminder.status.toUpperCase()}
                    </span>
                </div>
                <div class="reminder-details">
                    ${reminder.type === 'date' ? 
                        `Due: ${new Date(reminder.dueDate).toLocaleDateString()}` :
                        `Due at: ${reminder.dueKm.toLocaleString()} km`}
                    <span class="reminder-remaining">
                        ${reminder.remaining < 0 ? 'Overdue by' : 'Remaining:'} 
                        ${reminder.displayRemaining}
                    </span>
                </div>
                <div class="reminder-meta">
                    Last service: ${new Date(reminder.originalDate).toLocaleDateString()} 
                    at ${reminder.originalOdometer.toLocaleString()} km
                    ${reminder.supplierName ? `(${reminder.supplierName})` : ''}
                </div>
            </div>
            <div class="reminder-actions">
                <button onclick="markServiceComplete(${reminder.id})" class="btn complete-btn">
                    Mark Complete
                </button>
            </div>
        </div>
    `).join('') : '<div class="no-reminders">No upcoming services</div>';
}

// Mark a service as complete
async function markServiceComplete(recordId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Complete Service</h3>
            <form id="completeServiceForm" class="form">
                <div class="form-group">
                    <label>Date Completed</label>
                    <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Odometer Reading</label>
                    <input type="number" name="odometer" required>
                </div>
                <div class="form-group">
                    <label>Set Next Service</label>
                    <select name="reminderType">
                        <option value="">No Reminder</option>
                        <option value="date">By Date</option>
                        <option value="odometer">By Odometer</option>
                    </select>
                </div>
                <div class="reminder-inputs" style="display: none;">
                    <div class="form-group date-input" style="display: none;">
                        <label>Next Service Date</label>
                        <input type="date" name="nextDate">
                    </div>
                    <div class="form-group odometer-input" style="display: none;">
                        <label>Next Service Odometer</label>
                        <input type="number" name="nextOdometer">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn">Complete Service</button>
                    <button type="button" class="btn" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle reminder type selection
    const reminderType = modal.querySelector('select[name="reminderType"]');
    const reminderInputs = modal.querySelector('.reminder-inputs');
    const dateInput = modal.querySelector('.date-input');
    const odometerInput = modal.querySelector('.odometer-input');

    reminderType.addEventListener('change', (e) => {
        reminderInputs.style.display = e.target.value ? 'block' : 'none';
        dateInput.style.display = e.target.value === 'date' ? 'block' : 'none';
        odometerInput.style.display = e.target.value === 'odometer' ? 'block' : 'none';
    });

    // Handle form submission
    const form = modal.querySelector('#completeServiceForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Update the record
        const record = await db.get('maintenance', recordId);
        const updatedRecord = {
            ...record,
            lastCompleted: {
                date: formData.get('date'),
                odometer: parseInt(formData.get('odometer'))
            }
        };

        // Set next service if specified
        const reminderType = formData.get('reminderType');
        if (reminderType) {
            updatedRecord.nextService = {
                type: reminderType,
                value: reminderType === 'date' ? 
                    formData.get('nextDate') :
                    parseInt(formData.get('nextOdometer'))
            };
        }

        await db.put('maintenance', updatedRecord);
        await updateOdometerReading(formData.get('odometer'));
        modal.remove();
    });
}

// Set up refresh interval
function startReminderMonitoring() {
    // Refresh every minute to update day-based countdowns
    setInterval(refreshReminders, 60000);
}

// Export functions
window.initReminderSystem = initReminderSystem;
window.refreshReminders = refreshReminders;
window.markServiceComplete = markServiceComplete;
window.startReminderMonitoring = startReminderMonitoring;
