import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserProfileRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  is_pro: boolean;
  is_public_leaderboard: boolean;
};

type UserProfileInsert = {
  id?: string;
  wallet_address: string;
  created_at?: string;
  is_pro?: boolean;
  is_public_leaderboard?: boolean;
};

type UserProfileUpdate = Partial<Omit<UserProfileInsert, 'wallet_address'>>;

type UserProfileDatabase = {
  public: {
    Tables: {
      users: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
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
};

let cachedClient: SupabaseClient<UserProfileDatabase> | null = null;

function getUserProfileClient(): SupabaseClient<UserProfileDatabase> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for server-side user profile access'
    );
  }

  cachedClient = createClient<UserProfileDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': 'bagfi-user-profile'
      }
    }
  });

  return cachedClient;
}

export async function getUserProfile(walletAddress: string) {
  const { data, error } = await getUserProfileClient()
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read user profile: ${error.message}`);
  }

  return data;
}

export async function listPublicLeaderboardProfiles(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const { data, error } = await getUserProfileClient()
    .from('users')
    .select('*')
    .eq('is_public_leaderboard', true)
    .order('created_at', { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to read public leaderboard profiles: ${error.message}`);
  }

  return data;
}

export async function updatePublicLeaderboardStatus(params: {
  walletAddress: string;
  isPublicLeaderboard: boolean;
}) {
  const { data, error } = await getUserProfileClient()
    .from('users')
    .upsert(
      {
        wallet_address: params.walletAddress,
        is_public_leaderboard: params.isPublicLeaderboard
      },
      {
        onConflict: 'wallet_address'
      }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update public leaderboard status: ${error.message}`);
  }

  return data;
}
