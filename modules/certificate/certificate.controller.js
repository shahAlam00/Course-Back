import Certificate from "../certificate/certificate.model.js";
import User from "../auth/auth.model.js";
import Course from "../course/course.model.js";
import crypto from "crypto";
// =====================================================
// CREATE CERTIFICATE TEMPLATE
// POST /api/certificates/templates
// =====================================================

export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      courseId,
      title,
      subtitle,
      description,
      issuerName,
      signatoryName,
      logo,
      signature,
      background,
      qrEnabled,
      active,
    } = req.body;

    // ---------------------------------------------------
    // Validation
    // ---------------------------------------------------

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name is required",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course is required",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Certificate title is required",
      });
    }

    if (!issuerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Issuer name is required",
      });
    }

    // ---------------------------------------------------
    // Check duplicate template
    // ---------------------------------------------------

    const existingTemplate =
      await Certificate.findOne({
        type: "template",
        name: name.trim(),
        courseId,
      });

    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message:
          "A certificate template with this name already exists for this course",
      });
    }

    // ---------------------------------------------------
    // Create Template
    // ---------------------------------------------------

    const template = await Certificate.create({
      type: "template",

      name: name.trim(),

      courseId,

      title: title.trim(),

      subtitle: subtitle?.trim() || "",

      description:
        description?.trim() || "",

      issuerName: issuerName.trim(),

      signatoryName:
        signatoryName?.trim() || "",

      logo: logo || null,

      signature: signature || null,

      background: background || null,

      qrEnabled:
        typeof qrEnabled === "boolean"
          ? qrEnabled
          : true,

      active:
        typeof active === "boolean"
          ? active
          : true,

      createdBy: req.user?._id || null,

      updatedBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate template created successfully",
      data: template,
    });
  } catch (error) {
    console.error(
      "Create certificate template error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create certificate template",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL CERTIFICATE TEMPLATES
// GET /api/certificates/templates
// =====================================================

export const getTemplates = async (req, res) => {
  try {
    const {
      search,
      active,
      courseId,
    } = req.query;

    // ---------------------------------------------------
    // Build Query
    // ---------------------------------------------------

    const query = {
      type: "template",
    };

    // Search
    if (search?.trim()) {
      query.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          issuerName: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Active filter
    if (active !== undefined) {
      query.active = active === "true";
    }

    // Course filter
    if (courseId) {
      query.courseId = courseId;
    }

    // ---------------------------------------------------
    // Fetch Templates
    // ---------------------------------------------------

    const templates = await Certificate.find(query)
      .populate(
        "courseId",
        "name title"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error(
      "Get certificate templates error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch certificate templates",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE CERTIFICATE TEMPLATE
// GET /api/certificates/templates/:id
// =====================================================

export const getTemplateById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const template = await Certificate.findOne({
      _id: id,
      type: "template",
    }).populate(
      "courseId",
      "name title"
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error(
      "Get certificate template error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch certificate template",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE CERTIFICATE TEMPLATE
// PUT /api/certificates/templates/:id
// =====================================================

export const updateTemplate = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      name,
      courseId,
      title,
      subtitle,
      description,
      issuerName,
      signatoryName,
      logo,
      signature,
      background,
      qrEnabled,
      active,
    } = req.body;

    // ---------------------------------------------------
    // Find Template
    // ---------------------------------------------------

    const template = await Certificate.findOne({
      _id: id,
      type: "template",
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    // ---------------------------------------------------
    // Validation
    // ---------------------------------------------------

    if (name !== undefined && !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name cannot be empty",
      });
    }

    if (courseId !== undefined && !courseId) {
      return res.status(400).json({
        success: false,
        message: "Course cannot be empty",
      });
    }

    if (title !== undefined && !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Certificate title cannot be empty",
      });
    }

    if (
      issuerName !== undefined &&
      !issuerName?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Issuer name cannot be empty",
      });
    }

    // ---------------------------------------------------
    // Duplicate Check
    // ---------------------------------------------------

    if (
      name !== undefined ||
      courseId !== undefined
    ) {
      const duplicateTemplate =
        await Certificate.findOne({
          _id: {
            $ne: id,
          },

          type: "template",

          name:
            name !== undefined
              ? name.trim()
              : template.name,

          courseId:
            courseId !== undefined
              ? courseId
              : template.courseId,
        });

      if (duplicateTemplate) {
        return res.status(409).json({
          success: false,
          message:
            "Another template with this name already exists for this course",
        });
      }
    }

    // ---------------------------------------------------
    // Update Fields
    // ---------------------------------------------------

    if (name !== undefined) {
      template.name = name.trim();
    }

    if (courseId !== undefined) {
      template.courseId = courseId;
    }

    if (title !== undefined) {
      template.title = title.trim();
    }

    if (subtitle !== undefined) {
      template.subtitle =
        subtitle.trim();
    }

    if (description !== undefined) {
      template.description =
        description.trim();
    }

    if (issuerName !== undefined) {
      template.issuerName =
        issuerName.trim();
    }

    if (signatoryName !== undefined) {
      template.signatoryName =
        signatoryName.trim();
    }

    if (logo !== undefined) {
      template.logo = logo;
    }

    if (signature !== undefined) {
      template.signature = signature;
    }

    if (background !== undefined) {
      template.background = background;
    }

    if (qrEnabled !== undefined) {
      template.qrEnabled = qrEnabled;
    }

    if (active !== undefined) {
      template.active = active;
    }

    template.updatedBy =
      req.user?._id || null;

    // ---------------------------------------------------
    // Save
    // ---------------------------------------------------

    await template.save();

    return res.status(200).json({
      success: true,
      message:
        "Certificate template updated successfully",
      data: template,
    });
  } catch (error) {
    console.error(
      "Update certificate template error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update certificate template",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CERTIFICATE TEMPLATE
// DELETE /api/certificates/templates/:id
// =====================================================

export const deleteTemplate = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const template = await Certificate.findOne({
      _id: id,
      type: "template",
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    // ---------------------------------------------------
    // Check if certificates were issued
    // using this template
    // ---------------------------------------------------

    const issuedCount =
      await Certificate.countDocuments({
        type: "issued",
        templateId: id,
      });

    if (issuedCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This template cannot be deleted because certificates have already been issued using it. Disable the template instead.",
      });
    }

    await Certificate.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Certificate template deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete certificate template error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete certificate template",
      error: error.message,
    });
  }
};

// =====================================================
// TOGGLE TEMPLATE STATUS
// PATCH /api/certificates/templates/:id/status
// =====================================================

export const toggleTemplateStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const template = await Certificate.findOne({
      _id: id,
      type: "template",
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    template.active = !template.active;

    template.updatedBy =
      req.user?._id || null;

    await template.save();

    return res.status(200).json({
      success: true,
      message: template.active
        ? "Certificate template enabled successfully"
        : "Certificate template disabled successfully",
      data: template,
    });
  } catch (error) {
    console.error(
      "Toggle certificate template status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update certificate template status",
      error: error.message,
    });
  }
};

