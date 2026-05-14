// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          created_at: string;
          is_pro: boolean;
          is_public_leaderboard: boolean;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          created_at?: string;
          is_pro?: boolean;
          is_public_leaderboard?: boolean;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          created_at?: string;
          is_pro?: boolean;
          is_public_leaderboard?: boolean;
        };
        Relationships: [];
      };
      portfolio_snapshots: {
        Row: {
          id: string;
          wallet_address: string;
          total_value_usd: number; // numeric in DB becomes number in JS
          snapshot_date: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          total_value_usd: number;
          snapshot_date?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          total_value_usd?: number;
          snapshot_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_wallet_address_fkey";
            columns: ["wallet_address"];
            referencedRelation: "users";
            referencedColumns: ["wallet_address"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Type for the Supabase client
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client with proper typing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Repository helpers for type-safe database operations
export const db = {
    // Users repository
    users: {
      async findByWalletAddress(walletAddress: string) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress)
          .maybeSingle();
       
        if (error) throw error;
        return data;
      },
      
      async findManyByPublicLeaderboard(isPublic: boolean) {
        return await supabase
          .from('users')
          .select('*')
          .eq('is_public_leaderboard', isPublic);
      },
      
      async createUser(walletAddress: string, isPro = false, isPublicLeaderboard = false) {
        const { data, error } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
            is_pro: isPro,
            is_public_leaderboard: isPublicLeaderboard
          })
          .select()
          .single();
       
        if (error) throw error;
        return data;
      },
      
      async updateProStatus(walletAddress: string, isPro: boolean) {
        const { data, error } = await supabase
          .from('users')
          .update({ is_pro: isPro })
          .eq('wallet_address', walletAddress)
          .select()
          .single();
       
        if (error) throw error;
        return data;
      },
      
      async updatePublicLeaderboardStatus(walletAddress: string, isPublic: boolean) {
        const { data, error } = await supabase
          .from('users')
          .update({ is_public_leaderboard: isPublic })
          .eq('wallet_address', walletAddress)
          .select()
          .single();
       
        if (error) throw error;
        return data;
      }
    },
  
  // Portfolio snapshots repository
  portfolioSnapshots: {
    async createSnapshot(walletAddress: string, totalValueUsd: number) {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .insert({
          wallet_address: walletAddress,
          total_value_usd: totalValueUsd
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getSnapshotsByWalletAddress(walletAddress: string, limit = 30) {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('snapshot_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    }
  }
};