"use client";
import type { ReactNode } from "react";

import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordCard({
  id,
  name,
  description,
  status,
  avatar,
  highlighted,
  children,
  actions,
  reference,
}: {
  id: string;
  name: string;
  description?: string;
  status?: ReactNode;
  avatar?: boolean;
  highlighted?: boolean;
  children: ReactNode;
  actions: ReactNode;
  reference?: string;
}) {
  return (
    <Card
      id={id}
      className={cn("winglo-record-card", highlighted && "winglo-record-highlight")}
      data-tour-record={highlighted ? "true" : undefined}
    >
      <CardHeader>
        {highlighted && (
          <Badge variant="outline" className="mb-1 w-fit">
            Your demo record
          </Badge>
        )}
        <div className="flex items-start gap-3">
          {avatar && (
            <Avatar size="lg">
              <AvatarFallback>
                {name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((v) => v[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle>{name}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
        {status && <div className="mt-2 flex flex-wrap gap-2">{status}</div>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">{children}</CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        {reference && <span className="text-muted-foreground text-xs">{reference}</span>}
        <div className="flex flex-wrap gap-2">{actions}</div>
      </CardFooter>
    </Card>
  );
}
