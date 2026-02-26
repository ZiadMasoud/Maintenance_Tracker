// ================================
// FUEL ANALYTICS SYSTEM
// Complete fuel tracking and analytics module
// ================================

/**
 * Fuel Data Architecture:
 * 
 * FuelRecord: {
 *   id: string (unique)
 *   sessionId: string (links to FuelSession)
 *   date: string (ISO date)
 *   odometer: number (km)
 *   liters: number
 *   pricePerLiter: number
 *   totalCost: number (calculated)
 *   isFullTank: boolean
 *   notes: string (optional)
 *   createdAt: timestamp
 * }
 * 
 * FuelSession: {
 *   id: string (unique)
 *   vehicleId: string
 *   records: FuelRecord[] (sorted by odometer)
 *   createdAt: timestamp
 *   updatedAt: timestamp
 * }
 * 
 * FuelAnalytics: {
 *   totalFuelConsumed: number
 *   totalFuelCost: number
 *   totalDistance: number
 *   avgConsumption: number (L/100km)
 *   costPerKm: number
 *   lastRefill: FuelRecord
 *   consumptionTrend: Array<{date, consumption}>
 * }
 */

// ================================
// FUEL STATE MANAGER (Reactive)
// ================================
class FuelStateManager {
  constructor() {
    this.state = {
      currentSession: null,
      records: [],
      analytics: null,
      isLoading: false,
      error: null
    };
    this.listeners = new Set();
    this.analyticsEngine = new FuelAnalyticsEngine();
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get current state (immutable copy)
  getState() {
    return { ...this.state };
  }

  // Set loading state
  setLoading(isLoading) {
    this.state = { ...this.state, isLoading };
    this.notify();
  }

  // Set error state
  setError(error) {
    this.state = { ...this.state, error, isLoading: false };
    this.notify();
  }

  // Load session and records from DB
  async loadSession(sessionId = 'default') {
    this.setLoading(true);
    try {
      const session = await FuelDataManager.getSession(sessionId);
      const records = session ? session.records : [];
      const analytics = this.analyticsEngine.computeAnalytics(records);
      
      this.state = {
        ...this.state,
        currentSession: session,
        records: [...records],
        analytics,
        isLoading: false,
        error: null
      };
      this.notify();
      return this.state;
    } catch (error) {
      this.setError(error.message);
      throw error;
    }
  }

  // Add new fuel record
  async addRecord(recordData) {
    this.setLoading(true);
    try {
      // Validate record
      const validation = FuelValidator.validateRecord(recordData, this.state.records);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create record with calculated fields
      const newRecord = FuelDataManager.createRecord(recordData);
      
      // Save to database
      await FuelDataManager.saveRecord(newRecord);
      
      // Update main dashboard ODO if new odometer is higher
      const currentOdo = parseInt(localStorage.getItem('currentOdometer')) || 0;
      if (newRecord.odometer > currentOdo) {
        localStorage.setItem('currentOdometer', newRecord.odometer.toString());
        const odometerValue = document.getElementById('odometerValue');
        if (odometerValue) {
          odometerValue.textContent = newRecord.odometer.toLocaleString();
        }
      }
      
      // Reload session to get updated records
      await this.loadSession('default');
      
      // Update main dashboard KPIs
      updateFuelKPIsOnDashboard();
      
      // Update total spent
      if (typeof renderTotalCost === 'function') {
        renderTotalCost();
      }
      
      return newRecord;
    } catch (error) {
      this.setError(error.message);
      throw error;
    }
  }

  // Delete a record
  async deleteRecord(recordId) {
    this.setLoading(true);
    try {
      await FuelDataManager.deleteRecord(recordId);
      await this.loadSession('default');
      
      // Update main dashboard KPIs
      updateFuelKPIsOnDashboard();
      
      // Update total spent
      if (typeof renderTotalCost === 'function') {
        renderTotalCost();
      }
    } catch (error) {
      this.setError(error.message);
      throw error;
    }
  }

  // Edit a record
  async editRecord(recordId, updates) {
    this.setLoading(true);
    try {
      const otherRecords = this.state.records.filter(r => r.id !== recordId);
      const validation = FuelValidator.validateRecord(updates, otherRecords);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      await FuelDataManager.updateRecord(recordId, updates);
      await this.loadSession('default');
      
      // Update main dashboard KPIs
      updateFuelKPIsOnDashboard();
      
      // Update total spent
      if (typeof renderTotalCost === 'function') {
        renderTotalCost();
      }
    } catch (error) {
      this.setError(error.message);
      throw error;
    }
  }

  // Get analytics (computed on demand)
  getAnalytics() {
    return this.analyticsEngine.computeAnalytics(this.state.records);
  }
}

// ================================
// FUEL DATA MANAGER (IndexedDB)
// ================================
class FuelDataManager {
  static DB_NAME = 'carMaintainDB';
  static DB_VERSION = 5; // Incremented to match main DB version with finance store
  static STORE_FUEL = 'fuelRecords';
  static STORE_FUEL_SESSIONS = 'fuelSessions';

