import mongoose, { Schema } from 'mongoose';
import { IAudit } from '../types/models';

const auditSchema = new Schema<IAudit>(
  {
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorRole: { type: String, required: true },
    reason: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    context: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditSchema.index({ entityType: 1, createdAt: -1 });
auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

auditSchema.set('toJSON', { virtuals: true });
auditSchema.set('toObject', { virtuals: true });

const Audit = mongoose.model<IAudit>('Audit', auditSchema);

export default Audit;
