(function () {
  const STATION_ICON = { ps5: "🎮", pc: "🖥️", netflix: "🎬" };

  function fireConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#ff2e92", "#2ee6d6", "#ffd23f", "#f6f2ff"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.3,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rotation: Math.random() * 360,
      spin: -8 + Math.random() * 16,
    }));

    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (elapsed < 2200) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
    requestAnimationFrame(frame);
  }

  const state = {
    config: null,
    selectedDate: null,
    selectedResourceId: null,
    bookings: [],
    selectedHours: [],
  };

  const el = {
    dateRow: document.getElementById("dateRow"),
    stationGrid: document.getElementById("stationGrid"),
    slotGrid: document.getElementById("slotGrid"),
    slotError: document.getElementById("slotError"),
    summaryBar: document.getElementById("summaryBar"),
    summaryInfo: document.getElementById("summaryInfo"),
    summaryPrice: document.getElementById("summaryPrice"),
    continueBtn: document.getElementById("continueBtn"),
    footerPhone: document.getElementById("footerPhone"),
    heroTagline: document.getElementById("heroTagline"),
    liveTicker: document.getElementById("liveTicker"),
    modal: document.getElementById("modal"),
    modalInner: document.getElementById("modalInner"),
  };

  function fmtHour(h) {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  }

  function dateLabel(dateStr, todayStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.toLocaleDateString("en-US", { weekday: "short" });
    return { dow: dateStr === todayStr ? "Today" : dow, num: d.getDate() };
  }

  async function init() {
    const res = await fetch("/api/config");
    state.config = await res.json();
    el.footerPhone.textContent = state.config.contactPhone;
    if (state.config.tagline) el.heroTagline.textContent = state.config.tagline;

    renderDates();
    renderStations();

    state.selectedDate = state.config.today;
    state.selectedResourceId = state.config.resources[0].id;
    highlightActiveDate();
    highlightActiveStation();
    await loadAvailability();
  }

  function renderDates() {
    const days = [];
    for (let i = 0; i < state.config.bookingWindowDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    el.dateRow.innerHTML = "";
    days.forEach((dateStr) => {
      const { dow, num } = dateLabel(dateStr, state.config.today);
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.dataset.date = dateStr;
      chip.innerHTML = `<span class="dow">${dow}</span><span class="num">${num}</span>`;
      chip.addEventListener("click", async () => {
        state.selectedDate = dateStr;
        highlightActiveDate();
        clearSelection();
        await loadAvailability();
      });
      el.dateRow.appendChild(chip);
    });
  }

  function highlightActiveDate() {
    [...el.dateRow.children].forEach((c) => {
      c.classList.toggle("active", c.dataset.date === state.selectedDate);
    });
  }

  function renderStations() {
    el.stationGrid.innerHTML = "";
    state.config.resources.forEach((r) => {
      const card = document.createElement("div");
      card.className = "station-card";
      card.dataset.id = r.id;
      card.innerHTML = `
        <div class="icon">${STATION_ICON[r.type] || "🎮"}</div>
        <div class="name">${r.name}</div>
        ${r.vibe ? `<div class="vibe">${r.vibe}</div>` : ""}
        <div class="price">${state.config.currency} ${r.pricePerHour}/hr</div>
      `;
      card.addEventListener("click", async () => {
        state.selectedResourceId = r.id;
        highlightActiveStation();
        clearSelection();
        renderSlots();
      });
      el.stationGrid.appendChild(card);
    });
  }

  function highlightActiveStation() {
    [...el.stationGrid.children].forEach((c) => {
      c.classList.toggle("active", c.dataset.id === state.selectedResourceId);
    });
  }

  async function loadAvailability() {
    const res = await fetch(`/api/availability?date=${state.selectedDate}`);
    const data = await res.json();
    state.bookings = data.bookings || [];
    renderSlots();
    updateLiveTicker();
  }

  function updateLiveTicker() {
    const { today, openHour, closeHour } = state.config;
    const nowHour = new Date().getHours();
    if (state.selectedDate !== today || nowHour < openHour || nowHour >= closeHour) {
      el.liveTicker.classList.add("hidden");
      return;
    }
    const liveResources = new Set(
      state.bookings.filter((b) => nowHour >= b.startHour && nowHour < b.endHour).map((b) => b.resourceId)
    );
    if (liveResources.size === 0) {
      el.liveTicker.classList.add("hidden");
      return;
    }
    el.liveTicker.textContent = `🔥 ${liveResources.size} station${liveResources.size > 1 ? "s" : ""} live right now`;
    el.liveTicker.classList.remove("hidden");
  }

  function hourTaken(hour) {
    return state.bookings.some(
      (b) => b.resourceId === state.selectedResourceId && hour >= b.startHour && hour < b.endHour
    );
  }

  function clearSelection() {
    state.selectedHours = [];
    updateSummary();
  }

  function renderSlots() {
    el.slotGrid.innerHTML = "";
    el.slotError.textContent = "";
    const { openHour, closeHour } = state.config;
    for (let h = openHour; h < closeHour; h++) {
      const taken = hourTaken(h);
      const btn = document.createElement("div");
      btn.className = "slot" + (taken ? " taken" : "");
      btn.dataset.hour = h;
      btn.innerHTML = `${fmtHour(h)}<span class="state">${taken ? "Booked" : "Open"}</span>`;
      if (!taken) {
        btn.addEventListener("click", () => toggleHour(h));
      }
      el.slotGrid.appendChild(btn);
    }
    syncSlotSelectionUI();
  }

  function toggleHour(h) {
    const idx = state.selectedHours.indexOf(h);
    if (idx !== -1) {
      state.selectedHours.splice(idx, 1);
      syncSlotSelectionUI();
      updateSummary();
      return;
    }

    const next = [...state.selectedHours, h].sort((a, b) => a - b);
    const isContiguous = next.every((v, i) => i === 0 || v === next[i - 1] + 1);
    const withinLimit = next.length <= state.config.maxSlotsPerBooking;

    if (!isContiguous) {
      state.selectedHours = [h];
      el.slotError.textContent = "";
    } else if (!withinLimit) {
      el.slotError.textContent = `Max ${state.config.maxSlotsPerBooking} hours per booking.`;
      syncSlotSelectionUI();
      return;
    } else {
      state.selectedHours = next;
      el.slotError.textContent = "";
    }
    syncSlotSelectionUI();
    updateSummary();
  }

  function syncSlotSelectionUI() {
    [...el.slotGrid.children].forEach((btn) => {
      const h = Number(btn.dataset.hour);
      btn.classList.toggle("selected", state.selectedHours.includes(h));
    });
  }

  function currentResource() {
    return state.config.resources.find((r) => r.id === state.selectedResourceId);
  }

  function updateSummary() {
    if (state.selectedHours.length === 0) {
      el.summaryBar.classList.add("hidden");
      return;
    }
    const resource = currentResource();
    const start = Math.min(...state.selectedHours);
    const end = Math.max(...state.selectedHours) + 1;
    const total = resource.pricePerHour * (end - start);
    el.summaryInfo.textContent = `${resource.name} · ${fmtHour(start)} – ${fmtHour(end)}`;
    el.summaryPrice.textContent = `${state.config.currency} ${total}`;
    el.summaryBar.classList.remove("hidden");
  }

  function openModal(html) {
    el.modalInner.innerHTML = html;
    el.modal.classList.remove("hidden");
  }
  function closeModal() {
    el.modal.classList.add("hidden");
  }
  el.modal.addEventListener("click", (e) => {
    if (e.target === el.modal) closeModal();
  });

  el.continueBtn.addEventListener("click", () => {
    const resource = currentResource();
    const start = Math.min(...state.selectedHours);
    const end = Math.max(...state.selectedHours) + 1;
    const total = resource.pricePerHour * (end - start);

    openModal(`
      <h3>Confirm booking</h3>
      <p class="sub">${resource.name} · ${fmtHour(start)} – ${fmtHour(end)} · ${state.config.currency} ${total}</p>
      <div class="field">
        <label for="custName">Your name</label>
        <input id="custName" type="text" placeholder="e.g. Sabin Thapa" />
      </div>
      <div class="field">
        <label for="custPhone">Phone number</label>
        <input id="custPhone" type="tel" placeholder="98XXXXXXXX" />
      </div>
      <p class="error-text" id="bookErr"></p>
      <div style="display:flex; gap:10px;">
        <button class="btn-ghost" id="cancelModal" style="flex:1;">Cancel</button>
        <button class="btn-primary" id="confirmBook" style="flex:1;">Confirm</button>
      </div>
    `);

    document.getElementById("cancelModal").addEventListener("click", closeModal);
    document.getElementById("confirmBook").addEventListener("click", submitBooking);
  });

  async function submitBooking() {
    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const errEl = document.getElementById("bookErr");
    if (!name || !phone) {
      errEl.textContent = "Please fill in both fields.";
      return;
    }

    const resource = currentResource();
    const start = Math.min(...state.selectedHours);
    const end = Math.max(...state.selectedHours) + 1;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          date: state.selectedDate,
          startHour: start,
          endHour: end,
          name,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || "Something went wrong.";
        if (res.status === 409) await loadAvailability();
        return;
      }

      openModal(`
        <div class="confirm">
          <div class="big-emoji">🎉</div>
          <p class="sub" style="margin-bottom:0;">You're locked in, ${name.split(" ")[0]}!</p>
          <div class="ref">${data.reference}</div>
          <div class="details">
            ${resource.name}<br/>
            ${fmtHour(start)} – ${fmtHour(end)}, ${state.selectedDate}<br/>
            ${state.config.currency} ${data.totalPrice} · pay at the counter
          </div>
          <button class="btn-primary" id="doneBtn" style="margin-top:16px; width:100%;">See you there</button>
        </div>
      `);
      fireConfetti();
      document.getElementById("doneBtn").addEventListener("click", async () => {
        closeModal();
        clearSelection();
        await loadAvailability();
      });
    } catch {
      errEl.textContent = "Network error. Please try again.";
    }
  }

  init();
})();
