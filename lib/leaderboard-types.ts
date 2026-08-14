export interface LeaderboardEntry {
  id: string;
  rank: 1 | 2 | 3;
  name: string;
  amount: number;
  updated_by: string | null;
  updated_at: string;
}
