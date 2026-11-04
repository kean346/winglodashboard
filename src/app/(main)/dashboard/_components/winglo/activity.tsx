"use client";
import { Panel } from "./shared";
import { useDemo } from "./store";
import { ActivityTimeline } from "./workflow";
export function DemoActivity() {
  const activity = useDemo((s) => s.activity);
  return (
    <Panel title="Demo Activity" description="Actions actually performed in this browser · No messages sent">
      <div className="max-h-72 overflow-y-auto">
        <ActivityTimeline events={activity.slice(0, 15)} showCustomer />
      </div>
    </Panel>
  );
}
