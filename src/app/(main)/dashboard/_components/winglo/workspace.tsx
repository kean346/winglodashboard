"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "cn";
import { CalendarDays, Compass, FileText, MessageCircle, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DemoActivity } from "./activity";
import { BookingCalendar } from "./booking-calendar";
import { DirectoryCards } from "./directory-cards";
import { EnquiryForm } from "./enquiry-form";
import { jobUrl } from "./job-model";
import {
  type Booking,
  bookingStatuses,
  type Customer,
  type Enquiry,
  enquiryStatuses,
  localDate,
  money,
  type Quote,
  quoteStatuses,
  total,
} from "./model";
import { Overview } from "./overview";
import { BookingEditor, printQuote, QuoteEditor } from "./record-editors";
import { AutomationPreview, SettingsPage } from "./settings";
import { Choice, EmptyRecords, Modal, Panel, Status, TextField } from "./shared";
import { hydrateDemo, useDemo, useDemoData } from "./store";
import { NextActionButton } from "./workflow";

type Section = "Overview" | "Enquiries" | "Quotations" | "Bookings" | "Customers" | "Settings";
type Editor =
  | { kind: "enquiry"; value?: Enquiry }
  | { kind: "conversation" }
  | { kind: "quote"; value?: Quote; enquiry?: Enquiry }
  | { kind: "booking"; value?: Booking; quote?: Quote; customerId?: string }
  | { kind: "customer"; value: Customer }
  | { kind: "automation" };
