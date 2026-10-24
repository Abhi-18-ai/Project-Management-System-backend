import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    enum: [
      "task_created",
      "task_updated",
      "task_assigned",
      "task_deleted",
      "comment_created",
      "member_added",
      "member_removed",
      "member_role_updated",
    ],
    required: true,
  },
  targetType:{
    type: String,
    enum: ["task", "comment", "member","project"],
    required: true,
  },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details:{
        type: mongoose.Schema.Types.ObjectId,
        default: {},   // Additional details about the action, stored as a JSON object
    },

    
}, {timestamps: true});

activityLogSchema.index({ project: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;