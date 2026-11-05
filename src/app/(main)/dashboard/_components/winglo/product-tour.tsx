"use client";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useDemo } from "./store";

const steps = [
  {
    title: "Your business at a glance",
    route: "default",
    target: "#winglo-overview > div > div:first-child",
    text: "New enquiries arrive in the Inbox. Prepare a quote to start a job, then schedule and complete the cleaning. Revenue counts completed jobs only.",
  },
  {
    title: "Daily operations",
    route: "default",
    target: "#winglo-overview > div > div:nth-child(2)",
    text: "Find today’s schedule and the jobs needing attention. Use the next valid action to move work forward.",
  },
  {
    title: "Try the Interactive Demo",
    route: "default",
    target: "[data-product-demo]",
    text: "The live demo lets you perform the actual cleaning-business workflow. Try it now, or continue exploring.",
  },
  {
    title: "Live interaction",
    route: "demo",
    target: "#demo-answer",
    text: "Simulate a WhatsApp enquiry using the customer questions. Send it to the Inbox, then choose Prepare Quote to carry it into Jobs. No real WhatsApp messages are received or sent.",
  },
  {
    title: "Enquiries / Inbox: respond to requests",
    route: "enquiries",
    target: "#inbox-handoff",
    text: "Review incoming requests and collect missing details. Prepare Quote creates a linked draft in Jobs automatically. All enquiries keeps handled conversations available.",
  },
  {
    title: "Jobs: manage the cleaning work",
    route: "jobs",
    target: '[aria-label="Customer jobs"] .winglo-record-card',
    text: "Manage quotes, customer acceptance, bookings and completion here. Open any job to continue. One customer can have several jobs; unquoted requests stay in the Inbox.",
  },
  {
    title: "Quotations and scheduling",
    route: "quotations",
    target: '[data-motion-page] [data-slot="card"]',
    text: "Open a job to review and send its quote. Simulate customer acceptance in Demo controls, then schedule the cleaning.",
  },
  {
    title: "Your cleaning calendar",
    route: "bookings",
    target: '[data-motion-page] [data-slot="card"]',
    text: "See scheduled work, assign cleaners and use the next available booking action.",
  },
  {
    title: "Customer history",
    route: "customers",
    target: '[data-motion-page] [data-slot="card"]',
    text: "Customer profiles connect previous quotations, bookings and completed cleans.",
  },
  {
    title: "Business performance",
    route: "default",
    target: "[data-motion-page] .recharts-wrapper",
    text: "Revenue and service charts derive from the same saved records, rather than independent counters.",
  },
  {
    title: "You’re ready to explore",
    route: "default",
    target: "",
    text: "Keep exploring, restart this tour or resume your interactive demo. Your business records are preserved.",
  },
];
type Tour = { version?: number; step: number; open: boolean; participating: boolean; seen?: boolean };
const initial: Tour = { version: 2, step: 0, open: false, participating: false };
export function ProductTour() {
  const [tour, setTour] = useState<Tour>(initial);
  const [loaded, setLoaded] = useState(false);
  const [found, setFound] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const active = useDemo((s) => s.journey?.active);
  const enquiry = useDemo((s) => s.data?.enquiries.find((e) => e.id === s.journey?.enquiryId));
  const quote = useDemo((s) => s.data?.quotes.find((q) => q.id === s.journey?.quoteId));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("winglo-product-tour") || "null");
      if (saved && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < steps.length)
        setTour({
          ...initial,
          ...saved,
          version: 2,
          step: saved.version === 2 ? saved.step : ([0, 1, 2, 3, 6, 7, 8, 9, 10][saved.step] ?? 0),
        });
    } catch {
      /* A missing or unreadable tour preference leaves the tour optional. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem("winglo-product-tour", JSON.stringify(tour));
      } catch {
        /* The tour also works without browser persistence. */
      }
    }
  }, [tour, loaded]);
  const step = steps[tour.step];
  useEffect(() => {
    if (!tour.open || !pathname.startsWith("/dashboard")) return;
    let marked: Element | null = null;
    const find = () => {
      if (marked?.isConnected) return;
      marked =
        Array.from(
          document.querySelectorAll(
            (tour.participating ? '#demo-answer, [data-tour-record="true"], #demo-views' : step.target) ||
              "[data-no-target]",
          ),
        ).find((e) => e.getBoundingClientRect().width > 0) ?? null;
      setFound(!!marked || !step.target);
      if (marked) {
        marked.setAttribute("data-product-spotlight", "true");
        marked.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }
    };
    const timer = setTimeout(find, 500);
    const retry = setInterval(find, 700);
    const stop = setTimeout(() => clearInterval(retry), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(retry);
      clearTimeout(stop);
      marked?.removeAttribute("data-product-spotlight");
    };
  }, [tour.open, tour.participating, pathname, step]);
  function go(index: number) {
    if (useDemo.getState().journey?.active) useDemo.getState().patchJourney({ minimized: true });
    setTour({ version: 2, step: index, open: true, participating: false, seen: true });
    router.push(`/dashboard/${steps[index].route}`);
  }
  useEffect(() => {
    const open = () => {
      if (useDemo.getState().journey?.active) useDemo.getState().patchJourney({ minimized: true });
      setTour((current) => ({ ...current, open: true, seen: true, participating: false }));
      router.push(`/dashboard/${steps[tour.step].route}`);
    };
    window.addEventListener("winglo:open-product-tour", open);
    return () => window.removeEventListener("winglo:open-product-tour", open);
  }, [router, tour.step]);
  function live() {
    useDemo.getState().startJourney();
    if (tour.open) setTour({ ...tour, step: 3, participating: true });
    router.push("/dashboard/demo");
  }
  return (
    <>
      <div className="mx-4 flex justify-end py-1">
        <Button size="sm" variant="ghost" onClick={() => go(tour.step)}>
          Help · Product Tour
        </Button>
      </div>
      {tour.open && (
        <section data-product-tour aria-label="Product tour" className={cn("sticky top-12 z-40 mx-4 mb-4")}>
          <Card>
            <CardContent
              className="flex flex-col gap-3 pt-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") setTour({ ...tour, open: false });
              }}
            >
              <p className="text-primary text-xs">
                Product tour · {tour.step + 1} / {steps.length}
              </p>
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-muted-foreground text-sm">
                {tour.participating
                  ? "Simulate a WhatsApp request → Send Enquiry to Inbox → Prepare Quote → continue in Jobs. No real messages are sent. Your records stay saved when you continue the tour."
                  : step.text}
              </p>
              {tour.participating && enquiry && (
                <p role="status" className="text-primary text-sm">
                  {quote
                    ? `Quote ${quote.id} is prepared. This request is now in Jobs, with its customer and conversation linked.`
                    : `Enquiry ${enquiry.id} is in your Inbox. Choose Prepare Quote to carry it into Jobs.`}
                </p>
              )}
              <Progress value={((tour.step + 1) / steps.length) * 100} />
              {!found && !tour.participating && (
                <p role="status" className="text-muted-foreground text-xs">
                  This section is not visible yet. You can open its page or continue the tour.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {tour.step > 0 && (
                  <Button size="sm" variant="outline" onClick={() => go(tour.step - 1)}>
                    Back
                  </Button>
                )}
                {tour.step < steps.length - 1 ? (
                  <Button size="sm" onClick={() => go(tour.step === 2 ? 4 : tour.step + 1)}>
                    {tour.participating || tour.step === 2 ? "Continue the tour" : "Next"}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setTour({ ...tour, open: false })}>
                    Continue Exploring
                  </Button>
                )}
                {tour.step === 2 && (
                  <Button size="sm" onClick={live}>
                    Try it now
                  </Button>
                )}
                {active && tour.step === steps.length - 1 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      useDemo.getState().startJourney();
                      setTour({ ...tour, open: false });
                      router.push("/dashboard/demo");
                    }}
                  >
                    Resume Interactive Demo
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setTour({ ...tour, open: false })}>
                  Skip
                </Button>
                <Button size="sm" variant="ghost" onClick={() => go(0)}>
                  Restart Tour
                </Button>
                {!found && (
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/${step.route}`)}>
                    Open this section
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}
