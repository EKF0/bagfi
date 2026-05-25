import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  SmartBagDepositSession,
  SmartBagSessionReceipt
} from '@/lib/smart-bags/session-engine';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SmartBagSessionRow = {
  id: string;
  wallet_address: string;
  session_type: SmartBagDepositSession['type'];
  bag_id: string;
  bag_title: string | null;
  status: SmartBagDepositSession['status'];
  deposit_amount: string | null;
  deposit_mint: string | null;
  input_token: Json;
  input_amount_base_units: string | null;
  slippage_bps: number | null;
  max_slippage_bps: number | null;
  rebalance_threshold_bps: number | null;
  allocation_splits: Json;
  quote_snapshots: Json;
  receipts: Json;
  steps: Json;
  current_step_index: number;
  tx_signatures: string[];
  error_message: string | null;
  raw_session: Json;
  created_at: string;
  updated_at: string;
};

type SmartBagSessionInsert = Omit<SmartBagSessionRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

type SmartBagSessionUpdate = Partial<SmartBagSessionInsert>;

type UserRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  is_pro: boolean;
  is_public_leaderboard: boolean;
};

type UserInsert = {
  id?: string;
  wallet_address: string;
  created_at?: string;
  is_pro?: boolean;
  is_public_leaderboard?: boolean;
};

type SmartBagSessionsDatabase = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: Partial<UserInsert>;
        Relationships: [];
      };
      smart_bag_sessions: {
        Row: SmartBagSessionRow;
        Insert: SmartBagSessionInsert;
        Update: SmartBagSessionUpdate;
        Relationships: [
          {
            foreignKeyName: 'smart_bag_sessions_wallet_address_fkey';
            columns: ['wallet_address'];
            referencedRelation: 'users';
            referencedColumns: ['wallet_address'];
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
};

let cachedClient: SupabaseClient<SmartBagSessionsDatabase> | null = null;

function getSmartBagSessionsClient(): SupabaseClient<SmartBagSessionsDatabase> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for Smart Bag session persistence'
    );
  }

  cachedClient = createClient<SmartBagSessionsDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': 'bagfi-smart-bag-sessions'
      }
    }
  });

  return cachedClient;
}

function toJson(value: unknown): Json {
  return value as Json;
}

function getConfirmedSignatures(receipts: SmartBagSessionReceipt[]) {
  return receipts
    .map((receipt) => receipt.signature)
    .filter((signature): signature is string => Boolean(signature));
}

function getErrorMessage(session: SmartBagDepositSession): string | null {
  if (session.status !== 'failed') {
    return null;
  }

  return session.receipts.find((receipt) => receipt.error)?.error || null;
}

function mapSessionToRow(session: SmartBagDepositSession): SmartBagSessionInsert {
  return {
    id: session.id,
    wallet_address: session.walletAddress,
    session_type: session.type,
    bag_id: session.bagId,
    bag_title: session.bagTitle,
    status: session.status,
    deposit_amount: session.inputAmount,
    deposit_mint: session.inputToken.mint,
    input_token: toJson(session.inputToken),
    input_amount_base_units: session.inputAmountBaseUnits,
    slippage_bps: session.slippageBps,
    max_slippage_bps: session.maxSlippageBps,
    rebalance_threshold_bps: session.rebalanceThresholdBps,
    allocation_splits: toJson(session.allocationSplits),
    quote_snapshots: toJson(session.quoteSnapshots),
    receipts: toJson(session.receipts),
    steps: toJson(session.quoteSnapshots),
    current_step_index: session.receipts.length,
    tx_signatures: getConfirmedSignatures(session.receipts),
    error_message: getErrorMessage(session),
    raw_session: toJson(session),
    created_at: session.createdAt,
    updated_at: session.updatedAt
  };
}

async function ensureUserExists(
  client: SupabaseClient<SmartBagSessionsDatabase>,
  walletAddress: string
) {
  const { error } = await client
    .from('users')
    .upsert(
      {
        wallet_address: walletAddress
      },
      {
        onConflict: 'wallet_address'
      }
    );

  if (error) {
    throw new Error(`Failed to ensure Smart Bag session user exists: ${error.message}`);
  }
}

export async function upsertSmartBagSession(session: SmartBagDepositSession) {
  const client = getSmartBagSessionsClient();

  await ensureUserExists(client, session.walletAddress);

  const { data, error } = await client
    .from('smart_bag_sessions')
    .upsert(mapSessionToRow(session), {
      onConflict: 'id'
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to persist Smart Bag session: ${error.message}`);
  }

  return data;
}
