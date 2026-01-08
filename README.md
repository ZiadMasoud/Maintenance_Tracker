# 🚗 Car Maintenance Tracker

A modern, feature-rich web application for tracking your car's maintenance history, expenses, and upcoming service reminders. Built with vanilla JavaScript, HTML, and CSS - no frameworks required!

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen)](https://ziadmasoud.github.io/Maintenance_Tracker/)

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Features in Detail](#-features-in-detail)
- [Browser Compatibility](#-browser-compatibility)
- [License](#-license)

## ✨ Features

### Core Functionality
- **Maintenance Session Tracking**: Record detailed maintenance sessions with date, odometer reading, merchant/place, and notes
- **Item/Service Management**: Add multiple items or services per session with custom categories, costs, and descriptions
- **Category System**: Create and manage custom categories with color coding for better organization
- **Odometer Tracking**: Track and update your car's current odometer reading
- **Car Information**: Store and display your car's details (manufacturer, model, year, plate number, license expiry)

### Advanced Features
- **Upcoming Maintenance Reminders**: Get notified about upcoming maintenance items based on time or mileage intervals
- **Spending Analytics**: Visualize your maintenance spending with interactive charts
  - Monthly and yearly spending trends
  - Category-wise spending breakdown
  - Filterable by date ranges
- **Search & Filter**: 
  - Search sessions by date, category, or item/service
  - Filter by category and date ranges (Last 30/90 days, This Year, All Time)
- **Pagination**: Efficiently browse through large numbers of maintenance sessions
- **Data Management**:
  - Export all data to JSON format
  - Import data from JSON files
  - Reset all data option
- **Live Time Display**: Real-time clock display in the Digital ID section
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: IndexedDB (browser-based database for persistent storage)
- **Charts**: Chart.js (via CDN)
- **Fonts**: Inter (Google Fonts)
- **No Build Tools**: Pure vanilla web technologies - no frameworks, bundlers, or transpilers

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation or setup required!

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ziadmasoud/Maintenance_Tracker.git
```

2. Navigate to the project directory:
```bash
cd Maintenance_Tracker
```

3. Open `index.html` in your web browser:
   - Simply double-click the file, or
   - Use a local web server (optional):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server
     ```

That's it! The application will automatically initialize IndexedDB and set up the database structure.

## 📖 Usage

### Adding a Maintenance Session

1. Click the **＋** floating action button
2. Fill in the session details:
   - Date (supports DD/MM/YYYY format)
   - Odometer reading (km)
   - Merchant/Place (optional)
   - Notes (optional)
3. Add items/services:
   - Click "Add Item" for each service/item
   - Select a category, enter description, cost, and optional next service interval
4. Click "Save Session"

### Managing Categories

1. Click the **⚙** settings button
2. In the "Category Management" section:
   - Enter a category name
   - Choose a color
   - Click "Add Category"
3. Edit or delete existing categories as needed

### Viewing Analytics

- Navigate to the "Spending" section
- Toggle between Monthly and Yearly views
- Use filters to view specific time periods
- Charts automatically update based on your data

### Exporting/Importing Data

1. Open Settings (⚙ button)
2. In "Data Management":
   - Click "Export Data" to download a JSON file
   - Click "Import Data" to restore from a JSON file

## 📁 Project Structure

```
Maintenance_Tracker/
│
├── index.html          # Main HTML structure
├── script.js           # All JavaScript functionality
├── style.css           # All styles and responsive design
└── README.md           # Project documentation
```

## 🔍 Features in Detail

### Maintenance Sessions
- Each session can contain multiple items/services
- Track total cost per session
- View detailed session information
- Edit or delete sessions

### Digital ID Card
- Displays car information in a card format
- Shows live time
- License expiry tracking with visual indicators
- Quick edit functionality

### Upcoming Maintenance
- Automatically calculates next service dates based on:
  - Time intervals (days/months)
  - Mileage intervals (km)
- Color-coded urgency indicators
- Recently completed items tracking

### Charts & Analytics
- **Spending Over Time**: Line chart showing spending trends
- **Spending by Category**: Pie/doughnut chart showing category distribution
- Interactive filtering and date range selection

### Search & Filter
- Real-time search across all session data
- Multi-criteria filtering
- Pagination for large datasets

## 🌐 Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

**Note**: Requires IndexedDB support (available in all modern browsers).

## 📝 License

This project is open source and available for personal and commercial use.

## 🔗 Live Demo

Visit the live application: [https://ziadmasoud.github.io/Maintenance_Tracker/](https://ziadmasoud.github.io/Maintenance_Tracker/)

---

**Made with ❤️ using vanilla JavaScript**
