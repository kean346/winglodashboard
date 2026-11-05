"use client";
import { useState } from "react";

import Image from "next/image";

import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

import { CountField, countLabels } from "./count-field";
import { type Enquiry, localDate, type Question, sampleAnswer, serviceQuestions } from "./model";
import { Choice, TextField } from "./shared";
import { useDemo, useDemoData } from "./store";

export function EnquiryForm({
  initial,
  conversation = false,
  lockService = false,
  onDone,
}: {
  initial?: Enquiry;
  conversation?: boolean;
  lockService?: boolean;
  onDone: (id: string) => void;
}) {
  const data = useDemoData();
  const submit = useDemo((s) => s.submit);
  const customer = data.customers.find((c) => c.id === initial?.customerId);
  const [service, setService] = useState(initial?.serviceId ?? data.settings.services[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.answers ?? {});
  const [info, setInfo] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    location: customer?.location ?? "",
    date: initial?.preferredDate ?? localDate(1),
    notes: initial?.notes ?? "",
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const questions = (serviceQuestions[service] ?? []).map((q) =>
    q.key === "extras" ? { ...q, options: ["None", ...(data.settings.extraOptions ?? ["Oven", "Windows"])] } : q,
  );
  const common: Question[] = [
    { key: "location", label: "Which suburb or address?" },
    { key: "date", label: "Preferred cleaning date" },
    { key: "name", label: "Your full name" },
    { key: "phone", label: "Contact number" },
  ];
  const all: Question[] = [
    { key: "service", label: "Welcome to Winglo! Which cleaning service do you require?" },
    ...questions,
    ...common,
  ];
  const field = all[step];
  function valid() {
    if (
      !info.name.trim() ||
      info.phone.replace(/\D/g, "").length < 10 ||
      !info.location.trim() ||
      !info.date ||
      questions.some(
        (q) =>
          !answers[q.key]?.trim() ||
          (q.numeric && (!Number.isFinite(Number(answers[q.key])) || Number(answers[q.key]) < 0)),
      )
    ) {
      setError("Complete all required details and enter a contact number with at least 10 digits.");
      return false;
    }
    return true;
  }
  function save() {
    if (!valid()) return;
    onDone(
      submit(
        {
          name: info.name.trim(),
          phone: info.phone,
          email: info.email,
          location: info.location,
          notes: customer?.notes ?? "",
        },
        { serviceId: service, answers, preferredDate: info.date, notes: info.notes },
        initial?.id,
      ),
    );
  }
  function renderField(q: (typeof all)[number]) {
    if (q.key === "service" && lockService)
      return (
        <p className="text-sm">
          Cleaning service: {data.settings.services.find((s) => s.id === service)?.name} · Linked to quotation
        </p>
      );
    if (q.key === "service")
      return (
        <Choice
          label="Cleaning service"
          value={service}
          onChange={(v) => {
            setService(v);
            setAnswers({});
          }}
          options={data.settings.services}
        />
      );
    const isCommon = common.some((c) => c.key === q.key);
    const value = isCommon ? info[q.key as keyof typeof info] : (answers[q.key] ?? "");
    const update = (v: string) =>
      isCommon ? setInfo({ ...info, [q.key]: v }) : setAnswers({ ...answers, [q.key]: v });
    if ("options" in q && q.options)
      return (
        <Choice
          label={q.label}
          value={value}
          onChange={update}
          options={[{ id: "", name: "Choose an option" }, ...q.options]}
        />
      );
    if (countLabels[q.key]) return <CountField label={countLabels[q.key]} value={value} onChange={update} />;
    return (
      <TextField
        label={q.label}
        value={value}
        onChange={(e) => update(e.target.value)}
        required
        min={0}
        type={questionInputType(q)}
      />
    );
  }
  const sample = () => {
    setInfo({
      name: "Zanele Demo",
      phone: "+27 00 123 4567",
      email: "zanele@example.com",
      location: "Linden, Johannesburg",
      date: localDate(1),
      notes: "Fictional walkthrough enquiry.",
    });
    setAnswers(Object.fromEntries(questions.map((q) => [q.key, sampleAnswer(q, localDate(1))])));
  };
  let submitLabel = initial ? "Save enquiry" : "Submit enquiry";
  if (conversation && step < all.length - 1) submitLabel = "Next question";
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (conversation && step < all.length - 1) {
          let value = answers[field.key];
          if (common.some((c) => c.key === field.key)) value = info[field.key as keyof typeof info];
          if (field.key === "service") value = service;
          if (!value?.trim()) {
            setError("Please provide an answer before continuing.");
            return;
          }
          setError("");
          setStep(step + 1);
        } else save();
      }}
    >
      {conversation && (
        <>
          <p className="text-muted-foreground text-xs">Demo Conversation — No Real Messages Sent</p>
          <blockquote className="border-primary border-l-2 pl-4 text-sm">
            Hi, I’m looking for someone to deep clean my house.
          </blockquote>
          <Progress value={((step + 1) / all.length) * 100} />
          <p className="text-sm">
            Question {step + 1} of {all.length}
          </p>
        </>
      )}
      <FieldGroup>
        {conversation ? (
          <>
            {step > 0 && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                {all.slice(0, step).map((q) => (
                  <p key={q.key} className="py-1">
                    <span className="text-muted-foreground">{q.label} </span>
                    {q.key === "service"
                      ? data.settings.services.find((s) => s.id === service)?.name
                      : (answers[q.key] ?? info[q.key as keyof typeof info])}
                  </p>
                ))}
              </div>
            )}
            {renderField(field)}
          </>
        ) : (
          <>
            {renderField(all[0])}
            <div className="grid gap-4 sm:grid-cols-2">
              {questions.map((q) => (
                <div key={q.key}>{renderField(q)}</div>
              ))}
              {common.map((q) => (
                <div key={q.key}>{renderField(q)}</div>
              ))}
            </div>
            <TextField
              label="Email (optional)"
              type="email"
              value={info.email}
              onChange={(e) => setInfo({ ...info, email: e.target.value })}
            />
            <TextField
              label="Additional instructions (optional)"
              value={info.notes}
              onChange={(e) => setInfo({ ...info, notes: e.target.value })}
            />
            <TextField
              label="Optional photos · Up to 3 images, 5 MB each · Preview only"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 3);
                void Promise.all(
                  files.map(
                    (file) =>
                      new Promise<string>((resolve) => {
                        if (file.size > 5_000_000) {
                          resolve("");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => resolve("");
                        reader.readAsDataURL(file);
                      }),
                  ),
                )
                  .then(setPhotos)
                  .catch(() => setError("Unable to preview this photo. Please try another image."));
              }}
            />
            <div className="flex gap-2">
              {photos.filter(Boolean).map((src, i) => (
                <Image
                  unoptimized
                  width={80}
                  height={80}
                  key={src.slice(-50)}
                  src={src}
                  alt={`Attachment preview ${i + 1}`}
                  className="size-20 rounded-lg object-cover"
                />
              ))}
            </div>
          </>
        )}
      </FieldGroup>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          {submitLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
        {conversation && step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button type="button" variant="outline" onClick={sample}>
          <Sparkles data-icon="inline-start" />
          Use fictional details
        </Button>
        {conversation && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep(0);
              setAnswers({});
              setInfo({ name: "", phone: "", email: "", location: "", date: localDate(1), notes: "" });
              setError("");
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restart Conversation
          </Button>
        )}
      </div>
    </form>
  );
}

function questionInputType(q: Question) {
  if (["date", "moveDate"].includes(q.key)) return "date";
  if (q.key === "phone") return "tel";
  return q.numeric ? "number" : "text";
}
