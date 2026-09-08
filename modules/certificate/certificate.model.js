import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    // =====================================================
    // TYPE
    // =====================================================

    type: {
      type: String,
      enum: ["template", "issued"],
      required: true,
      index: true,
    },

    // =====================================================
    // TEMPLATE INFORMATION
    // =====================================================

    name: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    // Course to which this template belongs
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },

    // =====================================================
    // CERTIFICATE CONTENT
    // =====================================================

    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    subtitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    issuerName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    signatoryName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    // =====================================================
    // ASSETS
    // =====================================================

    logo: {
      type: String,
      default: null,
    },

    signature: {
      type: String,
      default: null,
    },

    background: {
      type: String,
      default: null,
    },

    // =====================================================
    // VERIFICATION
    // =====================================================

    qrEnabled: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // TEMPLATE STATUS
    // =====================================================

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // =====================================================
    // ISSUED CERTIFICATE INFORMATION
    // ============================================= ========
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
      index: true,
},
    certificateId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    studentName: {
    type: String,
    trim: true,
   maxlength: 150,
},

studentEmail: {
  type: String,
  trim: true,
  lowercase: true,
},

    completionDate: {
      type: Date,
    },

    issuedAt: {
      type: Date,
    },

    // =====================================================
    // CERTIFICATE STATUS
    // =====================================================

    status: {
      type: String,
      enum: ["valid", "revoked"],
      default: "valid",
      index: true,
    },

    // =====================================================
    // REVOCATION
    // =====================================================

    revocationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    revokedAt: {
      type: Date,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =====================================================
    // PDF
    // =====================================================

    pdfUrl: {
      type: String,
      default: null,
    },

    // =====================================================
    // QR VERIFICATION
    // =====================================================

    verificationUrl: {
      type: String,
      default: null,
    },

    // =====================================================
    // CREATED / UPDATED BY
    // =====================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Certificate = mongoose.model(
  "Certificate",
  certificateSchema
);

export default Certificate;