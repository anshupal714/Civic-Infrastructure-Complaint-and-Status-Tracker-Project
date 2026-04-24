const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
};

const complaintSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['Road', 'Water', 'Electricity', 'Sanitation', 'Street Light', 'Park', 'Drainage', 'Other'] },
  location: { type: String, required: true },
  ward: { type: String, default: null },
  priority: { type: String, required: true, default: 'medium', enum: ['low', 'medium', 'high'] },
  status: { type: String, required: true, default: 'pending', enum: ['pending', 'in_progress', 'resolved', 'rejected'] },
  image_path: { type: String, default: null },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, schemaOptions);

module.exports = mongoose.model('Complaint', complaintSchema);
