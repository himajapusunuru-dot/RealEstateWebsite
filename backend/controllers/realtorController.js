const Property = require("../models/Property");
const Application = require("../models/Application");
const Customer = require("../models/Customer");
const Owner = require("../models/Owner");

exports.getManagedProperties = async (req, res) => {
  try {
    console.log(req);
    const properties = await Property.find({ realtor: req.user.id })
      .populate("owner", "firstName lastName email phone")
      .populate("interestedCustomers", "firstName lastName email");

    res.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching managed properties",
    });
  }
};

exports.getPropertyApplications = async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      realtor: req.user.id,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or not managed by you",
      });
    }

    const applications = await Application.find({ property: property._id })
      .populate("customer", "firstName LastName email phone")
      .populate("property", "firstName LastName price address")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        property: {
          _id: property._id,
          name: property.name,
          price: property.price,
          address: property.address,
        },
        applications,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching property applications",
    });
  }
};

exports.getAllApplications = async (req, res) => {
  try {
    // Get all properties managed by the realtor
    const managedProperties = await Property.find({
      realtor: req.user.id,
    }).select("_id");

    const applications = await Application.find({
      property: { $in: managedProperties.map((p) => p._id) },
    })
      .populate("customer", "firstName lastName email phone")
      .populate("property", "firstName lastName price");

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
    });
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const application = await Application.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending",
        property: { $in: await getRealtorProperties(req.user.id) },
      },
      {
        status: "approved",
        needsPriceConfirmation: true
      },
      { new: true }
    ).populate("property", "name price");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or not pending",
      });
    }

    res.json({
      success: true,
      message: "Application approved",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving application",
    });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const application = await Application.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending",
        property: { $in: await getRealtorProperties(req.user.id) },
      },
      { status: "rejected" },
      { new: true }
    ).populate("property", "name price");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or not pending",
      });
    }

    res.json({
      success: true,
      message: "Application rejected",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting application",
    });
  }
};

exports.getAssociatedCustomers = async (req, res) => {
  try {
    const applications = await Application.find({
      property: { $in: await getRealtorProperties(req.user.id) },
    }).distinct("customer");

    const customers = await Customer.find({
      _id: { $in: applications },
    }).select("firstName lastName email phone createdAt");

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching associated customers",
    });
  }
};

exports.getAssociatedOwners = async (req, res) => {
  try {
    const properties = await Property.find({
      realtor: req.user.id,
    }).distinct("owner");

    const owners = await Owner.find({
      _id: { $in: properties },
    }).select("firstName lastName email phone status");

    res.json({
      success: true,
      data: owners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching property owners",
    });
  }
};

// Helper function to get realtor's managed property IDs
const getRealtorProperties = async (realtorId) => {
  const properties = await Property.find({ realtor: realtorId }).select("_id");
  return properties.map((p) => p._id);
};
