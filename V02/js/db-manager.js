/**
 * Enhanced Database Manager
 * Handles all database operations with improved editing capabilities
 */

class DatabaseManager {
    constructor() {
        this.db = null;
        this.STORES = {
            FUEL_LOG: 'fuelLogs',
            MAINTENANCE: 'maintenance',
            SUPPLIERS: 'suppliers',
            SERVICE_TYPES: 'serviceTypes',
            CAR_SAVINGS: 'carSavings',
            EXPENSES: 'expenses',
            FUEL_STATIONS: 'fuelStations'
        };
    }

    async initDatabase() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CarMaintenanceDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(this.STORES.FUEL_LOG)) {
                    db.createObjectStore(this.STORES.FUEL_LOG, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.MAINTENANCE)) {
                    db.createObjectStore(this.STORES.MAINTENANCE, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.SUPPLIERS)) {
                    db.createObjectStore(this.STORES.SUPPLIERS, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.SERVICE_TYPES)) {
                    db.createObjectStore(this.STORES.SERVICE_TYPES, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.CAR_SAVINGS)) {
                    db.createObjectStore(this.STORES.CAR_SAVINGS, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.EXPENSES)) {
                    db.createObjectStore(this.STORES.EXPENSES, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORES.FUEL_STATIONS)) {
                    db.createObjectStore(this.STORES.FUEL_STATIONS, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async addRecord(storeName, record) {
        if (!this.db) await this.initDatabase();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateRecord(storeName, record) {
        if (!this.db) await this.initDatabase();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(record);

            request.onsuccess = () => {
                resolve(request.result);
                // Dispatch a custom event to notify of the update
                window.dispatchEvent(new CustomEvent('dbRecordUpdated', {
                    detail: { storeName, record }
                }));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getRecordById(storeName, id) {
        if (!this.db) await this.initDatabase();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRecords(storeName) {
        if (!this.db) await this.initDatabase();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRecord(storeName, id) {
        if (!this.db) await this.initDatabase();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
                // Dispatch a custom event to notify of the deletion
                window.dispatchEvent(new CustomEvent('dbRecordDeleted', {
                    detail: { storeName, id }
                }));
            };
            request.onerror = () => reject(request.error);
        });
    }
}

// Initialize and export database manager
window.dbManager = new DatabaseManager();
