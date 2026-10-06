const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

let bookings = load();

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

function all() {
  return bookings;
}

function forDate(date) {
  return bookings.filter((b) => b.date === date && b.status !== "cancelled");
}

function findConflict({ resourceId, date, startHour, endHour, excludeId }) {
  return bookings.find(
    (b) =>
      b.id !== excludeId &&
      b.resourceId === resourceId &&
      b.date === date &&
      b.status !== "cancelled" &&
      startHour < b.endHour &&
      endHour > b.startHour
  );
}

function create(booking) {
  bookings.push(booking);
  persist();
  return booking;
}

function updateStatus(id, status) {
  const b = bookings.find((x) => x.id === id);
  if (!b) return null;
  b.status = status;
  b.updatedAt = new Date().toISOString();
  persist();
  return b;
}

module.exports = { all, forDate, findConflict, create, updateStatus };
