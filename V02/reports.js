/* reports.js - Reports management system */

// Date formatting helper
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Currency formatting helper
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Filter data by date range
function filterByDateRange(data, startDate, endDate) {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
        const itemDate = new Date(item.date);
        if (startDate && endDate) {
            return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
        } else if (startDate) {
            return itemDate >= new Date(startDate);
        } else {
            return itemDate <= new Date(endDate);
        }
    });
}

// Initialize reports interface
async function initReports() {
    // Get initial data
    await refreshReports();

    // Set up filter listeners
    const filterForms = document.querySelectorAll('.report-filters');
    filterForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            refreshReports();
        });

        // Add reset functionality
        const resetBtn = form.querySelector('.reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                form.reset();
                refreshReports();
            });
        }
    });
}

// Refresh all reports
async function refreshReports() {
    await Promise.all([
        refreshSavingsReport(),
        refreshFuelReport(),
        refreshMaintenanceReport()
    ]);
}

// Refresh savings report
async function refreshSavingsReport() {
    const container = document.getElementById('savingsReport');
    const filters = container.querySelector('.report-filters');
    const startDate = filters.querySelector('[name="startDate"]').value;
    const endDate = filters.querySelector('[name="endDate"]').value;

    // Get and filter data
    let savings = await db.getAll('carSavings');
    savings = filterByDateRange(savings, startDate, endDate);

    // Calculate totals
    const total = savings.reduce((sum, entry) => sum + entry.amount, 0);

    // Render table
    const table = container.querySelector('.report-table');
    table.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${savings.sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(entry => `
                        <tr>
                            <td>${formatDate(entry.date)}</td>
                            <td>${entry.description}</td>
                            <td class="amount">${formatCurrency(entry.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2"><strong>Total</strong></td>
                        <td class="amount"><strong>${formatCurrency(total)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    // Update summary
    container.querySelector('.report-summary').innerHTML = `
        <div class="summary-item">
            <label>Total Savings</label>
            <span>${formatCurrency(total)}</span>
        </div>
        <div class="summary-item">
            <label>Number of Entries</label>
            <span>${savings.length}</span>
        </div>
    `;
}

// Refresh fuel report
async function refreshFuelReport() {
    const container = document.getElementById('fuelReport');
    const filters = container.querySelector('.report-filters');
    const startDate = filters.querySelector('[name="startDate"]').value;
    const endDate = filters.querySelector('[name="endDate"]').value;
    const minPrice = filters.querySelector('[name="minPrice"]').value;
    const maxPrice = filters.querySelector('[name="maxPrice"]').value;

    // Get and filter data
    let fuelLogs = await db.getAll('fuel');
    fuelLogs = filterByDateRange(fuelLogs, startDate, endDate);

    // Apply price filters
    if (minPrice) {
        fuelLogs = fuelLogs.filter(log => log.pricePerLiter >= parseFloat(minPrice));
    }
    if (maxPrice) {
        fuelLogs = fuelLogs.filter(log => log.pricePerLiter <= parseFloat(maxPrice));
    }

    // Calculate totals
    const totalCost = fuelLogs.reduce((sum, log) => sum + log.amount, 0);
    const totalLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);
    const averagePrice = totalLiters ? totalCost / totalLiters : 0;

    // Calculate consumption if possible
    let consumption = null;
    if (fuelLogs.length >= 2) {
        const sortedLogs = [...fuelLogs].sort((a, b) => a.odometer - b.odometer);
        const distance = sortedLogs[sortedLogs.length - 1].odometer - sortedLogs[0].odometer;
        consumption = (totalLiters / distance) * 100; // L/100km
    }

    // Render table
    const table = container.querySelector('.report-table');
    table.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Odometer</th>
                        <th class="amount">Amount</th>
                        <th class="amount">Price/L</th>
                        <th class="amount">Liters</th>
                    </tr>
                </thead>
                <tbody>
                    ${fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(log => `
                        <tr>
                            <td>${formatDate(log.date)}</td>
                            <td>${log.odometer.toLocaleString()} km</td>
                            <td class="amount">${formatCurrency(log.amount)}</td>
                            <td class="amount">${formatCurrency(log.pricePerLiter)}</td>
                            <td class="amount">${log.liters.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2"><strong>Totals</strong></td>
                        <td class="amount"><strong>${formatCurrency(totalCost)}</strong></td>
                        <td class="amount"><strong>Avg: ${formatCurrency(averagePrice)}</strong></td>
                        <td class="amount"><strong>${totalLiters.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    // Update summary
    container.querySelector('.report-summary').innerHTML = `
        <div class="summary-item">
            <label>Total Cost</label>
            <span>${formatCurrency(totalCost)}</span>
        </div>
        <div class="summary-item">
            <label>Total Fuel</label>
            <span>${totalLiters.toFixed(2)} L</span>
        </div>
        <div class="summary-item">
            <label>Average Price</label>
            <span>${formatCurrency(averagePrice)}/L</span>
        </div>
        ${consumption ? `
        <div class="summary-item">
            <label>Average Consumption</label>
            <span>${consumption.toFixed(2)} L/100km</span>
        </div>
        ` : ''}
    `;
}

// Refresh maintenance report
async function refreshMaintenanceReport() {
    const container = document.getElementById('maintenanceReport');
    const filters = container.querySelector('.report-filters');
    const startDate = filters.querySelector('[name="startDate"]').value;
    const endDate = filters.querySelector('[name="endDate"]').value;
    const supplier = filters.querySelector('[name="supplier"]').value.toLowerCase();
    const serviceType = filters.querySelector('[name="serviceType"]').value.toLowerCase();

    // Get and filter data
    let records = await db.getAll('maintenance');
    records = filterByDateRange(records, startDate, endDate);

    // Apply supplier and service type filters
    if (supplier) {
        records = records.filter(record => 
            record.supplier.name.toLowerCase().includes(supplier)
        );
    }
    if (serviceType) {
        records = records.filter(record =>
            record.services.some(service => 
                service.name.toLowerCase().includes(serviceType)
            )
        );
    }

    // Calculate totals
    const totalCost = records.reduce((sum, record) => sum + record.totalCost, 0);

    // Render table
    const table = container.querySelector('.report-table');
    table.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Odometer</th>
                        <th>Supplier</th>
                        <th>Services</th>
                        <th class="amount">Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(record => `
                        <tr>
                            <td>${formatDate(record.date)}</td>
                            <td>${record.odometer.toLocaleString()} km</td>
                            <td>${record.supplier.name}</td>
                            <td>
                                <ul class="services-list">
                                    ${record.services.map(service => `
                                        <li>
                                            ${service.name} - ${formatCurrency(service.cost)}
                                            ${service.notes ? `<small>(${service.notes})</small>` : ''}
                                        </li>
                                    `).join('')}
                                </ul>
                            </td>
                            <td class="amount">${formatCurrency(record.totalCost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4"><strong>Total</strong></td>
                        <td class="amount"><strong>${formatCurrency(totalCost)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    // Update summary
    container.querySelector('.report-summary').innerHTML = `
        <div class="summary-item">
            <label>Total Cost</label>
            <span>${formatCurrency(totalCost)}</span>
        </div>
        <div class="summary-item">
            <label>Number of Visits</label>
            <span>${records.length}</span>
        </div>
        <div class="summary-item">
            <label>Total Services</label>
            <span>${records.reduce((sum, record) => sum + record.services.length, 0)}</span>
        </div>
        <div class="summary-item">
            <label>Unique Suppliers</label>
            <span>${new Set(records.map(r => r.supplier.name)).size}</span>
        </div>
    `;
}

// Export functions
window.initReports = initReports;
window.refreshReports = refreshReports;
