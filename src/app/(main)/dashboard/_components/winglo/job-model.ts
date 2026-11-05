import type { DemoData } from "./model";
/** Resolve existing record IDs without creating a second job dataset. */
export function resolveJob(data: DemoData, ref: string) {
  let booking = data.bookings.find((b) => b.id === ref);
  let quote = data.quotes.find((q) => q.id === ref || q.id === booking?.quoteId);
  const enquiry = data.enquiries.find((e) => e.id === ref || e.id === quote?.enquiryId);
  if (!quote && enquiry) {
    const quotes = data.quotes.filter((q) => q.enquiryId === enquiry.id);
    quote =
      quotes.find((q) =>
        data.bookings.some((b) => b.quoteId === q.id && !["Completed", "Cancelled"].includes(b.status)),
      ) ??
      quotes.find(
        (q) => !["Rejected", "Expired"].includes(q.status) && !data.bookings.some((b) => b.quoteId === q.id),
      ) ??
      quotes.find((q) => data.bookings.some((b) => b.quoteId === q.id)) ??
      quotes.find((q) => q.status === "Accepted (Simulated)") ??
      quotes[0];
  }
  if (!booking && quote)
    booking =
      data.bookings.find((b) => b.quoteId === quote.id && !["Completed", "Cancelled"].includes(b.status)) ??
      data.bookings.find((b) => b.quoteId === quote.id);
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
export const jobUrl = (id: string) => `/dashboard/enquiries/${encodeURIComponent(id)}`;

/** Each leaf is real work: bookings and unbooked quotes. New requests stay in the Inbox.
 * Keeping extra legacy quote/booking branches avoids hiding existing records. */
export function listJobs(data: DemoData) {
  const bookedQuotes = new Set(data.bookings.map((b) => b.quoteId).filter(Boolean));
  const refs = [
    ...data.bookings.map((b) => b.id),
    ...data.quotes.filter((q) => !bookedQuotes.has(q.id)).map((q) => q.id),
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

/** Enquiries remain visible throughout their lifecycle; only explicitly closed requests are archived. */
export function inboxEnquiries(data: DemoData, includeClosed = true) {
  return includeClosed ? data.enquiries : data.enquiries.filter((e) => e.status !== "Closed");
}
export function enquiryProgress(job: ReturnType<typeof resolveJob>) {
  const { enquiry: e, quote: q, booking: b } = job;
  let step = 0,
    status = "New enquiry",
    next = "Review request details";
  if (e?.status === "Ready for Quote") {
    status = "Ready for quote";
    next = "Prepare Quote";
  }
  if (e?.status === "Awaiting Details") {
    status = "Needs details";
    next = "Complete missing details";
  }
  if (q) {
    step = 1;
    status = "Draft quote";
    next = "Review & Send Quote";
  }
  if (q?.status === "Sent (Simulated)") {
    status = "Waiting for acceptance";
    next = "Await customer response";
  }
  if (q?.status === "Accepted (Simulated)") {
    step = 2;
    status = "Accepted";
    next = "Schedule cleaning; record payment when received";
  }
  if (q && ["Rejected", "Expired"].includes(q.status)) {
    status = q.status;
    next = "Revise Quote";
  }
  if (b) {
    step = 3;
    status = b.status;
    next = jobNextAction(job);
  }
  if (b?.status === "Confirmed") status = "Scheduled";
  if (b?.status === "In Progress") status = "Cleaning in progress";
  if (b?.status === "Completed") {
    step = 4;
    next = "View history and check payment";
  }
  if (e?.status === "Closed" && !b) {
    status = "Closed";
    next = "Reopen enquiry if needed";
  }
  return { step, status, next };
}
