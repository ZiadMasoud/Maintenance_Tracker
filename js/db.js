/**
 * Database Manager
 * This file handles the IndexedDB database operations for the Car Maintenance Tracker.
 */

// Database configuration
const DB_CONFIG = {
    name: 'CarMaintenanceDB',
    version: 1,
    STORES: {
        FUEL_LOG: 'fuelLogs',
        MAINTENANCE: 'maintenance',
        SUPPLIERS: 'suppliers',
        SERVICE_TYPES: 'serviceTypes',
        CAR_SAVINGS: 'carSavings',
        EXPENSES: 'expenses'
    }
};

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('Database initialized successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(DB_CONFIG.STORES.FUEL_LOGS)) {
                db.createObjectStore(DB_CONFIG.STORES.FUEL_LOGS, { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains(DB_CONFIG.STORES.MAINTENANCE)) {
                db.createObjectStore(DB_CONFIG.STORES.MAINTENANCE, { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SUPPLIERS)) {
                db.createObjectStore(DB_CONFIG.STORES.SUPPLIERS, { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SERVICE_TYPES)) {
                const serviceTypesStore = db.createObjectStore(DB_CONFIG.STORES.SERVICE_TYPES, { keyPath: 'id', autoIncrement: true });
                // Add default service types
                const defaultServiceTypes = [
                    { name: 'Oil Change' },
                    { name: 'Tire Rotation' },
                    { name: 'Brake Service' },
                    { name: 'Battery Replacement' },
                    { name: 'Air Filter Replacement' }
                ];
                defaultServiceTypes.forEach(type => serviceTypesStore.add(type));
            }

            if (!db.objectStoreNames.contains(DB_CONFIG.STORES.CAR_SAVINGS)) {
                const savingsStore = db.createObjectStore(DB_CONFIG.STORES.CAR_SAVINGS, { keyPath: 'id', autoIncrement: true });
                // Initialize with zero savings
                savingsStore.add({ amount: 0 });
            }
        };
    });
}

// Initialize database
window.dbManager = {
    STORES: DB_CONFIG.STORES,
    db: null,
    
    initDatabase: async function() {
        try {
            this.db = await initDB();
            return this.db;
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    },
    
    addRecord: function(storeName, record) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    getAllRecords: function(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    getRecordById: function(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    updateRecord: function(storeName, record) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.put(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    deleteRecord: function(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
