const express = require("express");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const vendorRoutes = require("./modules/vendors/vendor.routes");
const purchaseOrderRoutes = require("./modules/purchase-orders/po.routes");
const invoiceRoutes = require("./modules/invoices/invoice.routes");

const app = express();

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log("Vendor Routes Loaded");
app.use("/api/vendors", vendorRoutes);
console.log("Vendor Route Registered");

console.log("Purchase Order Routes Loaded");
app.use("/api/purchase-orders", purchaseOrderRoutes);
console.log("Purchase Order Route Registered");

console.log("Invoice Routes Loaded");
app.use("/api/invoices", invoiceRoutes);
console.log("Invoice Route Registered");

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