export function Workspace({ section = "Overview", publicForm = false }: { section?: Section; publicForm?: boolean }) {
  const { data: d, ready, update, storageError } = useDemo();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [directoryView, setDirectoryView] = useState("cards");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [appointmentRange, setAppointmentRange] = useState("All appointments");
  const [complete, setComplete] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const journey = useDemo((s) => s.journey);
  const request = useDemo((s) => s.editorRequest);
  useEffect(() => {
    void hydrateDemo();
  }, []);
  useEffect(() => {
    if (!ready || !d || !request || request.route !== pathname) return;
    setQuery("");
    setFilter("All statuses");
    setAppointmentRange("All appointments");
    const { kind, recordId } = request;
    if (kind === "enquiry") {
      const value = d.enquiries.find((e) => e.id === recordId);
      if (value) setEditor({ kind, value });
    }
    if (kind === "customer") {
      const value = d.customers.find((c) => c.id === recordId);
      if (value) setEditor({ kind, value });
    }
    if (kind === "quote") {
      const value = d.quotes.find((q) => q.id === recordId);
      const enquiry = d.enquiries.find((e) => e.id === recordId);
      if (value || enquiry) setEditor({ kind, value, enquiry });
    }
    if (kind === "booking") {
      const value = d.bookings.find((b) => b.id === recordId);
      const quote = d.quotes.find((q) => q.id === recordId);
      if (value || quote) setEditor({ kind, value, quote });
    }
    useDemo.getState().clearEditorRequest();
  }, [ready, d, request, pathname]);
  const highlightedId = (
    {
      Enquiries: journey?.enquiryId,
      Quotations: journey?.quoteId,
      Bookings: journey?.bookingId,
      Customers: journey?.customerId,
    } as Partial<Record<Section, string | undefined>>
  )[section];
  useEffect(() => {
    if (!ready || !journey?.active || !highlightedId) return;
    const frame = requestAnimationFrame(() => {
      const mobile =
        window.matchMedia("(max-width: 639px)").matches || (section !== "Bookings" && directoryView === "cards");
      document
        .getElementById(mobile ? `mobile-${highlightedId}` : highlightedId)
        ?.scrollIntoView({ block: mobile ? "center" : "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, journey?.active, highlightedId, section, directoryView]);
  if (!ready || !d)
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading Winglo workspace">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  const customer = (cid: string) => d.customers.find((c) => c.id === cid);
  const service = (sid: string) => d.settings.services.find((s) => s.id === sid)?.name ?? sid;
  const matches = (text: string, status?: string) =>
    text.toLowerCase().includes(query.toLowerCase()) && (filter === "All statuses" || status === filter);
  const editEnquiry = (value?: Enquiry) => (value ? router.push(jobUrl(value.id)) : setEditor({ kind: "enquiry" }));
  const editQuote = (value?: Quote) => (value ? router.push(jobUrl(value.id)) : setEditor({ kind: "quote" }));
  const editBooking = (value?: Booking) => (value ? router.push(jobUrl(value.id)) : setEditor({ kind: "booking" }));
  const createFrom = (enquiry: Enquiry) => router.push(jobUrl(enquiry.id));
  const inRange = (b: Booking) =>
    appointmentRange === "All appointments" ||
    (appointmentRange === "Today"
      ? b.start.startsWith(localDate())
      : b.start.slice(0, 10) >= localDate() && !["Cancelled", "Completed"].includes(b.status));
  function createRecord() {
    if (section === "Quotations") {
      editQuote();
      return;
    }
    if (section === "Bookings") {
      editBooking();
      return;
    }
    editEnquiry();
  }
  const actionLabels: Partial<Record<Section, string>> = {
    Enquiries: "New enquiry",
    Quotations: "New quotation",
    Bookings: "New booking",
    Customers: "Add customer via enquiry",
  };
  const statusOptions: Partial<Record<Section, readonly string[]>> = {
    Enquiries: enquiryStatuses,
    Quotations: quoteStatuses,
    Bookings: bookingStatuses,
  };
  const tableHeaders: Partial<Record<Section, string[]>> = {
    Enquiries: ["Customer", "Contact", "Service & location", "Received", "Status", "Actions"],
    Quotations: ["Customer", "Service", "Estimate", "Status", "Actions"],
    Bookings: ["Customer", "Service", "Date & duration", "Cleaner", "Status", "Actions"],
    Customers: ["Customer", "Contact", "Location", "History", "Actions"],
  };
  const visibleRecordCount = () => {
    if (section === "Enquiries")
      return d.enquiries.filter((e) =>
        matches(
          `${customer(e.customerId)?.name} ${customer(e.customerId)?.phone} ${customer(e.customerId)?.location} ${service(e.serviceId)} ${e.id}`,
          e.status,
        ),
      ).length;
    if (section === "Quotations")
      return d.quotes.filter((q) =>
        matches(`${customer(q.customerId)?.name} ${service(q.serviceId)} ${q.id}`, q.status),
      ).length;
    if (section === "Bookings")
      return d.bookings.filter(
        (b) => inRange(b) && matches(`${customer(b.customerId)?.name} ${service(b.serviceId)}`, b.status),
      ).length;
    return d.customers.filter((c) => matches(`${c.name} ${c.phone} ${c.email} ${c.location}`)).length;
  };
  function editorTitle() {
    if (!editor) return "";
    if (editor.kind === "enquiry") return editor.value ? "Enquiry details" : "New cleaning enquiry";
    return {
      conversation: "A conversation that becomes an enquiry",
      quote: "Sample quotation",
      booking: "Cleaning appointment",
      customer: "Customer profile",
      automation: "Automation preview",
    }[editor.kind];
  }
  const doneEnquiry = (eid: string) => {
    setEditor(null);
    if (!publicForm) router.push(jobUrl(eid));
    else setComplete(eid);
    toast.success("Thank you! Your enquiry is saved and ready for a sample quotation.");
  };
  if (publicForm)
    return (
      <main className="bg-background mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-5 py-12">
        <header>
          <p className="text-primary text-xs tracking-widest uppercase">Winglo Cleaning Services</p>
          <h1 className="mt-3 text-3xl">Let’s make your space shine.</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Demo enquiry form · Submissions stay in this browser only. They will not appear on another device. No photos
            are uploaded.
          </p>
        </header>
        <Panel title={complete ? "Thank you for your enquiry" : "Tell us about your clean"}>
          {complete ? (
            <div className="flex flex-col gap-4">
              <p>Your details are saved in this browser’s demo workspace.</p>
              <Button onClick={() => setComplete(null)}>Submit another enquiry</Button>
              <Link href="/dashboard/enquiries" className="text-sm underline">
                View local demo enquiries
              </Link>
            </div>
          ) : (
            <EnquiryForm onDone={doneEnquiry} />
          )}
        </Panel>
      </main>
    );
  return (
    <div className="@container/main flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-primary text-xs tracking-widest uppercase">Winglo · Cleaning Services</p>
          <h1 className="mt-2 text-3xl tracking-tight">
            {section === "Overview" ? "A fresh start, every day." : section}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {section === "Overview"
              ? "Your enquiries, your team, and the spaces you care for."
              : `Your cleaning business, connected. Manage ${section.toLowerCase()} in one place.`}
          </p>
        </div>
        <Status>Demo Data · ZAR</Status>
      </header>
      {storageError && (
        <p role="alert" className="text-destructive">
          Browser storage is unavailable. Changes may not survive a refresh.
        </p>
      )}
      {section === "Overview" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => editEnquiry()}>
              <Plus data-icon="inline-start" />
              New Enquiry
            </Button>
            <Button variant="outline" onClick={() => editQuote()}>
              <FileText data-icon="inline-start" />
              Create Quotation
            </Button>
            <Button variant="outline" onClick={() => editBooking()}>
              <CalendarDays data-icon="inline-start" />
              Add Booking
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                useDemo.getState().startJourney();
                router.push("/dashboard/demo");
              }}
            >
              <Sparkles data-icon="inline-start" />
              Try a Sample Job
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (journey?.active) useDemo.getState().patchJourney({ paused: true });
                toast.info("Explore all six management sections freely. Your saved data stays available.");
              }}
            >
              <Compass data-icon="inline-start" />
              Explore Dashboard
            </Button>
          </div>
          <div id="winglo-overview">
            <Overview onEnquiry={editEnquiry} onQuote={editQuote} onBooking={editBooking} />
          </div>
          <Panel title="Completed cleaning jobs" description="Completed bookings across all dates">
            <strong className="text-2xl">{d.bookings.filter((b) => b.status === "Completed").length}</strong>
          </Panel>
          <DemoActivity />
        </>
      )}
      {section === "Settings" && <SettingsPage />}
      {!["Overview", "Settings"].includes(section) && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
              <div className="w-full sm:w-64">
                <TextField
                  label={`Search ${section.toLowerCase()}`}
                  placeholder="Search names, services, locations…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {section !== "Customers" && (
                <div className="w-full sm:w-44">
                  <Choice
                    label="Filter status"
                    value={filter}
                    onChange={setFilter}
                    options={["All statuses", ...(statusOptions[section] ?? [])]}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {section === "Enquiries" && (
                <>
                  <Button variant="outline" onClick={() => setEditor({ kind: "conversation" })}>
                    <MessageCircle data-icon="inline-start" />
                    Enquiry simulator
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/enquire">Customer form</Link>
                  </Button>
                </>
              )}
              {section !== "Bookings" && (
                <Button
                  className="hidden sm:inline-flex"
                  variant="outline"
                  onClick={() => setDirectoryView(directoryView === "cards" ? "table" : "cards")}
                >
                  {directoryView === "cards" ? "Table view" : "Card view"}
                </Button>
              )}
              <Button onClick={createRecord}>
                <Plus data-icon="inline-start" />
                {actionLabels[section]}
              </Button>
            </div>
          </div>
          {section === "Bookings" && (
            <>
              <BookingCalendar onEdit={editBooking} />
              <Choice
                label="Appointment range"
                value={appointmentRange}
                options={["All appointments", "Today", "Upcoming"]}
                onChange={setAppointmentRange}
              />
              <p className="text-muted-foreground text-sm">
                Click an appointment to edit, reschedule, assign staff or mark complete. All times use this device’s
                local timezone.
              </p>
            </>
          )}
          {["Enquiries", "Quotations", "Customers"].includes(section) && (
            <div className={cn(directoryView === "table" && "sm:hidden")}>
              <DirectoryCards
                section={section as "Enquiries" | "Quotations" | "Customers"}
                data={d}
                highlightedId={journey?.active ? highlightedId : undefined}
                matches={matches}
                onJob={(id) => router.push(jobUrl(id))}
                onCustomer={(value) => setEditor({ kind: "customer", value })}
                onRepeat={(value) => setEditor({ kind: "booking", customerId: value.id })}
              />
            </div>
          )}
          {section === "Bookings" && (
            <section className="grid gap-3 sm:hidden [&_button]:min-h-11" aria-label="Mobile cleaning appointments">
              {d.bookings
                .filter(
                  (b) => inRange(b) && matches(`${customer(b.customerId)?.name} ${service(b.serviceId)}`, b.status),
                )
                .sort((a, b) => {
                  const rank = (b: Booking) => {
                    if (journey?.active && journey.bookingId === b.id) return 0;
                    return ["Completed", "Cancelled"].includes(b.status) ? 2 : 1;
                  };
                  return rank(a) - rank(b) || a.start.localeCompare(b.start);
                })
                .map((b) => (
                  <Panel
                    key={b.id}
                    id={`mobile-${b.id}`}
                    highlighted={journey?.active && highlightedId === b.id}
                    highlightLabel="Your demo booking"
                    title={customer(b.customerId)?.name ?? "Customer"}
                    description={service(b.serviceId)}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <Status>{b.status}</Status>
                        <span className="text-sm font-medium">{money(b.amount)}</span>
                      </div>
                      <p className="text-sm">
                        {b.start.replace("T", " · ")} · {b.duration} hours
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {d.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Unassigned"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <NextActionButton booking={b} />
                        <Button size="sm" variant="outline" onClick={() => editBooking(b)}>
                          Open Job
                        </Button>
                      </div>
                    </div>
                  </Panel>
                ))}
            </section>
          )}
          {visibleRecordCount() === 0 && (
            <div className={cn(section === "Bookings" || directoryView === "table" ? "sm:hidden" : "")}>
              <EmptyRecords />
            </div>
          )}
          <Panel
            className={cn("hidden", (section === "Bookings" || directoryView === "table") && "sm:block")}
            title={section === "Bookings" ? "Cleaning appointments" : `${section} directory`}
            description="Fictional records · Changes persist on this browser only"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {(tableHeaders[section] ?? []).map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section === "Enquiries" &&
                  d.enquiries
                    .filter((e) =>
                      matches(
                        `${customer(e.customerId)?.name} ${customer(e.customerId)?.phone} ${customer(e.customerId)?.location} ${service(e.serviceId)} ${e.id}`,
                        e.status,
                      ),
                    )
                    .map((e) => (
                      <TableRow
                        key={e.id}
                        id={e.id}
                        data-tour-record={journey?.active && journey.enquiryId === e.id}
                        className={journey?.active && journey.enquiryId === e.id ? "bg-accent" : undefined}
                      >
                        <TableCell className="font-medium">{customer(e.customerId)?.name}</TableCell>
                        <TableCell>{customer(e.customerId)?.phone}</TableCell>
                        <TableCell>
                          {service(e.serviceId)}
                          <span className="text-muted-foreground block text-xs">
                            {customer(e.customerId)?.location}
                          </span>
                        </TableCell>
                        <TableCell>{e.date.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Status>{e.status}</Status>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => editEnquiry(e)}>
                              Open Job
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                {section === "Quotations" &&
                  d.quotes
                    .filter((q) => matches(`${customer(q.customerId)?.name} ${service(q.serviceId)} ${q.id}`, q.status))
                    .map((q) => (
                      <TableRow
                        key={q.id}
                        id={q.id}
                        data-tour-record={journey?.active && journey.quoteId === q.id}
                        className={journey?.active && journey.quoteId === q.id ? "bg-accent" : undefined}
                      >
                        <TableCell className="font-medium">
                          {customer(q.customerId)?.name}
                          <span className="text-muted-foreground block text-xs">{q.id}</span>
                        </TableCell>
                        <TableCell>{service(q.serviceId)}</TableCell>
                        <TableCell>
                          {money(total(q))}
                          <span className="text-muted-foreground block text-xs">Sample estimate</span>
                        </TableCell>
                        <TableCell>
                          <Status>{q.status}</Status>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => editQuote(q)}>
                              Open Job
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => printQuote(q, d)}>
                              Print / PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                {section === "Bookings" &&
                  [...d.bookings]
                    .sort((a, b) => b.start.localeCompare(a.start))
                    .filter(
                      (b) => inRange(b) && matches(`${customer(b.customerId)?.name} ${service(b.serviceId)}`, b.status),
                    )
                    .map((b) => (
                      <TableRow
                        key={b.id}
                        id={b.id}
                        data-tour-record={journey?.active && journey.bookingId === b.id}
                        className={journey?.active && journey.bookingId === b.id ? "bg-accent" : undefined}
                      >
                        <TableCell className="font-medium">{customer(b.customerId)?.name}</TableCell>
                        <TableCell>{service(b.serviceId)}</TableCell>
                        <TableCell>
                          {b.start.replace("T", " · ")}
                          <span className="text-muted-foreground block text-xs">{b.duration} hours</span>
                        </TableCell>
                        <TableCell>{d.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Status>{b.status}</Status>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <NextActionButton booking={b} />
                            <Button size="sm" variant="outline" onClick={() => editBooking(b)}>
                              Open Job
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                {section === "Customers" &&
                  d.customers
                    .filter((c) => matches(`${c.name} ${c.phone} ${c.email} ${c.location}`))
                    .map((c) => (
                      <TableRow key={c.id} id={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          {c.phone}
                          <span className="text-muted-foreground block text-xs">{c.email}</span>
                        </TableCell>
                        <TableCell>{c.location}</TableCell>
                        <TableCell>
                          {d.bookings.filter((b) => b.customerId === c.id && b.status === "Completed").length} completed
                          cleans
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditor({ kind: "customer", value: c })}
                            >
                              Customer profile
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditor({ kind: "booking", customerId: c.id })}
                            >
                              Repeat booking
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            {visibleRecordCount() === 0 && <EmptyRecords />}
          </Panel>
        </>
      )}
      {complete && (
        <Panel
          title="Thank you — enquiry ready for quote"
          description="Your customer details and service answers are saved. No real messages were sent."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const e = d.enquiries.find((e) => e.id === complete);
                if (e) createFrom(e);
                setComplete(null);
              }}
            >
              Generate Quotation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setComplete(null);
                setEditor({ kind: "conversation" });
              }}
            >
              Restart Conversation
            </Button>
            <Button variant="ghost" onClick={() => setComplete(null)}>
              Dismiss
            </Button>
          </div>
        </Panel>
      )}
      {editor && (
        <Modal title={editorTitle()} onClose={() => setEditor(null)}>
          {editor.kind === "enquiry" && (
            <>
              <EnquiryForm initial={editor.value} onDone={doneEnquiry} />
              {editor.value && (
                <div className="flex flex-col gap-4 border-t pt-4">
                  <Choice
                    label="Enquiry status"
                    value={editor.value.status}
                    options={enquiryStatuses}
                    onChange={(v) => {
                      const selected = editor.value;
                      if (!selected) return;
                      update((d) => ({
                        ...d,
                        enquiries: d.enquiries.map((e) =>
                          e.id === editor.value?.id ? { ...e, status: v as Enquiry["status"] } : e,
                        ),
                      }));
                      setEditor({ ...editor, value: { ...selected, status: v as Enquiry["status"] } });
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editor.value) createFrom(editor.value);
                    }}
                  >
                    Generate quotation from these details
                  </Button>
                </div>
              )}
            </>
          )}
          {editor.kind === "conversation" && <EnquiryForm conversation onDone={doneEnquiry} />}
          {editor.kind === "quote" && (
            <QuoteEditor
              initial={editor.value}
              enquiry={editor.enquiry}
              onDone={(recordId) => {
                setEditor(null);
                router.push(jobUrl(recordId));
              }}
            />
          )}
          {editor.kind === "booking" && (
            <BookingEditor
              initial={editor.value}
              quote={editor.quote}
              customerId={editor.customerId}
              onDone={(recordId) => {
                setEditor(null);
                router.push(jobUrl(recordId));
              }}
            />
          )}
          {editor.kind === "customer" && (
            <CustomerProfile
              customer={editor.value}
              onQuote={editQuote}
              onBooking={editBooking}
              onRepeat={() => setEditor({ kind: "booking", customerId: editor.value.id })}
            />
          )}
          {editor.kind === "automation" && <AutomationPreview />}
        </Modal>
      )}
      <footer className="text-muted-foreground flex flex-wrap justify-between gap-2 border-t pt-4 text-xs">
        <span>Winglo Cleaning Services · Interactive demo</span>
        <span>Sample estimates · Local browser storage · No messages sent</span>
      </footer>
    </div>
  );
}
function CustomerProfile({
  customer: c,
  onQuote,
  onBooking,
  onRepeat,
}: {
  customer: Customer;
  onQuote: (q: Quote) => void;
  onBooking: (b: Booking) => void;
  onRepeat: () => void;
}) {
  const d = useDemoData();
  const update = useDemo((s) => s.update);
  const [notes, setNotes] = useState(c.notes);
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xl">{c.name}</h3>
      <p className="text-muted-foreground text-sm">
        {c.phone} · {c.email}
        <br />
        {c.location}
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, customers: d.customers.map((v) => (v.id === c.id ? { ...v, notes } : v)) }));
          toast.success("Customer notes saved");
        }}
      >
        <TextField label="Customer notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="outline" type="submit">
          Save notes
        </Button>
      </form>
      <h4 className="font-medium">Previous quotations</h4>
      {d.quotes
        .filter((q) => q.customerId === c.id)
        .map((q) => (
          <Button
            key={q.id}
            id={q.id}
            variant="outline"
            className="h-auto justify-between py-3 whitespace-normal"
            onClick={() => onQuote(q)}
          >
            {q.id} · {money(total(q))}
            <Status>{q.status}</Status>
          </Button>
        ))}
      <h4 className="font-medium">Service & booking history</h4>
      {d.bookings
        .filter((b) => b.customerId === c.id)
        .map((b) => (
          <Button
            key={b.id}
            id={b.id}
            variant="outline"
            className="h-auto justify-between py-3 whitespace-normal"
            onClick={() => onBooking(b)}
          >
            {b.start.replace("T", " · ")}
            <Status>{b.status}</Status>
          </Button>
        ))}
      {!d.bookings.some((b) => b.customerId === c.id) && (
        <p className="text-muted-foreground text-sm">No bookings yet.</p>
      )}
      <Button onClick={onRepeat}>Create repeat booking</Button>
    </div>
  );
}
