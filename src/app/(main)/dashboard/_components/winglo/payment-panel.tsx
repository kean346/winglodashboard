"use client";
import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

import { money, paymentSummary, type Quote } from "./model";
import { Panel, Status, TextField } from "./shared";
import { useDemo } from "./store";

export function PaymentPanel({ quote }: { quote: Quote }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(quote.payment?.amountReceived ?? 0));
  const [due, setDue] = useState(quote.payment?.dueDate ?? "");
  const payment = paymentSummary(quote);
  const accepted = quote.status === "Accepted (Simulated)";
  return (
    <Panel
      id={`payment-${quote.id}`}
      title="Payment"
      description="Separate from quote acceptance and cleaning progress · Manual demo records only"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Status>{payment.status}</Status>
          {quote.payment?.dueDate && (
            <span className="text-muted-foreground text-xs">Due · {quote.payment.dueDate}</span>
          )}
        </div>
        {quote.payment && (
          <Progress
            aria-label="Recorded payment progress"
            value={payment.amount ? Math.min(100, (payment.received / payment.amount) * 100) : 100}
          />
        )}
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {[
            ["Quote total", payment.amount],
            ["Received", payment.received],
            ["Outstanding", payment.balance],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 font-medium">{money(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-sm">
          {payment.status === "Paid" || payment.status === "No payment due"
            ? "The balance is settled in this manual demo record. Cleaning progress is tracked separately; no bank payment was processed."
            : "Acceptance does not mean payment. This status stays saved until you update it. You can schedule cleaning while payment is pending."}
        </p>
        {!quote.payment && accepted && (
          <p className="text-muted-foreground text-xs">
            No payment history was recorded for this existing quote. Nothing has been assumed paid.
          </p>
        )}
        {accepted && !editing && (
          <Button
            variant="outline"
            className="min-h-11 self-start"
            onClick={() => {
              setAmount(String(quote.payment?.amountReceived ?? 0));
              setDue(quote.payment?.dueDate ?? "");
              setEditing(true);
            }}
          >
            Record / Update Payment
          </Button>
        )}
        {editing && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                useDemo.getState().recordPayment(quote.id, Number(amount), due);
                setEditing(false);
                toast.success("Payment record saved in this browser. No payment was processed.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to record payment.");
              }
            }}
          >
            <FieldGroup>
              <TextField
                className="min-h-11"
                label="Total received to date (R)"
                type="number"
                inputMode="decimal"
                min={0}
                max={payment.amount}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <TextField
                className="min-h-11"
                label="Payment due date (optional)"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </FieldGroup>
            <p className="text-muted-foreground text-xs">
              Enter the cumulative amount received, including any deposit. Use 0 to record Awaiting payment. This does
              not charge the customer or verify a bank transfer.
            </p>
            <div className="flex flex-wrap gap-2 [&_button]:min-h-11">
              <Button type="submit">Save Payment Record</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}
