export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Paused" | "Completed";

export type Organization = {
  name: string;
  industry: string;
  contacts: number;
  validContacts: number;
  status: "Ready" | "Needs review" | "Processing";
  lastTouched: string;
};

export type Campaign = {
  name: string;
  status: CampaignStatus;
  recipients: number;
  openRate: number;
  clickRate: number;
};
