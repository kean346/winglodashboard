"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  type Activity,
  type ConversationDraft,
  conversationQuestions,
  draftComplete,
  freshJourney,
  type Journey,
  recordActivity,
  stageReady,
} from "./journey";
import {
  type Booking,
  type Customer,
  type DemoData,
  type Enquiry,
  estimate,
  id,
  isInteractiveBooking,
  localDate,
  overlaps,
  type Quote,
  seed,
} from "./model";

export type EditorRequest = {
  kind: "enquiry" | "quote" | "booking" | "customer";
  recordId: string;
  route: string;
  nonce: string;
};
type DemoStore = {
  data: DemoData | null;
  ready: boolean;
  storageError: boolean;
  journey: Journey | null;
  activity: Activity[];
  editorRequest: EditorRequest | null;
  init: () => void;
  update: (fn: (data: DemoData) => DemoData) => void;
  reset: () => void;
  submit: (
    customer: Omit<Customer, "id">,
    enquiry: Omit<Enquiry, "id" | "customerId" | "date" | "status">,
    existing?: string,
  ) => string;
  saveQuote: (quote: Quote) => string;
  prepareQuote: (enquiryId: string) => string;
  quoteStatus: (quoteId: string, status: Quote["status"]) => void;
  book: (booking: Booking) => string;
  startJourney: (restart?: boolean) => void;
  patchJourney: (patch: Partial<Journey>) => void;
  patchDraft: (patch: Partial<ConversationDraft>) => void;
  createJourneyEnquiry: () => string;
  advanceJourney: () => boolean;
  previousStage: () => void;
  requestEditor: (request: Omit<EditorRequest, "nonce">) => void;
  clearEditorRequest: () => void;
  previewReminder: (bookingId: string) => void;
};
function syncJourney(j: Journey | null, d: DemoData): Journey | null {
  if (!j) return null;
  const enquiry = d.enquiries.find((e) => e.id === j.enquiryId || e.scenarioId === j.scenarioId);
  const quote =
    d.quotes.find((q) => q.id === j.quoteId) ??
    d.quotes.find((q) => !!enquiry && q.enquiryId === enquiry.id && q.customerId === enquiry.customerId);
  const booking =
    d.bookings.find((b) => b.id === j.bookingId) ??
    d.bookings.find((b) => !!quote && b.quoteId === quote.id && b.customerId === quote.customerId);
  const next = {
    ...j,
    enquiryId: enquiry?.id,
    customerId: enquiry?.customerId,
    quoteId: quote?.id,
    bookingId: booking?.id,
  };
  return { ...next, completedSteps: Array.from({ length: 8 }, (_, i) => i).filter((i) => stageReady(next, d, i)) };
}
function withQuoteStatus(d: DemoData, q: Quote): DemoData {
  return {
    ...d,
    quotes: d.quotes.some((v) => v.id === q.id) ? d.quotes.map((v) => (v.id === q.id ? q : v)) : [q, ...d.quotes],
    enquiries: d.enquiries.map((e) => {
      if (
        e.id !== q.enquiryId ||
        e.status === "Converted" ||
        !["Sent (Simulated)", "Accepted (Simulated)"].includes(q.status)
      )
        return e;
      return { ...e, status: "Quote Sent" };
    }),
  };
}
export const useDemo = create<DemoStore>()(
  persist(
    (set, get) => ({
      data: null,
      ready: false,
      storageError: false,
      journey: null,
      activity: [],
      editorRequest: null,
      init: () => {
        if (!get().data) set({ data: seed() });
        set({ ready: true });
      },
      update: (fn) => {
        const before = get().data;
        if (!before) return;
        const data = fn(before);
        set({
          data,
          journey: syncJourney(get().journey, data),
          activity: [...recordActivity(before, data).reverse(), ...get().activity].slice(0, 100),
        });
      },
      reset: () => set({ data: seed(), journey: null, activity: [], editorRequest: null }),
      submit: (input, details, existing) => {
        const data = get().data;
        if (!data) throw new Error("Demo not loaded");
        const scenario = details.scenarioId && data.enquiries.find((e) => e.scenarioId === details.scenarioId);
        if (scenario && !existing) return scenario.id;
        const normalize = (s: string) => s.replace(/\D/g, "");
        const known = data.customers.find(
          (c) =>
            normalize(c.phone) === normalize(input.phone) ||
            (!!input.email && c.email.toLowerCase() === input.email.toLowerCase()),
        );
        const customerId =
          (existing && data.enquiries.find((e) => e.id === existing)?.customerId) || known?.id || id("C");
        const enquiryId = existing ?? id("E");
        const prior = data.enquiries.find((e) => e.id === existing);
        const customer = { ...input, notes: input.notes || known?.notes || "", id: customerId };
        const enquiry: Enquiry = {
          ...details,
          id: enquiryId,
          customerId,
          date: prior?.date ?? new Date().toISOString(),
          status: prior?.status ?? "Ready for Quote",
        };
        get().update((d) => ({
          ...d,
          customers: [...d.customers.filter((c) => c.id !== customerId), customer],
          enquiries: existing ? d.enquiries.map((e) => (e.id === existing ? enquiry : e)) : [enquiry, ...d.enquiries],
        }));
        return enquiryId;
      },
      prepareQuote: (enquiryId) => {
        const data = get().data;
        if (!data) throw new Error("Demo not loaded");
        const existing = data.quotes.find((q) => q.enquiryId === enquiryId);
        if (existing) return existing.id;
        const enquiry = data.enquiries.find((e) => e.id === enquiryId);
        if (!enquiry || ["New", "Awaiting Details", "Closed"].includes(enquiry.status))
          throw new Error("Review and complete this enquiry before preparing a quote.");
        return get().saveQuote({
          id: id("Q"),
          enquiryId,
          customerId: enquiry.customerId,
          serviceId: enquiry.serviceId,
          ...estimate(enquiry, data.settings),
          date: localDate(),
          status: "Draft",
          notes: "Sample estimate only. Review the price before sending; no real message is delivered.",
        });
      },
      saveQuote: (input) => {
        const data = get().data;
        if (!data) throw new Error("Demo not loaded");
        const j = get().journey;
        const linked = data.quotes.find((q) => q.id === j?.quoteId);
        if (linked && j?.enquiryId === input.enquiryId && linked.id !== input.id) return linked.id;
        const quote = input;
        const e = data.enquiries.find((e) => e.id === quote.enquiryId);
        if (quote.enquiryId && (!e || e.customerId !== quote.customerId || e.serviceId !== quote.serviceId))
          throw new Error("Quote and enquiry must reference the same customer and service.");
        get().update((d) => withQuoteStatus(d, quote));
        return quote.id;
      },
      quoteStatus: (quoteId, status) => {
        const q = get().data?.quotes.find((q) => q.id === quoteId);
        if (q) get().saveQuote({ ...q, status });
      },
      book: (input) => {
        const data = get().data;
        if (!data) throw new Error("Demo not loaded");
        const existing = input.quoteId && data.bookings.find((b) => b.quoteId === input.quoteId);
        if (existing && existing.id !== input.id) return existing.id;
        const quote = data.quotes.find((q) => q.id === input.quoteId);
        if (
          input.quoteId &&
          (quote?.status !== "Accepted (Simulated)" ||
            quote.customerId !== input.customerId ||
            quote.serviceId !== input.serviceId)
        )
          throw new Error("Use an accepted quotation with the same customer and service.");
        if (
          !isInteractiveBooking(input, data) &&
          data.bookings.some((b) => !isInteractiveBooking(b, data) && overlaps(input, b))
        )
          throw new Error("Choose another cleaner or time; this assignment overlaps an existing job.");
        get().update((d) => ({
          ...d,
          bookings: d.bookings.some((b) => b.id === input.id)
            ? d.bookings.map((b) => (b.id === input.id ? input : b))
            : [input, ...d.bookings],
          enquiries: d.enquiries.map((e) => (quote?.enquiryId === e.id ? { ...e, status: "Converted" } : e)),
        }));
        return input.id;
      },
      startJourney: (restart = false) => {
        const current = get().journey;
        set({
          journey: !restart && current ? { ...current, active: true, paused: false, minimized: false } : freshJourney(),
          editorRequest: null,
        });
      },
      patchJourney: (patch) => {
        const j = get().journey;
        if (j) set({ journey: { ...j, ...patch } });
      },
      patchDraft: (patch) => {
        const j = get().journey;
        if (j && !j.enquiryId) set({ journey: { ...j, draft: { ...j.draft, ...patch } } });
      },
      createJourneyEnquiry: () => {
        const { data, journey: j } = get();
        if (!data || !j) throw new Error("Start the interactive demo first.");
        if (j.enquiryId && data.enquiries.some((e) => e.id === j.enquiryId)) return j.enquiryId;
        if (!draftComplete(j, data))
          throw new Error("Complete every required answer, including a valid contact number.");
        const d = j.draft;
        const enquiryId = get().submit(
          {
            name: d.name.trim(),
            phone: d.phone,
            email: "",
            location: d.location,
            notes: "Fictional guided-demo customer.",
          },
          {
            scenarioId: j.scenarioId,
            serviceId: d.serviceId,
            answers: d.answers,
            preferredDate: d.preferredDate,
            notes: "Interactive simulation · No real messages sent.",
          },
        );
        const current = get().journey;
        if (current)
          set({
            journey: {
              ...current,
              enquiryId,
              draft: { ...current.draft, cursor: conversationQuestions(current.draft, data).length },
              step: 2,
              active: true,
              paused: false,
              minimized: false,
            },
          });
        return enquiryId;
      },
      advanceJourney: () => {
        const { data, journey: j } = get();
        if (!data || !j || !stageReady(j, data)) return false;
        set({
          journey: {
            ...j,
            step: Math.min(7, j.step + 1),
            completed: j.step === 7,
            paused: false,
            minimized: false,
            completedSteps: Array.from(new Set([...j.completedSteps, j.step])),
          },
        });
        return true;
      },
      previousStage: () => {
        const j = get().journey;
        if (j)
          set({ journey: { ...j, step: Math.max(0, j.step - 1), completed: false, paused: false, minimized: false } });
      },
      requestEditor: (request) => set({ editorRequest: { ...request, nonce: id("OPEN") } }),
      clearEditorRequest: () => set({ editorRequest: null }),
      previewReminder: (bookingId) => {
        const { data, journey: j } = get();
        const booking = data?.bookings.find((b) => b.id === bookingId);
        if (!booking) return;
        const entry: Activity = {
          id: id("A"),
          time: new Date().toISOString(),
          label: "Reminder previewed (simulation only)",
          customerId: booking.customerId,
          recordId: bookingId,
        };
        const activity = get().activity.some((e) => e.recordId === bookingId && e.label === entry.label)
          ? get().activity
          : [entry, ...get().activity].slice(0, 100);
        set({
          activity,
          journey:
            j && j.bookingId === bookingId
              ? { ...j, reminderPreviewed: true, completedSteps: Array.from(new Set([...j.completedSteps, 6])) }
              : j,
        });
      },
    }),
    {
      name: "winglo-demo-v1",
      version: 1,
      migrate: (persisted) => {
        const previous = persisted as Partial<DemoStore>;
        return { data: previous.data ?? null, journey: previous.journey ?? null, activity: previous.activity ?? [] };
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            storageUnavailable();
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            storageUnavailable();
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            storageUnavailable();
          }
        },
      })),
      skipHydration: true,
      partialize: (s) => ({ data: s.data, journey: s.journey, activity: s.activity }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) useDemo.setState({ storageError: true });
      },
    },
  ),
);
export function useDemoData() {
  const data = useDemo((s) => s.data);
  if (!data) throw new Error("Winglo demo must be hydrated before rendering records");
  return data;
}
let hydration: Promise<void> | undefined;
export function hydrateDemo() {
  hydration ??= Promise.resolve(useDemo.persist.rehydrate())
    .then(() => useDemo.getState().init())
    .catch(() => {
      useDemo.setState({ storageError: true });
      useDemo.getState().init();
    });
  return hydration;
}
function storageUnavailable() {
  queueMicrotask(() => {
    if (!useDemo.getState().storageError) useDemo.setState({ storageError: true });
  });
}
