"use client";
import { useId } from "react";

import { Minus, Plus } from "lucide-react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export const countLabels: Record<string, string> = {
  bedrooms: "Number of bedrooms",
  bathrooms: "Number of bathrooms",
  carpets: "Number of carpeted areas",
  furniture: "Number of furniture items",
  workspaces: "Number of workspaces",
};
export function CountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const valid = value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
  return (
    <Field className="winglo-count-field" data-invalid={(value !== "" && !valid) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldDescription id={`${id}-help`}>Enter a whole number, or use the − and + buttons.</FieldDescription>
      <InputGroup className="min-h-14">
        <InputGroupAddon>
          <InputGroupButton
            size="icon-sm"
            className="min-h-11 min-w-11"
            aria-label={`Decrease ${label.toLowerCase()}`}
            disabled={!valid || Number(value) === 0}
            onClick={() => onChange(String(Math.max(0, Number(value) - 1)))}
          >
            <Minus />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          aria-describedby={`${id}-help`}
          aria-invalid={(value !== "" && !valid) || undefined}
          className="min-h-12 text-center"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            className="min-h-11 min-w-11"
            aria-label={`Increase ${label.toLowerCase()}`}
            disabled={value !== "" && !valid}
            onClick={() => onChange(String((Number(value) || 0) + 1))}
          >
            <Plus />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