// =====================================================
// DUPLICATE CERTIFICATE TEMPLATE
// POST /api/certificates/templates/:id/duplicate
// =====================================================

export const duplicateTemplate = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const originalTemplate =
      await Certificate.findOne({
        _id: id,
        type: "template",
      }).lean();

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    // ---------------------------------------------------
    // Generate unique name
    // ---------------------------------------------------

    let duplicateName =
      `${originalTemplate.name} Copy`;

    let counter = 1;

    while (
      await Certificate.exists({
        type: "template",
        name: duplicateName,
        courseId:
          originalTemplate.courseId,
      })
    ) {
      counter += 1;

      duplicateName =
        `${originalTemplate.name} Copy ${counter}`;
    }

    // ---------------------------------------------------
    // Remove MongoDB fields
    // ---------------------------------------------------

    delete originalTemplate._id;
    delete originalTemplate.createdAt;
    delete originalTemplate.updatedAt;

    // ---------------------------------------------------
    // Create duplicate
    // ---------------------------------------------------

    const duplicate =
      await Certificate.create({
        ...originalTemplate,

        name: duplicateName,

        type: "template",

        active: false,

        createdBy:
          req.user?._id || null,

        updatedBy:
          req.user?._id || null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Certificate template duplicated successfully",
      data: duplicate,
    });
  } catch (error) {
    console.error(
      "Duplicate certificate template error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to duplicate certificate template",
      error: error.message,
    });
  }
};





