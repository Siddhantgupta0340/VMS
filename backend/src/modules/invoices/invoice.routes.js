const express = require("express");
const router = express.Router();

const {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  patchInvoice,
  deleteInvoice
} = require("./invoice.controller");

router.post("/", createInvoice);
router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.put("/:id", updateInvoice);
router.patch("/:id", patchInvoice);
router.delete("/:id", deleteInvoice);

module.exports = router;
