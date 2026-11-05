import { type DemoData, id, localDate, type Question, sampleAnswer, serviceQuestions } from "./model";

export type ConversationDraft = {
  serviceId: string;
  answers: Record<string, string>;
  name: string;
  phone: string;
  location: string;
  preferredDate: string;
  cursor: number;
};
export type Journey = {
  view?: "customer" | "business";
  scenarioId: string;
  active: boolean;
  paused: boolean;
  minimized: boolean;
  completed: boolean;
  step: number;
  completedSteps: number[];
  route: string;
  draft: ConversationDraft;
  customerId?: string;
  enquiryId?: string;
  quoteId?: string;
  bookingId?: string;
  reminderPreviewed: boolean;
};
export type Activity = { id: string; time: string; label: string; customerId: string; recordId: string };
export const stages = [
  {
    title: "Customer starts a conversation",
    route: "/dashboard/demo",
    instruction: "Meet your fictional customer, then continue to collect their cleaning details.",
  },
  {
    title: "Collect cleaning information",
    route: "/dashboard/demo",
    instruction: "Answer the conversation questions, then choose Create Enquiry & Continue.",
  },
  {
    title: "Enquiry added to Winglo",
    route: "/dashboard/enquiries",
    instruction: "The highlighted enquiry is saved. Continue to generate its sample quotation.",
  },
  {
    title: "Generate a quotation",
    route: "/dashboard/quotations",
    instruction: "Review the prefilled service details and sample prices, then save the quotation.",
  },
  {
    title: "Review & simulate acceptance",
    route: "/dashboard/quotations",
    instruction: "Approve & simulate send on the highlighted quotation, then simulate customer acceptance.",
  },
  {
    title: "Confirm the cleaning booking",
    route: "/dashboard/bookings",
    instruction: "Save a booking from the accepted quote. Choose a date, available cleaner and Confirmed status.",
  },
  {
    title: "Preview the customer reminder",
    route: "/dashboard/demo",
    instruction: "Click Preview Customer Reminder to see the message, then select Next Step. No real message is sent.",
  },
  {
    title: "Complete the cleaning job",
    route: "/dashboard/bookings",
    instruction: "Mark the linked booking Completed and save. Customer history and completed-job revenue will update.",
  },
] as const;
export function freshJourney(): Journey {
  return {
    scenarioId: id("DEMO"),
    active: true,
    paused: false,
    minimized: false,
    completed: false,
    step: 0,
    completedSteps: [],
    route: "/dashboard/demo",
    draft: { serviceId: "", answers: {}, name: "", phone: "", location: "", preferredDate: localDate(1), cursor: 0 },
    reminderPreviewed: false,
  };
}
export function questionsFor(serviceId: string, data: DemoData): Question[] {
  return (serviceQuestions[serviceId] ?? []).map((q) =>
    q.key === "extras" ? { ...q, options: ["None", ...data.settings.extraOptions] } : q,
  );
}
export function conversationQuestions(draft: ConversationDraft, data: DemoData): Question[] {
  return [
    {
      key: "serviceId",
      label: "Welcome to Winglo Cleaning Services! We'd be happy to help. What cleaning service are you looking for?",
    },
    ...questionsFor(draft.serviceId, data),
    { key: "location", label: "Which suburb is the property in?" },
    { key: "preferredDate", label: "What date would you prefer?" },
    { key: "name", label: "What is your full name?" },
    { key: "phone", label: "What is your contact number?" },
  ];
}
export function answerFor(draft: ConversationDraft, key: string): string {
  if (["serviceId", "location", "preferredDate", "name", "phone"].includes(key))
    return draft[key as "serviceId" | "location" | "preferredDate" | "name" | "phone"];
  return draft.answers[key] ?? "";
}
export function answerValid(q: Question, answer: string) {
  if (!answer.trim()) return false;
  if (q.numeric && (!Number.isFinite(Number(answer)) || Number(answer) < 0)) return false;
  if (q.options && !q.options.includes(answer)) return false;
  if (q.key === "phone" && answer.replace(/\D/g, "").length < 10) return false;
  if (["preferredDate", "moveDate"].includes(q.key) && !/^\d{4}-\d{2}-\d{2}$/.test(answer)) return false;
  return true;
}
export function draftComplete(journey: Journey, data: DemoData) {
  const draft = journey.draft;
  return (
    data.settings.services.some((s) => s.id === draft.serviceId) &&
    conversationQuestions(draft, data).every((q) => answerValid(q, answerFor(draft, q.key)))
  );
}
export function stageReady(journey: Journey, data: DemoData, step = journey.step) {
  const e = data.enquiries.find((e) => e.id === journey.enquiryId);
  const q = data.quotes.find(
    (q) => q.id === journey.quoteId && q.enquiryId === e?.id && q.customerId === e?.customerId,
  );
  const b = data.bookings.find(
    (b) => b.id === journey.bookingId && b.quoteId === q?.id && b.customerId === q?.customerId,
  );
  const readiness = [
    true,
    !!e,
    !!e,
    !!q,
    q?.status === "Accepted (Simulated)",
    !!b && ["Confirmed", "In Progress", "Completed"].includes(b.status),
    journey.reminderPreviewed && !!b,
    b?.status === "Completed",
  ];
  return readiness[step] ?? false;
}
export function sampleDraft(journey: Journey, data: DemoData): ConversationDraft {
  const serviceId = journey.draft.serviceId || "home";
  const suffix = journey.scenarioId.replace(/\D/g, "").padEnd(6, "0").slice(-6);
  return {
    ...journey.draft,
    serviceId,
    answers: Object.fromEntries(questionsFor(serviceId, data).map((q) => [q.key, sampleAnswer(q, localDate(1))])),
    name: `Zanele Demo ${journey.scenarioId.slice(-4)}`,
    phone: `+27 00 ${suffix.slice(0, 3)} ${suffix.slice(3)}0`,
    location: "Linden, Johannesburg",
    preferredDate: localDate(1),
  };
}
export function recordActivity(before: DemoData, after: DemoData): Activity[] {
  const events: Omit<Activity, "id" | "time">[] = [];
  for (const e of after.enquiries)
    if (!before.enquiries.some((v) => v.id === e.id))
      events.push({ label: "New enquiry created", customerId: e.customerId, recordId: e.id });
  for (const q of after.quotes) {
    const previous = before.quotes.find((v) => v.id === q.id);
    if (!previous) events.push({ label: "Quotation generated", customerId: q.customerId, recordId: q.id });
    if (q.payment?.recordedAt && q.payment.recordedAt !== previous?.payment?.recordedAt)
      events.push({ label: "Payment record updated manually (demo)", customerId: q.customerId, recordId: q.id });
    if (previous?.status !== q.status && ["Sent (Simulated)", "Accepted (Simulated)"].includes(q.status))
      events.push({ label: `Quotation ${q.status.toLowerCase()}`, customerId: q.customerId, recordId: q.id });
  }
  for (const b of after.bookings) {
    const previous = before.bookings.find((v) => v.id === b.id);
    if (!previous) events.push({ label: "Booking created", customerId: b.customerId, recordId: b.id });
    if (previous?.status !== b.status && (previous || b.status !== "Pending"))
      events.push({
        label: (
          {
            Completed: "Cleaning job completed",
            Confirmed: "Booking confirmed",
            "In Progress": "Cleaning started",
            Pending: "Booking returned to Pending",
            Cancelled: "Booking cancelled",
          } as Record<string, string>
        )[b.status],
        customerId: b.customerId,
        recordId: b.id,
      });
    if (b.staffId && previous?.staffId !== b.staffId)
      events.push({
        label: `Cleaner assigned: ${after.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Cleaning team"}`,
        customerId: b.customerId,
        recordId: b.id,
      });
  }
  return events.map((e) => ({ ...e, id: id("A"), time: new Date().toISOString() }));
}