// ========================================
// ISSUE CERTIFICATE
// ========================================

export const issueCertificate = async (req, res) => {
  try {
    const { studentId, templateId } = req.body;

    // ==============================
    // VALIDATION
    // ==============================

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student is required",
      });
    }

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Certificate template is required",
      });
    }

    // ==============================
    // FIND STUDENT
    // ==============================

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ==============================
    // FIND TEMPLATE
    // ==============================

    const template = await Certificate.findOne({
      _id: templateId,
      type: "template",
      active: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Active certificate template not found",
      });
    }

    // ==============================
    // FIND COURSE
    // ==============================

    const course = await Course.findById(template.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course associated with template not found",
      });
    }

    // ==============================
    // CHECK STUDENT ENROLLMENT
    // ==============================

    const enrollment = student.purchasedCourses?.find(
      (item) =>
        item.course &&
        item.course.toString() === template.courseId.toString()
    );

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is not enrolled in this course",
      });
    }

    // ==============================
    // CHECK EXISTING CERTIFICATE
    // ==============================

    const existingCertificate = await Certificate.findOne({
      type: "issued",
      studentId: student._id,
      templateId: template._id,
      status: "valid",
    });

    if (existingCertificate) {
      return res.status(409).json({
        success: false,
        message: "Certificate already issued to this student",
        data: existingCertificate,
      });
    }

    // ==============================
    // CERTIFICATE ID
    // ==============================

    const certificateId = `TDC-${new Date().getFullYear()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // ==============================
    // VERIFICATION URL
    // ==============================

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-certificate/${certificateId}`;

    // ==============================
    // CREATE CERTIFICATE
    // ==============================

    const certificate = await Certificate.create({
      type: "issued",

      name: template.name,

      courseId: template.courseId,

      title: template.title,
      subtitle: template.subtitle,
      description: template.description,

      issuerName: template.issuerName,
      signatoryName: template.signatoryName,

      logo: template.logo,
      signature: template.signature,
      background: template.background,

      qrEnabled: template.qrEnabled,

      active: true,

      templateId: template._id,

      certificateId,

      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,

      completionDate: enrollment.progress >= 100
        ? new Date()
        : new Date(),

      issuedAt: new Date(),

      status: "valid",

      verificationUrl,

      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate issued successfully",
      data: certificate,
    });
  } catch (error) {
    console.error("Issue certificate error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to issue certificate",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL ISSUED CERTIFICATES
// GET /api/certificates/issued
// =====================================================

export const getIssuedCertificates = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    const query = { type: "issued" };
    if (studentId) query.studentId = studentId;
    if (courseId) query.courseId = courseId;

    const issued = await Certificate.find(query).sort({ issuedAt: -1 });

    return res.status(200).json({
      success: true,
      count: issued.length,
      data: issued,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch issued certificates",
      error: error.message,
    });
  }
};

// =====================================================
// REVOKE ISSUED CERTIFICATE
// PATCH /api/certificates/issued/:id/revoke
// =====================================================

export const revokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Revocation reason is required",
      });
    }

    const cert = await Certificate.findOne({ _id: id, type: "issued" });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: "Issued certificate not found",
      });
    }

    if (cert.status === "revoked") {
      return res.status(400).json({
        success: false,
        message: "Certificate is already revoked",
      });
    }

    cert.status = "revoked";
    cert.revocationReason = reason.trim();
    cert.revokedAt = new Date();
    cert.revokedBy = req.user?._id || null;
    cert.updatedBy = req.user?._id || null;

    await cert.save();

    return res.status(200).json({
      success: true,
      message: "Certificate revoked successfully",
      data: cert,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to revoke certificate",
      error: error.message,
    });
  }
};