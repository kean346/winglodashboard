"use client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function SupportCard() {
  return (
    <Card size="sm" className="group-data-[collapsible=icon]:hidden">
      <CardHeader>
        <CardTitle className="text-sm">Start here. Take a live tour.</CardTitle>
        <CardDescription>Discover Winglo’s features with a short guided walkthrough.</CardDescription>
        <Button className="mt-2 w-full" onClick={() => window.dispatchEvent(new Event("winglo:open-product-tour"))}>
          Take Live Tour
        </Button>
      </CardHeader>
    </Card>
  );
}
