const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "pure_inventory_session";

// Allowlist of the two named collaborators. Each has their own passcode so
// access can be revoked/rotated per-person without affecting the other.
const COLLABORATORS = {
  tom: {
    name: "Tom",
    passcode: process.env.TOM_PASSCODE || "tom-cabin-shop"
  },
  lara: {
    name: "Lara",
    passcode: process.env.LARA_PASSCODE || "lara-cabin-shop"
  }
};

function login(userId, passcode) {
  const collaborator = COLLABORATORS[userId];
  if (!collaborator || collaborator.passcode !== passcode) return null;
  const token = jwt.sign({ sub: userId, name: collaborator.name }, JWT_SECRET, {
    expiresIn: "30d"
  });
  return { token, name: collaborator.name, id: userId };
}

function verify(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!COLLABORATORS[payload.sub]) return null;
    return { id: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const user = token && verify(token);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  req.user = user;
  next();
}

module.exports = { login, verify, requireAuth, COOKIE_NAME, COLLABORATORS };
