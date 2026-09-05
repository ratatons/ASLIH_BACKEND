import { Schema, model, Document, Types } from "mongoose";

export interface ITicketTypeTeam extends Document {
  _id: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  teamId: Types.ObjectId;
}

const TicketTypeTeamSchema = new Schema<ITicketTypeTeam>({
  ticketTypeId: { type: Schema.Types.ObjectId, ref: "TicketType", required: true },
  teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
});

TicketTypeTeamSchema.index({ ticketTypeId: 1, teamId: 1 }, { unique: true });

export const TicketTypeTeam = model<ITicketTypeTeam>("TicketTypeTeam", TicketTypeTeamSchema);
