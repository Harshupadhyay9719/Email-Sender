import type { Campaign, Organization } from "@/types";

export const organizations: Organization[] = [
  { name: "ABC Logistics", industry: "Logistics", contacts: 18, validContacts: 15, status: "Ready", lastTouched: "2h ago" },
  { name: "Northstar Foods", industry: "Food Supply", contacts: 11, validContacts: 8, status: "Needs review", lastTouched: "Yesterday" },
  { name: "Kinetic Retail", industry: "Retail", contacts: 24, validContacts: 22, status: "Ready", lastTouched: "Jun 8" },
  { name: "Bluewave Components", industry: "Manufacturing", contacts: 7, validContacts: 4, status: "Processing", lastTouched: "Jun 7" },
  { name: "Orbit Clinics", industry: "Healthcare", contacts: 13, validContacts: 11, status: "Ready", lastTouched: "Jun 6" },
];

export const campaigns: Campaign[] = [
  { name: "June Vendor Outreach", status: "Sending", recipients: 1250, openRate: 42, clickRate: 11 },
  { name: "Procurement Follow-up", status: "Scheduled", recipients: 620, openRate: 0, clickRate: 0 },
  { name: "Regional Partner Intro", status: "Completed", recipients: 980, openRate: 49, clickRate: 14 },
  { name: "Inactive Account Winback", status: "Draft", recipients: 410, openRate: 0, clickRate: 0 },
];

export const activity = [
  { day: "Mon", sent: 280, opened: 105, failed: 12 },
  { day: "Tue", sent: 420, opened: 184, failed: 18 },
  { day: "Wed", sent: 360, opened: 158, failed: 9 },
  { day: "Thu", sent: 510, opened: 231, failed: 21 },
  { day: "Fri", sent: 470, opened: 216, failed: 14 },
  { day: "Sat", sent: 190, opened: 83, failed: 6 },
  { day: "Sun", sent: 250, opened: 112, failed: 8 },
];

export const reportRows = [
  { report: "Delivery health", scope: "All campaigns", owner: "Operations", updated: "Today", score: "96.4%" },
  { report: "Invalid contact audit", scope: "Organizations", owner: "Data team", updated: "Yesterday", score: "138 flagged" },
  { report: "Open-rate trend", scope: "Last 30 days", owner: "Growth", updated: "Jun 8", score: "44.8%" },
  { report: "Bounce breakdown", scope: "SES events", owner: "Platform", updated: "Jun 7", score: "2.1%" },
];
