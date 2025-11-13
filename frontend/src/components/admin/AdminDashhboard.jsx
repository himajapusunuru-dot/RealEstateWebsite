import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaHome,
  FaUserTie,
  FaFileContract,
  FaCheckCircle,
  FaTimesCircle,
  FaSignOutAlt, // Ensure this is explicitly added
} from "react-icons/fa";
import LoadingSpinner from "../../common/LoadingSpinner";
import Alert from "../../common/Alert";
import api from "../../api/axiosInstance";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../../common/Modal"

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOwners: 0,
    // totalProperties: 0,
    totalRealtors: 0,
    // totalContracts: 0,
    pendingApprovals: 0
  });

  const [owners, setOwners] = useState([]);
  const [realtors, setRealtors] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [pendingRealtors, setPendingRealtors] = useState([]);

  const [showOwnersList, setShowOwnersList] = useState(false);
  const [showRealtorsList, setShowRealtorsList] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userTypeToDelete, setUserTypeToDelete] = useState("");

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    fetchStats();
    fetchPendingOwners();
    fetchPendingRealtors();
  }, []);

  // Fetch owners when owners list is shown
  useEffect(() => {
    if (showOwnersList) {
      fetchOwners();
    }
  }, [showOwnersList]);

  // Fetch realtors when realtors list is shown
  useEffect(() => {
    if (showRealtorsList) {
      fetchRealtors();
    }
  }, [showRealtorsList]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(response.data)
      setStats(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await api.get("/admin/owners?status=approved", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwners(response.data);
    } catch (err) {
      setError("Failed to fetch owners. Please try again.");
      console.error(err);
    }
  };

  const fetchRealtors = async () => {
    try {
      const response = await api.get("/admin/realtors?status=approved", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRealtors(response.data);
    } catch (err) {
      setError("Failed to fetch realtors. Please try again.");
      console.error(err);
    }
  };

  const fetchPendingOwners = async () => {
    try {
      const response = await api.get("/admin/owners/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingOwners(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRealtors = async () => {
    try {
      const response = await api.get("/admin/realtors/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRealtors(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    // Show confirmation dialog
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (confirmLogout) {
      try {
        // Call logout method from useAuth
        logout();

        // Redirect to admin login page
        navigate("/admin");
      } catch (err) {
        // Handle any logout errors
        setError("Failed to log out. Please try again.");
      }
    }
  };

  const handleApproveUser = async (userId, userType) => {
    try {
      const response = await api.patch(
        `/admin/users/${userId}/approve`,
        { userType: userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.status == 200) {
        throw new Error("Failed to approve user");
      }

    

      // Refresh data
      fetchStats();

      if (showOwnersList && userType === "owner") {
        fetchOwners();
      }
      
      if (showRealtorsList && userType === "realtor") {
        fetchRealtors();
      }
      
      fetchPendingOwners();
      fetchPendingRealtors();

      setSuccess(
        `${userType === "owner" ? "Owner" : "Realtor"} approved successfully.`
      );

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

    
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectUser = async (userId, userType) => {
    try {
      const response = await api.patch(
        `/admin/users/${userId}/reject`,
        { userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.status == 200) {
        throw new Error("Failed to reject user");
      }

      // Refresh data
      fetchStats();
      fetchPendingOwners();
      fetchPendingRealtors();

      setSuccess(
        `${userType === "owner" ? "Owner" : "Realtor"} rejected successfully.`
      );

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = (user, userType) => {
    setUserToDelete(user);
    setUserTypeToDelete(userType);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const endpoint =
        userTypeToDelete === "owner"
          ? `/admin/owners/${userToDelete._id}`
          : `/admin/realtors/${userToDelete._id}`;

      await api.delete(endpoint);

      // Remove user from state and refresh stats
      if (userTypeToDelete === "owner") {
        setOwners(owners.filter((owner) => owner._id !== userToDelete._id));
      } else {
        setRealtors(
          realtors.filter((realtor) => realtor._id !== userToDelete._id)
        );
      }

      // Refresh stats after deletion
      fetchStats();

      setSuccess(
        `${userTypeToDelete === "owner" ? "Owner" : "Realtor"
        } deleted successfully.`
      );
      setShowDeleteModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Failed to delete user. Please try again.");
      console.error(err);
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setUserToDelete(null);
    setUserTypeToDelete("");
    setShowDeleteModal(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container-fluid px-4 py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Admin Dashboard</h1>
        <button className="btn btn-outline-danger" onClick={handleLogout}>
          <FaSignOutAlt className="me-2" /> Logout
        </button>
      </div>

      {error && <Alert type="danger" message={error} />}

      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      <div className="row">
        {/* Owners Card */}
        <div className="col-md-6 mb-4">
          <div className="card bg-primary text-white">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h5 className="card-title">Owners</h5>
                <h2 className="card-text">{stats.totalOwners}</h2>
              </div>
              <div>
                <i className="fas fa-user fa-3x"></i>
                <button
                  className="btn btn-light mt-2 d-block"
                  onClick={() => {
                    setShowOwnersList(true);
                    setShowRealtorsList(false);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Realtors Card */}
        <div className="col-md-6 mb-4">
          <div className="card bg-info text-white">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h5 className="card-title">Realtors</h5>
                <h2 className="card-text">{stats.totalRealtors}</h2>
              </div>
              <div>
                <i className="fas fa-user-tie fa-3x"></i>
                <button
                  className="btn btn-light mt-2 d-block"
                  onClick={() => {
                    setShowRealtorsList(true);
                    setShowOwnersList(false);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="card mt-4 mb-4">
        <div className="card-header bg-danger text-white">
          <h4 className="mb-0">
            Pending Approvals ({stats.pendingApprovals})
          </h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5>Pending Owners</h5>
              {pendingOwners.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOwners.map((owner) => (
                        <tr key={owner._id}>
                          <td>{owner.firstName + " " + owner.lastName}</td>
                          <td>{owner.email}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() =>
                                handleApproveUser(owner._id, "owner")
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                handleRejectUser(owner._id, "owner")
                              }
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No pending owner approvals</p>
              )}
            </div>

            <div className="col-md-6">
              <h5>Pending Realtors</h5>
              {pendingRealtors.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRealtors.map((realtor) => (
                        <tr key={realtor._id}>
                          <td>{realtor.firstName + " " + realtor.lastName}</td>
                          <td>{realtor.email}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() =>
                                handleApproveUser(realtor._id, "realtor")
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                handleRejectUser(realtor._id, "realtor")
                              }
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No pending realtor approvals</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owners List */}
      {showOwnersList && (
        <div className="card mt-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h4 className="mb-0">All Owners</h4>
            <button
              className="btn btn-light"
              onClick={() => setShowOwnersList(false)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            {owners.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner) => (
                      <tr key={owner._id}>
                        <td>{owner.firstName + " " + owner.lastName}</td>
                        <td>{owner.email}</td>
                        <td>{owner.phone || "N/A"}</td>
                        <td>{`${owner.address?.addressLane || ''},${owner.address?.city || ''},${owner.address?.state || ''},${owner.address?.zipcode || ''}` || "N/A"}</td>
                        <td>
                          {owner.status === "approved" ? (
                            <span className="badge bg-success">Approved</span>
                          ) : owner.status === "rejected" ? (
                            <span className="badge bg-danger">Rejected</span>
                          ) : (
                            <span className="badge bg-warning">Pending</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => handleApproveUser(owner._id, "owner")}
                            disabled={owner.status === "approved"}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectUser(owner._id, "owner")}
                            disabled={owner.status === "rejected"}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No owners found.</p>
            )}
          </div>
        </div>
      )}
      {/* {showOwnersList && (
        <div className="card mt-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h4 className="mb-0">All Owners</h4>
            <button
              className="btn btn-light"
              onClick={() => setShowOwnersList(false)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            {owners.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner) => (
                      <tr key={owner._id}>
                        <td>{owner.firstName + " " + owner.lastName}</td>
                        <td>{owner.email}</td>
                        <td>{owner.phone || "N/A"}</td>
                        <td>{`${owner.address.addressLane},${owner.address.city},${owner.address.state},${owner.address.zipcode}` || "N/A"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => handleApproveUser(owner._id, "owner")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectUser(owner._id, "owner")}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No owners found.</p>
            )}
          </div>
        </div>
      )} */}

      {/* Realtors List */}
      {showRealtorsList && (
        <div className="card mt-4">
          <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <h4 className="mb-0">All Realtors</h4>
            <button
              className="btn btn-light"
              onClick={() => setShowRealtorsList(false)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            {realtors.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realtors.map((realtor) => (
                      <tr key={realtor._id}>
                        <td>{realtor.firstName + " " + realtor.lastName}</td>
                        <td>{realtor.email}</td>
                        <td>{realtor.phone || "N/A"}</td>
                        <td>{`${realtor.address?.addressLane || ''},${realtor.address?.city || ''},${realtor.address?.state || ''},${realtor.address?.zipcode || ''}` || "N/A"}</td>
                        <td>
                          {realtor.status === "approved" ? (
                            <span className="badge bg-success">Approved</span>
                          ) : realtor.status === "rejected" ? (
                            <span className="badge bg-danger">Rejected</span>
                          ) : (
                            <span className="badge bg-warning">Pending</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => handleApproveUser(realtor._id, "realtor")}
                            disabled={realtor.status === "approved"}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectUser(realtor._id, "realtor")}
                            disabled={realtor.status === "rejected"}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No realtors found.</p>
            )}
          </div>
        </div>
      )}
      {/* {showRealtorsList && (
        <div className="card mt-4">
          <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <h4 className="mb-0">All Realtors</h4>
            <button
              className="btn btn-light"
              onClick={() => setShowRealtorsList(false)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            {realtors.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realtors.map((realtor) => (
                      <tr key={realtor._id}>
                        <td>{realtor.firstName + " " + realtor.lastName}</td>
                        <td>{realtor.email}</td>
                        <td>{realtor.phone || "N/A"}</td>
                        <td>{`${realtor.address.addressLane},${realtor.address.city},${realtor.address.state},${realtor.address.zipcode}` || "N/A"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => handleApproveUser(realtor._id, "realtor")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectUser(realtor._id, "realtor")}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No realtors found.</p>
            )}
          </div>
        </div>
      )} */}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <Modal
          title="Confirm Deletion"
          onClose={cancelDelete}
          footer={
            <>
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          }
        >
          <p>
            Are you sure you want to delete{" "}
            {userTypeToDelete === "owner" ? "owner" : "realtor"}{" "}
            <strong>{userToDelete.name}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
