"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { jobNextAction, jobUrl, listJobs } from "../../_components/winglo/job-model";
import { bookingStatuses, enquiryStatuses, money, quoteStatuses, total } from "../../_components/winglo/model";
import { RecordCard } from "../../_components/winglo/record-card";
import { Choice, EmptyRecords, Status, TextField } from "../../_components/winglo/shared";
import { hydrateDemo, useDemo } from "../../_components/winglo/store";

const stages = ["Request", "Quote", "Booking", "Complete"];
export function JobsDirectory() {
  const { data, ready, journey, storageError } = useDemo();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All stages");
  const [status, setStatus] = useState("All statuses");
  const router = useRouter();
  useEffect(() => {
    void hydrateDemo();
  }, []);
  if (!ready || !data) return <Skeleton className="h-80" />;
  const jobs = listJobs(data);
  const statusOf = (job: (typeof jobs)[number]) =>
    job.booking?.status ?? job.quote?.status ?? job.enquiry?.status ?? "Unknown";
  const visible = jobs.filter((job) => {
    const text = [
      job.customer?.name,
      job.service?.name,
      job.customer?.location,
      job.enquiry?.id,
      job.quote?.id,
      job.booking?.id,
    ].join(" ");
    return (
      text.toLowerCase().includes(query.toLowerCase()) &&
      (stage === "All stages" || stages[job.stage] === stage) &&
      (status === "All statuses" || statusOf(job) === status)
    );
  });
  return (
    <main className="flex flex-col gap-6" aria-label="Jobs workspace">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs tracking-widest uppercase">Winglo workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Every customer job, from first request to finished clean.
          </p>
        </div>
        <Button
          className="min-h-11"
          onClick={() => {
            useDemo.getState().startJourney();
            router.push("/dashboard/demo");
          }}
        >
          <Sparkles data-icon="inline-start" />
          Try a Sample Job
        </Button>
      </header>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {stages.map((label, i) => (
          <div key={label} className="bg-card rounded-xl border p-3 sm:p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{jobs.filter((j) => j.stage === i).length}</p>
          </div>
        ))}
      </div>
      {storageError && <p role="alert">Browser storage is unavailable; changes may not survive refresh.</p>}
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3 [&_input]:min-h-11 [&_select]:min-h-11">
        <div className="col-span-2 w-full md:col-span-1">
          <TextField
            label="Search jobs"
            placeholder="Customer, service or record ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Choice label="Job stage" value={stage} onChange={setStage} options={["All stages", ...stages]} />
        <Choice
          label="Job status"
          value={status}
          onChange={setStatus}
          options={[
            "All statuses",
            ...Array.from(new Set([...bookingStatuses, ...enquiryStatuses, ...quoteStatuses])).sort(),
          ]}
        />
      </div>
      <p className="text-muted-foreground text-xs" role="status">
        {visible.length} of {jobs.length} jobs · Saved in this browser only
      </p>
      {!visible.length && <EmptyRecords />}
      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Customer jobs">
        {visible.map((job) => {
          const b = job.booking,
            q = job.quote,
            e = job.enquiry;
          const highlighted =
            !!journey?.active &&
            [journey.bookingId, journey.quoteId, journey.enquiryId].some(
              (id) => !!id && [b?.id, q?.id, e?.id].includes(id),
            );
          return (
            <RecordCard
              key={job.ref}
              id={`job-${job.ref}`}
              name={job.customer?.name ?? "Customer unavailable"}
              description={job.service?.name ?? "Service unavailable"}
              status={
                <>
                  <Badge variant="outline">{stages[job.stage]}</Badge>
                  <Status>{statusOf(job)}</Status>
                </>
              }
              highlighted={highlighted}
              reference={job.ref}
              actions={
                <Button asChild>
                  <Link href={jobUrl(job.ref)}>
                    Open Job
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              }
            >
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="size-3.5 shrink-0" />
                {job.customer?.location ?? "No location saved"}
              </p>
              {(b || e) && (
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {b ? b.start.replace("T", " · ") : `Preferred · ${e?.preferredDate}`}
                </p>
              )}
              {(b || q) && (
                <div>
                  <p className="text-muted-foreground text-xs">{b ? "Saved job value" : "Sample quote estimate"}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{money(b?.amount ?? (q ? total(q) : 0))}</p>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Next · <span className="text-foreground">{jobNextAction(job)}</span>
              </p>
            </RecordCard>
          );
        })}
      </section>
    </main>
  );
}
