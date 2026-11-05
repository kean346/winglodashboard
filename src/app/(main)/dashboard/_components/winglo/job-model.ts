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
