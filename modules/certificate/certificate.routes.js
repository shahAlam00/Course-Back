import express from "express";

import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  duplicateTemplate,
  issueCertificate,
  getIssuedCertificates,
  revokeCertificate,
} from "./certificate.controller.js";

const router = express.Router();

// Template routes
router.post("/templates", createTemplate);
router.get("/templates", getTemplates);
router.get("/templates/:id", getTemplateById);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.patch("/templates/:id/status", toggleTemplateStatus);
router.post("/templates/:id/duplicate", duplicateTemplate);

// Issued certificate routes
router.post("/issue", issueCertificate);
router.get("/issued", getIssuedCertificates);
router.patch("/issued/:id/revoke", revokeCertificate);

export default router;