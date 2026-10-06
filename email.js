const nodemailer = require("nodemailer");
const config = require("./config");

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

function fmtHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

async function notifyNewBooking(booking, resource, totalPrice) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"${config.VENUE_NAME}" <${process.env.EMAIL_USER}>`,
      to: config.NOTIFY_EMAIL,
      subject: `New booking: ${resource.name} · ${booking.date} ${fmtHour(booking.startHour)}`,
      text: [
        `${booking.name} just booked ${resource.name}.`,
        ``,
        `Date: ${booking.date}`,
        `Time: ${fmtHour(booking.startHour)} - ${fmtHour(booking.endHour)}`,
        `Phone: ${booking.phone}`,
        `Total: ${config.CURRENCY} ${totalPrice}`,
        `Reference: ${booking.id.slice(0, 8).toUpperCase()}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("Booking notification email failed:", err.message);
  }
}

module.exports = { notifyNewBooking };
