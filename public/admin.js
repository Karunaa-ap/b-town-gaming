(function () {
  const state = { config: null, token: localStorage.getItem("adminToken") || null, date: null, bookings: [] };

  const el = {
    loginView: document.getElementById("loginView"),
    dashView: document.getElementById("dashView"),
    pw: document.getElementById("pw"),
    loginBtn: document.getElementById("loginBtn"),
    loginErr: document.getElementById("loginErr"),
    logoutBtn: document.getElementById("logoutBtn"),
    dateInput: document.getElementById("dateInput"),
    backupBtn: document.getElementById("backupBtn"),
    grid: document.getElementById("grid"),
    statOccupied: document.getElementById("statOccupied"),
    statOnline: document.getElementById("statOnline"),
    statWalkin: document.getElementById("statWalkin"),
    statRevenue: document.getElementById("statRevenue"),
    modal: document.getElementById("modal"),
    modalInner: document.getElementById("modalInner"),
  };

  function fmtHour(h) {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  }

  function openModal(html) {
    el.modalInner.innerHTML = html;
    el.modal.classList.remove("hidden");
  }
  function closeModal() {
    el.modal.classList.add("hidden");
  }
  el.modal.addEventListener("click", (e) => { if (e.target === el.modal) closeModal(); });

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { "x-admin-token": state.token } : {}),
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired, please log in again.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function logout() {
    state.token = null;
    localStorage.removeItem("adminToken");
    el.loginView.style.display = "block";
    el.dashView.style.display = "none";
    el.logoutBtn.style.display = "none";
  }

  el.logoutBtn.addEventListener("click", logout);

  el.loginBtn.addEventListener("click", async () => {
    el.loginErr.textContent = "";
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: el.pw.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        el.loginErr.textContent = data.error || "Login failed";
        return;
      }
      state.token = data.token;
      localStorage.setItem("adminToken", data.token);
      await enterDashboard();
    } catch {
      el.loginErr.textContent = "Network error.";
    }
  });

  el.pw.addEventListener("keydown", (e) => { if (e.key === "Enter") el.loginBtn.click(); });

  async function enterDashboard() {
    el.loginView.style.display = "none";
    el.dashView.style.display = "block";
    el.logoutBtn.style.display = "inline-block";

    if (!state.config) {
      const res = await fetch("/api/config");
      state.config = await res.json();
    }
    state.date = state.config.today;
    el.dateInput.value = state.date;
    el.dateInput.min = "";
    await loadBookings();
  }

  el.dateInput.addEventListener("change", async () => {
    state.date = el.dateInput.value;
    await loadBookings();
  });

  el.backupBtn.addEventListener("click", async () => {
    const res = await fetch("/api/admin/export", { headers: { "x-admin-token": state.token } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-backup-${state.date || "all"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  async function loadBookings() {
    try {
      const data = await api(`/api/admin/bookings?date=${state.date}`);
      state.bookings = data.bookings;
      renderGrid();
      renderStats();
    } catch (e) {
      if (e.message.includes("expired")) return;
    }
  }

  function bookingAt(resourceId, hour) {
    return state.bookings.find(
      (b) => b.resourceId === resourceId && hour >= b.startHour && hour < b.endHour && b.status !== "cancelled"
    );
  }

  function renderGrid() {
    const { openHour, closeHour, resources } = state.config;
    const hours = [];
    for (let h = openHour; h < closeHour; h++) hours.push(h);

    let html = "<thead><tr><th>Station</th>";
    hours.forEach((h) => (html += `<th>${fmtHour(h)}</th>`));
    html += "</tr></thead><tbody>";

    resources.forEach((r) => {
      html += `<tr><td class="resource-name">${r.name}</td>`;
      hours.forEach((h) => {
        const b = bookingAt(r.id, h);
        if (!b) {
          html += `<td class="cell-empty" data-resource="${r.id}" data-hour="${h}">+</td>`;
        } else if (b.startHour === h) {
          const span = b.endHour - b.startHour;
          const cls = b.status === "walkin" ? "cell-walkin" : b.status === "completed" ? "cell-completed" : "cell-booked";
          html += `<td class="${cls}" colspan="${span}" data-id="${b.id}">${b.status === "walkin" ? "Walk-in" : b.status === "completed" ? "Done" : "Booked"}<br/><small>${b.name}</small></td>`;
        }
      });
      html += "</tr>";
    });
    html += "</tbody>";
    el.grid.innerHTML = html;

    el.grid.querySelectorAll(".cell-empty").forEach((cell) => {
      cell.addEventListener("click", () => openWalkinForm(cell.dataset.resource, Number(cell.dataset.hour)));
    });
    el.grid.querySelectorAll("[data-id]").forEach((cell) => {
      cell.addEventListener("click", () => openBookingDetail(cell.dataset.id));
    });
  }

  function renderStats() {
    const active = state.bookings.filter((b) => b.status !== "cancelled");
    const online = active.filter((b) => b.source === "online").length;
    const walkin = active.filter((b) => b.source === "walkin").length;
    const occupiedHours = active.reduce((sum, b) => sum + (b.endHour - b.startHour), 0);
    const revenue = active.reduce((sum, b) => {
      const r = state.config.resources.find((x) => x.id === b.resourceId);
      return sum + (r ? r.pricePerHour * (b.endHour - b.startHour) : 0);
    }, 0);
    el.statOccupied.textContent = occupiedHours;
    el.statOnline.textContent = online;
    el.statWalkin.textContent = walkin;
    el.statRevenue.textContent = `${state.config.currency} ${revenue}`;
  }

  function openWalkinForm(resourceId, hour) {
    const resource = state.config.resources.find((r) => r.id === resourceId);
    const maxEnd = Math.min(hour + state.config.maxSlotsPerBooking, state.config.closeHour);
    const durationOptions = [];
    for (let end = hour + 1; end <= maxEnd; end++) {
      if (bookingAt(resourceId, end - 1) && end - 1 !== hour) break;
      durationOptions.push(end);
    }

    openModal(`
      <h3>Log walk-in</h3>
      <p class="sub">${resource.name} · starting ${fmtHour(hour)}</p>
      <div class="field">
        <label for="waDuration">Duration</label>
        <select id="waDuration" style="width:100%; background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:10px 12px;">
          ${durationOptions.map((end) => `<option value="${end}">${end - hour} hour${end - hour > 1 ? "s" : ""}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="waName">Name (optional)</label>
        <input id="waName" type="text" placeholder="Walk-in" />
      </div>
      <div class="field">
        <label for="waPhone">Phone (optional)</label>
        <input id="waPhone" type="tel" />
      </div>
      <p class="error-text" id="waErr"></p>
      <div style="display:flex; gap:10px;">
        <button class="btn-ghost" id="waCancel" style="flex:1;">Cancel</button>
        <button class="btn-primary" id="waSave" style="flex:1;">Save</button>
      </div>
    `);

    document.getElementById("waCancel").addEventListener("click", closeModal);
    document.getElementById("waSave").addEventListener("click", async () => {
      const endHour = Number(document.getElementById("waDuration").value);
      const name = document.getElementById("waName").value.trim();
      const phone = document.getElementById("waPhone").value.trim();
      try {
        await api("/api/admin/walkin", {
          method: "POST",
          body: JSON.stringify({ resourceId, date: state.date, startHour: hour, endHour, name, phone }),
        });
        closeModal();
        await loadBookings();
      } catch (e) {
        document.getElementById("waErr").textContent = e.message;
      }
    });
  }

  function openBookingDetail(id) {
    const b = state.bookings.find((x) => x.id === id);
    const resource = state.config.resources.find((r) => r.id === b.resourceId);
    openModal(`
      <h3>${resource.name}</h3>
      <p class="sub">${fmtHour(b.startHour)} – ${fmtHour(b.endHour)} · ${b.source === "online" ? "Online booking" : "Walk-in"}</p>
      <div class="details" style="margin-bottom:16px; font-size:0.9rem; color:var(--text-muted);">
        Name: ${b.name || "—"}<br/>
        Phone: ${b.phone || "—"}<br/>
        Status: ${b.status}
      </div>
      <div style="display:flex; gap:10px;">
        ${b.status !== "completed" ? `<button class="btn-primary" id="markDone" style="flex:1;">Mark done</button>` : ""}
        ${b.status !== "cancelled" ? `<button class="btn-ghost" id="cancelBooking" style="flex:1;">Cancel</button>` : ""}
      </div>
    `);
    const doneBtn = document.getElementById("markDone");
    if (doneBtn) doneBtn.addEventListener("click", async () => {
      await api(`/api/admin/bookings/${id}/complete`, { method: "POST" });
      closeModal();
      await loadBookings();
    });
    const cancelBtn = document.getElementById("cancelBooking");
    if (cancelBtn) cancelBtn.addEventListener("click", async () => {
      await api(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
      closeModal();
      await loadBookings();
    });
  }

  if (state.token) enterDashboard().catch(logout);
})();
