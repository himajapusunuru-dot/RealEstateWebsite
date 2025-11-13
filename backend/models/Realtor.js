const mongoose = require('mongoose');

const realtorSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: { addressLane: String, city: String, state: String, zipcode: String },
  managedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  SSN: { type: String, unique: true },
});

module.exports = mongoose.model('Realtor', realtorSchema);