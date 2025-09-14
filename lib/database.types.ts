export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          username: string | null
          birth_date: string | null
          avatar_url: string | null
          provider: 'email'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          username?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          provider: 'email'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          username?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          provider?: 'email'
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          leader_id: string
          description: string | null
          is_public: boolean
          member_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          leader_id: string
          description?: string | null
          is_public?: boolean
          member_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          leader_id?: string
          description?: string | null
          is_public?: boolean
          member_count?: number
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'leader' | 'member'
          nickname: string
          tier: string
          main_position: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          sub_positions: ('top' | 'jungle' | 'mid' | 'adc' | 'support')[]
          total_wins: number
          total_losses: number
          main_position_games: number
          main_position_wins: number
          sub_position_games: number
          sub_position_wins: number
          tier_score: number
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'leader' | 'member'
          nickname: string
          tier: string
          main_position: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          sub_positions: ('top' | 'jungle' | 'mid' | 'adc' | 'support')[]
          total_wins?: number
          total_losses?: number
          main_position_games?: number
          main_position_wins?: number
          sub_position_games?: number
          sub_position_wins?: number
          tier_score?: number
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'leader' | 'member'
          nickname?: string
          tier?: string
          main_position?: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          sub_position?: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          total_wins?: number
          total_losses?: number
          main_position_games?: number
          main_position_wins?: number
          sub_position_games?: number
          sub_position_wins?: number
          tier_score?: number
          joined_at?: string
        }
      }
      team_invites: {
        Row: {
          id: string
          team_id: string
          created_by: string
          invite_code: string
          expires_at: string
          max_uses: number | null
          current_uses: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          created_by: string
          invite_code: string
          expires_at: string
          max_uses?: number | null
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          created_by?: string
          invite_code?: string
          expires_at?: string
          max_uses?: number | null
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          team_id: string
          created_by: string
          status: 'preparing' | 'in_progress' | 'completed'
          selected_members: Json
          team1_members: Json
          team2_members: Json
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          created_by: string
          status?: 'preparing' | 'in_progress' | 'completed'
          selected_members?: Json
          team1_members?: Json
          team2_members?: Json
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          created_by?: string
          status?: 'preparing' | 'in_progress' | 'completed'
          selected_members?: Json
          team1_members?: Json
          team2_members?: Json
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          session_id: string
          team_id: string
          winner: 'team1' | 'team2'
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          team_id: string
          winner: 'team1' | 'team2'
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          team_id?: string
          winner?: 'team1' | 'team2'
          created_at?: string
        }
      }
      match_members: {
        Row: {
          id: string
          match_id: string
          team_member_id: string
          team_side: 'team1' | 'team2'
          position: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          champion: string
          kills: number
          deaths: number
          assists: number
        }
        Insert: {
          id?: string
          match_id: string
          team_member_id: string
          team_side: 'team1' | 'team2'
          position: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          champion: string
          kills?: number
          deaths?: number
          assists?: number
        }
        Update: {
          id?: string
          match_id?: string
          team_member_id?: string
          team_side?: 'team1' | 'team2'
          position?: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
          champion?: string
          kills?: number
          deaths?: number
          assists?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}