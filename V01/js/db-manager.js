/**
 * IndexedDB Database Manager
 * Handles all interactions with the IndexedDB database.
 */

const DB_NAME = 'CarMaintenanceDB';
const DB_VERSION = 1; // Increment this version number when changing the database schema

// Define object stores
const STORES = {
    EXPENSES: 'expenses',
    FUEL_LOG: 'fuel_log',
    MAINTENANCE: 'maintenance',
    SUPPLIERS: 'suppliers',
    CAR_SAVINGS: 'car_savings'
};

// Database instance
let db = null;

/**
 * Initializes the IndexedDB database.
 * Creates object stores if they don't exist or if the database version is upgraded.
 * @returns {Promise<void>} A promise that resolves when the database is successfully opened.
 */
function initDB() {
    return new Promise((resolve, _reject) => {
        // Request to open the database
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database upgrade
        request.onupgradeneeded = (event) => {

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
                db.createObjectStore(STORES.EXPENSES, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.FUEL_LOG)) {
                db.createObjectStore(STORES.FUEL_LOG, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.MAINTENANCE)) {
                // Create index for linked expense if needed
                const maintenanceStore = db.createObjectStore(STORES.MAINTENANCE, { keyPath: 'id', autoIncrement: true });
                maintenanceStore.createIndex('dateIndex', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
                db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.CAR_SAVINGS)) {
                db.createObjectStore(STORES.CAR_SAVINGS, { keyPath: 'id', autoIncrement: true });
            }

            console.log('Database upgrade complete.');
        };

        // Handle successful database open
            db = event.target.result;
            console.log('Database opened successfully');
            resolve();
        });

        // Handle database open error
        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            reject(new Error('Failed to open database'));
        };
    };

/**
 * Adds a new record to the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} data - The data to add.
 * @returns {Promise<number>} A promise that resolves with the ID of the added record.
 */
function addRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Add record error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Retrieves a record by its ID from the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {number} id - The ID of the record to retrieve.
 * @returns {Promise<object|undefined>} A promise that resolves with the record data or undefined if not found.
 */
function getRecordById(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Get record by ID error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Retrieves all records from the specified object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of all records.
 */
function getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Get all records error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Updates an existing record in the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} data - The updated data (must include the record's ID).
 * @returns {Promise<void>} A promise that resolves when the record is successfully updated.
 */
function updateRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Update record error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Deletes a record by its ID from the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {number} id - The ID of the record to delete.
 * @returns {Promise<void>} A promise that resolves when the record is successfully deleted.
 */
function deleteRecord(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Delete record error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Export the database manager functionality
window.dbManager = {
    initDB,
    STORES,
    addRecord,
    getRecordById,
    getAllRecords,
    updateRecord,
    deleteRecord
};