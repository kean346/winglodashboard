"use client";
import { CalendarDays, ClipboardList, FileText, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type Booking, type Enquiry, localDate, money, type Quote, total } from "./model";
import { OperationsOverview } from "./operations-overview";
import { Panel, Status } from "./shared";
import { useDemoData } from "./store";
export function Overview({
  onEnquiry,
  onQuote,
  onBooking,
}: {
  onEnquiry: (e?: Enquiry) => void;
  onQuote: (q?: Quote) => void;
  onBooking: (b?: Booking) => void;
}) {
  const d = useDemoData();
  const today = localDate();
  const month = today.slice(0, 7);
  const kpis = [
    {
      label: "Total Enquiries",
      value: d.enquiries.length,
      icon: ClipboardList,
      caption: "All enquiries · Every workflow status",
    },
    {
      label: "Quotations Awaiting Approval",
      value: d.quotes.filter((q) => q.status === "Awaiting Approval").length,
      icon: FileText,
      caption: "Review your proposed estimates",
    },
    {
      label: "Confirmed Bookings",
      value: d.bookings.filter((b) => b.status === "Confirmed").length,
      icon: CalendarDays,
      caption: "Cleaning jobs on the calendar",
    },
    {
      label: "Completed-job Revenue This Month",
      value: money(
        d.bookings
          .filter((b) => b.status === "Completed" && b.start.startsWith(month))
          .reduce((s, b) => s + b.amount, 0),
      ),
      icon: TrendingUp,
      caption: "Completed demo jobs · ZAR",
    },
  ];
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 5 + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      name: date.toLocaleDateString("en-ZA", { month: "short" }),
      revenue: d.bookings
        .filter((b) => b.start.startsWith(key) && b.status === "Completed")
        .reduce((s, b) => s + b.amount, 0),
    };
  });
  const trend = Array.from({ length: 7 }, (_, i) => {
    const day = localDate(i - 6);
    return {
      name: new Date(`${day}T12:00`).toLocaleDateString("en-ZA", { weekday: "short" }),
      Enquiries: d.enquiries.filter((e) => e.date.startsWith(day)).length,
      Bookings: d.bookings.filter((b) => b.start.startsWith(day) && b.status !== "Cancelled").length,
    };
  });
  const upcoming = d.bookings
    .filter((b) => b.start.slice(0, 10) >= today && !["Cancelled", "Completed"].includes(b.status))
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardDescription>{k.label}</CardDescription>
                <k.icon className="text-primary size-4" />
              </div>
              <CardTitle className="text-2xl tracking-tight tabular-nums sm:text-3xl">{k.value}</CardTitle>
              <CardDescription>{k.caption}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <OperationsOverview onBooking={onBooking} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="A cleaner outlook."
          description="Monthly revenue from completed demo appointments."
          className="lg:col-span-2"
        >
          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="winglo-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis width={60} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 8 }}
                  formatter={(v) => money(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  fill="url(#winglo-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Popular services" description="Based on your enquiry records">
          {d.settings.services.map((s) => {
            const count = d.enquiries.filter((e) => e.serviceId === s.id).length;
            return (
              <div key={s.id} className="flex flex-col gap-2 py-2">
                <div className="flex justify-between gap-2 text-xs">
                  <span>{s.name}</span>
                  <span>{count}</span>
                </div>
                <div className="bg-muted h-1.5 rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(count / Math.max(1, d.enquiries.length)) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Enquiries & bookings" description="Your last seven days">
          <div className="h-52 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={25} />
                <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)" }} />
                <Legend />
                <Bar dataKey="Enquiries" fill="var(--primary)" radius={3} />
                <Bar dataKey="Bookings" fill="var(--chart-2)" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Today’s schedule"
          description={`${today} · ${upcoming.filter((b) => b.start.startsWith(today)).length} appointments`}
        >
          {upcoming
            .filter((b) => b.start.startsWith(today))
            .map((b) => (
              <button
                type="button"
                key={b.id}
                className="hover:bg-accent flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left"
                onClick={() => onBooking(b)}
              >
                <span className="text-sm">
                  {b.start.slice(11)} · {d.customers.find((c) => c.id === b.customerId)?.name}
                  <span className="text-muted-foreground block text-xs">
                    {d.settings.staff.find((s) => s.id === b.staffId)?.name ?? "Unassigned"} · {b.duration} hours
                  </span>
                </span>
                <Status>{b.status}</Status>
              </button>
            ))}
          {!upcoming.some((b) => b.start.startsWith(today)) && (
            <p className="text-muted-foreground py-8 text-sm">A clear schedule today. Add your next cleaning job.</p>
          )}
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Recent enquiries" description="Turn a conversation into a clean space">
          {d.enquiries.slice(0, 4).map((e) => (
            <Button
              key={e.id}
              variant="ghost"
              className="h-auto w-full justify-between py-3"
              onClick={() => onEnquiry(e)}
            >
              <span className="truncate text-left">
                {d.customers.find((c) => c.id === e.customerId)?.name}
                <span className="text-muted-foreground block text-xs">
                  {d.settings.services.find((s) => s.id === e.serviceId)?.name}
                </span>
              </span>
              <Status>{e.status}</Status>
            </Button>
          ))}
        </Panel>
        <Panel title="Upcoming cleaning jobs" description="A little preparation goes a long way">
          {upcoming.slice(0, 4).map((b) => (
            <Button
              key={b.id}
              variant="ghost"
              className="h-auto w-full justify-between py-3"
              onClick={() => onBooking(b)}
            >
              <span>
                {d.customers.find((c) => c.id === b.customerId)?.name}
                <span className="text-muted-foreground block text-left text-xs">{b.start.replace("T", " · ")}</span>
              </span>
              <CalendarDays />
            </Button>
          ))}
        </Panel>
        <Panel title="Pending quotations" description="Sample estimates awaiting your review">
          {d.quotes
            .filter((q) => ["Draft", "Awaiting Approval", "Sent (Simulated)"].includes(q.status))
            .slice(0, 4)
            .map((q) => (
              <Button
                key={q.id}
                variant="ghost"
                className="h-auto w-full justify-between py-3"
                onClick={() => onQuote(q)}
              >
                <span>
                  {d.customers.find((c) => c.id === q.customerId)?.name}
                  <span className="text-muted-foreground block text-left text-xs">{q.status}</span>
                </span>
                <span>{money(total(q))}</span>
              </Button>
            ))}
        </Panel>
      </div>
    </div>
  );
}
