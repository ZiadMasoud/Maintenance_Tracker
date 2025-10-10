/* dashboard.js - Dashboard overview functionality */

// Get total car savings
async function getTotalSavings() {
    const savings = await db.getAll('carSavings');
    return savings.reduce((total, entry) => total + entry.amount, 0);
}

// Get average fuel consumption
async function getAverageFuelConsumption() {
    const logs = await db.getAll('fuel');
    if (logs.length < 2) return { averageConsumption: 0, totalCost: 0 };

    // Sort by odometer reading
    logs.sort((a, b) => a.odometer - b.odometer);
    
    const totalDistance = logs[logs.length - 1].odometer - logs[0].odometer;
    const totalFuel = logs.reduce((sum, log) => sum + log.liters, 0);
    const totalCost = logs.reduce((sum, log) => sum + log.amount, 0);
    
    return {
        averageConsumption: totalFuel / (totalDistance / 100), // L/100km
        totalCost
    };
}

// Get total maintenance cost
async function getTotalMaintenanceCost() {
    const records = await db.getAll('maintenance');
    return records.reduce((total, record) => total + record.totalCost, 0);
}

// Get recent activity (last 5 entries from all categories)
async function getRecentActivity() {
    const activities = [];

    // Get car savings entries
    const savings = await db.getAll('carSavings');
    savings.forEach(entry => {
        activities.push({
            type: 'savings',
            date: entry.date,
            description: `Saved $${entry.amount.toFixed(2)}`,
            amount: entry.amount
        });
    });

    // Get maintenance entries
    const maintenance = await db.getAll('maintenance');
    maintenance.forEach(entry => {
        activities.push({
            type: 'maintenance',
            date: entry.date,
            description: `Maintenance visit: ${entry.services.map(s => s.name).join(', ')}`,
            amount: entry.totalCost
        });
    });

    // Get fuel entries
    const fuel = await db.getAll('fuel');
    fuel.forEach(entry => {
        activities.push({
            type: 'fuel',
            date: entry.date,
            description: `Fuel: ${entry.liters.toFixed(1)}L at $${entry.pricePerLiter}/L`,
            amount: entry.amount
        });
    });

    // Sort by date and get last 5
    return activities
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
}

// Get monthly expense data for chart
async function getMonthlyExpenses() {
    const activities = [];
    
    // Get all entries with costs
    const maintenance = await db.getAll('maintenance');
    maintenance.forEach(entry => {
        activities.push({
            date: new Date(entry.date),
            amount: entry.totalCost
        });
    });

    const fuel = await db.getAll('fuel');
    fuel.forEach(entry => {
        activities.push({
            date: new Date(entry.date),
            amount: entry.amount
        });
    });

    // Group by month
    const monthlyData = activities.reduce((acc, entry) => {
        const monthKey = entry.date.toISOString().slice(0, 7); // YYYY-MM format
        acc[monthKey] = (acc[monthKey] || 0) + entry.amount;
        return acc;
    }, {});

    // Get last 6 months
    const months = Object.keys(monthlyData).sort().slice(-6);
    
    return {
        labels: months.map(m => {
            const [year, month] = m.split('-');
            return new Date(year, month - 1).toLocaleString('default', { month: 'short' });
        }),
        data: months.map(m => monthlyData[m])
    };
}

// Initialize dashboard
async function initDashboard() {
    // Update summary cards
    const dashCards = document.getElementById('dashCards');
    
    // Get all data
    const totalSavings = await getTotalSavings();
    const fuelStats = await getAverageFuelConsumption();
    const totalMaintenance = await getTotalMaintenanceCost();

    // Update cards
    dashCards.innerHTML = `
        <div class="dash-card savings">
            <h3>Car Savings</h3>
            <div class="amount">$${totalSavings.toFixed(2)}</div>
        </div>
        <div class="dash-card fuel">
            <h3>Fuel Efficiency</h3>
            <div class="amount">${fuelStats.averageConsumption.toFixed(1)} L/100km</div>
            <div class="subtitle">Total spent: $${fuelStats.totalCost.toFixed(2)}</div>
        </div>
        <div class="dash-card maintenance">
            <h3>Maintenance Cost</h3>
            <div class="amount">$${totalMaintenance.toFixed(2)}</div>
        </div>
    `;

    // Update recent activity
    const recentList = document.getElementById('recentList');
    const activities = await getRecentActivity();
    
    recentList.innerHTML = activities.map(activity => `
        <div class="list-item ${activity.type}">
            <div class="list-item-content">
                <div class="list-item-title">
                    ${new Date(activity.date).toLocaleDateString()}
                </div>
                <div class="list-item-subtitle">
                    ${activity.description}
                </div>
            </div>
            <div class="list-item-amount">
                $${activity.amount.toFixed(2)}
            </div>
        </div>
    `).join('');

    // Update expenses chart
    const expenseData = await getMonthlyExpenses();
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: expenseData.labels,
            datasets: [{
                label: 'Monthly Expenses',
                data: expenseData.data,
                backgroundColor: '#0b6fb2',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + value
                    }
                }
            }
        }
    });
}

// Export functions
window.initDashboard = initDashboard;
