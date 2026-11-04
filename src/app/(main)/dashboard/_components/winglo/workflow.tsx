"use client";
import { useState } from "react";

import { cn } from "cn";
import { CalendarCheck, Check, CheckCheck, Clock3, MapPin, Sparkles, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type { Activity } from "./journey";
import { type Booking, money } from "./model";
import { Modal, Status } from "./shared";
import { useDemo, useDemoData } from "./store";

export const bookingFlow = [
  { status: "Pending", label: "Pending", icon: Clock3, action: "Confirm Booking", next: "Confirmed" },
  { status: "Confirmed", label: "Confirmed", icon: CalendarCheck, action: "Start Cleaning", next: "In Progress" },
  { status: "In Progress", label: "In Progress", icon: Sparkles, action: "Complete Job", next: "Completed" },
  { status: "Completed", label: "Completed", icon: CheckCheck },
] as const;
export function WorkflowStepper({ booking }: { booking: Booking }) {
  const index = bookingFlow.findIndex((s) => s.status === booking.status);
  if (booking.status === "Cancelled")
    return (
      <div className="text-destructive flex items-center gap-2 text-sm">
        <X className="size-4" />
        Booking cancelled · No next action
      </div>
    );
  return (
    <ol aria-label="Booking workflow" className="grid gap-3 sm:grid-cols-4">
      {bookingFlow.map((step, i) => (
        <li
          key={step.status}
          aria-current={i === index ? "step" : undefined}
          className="relative flex items-center gap-3 sm:flex-col sm:items-start"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 motion-reduce:transition-none",
              i <= index ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground",
            )}
          >
            {i < index ? <Check className="size-4" /> : <step.icon className="size-4" />}
          </span>
          <span className={cn("text-xs font-medium", i > index && "text-muted-foreground")}>
            {step.label}
            {i === index && <span className="text-primary mt-0.5 block text-xs">Current stage</span>}
          </span>
          {i < bookingFlow.length - 1 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-9 left-4 h-3 w-px transition-colors duration-200 motion-reduce:transition-none sm:top-4 sm:left-10 sm:h-px sm:w-[calc(100%-2.5rem)]",
                i < index ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
export function NextActionButton({ booking, onDone }: { booking: Booking; onDone?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const step = bookingFlow.find((s) => s.status === booking.status);
  if (!step || !("next" in step)) return null;
  function apply() {
    setBusy(true);
    try {
      const state = useDemo.getState();
      const current = state.data?.bookings.find((b) => b.id === booking.id);
      if (!current || current.status !== booking.status)
        throw new Error("This booking changed. Reopen it before continuing.");
      if (!step || !("next" in step)) return;
      if (
        !state.data?.customers.some((c) => c.id === current.customerId) ||
        !state.data.settings.services.some((s) => s.id === current.serviceId) ||
        !Number.isFinite(new Date(current.start).getTime()) ||
        !Number.isFinite(current.duration) ||
        current.duration < 0.5 ||
        current.duration > 24 ||
        !Number.isFinite(current.amount) ||
        current.amount < 0 ||
        (current.staffId && !state.data.settings.staff.some((s) => s.id === current.staffId))
      )
        throw new Error("Complete the saved booking details before continuing.");
      const updated: Booking = { ...current, status: step.next };
      state.book(updated);
      const event = useDemo.getState().activity.find((e) => e.recordId === booking.id)?.id;
      const undo = () => {
        const latest = useDemo.getState();
        const record = latest.data?.bookings.find((b) => b.id === booking.id);
        if (
          JSON.stringify(record) !== JSON.stringify(updated) ||
          latest.activity.find((e) => e.recordId === booking.id)?.id !== event
        ) {
          toast.info("Booking changed since this action. Use its current details to make a correction.");
          return;
        }
        try {
          latest.book(current);
          toast.success("Booking action undone");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to undo booking action.");
        }
      };
      if (updated.status === "Completed")
        toast.success("Job completed · Customer history and completed-job revenue updated");
      else
        toast.success(
          updated.status === "Confirmed" ? "Booking confirmed · Saved to your calendar" : "Cleaning started",
          { duration: 6000, action: { label: "Undo", onClick: undo } },
        );
      setConfirm(false);
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update booking.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => (step.next === "Completed" ? setConfirm(true) : apply())}
      >
        {step.action}
      </Button>
      {confirm && (
        <Modal
          title="Complete this cleaning job?"
          description="This updates completed-job revenue and the customer's service history."
          onClose={() => setConfirm(false)}
        >
          <p className="text-sm">
            Mark this saved booking Completed with a demo job value of <strong>{money(booking.amount)}</strong>?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={apply}>
              Confirm Completion
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirm(false)}>
              Keep In Progress
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function ActivityTimeline({ events, showCustomer = false }: { events: Activity[]; showCustomer?: boolean }) {
  const data = useDemoData();
  if (!events.length)
    return (
      <p className="text-muted-foreground text-sm">
        No activity has been recorded yet. Existing sample records have no invented history.
      </p>
    );
  return (
    <ol className="flex flex-col gap-4">
      {[...events]
        .sort((a, b) => b.time.localeCompare(a.time))
        .map((e) => (
          <li key={e.id} className="border-primary/20 relative ml-1 border-l pl-5">
            <span className="bg-primary absolute top-1 -left-1 size-2 rounded-full" aria-hidden />
            <p className="text-sm font-medium">{e.label}</p>
            {showCustomer && (
              <p className="text-muted-foreground mt-1 text-xs">
                {data.customers.find((c) => c.id === e.customerId)?.name} · {e.recordId}
              </p>
            )}
            <time dateTime={e.time} className="text-muted-foreground text-xs">
              {new Date(e.time).toLocaleString("en-ZA")}
            </time>
          </li>
        ))}
    </ol>
  );
}
export function BookingSummary({ booking }: { booking: Booking }) {
  const d = useDemoData();
  const customer = d.customers.find((c) => c.id === booking.customerId);
  const activity = useDemo((s) => s.activity);
  return (
    <section className="bg-muted/30 flex flex-col gap-5 rounded-xl border p-4" aria-label="Saved booking summary">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Saved appointment · {booking.id}</p>
          <h3 className="mt-1 text-lg font-medium">{customer?.name}</h3>
          <p className="text-muted-foreground text-sm">
            {d.settings.services.find((s) => s.id === booking.serviceId)?.name}
          </p>
        </div>
        <Status>{booking.status}</Status>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarCheck className="text-primary size-4" />
          {booking.start.replace("T", " · ")} · {booking.duration}h
        </p>
        <p className="flex items-center gap-2">
          <UserRound className="text-primary size-4" />
          {d.settings.staff.find((s) => s.id === booking.staffId)?.name ?? "Unassigned"}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="text-primary size-4" />
          {customer?.location}
        </p>
        <p className="font-medium">
          {money(booking.amount)} <span className="text-muted-foreground text-xs">sample job value</span>
        </p>
      </div>
      <WorkflowStepper booking={booking} />
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-medium">Recorded activity</h4>
        <ActivityTimeline events={activity.filter((e) => e.recordId === booking.id).slice(0, 6)} />
      </div>
    </section>
  );
}
