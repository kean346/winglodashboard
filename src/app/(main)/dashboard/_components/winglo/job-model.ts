import type { DemoData } from "./model";
/** Resolve existing record IDs without creating a second job dataset. */
export function resolveJob(data: DemoData, ref: string) {
  let booking = data.bookings.find((b) => b.id === ref);
  let quote = data.quotes.find((q) => q.id === ref || q.id === booking?.quoteId);
  const enquiry = data.enquiries.find((e) => e.id === ref || e.id === quote?.enquiryId);
  if (!quote && enquiry) {
    const quotes = data.quotes.filter((q) => q.enquiryId === enquiry.id);
    quote =
      quotes.find((q) => data.bookings.some((b) => b.quoteId === q.id)) ??
      quotes.find((q) => q.status === "Accepted (Simulated)") ??
      quotes[0];
  }
  if (!booking && quote) booking = data.bookings.find((b) => b.quoteId === quote.id);
  const customer = data.customers.find(
    (c) => c.id === (enquiry?.customerId ?? quote?.customerId ?? booking?.customerId),
  );
  const service = data.settings.services.find(
    (s) => s.id === (enquiry?.serviceId ?? quote?.serviceId ?? booking?.serviceId),
  );
  let stage = 0;
  if (quote) stage = 1;
  if (booking) stage = 2;
  if (booking?.status === "Completed") stage = 3;
  return { enquiry, quote, booking, customer, service, stage };
}
export const jobUrl = (id: string) => `/dashboard/jobs/${encodeURIComponent(id)}`;

/** Each leaf is real work: bookings, unbooked quotes, then unquoted requests.
 * Keeping extra legacy quote/booking branches avoids hiding existing records. */
export function listJobs(data: DemoData) {
  const bookedQuotes = new Set(data.bookings.map((b) => b.quoteId).filter(Boolean));
  const quotedRequests = new Set(data.quotes.map((q) => q.enquiryId).filter(Boolean));
  const refs = [
    ...data.bookings.map((b) => b.id),
    ...data.quotes.filter((q) => !bookedQuotes.has(q.id)).map((q) => q.id),
    ...data.enquiries.filter((e) => !quotedRequests.has(e.id)).map((e) => e.id),
  ];
  return refs.map((ref) => ({ ref, ...resolveJob(data, ref) }));
}
export function jobNextAction(job: ReturnType<typeof resolveJob>) {
  const { booking: b, quote: q, enquiry: e } = job;
  if (b) {
    const actions = {
      Pending: "Confirm Booking",
      Confirmed: "Start Cleaning",
      "In Progress": "Complete Job",
      Completed: "View Summary / Customer History",
      Cancelled: "Reschedule Cleaning",
    };
    return actions[b.status];
  }
  if (q?.status === "Accepted (Simulated)") return "Schedule Cleaning";
  if (q?.status === "Sent (Simulated)") return "Waiting for Customer";
  if (q) return ["Rejected", "Expired"].includes(q.status) ? "Revise Quote" : "Review & Send Quote";
  if (e?.status === "Closed") return "Reopen Request";
  if (e && ["New", "Awaiting Details"].includes(e.status)) return "Review Request";
  return "Prepare Quote";
}
