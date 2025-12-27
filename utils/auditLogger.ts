import { Request } from 'express';
import mongoose from 'mongoose';
import Audit from '../model/Audit';

type LogAuditParams = {
  req: Request;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  reason?: string;
  before?: any;
  after?: any;
  context?: any;
};

export const logAudit = async ({
  req,
  action,
  entityType,
  entityId,
  reason,
  before,
  after,
  context,
}: LogAuditParams): Promise<void> => {
  try {
    const actorId = (req.userAuth as any)?._id;
    const actorRole = (req.userAuth as any)?.role;

    if (!actorId || !actorRole) return;

    await Audit.create({
      action,
      entityType,
      entityId,
      actorId,
      actorRole,
      reason,
      before,
      after,
      context,
    });
  } catch (err) {
    // Swallow audit errors to avoid blocking main flow
    // Optionally: add logger here if needed
  }
};

export default logAudit;