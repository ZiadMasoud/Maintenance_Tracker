/**
 * PDF Export Functionality
 * This file provides functions to export data to PDF format using jsPDF.
 */

// Initialize PDF export functionality
function initPDFExport() {
    try {
        console.log('Initializing PDF export...');
        
        // Initialize jsPDF
        if (typeof window.jspdf === 'undefined') {
            // jsPDF is loaded via a script tag in index.html, so it should be available
            console.error('jsPDF library not loaded');
            showError('PDF export functionality not available');
            return;
        }
        
        // Add event listeners to export buttons
        const exportMaintenancePDFBtn = document.getElementById('exportMaintenancePDF');
        if (exportMaintenancePDFBtn) {
            exportMaintenancePDFBtn.addEventListener('click', exportMaintenanceToPDF);
        }
        
        const exportFuelLogPDFBtn = document.getElementById('exportFuelLogPDF');
        if (exportFuelLogPDFBtn) {
            exportFuelLogPDFBtn.addEventListener('click', exportFuelLogToPDF);
        }
        
        console.log('PDF export initialized successfully');
    } catch (error) {
        console.error('Error initializing PDF export:', error);
        showError('Failed to initialize PDF export');
    }
}

// Export maintenance records to PDF
async function exportMaintenanceToPDF() {
    try {
        // Check if jsPDF and autoTable plugin are available
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
            showError('PDF export library not fully loaded. Please try again.');
            return;
        }
        console.log('Exporting maintenance records to PDF...');
        
        // Get all maintenance records
        const records = await window.dbManager.getAllRecords(window.dbManager.STORES.MAINTENANCE);
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (records.length === 0) {
            showError('No maintenance records to export');
            return;
        }
        
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Car Maintenance Records', 14, 20);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Prepare table data
        const tableColumn = ["Date", "Service Type", "Description", "Mileage", "Cost", "Parts"];
        const tableRows = []; // Array to hold data rows for the main table
        
        // Add records to table
        for (const record of records) {
            const formattedDate = new Date(record.date).toLocaleDateString();
            const formattedCost = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(record.cost);
            
            // Format parts
            let partsText = 'None'; // Default text if no parts
            if (record.parts && record.parts.length > 0) {
                partsText = `${record.parts.length} part${record.parts.length > 1 ? 's' : ''}`;
            }
            
            const tableRow = [
                formattedDate,
                record.serviceType,
                record.description || '-',
                record.mileage.toLocaleString(),
                formattedCost,
                partsText
            ]; // Data for a single row
            tableRows.push(tableRow);
        }
        
        // Create table
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 50 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 }, // Adjust column widths as needed
                5: { cellWidth: 25 }
            },
            didDrawPage: function(data) {
                // Add page number
                doc.setFontSize(8);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        
        // Add detailed parts information
        let yPos = doc.lastAutoTable.finalY + 20;
        // Check if we need a new page before adding parts details title
        if (yPos > doc.internal.pageSize.height - 40) {
            doc.addPage();
            yPos = 20;
        }
        
        // Add parts details title
        doc.setFontSize(14);
        doc.text('Parts Details', 14, yPos);
        yPos += 10;
        
        // Add parts details for each record
        for (const record of records) {
            if (!record.parts || record.parts.length === 0) continue; // Skip if no parts for this record
            
            // Check if we need a new page
            if (yPos > doc.internal.pageSize.height - 60) {
                doc.addPage();
                yPos = 20;
            }
            
            // Add record header
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            const formattedDate = new Date(record.date).toLocaleDateString();
            doc.text(`${formattedDate} - ${record.serviceType}`, 14, yPos);
            doc.setFont(undefined, 'normal'); // Reset font style
            yPos += 8;
            
            // Prepare parts table
            const partsColumns = ["Part Name", "Part Number", "Cost", "Supplier"];
            const partsRows = [];
            
            // Add parts to table
            for (const part of record.parts) {
                const formattedCost = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(part.cost);
                
                // Get supplier name if available
                let supplierName = 'None'; // Default supplier name
                if (part.supplierId) {
                    try {
                        const supplier = await window.dbManager.getRecordById(window.dbManager.STORES.SUPPLIERS, part.supplierId);
                        if (supplier) {
                            supplierName = supplier.name;
                        }
                    } catch (error) {
                        console.error('Error getting supplier:', error);
                    } // Catch potential errors during supplier lookup
                }
                
                const partRow = [
                    part.name,
                    part.number || '-',
                    formattedCost,
                    supplierName
                ];
                partsRows.push(partRow); // Data for a single part row
            }
            
            // Create parts table
            doc.autoTable({
                head: [partsColumns],
                body: partsRows,
                startY: yPos,
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 60 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 40 }
                }, // Adjust column widths for parts table
                margin: { left: 20 }
            });
            
            yPos = doc.lastAutoTable.finalY + 15;
        }
        
        // Save PDF
        doc.save('car_maintenance_records.pdf');
        
        // Show success message
        // Assuming showToast function is available globally or imported
        window.showToast('Maintenance records exported to PDF', 'success');
        console.log('Maintenance records exported successfully');
    } catch (error) {
        console.error('Error exporting maintenance records to PDF:', error);
        showError('Failed to export maintenance records to PDF');
    }
}

