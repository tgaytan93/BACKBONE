export type Submission = {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  business: string | null;
  whats_broken: string | null;
  tier: string | null;
  budget: string | null;
  status: string | null;
  notes: string | null;
};

export type RecentInbound = {
  id: string;
  submission_id: string;
  submission_name: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
  read_at: string | null;
};

export type UnmatchedMessage = {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
};
