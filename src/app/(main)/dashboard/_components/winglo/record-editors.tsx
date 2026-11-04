"use client";
import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  type Booking,
  bookingStatuses,
  type Enquiry,
  estimate,
  id,
  isInteractiveBooking,
  localDate,
  money,
  overlaps,
  type Quote,
  quoteStatuses,
  total,
} from "./model";
import { Choice, TextField } from "./shared";
import { useDemo, useDemoData } from "./store";
import { BookingSummary, NextActionButton } from "./workflow";

export function QuoteEditor({
  initial,
  enquiry,
  onDone,
}: {
  initial?: Quote;
  enquiry?: Enquiry;
  onDone: (id: string) => void;
}) {
  const data = useDemoData();
  const saveQuote = useDemo((s) => s.saveQuote);
  const source = enquiry ?? data.enquiries[0];
  const make = (e: Enquiry): Quote => ({
    id: id("Q"),
    customerId: e.customerId,
    enquiryId: e.id,
    serviceId: e.serviceId,
    ...estimate(e, data.settings),
    notes: "Sample estimate only. Subject to owner review; not approved Winglo pricing.",
    date: localDate(),
    status: "Awaiting Approval",
  });
  const [quote, setQuote] = useState<Quote>(
    initial ??
      (source
        ? make(source)
        : {
            id: id("Q"),
            customerId: data.customers[0]?.id ?? "",
            serviceId: data.settings.services[0].id,
            base: 0,
            size: 0,
            extras: 0,
            travel: data.settings.travel,
            discount: 0,
            vat: data.settings.vat,
            notes: "Sample estimate",
            date: localDate(),
            status: "Draft",
          }),
  );
  const customer = data.customers.find((c) => c.id === quote.customerId);
  const e = data.enquiries.find((e) => e.id === quote.enquiryId);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!customer) {
          toast.error("Create an enquiry or customer first.");
          return;
        }
        try {
          const savedId = saveQuote(quote);
          toast.success("Sample quotation saved");
          onDone(savedId);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to save quotation.");
        }
      }}
    >
      <p className="text-muted-foreground text-sm">
        Sample estimates · No real quotation or message is sent. Prices are editable and are not Winglo-approved rates.
      </p>
      <FieldGroup>
        {!initial && (
          <Choice
            label="Prefill from enquiry"
            value={quote.enquiryId ?? ""}
            options={[
              { id: "", name: "Select an enquiry" },
              ...data.enquiries.map((e) => ({
                id: e.id,
                name: `${data.customers.find((c) => c.id === e.customerId)?.name} · ${data.settings.services.find((s) => s.id === e.serviceId)?.name}`,
              })),
            ]}
            onChange={(v) => {
              const e = data.enquiries.find((e) => e.id === v);
              if (e) setQuote(make(e));
            }}
          />
        )}
        <Choice
          label="Customer"
          value={quote.customerId}
          options={data.customers}
          onChange={(v) => setQuote({ ...quote, customerId: v, enquiryId: undefined })}
        />
        <p className="text-muted-foreground text-sm">
          {customer?.phone} · {customer?.location}
        </p>
        <Choice
          label="Service"
          value={quote.serviceId}
          options={data.settings.services}
          onChange={(v) =>
            setQuote({
              ...quote,
              serviceId: v,
              enquiryId: undefined,
              base: data.settings.services.find((s) => s.id === v)?.base ?? 0,
            })
          }
        />
        {e && (
          <p className="bg-muted rounded-lg p-3 text-sm">
            Collected details:{" "}
            {Object.entries(e.answers)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}{" "}
            · Preferred {e.preferredDate}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["base", "Base cleaning price"],
              ["size", "Property size adjustment"],
              ["extras", "Add-on services"],
              ["travel", "Travel charge"],
              ["discount", "Discount"],
              ["vat", "VAT (%) · 0 = no VAT"],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              type="number"
              min="0"
              max={key === "vat" ? 100 : undefined}
              step="0.01"
              required
              value={quote[key]}
              onChange={(e) => setQuote({ ...quote, [key]: Number(e.target.value) })}
            />
          ))}
        </div>
        <Choice
          label="Quote status"
          value={quote.status}
          options={quoteStatuses}
          onChange={(v) => setQuote({ ...quote, status: v as Quote["status"] })}
        />
        <TextField
          label="Notes and add-on details"
          value={quote.notes}
          onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
        />
      </FieldGroup>
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-muted-foreground">Estimated total</span>
        <strong className="text-2xl">{money(total(quote))}</strong>
      </div>
      <Button type="submit">Save quotation</Button>
    </form>
  );
}
export function BookingEditor({
  initial,
  quote,
  customerId,
  onDone,
}: {
  initial?: Booking;
  quote?: Quote;
  customerId?: string;
  onDone: (id: string) => void;
}) {
  const data = useDemoData();
  const book = useDemo((s) => s.book);
  const enquiry = data.enquiries.find((e) => e.id === quote?.enquiryId);
  const [value, setValue] = useState<Booking>(
    initial ?? {
      id: id("B"),
      customerId: quote?.customerId ?? customerId ?? data.customers[0]?.id ?? "",
      quoteId: quote?.id,
      serviceId: quote?.serviceId ?? data.settings.services[0].id,
      start: `${enquiry?.preferredDate || localDate(1)}T09:00`,
      duration: 3,
      staffId: data.settings.staff[0]?.id ?? "",
      notes: "",
      amount: quote ? total(quote) : data.settings.services[0].base,
      status: enquiry?.scenarioId ? "Confirmed" : "Pending",
    },
  );
  const guided = isInteractiveBooking(value, data);
  const conflicts = guided ? [] : data.bookings.filter((b) => !isInteractiveBooking(b, data) && overlaps(value, b));
  const existing = quote && data.bookings.find((b) => b.quoteId === quote.id);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (existing && !initial) {
          toast.error("This quotation already has a booking.");
          return;
        }
        if (conflicts.length) {
          toast.error("Resolve the cleaner scheduling conflict before saving.");
          return;
        }
        if (!value.customerId) {
          toast.error("Create a customer through an enquiry first.");
          return;
        }
        try {
          const savedId = book(value);
          toast.success("Booking saved · No confirmation sent");
          onDone(savedId);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to save booking.");
        }
      }}
    >
      {initial && (
        <>
          <BookingSummary booking={data.bookings.find((b) => b.id === initial.id) ?? initial} />
          <div className="flex flex-wrap items-center gap-3">
            <NextActionButton
              booking={data.bookings.find((b) => b.id === initial.id) ?? initial}
              onDone={() => onDone(initial.id)}
            />
            <span className="text-muted-foreground text-xs">Quick actions apply to the saved appointment.</span>
          </div>
        </>
      )}
      <FieldGroup>
        <Choice
          label="Customer"
          value={value.customerId}
          options={data.customers}
          onChange={(v) => setValue({ ...value, customerId: v, quoteId: undefined })}
        />
        <Choice
          label="Cleaning service"
          value={value.serviceId}
          options={data.settings.services}
          onChange={(v) => setValue({ ...value, serviceId: v, quoteId: undefined })}
        />
        <p className="text-muted-foreground text-sm">
          {data.customers.find((c) => c.id === value.customerId)?.phone} ·{" "}
          {data.customers.find((c) => c.id === value.customerId)?.location}
        </p>
        <TextField
          label="Date and start time"
          type="datetime-local"
          required
          value={value.start}
          onChange={(e) => setValue({ ...value, start: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Duration (hours)"
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            required
            value={value.duration}
            onChange={(e) => setValue({ ...value, duration: Number(e.target.value) })}
          />
          <TextField
            label="Sample job value (R)"
            type="number"
            min="0"
            step="0.01"
            required
            value={value.amount}
            onChange={(e) => setValue({ ...value, amount: Number(e.target.value) })}
          />
        </div>
        <Choice
          label="Assign cleaner"
          value={value.staffId}
          options={[{ id: "", name: "Unassigned" }, ...data.settings.staff]}
          onChange={(v) => setValue({ ...value, staffId: v })}
        />
        <TextField
          label="Booking notes"
          value={value.notes}
          onChange={(e) => setValue({ ...value, notes: e.target.value })}
        />
      </FieldGroup>
      <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Booking status</legend>
        <p className="text-muted-foreground text-xs">
          Choose what happens next. Confirmed means the cleaning appointment is scheduled.
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Booking status"
          value={value.status}
          onValueChange={(status) => {
            if (status) setValue({ ...value, status: status as Booking["status"] });
          }}
          className="flex flex-wrap gap-2"
        >
          {bookingStatuses.map((status) => (
            <ToggleGroupItem key={status} value={status} className="min-h-11 flex-auto rounded-lg px-3">
              {status}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p role="status" className="text-primary text-xs">
          Selected: {value.status}
        </p>
      </fieldset>
      {conflicts.length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          Cleaner conflict: {conflicts.length} overlapping job(s). Choose another cleaner or time.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Simulation Only · Completed jobs count towards demo revenue and customer history.
      </p>
      <Button type="submit" disabled={!!existing && !initial}>
        {guided && value.status === "Confirmed" ? "Confirm Booking & Continue" : "Save booking"}
      </Button>
    </form>
  );
}
export function printQuote(quote: Quote, data: NonNullable<ReturnType<typeof useDemo.getState>["data"]>) {
  const customer = data.customers.find((c) => c.id === quote.customerId);
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Allow popups to print or save as PDF.");
    return;
  }
  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  win.document.write(
    `<!doctype html><html><head><title>${escapeHtml(quote.id)} · Winglo sample estimate</title><style>body{font:15px system-ui;margin:50px;line-height:1.8}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:10px}h1{margin-bottom:0}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(data.settings.business)}</h1><p>SAMPLE ESTIMATE · DEMO DATA · NOT BUSINESS APPROVED</p><p>${escapeHtml(quote.id)} · ${escapeHtml(quote.date)} · ${escapeHtml(quote.status)}</p><h2>${escapeHtml(customer?.name ?? "")}</h2><p>${escapeHtml(customer?.phone ?? "")}<br>${escapeHtml(customer?.location ?? "")}</p><h3>${escapeHtml(data.settings.services.find((s) => s.id === quote.serviceId)?.name ?? "")}</h3><table>${[
      ["Base cleaning", quote.base],
      ["Size adjustment", quote.size],
      ["Add-ons", quote.extras],
      ["Travel", quote.travel],
      ["Discount", -quote.discount],
    ]
      .map(([label, value]) => `<tr><td>${label}</td><td>${money(Number(value))}</td></tr>`)
      .join(
        "",
      )}<tr><td>VAT</td><td>${quote.vat}%</td></tr><tr><td><strong>Total estimate</strong></td><td><strong>${money(total(quote))}</strong></td></tr></table><p>${escapeHtml(quote.notes)}</p><p>No payment requested. No real messages sent.</p><button onclick="window.print()">Print / Save as PDF</button></body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
}
