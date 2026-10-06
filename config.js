const VENUE_NAME = "B-Town Gaming";
const TAGLINE = "Butwal's home base for boss fights & chill nights";
const CITY = "Butwal";
const CONTACT_PHONE = "9841346938";
const CURRENCY = "NPR";

const OPEN_HOUR = 12;
const CLOSE_HOUR = 20;
const MAX_SLOTS_PER_BOOKING = 4;
const BOOKING_WINDOW_DAYS = 14;

const RESOURCES = [
  { id: "ps5-1", name: "PS5 Station 1", type: "ps5", pricePerHour: 200, vibe: "Boss-fight ready" },
  { id: "ps5-2", name: "PS5 Station 2", type: "ps5", pricePerHour: 200, vibe: "Co-op approved" },
  { id: "pc-1", name: "PC Rig 1", type: "pc", pricePerHour: 150, vibe: "Clutch-or-ragequit" },
  { id: "pc-2", name: "PC Rig 2", type: "pc", pricePerHour: 150, vibe: "Frame-perfect" },
  { id: "netflix", name: "Netflix & Chill Room", type: "netflix", pricePerHour: 350, seats: 2, vibe: "No judgment, just snacks" },
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "karunapandey4845@gmail.com";

module.exports = {
  VENUE_NAME,
  TAGLINE,
  CITY,
  CONTACT_PHONE,
  CURRENCY,
  OPEN_HOUR,
  CLOSE_HOUR,
  MAX_SLOTS_PER_BOOKING,
  BOOKING_WINDOW_DAYS,
  RESOURCES,
  ADMIN_PASSWORD,
  NOTIFY_EMAIL,
};
