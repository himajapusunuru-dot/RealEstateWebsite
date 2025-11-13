import React from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import generateContractPdf from "./ContractPdfGenerator";

// Component to display signatures
const SignatureDisplay = ({ contract }) => {
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

/**
 * Shared Contract Details Component
 * @param {Object} props Component props
 * @param {Object} props.contract Contract object to display
 * @param {Array} props.properties List of properties
 * @param {Array} props.customers List of customers
 * @param {Array} props.owners List of owners
 * @param {boolean} props.show Whether to show the modal
 * @param {Function} props.onHide Function to hide the modal
 * @param {string} props.userRole Role of the current user (realtor, owner, customer)
 */
const ContractDetails = ({
  contract,
  properties = [],
  customers = [],
  owners = [],
  show,
  onHide,
  userRole = "realtor",
}) => {
  // Helper function for contract status label
  const getContractStatusLabel = (status) => {
    switch (status) {
      case "pending_customer":
        return userRole === "customer"
          ? "Waiting for Your Approval"
          : "Waiting for Customer Approval";
      case "pending_owner":
        return userRole === "owner"
          ? "Waiting for Your Approval"
          : "Waiting for Owner Approval";
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

  // Helper function for contract status badge color
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

  if (!contract) return null;

  // Find related entities
  const property =
    properties.find((p) => p._id === contract.property._id) || {};
    console.log(properties);
    console.log(customers);
    console.log(owners);
    console.log(contract);
  const customer = customers.find((c) => c._id === contract.customer._id) || {};
  const owner = owners.find((o) => o._id === contract.owner._id) || {};

  // Handle PDF download
  const handleDownloadPdf = () => {
    generateContractPdf(contract, property, customer, owner);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Sale Contract Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row mb-4">
          <div className="col-md-6">
            <h6>Property</h6>
            <p>{property.name || "Unknown Property"}</p>
          </div>
          <div className="col-md-6">
            <h6>Status</h6>
            <span
              className={`badge bg-${getContractStatusBadgeColor(
                contract.status
              )}`}
            >
              {getContractStatusLabel(contract.status)}
            </span>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-4">
            <h6>Contract Date</h6>
            <p>{new Date(contract.contractDate).toLocaleDateString()}</p>
          </div>
          <div className="col-md-4">
            <h6>Start Date</h6>
            <p>{new Date(contract.startDate).toLocaleDateString()}</p>
          </div>
          <div className="col-md-4">
            <h6>End Date</h6>
            <p>{new Date(contract.endDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <h6>
              {contract.type === "rental" ? "Monthly Rent" : "Sale Price"}
            </h6>
            <p>${contract.salePrice?.toLocaleString() || "0"}</p>
          </div>
          <div className="col-md-6">
            <h6>Deposit Amount</h6>
            <p>${contract.depositAmount?.toLocaleString() || "0"}</p>
          </div>
        </div>

        <div className="mb-4">
          <h6>Payment Terms</h6>
          <p>{contract.paymentTerms || "Not specified"}</p>
        </div>

        {/* Loan Details Section - Only shown for sale contracts */}
        {contract.type === "sale" && (
          <div className="loan-details-section mb-4">
            <h5 className="mb-3">Loan Details</h5>

            {contract.loanDetails &&
            Object.keys(contract.loanDetails).length > 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <h6>Loan Amount</h6>
                      <p>
                        $
                        {contract.loanDetails.amount?.toLocaleString() ||
                          "Not provided"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Loan Provider</h6>
                      <p>{contract.loanDetails.provider || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <h6>Loan Type</h6>
                      <p>
                        {contract.loanDetails.type
                          ? contract.loanDetails.type.charAt(0).toUpperCase() +
                            contract.loanDetails.type.slice(1)
                          : "Not provided"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Interest Rate</h6>
                      <p>
                        {contract.loanDetails.interestRate
                          ? `${contract.loanDetails.interestRate}%`
                          : "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <h6>Approval Date</h6>
                      <p>
                        {contract.loanDetails.approvalDate
                          ? new Date(
                              contract.loanDetails.approvalDate
                            ).toLocaleDateString()
                          : "Not provided"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Loan Status</h6>
                      <p>
                        <span
                          className={`badge ${
                            contract.loanDetails.status === "approved"
                              ? "bg-success"
                              : contract.loanDetails.status === "pre-approved"
                              ? "bg-info"
                              : contract.loanDetails.status === "pending"
                              ? "bg-warning"
                              : contract.loanDetails.status === "denied"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {contract.loanDetails.status
                            ? contract.loanDetails.status
                                .charAt(0)
                                .toUpperCase() +
                              contract.loanDetails.status.slice(1)
                            : "Not provided"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : userRole === "realtor" &&
              contract.status === "pending_customer" ? (
              <div className="alert alert-info">
                Waiting for customer to provide loan details when they sign the
                contract.
              </div>
            ) : (
              <div className="alert alert-warning">
                No loan details have been provided for this contract.
              </div>
            )}
          </div>
        )}

        {/* Contract Signatures Section */}
        <SignatureDisplay contract={contract} />

        {/* Party Information */}
        {userRole == "realtor" && (
          <div className="row mt-4">
            <div className="col-md-6">
              <h6>Customer Information</h6>
              <p>
                {customer.firstName + " " + customer.lastName || "Unknown"}
                <br />
                <small className="text-muted">
                  {customer.email || ""}
                  {customer.phone ? ` • ${customer.phone}` : ""}
                </small>
              </p>
            </div>
            <div className="col-md-6">
              <h6>Owner Information</h6>
              <p>
                {owner.firstName + " " + owner.lastName || "Unknown"}
                <br />
                <small className="text-muted">
                  {owner.email || ""}
                  {owner.phone ? ` • ${owner.phone}` : ""}
                </small>
              </p>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        {/* {contract.status === "active" && (
          <Button 
            variant="primary"
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
        )} */}
      </Modal.Footer>
    </Modal>
  );
};

export default ContractDetails;
