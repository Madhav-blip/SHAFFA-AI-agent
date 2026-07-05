import type { Automation, AutomationAction, AutomationRule } from "@/lib/types";
import { uid } from "@/lib/data/seed";

/**
 * Natural-language automation parser: "every day at 9pm remind me to do DSA",
 * "every 2 hours tell me to drink water", "at 7:30 give me my morning
 * briefing", "alert me when a deadline is close".
 */

const SCHEDULE_RE =
  /\b(every\s+\d+\s*(?:minutes?|mins?|hours?|hrs?))|(every\s+(?:day|morning|night|evening))|(daily)|(?:\b(?:at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;

function stripSchedule(text: string): string {
  return text
    .replace(SCHEDULE_RE, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
    .trim();
}

export function parseAutomation(text: string): Omit<Automation, "id"> & { id: string } {
  const lower = text.toLowerCase();

  /* ---- rule ---- */
  let rule: AutomationRule | null = null;

  const interval = lower.match(/every\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)/);
  if (interval) {
    rule = { kind: "interval", minutes: parseInt(interval[1], 10) * (/hour|hr/.test(interval[2]) ? 60 : 1) };
  }

  if (!rule && /(deadline|due)/.test(lower) && /(alert|warn|remind|watch)/.test(lower)) {
    const hours = lower.match(/(\d+)\s*hours?/);
    rule = { kind: "deadline", withinHours: hours ? parseInt(hours[1], 10) : 24 };
  }

  if (!rule) {
    let time: string | null = null;
    const at = lower.match(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (at) {
      let h = parseInt(at[1], 10);
      if (at[3] === "pm" && h < 12) h += 12;
      if (at[3] === "am" && h === 12) h = 0;
      time = `${String(h).padStart(2, "0")}:${at[2] ?? "00"}`;
    } else if (/morning/.test(lower)) time = "07:30";
    else if (/noon|lunch/.test(lower)) time = "12:30";
    else if (/evening/.test(lower)) time = "18:00";
    else if (/night/.test(lower)) time = "21:00";
    rule = { kind: "daily", time: time ?? "09:00" };
  }

  /* ---- action ---- */
  let action: AutomationAction;
  const focus = lower.match(/start (?:a )?focus(?: session)?(?: for)?\s*(\d+)?/);
  const remind = text.match(/(?:remind|tell|nudge) me (?:to |about |that )?(.+)/i);
  if (focus) {
    action = { kind: "focus", payload: focus[1] ?? "50" };
  } else if (remind) {
    action = { kind: "remind", payload: stripSchedule(remind[1]) };
  } else {
    action = { kind: "command", payload: stripSchedule(text) || text.trim() };
  }

  const schedule =
    rule.kind === "daily"
      ? `Daily · ${rule.time}`
      : rule.kind === "interval"
        ? rule.minutes % 60 === 0
          ? `Every ${rule.minutes / 60}h`
          : `Every ${rule.minutes}m`
        : `Deadline < ${rule.withinHours}h`;

  const label = action.kind === "focus" ? `Focus ${action.payload} min` : action.payload;
  const name = label.length > 38 ? `${label.slice(0, 38)}…` : label || "New automation";

  return {
    id: uid(),
    name: name[0].toUpperCase() + name.slice(1),
    icon: action.kind === "remind" ? "siren" : action.kind === "focus" ? "shield" : "zap",
    trigger: text.trim(),
    schedule,
    enabled: true,
    lastRun: new Date().toISOString(),
    successRate: 1,
    history: [],
    rule,
    action,
    // interval automations start their clock at creation, not at epoch
    lastFiredAt: rule.kind === "interval" ? Date.now() : undefined,
  };
}
