import ActivityLog from "../models/activityLog.model.js";

const logActivity = async ({
  projectId,
  actorId,
  action,
  targetType,
  targetId,
  details = {},
}) => {
  return ActivityLog.create({
    project: projectId,
    actor: actorId,
    action,
    targetType,
    targetId,
    details,
  });
};

export default logActivity;