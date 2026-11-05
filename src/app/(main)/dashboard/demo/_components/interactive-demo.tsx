"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { jobUrl } from "../../_components/winglo/job-model";
import {
  answerFor,
  answerValid,
  conversationQuestions,
  draftComplete,
  sampleDraft,
} from "../../_components/winglo/journey";
import { Panel, TextField } from "../../_components/winglo/shared";
import { hydrateDemo, useDemo } from "../../_components/winglo/store";

export function InteractiveDemo() {
  const { data, journey: j, ready } = useDemo();
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    void hydrateDemo();
  }, []);
  if (!ready || !data) return <Skeleton className="h-80" />;
  const store = useDemo.getState();
  if (!j)
    return (
      <Panel
        title="Try a sample cleaning job"
        description="See a customer request become a quotation, booking and completed clean."
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Use fictional details. All actions stay in this browser; no real messages are sent.
          </p>
          <Button className="min-h-12 self-start" onClick={() => store.startJourney()}>
            Start Sample Job
          </Button>
        </div>
      </Panel>
    );
  const draft = j.draft;
  const questions = conversationQuestions(draft, data);
  const cursor = Math.min(draft.cursor, questions.length);
  const current = questions[cursor];
  const complete = draftComplete(j, data);
  let inputType = "text";
  if (current?.key === "phone") inputType = "tel";
  if (current?.numeric) inputType = "number";
  if (current && ["preferredDate", "moveDate"].includes(current.key)) inputType = "date";
  const enquiry = data.enquiries.find((e) => e.id === j.enquiryId);
  const text = (key: string) =>
    key === "serviceId"
      ? (data.settings.services.find((s) => s.id === draft.serviceId)?.name ?? "")
      : answerFor(draft, key);
  function respond(value: string) {
    if (!current) return;
    if (current.key === "serviceId") store.patchDraft({ serviceId: value, answers: {}, cursor: 0 });
    else if (["name", "phone", "location", "preferredDate"].includes(current.key))
      store.patchDraft({ [current.key]: value });
    else store.patchDraft({ answers: { ...draft.answers, [current.key]: value } });
  }
  function submit() {
    try {
      const id = store.createJourneyEnquiry();
      router.push(jobUrl(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete all required details.");
    }
  }
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 pb-8">
      <header>
        <p className="text-primary text-xs tracking-widest uppercase">Winglo · Sample customer request</p>
        <h1 className="mt-2 text-3xl tracking-tight">Tell us about your clean.</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Answer as the customer. When you submit, the same job opens for Winglo to prepare a quotation.
        </p>
      </header>
      <p className="text-muted-foreground text-xs">Demo conversation · No real messages sent</p>
      {enquiry && (
        <Panel title="This request is already saved" description={`${enquiry.id} · Continue where you left off.`}>
          <Button onClick={() => router.push(jobUrl(enquiry.id))}>Resume Customer Job</Button>
        </Panel>
      )}
      <Panel
        title={enquiry ? "Saved conversation" : "Customer conversation"}
        description="One request, connected to one customer job."
      >
        <div className="flex flex-col gap-4">
          <Message align="end">
            <MessageContent>
              <MessageHeader>Customer</MessageHeader>
              <Bubble align="end">
                <BubbleContent>Hi, I need someone to deep clean my house.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <details>
            <summary className="cursor-pointer text-sm">
              {enquiry ? "View collected answers" : "Review previous answers"}
            </summary>
            <dl className="mt-4 grid gap-3 text-sm">
              {questions
                .filter((q) => answerFor(draft, q.key))
                .map((q) => (
                  <div key={q.key}>
                    <dt className="text-muted-foreground text-xs">{q.label}</dt>
                    <dd>{text(q.key)}</dd>
                  </div>
                ))}
            </dl>
          </details>
          {!enquiry && (
            <>
              <Progress value={complete ? 100 : (cursor / questions.length) * 100} />
              <p className="text-muted-foreground text-xs">
                Question {Math.min(cursor + 1, questions.length)} of {questions.length}
              </p>
              {current && (
                <form
                  id="demo-answer"
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!answerValid(current, answerFor(draft, current.key))) {
                      setError("Please provide a valid answer. Contact numbers need at least 10 digits.");
                      return;
                    }
                    setError("");
                    store.patchDraft({ cursor: cursor + 1 });
                    store.patchJourney({ step: 1 });
                  }}
                >
                  <Message>
                    <MessageContent>
                      <MessageHeader>Winglo assistant</MessageHeader>
                      <Bubble variant="muted">
                        <BubbleContent>{current.label}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                  <FieldGroup>
                    {current.key === "serviceId" || current.options ? (
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        aria-label={current.label}
                        value={answerFor(draft, current.key)}
                        onValueChange={(v) => {
                          if (v) respond(v);
                        }}
                        className="flex flex-wrap gap-2"
                      >
                        {(current.key === "serviceId"
                          ? data.settings.services.map((s) => ({ id: s.id, label: s.name }))
                          : (current.options ?? []).map((v) => ({ id: v, label: v }))
                        ).map((o) => (
                          <ToggleGroupItem
                            key={o.id}
                            value={o.id}
                            className="h-auto min-h-11 flex-auto rounded-lg px-3 py-2 whitespace-normal"
                          >
                            {o.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    ) : (
                      <TextField
                        label={current.label}
                        type={inputType}
                        min={0}
                        required
                        value={answerFor(draft, current.key)}
                        onChange={(e) => respond(e.target.value)}
                      />
                    )}
                  </FieldGroup>
                  <Button className="min-h-12" type="submit">
                    Continue
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </form>
              )}
              {complete && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <p className="text-primary text-sm">
                    Customer details complete. Next, Winglo prepares the quotation.
                  </p>
                  <Button className="min-h-12" onClick={submit}>
                    Submit Request & Open Job
                  </Button>
                </div>
              )}
              {cursor > 0 && (
                <Button variant="outline" onClick={() => store.patchDraft({ cursor: cursor - 1 })}>
                  <ArrowLeft data-icon="inline-start" />
                  Previous answer
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  const sample = sampleDraft(j, data);
                  store.patchDraft({ ...sample, cursor: conversationQuestions(sample, data).length });
                  store.patchJourney({ step: 1 });
                }}
              >
                Use Sample Details
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
      </Panel>
      <Button variant="outline" className="self-start" onClick={() => store.startJourney(true)}>
        Start Another Sample Job
      </Button>
      <p className="text-muted-foreground text-xs">Starting another sample keeps all previously saved customer jobs.</p>
    </main>
  );
}
