const crypto = require("crypto");

const SECRET = process.env.SESSION_SECRET || "dev-only-secret-set-SESSION_SECRET-in-production";
const SESSION_DAYS = 90;

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function createToken() {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig || "");
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && Date.now() < exp;
}

module.exports = { createToken, verifyToken };
