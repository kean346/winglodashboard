"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "cn";
import { Check, ChevronLeft, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { EnquiryForm } from "./enquiry-form";
import { resolveJob } from "./job-model";
import { enquiryStatuses, money, total } from "./model";
import { BookingEditor, printQuote, QuoteEditor } from "./record-editors";
import { Choice, Panel, Status } from "./shared";
import { hydrateDemo, useDemo } from "./store";
import { ActivityTimeline, NextActionButton } from "./workflow";

type Mode =
  | "summary"
  | "quote"
  | "booking"
  | "request"
  | "requestAdvanced"
  | "quoteAdvanced"
  | "bookingAdvanced"
  | "history"
  | "conversation";
export function JobWorkspace({ recordId }: { recordId: string }) {
  const { data: d, ready, activity, storageError } = useDemo();
  const [mode, setMode] = useState<Mode>("summary");
  const router = useRouter();
  useEffect(() => {
    void hydrateDemo();
  }, []);

  if (!ready || !d) return <Skeleton className="h-80" />;
  const job = resolveJob(d, recordId);
  const { enquiry: e, quote: q, booking: b, customer: c, service, stage } = job;
  if (!c || (!e && !q && !b))
    return (
      <Panel title="This job could not be found" description="Your saved records have not been changed.">
        <Button asChild>
          <Link href="/dashboard/enquiries">Back to enquiries</Link>
        </Button>
      </Panel>
    );
  const sent = q?.status === "Sent (Simulated)";
  const accepted = q?.status === "Accepted (Simulated)";
  let instruction = "Review this request, then prepare a sample quotation.";
  if (q) instruction = "Review the price, then send the quotation to the customer.";
  if (sent)
    instruction = "Waiting for the customer to accept your quotation. In this demo, simulate their response below.";
  if (accepted && !b) instruction = "The customer accepted. Choose a date, time and cleaner to schedule the job.";
  if (b?.status === "Pending") instruction = "Review the saved appointment, then confirm this booking.";
  if (b?.status === "Confirmed") instruction = "This cleaning is scheduled. Start the job when the team begins.";
  if (b?.status === "In Progress") instruction = "Cleaning is underway. Complete the job once the work is finished.";
  if (b?.status === "Completed")
    instruction = "This job is complete. Customer history and completed-job revenue are updated.";
  if (b?.status === "Cancelled") instruction = "This booking is cancelled. You can reschedule it when ready.";
  if (e?.status === "Closed" && !q) instruction = "This request is closed. Reopen it before preparing a quotation.";
  let status = e?.status ?? "Customer job";
  if (q) status = "Ready to send";
  if (sent) status = "Waiting for customer";
  if (accepted) status = "Customer accepted";
  if (b) status = b.status;
  const done = () => {
    setMode("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-8" aria-label="Customer job workspace">
      <Button variant="ghost" className="self-start" onClick={() => router.push("/dashboard/jobs")}>
        <ChevronLeft data-icon="inline-start" />
        All jobs
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-primary text-xs tracking-widest uppercase">Winglo · Customer job</p>
          <h1 className="mt-2 text-3xl tracking-tight">{c.name}</h1>
          <p className="mt-2 text-sm">{service?.name}</p>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <MapPin className="size-4" />
            {c.location}
          </p>
        </div>
        <Status>{status}</Status>
      </header>
      <ol className="grid grid-cols-4 gap-2" aria-label="Customer job progress">
        {["Request", "Quote", "Booking", "Complete"].map((label, i) => (
          <li
            key={label}
            aria-current={stage === i ? "step" : undefined}
            className={cn(
              "flex flex-col gap-2 border-t-2 pt-3 text-xs sm:text-sm",
              i <= stage ? "border-primary text-primary" : "text-muted-foreground border-border",
            )}
          >
            <span className="flex items-center gap-1">
              {i < stage && <Check className="size-3" />}
              {label}
            </span>
          </li>
        ))}
      </ol>
      <p className="bg-primary/5 rounded-lg border p-4 text-sm" role="status">
        {instruction}
      </p>
      {storageError && <p role="alert">Browser storage is unavailable; changes may not survive refresh.</p>}
      {mode === "summary" && (
        <>
          <section
            className="bg-background sticky bottom-0 z-10 flex flex-col gap-3 border-t py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0"
            aria-label="Next job action"
          >
            {!q && e && !["New", "Awaiting Details", "Closed"].includes(e.status) && (
              <Button className="min-h-12 w-full sm:w-auto sm:self-start" onClick={() => setMode("quote")}>
                Prepare Quote
              </Button>
            )}
            {!q && e && ["New", "Awaiting Details"].includes(e.status) && (
              <Button onClick={() => setMode("request")}>Review Request</Button>
            )}
            {!q && e?.status === "Closed" && (
              <Button
                onClick={() =>
                  useDemo.getState().update((d) => ({
                    ...d,
                    enquiries: d.enquiries.map((v) => (v.id === e.id ? { ...v, status: "Ready for Quote" } : v)),
                  }))
                }
              >
                Reopen Request
              </Button>
            )}
            {q && !b && !["Sent (Simulated)", "Accepted (Simulated)"].includes(q.status) && (
              <Button className="min-h-12 self-start" onClick={() => setMode("quote")}>
                {["Rejected", "Expired"].includes(q.status) ? "Revise Quote" : "Review & Send Quote"}
              </Button>
            )}
            {accepted && !b && (
              <Button className="min-h-12 self-start" onClick={() => setMode("booking")}>
                Schedule Cleaning
              </Button>
            )}
            {b && !["Completed", "Cancelled"].includes(b.status) && <NextActionButton booking={b} />}
            {b?.status === "Cancelled" && <Button onClick={() => setMode("booking")}>Reschedule Cleaning</Button>}
            {b?.status === "Completed" && (
              <Button className="min-h-12 self-start" onClick={() => setMode("history")}>
                View Customer History
              </Button>
            )}
            {sent && !b && (
              <p className="text-muted-foreground text-sm">No business action is needed until the customer responds.</p>
            )}
          </section>
          {sent && !b && (
            <Panel title="Demo controls" description="Customer response simulation · No real messages sent">
              <Button
                variant="outline"
                onClick={() => {
                  useDemo.getState().quoteStatus(q.id, "Accepted (Simulated)");
                  toast.success("Customer acceptance simulated. You can now schedule the cleaning.");
                }}
              >
                Simulate Customer Acceptance
              </Button>
            </Panel>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Panel title={e ? "Cleaning request" : "Customer details"} description={`${e?.id ?? c.id} · ${c.phone}`}>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Preferred date</dt>
                  <dd className="mt-1">{e?.preferredDate ?? b?.start.slice(0, 10) ?? "Not specified"}</dd>
                </div>
                {Object.entries(e?.answers ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs capitalize">{key}</dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
              {e?.notes && <p className="text-muted-foreground mt-4 text-sm">{e.notes}</p>}
            </Panel>
            {q && (
              <Panel title="Quotation" description={`${q.id} · Sample estimate only`}>
                <div className="flex flex-col gap-3 text-sm">
                  {[
                    ["Base cleaning", q.base],
                    ["Size adjustment", q.size],
                    ["Add-ons", q.extras],
                    ["Travel", q.travel],
                    ["Discount", -q.discount],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span>{money(Number(value))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-3">
                    <span>VAT</span>
                    <span>{q.vat}%</span>
                  </div>
                  <div className="flex justify-between text-xl font-medium">
                    <span>Total estimate</span>
                    <span>{money(total(q))}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {sent ? "Sent (simulated) · Waiting for customer" : q.status}. No real message is sent.
                  </p>
                </div>
              </Panel>
            )}
            {b && (
              <Panel title="Cleaning appointment" description={`${b.id} · ${b.status}`}>
                <div className="flex flex-col gap-3 text-sm">
                  <p>
                    {b.start.replace("T", " · ")} · {b.duration} hours
                  </p>
                  <p>{d.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Unassigned cleaner"}</p>
                  <p>{money(b.amount)} · sample job value</p>
                  {b.notes && <p className="text-muted-foreground">{b.notes}</p>}
                </div>
              </Panel>
            )}
          </div>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">More options</summary>
            <div className="mt-4 flex flex-wrap gap-2">
              {e && (
                <>
                  <Button variant="outline" onClick={() => setMode("request")}>
                    Edit request
                  </Button>
                  <Button variant="outline" onClick={() => setMode("requestAdvanced")}>
                    Advanced request corrections
                  </Button>
                  <Button variant="outline" onClick={() => setMode("conversation")}>
                    View conversation
                  </Button>
                  {!q && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        useDemo.getState().update((d) => ({
                          ...d,
                          enquiries: d.enquiries.map((v) => (v.id === e.id ? { ...v, status: "Awaiting Details" } : v)),
                        }));
                        toast.info("Marked Awaiting Details. No message sent.");
                      }}
                    >
                      Ask for more details
                    </Button>
                  )}
                </>
              )}
              {q && (
                <>
                  <Button variant="outline" onClick={() => printQuote(q, d)}>
                    Print / PDF
                  </Button>
                  <Button variant="outline" onClick={() => setMode("quoteAdvanced")}>
                    Advanced quote corrections
                  </Button>
                </>
              )}
              {b && (
                <>
                  <Button variant="outline" onClick={() => setMode("booking")}>
                    Reschedule / Edit booking
                  </Button>
                  <Button variant="outline" onClick={() => setMode("bookingAdvanced")}>
                    Advanced booking corrections / Cancel
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setMode("history")}>
                Customer history
              </Button>
            </div>
          </details>
          <Panel title="Job activity" description="Only actions actually recorded in this browser">
            <ActivityTimeline events={activity.filter((a) => [e?.id, q?.id, b?.id].includes(a.recordId))} />
          </Panel>
        </>
      )}
      {(mode === "quote" || mode === "quoteAdvanced") && (
        <Panel
          title="Review the sample price"
          description="Adjust the estimate before sending. No actual Winglo rates or VAT registration are assumed."
        >
          <QuoteEditor
            key={`${q?.id ?? e?.id}-${mode}`}
            enquiry={e}
            initial={q}
            lockContext
            jobMode={mode === "quote"}
            onDone={done}
          />
        </Panel>
      )}
      {(mode === "booking" || mode === "bookingAdvanced") && (
        <Panel
          title={b ? "Update cleaning appointment" : "Schedule the accepted quote"}
          description="Customer and service details have been carried forward."
        >
          <BookingEditor
            key={`${b?.id ?? q?.id}-${mode}`}
            quote={q}
            initial={b}
            customerId={c.id}
            lockContext
            jobMode={mode === "booking"}
            onDone={done}
          />
        </Panel>
      )}
      {(mode === "request" || mode === "requestAdvanced") && e && (
        <Panel title="Edit cleaning request">
          {mode === "requestAdvanced" && (
            <Choice
              label="Enquiry status"
              value={e.status}
              options={enquiryStatuses}
              onChange={(status) =>
                useDemo.getState().update((d) => ({
                  ...d,
                  enquiries: d.enquiries.map((v) => (v.id === e.id ? { ...v, status: status as typeof e.status } : v)),
                }))
              }
            />
          )}
          <EnquiryForm
            initial={e}
            lockService={!!q}
            onDone={() => {
              useDemo.getState().update((d) => ({
                ...d,
                enquiries: d.enquiries.map((v) =>
                  v.id === e.id ? { ...v, status: q || mode === "requestAdvanced" ? v.status : "Ready for Quote" } : v,
                ),
              }));
              done();
            }}
          />
        </Panel>
      )}
      {mode === "conversation" && e && (
        <Panel
          title="Collected conversation details"
          description="Saved answers for this request; no message history or timestamps are fabricated."
        >
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                {c.name} · {c.phone}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Service</dt>
              <dd>{service?.name}</dd>
            </div>
            {Object.entries(e.answers).map(([key, value]) => (
              <div key={key}>
                <dt className="text-muted-foreground capitalize">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted-foreground">Preferred date</dt>
              <dd>{e.preferredDate}</dd>
            </div>
          </dl>
        </Panel>
      )}
      {mode === "history" && (
        <Panel title="Customer service history" description={`${c.name} · ${c.phone}`}>
          <div className="flex flex-col gap-3">
            {d.bookings
              .filter((v) => v.customerId === c.id)
              .map((v) => (
                <Link
                  key={v.id}
                  className="hover:bg-accent flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"
                  href={`/dashboard/jobs/${v.id}`}
                >
                  <span>{v.start.replace("T", " · ")}</span>
                  <Status>{v.status}</Status>
                  <span>{money(v.amount)}</span>
                </Link>
              ))}
            {!d.bookings.some((v) => v.customerId === c.id) && (
              <p className="text-muted-foreground text-sm">No bookings yet.</p>
            )}
            {d.quotes
              .filter((v) => v.customerId === c.id)
              .map((v) => (
                <Link key={v.id} className="text-sm underline" href={`/dashboard/jobs/${v.id}`}>
                  {v.id} · {money(total(v))} · {v.status}
                </Link>
              ))}
            <p className="text-muted-foreground text-sm">{c.notes}</p>
          </div>
        </Panel>
      )}
      {mode !== "summary" && (
        <Button variant="outline" className="self-start" onClick={done}>
          Back to job
        </Button>
      )}
      <footer className="text-muted-foreground border-t pt-4 text-xs">
        Demo data · Saved in this browser only · No real messages sent
      </footer>
    </main>
  );
}
