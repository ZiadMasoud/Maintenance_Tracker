/* app.js - main app wiring */
document.addEventListener("DOMContentLoaded", async () => {
  await myDB.initDB();
  // ensure defaults
  if (!(await myDB.get("profile", "profile")).id)
    await myDB.put("profile", { id: "profile", plate: "", odometer: 0 });
  const s = (await myDB.getAll("settings")).find((x) => x.id === "ui") || null;
  if (!s)
    await myDB.put("settings", {
      id: "ui",
      fuelUnit: "kmpl",
      lastPricePerLiter: null,
    });

  // DOM
  const tabs = document.querySelectorAll(".tab");
  const pages = document.querySelectorAll(".page");
  const sidePanel = document.getElementById("sidePanel");
  const sideContent = document.getElementById("sideContent");
  const sideTitle = document.getElementById("sideTitle");

  // navigation
  tabs.forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      tabs.forEach((t) => t.classList.remove("active"));
      e.currentTarget.classList.add("active");
      const page = e.currentTarget.dataset.page;
      pages.forEach((p) => p.classList.remove("active"));
      document.getElementById(page).classList.add("active");
      if (page === "dashboard") await renderDashboard();
      if (page === "savings") await renderSavings();
      if (page === "maintenance") await renderMaintenance();
      if (page === "fuel") await renderFuel();
      if (page === "parts" || page === "suppliers")
        await renderPartsAndSuppliers();
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
    setTimeout(bindSettings, 80);
  });

  // quick add
  document.querySelectorAll('[data-action="open-add"]').forEach((b) =>
    b.addEventListener("click", (e) => {
      const type = e.currentTarget.dataset.type;
      if (type === "savings") openSavingsForm();
      if (type === "maintenance") openMaintenanceForm();
      if (type === "fuel") openFuelForm();
      if (type === "part") openPartForm();
      if (type === "supplier") openSupplierForm();
    })
  );
  document.getElementById("sideClose").addEventListener("click", closeSide);

  // initial render
  await renderAll();

  /* ---------- RENDERERS ---------- */
  async function renderAll() {
    await renderDashboard();
    await renderSavings();
    await renderMaintenance();
    await renderFuel();
    await renderPartsAndSuppliers();
  }

  async function renderDashboard() {
    const profile = await myDB.get("profile", "profile").catch(() => ({}));
    const savings = await myDB.getAll("savings");
    const maintenance = await myDB.getAll("maintenance");
    const fuel = await myDB.getAll("fuelLogs");
    const parts = await myDB.getAll("parts");

    const totalSaved = savings.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const thisYear = new Date().getFullYear();
    const totalSpentThisYear =
      maintenance
        .filter((m) => new Date(m.date).getFullYear() === thisYear)
        .reduce(
          (s, m) =>
            s +
            (m.services
              ? m.services.reduce((ss, sr) => ss + (Number(sr.cost) || 0), 0)
              : 0),
          0
        ) +
      fuel
        .filter((f) => new Date(f.date).getFullYear() === thisYear)
        .reduce((s, f) => s + (Number(f.amountSpent) || 0), 0) +
      parts
        .filter((p) => new Date(p.createdAt || 0).getFullYear() === thisYear)
        .reduce((s, p) => s + (Number(p.unitPrice) || 0), 0);

    // fuel average L/100km (convert)
    let fuelAvgText = "-";
    const fuelSorted = fuel.slice().sort((a, b) => a.odometer - b.odometer);
    const kml = [];
    for (let i = 1; i < fuelSorted.length; i++) {
      const prev = fuelSorted[i - 1],
        cur = fuelSorted[i];
      const km = cur.odometer - prev.odometer;
      if (km > 0 && cur.liters) kml.push(km / cur.liters);
    }
    if (kml.length) {
      const avgKPL = kml.reduce((s, x) => s + x, 0) / kml.length;
      const l100 = (100 / avgKPL).toFixed(2);
      fuelAvgText = `${l100} L/100km`;
    }

    const cards = document.getElementById("dashCards");
    cards.innerHTML = `<div><h4>Total saved</h4><p>EGP ${num(
      totalSaved
    )}</p></div>
      <div><h4>Spent this year</h4><p>EGP ${num(totalSpentThisYear)}</p></div>
      <div><h4>Fuel avg</h4><p>${fuelAvgText}</p></div>
      <div><h4>Odometer</h4><p>${num(profile.odometer || 0)} km</p></div>`;

    // recent activity (last 5)
    const recent = [];
    const sortedMaint = (await myDB.getAll("maintenance")).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const sortedFuel = (await myDB.getAll("fuelLogs")).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const sortedSav = (await myDB.getAll("savings")).sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
    if (sortedMaint[0])
      recent.push({
        type: "Maintenance",
        date: sortedMaint[0].date,
        text: `Visit - ${sortedMaint[0].supplierName || "—"}`,
      });
    if (sortedFuel[0])
      recent.push({
        type: "Fuel",
        date: sortedFuel[0].date,
        text: `Spent ${num(sortedFuel[0].amountSpent)} EGP`,
      });
    if (sortedSav[0])
      recent.push({
        type: "Savings",
        date: sortedSav[0].date || sortedSav[0].createdAt,
        text: `Saved ${num(sortedSav[0].amount)} EGP`,
      });
    const recentList = document.getElementById("recentList");
    recentList.innerHTML = recent.length
      ? recent
          .map(
            (r) =>
              `<div class="upcoming-card"><strong>${escapeHtml(
                r.type
              )}</strong><div>${fmt(
                r.date
              )}</div><div style="margin-top:6px">${escapeHtml(
                r.text
              )}</div></div>`
          )
          .join("")
      : "<p>No recent activity</p>";

    // upcoming service countdowns
    const upcoming = computeUpcoming(await myDB.getAll("maintenance"), profile);
    // append upcoming entries to recentList (first panel?) We'll show them in same recentList if exist
    if (upcoming.length) {
      recentList.innerHTML +=
        `<div style="margin-top:10px"><h4>Upcoming Services</h4>` +
        upcoming
          .map(
            (u) =>
              `<div class="upcoming-card" style="border-left:4px solid ${
                u.color
              }"><strong>${escapeHtml(u.label)}</strong><div>${escapeHtml(
                u.hint
              )}</div></div>`
          )
          .join("") +
        `</div>`;
    }

    // mini charts
    drawMiniSavings();
    drawMiniFuel();
    drawMiniMaint();
  }

  function computeUpcoming(maintenance, profile) {
    const now = new Date();
    const currentOdo = profile.odometer || 0;
    const out = [];
    maintenance.forEach((m) => {
      let kmLeft = null,
        daysLeft = null;
      if (m.nextServiceKm) {
        const nextKm = m.nextServiceKm;
        kmLeft = nextKm - currentOdo;
      }
      if (m.nextServiceDate) {
        const nextDate = new Date(m.nextServiceDate);
        daysLeft = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
      }
      const imminence =
        (kmLeft !== null ? kmLeft : 999999) +
        (daysLeft !== null ? daysLeft : 0);
      let color = "#16a34a";
      if (
        (daysLeft !== null && daysLeft <= 7) ||
        (kmLeft !== null && kmLeft < 200)
      )
        color = "#d97706";
      if (
        (daysLeft !== null && daysLeft < 0) ||
        (kmLeft !== null && kmLeft < 0)
      )
        color = "#dc2626";
      const label = `${
        m.services && m.services.length
          ? m.services.map((s) => s.name).join(", ")
          : "Service"
      } @ ${m.odometer} km`;
      const hint = `${kmLeft !== null ? `${kmLeft} km left. ` : ""}${
        daysLeft !== null ? `${daysLeft} days left.` : ""
      }`;
      out.push({ id: m.id, label, hint, imminence, color });
    });
    return out.sort((a, b) => a.imminence - b.imminence).slice(0, 6);
  }

  /* ---------- Savings ---------- */
  async function renderSavings() {
    const rows = (await myDB.getAll("savings")).sort((a, b) =>
      (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || "")
    );
    const tbody = document.querySelector("#savingsTable tbody");
    tbody.innerHTML =
      rows
        .map(
          (r) =>
            `<tr data-id="${r.id}"><td>${escapeHtml(
              r.month || (r.date || "").slice(0, 7)
            )}</td><td>${num(r.income || 0)}</td><td>${num(
              r.other || 0
            )}</td><td>${num(r.alloc40 || 0)}</td><td>${num(
              r.alloc20 || 0
            )}</td><td>${num(r.extra || 0)}</td><td>${num(
              r.amount || r.total || 0
            )}</td><td><button class="small-btn" data-id="${
              r.id
            }" data-action="del-sav">Delete</button></td></tr>`
        )
        .join("") || '<tr><td colspan="8">No records</td></tr>';
    tbody.querySelectorAll('[data-action="del-sav"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete savings entry?")) return;
        await myDB.del("savings", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderSavings();
        await renderDashboard();
      })
    );
    const total = rows.reduce(
      (s, x) => s + Number(x.amount || x.total || 0),
      0
    );
    document.getElementById(
      "savingsSummary"
    ).innerHTML = `<strong>Total saved:</strong> EGP ${num(total)}`;
  }

  document
    .getElementById("savingsForm")
    .addEventListener("submit", async (ev) => {
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
        existing.amount = total;
        existing.updatedAt = new Date().toISOString();
        await myDB.put("savings", existing);
        toast("Saved");
      } else
        await myDB.add("savings", {
          month,
          income,
          other,
          extra,
          alloc40,
          alloc20,
          amount: total,
          createdAt: new Date().toISOString(),
          date: new Date().toISOString(),
        }),
          toast("Saved");
      ev.target.reset();
      await renderSavings();
      await renderDashboard();
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

  /* ---------- Maintenance ---------- */
  async function renderMaintenance() {
    const rows = (await myDB.getAll("maintenance", "date")).sort((a, b) =>
      (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || "")
    );
    const tbody = document.querySelector("#maintTable tbody");
    tbody.innerHTML =
      rows
        .map(
          (r) =>
            `<tr data-id="${r.id}"><td>${fmt(r.date)}</td><td>${
              r.odometer
            }</td><td>${escapeHtml(r.type || "Visit")}</td><td>${num(
              r.services
                ? r.services.reduce((s, x) => s + (Number(x.cost) || 0), 0)
                : r.cost || 0
            )}</td><td>${escapeHtml(
              (r.services || []).map((s) => s.name).join(", ")
            )}</td><td>${
              r.supplierName
                ? `<a href="${escapeHtml(
                    r.supplierLocation || "#"
                  )}" target="_blank">${escapeHtml(r.supplierName)}</a>`
                : ""
            }</td><td>${escapeHtml(
              (r.nextServiceDate ? r.nextServiceDate : "") +
                (r.nextServiceKm ? " / " + r.nextServiceKm + " km" : "")
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

  /* ---------- Fuel ---------- */
  async function renderFuel() {
    const rows = (await myDB.getAll("fuelLogs", "date")).sort(
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
          }</td><td>${num(r.amountSpent)}</td><td>${num(
            r.pricePerLiter
          )}</td><td>${num(r.liters)}</td><td>${num(
            r.total || r.amountSpent
          )}</td><td>${k}</td><td><button class="small-btn" data-id="${
            r.id
          }" data-action="del-fuel">Delete</button></td></tr>`;
        })
        .join("") || '<tr><td colspan="8">No records</td></tr>';
    tbody.querySelectorAll('[data-action="del-fuel"]').forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete fuel record?")) return;
        await myDB.del("fuelLogs", Number(e.currentTarget.dataset.id));
        toast("Deleted");
        await renderFuel();
        await renderDashboard();
      })
    );
  }

  /* ---------- Parts & Suppliers ---------- */
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
    if (!tbody2) {
      // suppliers table may not exist (if user didn't open tab)
      // try to create placeholder if missing
    } else {
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
  }

  /* ---------- MINI CHARTS ---------- */
  async function drawMiniSavings() {
    const canvas = document.getElementById("miniSave");
    const savings = (await myDB.getAll("savings"))
      .slice()
      .reverse()
      .slice(0, 12)
      .reverse();
    const labels = savings.map((s) => s.month || (s.date || "").slice(0, 7));
    const data = savings.map((s) => Number(s.amount || s.total || 0));
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, "#0b6fb2");
  }
  async function drawMiniFuel() {
    const canvas = document.getElementById("miniFuel");
    const fuel = (await myDB.getAll("fuelLogs"))
      .slice()
      .sort((a, b) => a.odometer - b.odometer)
      .slice(-12);
    const labels = fuel.map((f) => (f.date || "").slice(5, 10));
    const data = fuel.map((f) => Number(f.amountSpent || 0));
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, "#f59e0b");
  }
  async function drawMiniMaint() {
    const canvas = document.getElementById("miniMaint");
    const maint = (await myDB.getAll("maintenance"))
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-12);
    const labels = maint.map((m) => (m.date || "").slice(5, 10));
    const data = maint.map((m) =>
      m.services
        ? m.services.reduce((s, x) => s + (Number(x.cost) || 0), 0)
        : Number(m.cost) || 0
    );
    if (!labels.length) {
      clearCanvas(canvas);
      return;
    }
    drawLine(canvas, labels, data, "#d9534f");
  }

  /* ---------- SIDE FORMS ---------- */
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
    const s = (async () =>
      (await myDB.getAll("settings")).find((x) => x.id === "ui"))();
    s.then((u) => {
      if (u) document.getElementById("fuelUnit").value = u.fuelUnit || "kmpl";
    });
    document
      .getElementById("fuelUnit")
      .addEventListener("change", async (e) => {
        const u = (await myDB.getAll("settings")).find(
          (x) => x.id === "ui"
        ) || { id: "ui" };
        u.fuelUnit = e.target.value;
        await myDB.put("settings", u);
        toast("Fuel unit saved");
      });
    document.getElementById("resetApp").addEventListener("click", async () => {
      if (!confirm("Reset all data? This cannot be undone.")) return;
      await myDB.clear("savings");
      await myDB.clear("fuelLogs");
      await myDB.clear("maintenance");
      await myDB.clear("parts");
      await myDB.clear("suppliers");
      await myDB.put("profile", { id: "profile", plate: "", odometer: 0 });
      await myDB.put("settings", { id: "ui", fuelUnit: "kmpl" });
      toast("App reset");
      closeSide();
      await renderAll();
    });
  }

  /* ---------- OPEN FORM FUNCTIONS (add) ---------- */
  function openSavingsForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideSavings" class="form-grid">
      <div><label>Month</label><input id="sideSavMonth" type="month" required/></div>
      <div><label>Monthly income</label><input id="sideSavIncome" type="number" min="0" step="0.01" required/></div>
      <div><label>Other income</label><input id="sideSavOther" type="number" min="0" step="0.01" value="0"/></div>
      <div><label>Extra</label><input id="sideSavExtra" type="number" min="0" step="0.01" value="0"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn add" type="submit">Save</button></div></form>`;
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
          existing.amount = total;
          existing.updatedAt = new Date().toISOString();
          await myDB.put("savings", existing);
          toast("Updated");
        } else
          await myDB.add("savings", {
            month,
            income,
            other,
            extra,
            alloc40,
            alloc20,
            amount: total,
            createdAt: new Date().toISOString(),
            date: new Date().toISOString(),
          }),
            toast("Saved");
        closeSide();
        await renderSavings();
        await renderDashboard();
      });
  }

  function openMaintenanceForm() {
    const frag = document.createElement("div");
    frag.innerHTML = `<form id="sideMaint" class="form-grid">
      <div><label>Date</label><input id="sideMDate" type="date" required/></div>
      <div><label>Odometer</label><input id="sideMOdo" type="number" min="0" required/></div>
      <div><label>Supplier name</label><input id="sideMSupplier"/></div>
      <div><label>Supplier location (link)</label><input id="sideMSupplierLoc"/></div>
      <div style="grid-column:1/-1"><label>Services (add rows)</label><div id="serviceList"></div><button id="addService" type="button" class="btn">Add service line</button></div>
      <div><label>Next service date</label><input id="sideMNextDate" type="date"/></div>
      <div><label>Next service km</label><input id="sideMNextKm" type="number" min="0"/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn add" type="submit">Save</button></div></form>`;
    openSide("Add Maintenance", frag);

    // add first service row
    const serviceList = sideContent.querySelector("#serviceList");
    function addServiceRow(data = { name: "", cost: "", notes: "" }) {
      const idx = serviceList.children.length;
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr 120px 1fr";
      row.style.gap = "8px";
      row.style.marginTop = "6px";
      row.innerHTML = `<input class="svcName" placeholder="Service name" value="${escapeHtml(
        data.name
      )}"/><input class="svcCost" type="number" min="0" step="0.01" placeholder="Cost" value="${escapeHtml(
        data.cost
      )}"/><input class="svcNotes" placeholder="Notes" value="${escapeHtml(
        data.notes
      )}"/><button class="btn danger svcRemove" type="button">Remove</button>`;
      serviceList.appendChild(row);
      row
        .querySelector(".svcRemove")
        .addEventListener("click", () => row.remove());
    }
    addServiceRow();

    sideContent
      .querySelector("#addService")
      .addEventListener("click", () => addServiceRow());

    document
      .getElementById("sideMaint")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const date =
          document.getElementById("sideMDate").value ||
          new Date().toISOString().slice(0, 10);
        const odometer = Number(document.getElementById("sideMOdo").value) || 0;
        const supplierName = document
          .getElementById("sideMSupplier")
          .value.trim();
        const supplierLocation = document
          .getElementById("sideMSupplierLoc")
          .value.trim();
        const nextServiceDate =
          document.getElementById("sideMNextDate").value || null;
        const nextServiceKm = document.getElementById("sideMNextKm").value
          ? Number(document.getElementById("sideMNextKm").value)
          : null;
        const services = [];
        serviceList.querySelectorAll("div").forEach((r) => {
          const name = r.querySelector(".svcName").value.trim();
          const cost = Number(r.querySelector(".svcCost").value) || 0;
          const notes = r.querySelector(".svcNotes").value.trim();
          if (name) services.push({ name, cost, notes });
        });
        await myDB.add("maintenance", {
          date,
          odometer,
          supplierName,
          supplierLocation,
          services,
          nextServiceDate,
          nextServiceKm,
          createdAt: new Date().toISOString(),
        });
        // update profile odometer if bigger
        const prof = await myDB.get("profile", "profile");
        if (prof && odometer > (prof.odometer || 0)) {
          prof.odometer = odometer;
          await myDB.put("profile", prof);
        }
        toast("Saved");
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
      <div><label>Amount spent (EGP)</label><input id="sideFAmount" type="number" min="0" step="0.01" required/></div>
      <div><label>Price per liter (EGP)</label><input id="sideFPrice" type="number" min="0" step="0.01" required/></div>
      <div><label>Calculated liters</label><input id="sideFLiters" type="number" min="0" step="0.01" readonly/></div>
      <div class="form-actions" style="grid-column:1/-1"><button class="btn add" type="submit">Save</button></div></form>`;
    openSide("Add Fuel", frag);

    // prefill last price
    (async () => {
      const s = (await myDB.getAll("settings")).find((x) => x.id === "ui");
      if (s && s.lastPricePerLiter)
        document.getElementById("sideFPrice").value = s.lastPricePerLiter;
    })();

    const amt = sideContent.querySelector("#sideFAmount");
    const price = sideContent.querySelector("#sideFPrice");
    const litersInput = sideContent.querySelector("#sideFLiters");
    function recalc() {
      const a = Number(amt.value) || 0;
      const p = Number(price.value) || 0;
      litersInput.value = p > 0 ? (a / p).toFixed(2) : "";
    }
    amt.addEventListener("input", recalc);
    price.addEventListener("input", recalc);

    document
      .getElementById("sideFuel")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const date =
          document.getElementById("sideFDate").value ||
          new Date().toISOString().slice(0, 10);
        const odometer = Number(document.getElementById("sideFOdo").value) || 0;
        const amountSpent =
          Number(document.getElementById("sideFAmount").value) || 0;
        const pricePerLiter =
          Number(document.getElementById("sideFPrice").value) || 0;
        const liters =
          pricePerLiter > 0 ? +(amountSpent / pricePerLiter).toFixed(2) : 0;
        await myDB.add("fuelLogs", {
          date,
          odometer,
          amountSpent,
          pricePerLiter,
          liters,
          total: amountSpent,
          createdAt: new Date().toISOString(),
        });
        // save last price
        const u = (await myDB.getAll("settings")).find(
          (x) => x.id === "ui"
        ) || { id: "ui" };
        u.lastPricePerLiter = pricePerLiter;
        await myDB.put("settings", u);
        // update profile odo
        const prof = await myDB.get("profile", "profile");
        if (prof && odometer > (prof.odometer || 0)) {
          prof.odometer = odometer;
          await myDB.put("profile", prof);
        }
        toast("Saved");
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
      <div class="form-actions" style="grid-column:1/-1"><button class="btn add" type="submit">Save</button></div></form>`;
    openSide("Add Part", frag);
    document
      .getElementById("sidePart")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const sku = document.getElementById("sidePSku").value.trim();
        const name = document.getElementById("sidePName").value.trim();
        const unitPrice =
          Number(document.getElementById("sidePPrice").value) || 0;
        const supplier = document.getElementById("sidePSupplier").value.trim();
        const warranty =
          Number(document.getElementById("sidePWarranty").value) || 0;
        await myDB.add("parts", {
          sku,
          name,
          unitPrice,
          supplier,
          warranty,
          createdAt: new Date().toISOString(),
        });
        toast("Saved");
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
      <div class="form-actions" style="grid-column:1/-1"><button class="btn add" type="submit">Save</button></div></form>`;
    openSide("Add Supplier", frag);
    document
      .getElementById("sideSupplier")
      .addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const name = document.getElementById("sideSName").value.trim();
        const phone = document.getElementById("sideSPhone").value.trim();
        const rating =
          Number(document.getElementById("sideSRating").value) || null;
        await myDB.add("suppliers", {
          name,
          phone,
          rating,
          createdAt: new Date().toISOString(),
        });
        toast("Saved");
        closeSide();
        await renderPartsAndSuppliers();
        await renderDashboard();
      });
  }

  /* ---------- UTIL ---------- */
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
    setTimeout(() => (t.style.opacity = "0"), 2000);
    setTimeout(() => t.remove(), 2400);
  }
});
