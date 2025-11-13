import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/axiosInstance";
import SignaturePad from "../common/SignaturePad";

const CustomerPage = () => {
  const [activeTab, setActiveTab] = useState("browseProperties");
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [loanDetails, setLoanDetails] = useState({
    amount: "",
    provider: "",
    type: "",
    interestRate: "",
    approvalDate: "",
    status: "",
  });
  const [signature, setSignature] = useState(null);
  const { token, userId, logout } = useAuth();

  // Fetch properties and applications on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all available properties
        const propertiesResponse = await api.get("/properties", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch customer's applications
        const applicationsResponse = await api.get(
          `/customer/${userId}/applications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Fetch customer's contracts
        const contractsResponse = await api.get(
          `/customer/${userId}/contracts`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setProperties(propertiesResponse.data || []);
        setApplications(applicationsResponse.data.data || []);
        setContracts(contractsResponse.data.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, token]);

  // State for application form
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [applicationForm, setApplicationForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phonenumber: "",
    SSN: "",
    employerName: "",
    employementstatus: "employed",
    annualincome: "",
    documents: {
      proofOfEmployment: null,
      governmentId: null,
      proofOfAddress: null,
      bankStatement: null,
    },
  });
  const [documentFiles, setDocumentFiles] = useState({
    proofOfEmployment: null,
    governmentId: null,
    proofOfAddress: null,
    bankStatement: null,
  });

  // Handle opening application form for a property
  const handleOpenApplicationForm = (property) => {
    // Check if application already exists
    const alreadyApplied =
      Array.isArray(applications) &&
      applications.some(
        (app) => app.property && app.property._id === property._id
      );

    if (alreadyApplied) {
      alert("You have already applied for this property!");
      return;
    }

    setSelectedProperty(property);
    setShowApplicationForm(true);
  };

  // Handle application form changes
  const handleApplicationFormChange = (e) => {
    const { name, value } = e.target;
    setApplicationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      // Update the document files state
      setDocumentFiles((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  // Handle sending application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    try {
      if (!selectedProperty) {
        alert("No property selected");
        return;
      }

      // Create FormData object for handling file uploads
      const formData = new FormData();

      // Add application data to FormData
      Object.keys(applicationForm).forEach((key) => {
        if (key !== "documents") {
          formData.append(key, applicationForm[key]);
        }
      });

      // Add propertyId
      formData.append("propertyId", selectedProperty._id);

      // Add document files
      Object.keys(documentFiles).forEach((docType) => {
        if (documentFiles[docType]) {
          formData.append(`documents.${docType}`, documentFiles[docType]);
        }
      });

      const response = await api.post(`/customer/${userId}/apply`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Refresh applications list
        const updatedApplications = await api.get(
          `/customer/${userId}/applications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setApplications(updatedApplications.data.data || []);
        setShowApplicationForm(false);
        setSelectedProperty(null);
        alert("Application sent successfully!");

        // Reset form
        setApplicationForm({
          firstName: "",
          lastName: "",
          email: "",
          phonenumber: "",
          SSN: "",
          employerName: "",
          employementstatus: "employed",
          annualincome: "",
          documents: {
            proofOfEmployment: null,
            governmentId: null,
            proofOfAddress: null,
            bankStatement: null,
          },
        });
        setDocumentFiles({
          proofOfEmployment: null,
          governmentId: null,
          proofOfAddress: null,
          bankStatement: null,
        });
      }
    } catch (error) {
      console.error("Error sending application:", error);
      alert(
        `Failed to send application: ${error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Handle contract viewing

  const handleViewContract = (contract) => {
    setSelectedContract(contract);

    setShowContractDetails(true);
  };

  // Handle loan details change
  const handleLoanDetailsChange = (e) => {
    const { name, value } = e.target;
    setLoanDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  //handle signature
  const handleSignatureChange = (signatureData) => {
    setSignature(signatureData);
  };

  // Handle signing a contract

  const handleSignContract = async (contractId) => {
    try {
      // Check if signature exists
      if (!signature) {
        alert("Please sign the contract before submitting.");
        return;
      }
      // Create payload with loan details if provided
      const payload = { signature: signature, };
      console.log(loanDetails);

      // If this is a sale contract and loan details are provided, include them
      if (loanDetails) {
        payload.loanDetails = {
          amount: parseFloat(loanDetails.amount),
          provider: loanDetails.provider,
          type: loanDetails.type,
          interestRate: parseFloat(loanDetails.interestRate),
          approvalDate: loanDetails.approvalDate,
          status: loanDetails.status
        };
      }

      // Send request to sign the contract with loan details
      const response = await api.put(
        `/customer/${userId}/contracts/${contractId}/sign`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update contract status locally
        setContracts(
          contracts.map((contract) =>
            contract._id === contractId
              ? {
                ...contract,
                status: "pending_owner",
                signatures: { ...contract.signatures, customer: userId },
                loanDetails: payload.loanDetails || contract.loanDetails,
              }
              : contract
          )
        );

        alert(
          "Contract signed successfully! It has been sent to the owner for signature."
        );
        setShowContractDetails(false);

        // Reset loan details
        setLoanDetails({
          amount: "",
          provider: "",
          type: "",
          interestRate: "",
          approvalDate: "",
          status: "",
        });
      }
    } catch (error) {
      console.error("Error signing contract:", error);
      alert(
        `Failed to sign contract: ${error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Handle rejecting a contract

  const handleRejectContract = async (contractId) => {
    try {
      // Confirm rejection

      const confirmed = window.confirm(
        "Are you sure you want to reject this contract? This action cannot be undone."
      );

      if (!confirmed) return;

      // Send request to reject the contract

      const response = await api.put(
        `/customer/${userId}/contracts/${contractId}/reject`,

        {},

        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update contract status locally
        setContracts(
          contracts.map((contract) =>
            contract._id === contractId
              ? { ...contract, status: "cancelled" }
              : contract
          )
        );
        alert("Contract rejected successfully.");
        setShowContractDetails(false);
      }
    } catch (error) {
      console.error("Error rejecting contract:", error);

      alert(
        `Failed to reject contract: ${error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Handle property filtering (could be expanded later)
  const filterAvailableProperties = () => {
    return properties.filter((property) => property.status === "available");
  };

  // Handle logout
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (confirmLogout) {
      logout();
      // Redirect is handled by useAuth hook
    }
  };

  // Get contract status label

  const getContractStatusLabel = (status) => {
    switch (status) {
      case "pending_customer":
        return "Waiting for Your Approval";

      case "pending_owner":
        return "Waiting for Owner Approval";

      case "active":
        return "Active";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      default:
        return "Pending";
    }
  };

  // Get contract status badge color

  const getContractStatusColor = (status) => {
    switch (status) {
      case "pending_customer":
        return "warning";

      case "pending_owner":
        return "info";

      case "active":
        return "success";

      case "completed":
        return "secondary";

      case "cancelled":
        return "danger";

      default:
        return "secondary";
    }
  };

  return (
    <div className="container-fluid">
      {/* Header with Logout */}
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1>Customer Dashboard</h1>
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="row">
        <div className="col-12">
          <ul className="nav nav-tabs flex-row">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "browseProperties" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("browseProperties")}
              >
                Browse Properties
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "myApplications" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("myApplications")}
              >
                My Applications
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "contracts" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("contracts")}
              >
                Contracts
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content mt-4">
        {/* Browse Properties Tab */}
        {activeTab === "browseProperties" && (
          <div className="tab-pane active">
            <h2 className="mb-4">Available Properties</h2>
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filterAvailableProperties().length > 0 ? (
              <div className="row">
                {filterAvailableProperties().map((property) => (
                  <div key={property._id} className="col-md-4 mb-4">
                    <div className="card h-100">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          className="card-img-top"
                          alt={property.name}
                          style={{ height: "200px", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          className="bg-secondary text-white d-flex justify-content-center align-items-center"
                          style={{ height: "200px" }}
                        >
                          No Image Available
                        </div>
                      )}
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title">{property.name}</h5>
                        <p className="card-text">
                          <strong>Type:</strong>{" "}
                          {property.type.charAt(0).toUpperCase() +
                            property.type.slice(1)}
                          <br />
                          {property.bhk && (
                            <>
                              <strong>BHK:</strong> {property.bhk}
                              <br />
                            </>
                          )}
                          {property.area && (
                            <>
                              <strong>Area:</strong> {property.area} sq ft
                              <br />
                            </>
                          )}
                          {property.location && (
                            <>
                              <strong>Location:</strong> {property.location}
                              <br />
                            </>
                          )}
                          <strong>Price:</strong> $
                          {property.price.toLocaleString()}
                        </p>
                        <div className="mt-auto">
                          <button
                            className="btn btn-primary w-100"
                            onClick={() => handleOpenApplicationForm(property)}
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">
                No available properties at the moment. Please check back later.
              </div>
            )}
          </div>
        )}

        {/* Application Form Modal */}
        {showApplicationForm && selectedProperty && (
          <div
            className="modal"
            style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Application for {selectedProperty.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowApplicationForm(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmitApplication}>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="firstName"
                          value={applicationForm.firstName}
                          onChange={handleApplicationFormChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="lastName"
                          value={applicationForm.lastName}
                          onChange={handleApplicationFormChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          value={applicationForm.email}
                          onChange={handleApplicationFormChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="phonenumber"
                          value={applicationForm.phonenumber}
                          onChange={handleApplicationFormChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">SSN</label>
                        <input
                          type="number"
                          className="form-control"
                          name="SSN"
                          value={applicationForm.SSN}
                          onChange={handleApplicationFormChange}
                          placeholder="Last 4 digits only"
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Employer Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="employerName"
                          value={applicationForm.employerName}
                          onChange={handleApplicationFormChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Employment Status</label>
                        <select
                          className="form-select"
                          name="employementstatus"
                          value={applicationForm.employementstatus}
                          onChange={handleApplicationFormChange}
                          required
                        >
                          <option value="employed">Employed</option>
                          <option value="self-employed">Self-Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Annual Income ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="annualincome"
                        value={applicationForm.annualincome}
                        onChange={handleApplicationFormChange}
                        required
                      />
                    </div>

                    <h5 className="mt-4 mb-3">Required Documents</h5>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Proof of Employment
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          name="proofOfEmployment"
                          onChange={handleDocumentUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Government ID</label>
                        <input
                          type="file"
                          className="form-control"
                          name="governmentId"
                          onChange={handleDocumentUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Proof of Address</label>
                        <input
                          type="file"
                          className="form-control"
                          name="proofOfAddress"
                          onChange={handleDocumentUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Bank Statement</label>
                        <input
                          type="file"
                          className="form-control"
                          name="bankStatement"
                          onChange={handleDocumentUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowApplicationForm(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Submit Application
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === "myApplications" && (
          <div className="tab-pane active">
            <h2 className="mb-4">My Applications</h2>
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : applications.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Price</th>
                      <th>Applied Date</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr key={application._id}>
                        <td>{application.property.name}</td>
                        <td>
                          {application.property.type.charAt(0).toUpperCase() +
                            application.property.type.slice(1)}
                        </td>
                        <td>{application.property.location}</td>
                        <td>${application.property.price.toLocaleString()}</td>
                        <td>
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${application.status === "approved"
                                ? "bg-success"
                                : application.status === "rejected"
                                  ? "bg-danger"
                                  : "bg-warning"
                              }`}
                          >
                            {application.status.charAt(0).toUpperCase() +
                              application.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => {
                              // Could show application details modal here
                              alert(
                                `Application Details for ${application.property.name
                                }\n\nFull Name: ${application.firstName +" "+application.lastName
                                }\nEmployment Status: ${application.employementstatus
                                }\nAnnual Income: ${application.annualincome?.toLocaleString() ||
                                "Not provided"
                                }`
                              );
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                You haven't applied for any properties yet.
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}

        {activeTab === "contracts" && (
          <div className="tab-pane active">
            <h2 className="mb-4">My Contracts</h2>

            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : contracts && contracts.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Created Date</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract._id}>
                        <td>{contract.property?.name || "Unknown Property"}</td>
                        <td>
                          {contract.type === "rental" ? "Rental" : "Sale"}
                        </td>
                        <td>
                          {new Date(contract.contractDate).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(contract.startDate).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge bg-${getContractStatusColor(
                              contract.status
                            )}`}
                          >
                            {getContractStatusLabel(contract.status)}
                          </span>
                        </td>

                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewContract(contract)}
                          >
                            View Contract
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                You don't have any contracts yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contract Details Modal */}

      {/* Contract Details Modal */}
      {showContractDetails && selectedContract && (
        <div
          className="modal"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedContract.type === "rental" ? "Rental" : "Sale"}{" "}
                  Contract
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowContractDetails(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Property</h6>
                    <p>
                      {selectedContract.property?.name || "Unknown Property"}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Status</h6>
                    <span
                      className={`badge bg-${getContractStatusColor(
                        selectedContract.status
                      )}`}
                    >
                      {getContractStatusLabel(selectedContract.status)}
                    </span>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Contract Date</h6>
                    <p>
                      {new Date(
                        selectedContract.contractDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Contract Type</h6>
                    <p>
                      {selectedContract.type === "rental"
                        ? "Rental Agreement"
                        : "Sales Contract"}
                    </p>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Start Date</h6>
                    <p>
                      {new Date(
                        selectedContract.startDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>End Date</h6>
                    <p>
                      {new Date(selectedContract.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>
                      {selectedContract.type === "rental"
                        ? "Monthly Rent"
                        : "Sale Price"}
                    </h6>
                    <p>
                      ${selectedContract.salePrice?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Deposit Amount</h6>
                    <p>
                      ${selectedContract.depositAmount?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h6>Payment Terms</h6>
                  <p>{selectedContract.paymentTerms || "Not specified"}</p>
                </div>

                {/* Loan Details Section - Only shown for sale contracts */}
                {selectedContract.type === "sale" && (
                  <div className="loan-details-section mb-4">
                    <h5 className="mb-3">Loan Details</h5>

                    {selectedContract.status === "pending_customer" ? (
                      <div>
                        <div className="alert alert-warning mb-3">
                          <strong>Action Required:</strong> Please complete the
                          loan details below before signing the contract.
                        </div>

                        <form>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <label className="form-label">Loan Amount</label>
                              <div className="input-group">
                                <span className="input-group-text">$</span>
                                <input
                                  type="number"
                                  className="form-control"
                                  name="amount"
                                  value={loanDetails.amount}
                                  onChange={handleLoanDetailsChange}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">
                                Loan Provider
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="provider"
                                value={loanDetails.provider}
                                onChange={handleLoanDetailsChange}
                                placeholder="Bank or mortgage company name"
                                required
                              />
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <label className="form-label">Loan Type</label>
                              <select
                                className="form-select"
                                name="type"
                                value={loanDetails.type}
                                onChange={handleLoanDetailsChange}
                                required
                              >
                                <option value="">Select loan type</option>
                                <option value="conventional">
                                  Conventional
                                </option>
                                <option value="fha">FHA</option>
                                <option value="va">VA</option>
                                <option value="usda">USDA</option>
                                <option value="jumbo">Jumbo</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">
                                Interest Rate (%)
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                name="interestRate"
                                value={loanDetails.interestRate}
                                onChange={handleLoanDetailsChange}
                                step="0.01"
                                min="0"
                                max="20"
                                required
                              />
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <label className="form-label">
                                Approval Date
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                name="approvalDate"
                                value={loanDetails.approvalDate}
                                onChange={handleLoanDetailsChange}
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Loan Status</label>
                              <select
                                className="form-select"
                                name="status"
                                value={loanDetails.status}
                                onChange={handleLoanDetailsChange}
                                required
                              >
                                <option value="">Select status</option>
                                <option value="pre-approved">
                                  Pre-approved
                                </option>
                                <option value="approved">Fully Approved</option>
                                <option value="pending">
                                  Approval Pending
                                </option>
                                <option value="denied">Denied</option>
                              </select>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : selectedContract.loanDetails &&
                      Object.keys(selectedContract.loanDetails).length > 0 ? (
                      <div className="card">
                        <div className="card-body">
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <h6>Loan Amount</h6>
                              <p>
                                $
                                {selectedContract.loanDetails.amount?.toLocaleString() ||
                                  "Not provided"}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <h6>Loan Provider</h6>
                              <p>
                                {selectedContract.loanDetails.provider ||
                                  "Not provided"}
                              </p>
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <h6>Loan Type</h6>
                              <p>
                                {selectedContract.loanDetails.type
                                  ? selectedContract.loanDetails.type
                                    .charAt(0)
                                    .toUpperCase() +
                                  selectedContract.loanDetails.type.slice(1)
                                  : "Not provided"}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <h6>Interest Rate</h6>
                              <p>
                                {selectedContract.loanDetails.interestRate
                                  ? `${selectedContract.loanDetails.interestRate}%`
                                  : "Not provided"}
                              </p>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-6">
                              <h6>Approval Date</h6>
                              <p>
                                {selectedContract.loanDetails.approvalDate
                                  ? new Date(
                                    selectedContract.loanDetails.approvalDate
                                  ).toLocaleDateString()
                                  : "Not provided"}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <h6>Loan Status</h6>
                              <p>
                                <span
                                  className={`badge ${selectedContract.loanDetails.status ===
                                      "approved"
                                      ? "bg-success"
                                      : selectedContract.loanDetails.status ===
                                        "pre-approved"
                                        ? "bg-info"
                                        : selectedContract.loanDetails.status ===
                                          "pending"
                                          ? "bg-warning"
                                          : selectedContract.loanDetails.status ===
                                            "denied"
                                            ? "bg-danger"
                                            : "bg-secondary"
                                    }`}
                                >
                                  {selectedContract.loanDetails.status
                                    ? selectedContract.loanDetails.status
                                      .charAt(0)
                                      .toUpperCase() +
                                    selectedContract.loanDetails.status.slice(
                                      1
                                    )
                                    : "Not provided"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        No loan details have been provided for this contract.
                      </div>
                    )}
                  </div>
                )}

                {/* Contract Status Section */}
                <div className="contract-status-section mb-4">
                  <h5 className="mb-3">Contract Status</h5>
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Current Status</h6>
                      <p>
                        <span
                          className={`badge bg-${getContractStatusColor(
                            selectedContract.status
                          )}`}
                        >
                          {getContractStatusLabel(selectedContract.status)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-4">
                      <h6>Realtor Signature</h6>
                      <p>
                        <span className="badge bg-success">Signed</span>
                      </p>
                    </div>
                    <div className="col-md-4">
                      <h6>Your Signature</h6>
                      <p>
                        {selectedContract.signatures?.customer ? (
                          <span className="badge bg-success">Signed</span>
                        ) : (
                          <span className="badge bg-warning">
                            Not signed yet
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <h6>Owner Signature</h6>
                      <p>
                        {selectedContract.signatures?.owner ? (
                          <span className="badge bg-success">Signed</span>
                        ) : (
                          <span className="badge bg-warning">
                            Not signed yet
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedContract.status === "pending_customer" && (
                  <div className="alert alert-warning">
                    <strong>Action Required:</strong> Please review the contract
                    terms carefully.
                    {selectedContract.type === "sale"
                      ? " Complete the loan details and sign"
                      : " Sign"}{" "}
                    this contract to proceed further.
                  </div>
                )}

                {selectedContract.status === "pending_customer" && (
                  <div className="signature-section mb-4">
                    <h5 className="mb-3">Your Signature</h5>
                    <p className="text-muted mb-3">
                      Please sign below to indicate your acceptance of this
                      contract.
                    </p>

                    <SignaturePad onSignatureChange={handleSignatureChange} />

                    {signature && (
                      <div className="mt-3">
                        <div className="alert alert-success">
                          <small>
                            Signature captured successfully. You can proceed
                            with signing the contract.
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowContractDetails(false)}
                  >
                    Close
                  </button>

                  {selectedContract.status === "pending_customer" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger me-2"
                        onClick={() =>
                          handleRejectContract(selectedContract._id)
                        }
                      >
                        Reject Contract
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleSignContract(selectedContract._id)}
                        disabled={
                          !loanDetails.amount ||
                          !loanDetails.provider ||
                          !loanDetails.type ||
                          !loanDetails.interestRate ||
                          !loanDetails.approvalDate ||
                          !loanDetails.status ||
                          !signature
                        }
                      >
                        Sign Contract
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage;
