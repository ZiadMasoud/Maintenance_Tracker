/**
 * Data Manager
 * Handles data reset and export functionality
 */

class DataManager {
    constructor() {
        this.dbManager = window.dbManager;
    }

    /**
     * Reset all application data
     */
    async resetAppData() {
        if (!confirm('WARNING: This will delete all your data including fuel logs, maintenance records, and savings. This action cannot be undone. Are you sure you want to continue?')) {
            return;
        }

        try {
            // Double confirm for safety
            if (!confirm('Last warning: All data will be permanently deleted. Continue?')) {
                return;
            }

            // Clear each store
            for (const storeName of Object.values(this.dbManager.STORES)) {
                const store = this.dbManager.db.transaction(storeName, 'readwrite').objectStore(storeName);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            // Notify of success
            showToast('All data has been successfully cleared', 'success');

            // Refresh the page to reset all UI states
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error resetting app data:', error);
            showToast('Failed to reset app data', 'error');
        }
    }

    /**
     * Export all application data
     */
    async exportData(format = 'json') {
        try {
            // Collect all data from each store
            const exportData = {};
            
            for (const [storeName, storeKey] of Object.entries(this.dbManager.STORES)) {
                const records = await this.dbManager.getAllRecords(storeKey);
                exportData[storeName] = records;
            }

            let fileContent;
            let fileName;
            let mimeType;

            if (format === 'csv') {
                // Convert to CSV format
                fileContent = this.convertToCSV(exportData);
                fileName = `car_maintenance_data_${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            } else {
                // JSON format
                fileContent = JSON.stringify(exportData, null, 2);
                fileName = `car_maintenance_data_${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            }

            // Create download link
            const blob = new Blob([fileContent], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showToast('Data exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            showToast('Failed to export data', 'error');
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        let csv = '';
        
        // Process each store
        for (const [storeName, records] of Object.entries(data)) {
            if (records.length === 0) continue;

            // Add store header
            csv += `\n### ${storeName} ###\n`;

            // Get headers from first record
            const headers = Object.keys(records[0]);
            csv += headers.join(',') + '\n';

            // Add records
            records.forEach(record => {
                const row = headers.map(header => {
                    const value = record[header];
                    if (typeof value === 'object' && value !== null) {
                        // Handle nested objects/arrays by JSON stringifying them
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    }
                    if (typeof value === 'string') {
                        // Escape quotes and wrap in quotes if contains comma
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csv += row.join(',') + '\n';
            });

            csv += '\n'; // Add separation between stores
        }

        return csv;
    }
}

// Initialize data manager
window.dataManager = new DataManager();
