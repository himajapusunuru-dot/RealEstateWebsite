import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Button, Alert, Row, Col } from "react-bootstrap";
import api from "../api/axiosInstance";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    userType: "customer",
    agreeTerms: false,
    // Customer/owner specific fields
    dob: "",
    occupation: "",
    annualIncome: "",
    addressLane: "",
    city: "",
    state: "",
    zipcode: "",
    SSN: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(null);

  // Check password match whenever password or confirmPassword changes
  useEffect(() => {
    // Only validate if both fields have values
    if (formData.password && formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For phone field, only allow numbers
    if (name === "phone") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prevState) => ({
        ...prevState,
        [name]: numericValue,
      }));
      return;
    }

    // For annual income field, only allow numbers
    if (name === "annualIncome") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prevState) => ({
        ...prevState,
        [name]: numericValue,
      }));
      return;
    }

    if (name === "zipcode") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prevState) => ({
        ...prevState,
        [name]: numericValue,
      }));
      return;
    }

    // For other fields
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.agreeTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }

    // Determine required fields based on user type
    let requiredFields = ["firstName", "lastName", "email", "phone", "password", "addressLane", "city", "state", "zipcode", "SSN"];

    if (formData.userType === "customer") {
      requiredFields = [
        ...requiredFields,
        "dob",
      ];
    } else if (formData.userType === "realtor") {
      // Realtor only needs the basic fields which are already included
    } else if (formData.userType === "owner") {
      // Owner has same requirements as customer
      requiredFields = [
        ...requiredFields,
        "dob",
      ];
    }

    // Validate required fields
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(
          `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
        );
        return;
      }
    }

    // Validate SSN format (for US: XXX-XX-XXXX) - only for customers and owners
    if (["customer", "owner"].includes(formData.userType) && formData.SSN) {
      const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
      if (!ssnRegex.test(formData.SSN)) {
        setError("SSN must be in format XXX-XX-XXXX");
        return;
      }
    }

    setLoading(true);

    try {
      // Build API endpoint based on userType
      const endpoint = `/auth/signup/${formData.userType}`;

      // Create payload based on user type
      let payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: {
          addressLane: formData.addressLane,
          city: formData.city,
          state: formData.state,
          zipcode: formData.zipcode,
        },
        SSN: formData.SSN
      };

      // Add customer/owner-specific fields
      if (["customer", "owner"].includes(formData.userType)) {
        payload = {
          ...payload,
          dob: formData.dob,
          occupation: formData.occupation,
          annualIncome: formData.annualIncome,
        };
      }

      const response = await api.post(endpoint, payload);

      if (["owner", "realtor"].includes(formData.userType)) {
        alert(
          "Your registration has been submitted. An administrator will review and approve your account."
        );
      } else {
        alert("Registration successful! You can now login.");
      }

      navigate("/login");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(message);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to get password feedback styling
  const getPasswordFeedback = () => {
    if (passwordMatch === null) return null;

    if (passwordMatch) {
      return <Form.Text className="text-success">Passwords match! ✓</Form.Text>;
    } else {
      return (
        <Form.Text className="text-danger">Passwords do not match! ✗</Form.Text>
      );
    }
  };

  return (
    <div className="register-page">
      <div className="text-center mb-4">
        <h2>Create Account</h2>
        <p className="text-muted">Join our real estate platform</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* User Type Selection at the top */}
      <Form.Group className="mb-4" controlId="userType">
        <Form.Label>I want to register as a</Form.Label>
        <Form.Select
          name="userType"
          value={formData.userType}
          onChange={handleChange}
        >
          <option value="customer">Customer</option>
          <option value="owner">Property Owner</option>
          <option value="realtor">Realtor</option>
        </Form.Select>
        {["owner", "realtor"].includes(formData.userType) && (
          <Form.Text className="text-muted">
            Note: {formData.userType === "owner" ? "Owner" : "Realtor"}{" "}
            accounts require admin approval
          </Form.Text>
        )}
      </Form.Group>

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3" controlId="firstName">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your First Name"
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3" controlId="lastName">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your Last Name"
                required
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </Form.Group>
        </Row>

        <Row>
          <Col>
            <Form.Group className="mb-3" controlId="phone">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number (numbers only)"
                required
              />
            </Form.Group>
          </Col>

          {/* Only show date of birth for customers and owners */}
          {["customer", "owner"].includes(formData.userType) && (
            <Col md={6}>
              <Form.Group className="mb-3" controlId="dob">
                <Form.Label>Date of Birth</Form.Label>
                <Form.Control
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          )}
        </Row>

        <Row>
          <Row>
            <Form.Group className="mb-3" controlId="addressLane">
              <Form.Label>Address Lane</Form.Label>
              <Form.Control
                type="text"
                name="addressLane"
                value={formData.addressLane}
                onChange={handleChange}
                placeholder="Enter your Lane Address"
              />
            </Form.Group>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="city">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter your City"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="State">
                <Form.Label>State</Form.Label>
                <Form.Control
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter your State"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="zipcode">
                <Form.Label>Zipcode</Form.Label>
                <Form.Control
                  type="text"
                  name="zipcode"
                  value={formData.zipcode}
                  onChange={handleChange}
                  placeholder="Enter your Zipcode"
                />
              </Form.Group>
            </Col>
          </Row>
        </Row>

        {/* Only show these fields for customers and owners */}
        {["customer", "owner"].includes(formData.userType) && (
          <>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="occupation">
                  <Form.Label>Occupation</Form.Label>
                  <Form.Control
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    placeholder="Enter your occupation"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3" controlId="annualIncome">
                  <Form.Label>Annual Income</Form.Label>
                  <Form.Control
                    type="text"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleChange}
                    placeholder="Enter annual income (numbers only)"
                  />
                </Form.Group>
              </Col>
            </Row>
          </>
        )}

        <Form.Group className="mb-3" controlId="SSN">
          <Form.Label>Social Security Number (SSN)</Form.Label>
          <Form.Control
            type="text"
            name="SSN"
            value={formData.SSN}
            onChange={handleChange}
            placeholder="XXX-XX-XXXX"
            required
            pattern="^\d{3}-\d{2}-\d{4}$"
          />
          <Form.Text className="text-muted">Format: XXX-XX-XXXX</Form.Text>
        </Form.Group>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                minLength="8"
                isValid={formData.password.length >= 8}
                isInvalid={formData.password && formData.password.length < 8}
              />
              <Form.Text className="text-muted">
                Password must be at least 8 characters long
              </Form.Text>
              {formData.password && formData.password.length < 8 && (
                <Form.Control.Feedback type="invalid">
                  Password too short
                </Form.Control.Feedback>
              )}
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                isValid={passwordMatch === true}
                isInvalid={passwordMatch === false}
              />
              {getPasswordFeedback()}
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3" controlId="agreeTerms">
          <Form.Check
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            label="I agree to the terms and conditions"
            required
          />
        </Form.Group>

        <div className="d-grid">
          <Button
            variant="primary"
            type="submit"
            className="mb-3"
            disabled={loading || passwordMatch === false}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </div>

        <div className="text-center">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </Form>
    </div>
  );
};

export default Register;