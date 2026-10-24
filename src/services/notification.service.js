import Notification from "../models/notification.model.js";
import { emitToUser } from  "../socket.js";

const createNotification = async ({
  recipientId,
  actorId = null,
  projectId,
  type,
  title,
  message,
  resourceType,
  resourceId,
}) => {
  // Do not notify a user about their own action.
  if (actorId && recipientId.toString() === actorId.toString()) {

    return null;
  }

  // Save notification in MongoDB.
  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    project: projectId,
    type,
    title,
    message,
    resourceType,
    resourceId,
  });

  //  Push the saved notification to that user's sockets.
  emitToUser(
    recipientId.toString(),
    "notification:new",
    notification.toObject(),
  );

  // Return the saved notification to the caller.
  return notification;
};

export default createNotification;
