import { Schema, model, Document } from "mongoose";

// Generic atomic counter, used for sequential ticket codes.
export interface ICounter extends Document {
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>("Counter", CounterSchema);
