import React, { useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Modal,
  Table,
  Nav,
  Tab,
} from "react-bootstrap";
import {
  FaHome,
  FaUsers,
  FaUser,
  FaBell,
  FaCog,
  FaFileContract,
} from "react-icons/fa";
import api from "../api/axiosInstance";
import { useAuth } from "../hooks/useAuth";
import SignaturePad from "../common/SignaturePad";
import generateContractPdf from "../common/ContractPdfGenerator";
import ContractDetails from "../common/ContractDetails";
import PriceConfirmationModal from "../common/PriceConfirmationModal";

// Component to display signatures

const DisplaySignatures = ({ contract }) => {
  const hasCustomerSignature =
    contract.signatures?.customer && contract.signatures.customer !== "null";

  const hasOwnerSignature =
    contract.signatures?.owner && contract.signatures.owner !== "null";

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
                  style={{
                    maxHeight: "100px",
                    border: "1px solid #eee",
                    borderRadius: "4px",
                  }}
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
                  style={{
                    maxHeight: "100px",
                    border: "1px solid #eee",
                    borderRadius: "4px",
                  }}
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

const RealtorDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showApplications, setShowApplications] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    pendingContracts: 0,
  });
  const { token, userId, logout } = useAuth();
  // Contract form state
  const [contractForm, setContractForm] = useState({
    type: "rental", // or "sale"
    status: "pending",
    startDate: "",
    endDate: "",
    closingDate: "",
    salePrice: "",
    depositAmount: "",
    paymentTerms: "",
  });
  const [activeTab, setActiveTab] = useState("properties");
  const [showPriceConfirmation, setShowPriceConfirmation] = useState(false);
  const [selectedApplicationForPrice, setSelectedApplicationForPrice] = useState(null);
  // Fetch realtor data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch properties managed by the realtor
        const propertiesResponse = await api.get("/realtor/properties");
        setProperties(propertiesResponse.data.data);

        // Fetch customers associated with the realtor
        const customersResponse = await api.get("/realtor/customers");
        setCustomers(customersResponse.data.data);

        // Fetch owners associated with the realtor's properties
        const ownersResponse = await api.get("/realtor/owners");
        setOwners(ownersResponse.data.data);

        // Fetch all applications for the realtor's properties
        const applicationsResponse = await api.get("/realtor/applications");
        setApplications(applicationsResponse.data.data);

        const contractsResponse = await api.get("/realtor/contracts");
        setContracts(contractsResponse.data.data);

        const applicationsNeedingPriceConfirmation = applicationsResponse.data.data.filter(
          app => app.status === 'approved' && app.needsPriceConfirmation
        );

        if (applicationsNeedingPriceConfirmation.length > 0) {
          const appNeedingConfirmation = applicationsNeedingPriceConfirmation[0];

          // If this application has a property, set it for price confirmation
          if (appNeedingConfirmation.property) {
            setSelectedApplicationForPrice(appNeedingConfirmation);
            setShowPriceConfirmation(true);

            // Optional: Show a notification about the pending price confirmation
            alert("There is an application that needs price confirmation.");
          }
        }

        // Calculate statistics
        const pendingContracts = contractsResponse.data.data.filter(
          (contract) =>
            contract.status === "pending" ||
            contract.status === "pending_customer" ||
            contract.status === "pending_owner"
        ).length;

        // Set statistics
        setStats({
          totalProperties: propertiesResponse.data.data.length,
          pendingApplications: applicationsResponse.data.data.filter(
            (app) => app.status === "pending"
          ).length,
          approvedApplications: applicationsResponse.data.data.filter(
            (app) => app.status === "approved"
          ).length,
          rejectedApplications: applicationsResponse.data.data.filter(
            (app) => app.status === "rejected"
          ).length,
          pendingContracts: pendingContracts,
        });
      } catch (error) {
        console.error("Error fetching realtor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  useEffect(() => {
    // Optionally refresh data when switching to certain tabs
    if (activeTab === "contracts") {
      // Refresh contracts data
      const fetchContracts = async () => {
        try {
          const response = await api.get("/realtor/contracts", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setContracts(response.data.data || []);
        } catch (error) {
          console.error("Error fetching contracts:", error);
        }
      };

      fetchContracts();
    }
  }, [activeTab, token]);

  // Handle opening applications modal for a specific property
  const handleShowApplications = (property) => {
    setSelectedProperty(property);
    setShowApplications(true);
  };

  // Handle application approval
  const handleApproveApplication = async (applicationId) => {
    try {
      // First update the application status in the backend
      await api.put(`/realtor/applications/${applicationId}/approve`);

      const approvedApp = applications.find(app => app._id === applicationId);

      if (!approvedApp) {
        console.error("Application not found");
        return;
      }

      // Update applications state
      setApplications(
        applications.map((app) =>
          app._id === applicationId ? { ...app, status: "approved" } : app
        )
      );

      // Update stats
      setStats({
        ...stats,
        pendingApplications: stats.pendingApplications - 1,
        approvedApplications: stats.approvedApplications + 1,
      });

      // Show price confirmation modal
      setSelectedApplicationForPrice(approvedApp);
      setShowPriceConfirmation(true);

    } catch (error) {
      console.error("Error approving application:", error);
    }
  };

  // Handle application rejection
  const handleRejectApplication = async (applicationId) => {
    try {
      await api.put(`/realtor/applications/${applicationId}/reject`);

      // Update applications state after rejection
      setApplications(
        applications.map((app) =>
          app._id === applicationId ? { ...app, status: "rejected" } : app
        )
      );

      // Update stats
      setStats({
        ...stats,
        pendingApplications: stats.pendingApplications - 1,
        rejectedApplications: stats.rejectedApplications + 1,
      });
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  const handleCreateContract = (application, finalPrice) => {
    // Find the property
    const property = properties.find(p => p._id === application.property._id);

    if (!property) {
      console.error("Property not found");
      return;
    }

    // Set selected application
    setSelectedApplication(application);

    // Setup contract form with confirmed price
    setContractForm({
      type: property.type === "plot" ? "sale" : "rental",
      status: "pending",
      startDate: "",
      endDate: "",
      closingDate: "",
      salePrice: finalPrice.toString(), // Use the confirmed price
      depositAmount: "",
      paymentTerms: "",
    });

    // Show contract form
    setShowContractForm(true);
  };

  // Function to request owner approval (when price is lower than listing)
  const handleRequestOwnerApproval = async (application, offeredPrice) => {
    try {
      // We'll make a simple update to the application to mark it as needing owner approval
      // This is a frontend-only approach as requested

      // Update UI to reflect that we're waiting for owner approval
      setApplications(
        applications.map((app) =>
          app._id === application._id
            ? {
              ...app,
              status: "approved",
              needsOwnerPriceApproval: true,
              offeredPrice: offeredPrice
            }
            : app
        )
      );

      // Show success message
      alert(
        `Price approval request sent to the owner. You'll be notified when they respond.`
      );

    } catch (error) {
      console.error("Error requesting owner approval:", error);
      alert("Failed to send price approval request. Please try again.");
    }
  };

  // Handle opening contract form for an approved application
  const handleOpenContractForm = (application, confirmedPrice = null) => {
    setSelectedApplication(application);

    // Find property for this application
    const property = properties.find(
      (prop) => prop._id === application.property._id
    );

    if (!property) {
      console.error("Property not found");
      return;
    }

    // Use the confirmed price if provided, otherwise use property price
    const price = confirmedPrice || property.price;

    // Set contract form with the price
    setContractForm({
      type: property.type === "plot" ? "sale" : "rental",
      status: "pending",
      startDate: "",
      endDate: "",
      closingDate: "",
      salePrice: price.toString(),
      depositAmount: "",
      paymentTerms: "",
    });

    setShowContractForm(true);
  };

  // Handle contract form changes
  const handleContractFormChange = (e) => {
    const { name, value } = e.target;
    setContractForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle contract form submission
  const handleContractSubmit = async (e) => {
    e.preventDefault();

    try {
      // Get property and customer information from the selected application
      const property = properties.find(
        (prop) => prop._id === selectedApplication.property._id
      );
      const customer = customers.find(
        (cust) => cust._id === selectedApplication.customer._id
      );

      if (!property || !customer) {
        alert("Missing property or customer information");
        return;
      }

      // Create contract object
      const contractData = {
        ...contractForm,
        status: "pending_customer", // Set initial status to pending customer approval
        property: selectedApplication.property,
        customer: selectedApplication.customer,
        owner: property.owner,
        realtor: userId,
      };

      // Send API request to create contract
      const response = await api.post("/realtor/contracts", contractData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        // Add the new contract to state
        const newContract = response.data.data;
        setContracts([...contracts, newContract]);

        // Update stats
        setStats({
          ...stats,
          pendingContracts: stats.pendingContracts + 1,
        });

        // *** Critical Fix: Update application status to reflect contract creation ***
        // Find the index of the application in the applications array
        const applicationIndex = applications.findIndex(
          (app) =>
            app.property === selectedApplication.property &&
            app.customer === selectedApplication.customer
        );

        if (applicationIndex !== -1) {
          // Create a copy of the applications array
          const updatedApplications = [...applications];

          // Update the application to include contract reference
          updatedApplications[applicationIndex] = {
            ...updatedApplications[applicationIndex],
            contractCreated: true,
            contractId: newContract._id,
          };

          // Update the applications state
          setApplications(updatedApplications);
        }

        // Close the form
        setShowContractForm(false);
        setSelectedApplication(null);

        // Show success alert
        alert(
          "Contract created successfully and sent to customer for approval."
        );

        // *** Optional: Switch to the contracts tab to show the new contract ***
        setActiveTab("contracts");
      }
    } catch (error) {
      console.error("Error creating contract:", error);
      alert(`Failed to create contract: ${error.message}`);
    }
  };

  // Handle viewing a contract

  const handleViewContract = (contract) => {
    setSelectedContract(contract);
    setShowContractDetails(true);
  };

  // Get applications count for a specific property
  const getApplicationsCount = (propertyId) => {
    return applications.filter((app) => app.property._id === propertyId).length;
  };

  // Get pending applications count for a specific property
  const getPendingApplicationsCount = (propertyId) => {
    return applications.filter(
      (app) => app.property._id === propertyId && app.status === "pending"
    ).length;
  };

  // Get contract status label
  const getContractStatusLabel = (status) => {
    switch (status) {
      case "pending_customer":
        return "Pending Customer Approval";
      case "pending_owner":
        return "Pending Owner Approval";
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
  const getContractStatusBadgeColor = (status) => {
    switch (status) {
      case "pending_customer":
      case "pending_owner":
        return "warning";
      case "active":
        return "success";
      case "completed":
        return "info";
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
      logout();
      // Redirect is handled by useAuth hook
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="mb-4">Realtor Dashboard</h1>
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5>Total Properties</h5>
              <h2>{stats.totalProperties}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5>Pending Applications</h5>
              <h2>{stats.pendingApplications}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5>Approved Applications</h5>
              <h2>{stats.approvedApplications}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5>Rejected Applications</h5>
              <h2>{stats.rejectedApplications}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5>Pending Contracts</h5>
              <h2>{stats.pendingContracts}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Dashboard Content */}
      <Tab.Container
        id="dashboard-tabs"
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key)}
      >
        <Row>
          <Col lg={3} md={4} className="mb-4">
            <Card className="shadow-sm">
              <Card.Body className="p-0">
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link
                      eventKey="properties"
                      className="d-flex align-items-center"
                    >
                      <FaHome className="me-2" /> Properties Management
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="customers"
                      className="d-flex align-items-center"
                    >
                      <FaUsers className="me-2" /> Customers
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="owners"
                      className="d-flex align-items-center"
                    >
                      <FaUser className="me-2" /> Property Owners
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="contracts"
                      className="d-flex align-items-center"
                    >
                      <FaFileContract className="me-2" /> Contracts
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={9} md={8}>
            <Card className="shadow-sm">
              <Card.Body>
                <Tab.Content>
                  {/* Properties Tab */}
                  <Tab.Pane eventKey="properties">
                    <h3>Managed Properties</h3>
                    {loading ? (
                      <p>Loading properties...</p>
                    ) : properties.length === 0 ? (
                      <p>No properties assigned yet.</p>
                    ) : (
                      <Row>
                        {properties.map((property) => {
                          // Find any contract associated with this property
                          const propertyContract = contracts.find(
                            (c) => c.property._id === property._id
                          );

                          const contractStatus = propertyContract
                            ? propertyContract.status
                            : null;

                          return (
                            <Col lg={6} className="mb-3" key={property._id}>
                              <Card>
                                <Card.Img
                                  variant="top"
                                  src={
                                    property.images?.[0] ||
                                    "https://via.placeholder.com/300x200"
                                  }
                                  alt={property.name}
                                  style={{
                                    height: "200px",
                                    objectFit: "cover",
                                  }}
                                />

                                <Card.Body>
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <Card.Title>
                                      {property.title || property.name}
                                    </Card.Title>

                                    {/* Contract Status Badge */}
                                    {contractStatus && (
                                      <Badge
                                        bg={getContractStatusBadgeColor(
                                          contractStatus
                                        )}
                                        className="ms-2"
                                      >
                                        {contractStatus === "active"
                                          ? "Contracted"
                                          : contractStatus ===
                                            "pending_customer"
                                            ? "Pending Customer"
                                            : contractStatus === "pending_owner"
                                              ? "Pending Owner"
                                              : contractStatus === "cancelled"
                                                ? "Cancelled"
                                                : "Pending"}
                                      </Badge>
                                    )}
                                  </div>

                                  <Card.Text>
                                    {property.address} <br />$
                                    {property.price.toLocaleString()}/
                                    {property.type === "rental"
                                      ? "month"
                                      : "total"}{" "}
                                    • {property.bhk} beds •{" "}
                                    {/* {property.bathrooms || "1"} baths */}{property.type}
                                  </Card.Text>

                                  <div className="d-grid">
                                    <Button
                                      variant="outline-primary"
                                      onClick={() =>
                                        handleShowApplications(property)
                                      }
                                    >
                                      Applications
                                      {getPendingApplicationsCount(
                                        property._id
                                      ) > 0 && (
                                          <Badge bg="danger" className="ms-2">
                                            {getPendingApplicationsCount(
                                              property._id
                                            )}
                                          </Badge>
                                        )}
                                    </Button>
                                  </div>
                                </Card.Body>

                                <Card.Footer className="text-muted d-flex justify-content-between align-items-center">
                                  <span>
                                    Total Applications:{" "}
                                    {getApplicationsCount(property._id)}
                                  </span>

                                  {/* Contract View Button - if a contract exists */}

                                  {propertyContract && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() =>
                                        handleViewContract(propertyContract)
                                      }
                                    >
                                      View Contract
                                    </Button>
                                  )}
                                </Card.Footer>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                  </Tab.Pane>

                  {/* Customers Tab */}
                  <Tab.Pane eventKey="customers">
                    <h3>Customers</h3>
                    {loading ? (
                      <p>Loading customers...</p>
                    ) : customers.length === 0 ? (
                      <p>No customers associated yet.</p>
                    ) : (
                      <Table responsive striped hover>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Applications</th>
                            {/* <th>Actions</th> */}
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((customer) => (
                            <tr key={customer._id}>
                              <td>{customer.firstName + " " + customer.lastName}</td>
                              <td>{customer.email}</td>
                              <td>{customer.phone}</td>
                              <td>
                                {
                                  applications.filter(
                                    (app) => app.customer._id === customer._id
                                  ).length
                                }
                              </td>
                              {}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Tab.Pane>

                  {/* Owners Tab */}
                  <Tab.Pane eventKey="owners">
                    <h3>Property Owners</h3>
                    {loading ? (
                      <p>Loading owners...</p>
                    ) : owners.length === 0 ? (
                      <p>No property owners associated yet.</p>
                    ) : (
                      <Table responsive striped hover>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Properties</th>
                            {/* <th>Actions</th> */}
                          </tr>
                        </thead>
                        <tbody>
                          {owners.map((owner) => (
                            <tr key={owner._id}>
                              <td>{owner.firstName + " " + owner.lastName}</td>
                              <td>{owner.email}</td>
                              <td>{owner.phone}</td>
                              <td>
                                {
                                  properties.filter(
                                    (prop) => prop.owner._id === owner._id
                                  ).length
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Tab.Pane>

                  {/* Contracts Tab */}
                  <Tab.Pane eventKey="contracts">
                    <h3>Contracts</h3>
                    {loading ? (
                      <p>Loading contracts...</p>
                    ) : contracts.length === 0 ? (
                      <p>No contracts created yet.</p>
                    ) : (
                      <Table responsive striped hover>
                        <thead>
                          <tr>
                            <th>Property</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th>Created</th>
                            <th>Status</th>
                            {/* <th>Actions</th> */}
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.map((contract) => {
                            const property =
                              properties.find(
                                (p) => p._id === contract.property._id
                              ) || {};
                            const customer =
                              customers.find(
                                (c) => c._id === contract.customer._id
                              ) || {};

                            return (
                              <tr key={contract._id}>
                                <td>{property.name || "Unknown Property"}</td>
                                <td>{customer.firstName + " " + customer.lastName || "Unknown Customer"}</td>
                                <td>
                                  {contract.type === "rental"
                                    ? "Rental"
                                    : "Sale"}
                                </td>
                                <td>
                                  {new Date(
                                    contract.contractDate
                                  ).toLocaleDateString()}
                                </td>
                                <td>
                                  <Badge
                                    bg={getContractStatusBadgeColor(
                                      contract.status
                                    )}
                                  >
                                    {getContractStatusLabel(contract.status)}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </Tab.Pane>
                </Tab.Content>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Tab.Container>

      {/* Applications Modal */}
      <Modal
        show={showApplications}
        onHide={() => setShowApplications(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Applications for {selectedProperty ? selectedProperty.name : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProperty && (
            <>
              {applications.filter(
                (app) => app.property._id === selectedProperty._id
              ).length === 0 ? (
                <p>No applications for this property yet.</p>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Date Applied</th>
                      <th>Status</th>
                      <th>Contract Status</th>
                      <th>Price Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications
                      .filter((app) => app.property._id === selectedProperty._id)
                      .map((application) => {
                        const customer =
                          customers.find(
                            (c) => c._id === application.customer._id
                          ) || {};

                        // Check if there's an existing contract for this application
                        const existingContract = contracts.find(
                          (c) =>
                            c.property._id === application.property._id &&
                            c.customer._id === application.customer._id
                        );

                        // Flag to determine if a contract has been created for this application
                        const contractCreated =
                          existingContract || application.contractCreated;

                        return (
                          <tr key={application._id}>
                            <td>
                              {customer.firstName + " " + customer.lastName || "Unknown"}
                              <br />
                              <small className="text-muted">
                                {customer.email}
                              </small>
                            </td>
                            <td>
                              {new Date(
                                application.createdAt
                              ).toLocaleDateString()}
                            </td>
                            <td>
                              <Badge
                                bg={
                                  application.status === "approved"
                                    ? "success"
                                    : application.status === "rejected"
                                      ? "danger"
                                      : "warning"
                                }
                              >
                                {application.status.charAt(0).toUpperCase() +
                                  application.status.slice(1)}
                              </Badge>
                            </td>
                            <td>
                              {contractCreated ? (
                                <Badge
                                  bg={
                                    existingContract
                                      ? getContractStatusBadgeColor(
                                        existingContract.status
                                      )
                                      : "info"
                                  }
                                >
                                  {existingContract
                                    ? existingContract.status ===
                                      "pending_customer"
                                      ? "Awaiting Customer"
                                      : existingContract.status ===
                                        "pending_owner"
                                        ? "Awaiting Owner"
                                        : existingContract.status === "active"
                                          ? "Active"
                                          : existingContract.status === "cancelled"
                                            ? "Cancelled"
                                            : "Unknown"
                                    : "Contract Created"}
                                </Badge>
                              ) : (
                                <span className="text-muted">No Contract</span>
                              )}
                            </td>
                            <td>
                              {application.needsOwnerPriceApproval ? (
                                <Badge bg="warning">Waiting for Owner</Badge>
                              ) : application.priceApproved === false ? (
                                <Badge bg="danger">Owner Rejected Price</Badge>
                              ) : contractCreated ? (
                                <Badge bg="success">Price Accepted</Badge>
                              ) : (application.status === "approved" && !application.priceApproved) ? (
                                <Badge bg="info">Needs Price Confirmation</Badge>
                              ) : application.priceApproved ? (
                                <Badge bg="success">Price Accepted</Badge>
                              ) : (
                                <span>-</span>
                              )}
                              {(!application.priceApproved && application.rejectionReason && application.rejectionReason !== "") && (
                                <div className="alert alert-danger mt-2 p-2 small">
                                  <strong>Reason:</strong> {application.rejectionReason}
                                </div>
                              )}
                            </td>
                            <td>
                              {application.status === "pending" && (
                                <>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    className="me-2"
                                    onClick={() =>
                                      handleApproveApplication(application._id)
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() =>
                                      handleRejectApplication(application._id)
                                    }
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {application.status === "approved" && !contractCreated && (
                                <>
                                  {application.needsOwnerPriceApproval ? (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled
                                    >
                                      Waiting for Owner
                                    </Button>
                                  ) : application.priceApproved === false ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedApplicationForPrice(application);
                                        setShowPriceConfirmation(true);
                                      }}
                                    >
                                      Try New Price
                                    </Button>
                                  ) : application.priceApproved === true ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleCreateContract(application, application.finalPrice)}
                                    >
                                      Create Contract
                                    </Button>
                                  ) : application.needsPriceConfirmation ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedApplicationForPrice(application);
                                        setShowPriceConfirmation(true);
                                      }}
                                    >
                                      Confirm Price
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedApplicationForPrice(application);
                                        setShowPriceConfirmation(true);
                                      }}
                                    >
                                      Set Price
                                    </Button>
                                  )}
                                </>
                              )}
                              {contractCreated && (
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => {
                                    // Close applications modal
                                    setShowApplications(false);

                                    // Navigate to contracts tab and view the contract
                                    setActiveTab("contracts");

                                    // If we have the contract object, view it directly
                                    if (existingContract) {
                                      handleViewContract(existingContract);
                                    }
                                    // Otherwise, find the contract by ID if available
                                    else if (application.contractId) {
                                      const contract = contracts.find(
                                        (c) => c._id === application.contractId
                                      );
                                      if (contract) {
                                        handleViewContract(contract);
                                      }
                                    }
                                  }}
                                >
                                  View Contract
                                </Button>
                              )}
                              {application.status === "rejected" && (
                                <Button variant="outline-secondary" size="sm">
                                  View Details
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowApplications(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Price Confirmation Modal */}
      <PriceConfirmationModal
        show={showPriceConfirmation}
        onHide={() => setShowPriceConfirmation(false)}
        property={
          selectedApplicationForPrice
            ? properties.find(p => p._id === selectedApplicationForPrice.property._id)
            : null
        }
        application={selectedApplicationForPrice}
        onCreateContract={handleCreateContract}
        onRequestOwnerApproval={handleRequestOwnerApproval}
      />

      {/* Contract Form Modal */}
      <Modal
        show={showContractForm}
        onHide={() => setShowContractForm(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Contract</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <Form onSubmit={handleContractSubmit}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Contract Type</Form.Label>
                    <Form.Select
                      name="type"
                      value={contractForm.type}
                      onChange={handleContractFormChange}
                      required
                    >
                      <option value="rental">Rental</option>
                      <option value="sale">Sale</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Contract Status</Form.Label>
                    <Form.Control
                      type="text"
                      value="Pending Customer Approval"
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={contractForm.startDate}
                      onChange={handleContractFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={contractForm.endDate}
                      onChange={handleContractFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Closing Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="closingDate"
                      value={contractForm.closingDate}
                      onChange={handleContractFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      {contractForm.type === "rental"
                        ? "Monthly Rent"
                        : "Sale Price"}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="salePrice"
                      value={contractForm.salePrice}
                      onChange={handleContractFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Deposit Amount</Form.Label>
                    <Form.Control
                      type="number"
                      name="depositAmount"
                      value={contractForm.depositAmount}
                      onChange={handleContractFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Payment Terms</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="paymentTerms"
                      value={contractForm.paymentTerms}
                      onChange={handleContractFormChange}
                      placeholder="Describe payment terms and conditions"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Property Information</Form.Label>
                <Form.Control
                  type="text"
                  value={
                    properties.find(
                      (p) => p._id === selectedApplication.property._id
                    )?.name || ""
                  }
                  disabled
                />
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Customer</Form.Label>
                    <Form.Control
                      type="text"
                      value={
                        (() => {
                          const customer = customers.find(
                            (c) => c._id === selectedApplication.customer._id
                          );
                          return customer ? `${customer.firstName} ${customer.lastName}` : "";
                        })()
                      }
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Owner</Form.Label>
                    <Form.Control
                      type="text"
                      value={

                        (() => {
                          const owner = owners.find(
                            (o) =>
                              o._id ===
                              properties.find(
                                (p) => p._id === selectedApplication.property._id
                              )?.owner._id
                          );
                          return owner ? `${owner.firstName} ${owner.lastName}` : "";
                        })()
                      }
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="text-end mt-4">
                <Button
                  variant="secondary"
                  className="me-2"
                  onClick={() => setShowContractForm(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Create Contract & Send to Customer
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Contract Details Modal */}

      <ContractDetails
        contract={selectedContract}
        properties={properties}
        customers={customers}
        owners={owners}
        show={showContractDetails}
        onHide={() => setShowContractDetails(false)}
        userRole="realtor"
      />
    </Container>
  );
};

export default RealtorDashboard;
