import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import api from '../api/axiosInstance';

/**
 * Simplified price confirmation component with frontend-only price checking
 */
const PriceConfirmationModal = ({ 
  show, 
  onHide, 
  property,
  application,
  onCreateContract, 
  token
}) => {
  const [finalPrice, setFinalPrice] = useState(
    property ? property.price : ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Calculate if price is lower and the difference
  const isPriceLower = finalPrice < (property?.price || 0);
  const priceDifference = property ? (property.price - finalPrice) : 0;
  const percentageDiff = property?.price ? 
    ((priceDifference / property.price) * 100).toFixed(2) : 0;
  
  // Handle price change
  const handlePriceChange = (e) => {
    const value = e.target.value;
    setFinalPrice(value ? parseFloat(value) : '');
    setError('');
  };
  
  // Handle price confirmation
  const handleConfirmPrice = async () => {
    // Validate the price
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      setError('Please enter a valid price greater than zero');
      return;
    }

    setLoading(true);
    
    try {
      // Send request to the backend to handle price approval
      const response = await api.post(
        `/properties/applications/${application._id}/request-price-approval`,
        { finalPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // If successful
      if (response.data.success) {
        // Check if owner approval is needed
        if (response.data.needsOwnerApproval) {
          // If we need owner approval, show a message and close the modal
          alert('Price approval request has been sent to the owner. You will be notified when they respond.');
          onHide();
        } else {
          // If we don't need owner approval, proceed with contract creation
          alert('Price confirmed successfully. You can now create the contract.');
          // Call the callback to create contract with the confirmed price
          onCreateContract(application, finalPrice);
          onHide();
        }
      }
    } catch (error) {
      console.error('Error confirming price:', error);
      setError(error.response?.data?.message || 'Failed to confirm price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Property Price</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {property && (
          <>
            <div className="mb-3">
              <h6>Property: {property.name}</h6>
              <p className="mb-0">
                <strong>Listed Price: ${property.price?.toLocaleString()}</strong>
              </p>
            </div>
            
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Enter Final Price</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter the final price"
                value={finalPrice}
                onChange={handlePriceChange}
              />
              
              {isPriceLower && (
                <Alert variant="warning" className="mt-2">
                  <small>
                    This price is ${priceDifference.toLocaleString()} ({percentageDiff}%) 
                    lower than the listed price. Owner approval will be required.
                  </small>
                </Alert>
              )}
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}  disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirmPrice} 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing...
            </>
          ) : (
            isPriceLower ? 'Request Owner Approval' : 'Confirm Price'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PriceConfirmationModal;