/* app.js - enhanced app with IndexedDB-based local storage system */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await myDB.initDB();
    console.log("IndexedDB initialized successfully");

    // ensure basic records
    const prof = await myDB.get("profile", "profile").catch(() => null);
    if (!prof)
      await myDB.put("profile", {
        id: "profile",
        plate: "",
        make: "",
        model: "",
        year: "",
        odometer: 0,
        intervalKm: 10000,
        intervalMonths: 6,
        updatedAt: new Date().toISOString(),
      });
    
    const s = (await myDB.getAll("settings")).find((x) => x.id === "ui");
    if (!s) await myDB.put("settings", { id: "ui", fuelUnit: "kmpl" });

    // Initialize fuel logging
    initFuelLog();

    // Initialize maintenance logging
    initMaintenance();

    // Initialize dashboard
    initDashboard();

    // Initialize reminder system
    initReminderSystem();
    startReminderMonitoring();

    // Initialize reports
    initReports();

    // Initialize running totals if not exists
    const runningTotal = await myDB.savings.getRunningTotal();
    if (!runningTotal.total) {
      await myDB.savings.updateRunningTotal();
    }
    
    // Initialize car savings running total if not exists
    const carRunningTotal = await myDB.carSavings.getRunningTotal();
    if (!carRunningTotal.total) {
      await myDB.carSavings.updateRunningTotal();
    }
    
    // Set default date for car savings form
    const carSavDateInput = document.getElementById("carSavDate");
    if (carSavDateInput) {
      carSavDateInput.value = new Date().toISOString().slice(0, 10);
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
    toast("Failed to initialize app: " + error.message);
  }

  // DOM
  const tabs = document.querySelectorAll(".tab");
  const pages = document.querySelectorAll(".page");
  const sidePanel = document.getElementById("sidePanel");
  const sideContent = document.getElementById("sideContent");
  const sideTitle = document.getElementById("sideTitle");

  // nav binding
  tabs.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      tabs.forEach((t) => t.classList.remove("active"));
      e.currentTarget.classList.add("active");
      const page = e.currentTarget.dataset.page;
      pages.forEach((p) => p.classList.remove("active"));
      document.getElementById(page).classList.add("active");
      // render when switching
      if (page === "dashboard") renderDashboard();
      if (page === "car-savings") renderCarSavings();
      if (page === "maintenance") renderMaintenance();
      if (page === "fuel") renderFuel();
      if (page === "parts" || page === "suppliers") renderPartsAndSuppliers();
    })
  );

  // top actions
  document.getElementById("btnExport").addEventListener("click", async () => {
    const data = await myDB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mycar_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast("Export ready");
  });
  document
    .getElementById("importFile")
    .addEventListener("change", async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      if (!confirm("Import will overwrite local data. Continue?")) {
        ev.target.value = "";
        return;
      }
      const txt = await f.text();
      const obj = JSON.parse(txt);
      await myDB.importAll(obj);
      toast("Import complete");
      await renderAll();
      ev.target.value = "";
    });
  document.getElementById("btnSettings").addEventListener("click", () => {
    openSide(
      "Settings",
      document.getElementById("settingsTemplate").content.cloneNode(true)
    );
    setTimeout(bindSettings, 50);
  });

  // quick add buttons
  document.querySelectorAll('[data-action="open-add"]').forEach((b) => {
    b.addEventListener("click", (e) => {
      const type = e.currentTarget.dataset.type;
      if (type === "car-savings") openCarSavingsForm();
      if (type === "maintenance") openMaintenanceForm();
      if (type === "fuel") openFuelForm();
      if (type === "part") openPartForm();
      if (type === "supplier") openSupplierForm();
    });
  });

  document.getElementById("sideClose").addEventListener("click", closeSide);

  // initial render
  await renderAll();

  /* ---------- helpers & renderers ---------- */
  async function renderAll() {
    await renderDashboard();
    await renderCarSavings();
    await renderMaintenance();
    await renderFuel();
    await renderPartsAndSuppliers();
  }

  async function renderDashboard() {
    try {
      const profile = await myDB.get("profile", "profile").catch(() => ({}));
      const carSavings = await myDB.getAll("carSavings");
      const maintenance = await myDB.getAll("maintenance");
      const fuel = await myDB.getAll("fuel");
      const parts = await myDB.getAll("parts");
      
      // Get running total from enhanced car savings system
      const runningTotal = await myDB.carSavings.getRunningTotal();
      const totalSaved = runningTotal.total || 0;

      const thisYear = new Date().getFullYear();
      const totalSpentThisYear =
        maintenance
          .filter(
            (m) => new Date(m.date || m.createdAt).getFullYear() === thisYear
          )
          .reduce((s, x) => s + (Number(x.totalCost || x.cost) || 0), 0) +
        fuel
          .filter(
            (f) => new Date(f.date || f.createdAt).getFullYear() === thisYear
          )
          .reduce((s, x) => s + (Number(x.total) || 0), 0) +
        parts
          .filter(
            (p) =>
              new Date(p.createdAt || p.updatedAt || 0).getFullYear() === thisYear
          )
          .reduce((s, x) => s + (Number(x.unitPrice) || 0), 0);

      // Enhanced fuel efficiency calculation
      const fuelEfficiency = await myDB.fuel.getFuelEfficiency();
      let fuelAvg = "-";
      if (fuelEfficiency.length > 0) {
        const avgKPL = fuelEfficiency.reduce((s, x) => s + x.kmL, 0) / fuelEfficiency.length;
        const l100 = (100 / avgKPL).toFixed(2);
        fuelAvg = `${l100} L/100km`;
      }

      const cards = document.getElementById("dashCards");
      cards.innerHTML = `
        <div><h4>Total saved</h4><p>EGP ${num(totalSaved)}</p></div>
        <div><h4>Spent this year</h4><p>EGP ${num(totalSpentThisYear)}</p></div>
        <div><h4>Fuel avg</h4><p>${fuelAvg}</p></div>
        <div><h4>Odometer</h4><p>${num(profile.odometer || 0)} km</p></div>
      `;

      // Enhanced recent activity with better data
      const recent = [];
      if (maintenance.length) {
        const latest = maintenance[0];
        recent.push({
          type: "Maintenance",
          date: latest.date || latest.createdAt,
          text: `${latest.type || 'Service'} — ${latest.services?.length || 0} services — EGP ${latest.totalCost || latest.cost || 0}`,
        });
      }
      if (fuel.length) {
        const latest = fuel[fuel.length - 1];
        recent.push({
          type: "Fuel",
          date: latest.date || latest.createdAt,
          text: `${latest.liters} L — EGP ${latest.total}`,
        });
      }
      if (carSavings.length) {
        const latest = carSavings[0];
        recent.push({
          type: "Car Savings",
          date: latest.date || latest.createdAt,
          text: `${latest.description} — EGP ${latest.amount}`,
        });
      }

      const recentList = document.getElementById("recentList");
      recentList.innerHTML =
        recent
          .map(
            (r) =>
              `<div class="upcoming-card"><strong>${escapeHtml(
                r.type
              )}</strong> <div>${fmt(
                r.date
              )}</div><div style="margin-top:6px">${escapeHtml(
                r.text
              )}</div></div>`
          )
          .join("") || "<p>No recent activity</p>";

      // Render upcoming services
      await renderUpcomingServices();

      // mini charts (static)
      drawMiniCarSavings();
      drawMiniFuel();
      drawMiniMaint();
    } catch (error) {
      console.error("Failed to render dashboard:", error);
      toast("Failed to render dashboard: " + error.message);
    }
  }

  async function renderUpcomingServices() {
    try {
      const upcoming = await myDB.maintenance.getUpcomingServices();
      const upcomingList = document.getElementById("upcomingServices");
      
      if (upcoming.length === 0) {
        upcomingList.innerHTML = "<p>No upcoming services</p>";
        return;
      }
      
      upcomingList.innerHTML = upcoming
        .map((service) => {
          let urgency = "info";
          let message = "";
          
          if (service.daysUntil !== undefined) {
            if (service.daysUntil <= 7) urgency = "urgent";
            else if (service.daysUntil <= 30) urgency = "warning";
            message = `Due in ${service.daysUntil} days`;
          } else if (service.kmUntil !== undefined) {
            if (service.kmUntil <= 100) urgency = "urgent";
            else if (service.kmUntil <= 500) urgency = "warning";
            message = `Due in ${service.kmUntil} km`;
          }
          
          return `
            <div class="service-reminder ${urgency}">
              <strong>${service.type || 'Service'}</strong> - ${service.supplier || 'Unknown'}
              <br><small>${message} • Odo: ${service.odometer} km</small>
            </div>
          `;
        })
        .join("");
    } catch (error) {
      console.error("Failed to render upcoming services:", error);
    }
  }

  async function renderCarSavings() {
    try {
      const rows = (await myDB.getAll("carSavings")).sort((a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      );
      
      // Update summary card
      const runningTotal = await myDB.carSavings.getRunningTotal();
      const goal = await myDB.carSavings.getGoal();
      const goalAmount = goal.amount || 0;
      const goalProgress = goalAmount > 0 ? Math.min(100, Math.round((runningTotal.total / goalAmount) * 100)) : 0;
      
      document.getElementById("totalCarSaved").textContent = `EGP ${num(runningTotal.total)}`;
      document.getElementById("lastCarUpdated").textContent = runningTotal.lastUpdated ? fmt(runningTotal.lastUpdated) : "Never";
      document.getElementById("carEntryCount").textContent = runningTotal.recordCount;
      document.getElementById("goalProgress").textContent = `${goalProgress}%`;
      
      // Set goal input value
      document.getElementById("carGoalAmount").value = goalAmount;
      
      const tbody = document.querySelector("#carSavingsTable tbody");
      let runningTotalAmount = 0;
      
      tbody.innerHTML =
        rows
          .map(
            (r) => {
              runningTotalAmount += Number(r.amount) || 0;
              return `<tr data-id="${r.id}">
                <td>${fmt(r.date)}</td>
                <td>EGP ${num(r.amount)}</td>
                <td>${escapeHtml(r.description)}</td>
                <td>${escapeHtml(r.notes || '')}</td>
                <td>EGP ${num(runningTotalAmount)}</td>
                <td class="actions">
                  <button class="edit-btn" data-id="${r.id}" data-action="edit-car-sav">Edit</button>
                  <button class="delete-btn" data-id="${r.id}" data-action="del-car-sav">Delete</button>
                </td>
              </tr>`;
            }
          )
          .join("") || '<tr><td colspan="6">No records</td></tr>';
      
      // Bind delete events
      tbody.querySelectorAll('[data-action="del-car-sav"]').forEach((b) =>
        b.addEventListener("click", async (e) => {
          if (!confirm("Delete this savings entry?")) return;
          await myDB.del("carSavings", Number(e.currentTarget.dataset.id));
          await myDB.carSavings.updateRunningTotal();
          toast("Deleted");
          await renderCarSavings();
          await renderDashboard();
        })
      );
      
      // Bind edit events
      tbody.querySelectorAll('[data-action="edit-car-sav"]').forEach((b) =>
        b.addEventListener("click", async (e) => {
          const id = Number(e.currentTarget.dataset.id);
          const record = await myDB.get("carSavings", id);
          if (record) {
            openCarSavingsForm(record);
          }
        })
      );
      
      // Render breakdown chart
      await renderSavingsBreakdown();
      
    } catch (error) {
      console.error("Failed to render car savings:", error);
      toast("Failed to render car savings: " + error.message);
    }
  }

  async function renderSavingsBreakdown() {
    try {
      const breakdown = await myDB.carSavings.getBreakdownBySource();
      const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
      
      // Calculate percentages
      breakdown.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.amount / total) * 100) : 0;
      });
      
      // Sort by amount descending
      breakdown.sort((a, b) => b.amount - a.amount);
      
      // Create a simple text breakdown for now (pie chart can be added later)
      const breakdownDiv = document.getElementById("savingsBreakdown");
      if (breakdown.length === 0) {
        breakdownDiv.innerHTML = "<p>No savings data to display</p>";
        return;
      }
      
      const breakdownHtml = breakdown.map(item => 
        `<div class="breakdown-item">
          <span class="source">${escapeHtml(item.source)}</span>
          <span class="amount">EGP ${num(item.amount)}</span>
          <span class="percentage">${item.percentage}%</span>
        </div>`
      ).join("");
      
      breakdownDiv.innerHTML = `
        <div class="breakdown-list">
          ${breakdownHtml}
        </div>
      `;
      
    } catch (error) {
      console.error("Failed to render savings breakdown:", error);
    }
  }

  async function renderSavings() {
    try {
      const rows = (await myDB.getAll("savings")).sort((a, b) =>
        (b.month || "").localeCompare(a.month || "")
      );
      
      // Update summary card
      const runningTotal = await myDB.savings.getRunningTotal();
      document.getElementById("totalSaved").textContent = `EGP ${num(runningTotal.total)}`;
      document.getElementById("lastUpdated").textContent = runningTotal.lastUpdated ? fmt(runningTotal.lastUpdated) : "Never";
      document.getElementById("recordCount").textContent = runningTotal.recordCount;
      
      const tbody = document.querySelector("#savingsTable tbody");
      tbody.innerHTML =
        rows
          .map(
            (r) =>
              `<tr data-id="${r.id}">
                <td>${escapeHtml(r.month)}</td>
                <td>${num(r.income)}</td>
                <td>${num(r.other)}</td>
                <td>${num(r.alloc40)}</td>
                <td>${num(r.alloc20)}</td>
                <td>${num(r.extra)}</td>
                <td>${num(r.total)}</td>
                <td class="actions">
                  <button class="edit-btn" data-id="${r.id}" data-action="edit-sav">Edit</button>
                  <button class="delete-btn" data-id="${r.id}" data-action="del-sav">Delete</button>
                </td>
              </tr>`
          )
          .join("") || '<tr><td colspan="8">No records</td></tr>';
      
      // Bind delete events
      tbody.querySelectorAll('[data-action="del-sav"]').forEach((b) =>
        b.addEventListener("click", async (e) => {
          if (!confirm("Delete this savings entry?")) return;
          await myDB.del("savings", Number(e.currentTarget.dataset.id));
          await myDB.savings.updateRunningTotal();
          toast("Deleted");
          await renderSavings();
          await renderDashboard();
        })
      );
      
      // Bind edit events
      tbody.querySelectorAll('[data-action="edit-sav"]').forEach((b) =>
        b.addEventListener("click", async (e) => {
          const id = Number(e.currentTarget.dataset.id);
          const record = await myDB.get("savings", id);
          if (record) {
            openSavingsForm(record);
          }
        })
      );
    } catch (error) {
      console.error("Failed to render savings:", error);
      toast("Failed to render savings: " + error.message);
    }
  }

  // savings form on main savings page
  document
    .getElementById("savingsForm")
    .addEventListener("submit", async (ev) => {
      try {
        ev.preventDefault();
        const month = document.getElementById("savMonth").value;
        const income = Number(document.getElementById("savIncome").value) || 0;
        const other = Number(document.getElementById("savOther").value) || 0;
        const extra = Number(document.getElementById("savExtra").value) || 0;
        const alloc40 = +(income * 0.4).toFixed(2);
        const alloc20 = +(other * 0.2).toFixed(2);
        const total = +(alloc40 + alloc20 + extra).toFixed(2);
        
        const existing = (await myDB.getAll("savings")).find(
          (s) => s.month === month
        );
        
        if (existing) {
          existing.income = income;
          existing.other = other;
          existing.extra = extra;
          existing.alloc40 = alloc40;
          existing.alloc20 = alloc20;
          existing.total = total;
          existing.updatedAt = new Date().toISOString();
          await myDB.put("savings", existing);
          toast("Savings updated");
        } else {
          await myDB.savings.add({
            month,
            income,
            other,
            extra,
            alloc40,
            alloc20,
            total,
          });
          toast("Saved");
        }
        
        ev.target.reset();
        await renderSavings();
        await renderDashboard();
      } catch (error) {
        console.error("Failed to save savings:", error);
        toast("Failed to save: " + error.message);
      }
    });

  document
    .getElementById("btnClearSavings")
    .addEventListener("click", async () => {
      if (!confirm("Clear all savings?")) return;
      await myDB.clear("savings");
      toast("Savings cleared");
      await renderSavings();
      await renderDashboard();
    });

  // Car Savings form
  document
    .getElementById("carSavingsForm")
    .addEventListener("submit", async (ev) => {
      try {
        ev.preventDefault();
        const date = document.getElementById("carSavDate").value;
        const amount = Number(document.getElementById("carSavAmount").value) || 0;
        const description = document.getElementById("carSavDescription").value.trim();
        const notes = document.getElementById("carSavNotes").value.trim();
        
        if (!date || !amount || !description) {
          toast("Please fill in all required fields");
          return;
        }
        
        await myDB.carSavings.add({
          date,
          amount,
          description,
          notes,
          createdAt: new Date().toISOString(),
        });
        
        toast("Savings entry added");
        ev.target.reset();
        document.getElementById("carSavDate").value = new Date().toISOString().slice(0, 10);
        await renderCarSavings();
        await renderDashboard();
      } catch (error) {
        console.error("Failed to save car savings:", error);
        toast("Failed to save: " + error.message);
      }
    });

  // Clear all car savings
  document
    .getElementById("btnClearCarSavings")
    .addEventListener("click", async () => {
      if (!confirm("Clear all car savings? This cannot be undone.")) return;
      await myDB.clear("carSavings");
      await myDB.carSavings.updateRunningTotal();
      toast("All car savings cleared");
      await renderCarSavings();
      await renderDashboard();
    });

  // Set car savings goal
  document
    .getElementById("btnSetGoal")
    .addEventListener("click", async () => {
      try {
        const goalAmount = Number(document.getElementById("carGoalAmount").value) || 0;
        if (goalAmount <= 0) {
          toast("Please enter a valid goal amount");
          return;
        }
        
        await myDB.carSavings.setGoal(goalAmount);
        toast("Goal set successfully");
        await renderCarSavings();
      } catch (error) {
        console.error("Failed to set goal:", error);
        toast("Failed to set goal: " + error.message);
      }
    });

  async function renderMaintenance() {
    const rows = (await myDB.getAll("maintenance", "date")).sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );
    const tbody = document.querySelector("#maintTable tbody");
    tbody.innerHTML =
      rows
        .map(
          (r) =>
            `<tr data-id="${r.id}"><td>${fmt(r.date)}</td><td>${
              r.odometer
            }</td><td>${escapeHtml(r.type)}</td><td>${num(
              r.cost
            )}</td><td>${escapeHtml(r.parts)}</td><td>${escapeHtml(
              r.supplier
            )}</td><td>${escapeHtml(
              nextDueText(r)
            )}</td><td><button class="small-btn" data-id="${
              r.id
            }" data-action="del-maint">Delete</button></td></tr>`
        )
        .join("") || '<tr><td colspan="8">No records</td></tr>';
    tbody.querySelectorAll('[data-action="del-maint"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete maintenance entry?")) return;
        await myDB.del("maintenance", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderMaintenance();
        await renderDashboard();
      })
    );
  }

  async function renderFuel() {
    const rows = (await myDB.getAll("fuel", "date")).sort(
      (a, b) => a.odometer - b.odometer
    );
    const tbody = document.querySelector("#fuelTable tbody");
    const kml = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1],
        cur = rows[i];
      const km = cur.odometer - prev.odometer;
      if (km > 0 && cur.liters)
        kml.push({ id: cur.id, kml: +(km / cur.liters).toFixed(2) });
    }
    const rowsReverse = rows.slice().reverse();
    tbody.innerHTML =
      rowsReverse
        .map((r, idx) => {
          const k =
            idx === 0
              ? "-"
              : kml[kml.length - idx]
              ? num(kml[kml.length - idx].kml)
              : "-";
          return `<tr data-id="${r.id}"><td>${fmt(r.date)}</td><td>${
            r.odometer
          }</td><td>${num(r.liters)}</td><td>${num(r.price)}</td><td>${num(
            r.total
          )}</td><td>${k}</td><td><button class="small-btn" data-id="${
            r.id
          }" data-action="del-fuel">Delete</button></td></tr>`;
        })
        .join("") || '<tr><td colspan="7">No records</td></tr>';
    tbody.querySelectorAll('[data-action="del-fuel"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete fuel?")) return;
        await myDB.del("fuel", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderFuel();
        await renderDashboard();
      })
    );
  }

  async function renderPartsAndSuppliers() {
    const parts = (await myDB.getAll("parts")).sort((a, b) =>
      (a.sku || "").localeCompare(b.sku || "")
    );
    const tbody = document.querySelector("#partTable tbody");
    tbody.innerHTML =
      parts
        .map(
          (p) =>
            `<tr data-id="${p.id}"><td>${escapeHtml(
              p.sku
            )}</td><td>${escapeHtml(p.name)}</td><td>${num(
              p.unitPrice
            )}</td><td>${escapeHtml(p.supplier)}</td><td>${
              p.warranty || 0
            }</td><td><button class="small-btn" data-id="${
              p.id
            }" data-action="del-part">Delete</button></td></tr>`
        )
        .join("") || '<tr><td colspan="6">No parts</td></tr>';
    tbody.querySelectorAll('[data-action="del-part"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete part?")) return;
        await myDB.del("parts", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderPartsAndSuppliers();
        await renderDashboard();
      })
    );

    const suppliers = (await myDB.getAll("suppliers")).sort(
      (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    const tbody2 = document.querySelector("#supplierTable tbody");
    tbody2.innerHTML =
      suppliers
        .map(
          (s) =>
            `<tr data-id="${s.id}"><td>${escapeHtml(
              s.name
            )}</td><td>${escapeHtml(s.phone)}</td><td>${
              s.rating || "—"
            }</td><td><button class="small-btn" data-id="${
              s.id
            }" data-action="del-sup">Delete</button></td></tr>`
        )
        .join("") || '<tr><td colspan="4">No suppliers</td></tr>';
    tbody2.querySelectorAll('[data-action="del-sup"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete supplier?")) return;
        await myDB.del("suppliers", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderPartsAndSuppliers();
        await renderDashboard();
      })
    );
  }

  /* ---------- mini static charts on dashboard ---------- */
  async function drawMiniCarSavings() {
    const canvas = document.getElementById("miniCarSavings");
    const carSavings = (await myDB.getAll("carSavings"))
      .slice()
      .reverse()
      .slice(0, 12)
      .reverse();
    const labels = carSavings.map(
      (s) => s.date ? s.date.slice(5, 10) : (s.createdAt || "").slice(5, 10)
    );
    const data = carSavings.map((s) => Number(s.amount) || 0);
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, { color: "#0b6fb2" });
  }
  async function drawMiniFuel() {
    const canvas = document.getElementById("miniFuel");
    const fuel = (await myDB.getAll("fuel"))
      .slice()
      .sort((a, b) => a.odometer - b.odometer)
      .slice(-12);
    const labels = fuel.map((f) => (f.date || "").slice(5, 10));
    const data = fuel.map((f) => Number(f.total) || 0);
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, { color: "#f59e0b" });
  }
  async function drawMiniMaint() {
    const canvas = document.getElementById("miniMaint");
    const maint = (await myDB.getAll("maintenance"))
      .slice()
      .sort(
        (a, b) =>
          new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
      )
      .slice(-12);
    const labels = maint.map((m) => (m.date || "").slice(5, 10));
    const data = maint.map((m) => Number(m.cost) || 0);
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, { color: "#d9534f" });
  }

  /* ---------- side forms ---------- */
  function openSide(title, fragment) {
    sideTitle.textContent = title;
    sideContent.innerHTML = "";
    sideContent.appendChild(fragment);
    sidePanel.classList.add("open");
    sidePanel.setAttribute("aria-hidden", "false");
  }
  function closeSide() {
    sidePanel.classList.remove("open");
    sidePanel.setAttribute("aria-hidden", "true");
    sideContent.innerHTML = "";
  }

  function bindSettings() {
    const tpl = document.getElementById("settingsTemplate").content;
    // fuelUnit value
    (async () => {
      const s = (await myDB.getAll("settings")).find((x) => x.id === "ui") || {
        id: "ui",
      };
      document.getElementById("fuelUnit").value = s.fuelUnit || "kmpl";
    })();
    document
      .getElementById("fuelUnit")
      .addEventListener("change", async (e) => {
        const s = (await myDB.getAll("settings")).find(
          (x) => x.id === "ui"
        ) || { id: "ui" };
        s.fuelUnit = e.target.value;
        await myDB.put("settings", s);
        toast("Fuel unit saved");
      });
    document.getElementById("resetApp").addEventListener("click", async () => {
      if (!confirm("Reset removes ALL data (irreversible). Continue?")) return;
      await myDB.clear("savings");
      await myDB.clear("maintenance");
      await myDB.clear("fuel");
      await myDB.clear("parts");
      await myDB.clear("suppliers");
      await myDB.put("profile", {
        id: "profile",
        plate: "",
        make: "",
        model: "",
        year: "",
        odometer: 0,
        intervalKm: 10000,
        intervalMonths: 6,
        updatedAt: new Date().toISOString(),
      });
      await myDB.put("settings", { id: "ui", fuelUnit: "kmpl" });
      toast("Application reset");
      closeSide();
      await renderAll();
    });
  }

  /* --- open forms for add --- */
  function openSavingsForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideSavings" class="form-grid">
      <div><label>Month</label><input id="sideSavMonth" type="month" required/></div>
      <div><label>Monthly income</label><input id="sideSavIncome" type="number" min="0" step="0.01" required/></div>
      <div><label>Other income</label><input id="sideSavOther" type="number" min="0" step="0.01" value="0"/></div>
      <div><label>Extra</label><input id="sideSavExtra" type="number" min="0" step="0.01" value="0"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">Save</button></div></form>`;
    openSide("Add Savings", frag);
    document
      .getElementById("sideSavings")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const month = document.getElementById("sideSavMonth").value;
        const income =
          Number(document.getElementById("sideSavIncome").value) || 0;
        const other =
          Number(document.getElementById("sideSavOther").value) || 0;
        const extra =
          Number(document.getElementById("sideSavExtra").value) || 0;
        const alloc40 = +(income * 0.4).toFixed(2),
          alloc20 = +(other * 0.2).toFixed(2),
          total = +(alloc40 + alloc20 + extra).toFixed(2);
        const existing = (await myDB.getAll("savings")).find(
          (s) => s.month === month
        );
        if (existing) {
          existing.income = income;
          existing.other = other;
          existing.extra = extra;
          existing.alloc40 = alloc40;
          existing.alloc20 = alloc20;
          existing.total = total;
          existing.updatedAt = new Date().toISOString();
          await myDB.put("savings", existing);
          toast("Savings updated");
        } else
          await myDB.add("savings", {
            month,
            income,
            other,
            extra,
            alloc40,
            alloc20,
            total,
            createdAt: new Date().toISOString(),
          }),
            toast("Saved");
        closeSide();
        await renderSavings();
        await renderDashboard();
      });
  }

  function openCarSavingsForm(editRecord = null) {
    const frag = document.createElement("div");
    const isEdit = !!editRecord;
    const title = isEdit ? "Edit Car Savings" : "Add Car Savings";
    
    frag.innerHTML = `<form id="sideCarSavings" class="form-grid">
      <div><label>Date</label><input id="sideCarSavDate" type="date" required/></div>
      <div><label>Amount (EGP)</label><input id="sideCarSavAmount" type="number" min="0" step="0.01" required/></div>
      <div style="grid-column:1/-1;"><label>Description</label><input id="sideCarSavDescription" type="text" placeholder="e.g., Monthly Income, Side Job, Gift, Bonus" required/></div>
      <div style="grid-column:1/-1;"><label>Notes (Optional)</label><textarea id="sideCarSavNotes" placeholder="Additional details about this savings entry..."></textarea></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">${isEdit ? 'Update' : 'Save'}</button></div></form>`;
    
    openSide(title, frag);
    
    // Set default date to today if not editing
    if (!isEdit) {
      document.getElementById("sideCarSavDate").value = new Date().toISOString().slice(0, 10);
    }
    
    // Populate form if editing
    if (editRecord) {
      document.getElementById("sideCarSavDate").value = editRecord.date || editRecord.createdAt?.slice(0, 10) || "";
      document.getElementById("sideCarSavAmount").value = editRecord.amount || "";
      document.getElementById("sideCarSavDescription").value = editRecord.description || "";
      document.getElementById("sideCarSavNotes").value = editRecord.notes || "";
    }
    
    document
      .getElementById("sideCarSavings")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        try {
          const date = document.getElementById("sideCarSavDate").value;
          const amount = Number(document.getElementById("sideCarSavAmount").value) || 0;
          const description = document.getElementById("sideCarSavDescription").value.trim();
          const notes = document.getElementById("sideCarSavNotes").value.trim();
          
          if (!date || !amount || !description) {
            toast("Please fill in all required fields");
            return;
          }
          
          if (isEdit) {
            // Update existing record
            editRecord.date = date;
            editRecord.amount = amount;
            editRecord.description = description;
            editRecord.notes = notes;
            editRecord.updatedAt = new Date().toISOString();
            await myDB.put("carSavings", editRecord);
            await myDB.carSavings.updateRunningTotal();
            toast("Savings entry updated");
          } else {
            // Add new record
            await myDB.carSavings.add({
              date,
              amount,
              description,
              notes,
              createdAt: new Date().toISOString(),
            });
            toast("Savings entry added");
          }
          
          closeSide();
          await renderCarSavings();
          await renderDashboard();
        } catch (error) {
          console.error("Failed to save car savings:", error);
          toast("Failed to save: " + error.message);
        }
      });
  }

  function openMaintenanceForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideMaint" class="form-grid">
      <div><label>Date</label><input id="sideMDate" type="date" required/></div>
      <div><label>Odometer</label><input id="sideMOdo" type="number" min="0" required/></div>
      <div><label>Type</label><select id="sideMType"><option>Preventive</option><option>Corrective</option><option>Inspection</option></select></div>
      <div><label>Cost</label><input id="sideMCost" type="number" min="0" step="0.01" required/></div>
      <div style="grid-column:1/-1"><label>Parts</label><input id="sideMParts"/></div>
      <div><label>Supplier</label><input id="sideMSupplier"/></div>
      <div><label>Next due (km)</label><input id="sideMNextKm" type="number" min="0"/></div>
      <div><label>Next due (months)</label><input id="sideMNextMo" type="number" min="0"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">Save</button></div></form>`;
    openSide("Add Maintenance", frag);
    document
      .getElementById("sideMaint")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const rec = {
          date:
            document.getElementById("sideMDate").value ||
            new Date().toISOString().slice(0, 10),
          odometer: Number(document.getElementById("sideMOdo").value) || 0,
          type: document.getElementById("sideMType").value,
          cost: Number(document.getElementById("sideMCost").value) || 0,
          parts: document.getElementById("sideMParts").value.trim(),
          supplier: document.getElementById("sideMSupplier").value.trim(),
          nextKm: document.getElementById("sideMNextKm").value
            ? Number(document.getElementById("sideMNextKm").value)
            : null,
          nextMonths: document.getElementById("sideMNextMo").value
            ? Number(document.getElementById("sideMNextMo").value)
            : null,
          createdAt: new Date().toISOString(),
        };
        await myDB.add("maintenance", rec);
        const prof = await myDB.get("profile", "profile");
        if (prof && rec.odometer > (prof.odometer || 0)) {
          prof.odometer = rec.odometer;
          await myDB.put("profile", prof);
        }
        toast("Maintenance saved");
        closeSide();
        await renderMaintenance();
        await renderDashboard();
      });
  }

  function openFuelForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideFuel" class="form-grid">
      <div><label>Date</label><input id="sideFDate" type="date" required/></div>
      <div><label>Odometer</label><input id="sideFOdo" type="number" min="0" required/></div>
      <div><label>Liters</label><input id="sideFLiters" type="number" min="0" step="0.01" required/></div>
      <div><label>Price per L</label><input id="sideFPrice" type="number" min="0" step="0.01" required/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">Save</button></div></form>`;
    openSide("Add Fuel", frag);
    document
      .getElementById("sideFuel")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const liters =
          Number(document.getElementById("sideFLiters").value) || 0;
        const price = Number(document.getElementById("sideFPrice").value) || 0;
        const odo = Number(document.getElementById("sideFOdo").value) || 0;
        const rec = {
          date:
            document.getElementById("sideFDate").value ||
            new Date().toISOString().slice(0, 10),
          odometer: odo,
          liters,
          price,
          total: +(liters * price).toFixed(2),
          createdAt: new Date().toISOString(),
        };
        await myDB.add("fuel", rec);
        const prof = await myDB.get("profile", "profile");
        if (prof && rec.odometer > (prof.odometer || 0)) {
          prof.odometer = rec.odometer;
          await myDB.put("profile", prof);
        }
        toast("Fuel recorded");
        closeSide();
        await renderFuel();
        await renderDashboard();
      });
  }

  function openPartForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sidePart" class="form-grid">
      <div><label>SKU</label><input id="sidePSku"/></div>
      <div><label>Name</label><input id="sidePName"/></div>
      <div><label>Price</label><input id="sidePPrice" type="number" min="0" step="0.01"/></div>
      <div><label>Supplier</label><input id="sidePSupplier"/></div>
      <div><label>Warranty (months)</label><input id="sidePWarranty" type="number" min="0"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">Save</button></div></form>`;
    openSide("Add Part", frag);
    document
      .getElementById("sidePart")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const sku = document.getElementById("sidePSku").value.trim();
        const name = document.getElementById("sidePName").value.trim();
        const price = Number(document.getElementById("sidePPrice").value) || 0;
        const supplier = document.getElementById("sidePSupplier").value.trim();
        const warranty =
          Number(document.getElementById("sidePWarranty").value) || 0;
        const parts = await myDB.getAll("parts");
        const existing = parts.find((p) => p.sku && sku && p.sku === sku);
        if (existing) {
          existing.name = name;
          existing.unitPrice = price;
          existing.supplier = supplier;
          existing.warranty = warranty;
          existing.updatedAt = new Date().toISOString();
          await myDB.put("parts", existing);
          toast("Part updated");
        } else
          await myDB.add("parts", {
            sku,
            name,
            unitPrice: price,
            supplier,
            warranty,
            createdAt: new Date().toISOString(),
          }),
            toast("Part added");
        closeSide();
        await renderPartsAndSuppliers();
        await renderDashboard();
      });
  }

  function openSupplierForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideSupplier" class="form-grid">
      <div><label>Name</label><input id="sideSName" required/></div>
      <div><label>Phone</label><input id="sideSPhone"/></div>
      <div><label>Rating (1-5)</label><input id="sideSRating" type="number" min="1" max="5"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn green" type="submit">Save</button></div></form>`;
    openSide("Add Supplier", frag);
    document
      .getElementById("sideSupplier")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const name = document.getElementById("sideSName").value.trim();
        const phone = document.getElementById("sideSPhone").value.trim();
        const rating =
          Number(document.getElementById("sideSRating").value) || null;
        const sups = await myDB.getAll("suppliers");
        const exist = sups.find(
          (s) => s.name && s.name.toLowerCase() === name.toLowerCase()
        );
        if (exist) {
          exist.phone = phone;
          exist.rating = rating;
          exist.updatedAt = new Date().toISOString();
          await myDB.put("suppliers", exist);
          toast("Supplier updated");
        } else
          await myDB.add("suppliers", {
            name,
            phone,
            rating,
            createdAt: new Date().toISOString(),
          }),
            toast("Supplier added");
        closeSide();
        await renderPartsAndSuppliers();
        await renderDashboard();
      });
  }

  /* utilities */
  function fmt(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }
  function num(n) {
    return (Number(n) || 0).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }
  function escapeHtml(s) {
    if (!s) return "";
    return ("" + s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }
  function clearCanvas(c) {
    if (c && c.getContext)
      c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }
  function nextDueText(r) {
    const parts = [];
    if (r.nextKm) parts.push(`+${r.nextKm} km -> ${r.odometer + r.nextKm} km`);
    if (r.nextMonths)
      parts.push(
        `+${r.nextMonths} mo -> ${fmt(
          new Date(
            new Date(r.date || r.createdAt).setMonth(
              new Date(r.date || r.createdAt).getMonth() + Number(r.nextMonths)
            )
          )
            .toISOString()
            .slice(0, 10)
        )}`
      );
    return parts.join(" / ") || "—";
  }
  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.right = "18px";
    t.style.bottom = "18px";
    t.style.background = "#06202a";
    t.style.color = "#fff";
    t.style.padding = "8px 12px";
    t.style.borderRadius = "8px";
    t.style.zIndex = 9999;
    document.body.appendChild(t);
    setTimeout(() => (t.style.opacity = "0"), 2200);
    setTimeout(() => t.remove(), 2600);
  }
});
