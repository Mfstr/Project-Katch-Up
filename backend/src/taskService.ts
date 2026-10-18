import { supabase } from './supabaseClient.js';
import type { Database } from './types/supabase.js';

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  is_complete?: boolean | null;
  isComplete?: boolean | null;
  profile_id?: string | null;
  profileId?: string | null;
}

export interface UpdateTaskInput {
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  is_complete?: boolean | null;
  isComplete?: boolean | null;
  deleted_at?: string | null;
  profile_id?: string | null;
  profileId?: string | null;
}

export interface TaskResponse {
  id: number;
  title: string | null;
  description: string | null;
  dueDate: string | null;
  due_date?: string | null;
  isComplete: boolean | null;
  is_complete?: boolean | null;
  profile_id?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export const createTask = async (task: CreateTaskInput | TaskInsert): Promise<TaskResponse> => {
  const insertPayload: TaskInsert = {
    title: task.title ?? null,
    description: task.description ?? null,
    due_date:
      'due_date' in task && task.due_date !== undefined
        ? task.due_date
        : 'dueDate' in task && task.dueDate !== undefined
          ? task.dueDate
          : null,
    is_complete:
      'is_complete' in task && task.is_complete !== undefined
        ? task.is_complete
        : 'isComplete' in task && task.isComplete !== undefined
          ? task.isComplete
          : false,
    profile_id:
      'profile_id' in task && task.profile_id !== undefined
        ? task.profile_id
        : 'profileId' in task && task.profileId !== undefined
          ? task.profileId
          : null,
  };

  const { data, error } = await supabase.from('tasks').insert(insertPayload).select().single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);

  return {
    ...data,
    dueDate: data.due_date,
    isComplete: data.is_complete,
  };
};

export const updateTask = async (
  id: number,
  updates: UpdateTaskInput,
): Promise<TaskResponse | null> => {
  const updatePayload: Record<string, unknown> = {};

  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.due_date !== undefined) {
    updatePayload.due_date = updates.due_date;
  } else if (updates.dueDate !== undefined) {
    updatePayload.due_date = updates.dueDate;
  }
  if (updates.is_complete !== undefined) {
    updatePayload.is_complete = updates.is_complete;
  } else if (updates.isComplete !== undefined) {
    updatePayload.is_complete = updates.isComplete;
  }
  if (updates.deleted_at !== undefined) updatePayload.deleted_at = updates.deleted_at;
  if (updates.profile_id !== undefined) {
    updatePayload.profile_id = updates.profile_id;
  } else if (updates.profileId !== undefined) {
    updatePayload.profile_id = updates.profileId;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data
    ? {
        ...data,
        dueDate: data.due_date,
        isComplete: data.is_complete,
      }
    : null;
};

export const softDeleteTask = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
};

export const getNextTask = async (profileId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .is('is_complete', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw new Error(`Failed to get next task: ${error.message}`);
  }

  return data
    ? {
        id: data.id,
        title: data.title,
        description: data.description,
        dueDate: data.due_date,
        isComplete: data.is_complete,
      }
    : null;
};

export const getAllTasks = async (profileId?: string): Promise<TaskResponse[]> => {
  let query = supabase
    .from('tasks')
    .select('*')
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (profileId) {
    query = query.eq('profile_id', profileId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get tasks: ${error.message}`);
  }

  return (data || []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.due_date,
    due_date: task.due_date,
    isComplete: task.is_complete,
    is_complete: task.is_complete,
    profile_id: task.profile_id,
    created_at: task.created_at,
    deleted_at: task.deleted_at,
  }));
};

export const getTasks = getAllTasks;
