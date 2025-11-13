const express = require('express');
const router = express.Router();
const { createProperty, getProperties, requestPriceApproval, priceApprovalApplications, approvePrice } = require('../controllers/propertyController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

router.post('/',
  authMiddleware,
  roleMiddleware('owner'),
  createProperty
);

router.get('/', getProperties);

router.post('/applications/:applicationId/request-price-approval',
  authMiddleware,
  roleMiddleware('realtor'),
  requestPriceApproval
);

router.get('/:ownerId/price-approval-requests',
  authMiddleware,
  roleMiddleware('owner'),
  priceApprovalApplications
);

router.put('/:ownerId/applications/:applicationId/approve-price',
  authMiddleware,
  roleMiddleware('owner'),
  approvePrice
);

module.exports = router;