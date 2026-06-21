import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
};

export type PBI = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  tab_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BacklogTab = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
};

export type SprintPBI = {
  id: string;
  sprint_id: string;
  pbi_id: string;
  status: string;
  created_at: string;
  pbis?: PBI;
};

export type KanbanBoard = {
  id: string;
  sprint_id: string;
  name: string;
  created_at: string;
};

export type KanbanColumn = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  status_key: string | null;
  created_at: string;
};

export type KanbanCard = {
  id: string;
  column_id: string;
  board_id: string | null;
  sprint_pbi_id: string | null;
  title: string;
  description: string | null;
  position: number;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type KanbanCardTask = {
  id: string;
  card_id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export type PBIAttachment = {
  id: string;
  card_id: string;
  user_id: string | null;
  type: 'comment' | 'file' | 'screenshot';
  content: string | null;
  filename: string | null;
  created_at: string;
};

