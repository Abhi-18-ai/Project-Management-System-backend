import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["manager", "member", "viewer"],
      default: "member",
    },
  },
  {
    timestamps: true,
  },
);
projectMemberSchema.index(
  // Create a compound index on the project and user fields to ensure uniqueness of project members.
  {
    //  This prevents the same user from being added multiple times to the same project.{
    project: 1, // Index the project field in ascending order.
    user: 1, // Index the user field in ascending order.
  },
  {
    unique: true, // Ensure that the combination of project and user is unique in the collection. This prevents duplicate entries for the same user in the same project.
  },
);
const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);

export default ProjectMember;