  // Initialize fuel stores in IndexedDB
  static async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create fuel records store
        if (!db.objectStoreNames.contains(this.STORE_FUEL)) {
          const fuelStore = db.createObjectStore(this.STORE_FUEL, { keyPath: 'id' });
          fuelStore.createIndex('sessionId', 'sessionId', { unique: false });
          fuelStore.createIndex('date', 'date', { unique: false });
          fuelStore.createIndex('odometer', 'odometer', { unique: false });
        }

        // Create fuel sessions store
        if (!db.objectStoreNames.contains(this.STORE_FUEL_SESSIONS)) {
          const sessionStore = db.createObjectStore(this.STORE_FUEL_SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('vehicleId', 'vehicleId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get database connection
  static async getDB() {
    if (!this._db) {
      this._db = await this.initDatabase();
    }
    return this._db;
  }

  // Generate unique ID
  static generateId() {
    return `fuel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new fuel record object
  static createRecord(data) {
    const id = this.generateId();
    const sessionId = data.sessionId || 'default';
    
    // Use the fixed price per liter from settings
    const pricePerLiter = parseFloat(data.pricePerLiter) || parseFloat(localStorage.getItem('fuelPricePerLiter')) || 0;
    const liters = parseFloat(data.liters) || 0;
    const totalCost = parseFloat(data.totalCost) || (liters * pricePerLiter);
    
    return {
      id,
      sessionId,
      date: data.date,
      odometer: parseFloat(data.odometer),
      liters: parseFloat(liters.toFixed(2)),
      pricePerLiter: parseFloat(pricePerLiter.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      isFullTank: data.isFullTank || false,
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
  }

  // Save record to database
  static async saveRecord(record) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL], 'readwrite');
      const store = transaction.objectStore(this.STORE_FUEL);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all records for a session
  static async getRecordsBySession(sessionId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL], 'readonly');
      const store = transaction.objectStore(this.STORE_FUEL);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const records = request.result;
        // Sort by odometer (chronological order)
        records.sort((a, b) => a.odometer - b.odometer);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get a single record
  static async getRecord(recordId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL], 'readonly');
      const store = transaction.objectStore(this.STORE_FUEL);
      const request = store.get(recordId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Update a record
  static async updateRecord(recordId, updates) {
    const db = await this.getDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL], 'readwrite');
      const store = transaction.objectStore(this.STORE_FUEL);
      
      const getRequest = store.get(recordId);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Record not found'));
          return;
        }

        // Recalculate total cost if liters or price changed
        let totalCost = existing.totalCost;
        if (updates.liters !== undefined || updates.pricePerLiter !== undefined) {
          const liters = updates.liters !== undefined ? updates.liters : existing.liters;
          const price = updates.pricePerLiter !== undefined ? updates.pricePerLiter : existing.pricePerLiter;
          totalCost = parseFloat((liters * price).toFixed(2));
        }

        const updated = {
          ...existing,
          ...updates,
          totalCost,
          updatedAt: new Date().toISOString()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete a record
  static async deleteRecord(recordId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL], 'readwrite');
      const store = transaction.objectStore(this.STORE_FUEL);
      const request = store.delete(recordId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get or create session
  static async getSession(sessionId = 'default') {
    const db = await this.getDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL_SESSIONS], 'readonly');
      const store = transaction.objectStore(this.STORE_FUEL_SESSIONS);
      const request = store.get(sessionId);

      request.onsuccess = async () => {
        if (request.result) {
          // Get associated records
          const records = await this.getRecordsBySession(sessionId);
          resolve({
            ...request.result,
            records
          });
        } else {
          // Create default session
          const newSession = {
            id: sessionId,
            vehicleId: 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            records: []
          };
          await this.saveSession(newSession);
          resolve(newSession);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save session
  static async saveSession(session) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_FUEL_SESSIONS], 'readwrite');
      const store = transaction.objectStore(this.STORE_FUEL_SESSIONS);
      const updated = {
        ...session,
        updatedAt: new Date().toISOString()
      };
      const request = store.put(updated);

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }
}

// ================================
// FUEL VALIDATOR
// ================================
class FuelValidator {
  static validateRecord(data, existingRecords = []) {
    const errors = [];

    // Required fields
    if (!data.date) errors.push('Date is required');
    if (data.odometer === undefined || data.odometer === '') errors.push('Odometer reading is required');
    if (data.liters === undefined || data.liters === '') errors.push('Liters is required');

    // Numeric validation
    const odometer = parseFloat(data.odometer);
    const liters = parseFloat(data.liters);

    if (isNaN(odometer) || odometer < 0) errors.push('Odometer must be a positive number');
    if (isNaN(liters) || liters <= 0) errors.push('Liters must be greater than 0');

    // Odometer sequence validation
    if (existingRecords.length > 0 && !isNaN(odometer)) {
      const maxOdometer = Math.max(...existingRecords.map(r => r.odometer));
      if (odometer <= maxOdometer) {
        errors.push(`Odometer must be greater than previous reading (${maxOdometer} km)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ================================
// FUEL ANALYTICS ENGINE
// ================================
class FuelAnalyticsEngine {
  // Compute all analytics from raw records
  computeAnalytics(records) {
    // Return null analytics if no records
    if (!records || records.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Sort records by odometer to ensure correct order
    const sortedRecords = [...records].sort((a, b) => a.odometer - b.odometer);

    // Basic totals
    const totalFuelConsumed = this.computeTotalFuel(sortedRecords);
    const totalFuelCost = this.computeTotalCost(sortedRecords);
    const totalDistance = this.computeTotalDistance(sortedRecords);

    // Derived metrics
    const avgConsumption = this.computeAverageConsumption(sortedRecords);
    const costPerKm = totalDistance > 0 ? totalFuelCost / totalDistance : 0;

    // Last refill info
    const lastRefill = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;

    // Consumption trend (for charts)
    const consumptionTrend = this.computeConsumptionTrend(sortedRecords);

    // Efficiency metrics
    const efficiencyMetrics = this.computeEfficiencyMetrics(sortedRecords);

    return {
      totalFuelConsumed: this.round(totalFuelConsumed, 2),
      totalFuelCost: this.round(totalFuelCost, 2),
      totalDistance: this.round(totalDistance, 1),
      avgConsumption: this.round(avgConsumption, 2),
      costPerKm: this.round(costPerKm, 3),
      lastRefill,
      consumptionTrend,
      efficiencyMetrics,
      recordCount: sortedRecords.length
    };
  }

  getEmptyAnalytics() {
    return {
      totalFuelConsumed: 0,
      totalFuelCost: 0,
      totalDistance: 0,
      avgConsumption: 0,
      costPerKm: 0,
      lastRefill: null,
      consumptionTrend: [],
      efficiencyMetrics: null,
      recordCount: 0
    };
  }

  computeTotalFuel(records) {
    return records.reduce((sum, record) => sum + parseFloat(record.liters || 0), 0);
  }

  computeTotalCost(records) {
    return records.reduce((sum, record) => sum + parseFloat(record.totalCost || 0), 0);
  }

  computeTotalDistance(records) {
    if (records.length < 2) return 0;
    const firstOdometer = parseFloat(records[0].odometer);
    const lastOdometer = parseFloat(records[records.length - 1].odometer);
    return lastOdometer - firstOdometer;
  }

  // Compute average consumption in L/100km
  computeAverageConsumption(records) {
    if (records.length < 2) return 0;

    // Only use full tank refills for accurate consumption calculation
    const fullTankRecords = records.filter(r => r.isFullTank);
    
    if (fullTankRecords.length >= 2) {
      // Use full tank method for most accurate calculation
      return this.computeFullTankConsumption(fullTankRecords);
    }

    // Fallback: use all records with distance-weighted average
    let totalLiters = 0;
    let totalDistance = 0;

    for (let i = 1; i < records.length; i++) {
      const current = records[i];
      const previous = records[i - 1];
      const currentOdo = parseFloat(current.odometer);
      const prevOdo = parseFloat(previous.odometer);
      const currentLiters = parseFloat(current.liters);
      const distance = currentOdo - prevOdo;
      
      if (distance > 0 && currentLiters > 0) {
        totalLiters += currentLiters;
        totalDistance += distance;
      }
    }

    if (totalDistance === 0) return 0;
    return (totalLiters / totalDistance) * 100;
  }

  // Most accurate consumption calculation using full tank refills
  computeFullTankConsumption(fullTankRecords) {
    let totalConsumption = 0;
    let validIntervals = 0;

    for (let i = 1; i < fullTankRecords.length; i++) {
      const current = fullTankRecords[i];
      const previous = fullTankRecords[i - 1];
      
      const currentOdo = parseFloat(current.odometer);
      const prevOdo = parseFloat(previous.odometer);
      const liters = parseFloat(current.liters);
      const distance = currentOdo - prevOdo;

      if (distance > 0 && liters > 0) {
        const consumption = (liters / distance) * 100;
        totalConsumption += consumption;
        validIntervals++;
      }
    }

    return validIntervals > 0 ? totalConsumption / validIntervals : 0;
  }

  // Compute consumption trend for charts
  computeConsumptionTrend(records) {
    if (records.length < 2) return [];

    const trend = [];

    for (let i = 1; i < records.length; i++) {
      const current = records[i];
      const previous = records[i - 1];
      
      // Ensure values are numbers
      const currentOdo = parseFloat(current.odometer);
      const prevOdo = parseFloat(previous.odometer);
      const currentLiters = parseFloat(current.liters);
      
      const distance = currentOdo - prevOdo;
      
      if (distance > 0 && currentLiters > 0) {
        const consumption = (currentLiters / distance) * 100;
        trend.push({
          date: current.date,
          odometer: currentOdo,
          consumption: this.round(consumption, 2),
          liters: currentLiters,
          distance
        });
      }
    }

    return trend;
  }

  // Compute additional efficiency metrics
  computeEfficiencyMetrics(records) {
    if (records.length < 2) return null;

    const trend = this.computeConsumptionTrend(records);
    if (trend.length === 0) return null;

    const consumptions = trend.map(t => t.consumption);
    
    return {
      minConsumption: this.round(Math.min(...consumptions), 2),
      maxConsumption: this.round(Math.max(...consumptions), 2),
      avgConsumption: this.round(consumptions.reduce((a, b) => a + b, 0) / consumptions.length, 2),
      trendDirection: this.computeTrendDirection(consumptions),
      bestEfficiency: this.round(100 / Math.max(...consumptions), 2), // km per liter
      worstEfficiency: this.round(100 / Math.min(...consumptions), 2)
    };
  }

  computeTrendDirection(values) {
    if (values.length < 3) return 'insufficient_data';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05; // 5% threshold
    
    if (diff < -threshold) return 'improving';
    if (diff > threshold) return 'worsening';
    return 'stable';
  }

  round(value, decimals) {
    if (isNaN(value) || !isFinite(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

// ================================
// FUEL UI RENDERER
// ================================
class FuelUIRenderer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.charts = {};
    
    // Subscribe to state changes
    this.unsubscribe = stateManager.subscribe((state) => {
      this.render(state);
    });
  }

  // Main render method
  render(state) {
    this.renderAnalyticsKPIs(state.analytics);
    this.renderFuelHistory(state.records);
    this.renderCharts(state.analytics);
    this.renderLastRefill(state.analytics?.lastRefill);
  }

  // Render analytics KPI cards
  renderAnalyticsKPIs(analytics) {
    if (!analytics) analytics = this.stateManager.getAnalytics();

    // Update KPI elements
    this.updateElement('avgConsumption', analytics.avgConsumption > 0 
      ? `${analytics.avgConsumption}` 
      : '--');
    
    this.updateElement('costPerKm', analytics.costPerKm > 0 
      ? `${analytics.costPerKm}` 
      : '--');
    
    this.updateElement('totalFuel', analytics.totalFuelConsumed > 0 
      ? `${analytics.totalFuelConsumed}` 
      : '--');
    
    this.updateElement('totalDistance', analytics.totalDistance > 0 
      ? `${analytics.totalDistance}` 
      : '--');

    // Update main dashboard KPI
    this.updateElement('kpiAvgFuelValue', analytics.avgConsumption > 0 
      ? `${analytics.avgConsumption}` 
      : '—');
    
    const kpiAvgFuelSub = document.getElementById('kpiAvgFuelSub');
    if (kpiAvgFuelSub) {
      kpiAvgFuelSub.textContent = 'L/100km';
    }
    
    // Update fuel efficiency indicators
    if (analytics.avgConsumption > 0) {
      if (typeof updateFuelEfficiencyIndicator === 'function') {
        updateFuelEfficiencyIndicator(analytics.avgConsumption, 'homeFuelEfficiencyIndicator');
        updateFuelEfficiencyIndicator(analytics.avgConsumption, 'analyticsFuelEfficiencyIndicator');
      }
    }
  }

  // Render fuel entry history table with pagination
  renderFuelHistory(records) {
    // Use the pagination function from script.js if available
    if (typeof renderFuelHistoryPaginated === 'function') {
      renderFuelHistoryPaginated(records);
      return;
    }
    
    // Fallback: render without pagination
    const container = document.getElementById('fuelHistoryList');
    if (!container) return;

    if (!records || records.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-gas-pump"></i></div>
          <p>No fuel entries yet</p>
          <span>Record your first fuel refill to see analytics</span>
        </div>
      `;
      return;
    }

    // Sort by date descending (newest first)
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.map(record => `
      <div class="fuel-history-item" data-record-id="${record.id}">
        <div class="fuel-history-header">
          <div class="fuel-history-header-main">
            <span class="date">${this.formatDate(record.date)}</span>
            ${record.isFullTank ? '<span class="full-tank-badge">Full Tank</span>' : ''}
          </div>
          <button class="edit-btn" onclick="fuelApp.editRecord('${record.id}')"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" onclick="fuelApp.deleteRecord('${record.id}')"><i class="fas fa-trash"></i></button>
        </div>
        <div class="fuel-history-details">
          <span class="odometer">${parseFloat(record.odometer).toLocaleString()} km</span>
          <span class="liters">${parseFloat(record.liters).toFixed(2)} L</span>
          <span class="price">${parseFloat(record.pricePerLiter).toFixed(2)} EGP/L</span>
        </div>
        <div class="fuel-history-cost">
          <span class="total">${parseFloat(record.totalCost).toLocaleString()} EGP</span>
        </div>
      </div>
    `).join('');
  }

  // Render charts
  renderCharts(analytics) {
    this.renderConsumptionChart(analytics?.consumptionTrend);
    this.renderEfficiencyChart(analytics?.consumptionTrend);
  }

  renderConsumptionChart(trend) {
    const canvas = document.getElementById('fuelChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;

    // Destroy existing chart
    if (this.charts.consumption) {
      this.charts.consumption.destroy();
    }

    if (!trend || trend.length === 0) {
      this.showEmptyChart(canvas, 'No consumption data available');
      return;
    }

    // Hide empty message and show canvas
    const emptyMsg = parent.querySelector('.chart-empty-message');
    if (emptyMsg) emptyMsg.style.display = 'none';
    canvas.style.display = 'block';

    this.charts.consumption = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map(t => this.formatShortDate(t.date)),
        datasets: [{
          label: 'Consumption (L/100km)',
          data: trend.map(t => t.consumption),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} L/100km`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'L/100km'
            }
          }
        }
      }
    });
  }

  renderEfficiencyChart(trend) {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;

    if (this.charts.efficiency) {
      this.charts.efficiency.destroy();
    }

    if (!trend || trend.length === 0) {
      this.showEmptyChart(canvas, 'No efficiency data available');
      return;
    }

    // Hide empty message and show canvas
    const emptyMsg = parent.querySelector('.chart-empty-message');
    if (emptyMsg) emptyMsg.style.display = 'none';
    canvas.style.display = 'block';

    // Calculate km per liter (inverse of L/100km * 100)
    const efficiencyData = trend.map(t => (100 / t.consumption).toFixed(2));

    this.charts.efficiency = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => this.formatShortDate(t.date)),
        datasets: [{
          label: 'Efficiency (km/L)',
          data: efficiencyData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} km/L`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'km/L'
            }
          }
        }
      }
    });
  }

  showEmptyChart(canvas, message) {
    const parent = canvas.parentElement;
    let emptyMsg = parent.querySelector('.chart-empty-message');
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chart-empty-message';
      parent.appendChild(emptyMsg);
    }
    emptyMsg.textContent = message;
    emptyMsg.style.display = 'flex';
    canvas.style.display = 'none';
  }

  renderLastRefill(lastRefill) {
    const container = document.getElementById('lastRefillInfo');
    if (!container) return;

    if (!lastRefill) {
      container.innerHTML = '<p class="empty-text">No refill recorded</p>';
      return;
    }

    container.innerHTML = `
      <div class="last-refill-card">
        <div class="refill-date">${this.formatDate(lastRefill.date)}</div>
        <div class="refill-details">
          <span>${lastRefill.liters} L</span>
          <span>@ ${lastRefill.odometer.toLocaleString()} km</span>
        </div>
        <div class="refill-cost">${lastRefill.totalCost.toLocaleString()} EGP</div>
      </div>
    `;
  }

  // Utility methods
  updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatShortDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  }
}

// ================================
// FUEL ENTRY FORM HANDLER
// ================================
class FuelEntryForm {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.form = document.getElementById('fuelEntryForm');
    this.inputs = {
      date: document.getElementById('fuelDate'),
      odometer: document.getElementById('fuelOdometer'),
      liters: document.getElementById('fuelLiters'),
      totalCost: document.getElementById('fuelTotalCost'),
      isFullTank: document.getElementById('fuelFullTank'),
      notes: document.getElementById('fuelNotes')
    };
    this.errorContainer = document.getElementById('fuelFormErrors');
    this.submitBtn = document.getElementById('saveFuelBtn');

    this.init();
  }

  init() {
    if (!this.form) return;

    // Set default date to today
    if (this.inputs.date) {
      this.inputs.date.valueAsDate = new Date();
    }

    // Set default odometer to current value
    if (this.inputs.odometer) {
      const currentOdo = parseInt(localStorage.getItem('currentOdometer')) || 0;
      if (currentOdo > 0) {
        this.inputs.odometer.placeholder = `Current: ${currentOdo.toLocaleString()} km`;
      }
    }

    // Auto-calculate liters from total cost
    this.setupAutoCalculation();

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Real-time validation
    this.setupValidation();
  }

  setupAutoCalculation() {
    const calculateLiters = () => {
      const totalCost = parseFloat(this.inputs.totalCost?.value) || 0;
      const pricePerLiter = parseFloat(localStorage.getItem('fuelPricePerLiter')) || 0;
      
      if (totalCost > 0 && pricePerLiter > 0) {
        const liters = totalCost / pricePerLiter;
        if (this.inputs.liters) {
          this.inputs.liters.value = liters.toFixed(2);
        }
      } else {
        if (this.inputs.liters) {
          this.inputs.liters.value = '';
        }
      }
    };

    this.inputs.totalCost?.addEventListener('input', calculateLiters);
  }

  setupValidation() {
    // Clear errors on input
    Object.values(this.inputs).forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.clearErrors());
      }
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.clearErrors();

    const formData = this.getFormData();
    
    // Check if price per liter is set
    const pricePerLiter = parseFloat(localStorage.getItem('fuelPricePerLiter')) || 0;
    if (pricePerLiter <= 0) {
      this.showError('Please set the price per liter in Settings first.');
      return;
    }
    
    // Prevent double submission
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    
    try {
      this.setLoading(true);
      
      // Check if we're editing an existing record
      if (fuelApp && fuelApp.editingRecordId) {
        await fuelApp.stateManager.editRecord(fuelApp.editingRecordId, formData);
        
        // Update finance record for fuel edit
        if (typeof window.addFuelExpense === 'function') {
          const updatedRecord = await FuelDataManager.getRecord(fuelApp.editingRecordId);
          if (updatedRecord) {
            await window.deleteFinanceRecordsByFuelRecord(fuelApp.editingRecordId);
            await window.addFuelExpense(updatedRecord);
          }
        }
        
        fuelApp.editingRecordId = null; // Clear edit mode
        this.showSuccess('Fuel entry updated successfully!');
      } else {
        const newRecord = await this.stateManager.addRecord(formData);
        
        // Add finance record for fuel
        if (typeof window.addFuelExpense === 'function' && newRecord) {
          await window.addFuelExpense(newRecord);
        }
        
        this.showSuccess('Fuel entry saved successfully!');
      }
      
      this.resetForm();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
      this.isSubmitting = false;
    }
  }

  getFormData() {
    const totalCost = parseFloat(this.inputs.totalCost?.value) || 0;
    const pricePerLiter = parseFloat(localStorage.getItem('fuelPricePerLiter')) || 0;
    const liters = pricePerLiter > 0 ? totalCost / pricePerLiter : 0;
    
    return {
      date: this.inputs.date?.value,
      odometer: this.inputs.odometer?.value,
      liters: parseFloat(liters.toFixed(2)),
      pricePerLiter: pricePerLiter,
      totalCost: totalCost,
      isFullTank: this.inputs.isFullTank?.checked || false,
      notes: this.inputs.notes?.value || ''
    };
  }

  setLoading(isLoading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = isLoading;
      this.submitBtn.textContent = isLoading ? 'Saving...' : 'Save Fuel Entry';
    }
  }

  showError(message) {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
      this.errorContainer.style.display = 'block';
    }
  }

  showSuccess(message) {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = `<div class="success-message">${message}</div>`;
      this.errorContainer.style.display = 'block';
      setTimeout(() => this.clearErrors(), 3000);
    }
  }

  clearErrors() {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
      this.errorContainer.style.display = 'none';
    }
  }

  resetForm() {
    this.form.reset();
    if (this.inputs.date) {
      this.inputs.date.valueAsDate = new Date();
    }
    if (this.inputs.liters) {
      this.inputs.liters.value = '';
    }
    if (this.inputs.totalCost) {
      this.inputs.totalCost.value = '';
    }
    
    // Reset button text
    if (this.submitBtn) {
      this.submitBtn.textContent = 'Save Fuel Entry';
    }
    
    // Clear edit mode
    if (fuelApp) {
      fuelApp.editingRecordId = null;
    }
    
    // Update odometer placeholder with new value
    if (this.inputs.odometer) {
      const currentOdo = parseInt(localStorage.getItem('currentOdometer')) || 0;
      if (currentOdo > 0) {
        this.inputs.odometer.placeholder = `Current: ${currentOdo.toLocaleString()} km`;
      }
    }
  }
}

// ================================
// MAIN FUEL APPLICATION
// ================================
class FuelApplication {
  constructor() {
    this.stateManager = new FuelStateManager();
    this.uiRenderer = null;
    this.entryForm = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Initialize database
      await FuelDataManager.initDatabase();

      // Initialize UI renderer
      this.uiRenderer = new FuelUIRenderer(this.stateManager);

      // Initialize form handler
      this.entryForm = new FuelEntryForm(this.stateManager);

      // Load initial data
      await this.stateManager.loadSession('default');

      this.isInitialized = true;
      console.log('Fuel Analytics System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Fuel Analytics System:', error);
      throw error;
    }
  }

  // Public API for external access
  async addRecord(data) {
    return this.stateManager.addRecord(data);
  }

  async deleteRecord(recordId) {
    if (confirm('Are you sure you want to delete this fuel entry?')) {
      // Delete associated finance record first
      if (typeof window.deleteFinanceRecordsByFuelRecord === 'function') {
        await window.deleteFinanceRecordsByFuelRecord(recordId);
      }
      return this.stateManager.deleteRecord(recordId);
    }
  }

  async editRecord(recordId) {
    const record = await FuelDataManager.getRecord(recordId);
    if (!record) return;

    // Populate form for editing
    const dateInput = document.getElementById('fuelDate');
    const odometerInput = document.getElementById('fuelOdometer');
    const litersInput = document.getElementById('fuelLiters');
    const totalCostInput = document.getElementById('fuelTotalCost');
    const fullTankInput = document.getElementById('fuelFullTank');
    const notesInput = document.getElementById('fuelNotes');

    if (dateInput) dateInput.value = record.date;
    if (odometerInput) odometerInput.value = record.odometer;
    if (litersInput) litersInput.value = record.liters;
    if (totalCostInput) totalCostInput.value = record.totalCost;
    if (fullTankInput) fullTankInput.checked = record.isFullTank;
    if (notesInput) notesInput.value = record.notes || '';

    // Store edit mode
    this.editingRecordId = recordId;
    
    // Change submit button text
    const submitBtn = document.getElementById('saveFuelBtn');
    if (submitBtn) submitBtn.textContent = 'Update Fuel Entry';

    // Scroll to form
    this.form?.scrollIntoView({ behavior: 'smooth' });
  }

  getAnalytics() {
    return this.stateManager.getAnalytics();
  }

  getRecords() {
    return this.stateManager.getState().records;
  }
}

// ================================
// GLOBAL INSTANCE
// ================================
let fuelApp = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  fuelApp = new FuelApplication();
  await fuelApp.init();
});

// ================================
// Update Fuel KPIs on Main Dashboard
// ================================
function updateFuelKPIsOnDashboard() {
  const dbRequest = indexedDB.open('carMaintainDB', 5);
  
  dbRequest.onsuccess = function(e) {
    const db = e.target.result;
    const tx = db.transaction('fuelRecords', 'readonly');
    const store = tx.objectStore('fuelRecords');
    const records = [];
    
    store.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        records.push(cursor.value);
        cursor.continue();
      } else {
        // Calculate and update KPIs
        if (records.length >= 2) {
          const sortedRecords = records.sort((a, b) => a.odometer - b.odometer);
          const totalDistance = sortedRecords[sortedRecords.length - 1].odometer - sortedRecords[0].odometer;
          const totalLiters = sortedRecords.reduce((sum, r) => sum + r.liters, 0);
          const avgConsumption = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
          
          const kpiAvgFuelValue = document.getElementById('kpiAvgFuelValue');
          const kpiAvgFuelSub = document.getElementById('kpiAvgFuelSub');
          
          if (kpiAvgFuelValue) {
            kpiAvgFuelValue.textContent = `${avgConsumption.toFixed(1)}`;
          }
          if (kpiAvgFuelSub) {
            kpiAvgFuelSub.textContent = 'L/100km';
          }
        }
      }
    };
  };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FuelApplication,
    FuelStateManager,
    FuelDataManager,
    FuelAnalyticsEngine,
    FuelValidator,
    FuelUIRenderer,
    FuelEntryForm
  };
}
