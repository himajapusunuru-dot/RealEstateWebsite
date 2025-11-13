const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Admin Login
exports.adminLogin = async (req, res) => {
  const { adminId, password } = req.body;

  try {
    console.log("add", adminId)
    const admin = await Admin.findOne({ adminId }).select("+password");
    console.log("hiee")
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    // const isMatch = await bcrypt.compare(password, admin.password);
    const isMatch = password == admin.password;
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        role: "admin",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generic User Login (Customer/Owner/Realtor)
exports.userLogin = (model, role) => async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await model.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Check approval status for Owners/Realtors
    if (user.status && user.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Account pending admin approval" });
    }

    const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const userData = user.toObject();
    delete userData.password;

    res.json({
      token,
      user: {
        ...userData,
        role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generic User Signup (Customer/Owner/Realtor)
exports.userSignup = (model, role) => async (req, res) => {
  const {
    email,
    password,
    phone,
    firstName,
    lastName,
    dob,
    occupation,
    annualIncome,
    address,
    SSN
  } = req.body;
  try {
    console.log(req.body);
    // Check if email already exists
    const existingUser = await model.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firstName, lastName, email, password",
      });
    }

    // Build base user object
    const newUserData = {
      email,
      password: await bcrypt.hash(password, 10),
      phone: phone || "",
      firstName,
      lastName,
      address,
      SSN
    };

    console.log(newUserData)

    // Add role-specific fields
    if (["customer", "owner"].includes(role)) {
      Object.assign(newUserData, {
        dob,
        occupation,
        annualIncome,
      });
    }

    // Set approval status
    if (["owner", "realtor"].includes(role)) {
      newUserData.status = "pending";
    }

    // Create and save user
    const newUser = await model.create(newUserData);

    // Handle response for privileged roles
    if (["owner", "realtor"].includes(role)) {
      return res.status(201).json({
        success: true,
        message: "Account created. Pending admin approval.",
        data: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phone: newUser.phone,
          role,
          ...(role === "realtor" && {
            addressLane: newUser.addressLane,
            city: newUser.city,
            state: newUser.state,
            zipcode: newUser.zipcode,
          }),
        },
      });
    }

    // Generate token for immediate customer login
    const token = jwt.sign({ id: newUser._id, role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      success: true,
      token,
      data: {
        id: newUser._id,
        nafirstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
