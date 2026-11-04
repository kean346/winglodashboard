"use client";
import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
export function Panel({
  title,
  description,
  children,
  className,
  id,
  highlighted = false,
  highlightLabel = "Your demo record",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  highlighted?: boolean;
  highlightLabel?: string;
}) {
  return (
    <Card
      id={id}
      data-tour-record={highlighted ? "true" : undefined}
      className={cn(
        className,
        highlighted && "border-primary bg-primary/5 ring-primary/30 scroll-mt-16 scroll-mb-48 ring-2",
      )}
    >
      <CardHeader>
        {highlighted && <Badge className="self-start">{highlightLabel}</Badge>}
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function TextField({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) {
  const key = useId();
  return (
    <Field>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} {...props} />
    </Field>
  );
}
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { id: string; name: string })[];
}) {
  const key = useId();
  return (
    <Field>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <NativeSelect id={key} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) =>
          typeof o === "string" ? (
            <NativeSelectOption key={o}>{o}</NativeSelectOption>
          ) : (
            <NativeSelectOption key={o.id} value={o.id}>
              {o.name}
            </NativeSelectOption>
          ),
        )}
      </NativeSelect>
    </Field>
  );
}
export function Status({ children }: { children: ReactNode }) {
  const completed = children === "Completed" || children === "Accepted (Simulated)";
  const active = children === "In Progress" || children === "Confirmed";
  const cancelled = children === "Cancelled" || children === "Rejected" || children === "Expired";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5",
        completed && "bg-primary/10 text-primary",
        active && "border-primary/30 text-primary",
        cancelled && "bg-destructive/10 text-destructive",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}
export function Modal({
  title,
  children,
  onClose,
  description = "Demo data · Changes are saved in this browser only.",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  description?: string;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function EmptyRecords() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No matching records</EmptyTitle>
        <EmptyDescription>Create a record or adjust your filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
