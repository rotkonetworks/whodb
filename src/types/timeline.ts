export type TilelineEventRecord = {
  event: 'created' | 'verified' | 'discord' | 'display' | 'email' | 'matrix' | 'twitter' | 'github'
  | 'legal' | 'web' | 'image' | 'pgp_fingerprint'
  ;
  date: Date;
};