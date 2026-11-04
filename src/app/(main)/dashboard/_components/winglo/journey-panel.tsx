"use client";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { cn } from "cn";
import { ArrowLeft, ArrowRight, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { draftComplete, type Journey, stageReady, stages } from "./journey";
import { Modal } from "./shared";
import { hydrateDemo, useDemo } from "./store";

export function JourneyPanel() {
  const { data, journey: j, ready } = useDemo();
  const [reminderOpen, setReminderOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    void hydrateDemo();
  }, []);
  useEffect(() => {
    if (ready && j?.active && j.route !== pathname) useDemo.getState().patchJourney({ route: pathname });
  }, [pathname, ready, j?.active, j?.route]);
  if (!ready || !data || !j?.active) return null;
  const store = useDemo.getState();
  const quote = data.quotes.find((q) => q.id === j.quoteId);
  const booking = data.bookings.find((b) => b.id === j.bookingId);
  const customer = data.customers.find((c) => c.id === booking?.customerId);
  const reminder = (
    data.settings.templates["Booking reminder"] ?? "Hi {name}, a reminder of your {service} appointment on {date}."
  )
    .replaceAll("{name}", customer?.name ?? "Demo customer")
    .replaceAll("{service}", data.settings.services.find((s) => s.id === booking?.serviceId)?.name ?? "cleaning")
    .replaceAll("{date}", booking?.start.replace("T", " at ") ?? "the scheduled date");
  function focus(current: Journey) {
    const route = current.completed ? "/dashboard/demo" : stages[current.step].route;
    router.push(route);
    if (current.completed) return;
    if (current.step === 3 && (current.quoteId || current.enquiryId))
      store.requestEditor({ kind: "quote", recordId: current.quoteId ?? current.enquiryId ?? "", route });
    if (current.step === 5 && (current.bookingId || current.quoteId))
      store.requestEditor({ kind: "booking", recordId: current.bookingId ?? current.quoteId ?? "", route });
    if (current.step === 7 && current.bookingId)
      store.requestEditor({ kind: "booking", recordId: current.bookingId, route });
  }
  const resume = () => {
    store.patchJourney({ paused: false, minimized: false });
    focus(j);
  };
  const restart = () => {
    store.startJourney(true);
    router.push("/dashboard/demo");
    toast.info("New isolated scenario started. All existing business records are retained.");
  };
  if (j.minimized || j.paused)
    return (
      <aside className="pointer-events-none sticky bottom-3 mx-4 mb-4" aria-label="Guided demo progress">
        <Card className="pointer-events-auto ml-auto max-h-[38dvh] w-full max-w-xl overflow-y-auto sm:max-h-none">
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <span className="text-muted-foreground text-xs">
              Demo {j.paused ? "paused" : "minimised"} · Stage {j.step + 1}/8
            </span>
            <Button size="sm" onClick={resume}>
              <Play data-icon="inline-start" />
              Resume Demo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Exit Demo"
              onClick={() => store.patchJourney({ active: false })}
            >
              <X />
            </Button>
          </CardContent>
        </Card>
      </aside>
    );
  const collecting = pathname === "/dashboard/demo" && j.step < 2 && !j.completed;
  return (
    <aside className="pointer-events-none sticky bottom-3 mx-4 mb-4" aria-label="Guided demo progress">
      {collecting && (
        <Card className="pointer-events-auto sm:hidden">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-primary text-xs">Stage {j.step + 1} of 8</p>
              <p className="mt-1 text-sm">
                {draftComplete(j, data)
                  ? "Ready — tap Create Enquiry & Continue above"
                  : "Answer the customer questions above to continue"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Minimise demo"
              onClick={() => store.patchJourney({ minimized: true })}
            >
              <Minimize2 />
            </Button>
          </CardContent>
        </Card>
      )}
      <Card
        className={cn(
          "pointer-events-auto ml-auto max-h-[38dvh] w-full max-w-xl overflow-y-auto sm:max-h-none",
          collecting && "hidden sm:block",
        )}
      >
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-primary text-xs">
                {j.completed ? "Journey complete" : `Stage ${j.step + 1} of ${stages.length}`} · Browser-local demo
              </p>
              <h2 className="mt-1 text-sm font-medium">
                {j.completed ? "A complete Winglo customer journey" : stages[j.step].title}
              </h2>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Minimise demo"
                onClick={() => store.patchJourney({ minimized: true })}
              >
                <Minimize2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Exit Demo"
                onClick={() => store.patchJourney({ active: false })}
              >
                <X />
              </Button>
            </div>
          </div>
          {j.step === 4 && !j.completed && quote && (
            <>
              {["Draft", "Awaiting Approval"].includes(quote.status) && (
                <Button onClick={() => store.quoteStatus(quote.id, "Sent (Simulated)")}>Approve Quotation</Button>
              )}
              {quote.status === "Sent (Simulated)" && (
                <Button onClick={() => store.quoteStatus(quote.id, "Accepted (Simulated)")}>
                  Simulate Customer Acceptance
                </Button>
              )}
            </>
          )}
          {j.step === 6 && !j.completed && booking && (
            <>
              <Button
                onClick={() => {
                  setReminderOpen(true);
                  store.previewReminder(booking.id);
                }}
              >
                {j.reminderPreviewed ? "View Customer Reminder Again" : "Preview Customer Reminder"}
              </Button>
              {j.reminderPreviewed && (
                <p className="text-sm" role="status">
                  Reminder previewed. Select Next Step to complete the cleaning job.
                </p>
              )}
              {reminderOpen && (
                <Modal
                  title="Customer Reminder Preview"
                  description="Simulation Only · No real message is sent."
                  onClose={() => setReminderOpen(false)}
                >
                  <blockquote className="bg-muted rounded-lg p-4 text-sm">{reminder}</blockquote>
                  <Button onClick={() => setReminderOpen(false)}>Done — Continue Demo</Button>
                </Modal>
              )}
            </>
          )}
          <Progress value={j.completed ? 100 : (j.completedSteps.length / 8) * 100} />
          <p className="text-muted-foreground text-xs">
            {j.completed
              ? "Your linked enquiry, quotation, booking and customer history are saved. Nothing was sent externally."
              : stages[j.step].instruction}
          </p>
          {!j.completed && !stageReady(j, data) && (
            <p className="text-muted-foreground text-xs" role="status">
              Complete the required action above to unlock the next stage.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={j.step === 0}
              onClick={() => {
                store.previousStage();
                const previous = useDemo.getState().journey;
                if (previous) focus(previous);
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              Previous Step
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (j.completed) {
                  focus(j);
                  return;
                }
                if (pathname !== stages[j.step].route) {
                  focus(j);
                  return;
                }
                if (!store.advanceJourney()) {
                  toast.info(stages[j.step].instruction);
                  focus(j);
                  return;
                }
                const next = useDemo.getState().journey;
                if (next) focus(next);
              }}
            >
              {j.completed ? "View summary" : "Next Step"}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => store.patchJourney({ paused: true })}>
              <Pause data-icon="inline-start" />
              Pause
            </Button>
            <Button size="sm" variant="ghost" onClick={restart}>
              <RotateCcw data-icon="inline-start" />
              Restart Demo
            </Button>
            {pathname !== stages[j.step].route && !j.completed && (
              <Button size="sm" variant="outline" onClick={resume}>
                Resume Demo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
