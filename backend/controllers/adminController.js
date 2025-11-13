const Owner = require("../models/Owner");
const Realtor = require("../models/Realtor");

exports.approveUser = async (req, res) => {
  try {
    if (req.body.userType == "owner") {
      const owner = await Owner.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true }
      );
      res.json(owner);
    } else {
      const realtor = await Realtor.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true }
      );
      res.json(realtor);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    console.log("hieeee",req.params.id);
    if (req.params.userType == "owner") {
      console.log("hieeee2",req.params.id);
      const owner = await Owner.findByIdAndUpdate(
        req.params.id,
        { status: "rejected" },
        { new: true }
      );
      res.json(owner);
    } else {
      const realtor = await Realtor.findByIdAndUpdate(
        req.params.id,
        { status: "rejected" },
        { new: true }
      );
      res.json(realtor);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    console.log(
      (await Owner.countDocuments({ status: "pending" })) +
        Realtor.countDocuments({ status: "pending" })
    );
    const [totalOwners, totalRealtors, pendingOwners, pendingRealtors] =
      await Promise.all([
        Owner.countDocuments(),
        Realtor.countDocuments(),
        Owner.countDocuments({ status: "pending" }),
        Realtor.countDocuments({ status: "pending" }),
      ]);

    res.json({
      totalOwners: totalOwners,
      totalRealtors: totalRealtors,
      pendingApprovals: pendingOwners + pendingRealtors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingRealtors = async (req, res) => {
  try {
    const pendingRealtors = await Realtor.find({ status: "pending" })
      .select("-password") // Exclude sensitive fields
      .sort({ createdAt: -1 });

    res.json(pendingRealtors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingOwners = async (req, res) => {
  try {
    const pendingOwners = await Owner.find({ status: "pending" })
      .select("-password") // Exclude sensitive fields
      .sort({ createdAt: -1 });

    res.json(pendingOwners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllOwners = async (req, res) => {
  try {
    const status = req.query.status || { $in: ["pending", "approved", "rejected"] };
    
    const owners = await Owner.find({ status })
      .select("-password -SSN") // Exclude sensitive information
      .sort({ name: 1 });

    res.json(owners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRealtors = async (req, res) => {
  try {
    const status = req.query.status || { $in: ["pending", "approved", "rejected"] };
    
    const realtors = await Realtor.find({ status })
      .select("-password") // Exclude sensitive information
      .sort({ name: 1 });

    res.json(realtors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOwner = async (req, res) => {
  try {
    const owner = await Owner.findByIdAndDelete(req.params.id);
    
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }
    
    res.json({ message: "Owner deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRealtor = async (req, res) => {
  try {
    const realtor = await Realtor.findByIdAndDelete(req.params.id);
    
    if (!realtor) {
      return res.status(404).json({ message: "Realtor not found" });
    }
    
    res.json({ message: "Realtor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};