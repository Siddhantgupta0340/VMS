const express = require("express");

const authRoutes = require("./modules/auth/auth.routes");

const vendorRoutes = require("./modules/vendors/vendor.routes");

const app = express();

app.use(express.json());

console.log("Vendor Routes Loaded");

app.use("/api/vendors", vendorRoutes);
console.log("Vendor Route Registered");


app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running"
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});