// Initialize settings functionality
function initializeSettings() {
    // Export button
    const exportBtn = document.getElementById('btnExport');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const format = localStorage.getItem('exportFormat') || 'json';
            await window.dataManager.exportData(format);
        });
    }

    // Import file handler
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', handleFileImport);
    }

    // Settings button
    const settingsBtn = document.getElementById('btnSettings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openSettingsDialog();
        });
    }
}

// Handle file import
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                // Parse the imported data
                const importedData = JSON.parse(e.target.result);

                // Confirm import
                if (!confirm('This will replace all existing data. Are you sure you want to continue?')) {
                    return;
                }

                // Clear existing data
                await window.dataManager.resetAppData(false); // false = don't show confirmation

                // Import each store's data
                for (const [storeName, records] of Object.entries(importedData)) {
                    if (!Array.isArray(records)) continue;

                    const store = window.dbManager.STORES[storeName];
                    if (!store) continue;

                    for (const record of records) {
                        await window.dbManager.addRecord(store, record);
                    }
                }

                showToast('Data imported successfully', 'success');
                
                // Refresh the page to show imported data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Error parsing import file:', error);
                showToast('Invalid import file format', 'error');
            }
        };

        reader.readAsText(file);

    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Failed to import data', 'error');
    }
}

// Settings dialog
function openSettingsDialog() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('settingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Settings</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h3>Data Management</h3>
                        <div class="setting-item">
                            <label>Export Format</label>
                            <select id="exportFormat">
                                <option value="json">JSON</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                        
                        <div class="setting-item">
                            <label>Data Reset</label>
                            <button class="btn danger" onclick="window.dataManager.resetAppData()">
                                Reset All Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handle close button
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        // Handle export format change
        const formatSelect = modal.querySelector('#exportFormat');
        formatSelect.value = localStorage.getItem('exportFormat') || 'json';
        formatSelect.onchange = () => {
            localStorage.setItem('exportFormat', formatSelect.value);
        };

        // Close when clicking outside
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // Show the modal
    modal.style.display = 'block';
}

// Add to window load event
window.addEventListener('load', () => {
    initializeSettings();
});
