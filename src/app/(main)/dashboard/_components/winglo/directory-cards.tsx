"use client";
import { MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { type Customer, type DemoData, money, serviceQuestions, total } from "./model";
import { RecordCard } from "./record-card";
import { printQuote } from "./record-editors";
import { Status } from "./shared";

export function DirectoryCards({
  section,
  data: d,
  highlightedId,
  matches,
  onJob,
  onCustomer,
  onRepeat,
}: {
  section: "Enquiries" | "Quotations" | "Customers";
  data: DemoData;
  highlightedId?: string;
  matches: (text: string, status?: string) => boolean;
  onJob: (id: string) => void;
  onCustomer: (customer: Customer) => void;
  onRepeat: (customer: Customer) => void;
}) {
  const customer = (id: string) => d.customers.find((c) => c.id === id);
  const service = (id: string) => d.settings.services.find((s) => s.id === id)?.name;
  return (
    <section
      className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label={`Mobile ${section.toLowerCase()}`}
    >
      {section === "Enquiries" &&
        d.enquiries
          .filter((e) =>
            matches(
              `${customer(e.customerId)?.name} ${customer(e.customerId)?.phone} ${customer(e.customerId)?.location} ${service(e.serviceId)} ${e.id}`,
              e.status,
            ),
          )
          .map((e) => (
            <RecordCard
              key={e.id}
              id={`mobile-${e.id}`}
              name={customer(e.customerId)?.name ?? "Customer"}
              description={service(e.serviceId)}
              status={<Status>{e.status}</Status>}
              highlighted={highlightedId === e.id}
              reference={e.id}
              actions={<Button onClick={() => onJob(e.id)}>Open Job</Button>}
            >
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="size-3.5 shrink-0" />
                {customer(e.customerId)?.location}
              </p>
              <p className="text-muted-foreground text-sm">
                {(serviceQuestions[e.serviceId] ?? [])
                  .filter((q) => q.numeric && e.answers[q.key])
                  .slice(0, 2)
                  .map(
                    (q) =>
                      `${e.answers[q.key]} ${
                        q.key === "size"
                          ? "m²"
                          : q.label
                              .replace(/^Number of |^How many /i, "")
                              .replace(/\?$/, "")
                              .toLowerCase()
                      }`,
                  )
                  .join(" · ") || "Service details collected"}
              </p>
              <p className="text-muted-foreground text-xs">Preferred · {e.preferredDate}</p>
            </RecordCard>
          ))}
      {section === "Quotations" &&
        d.quotes
          .filter((q) => matches(`${customer(q.customerId)?.name} ${service(q.serviceId)} ${q.id}`, q.status))
          .map((q) => (
            <RecordCard
              key={q.id}
              id={`mobile-${q.id}`}
              name={customer(q.customerId)?.name ?? "Customer"}
              description={service(q.serviceId)}
              status={<Status>{q.status}</Status>}
              highlighted={highlightedId === q.id}
              reference={q.id}
              actions={
                <>
                  <Button onClick={() => onJob(q.id)}>Open Job</Button>
                  <Button variant="ghost" onClick={() => printQuote(q, d)}>
                    Print / PDF
                  </Button>
                </>
              }
            >
              <div>
                <p className="text-muted-foreground text-xs">Sample estimate</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{money(total(q))}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                {q.date} · {q.status === "Sent (Simulated)" ? "Waiting for customer" : "Open job for next action"}
              </p>
            </RecordCard>
          ))}
      {section === "Customers" &&
        d.customers
          .filter((c) => matches(`${c.name} ${c.phone} ${c.email} ${c.location}`))
          .map((c) => {
            const jobs = d.bookings.filter((b) => b.customerId === c.id);
            const completed = jobs
              .filter((b) => b.status === "Completed")
              .sort((a, b) => b.start.localeCompare(a.start));
            return (
              <RecordCard
                key={c.id}
                id={`mobile-${c.id}`}
                name={c.name}
                avatar
                description={c.location}
                highlighted={highlightedId === c.id}
                reference={c.id}
                actions={
                  <>
                    <Button variant="outline" onClick={() => onCustomer(c)}>
                      View Customer
                    </Button>
                    <Button variant="ghost" onClick={() => onRepeat(c)}>
                      Repeat booking
                    </Button>
                  </>
                }
              >
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="size-3.5 shrink-0" />
                  {c.phone}
                </p>
                <p className="text-muted-foreground text-xs break-all">{c.email || "No email saved"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    {jobs.length} bookings · {completed.length} completed
                  </span>
                  <span className="text-muted-foreground">
                    {completed[0] ? `Last clean · ${completed[0].start.slice(0, 10)}` : "No completed cleans yet"}
                  </span>
                </div>
              </RecordCard>
            );
          })}
    </section>
  );
}
