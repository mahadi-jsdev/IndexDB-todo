import { Schema, model, models, Document } from "mongoose";

export interface TodoDocument extends Document {
  text: string;
  status: "todo" | "planned" | "ongoing" | "done";
  createdAt: Date;
  ongoingStartTime?: Date;
  completedAt?: Date;
  image?: string;
}

const TodoSchema = new Schema<TodoDocument>(
  {
    text: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["todo", "planned", "ongoing", "done"],
      default: "todo",
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
    ongoingStartTime: Date,
    completedAt: Date,
    image: String,
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export default models.Todo || model<TodoDocument>("Todo", TodoSchema);

