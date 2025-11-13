const Property = require('../models/Property');
const Owner = require('../models/Owner');
const Application = require('../models/Application');

exports.createProperty = async (req, res) => {
  try {
    const newProperty = new Property({
      ...req.body,
      owner: req.user._id
    });

    await newProperty.save();
    await Owner.findByIdAndUpdate(
      req.user._id,
      { $push: { listedProperties: newProperty._id } }
    );

    res.status(201).json(newProperty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate('owner realtor');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestPriceApproval = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { finalPrice } = req.body;

    // Validate input
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid price'
      });
    }

    // Find the application
    const application = await Application.findById(applicationId)
      .populate({
        path: 'property',
        populate: { path: 'owner' }
      })
      .exec();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.needsPriceConfirmation = false;

    // Check if the price is less than the property's listed price
    const propertyPrice = application.property.price;
    if (finalPrice >= propertyPrice) {
      // If price is not lower, we don't need owner approval
      application.finalPrice = finalPrice;
      application.needsOwnerPriceApproval = false;
      application.priceApproved = true; // Auto-approve when price is higher or equal

      await application.save();

      return res.status(200).json({
        success: true,
        message: 'Price set successfully. No owner approval needed.',
        needsOwnerApproval: false
      });
    }

    // Price is lower, set as needing owner approval
    application.finalPrice = finalPrice;
    application.needsOwnerPriceApproval = true;
    application.priceApproved = null; // Reset any previous decision

    await application.save();

    // In a production app, you might want to send a notification to the owner here

    return res.status(200).json({
      success: true,
      message: 'Price approval request sent to the owner',
      needsOwnerApproval: true
    });

  } catch (error) {
    console.error('Error requesting price approval:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing your request'
    });
  }
}

exports.priceApprovalApplications = async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Find all properties owned by this owner
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(property => property._id);

    // Find applications for these properties that need price approval
    const applications = await Application.find({
      'property': { $in: propertyIds },
      'needsOwnerPriceApproval': true
    })
      .populate('property')
      .populate('customer', 'name email phone')
      .exec();

    return res.status(200).json({
      success: true,
      requests: applications
    });

  } catch (error) {
    console.error('Error fetching price approval requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching price approval requests'
    });
  }
}

exports.approvePrice = async (req, res) => {
  try {
    const { ownerId, applicationId } = req.params;
    const { approved, reason } = req.body;

    // Find the application
    const application = await Application.findById(applicationId)
      .populate('property')
      .exec();

      console.log(application);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify this owner owns the property
    if (application.property.owner.toString() !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this property'
      });
    }

    // Update the application with the owner's decision
    application.needsOwnerPriceApproval = false; // No longer needs approval
    application.priceApproved = approved;

    if (!approved && reason) {
      application.rejectionReason = reason;
    }

    await application.save();

    // In a production app, you might want to send a notification to the realtor here

    return res.status(200).json({
      success: true,
      message: `Price ${approved ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    console.error('Error handling price approval decision:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing your request'
    });
  }
}
