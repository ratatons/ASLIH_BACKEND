import { Counter } from "../models/Counter";

/**
 * Generates an authoritative, sequential ticket code such as "ASL-000001"
 * using an atomic findOneAndUpdate counter document, so it is safe under
 * concurrent ticket creation.
 */
export async function generateTicketCode(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "issue_ticket_code" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = counter.seq.toString().padStart(6, "0");
  return `ASL-${seq}`;
}
