"use client";
import Link from "next/link";

import { CalendarClock, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { type Booking, bookingStatuses } from "./model";
import { Panel, Status } from "./shared";
import { useDemoData } from "./store";
import { NextActionButton } from "./workflow";
export function OperationsOverview({ onBooking }: { onBooking: (b: Booking) => void }) {
  const d = useDemoData();
  const attention = d.bookings
    .filter((b) => b.status === "Pending" || b.status === "In Progress")
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Your next actions" description="A clear next step for the jobs that need attention.">
        <div className="flex flex-col gap-3">
          {attention.map((b) => (
            <div
              key={b.id}
              className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors motion-reduce:transition-none"
            >
              <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => onBooking(b)}>
                <CalendarClock className="text-primary size-5 shrink-0" />
                <span className="text-sm font-medium">
                  {d.customers.find((c) => c.id === b.customerId)?.name}
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {b.start.replace("T", " · ")} ·{" "}
                    {d.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Unassigned"}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-2">
                <Status>{b.status}</Status>
                <NextActionButton booking={b} />
              </div>
            </div>
          ))}
          {!attention.length && (
            <p className="text-muted-foreground py-5 text-sm">
              You’re up to date. No pending or in-progress jobs need a next step.
            </p>
          )}
          <Button asChild variant="ghost" className="self-start">
            <Link href="/dashboard/bookings">
              View all cleaning jobs
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </Panel>
      <Panel
        title="Booking status at a glance"
        description={`${d.bookings.length} demo bookings · Live from your saved records`}
      >
        <div className="flex flex-col gap-4">
          {bookingStatuses.map((status) => {
            const count = d.bookings.filter((b) => b.status === status).length;
            return (
              <div key={status} className="flex flex-col gap-2">
                <div className="flex justify-between gap-3 text-sm">
                  <Status>{status}</Status>
                  <span className="tabular-nums">{count}</span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${(count / Math.max(1, d.bookings.length)) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
