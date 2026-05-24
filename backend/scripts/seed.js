const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecosystem";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  await User.deleteMany({ username: { $in: ["admin", "testuser"] } });

  const bcrypt = require("bcryptjs");
  const hashedAdmin = await bcrypt.hash("Admin123!", 12);
  const hashedUser = await bcrypt.hash("User123!", 12);

  await User.create([
    { username: "admin", password: hashedAdmin, role: "admin" },
    { username: "testuser", password: hashedUser, role: "user" },
  ]);

  console.log("Seeded 2 users:");
  console.log("  admin / Admin123! (role: admin)");
  console.log("  testuser / User123! (role: user)");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});