// Export fuel log to PDF
async function exportFuelLogToPDF() {
    try {
        // Check if jsPDF and autoTable plugin are available
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
            showError('PDF export library not fully loaded. Please try again.');
            return;
        }
        console.log('Exporting fuel log to PDF...');
        
        // Get all fuel log entries
        const entries = await window.dbManager.getAllRecords(window.dbManager.STORES.FUEL_LOG);
        
        // Sort by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (entries.length === 0) {
            showError('No fuel log entries to export');
            return;
        }
        
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Fuel Log Records', 14, 20);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Prepare table data
        const tableColumn = ["Date", "Fuel Amount (L)", "Cost", "Mileage", "Fuel Type"];
        const tableRows = [];
        
        // Calculate totals
        let totalAmount = 0;
        let totalCost = 0;
        
        // Add entries to table
        for (const entry of entries) {
            const formattedDate = new Date(entry.date).toLocaleDateString();
            const formattedCost = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(entry.cost);
            
            const tableRow = [
                formattedDate,
                entry.amount.toFixed(2),
                formattedCost,
                entry.mileage.toLocaleString(),
                entry.fuelType
            ]; // Data for a single row
            tableRows.push(tableRow);
            
            // Update totals
            totalAmount += entry.amount;
            totalCost += entry.cost;
        }
        
        // Create table
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 } // Adjust column widths as needed
            },
            didDrawPage: function(data) {
                // Add page number
                doc.setFontSize(8);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        
        // Add summary
        let yPos = doc.lastAutoTable.finalY + 20;
        
        if (yPos > doc.internal.pageSize.height - 50) { // Check if we need a new page for summary
            doc.addPage();
            yPos = 20;
        }
        
        // Add summary title
        doc.setFontSize(14);
        doc.text('Fuel Summary', 14, yPos);
        yPos += 10;
        
        // Add summary data
        doc.setFontSize(10);
        doc.text(`Total Fuel: ${totalAmount.toFixed(2)} liters`, 20, yPos);
        yPos += 8;
        
        doc.text(`Total Cost: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(totalCost)}`, 20, yPos);
        yPos += 8;
        
        // Calculate average cost per liter
        if (totalAmount > 0) {
            const avgCostPerLiter = totalCost / totalAmount;
            doc.text(`Average Cost per Liter: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(avgCostPerLiter)}`, 20, yPos);
            yPos += 8;
            
            // Calculate average cost per gallon (for US users)
            const avgCostPerGallon = totalCost / (totalAmount * 0.264172);
            doc.text(`Average Cost per Gallon: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(avgCostPerGallon)}`, 20, yPos);
        }
        
        // Save PDF
        doc.save('fuel_log_records.pdf');
        
        // Show success message
        // Assuming showToast function is available globally or imported
        window.showToast('Fuel log exported to PDF', 'success');
        console.log('Fuel log exported successfully');
    } catch (error) {
        console.error('Error exporting fuel log to PDF:', error);
        showError('Failed to export fuel log to PDF');
    }
}
// Export PDF export functions for use in other modules
window.pdfExportManager = {
    initPDFExport,
    exportMaintenanceToPDF,
    exportFuelLogToPDF
};
