const Property = require("../models/Property");
const Realtor = require("../models/Realtor");
const Owner = require("../models/Owner");
const multer = require('multer');

// GET /owners/:id/properties
exports.getPropertiesByOwnerId = async (req, res) => {
  const { id } = req.params;

  try {
    const properties = await Property.find({ owner: id })
      .populate("realtor")
      .populate("interestedCustomers");

    if (properties.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No properties found for this owner.",
        data: [],
      });
    }

    res.status(200).json({ success: true, properties });
  } catch (error) {
    console.error("Error fetching properties:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getAllRealtors = async (req, res) => {
  try {
    const realtors = await Realtor.find({status: "approved"}, { _id: 1, firstName: 1, lastName: 1 });

    res.status(200).json({
      success: true,
      data: realtors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch realtors",
      error: error.message,
    });
  }
};

const upload = multer().array('images');

// Helper function to process upload middleware as a Promise
const processUpload = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Create property controller
exports.createProperty = async (req, res) => {
  try {
    const { id } = req.params;
    // Process file uploads with multer
    await processUpload(req, res);

    // Prepare images array - convert each file to base64 data URL
    const images = req.files
      ? req.files.map((file) => {
          // Create a base64 data URL that can be directly used in img src
          return `data:${file.mimetype};base64,${file.buffer.toString(
            "base64"
          )}`;
        })
      : [];

    // Create new property object
    const newProperty = new Property({
      name: req.body.name,
      type: req.body.type,
      bhk: req.body.bhk || undefined,
      area: req.body.area || undefined,
      price: req.body.price,
      location: req.body.location || "",
      realtor: req.body.realtor || undefined,
      owner: id,
      images: images,
      status: "available",
    });

    // Save property to database
    const savedProperty = await newProperty.save();

    // Populate realtor details before sending response
    await savedProperty.populate("realtor", "name email phone");
    console.log(id,)
    // Update owner's properties array
    await Owner.findByIdAndUpdate(
      id,
      { $push: { listedProperties: savedProperty._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: savedProperty,
    });
  } catch (error) {
    console.error("Property creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create property",
      error: error.message,
    });
  }
};
