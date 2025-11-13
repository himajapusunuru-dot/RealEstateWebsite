const Contract = require("../models/Contract");
const Property = require("../models/Property");
const Customer = require("../models/Customer");
const Owner = require("../models/Owner");
const Realtor = require("../models/Realtor");

// Create contract (Realtor only)
exports.createContract = async (req, res) => {
  try {
    const realtor = await Realtor.findById(req.user.id);
    if (!realtor) {
      return res.status(403).json({
        success: false,
        message: "Only realtors can create contracts",
      });
    }

    const {
      type,
      property,
      customer,
      owner,
      startDate,
      endDate,
      closingDate,
      salePrice,
      depositAmount,
      paymentTerms,
    } = req.body;

    if (!type || !property || !customer || !owner || !startDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    
    console.log("proppp",property,customer,owner)
    const [propertyDoc, customerDoc, ownerDoc] = await Promise.all([
      Property.findById(property),
      Customer.findById(customer),
      Owner.findById(owner),
    ]);
    console.log("hiieee")

    if (!propertyDoc || !customerDoc || !ownerDoc) {
      return res.status(404).json({
        success: false,
        message: "Invalid property, customer, or owner",
      });
    }


    const newContract = new Contract({
      type,
      status: "pending_customer",
      contractDate: new Date(),
      startDate,
      endDate,
      closingDate,
      salePrice,
      depositAmount,
      paymentTerms,
      owner,
      customer,
      realtor: req.user.id,
      property,
      signatures: { owner: null, customer: null },
    });

    await newContract.save();
    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: newContract,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get contracts with common population options
const getContracts = async (query, population) => {
  return Contract.find(query)
    .populate("property", "name type location price status")
    .populate("owner", "firstName lastName email phone")
    .populate("customer", "firstName lastName email phone")
    .populate("realtor", "firstName lastName");
};

// Get realtor's contracts
exports.getRealtorContracts = async (req, res) => {
  try {
    const contracts = await getContracts({ realtor: req.user.id });
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get customer's contracts
exports.getCustomerContracts = async (req, res) => {
  try {
    if (
      req.user.id !== req.params.customerId &&
      !["admin", "realtor"].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const contracts = await getContracts({ customer: req.params.customerId });
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get owner's contracts
exports.getOwnerContracts = async (req, res) => {
  try {
    if (
      req.user.id !== req.params.ownerId &&
      !["admin", "realtor"].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const contracts = await getContracts({ owner: req.params.ownerId });
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Common contract access validation
const validateContractAccess = async (contractId, userId) => {
  const contract = await Contract.findById(contractId)
    .populate("property", "name type location price status")
    .populate("owner", "name email phone")
    .populate("customer", "name email phone")
    .populate("realtor", "name");

  if (!contract)
    return { error: { status: 404, message: "Contract not found" } };

  if (
    contract.owner.toString() !== userId &&
    contract.customer.toString() !== userId &&
    contract.realtor.toString() !== userId &&
    req.user.role !== "admin"
  ) {
    return { error: { status: 403, message: "Access denied" } };
  }

  return { contract };
};

// Get contract by ID
exports.getContractById = async (req, res) => {
  try {
    const { contract, error } = await validateContractAccess(
      req.params.contractId,
      req.user.id
    );
    if (error)
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const validateLoanDetails = (loanDetails) => {
  const requiredFields = [
    "amount",
    "provider",
    "type",
    "interestRate",
    "approvalDate",
    "status",
  ];
  const missingFields = requiredFields.filter((field) => !loanDetails[field]);
  return missingFields;
};

const handleSignature = async (req, res, role, nextStatus) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const { signature } = req.body;

    console.log(req.body);

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Signature is required",
      });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res
        .status(404)
        .json({ success: false, message: "Contract not found" });
    }

    // Validate contract ownership
    if (contract[role].toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Validate contract status
    if (contract.status !== `pending_${role}`) {
      return res.status(400).json({
        success: false,
        message: "Contract not in signable state",
      });
    }

    // Handle sale contract loan details
    if (role === "customer") {
      if (!req.body.loanDetails) {
        return res.status(400).json({
          success: false,
          message: "Loan details required",
        });
      }

      const missingFields = validateLoanDetails(req.body.loanDetails);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing loan fields: ${missingFields.join(", ")}`,
        });
      }

      // Convert approvalDate to Date object
      const loanData = {
        ...req.body.loanDetails,
        approvalDate: new Date(req.body.loanDetails.approvalDate)
      };

      contract.loanDetails = loanData;
    }

    // Update contract
    contract.signatures[role] = signature;
    contract.status = nextStatus;

    console.log("hi",contract);

    await contract.save();
    console.log("hi");

    // Update property status for owner signature
    if (role === "owner" && nextStatus === "active") {
      const newStatus = "sold";
      await Property.findByIdAndUpdate(contract.property, {
        status: newStatus,
      });
    }

    res.json({
      success: true,
      message: "Contract signed successfully",
      data: contract,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Customer sign handler
exports.customerSign = async (req, res) => {
  await handleSignature(req, res, "customer", "pending_owner");
};

// Owner sign handler
exports.ownerSign = async (req, res) => {
  await handleSignature(req, res, "owner", "active");
};
// Common rejection handler
const handleRejection = async (req, res, role) => {
  try {
    const contract = await Contract.findById(req.params.contractId);
    if (!contract)
      return res
        .status(404)
        .json({ success: false, message: "Contract not found" });

    if (contract[role].toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: `This contract does not belong to you as ${role}`,
      });
    }

    if (contract.status !== `pending_${role}`) {
      return res
        .status(400)
        .json({ success: false, message: "Contract not in rejectable state" });
    }

    contract.status = "cancelled";
    await contract.save();
    res.json({
      success: true,
      message: "Contract rejected successfully",
      data: contract,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Rejection handlers
exports.customerReject = async (req, res) =>
  handleRejection(req, res, "customer");
exports.ownerReject = async (req, res) => handleRejection(req, res, "owner");
