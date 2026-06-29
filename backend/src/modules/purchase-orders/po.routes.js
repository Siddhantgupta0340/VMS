const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();

const uploadDir = path.join(__dirname, "../../uploads/purchase-orders");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${safeSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

const {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  patchPurchaseOrder,
  deletePurchaseOrder
} = require("./po.controller");

router.post("/", upload.single("purchaseOrderDocument"), createPurchaseOrder);
router.get("/", listPurchaseOrders);
router.get("/:id", getPurchaseOrder);
router.put("/:id", upload.single("purchaseOrderDocument"), updatePurchaseOrder);
router.patch("/:id", upload.single("purchaseOrderDocument"), patchPurchaseOrder);
router.delete("/:id", deletePurchaseOrder);

module.exports = router;
