// Should extend IdentityInfo
export type TimelineEventType = 'created' | 'verified' | 'discord' | 'display' | 'email' | 'matrix' 
  | 'twitter' | 'github' | 'legal' | 'web' | 'image' | 'pgp_fingerprint';

export type TimelineEventRecord = {
  event: TimelineEventType;
  date: Date;
};
export type Timeline = TimelineEventRecord[];
