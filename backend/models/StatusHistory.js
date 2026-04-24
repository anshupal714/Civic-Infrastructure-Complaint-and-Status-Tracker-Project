const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: { createdAt: 'changed_at', updatedAt: false }, // only track when it was changed
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
};

const statusHistorySchema = new mongoose.Schema({
  complaint_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  old_status: { type: String, required: true },
  new_status: { type: String, required: true },
  remark: { type: String, default: null }
}, schemaOptions);

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
