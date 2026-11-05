"use client";
import { Progress } from "@/components/ui/progress";

import { enquiryProgress, resolveJob } from "./job-model";
import { type DemoData, paymentSummary } from "./model";
import { Status } from "./shared";
export function EnquiryProgress({ data, recordId }: { data: DemoData; recordId: string }) {
  const job = resolveJob(data, recordId),
    progress = enquiryProgress(job);
  const payment = job.quote ? paymentSummary(job.quote) : undefined;
  return (
    <section className="flex flex-col gap-2" aria-label="Enquiry progress">
      <div className="flex flex-wrap items-center gap-2">
        <Status>{progress.status}</Status>
        {payment && payment.status !== "Not requested" && <Status>{payment.status}</Status>}
      </div>
      <Progress value={Math.max(4, progress.step * 25)} aria-label={`Cleaning progress: ${progress.status}`} />
      <p className="text-muted-foreground text-xs">
        Next · <span className="text-foreground">{progress.next}</span>
      </p>
    </section>
  );
}
