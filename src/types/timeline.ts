export type TimelineEventRecord = {
  event: 'created' | 'verified' | 'discord' | 'display' | 'email' | 'matrix' | 'twitter' | 'github'
  | 'legal' | 'web' | 'image' | 'pgp_fingerprint'
  ;
  date: Date;
};
export type Timeline = TimelineEventRecord[];
