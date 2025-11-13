import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import SignaturePad from "../../common/SignaturePad";

const DisplaySignatures = ({ contract }) => {
  const hasCustomerSignature = contract.signatures?.customer && contract.signatures.customer !== 'null';
  const hasOwnerSignature = contract.signatures?.owner && contract.signatures.owner !== 'null';

  return (
    <div className="signatures-display mb-4">
      <h5 className="mb-3">Contract Signatures</h5>

      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Customer Signature</h6>
              {hasCustomerSignature ? (
                <span className="badge bg-success">Signed</span>
              ) : (
                <span className="badge bg-warning">Not signed yet</span>
              )}
            </div>
            <div className="card-body">
              {hasCustomerSignature ? (
                <img
                  src={contract.signatures.customer}
                  alt="Customer Signature"
                  className="img-fluid"
                  style={{ maxHeight: '100px', border: '1px solid #eee', borderRadius: '4px' }}
                />
              ) : (
                <div className="text-muted text-center p-3">
                  No signature available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Owner Signature</h6>
              {hasOwnerSignature ? (
                <span className="badge bg-success">Signed</span>
              ) : (
                <span className="badge bg-warning">Not signed yet</span>
              )}
            </div>
            <div className="card-body">
              {hasOwnerSignature ? (
                <img
                  src={contract.signatures.owner}
                  alt="Owner Signature"
                  className="img-fluid"
                  style={{ maxHeight: '100px', border: '1px solid #eee', borderRadius: '4px' }}
                />
              ) : (
                <div className="text-muted text-center p-3">
                  No signature available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PriceApprovalRequests = ({ token, userId, onApprovalChange }) => {
  const [priceRequests, setPriceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch price approval requests from the backend API
  useEffect(() => {
    const fetchPriceRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call backend API to get requests needing approval
        const response = await api.get(`/properties/${userId}/price-approval-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setPriceRequests(response.data.requests || []);
        } else {
          setError(response.data.message || 'Failed to fetch requests');
        }
      } catch (error) {
        console.error("Error fetching price approval requests:", error);
        setError('Error fetching price approval requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceRequests();

    // Poll for updates every 30 seconds
    const intervalId = setInterval(fetchPriceRequests, 30000);

    return () => clearInterval(intervalId);
  }, [userId, token]);

  // Handle approving a price request
  const handleApprovePrice = async (applicationId) => {
    try {
      // Confirm with the owner
      const confirmed = window.confirm("Are you sure you want to approve this price?");
      if (!confirmed) return;

      // Call backend API to approve the price
      const response = await api.put(`/properties/${userId}/applications/${applicationId}/approve-price`, {
        approved: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update local state
        setPriceRequests(prevRequests =>
          prevRequests.filter(req => req._id !== applicationId)
        );

        // Notify parent component if needed
        if (onApprovalChange) {
          onApprovalChange();
        }

        // Show success message
        alert("Price has been approved. The realtor will be notified.");
      } else {
        alert(response.data.message || 'Failed to approve price');
      }
    } catch (error) {
      console.error("Error approving price:", error);
      alert("Failed to approve price. Please try again.");
    }
  };

  // Handle rejecting a price request
  const handleRejectPrice = async (applicationId) => {
    try {
      // Confirm with the owner
      const confirmed = window.confirm("Are you sure you want to reject this price?");
      if (!confirmed) return;

      // You can optionally ask for a reason
      const reason = prompt("Would you like to provide a reason for rejecting this price? (Optional)");

      // Call backend API to reject the price
      const response = await api.put(`/properties/${userId}/applications/${applicationId}/approve-price`, {
        approved: false,
        reason: reason || ""
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update local state
        setPriceRequests(prevRequests =>
          prevRequests.filter(req => req._id !== applicationId)
        );

        // Notify parent component if needed
        if (onApprovalChange) {
          onApprovalChange();
        }

        // Show success message
        alert("Price has been rejected. The realtor will be notified.");
      } else {
        alert(response.data.message || 'Failed to reject price');
      }
    } catch (error) {
      console.error("Error rejecting price:", error);
      alert("Failed to reject price. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading price approval requests...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (priceRequests.length === 0) {
    return (
      <div className="alert alert-info">
        No pending price approval requests at this time.
      </div>
    );
  }

  return (
    <div className="row">
      {priceRequests.map(request => {
        // Calculate price difference percentage
        const property = request.property;
        const percentageDiff = property.price > 0 ?
          (((property.price - request.finalPrice) / property.price) * 100).toFixed(2) : 0;

        return (
          <div className="col-md-6 col-lg-4 mb-4" key={request._id}>
            <div className="card border-warning">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">Price Approval Request</h5>
              </div>
              <div className="card-body">
                <h6>{property.name}</h6>

                <div className="my-3">
                  <div className="d-flex justify-content-between">
                    <span><strong>Listed Price:</strong></span>
                    <span>${property.price?.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span><strong>Offered Price:</strong></span>
                    <span>${request.finalPrice?.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between text-danger">
                    <span><strong>Difference:</strong></span>
                    <span>-${(property.price - request.finalPrice).toLocaleString()} ({percentageDiff}%)</span>
                  </div>
                </div>

                <div className="d-flex justify-content-between mb-3">
                  <small className="text-muted">
                    Customer: {request.customer.name}
                  </small>
                  <small className="text-muted">
                    Requested: {new Date(request.updatedAt).toLocaleString()}
                  </small>
                </div>

                <div className="alert alert-info mb-3">
                  <small>A customer has offered a lower price for your property.
                    Please approve or reject this price.</small>
                </div>

                <div className="d-grid gap-2">
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprovePrice(request._id)}
                  >
                    Approve Price
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => handleRejectPrice(request._id)}
                  >
                    Reject Price
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OwnersPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("uploadProperty");
  const [properties, setProperties] = useState([]);
  const [realtors, setRealtors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [signature, setSignature] = useState(null);
  const [propertyData, setPropertyData] = useState({
    name: "",
    type: "",
    bhk: "",
    area: "",
    price: "",
    location: "",
    realtor: "",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const { token, userId, logout } = useAuth();
  const [priceRequestCount, setPriceRequestCount] = useState(0);

  // Fetch properties, realtors, and contracts on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch owner's properties
        const properties = await api.get(`/owner/${userId}/properties`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch available realtors
        const realtors = await api.get(`/owner/realtors`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch owner's contracts
        const contracts = await api.get(`/owner/${userId}/contracts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        fetchPriceRequestCount();

       

        setProperties(properties.data.properties || []);
        setRealtors(realtors.data.data || []);
        setContracts(contracts.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [userId, token]);


  const fetchPriceRequestCount = async () => {
    try {
      const response = await api.get(`/properties/${userId}/price-approval-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPriceRequestCount(response.data.requests?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching price request count:", error);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPropertyData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceApprovalChange = () => {
    fetchPriceRequestCount();
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files]);
  };

  // Remove image
  const removeImage = (index) => {
    const newImageFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newImageFiles);
  };

  // Handle signature change
  const handleSignatureChange = (signatureData) => {
    setSignature(signatureData);
  };

  // Submit property
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Create FormData object for handling multipart/form-data (for images)
      const formData = new FormData();

      // Add property data to formData
      formData.append("name", propertyData.name);
      formData.append("type", propertyData.type);
      formData.append("bhk", propertyData.bhk);
      formData.append("area", propertyData.area);
      formData.append("price", propertyData.price);
      formData.append("location", propertyData.location);
      formData.append("realtor", propertyData.realtor);

      // Add all image files to formData
      imageFiles.forEach((file, index) => {
        formData.append("images", file);
      });

      // Send POST request to backend
      const response = await api.post(
        `/owner/${userId}/createproperty`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Property created:", response.data);

      // Add the new property to the local state
      if (response.data.success) {
        // Refresh properties by fetching them again
        const propertiesResponse = await api.get(
          `/owner/${userId}/properties`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProperties(
          propertiesResponse.data.data || propertiesResponse.data.properties
        );
      }

      // Reset form
      setPropertyData({
        name: "",
        type: "",
        bhk: "",
        area: "",
        price: "",
        location: "",
        realtor: "",
      });
      setImageFiles([]);

      // Show success message
      alert("Property uploaded successfully!");

      // Switch to My Properties tab
      setActiveTab("myProperties");
    } catch (error) {
      console.error("Error creating property:", error);
      alert(
        `Failed to create property: ${error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Handle contract viewing
  const handleViewContract = (contract) => {
    setSelectedContract(contract);
    setSignature(null); // Reset signature when viewing a new contract
    setShowContractDetails(true);
  };

  // Handle signing a contract
  const handleSignContract = async (contractId) => {
    try {
      // Check if signature exists
      if (!signature) {
        alert("Please sign the contract before submitting.");
        return;
      }

      // Send request to sign the contract with signature
      const response = await api.put(
        `/owner/${userId}/contracts/${contractId}/sign`,
        { signature: signature },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update contract status locally
        setContracts(contracts.map(contract =>
          contract._id === contractId
            ? {
              ...contract,
              status: "active",
              signatures: { ...contract.signatures, owner: signature }
            }
            : contract
        ));

        alert("Contract signed successfully! The contract is now active.");
        setShowContractDetails(false);

        // Reset signature
        setSignature(null);
      }
    } catch (error) {
      console.error("Error signing contract:", error);
      alert(`Failed to sign contract: ${error.response?.data?.message || error.message}`);
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
        `/owner/${userId}/contracts/${contractId}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update contract status locally
        setContracts(contracts.map(contract =>
          contract._id === contractId
            ? { ...contract, status: "cancelled" }
            : contract
        ));

        alert("Contract rejected successfully.");
        setShowContractDetails(false);
      }
    } catch (error) {
      console.error("Error rejecting contract:", error);
      alert(`Failed to reject contract: ${error.response?.data?.message || error.message}`);
    }
  };

  // Get contract status label
  const getContractStatusLabel = (status) => {
    switch (status) {
      case "pending_customer":
        return "Waiting for Customer Approval";
      case "pending_owner":
        return "Waiting for Your Approval";
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
        return "warning";
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

  // Handle logout
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (confirmLogout) {
      // Call logout method from useAuth
      logout();

      // Redirect to login page
      navigate("/login");
    }
  };

  return (
    <div className="container-fluid">
      {/* Header with Logout */}
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1>Property Owner Dashboard</h1>
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
                className={`nav-link ${activeTab === "uploadProperty" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("uploadProperty")}
              >
                Upload Property
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "myProperties" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("myProperties")}
              >
                My Properties
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "contracts" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("contracts")}
              >
                Contracts
                {contracts && contracts.some(c => c.status === "pending_owner") && (
                  <span className="badge bg-danger ms-2">New</span>
                )}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "priceRequests" ? "active" : ""}`}
                onClick={() => setActiveTab("priceRequests")}
              >
                Price Requests
                {priceRequestCount > 0 && (
                  <span className="badge bg-danger ms-2">{priceRequestCount}</span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content mt-4">
        {/* Upload Property Tab */}
        {activeTab === "uploadProperty" && (
          <div className="tab-pane active">
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <h2 className="mb-4 text-center">Upload New Property</h2>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Property Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="name"
                      value={propertyData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Property Type</label>
                    <select
                      className="form-select form-select-sm"
                      name="type"
                      value={propertyData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Property Type</option>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                    </select>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">BHK</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        name="bhk"
                        value={propertyData.bhk}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Area (sq ft)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        name="area"
                        value={propertyData.area}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Price</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        name="price"
                        value={propertyData.price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="location"
                        value={propertyData.location}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Select Realtor</label>
                    <select
                      className="form-select form-select-sm"
                      name="realtor"
                      value={propertyData.realtor}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a Realtor</option>
                      {realtors.map((realtor) => (
                        <option key={realtor._id} value={realtor._id}>
                          {realtor.firstName + " " + realtor.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Upload Images</label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                    />

                    {imageFiles.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {imageFiles.map((file, index) => (
                          <div key={index} className="position-relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index}`}
                              style={{
                                width: "100px",
                                height: "100px",
                                objectFit: "cover",
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0"
                              onClick={() => removeImage(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary w-100">
                    Upload Property
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* My Properties Tab */}
        {activeTab === "myProperties" && (
          <div className="tab-pane active">
            <h2 className="mb-4">My Properties</h2>
            {properties && properties.length !== 0 ? (
              <div className="row">
                {properties.map((property) => (
                  <div key={property._id} className="col-md-4 mb-4">
                    <div className="card">
                      {property.images && property.images.length > 0 && (
                        <img
                          src={property.images[0]}
                          className="card-img-top"
                          alt={property.name}
                        />
                      )}
                      <div className="card-body">
                        <h5 className="card-title">{property.name}</h5>
                        <p className="card-text">
                          Type: {property.type}
                          <br />
                          Location: {property.location}
                          <br />
                          Price: ${property.price.toLocaleString()}
                          <br />
                          Status: {property.status}
                        </p>
                        {property.realtor && (
                          <p className="card-text">
                            Realtor: {property.realtor.firstName + " " + property.realtor.lastName}
                          </p>
                        )}
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            // Find associated contract if exists
                            const propertyContract = contracts.find(
                              contract => contract.property === property._id
                            );

                            if (propertyContract) {
                              handleViewContract(propertyContract);
                            } else {
                              alert("No contract available for this property yet.");
                            }
                          }}
                        >
                          View Contract
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">No properties associated with you</div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === "contracts" && (
          <div className="tab-pane active">
            <h2 className="mb-4">My Contracts</h2>
            {contracts && contracts.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Created Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => {
                      const property = properties.find(p => p._id === contract.property._id) || {};

                      return (
                        <tr key={contract._id}>
                          <td>{property.name || "Unknown Property"}</td>
                          <td>{contract.type === "rental" ? "Rental" : "Sale"}</td>
                          <td>{contract.customer?.firstName +" "+contract.customer?.lastName || "Unknown Customer"}</td>
                          <td>{new Date(contract.contractDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge bg-${getContractStatusColor(contract.status)}`}>
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
                      );
                    })}
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

        {/* Price Requests Tab */}
        {activeTab === "priceRequests" && (
          <div className="tab-pane active">
            <h2 className="mb-4">Price Approval Requests</h2>
            <PriceApprovalRequests
              token={token}
              userId={userId}
              onApprovalChange={handlePriceApprovalChange}
            />
          </div>
        )}
      </div>

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
                  {selectedContract.type === "rental" ? "Rental" : "Sale"} Contract
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
                    <p>{properties.find(p => {
                      console.log(p);
                      return p._id === selectedContract.property._id
                    })?.name || "Unknown Property"}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Status</h6>
                    <span className={`badge bg-${getContractStatusColor(selectedContract.status)}`}>
                      {getContractStatusLabel(selectedContract.status)}
                    </span>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Contract Date</h6>
                    <p>{new Date(selectedContract.contractDate).toLocaleDateString()}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Contract Type</h6>
                    <p>{selectedContract.type === "rental" ? "Rental Agreement" : "Sales Contract"}</p>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Start Date</h6>
                    <p>{new Date(selectedContract.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>End Date</h6>
                    <p>{new Date(selectedContract.endDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>{selectedContract.type === "rental" ? "Monthly Rent" : "Sale Price"}</h6>
                    <p>${selectedContract.salePrice?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Deposit Amount</h6>
                    <p>${selectedContract.depositAmount?.toLocaleString() || "0"}</p>
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

                    {selectedContract.loanDetails && Object.keys(selectedContract.loanDetails).length > 0 ? (
                      <div className="card">
                        <div className="card-body">
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <h6>Loan Amount</h6>
                              <p>${selectedContract.loanDetails.amount?.toLocaleString() || "Not provided"}</p>
                            </div>
                            <div className="col-md-6">
                              <h6>Loan Provider</h6>
                              <p>{selectedContract.loanDetails.provider || "Not provided"}</p>
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <h6>Loan Type</h6>
                              <p>{selectedContract.loanDetails.type ?
                                selectedContract.loanDetails.type.charAt(0).toUpperCase() +
                                selectedContract.loanDetails.type.slice(1) :
                                "Not provided"}</p>
                            </div>
                            <div className="col-md-6">
                              <h6>Interest Rate</h6>
                              <p>{selectedContract.loanDetails.interestRate ?
                                `${selectedContract.loanDetails.interestRate}%` :
                                "Not provided"}</p>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-6">
                              <h6>Approval Date</h6>
                              <p>{selectedContract.loanDetails.approvalDate ?
                                new Date(selectedContract.loanDetails.approvalDate).toLocaleDateString() :
                                "Not provided"}</p>
                            </div>
                            <div className="col-md-6">
                              <h6>Loan Status</h6>
                              <p>
                                <span className={`badge ${selectedContract.loanDetails.status === "approved" ? "bg-success" :
                                  selectedContract.loanDetails.status === "pre-approved" ? "bg-info" :
                                    selectedContract.loanDetails.status === "pending" ? "bg-warning" :
                                      selectedContract.loanDetails.status === "denied" ? "bg-danger" : "bg-secondary"
                                  }`}>
                                  {selectedContract.loanDetails.status ?
                                    selectedContract.loanDetails.status.charAt(0).toUpperCase() +
                                    selectedContract.loanDetails.status.slice(1) :
                                    "Not provided"}
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

                {/* Show existing signatures if contract is not pending owner approval */}
                {selectedContract.status !== "pending_owner" && (
                  <DisplaySignatures contract={selectedContract} />
                )}

                {/* Signature section when pending owner signature */}
                {selectedContract.status === "pending_owner" && (
                  <div className="signature-section mb-4">
                    <h5 className="mb-3">Your Signature</h5>
                    <p className="text-muted mb-3">Please sign below to finalize this contract.</p>

                    <SignaturePad onSignatureChange={handleSignatureChange} />

                    {signature && (
                      <div className="mt-3">
                        <div className="alert alert-success">
                          <small>Signature captured successfully. You can proceed with signing the contract.</small>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedContract.status === "pending_owner" && (
                  <div className="alert alert-warning">
                    <strong>Action Required:</strong> Please review the contract carefully before signing.
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

                  {selectedContract.status === "pending_owner" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger me-2"
                        onClick={() => handleRejectContract(selectedContract._id)}
                      >
                        Reject Contract
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleSignContract(selectedContract._id)}
                        disabled={!signature}
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

export default OwnersPage;