export type Question = { key: string; label: string; options?: string[]; numeric?: boolean };
export const serviceQuestions: Record<string, Question[]> = {
  home: [
    { key: "bedrooms", label: "How many bedrooms?", numeric: true },
    { key: "bathrooms", label: "How many bathrooms?", numeric: true },
    { key: "size", label: "Property size (m²)", numeric: true },
    { key: "furnished", label: "Is it furnished?", options: ["Yes", "No"] },
    { key: "extras", label: "Additional cleaning services", options: ["None", "Oven", "Windows", "Oven and windows"] },
  ],
  carpet: [
    { key: "carpets", label: "Number of carpeted areas", numeric: true },
    { key: "furniture", label: "Furniture items", numeric: true },
    { key: "fabric", label: "Upholstery type", options: ["Fabric", "Leather", "Mixed", "Carpets only"] },
    { key: "concerns", label: "Special concerns or stains" },
  ],
  move: [
    { key: "size", label: "Property size (m²)", numeric: true },
    { key: "moveDate", label: "Move date" },
    { key: "furnished", label: "Is it furnished?", options: ["Yes", "No"] },
    { key: "extras", label: "Cleaning extras", options: ["None", "Oven", "Windows", "Oven and windows"] },
  ],
  renovation: [
    { key: "size", label: "Property size (m²)", numeric: true },
    { key: "renovation", label: "Renovation type" },
    { key: "intensity", label: "Cleaning intensity", options: ["Light dust", "Heavy dust", "Builders clean"] },
    { key: "requirements", label: "Additional requirements" },
  ],
  office: [
    { key: "size", label: "Office size (m²)", numeric: true },
    { key: "frequency", label: "Cleaning frequency", options: ["Once off", "Weekly", "Daily"] },
    { key: "workspaces", label: "Number of workspaces", numeric: true },
    { key: "times", label: "Preferred cleaning times" },
  ],
};
export function sampleAnswer(q: Question, date: string) {
  if (q.options) return q.options[0];
  if (q.key === "size") return "120";
  if (q.numeric) return "3";
  if (q.key === "moveDate") return date;
  return "Fictional property details";
}
export const enquiryStatuses = [
  "New",
  "Awaiting Details",
  "Ready for Quote",
  "Quote Sent",
  "Converted",
  "Closed",
] as const;
export const quoteStatuses = [
  "Draft",
  "Awaiting Approval",
  "Sent (Simulated)",
  "Accepted (Simulated)",
  "Rejected",
  "Expired",
] as const;
export const bookingStatuses = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"] as const;
export type Customer = { id: string; name: string; phone: string; email: string; location: string; notes: string };
export type Enquiry = {
  scenarioId?: string;
  id: string;
  customerId: string;
  serviceId: string;
  date: string;
  preferredDate: string;
  answers: Record<string, string>;
  notes: string;
  status: (typeof enquiryStatuses)[number];
};
export type Quote = {
  id: string;
  customerId: string;
  enquiryId?: string;
  serviceId: string;
  base: number;
  size: number;
  extras: number;
  travel: number;
  discount: number;
  vat: number;
  notes: string;
  date: string;
  status: (typeof quoteStatuses)[number];
};
export type Booking = {
  id: string;
  customerId: string;
  quoteId?: string;
  serviceId: string;
  start: string;
  duration: number;
  staffId: string;
  notes: string;
  amount: number;
  status: (typeof bookingStatuses)[number];
};
export type Settings = {
  business: string;
  phone: string;
  email: string;
  hours: string;
  areas: string;
  travel: number;
  sizeRate: number;
  extraOptions: string[];
  extraPrice: number;
  vat: number;
  services: { id: string; name: string; base: number }[];
  staff: { id: string; name: string }[];
  templates: Record<string, string>;
};
export type DemoData = {
  customers: Customer[];
  enquiries: Enquiry[];
  quotes: Quote[];
  bookings: Booking[];
  settings: Settings;
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
export const total = (q: Pick<Quote, "base" | "size" | "extras" | "travel" | "discount" | "vat">) =>
  Math.round(Math.max(0, q.base + q.size + q.extras + q.travel - q.discount) * (1 + q.vat / 100) * 100) / 100;
export function estimate(enquiry: Enquiry, settings: Settings) {
  return {
    base: settings.services.find((s) => s.id === enquiry.serviceId)?.base ?? 0,
    size: Math.max(0, Number(enquiry.answers.size || 0) - 80) * settings.sizeRate,
    extras: enquiry.answers.extras && enquiry.answers.extras !== "None" ? settings.extraPrice : 0,
    travel: settings.travel,
    discount: 0,
    vat: settings.vat,
  };
}
/** Scenario bookings are presentation records and do not reserve cleaner availability. */
export function isInteractiveBooking(booking: Pick<Booking, "quoteId">, data: DemoData) {
  const quote = data.quotes.find((q) => q.id === booking.quoteId);
  return !!data.enquiries.find((e) => e.id === quote?.enquiryId)?.scenarioId;
}
export function overlaps(a: Booking, b: Booking) {
  return (
    a.id !== b.id &&
    !!a.staffId &&
    a.staffId === b.staffId &&
    a.status !== "Cancelled" &&
    b.status !== "Cancelled" &&
    new Date(a.start).getTime() < new Date(b.start).getTime() + b.duration * 3600000 &&
    new Date(b.start).getTime() < new Date(a.start).getTime() + a.duration * 3600000
  );
}
export function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export function seed(): DemoData {
  const services = [
    { id: "home", name: "Home Deep Cleaning", base: 850 },
    { id: "carpet", name: "Carpet & Upholstery Cleaning", base: 450 },
    { id: "move", name: "Move-In / Move-Out Cleaning", base: 1100 },
    { id: "renovation", name: "Post-Renovation Cleaning", base: 1500 },
    { id: "office", name: "Office Cleaning", base: 950 },
  ];
  const customers = [
    "Lerato Mokoena",
    "Daniel Naidoo",
    "Ayesha Jacobs",
    "Thabo Molefe",
    "Naledi Dube",
    "Emma Botha",
  ].map((name, i) => ({
    id: `C-${i}`,
    name,
    phone: `+27 00 000 00${String(i).padStart(2, "0")}`,
    email: `client${i + 1}@example.com`,
    location: [
      "Sandton, Johannesburg",
      "Centurion, Pretoria",
      "Rosebank, Johannesburg",
      "Brooklyn, Pretoria",
      "Fourways, Johannesburg",
      "Midrand",
    ][i],
    notes: "Fictional demo customer. Please confirm access before arrival.",
  }));
  const enquiries: Enquiry[] = customers.map((c, i) => ({
    id: `E-${i}`,
    customerId: c.id,
    serviceId: services[i % 5].id,
    date: localDate(-i),
    preferredDate: localDate(i),
    answers: Object.fromEntries(
      serviceQuestions[services[i % 5].id].map((q) => [q.key, sampleAnswer(q, localDate(i))]),
    ),
    notes: "Please bring cleaning equipment.",
    status: (["New", "New", "Ready for Quote", "Ready for Quote", "Converted", "Converted"] as const)[i],
  }));
  const quotes: Quote[] = enquiries.slice(2).map((e, i) => ({
    id: `Q-${i}`,
    customerId: e.customerId,
    enquiryId: e.id,
    serviceId: e.serviceId,
    base: services.find((s) => s.id === e.serviceId)?.base ?? 0,
    size: 120,
    extras: 150,
    travel: 80,
    discount: 0,
    vat: 0,
    date: localDate(-i),
    notes: "Sample estimate only; subject to review.",
    status: i < 2 ? "Awaiting Approval" : "Accepted (Simulated)",
  }));
  const bookings: Booking[] = Array.from({ length: 14 }, (_, i) => {
    const q = quotes[2 + (i % 2)];
    let offset = i;
    if (i >= 3) offset = i === 3 ? -1 : -(i - 3) * 8;
    let status: Booking["status"] = "Completed";
    if (i < 3) status = i === 0 ? "Confirmed" : "Pending";
    return {
      id: `B-${i}`,
      customerId: q.customerId,
      quoteId: i < 2 ? q.id : undefined,
      serviceId: q.serviceId,
      start: `${localDate(offset)}T09:00`,
      duration: 3,
      staffId: `S-${i % 3}`,
      notes: "Fictional cleaning appointment",
      amount: total(q),
      status,
    };
  });
  return {
    customers,
    enquiries,
    quotes,
    bookings,
    settings: {
      business: "Winglo Cleaning Services",
      phone: "Demo contact — not connected",
      email: "hello@winglo.example",
      hours: "Mon–Sat · 08:00–17:00",
      areas: "Johannesburg, Pretoria, Midrand",
      travel: 80,
      sizeRate: 3,
      extraOptions: ["Oven", "Windows", "Oven and windows"],
      extraPrice: 150,
      vat: 0,
      services,
      staff: ["Grace Ndlovu", "Sipho Khumalo", "Mpho Sithole"].map((name, i) => ({ id: `S-${i}`, name })),
      templates: {
        "New enquiry confirmation": "Hi {name}, thank you for your {service} enquiry. We will review your details.",
        "Quote follow-up": "Hi {name}, would you like to discuss your sample {service} quotation?",
        "Booking confirmation": "Hi {name}, your demo cleaning booking is scheduled for {date}.",
        "Booking reminder": "Hi {name}, a friendly reminder of your {service} appointment on {date}.",
        "Post-cleaning follow-up": "Hi {name}, thank you for choosing Winglo. We hope you enjoyed your clean space.",
        "Feedback request": "Hi {name}, how was your Winglo experience? We would love your feedback.",
      },
    },
  };
}
