"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, ArrowRight, CheckCheck, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Message, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { DemoActivity } from "../../_components/winglo/activity";
import {
  answerFor,
  answerValid,
  type ConversationDraft,
  conversationQuestions,
  draftComplete,
  sampleDraft,
} from "../../_components/winglo/journey";
import { money, type Question, total } from "../../_components/winglo/model";
import { AutomationPreview } from "../../_components/winglo/settings";
import { Panel, Status, TextField } from "../../_components/winglo/shared";
import { hydrateDemo, useDemo } from "../../_components/winglo/store";

export function InteractiveDemo() {
  const { data: d, journey: j, ready, storageError } = useDemo();
  const router = useRouter();
  const view = j?.view ?? (j?.enquiryId ? "business" : "customer");
  const setView = (value: string) => useDemo.getState().patchJourney({ view: value as "customer" | "business" });
  const [error, setError] = useState("");
  useEffect(() => {
    void hydrateDemo();
  }, []);
  useEffect(() => {
    if (j?.step === 6 || j?.completed) useDemo.getState().patchJourney({ view: "business" });
  }, [j?.step, j?.completed]);
  useEffect(() => {
    if (view !== "customer" || !j?.draft.cursor) return;
    const frame = requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1023px)").matches)
        document.getElementById("demo-answer")?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [j?.draft.cursor, view]);
  if (!ready || !d) return <Skeleton className="h-96" />;
  const store = useDemo.getState();
  if (!j)
    return (
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="text-3xl tracking-tight">Interactive Demo</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            See one customer journey become a connected Winglo enquiry, quotation and cleaning appointment.
          </p>
        </header>
        <Panel
          title="A customer conversation. A connected business."
          description="Interactive Simulation — No Real WhatsApp Messages Sent"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm">Start when you’re ready. Your existing dashboard records will stay intact.</p>
            <Button className="self-start" onClick={() => store.startJourney()}>
              <Sparkles data-icon="inline-start" />
              Start Interactive Demo
            </Button>
          </div>
        </Panel>
      </div>
    );
  const draft = j.draft;
  const questions = conversationQuestions(draft, d);
  const cursor = Math.min(draft.cursor, questions.length);
  const current = questions[cursor];
  const complete = draftComplete(j, d);
  const enquiry = d.enquiries.find((e) => e.id === j.enquiryId);
  const quote = d.quotes.find((q) => q.id === j.quoteId);
  const booking = d.bookings.find((b) => b.id === j.bookingId);
  const customer = d.customers.find((c) => c.id === j.customerId);
  const service = d.settings.services.find((s) => s.id === draft.serviceId)?.name;
  const answerText = (key: string) => (key === "serviceId" ? (service ?? "") : answerFor(draft, key));
  const messages: [string, string, boolean][] = [["intro", "Hi, I need someone to deep clean my house.", true]];
  questions.slice(0, cursor + 1).forEach((q, i) => {
    messages.push([`q-${q.key}`, q.label, false]);
    if (i < cursor || enquiry) messages.push([`a-${q.key}`, answerText(q.key), true]);
  });
  if (complete && cursor >= questions.length)
    messages.push([
      "complete",
      "Thank you! Your cleaning details are complete. Winglo can now prepare a sample quotation.",
      false,
    ]);
  function setAnswer(q: Question, value: string) {
    if (q.key === "serviceId") {
      store.patchDraft({ serviceId: value, answers: {}, cursor: 0 });
      return;
    }
    if (["location", "preferredDate", "name", "phone"].includes(q.key))
      store.patchDraft({ [q.key]: value } as Partial<ConversationDraft>);
    else store.patchDraft({ answers: { ...draft.answers, [q.key]: value } });
  }
  function openRecord(kind: "enquiry" | "quote" | "booking" | "customer", recordId: string, route: string) {
    router.push(route);
    store.requestEditor({ kind, recordId, route });
  }
  let businessInstruction = "Review the customer’s answers, then tap Create Enquiry & Continue.";
  if (enquiry)
    businessInstruction = "The enquiry is saved. Use Next Step in the guide to prepare the quotation and booking.";
  if (j.step >= 6)
    businessInstruction = "The booking is ready. Tap Preview Customer Reminder in the guide to continue.";
  if (j.completed) businessInstruction = "The journey is complete. View your summary or start a new demonstration.";
  function createEnquiry() {
    try {
      const eid = store.createJourneyEnquiry();
      toast.success(`Enquiry ${eid} created. Your dashboard records are updated.`);
      router.push("/dashboard/enquiries");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create enquiry.");
    }
  }
  const restart = () => {
    store.startJourney(true);
    setError("");
    toast.info("New isolated scenario. All previous records are retained.");
  };
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <div>
          <p className="text-primary text-xs tracking-widest uppercase">Winglo · Customer journey</p>
          <h1 className="mt-2 text-3xl tracking-tight">Interactive Demo</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            A customer contacts Winglo. Watch the details become a working business record.
          </p>
        </div>
        <Status>Browser-local demo data</Status>
      </header>
      <p className="text-muted-foreground text-xs">Interactive Simulation — No Real WhatsApp Messages Sent</p>
      {storageError && (
        <p role="alert" className="text-destructive text-sm">
          Browser storage is unavailable. Progress may not survive a refresh.
        </p>
      )}
      {!j.active && (
        <Button className="self-start" onClick={() => store.startJourney()}>
          Resume Demo
        </Button>
      )}
      {j.completed && (
        <Panel
          title="Customer journey complete"
          description="One connected enquiry → quotation → booking → completed clean"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Customer", customer?.name],
              ["Service", service],
              ["Quotation amount", quote && money(total(quote))],
              ["Booking date", booking?.start.replace("T", " · ")],
              ["Booking status", booking?.status],
              ["Customer record", j.customerId],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={restart}>Restart Demonstration</Button>
            {j.customerId && (
              <Button
                variant="outline"
                onClick={() => openRecord("customer", j.customerId ?? "", "/dashboard/customers")}
              >
                View customer history
              </Button>
            )}
          </div>
        </Panel>
      )}
      <section id="demo-views" className="scroll-mt-16 lg:hidden">
        <Panel
          title={view === "customer" ? "1. You are the customer" : "2. You are Winglo Business"}
          description={
            view === "customer"
              ? "Answer the cleaning questions below. We’ll switch to Winglo Business when you’re finished."
              : businessInstruction
          }
        >
          {null}
        </Panel>
      </section>
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="w-full lg:hidden">
          <TabsTrigger value="customer" aria-label="Customer View">
            1. Customer View
          </TabsTrigger>
          <TabsTrigger value="business" aria-label="Business View">
            2. Business View
          </TabsTrigger>
        </TabsList>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <TabsContent
            value="customer"
            forceMount
            className="data-[state=inactive]:hidden lg:data-[state=inactive]:block"
          >
            <Card className="mx-auto w-full max-w-lg overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <MessageCircle className="text-primary size-6" />
                  <div>
                    <CardTitle>Winglo Cleaning Services</CardTitle>
                    <CardDescription>Simulated assistant · Private local demonstration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="h-44 sm:h-96">
                  <MessageScrollerProvider autoScroll>
                    <MessageScroller>
                      <MessageScrollerViewport>
                        <MessageScrollerContent>
                          {messages.map(([key, text, isCustomer]) => (
                            <MessageScrollerItem
                              key={`${j.scenarioId}-${key}`}
                              messageId={key}
                              scrollAnchor={isCustomer}
                            >
                              <Message align={isCustomer ? "end" : "start"} className="winglo-message">
                                <MessageContent>
                                  <MessageHeader>{isCustomer ? "Customer" : "Winglo assistant"}</MessageHeader>
                                  <Bubble
                                    align={isCustomer ? "end" : "start"}
                                    variant={isCustomer ? "default" : "muted"}
                                  >
                                    <BubbleContent>{text}</BubbleContent>
                                  </Bubble>
                                  <MessageFooter>
                                    {isCustomer ? (
                                      <>
                                        <CheckCheck className="size-3" />
                                        Simulated response
                                      </>
                                    ) : (
                                      "Automatic simulated reply"
                                    )}
                                  </MessageFooter>
                                </MessageContent>
                              </Message>
                            </MessageScrollerItem>
                          ))}
                        </MessageScrollerContent>
                      </MessageScrollerViewport>
                      <MessageScrollerButton />
                    </MessageScroller>
                  </MessageScrollerProvider>
                </div>
                <Progress value={complete ? 100 : (cursor / questions.length) * 100} />
                <p className="text-muted-foreground text-xs">
                  {Math.min(cursor + 1, questions.length)} of {questions.length} questions ·{" "}
                  {enquiry ? "Enquiry saved" : "No records created until you confirm"}
                </p>
                {!enquiry && current && (
                  <form
                    id="demo-answer"
                    className="flex scroll-mt-16 flex-col gap-3 border-t pt-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!answerValid(current, answerFor(draft, current.key))) {
                        setError(
                          current.key === "phone"
                            ? "Enter a contact number with at least 10 digits."
                            : "Please provide a valid answer before continuing.",
                        );
                        return;
                      }
                      setError("");
                      store.patchDraft({ cursor: cursor + 1 });
                      if (cursor + 1 === questions.length) {
                        setView("business");
                        document.getElementById("demo-views")?.scrollIntoView({ block: "start" });
                      }
                      if (j.step === 0) store.patchJourney({ step: 1 });
                    }}
                  >
                    {current.key === "serviceId" || current.options ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium" id="conversation-options">
                          {current.key === "serviceId" ? "Choose your cleaning service" : current.label}
                        </p>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          aria-labelledby="conversation-options"
                          value={answerFor(draft, current.key)}
                          onValueChange={(value) => {
                            if (value) setAnswer(current, value);
                          }}
                          className="flex flex-wrap gap-2"
                        >
                          {(current.key === "serviceId"
                            ? d.settings.services.map((s) => ({ value: s.id, label: s.name }))
                            : (current.options ?? []).map((v) => ({ value: v, label: v }))
                          ).map((o) => (
                            <ToggleGroupItem
                              key={o.value}
                              value={o.value}
                              className="h-auto min-h-10 flex-auto rounded-lg px-3 py-2 text-left whitespace-normal"
                            >
                              {o.label}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                    ) : (
                      <TextField
                        label={current.label}
                        value={answerFor(draft, current.key)}
                        type={inputType(current)}
                        min={0}
                        required
                        onChange={(e) => setAnswer(current, e.target.value)}
                      />
                    )}
                    {error && (
                      <p role="alert" className="text-destructive text-xs">
                        {error}
                      </p>
                    )}
                    <Button type="submit">
                      Continue
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </form>
                )}
                {complete && !enquiry && (
                  <Button
                    className="min-h-11 lg:hidden"
                    onClick={() => {
                      store.patchJourney({ view: "business", step: 1 });
                      document.getElementById("demo-views")?.scrollIntoView({ block: "start" });
                    }}
                  >
                    Continue as Winglo — Review Enquiry
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
                {!enquiry && cursor > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      store.patchDraft({ cursor: cursor - 1 });
                      setError("");
                    }}
                  >
                    <ArrowLeft data-icon="inline-start" />
                    Previous answer
                  </Button>
                )}
                {!enquiry && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const sample = sampleDraft(j, d);
                      store.patchDraft({ ...sample, cursor: conversationQuestions(sample, d).length });
                      store.patchJourney({ view: "business", step: 1 });
                      document.getElementById("demo-views")?.scrollIntoView({ block: "start" });
                    }}
                  >
                    Use fictional example details
                  </Button>
                )}
                {enquiry && (
                  <p className="text-primary text-sm" role="status">
                    Enquiry {enquiry.id} is saved. Continue the guided journey on the business side.
                  </p>
                )}
                <Button variant="ghost" onClick={restart}>
                  <RotateCcw data-icon="inline-start" />
                  Restart conversation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent
            value="business"
            forceMount
            className="data-[state=inactive]:hidden lg:data-[state=inactive]:block"
          >
            <div className="flex flex-col gap-5">
              <Panel title="New Customer Enquiry" description="Captured live from the customer conversation">
                {!enquiry && complete && (
                  <div className="mb-5 flex flex-col gap-3">
                    <p className="text-primary text-sm">
                      Your customer’s details are ready. Save them to continue as Winglo.
                    </p>
                    <Button className="min-h-11 w-full" onClick={createEnquiry}>
                      Create Enquiry & Continue
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </div>
                )}
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Customer", draft.name || "Waiting for customer name"],
                    ["Contact", draft.phone || "Waiting for contact number"],
                    ["Service", service || "Choose a service"],
                    ...Object.entries(draft.answers).map(([key, value]) => [
                      questions.find((q) => q.key === key)?.label ?? key,
                      value,
                    ]),
                    ["Location", draft.location || "Not provided yet"],
                    ["Preferred date", draft.preferredDate],
                    ["Status", enquiry?.status ?? (complete ? "Ready for quotation" : "Collecting Details")],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex flex-col gap-3">
                  {complete && !enquiry && (
                    <p className="text-primary text-sm" role="status">
                      Customer details complete — Ready for quotation
                    </p>
                  )}
                  {!complete && !enquiry && (
                    <Button variant="outline" className="lg:hidden" onClick={() => setView("customer")}>
                      Back to Customer Questions
                    </Button>
                  )}
                  {enquiry && (
                    <>
                      <p className="text-muted-foreground text-xs">
                        Saved enquiry ID: {enquiry.id} · Customer: {customer?.name}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => openRecord("enquiry", enquiry.id, "/dashboard/enquiries")}
                      >
                        View saved enquiry
                      </Button>
                      <Button onClick={() => openRecord("quote", quote?.id ?? enquiry.id, "/dashboard/quotations")}>
                        {quote ? "Review linked quotation" : "Generate linked quotation"}
                      </Button>
                    </>
                  )}
                </div>
              </Panel>
              {booking && (
                <Panel title="Your linked cleaning appointment" description={`${booking.id} · ${booking.status}`}>
                  <p className="text-sm">
                    {customer?.name} · {booking.start.replace("T", " at ")}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {d.settings.staff.find((s) => s.id === booking.staffId)?.name ?? "Unassigned"} · {booking.duration}{" "}
                    hours
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => openRecord("booking", booking.id, "/dashboard/bookings")}
                  >
                    Open booking & calendar
                  </Button>
                </Panel>
              )}
              {booking && j.step >= 6 && (
                <Panel
                  title="Customer follow-up"
                  description="In a future integrated system this could be delivered automatically."
                >
                  <AutomationPreview customer={booking.customerId} bookingId={booking.id} />
                </Panel>
              )}
              <DemoActivity />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
function inputType(q: Question) {
  if (["preferredDate", "moveDate"].includes(q.key)) return "date";
  if (q.key === "phone") return "tel";
  return q.numeric ? "number" : "text";
}
