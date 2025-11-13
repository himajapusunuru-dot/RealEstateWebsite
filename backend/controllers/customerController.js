const multer = require("multer");
const Property = require("../models/Property");
const Application = require("../models/Application");

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper function for file processing
const processUpload = (req, res, uploadMiddleware) => {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      err ? reject(err) : resolve();
    });
  });
};

exports.getAvailableProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: "available" })
      .populate("owner", "name")
      .populate("realtor", "name");

    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPropertyDetails = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("owner", "name")
      .populate("realtor", "name");

    property
      ? res.json({ success: true, data: property })
      : res.status(404).json({ success: false, message: "Property not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const documentUpload = upload.fields([
      { name: "documents.proofOfEmployment", maxCount: 1 },
      { name: "documents.governmentId", maxCount: 1 },
      { name: "documents.proofOfAddress", maxCount: 1 },
      { name: "documents.bankStatement", maxCount: 1 },
    ]);

    await processUpload(req, res, documentUpload);

    const { customerId } = req.params;
    const { propertyId, firstName, lastName } = req.body;

    const property = await Property.findById(propertyId);
    if (!property || property.status !== "available") {
      return res
        .status(404)
        .json({ success: false, message: "Property unavailable" });
    }

    // Application creation logic
    const application = new Application({
      ...req.body,
      customer: customerId,
      property: propertyId,
      status: "pending",
    });

    await application.save();
    await Property.findByIdAndUpdate(propertyId, {
      $addToSet: { interestedCustomers: customerId },
    });

    res.status(201).json({
      success: true,
      message: "Application submitted",
      data: application,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    console.log(req.params.customerId);
    const applications = await Application.find({
      customer: req.params.customerId,
    })
      .populate("property", "name type location price images status")
      .sort({ createdAt: -1 });

      console.log(applications);
    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const { customerId, applicationId } = req.params;

    const application = await Application.findOneAndDelete({
      _id: applicationId,
      customer: customerId,
      status: "pending",
    });

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    await Property.findByIdAndUpdate(application.property, {
      $pull: { interestedCustomers: customerId },
    });

    res.json({ success: true, message: "Application cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
