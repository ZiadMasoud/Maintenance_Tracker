/* fuel-log.js - Fuel logging functionality */

// Get last used fuel price from settings
async function getLastFuelPrice() {
    const settings = await db.get('settings', 'fuelPrice');
    return settings ? settings.value : null;
}

// Save fuel price to settings
async function saveFuelPrice(price) {
    await db.put('settings', {
        id: 'fuelPrice',
        value: price
    });
}

// Add new fuel log entry
async function addFuelLog(data) {
    const entry = {
        date: data.date || new Date().toISOString(),
        odometer: parseInt(data.odometer),
        amount: parseFloat(data.amount),
        pricePerLiter: parseFloat(data.pricePerLiter),
        liters: parseFloat(data.amount) / parseFloat(data.pricePerLiter),
        createdAt: new Date().toISOString()
    };

    await db.add('fuel', entry);
    await saveFuelPrice(data.pricePerLiter);
    return entry;
}

// Update existing fuel log
async function updateFuelLog(id, data) {
    const entry = {
        id: parseInt(id),
        date: data.date,
        odometer: parseInt(data.odometer),
        amount: parseFloat(data.amount),
        pricePerLiter: parseFloat(data.pricePerLiter),
        liters: parseFloat(data.amount) / parseFloat(data.pricePerLiter)
    };

    await db.put('fuel', entry);
    await saveFuelPrice(data.pricePerLiter);
    return entry;
}

// Delete fuel log
async function deleteFuelLog(id) {
    await db.delete('fuel', parseInt(id));
}

// Get all fuel logs
async function getAllFuelLogs() {
    return await db.getAll('fuel');
}

// Calculate fuel consumption
async function calculateFuelConsumption() {
    const logs = await getAllFuelLogs();
    if (logs.length < 2) return null;

    // Sort by odometer reading
    logs.sort((a, b) => a.odometer - b.odometer);
    
    // Calculate total distance and fuel
    let totalDistance = logs[logs.length - 1].odometer - logs[0].odometer;
    let totalFuel = logs.reduce((sum, log) => sum + log.liters, 0);
    
    return {
        averageConsumption: totalFuel / (totalDistance / 100), // L/100km
        totalDistance,
        totalFuel,
        latestEntry: logs[logs.length - 1]
    };
}

// Initialize fuel logging interface
async function initFuelLog() {
    const fuelForm = document.getElementById('fuelForm');
    const amountInput = document.getElementById('fuelAmount');
    const priceInput = document.getElementById('fuelPrice');
    const odometerInput = document.getElementById('fuelOdometer');
    const litersDisplay = document.getElementById('calculatedLiters');
    const fuelList = document.getElementById('fuelList');

    // Pre-fill last used price
    const lastPrice = await getLastFuelPrice();
    if (lastPrice) priceInput.value = lastPrice;

    // Calculate liters on input
    function calculateLiters() {
        const amount = parseFloat(amountInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const liters = price ? (amount / price).toFixed(2) : 0;
        litersDisplay.textContent = `${liters} L`;
    }

    amountInput.addEventListener('input', calculateLiters);
    priceInput.addEventListener('input', calculateLiters);

    // Handle form submission
    fuelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            date: new Date().toISOString(),
            amount: amountInput.value,
            pricePerLiter: priceInput.value,
            odometer: odometerInput.value
        };

        await addFuelLog(data);
        refreshFuelList();
        fuelForm.reset();
        if (lastPrice) priceInput.value = lastPrice;
    });

    // Refresh fuel list display
    async function refreshFuelList() {
        const logs = await getAllFuelLogs();
        const stats = await calculateFuelConsumption();
        
        // Update dashboard stats if available
        if (stats) {
            const dashboardStats = document.getElementById('fuelStats');
            if (dashboardStats) {
                dashboardStats.innerHTML = `
                    <h4>Fuel Statistics</h4>
                    <p>Average Consumption: ${stats.averageConsumption.toFixed(2)} L/100km</p>
                    <p>Total Distance: ${stats.totalDistance} km</p>
                    <p>Total Fuel: ${stats.totalFuel.toFixed(2)} L</p>
                `;
            }
        }

        // Update fuel list
        fuelList.innerHTML = logs.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        ).map(log => `
            <div class="list-item" data-id="${log.id}">
                <div class="list-item-content">
                    <div class="list-item-title">
                        ${new Date(log.date).toLocaleDateString()} - ${log.odometer}km
                    </div>
                    <div class="list-item-subtitle">
                        Amount: $${log.amount} | Price: $${log.pricePerLiter}/L | 
                        Liters: ${log.liters.toFixed(2)}L
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn" onclick="editFuelLog(${log.id})">Edit</button>
                    <button class="btn red" onclick="deleteFuelLog(${log.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Initial list refresh
    refreshFuelList();
}

// Edit fuel log entry
async function editFuelLog(id) {
    const entry = await db.get('fuel', id);
    if (!entry) return;

    // Create edit form
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label>Date</label>
            <input type="datetime-local" name="date" value="${entry.date.slice(0, 16)}" required>
        </div>
        <div class="form-group">
            <label>Amount ($)</label>
            <input type="number" name="amount" value="${entry.amount}" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Price per Liter ($)</label>
            <input type="number" name="pricePerLiter" value="${entry.pricePerLiter}" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Odometer (km)</label>
            <input type="number" name="odometer" value="${entry.odometer}" required>
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
            <h3>Edit Fuel Log</h3>
            ${form.outerHTML}
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await updateFuelLog(id, {
            date: formData.get('date'),
            amount: formData.get('amount'),
            pricePerLiter: formData.get('pricePerLiter'),
            odometer: formData.get('odometer')
        });
        modal.remove();
        initFuelLog(); // Refresh the list
    });
}

// Export functions
window.addFuelLog = addFuelLog;
window.editFuelLog = editFuelLog;
window.deleteFuelLog = deleteFuelLog;
window.initFuelLog = initFuelLog;
