import { supabase } from './supabaseClient.js';
import type { Database } from './types/supabase.js';

const getDbClient = (token?: string) => {
  if (token && typeof (supabase as unknown as { createAuthClient?: (t?: string) => typeof supabase }).createAuthClient === 'function') {
    return (supabase as unknown as { createAuthClient: (t?: string) => typeof supabase }).createAuthClient(token);
  }
  return supabase;
};

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

/**
 * Inserts a new task for an authenticated user, falling back to provision the user profile if necessary.
 *
 * @param task - Task attributes including title, optional description, due date, completion status, and profile ID.
 * @param token - Optional JWT authentication token.
 * @returns The newly created and normalized task response record.
 * @throws {Error} If task creation fails in Supabase.
 */
export const createTask = async (
  task: CreateTaskInput | TaskInsert,
  token?: string,
): Promise<TaskResponse> => {
  const db = getDbClient(token);
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

  const { data, error } = await db.from('tasks').insert(insertPayload).select().single();

  if (error) {
    if (
      typeof error.message === 'string' &&
      error.message.includes('tasks_profile_id_fkey') &&
      insertPayload.profile_id
    ) {
      try {
        await db.from('profiles').upsert({ id: insertPayload.profile_id }, { onConflict: 'id' });
        const retry = await db.from('tasks').insert(insertPayload).select().single();
        if (!retry.error && retry.data) {
          return {
            ...retry.data,
            dueDate: retry.data.due_date,
            isComplete: retry.data.is_complete,
          };
        }
      } catch {
        // Fall through to throw original error
      }
    }
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return {
    ...data,
    dueDate: data.due_date,
    isComplete: data.is_complete,
  };
};

/**
 * Updates an existing task by ID with normalized database field mappings.
 *
 * @param id - Numeric ID of the task to update.
 * @param updates - Partial task properties to update (e.g. title, description, dueDate, isComplete).
 * @param token - Optional JWT authentication token.
 * @returns The updated task response record, or null if the task was not found.
 * @throws {Error} If the database update fails.
 */
export const updateTask = async (
  id: number,
  updates: UpdateTaskInput,
  token?: string,
): Promise<TaskResponse | null> => {
  const db = getDbClient(token);
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

  const { data, error } = await db
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

/**
 * Soft deletes a task by setting its deleted_at timestamp to the current ISO date.
 *
 * @param id - Numeric ID of the task to soft delete.
 * @param token - Optional JWT authentication token.
 * @returns Resolves when the task is marked deleted.
 * @throws {Error} If the soft delete update fails in Supabase.
 */
export const softDeleteTask = async (id: number, token?: string): Promise<void> => {
  const db = getDbClient(token);
  const { error } = await db
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
};

/**
 * Retrieves the next urgent, non-deleted, and incomplete task for a user ordered by earliest due date.
 *
 * @param profileId - Optional user profile ID filter.
 * @param token - Optional JWT authentication token.
 * @returns The next pending task record, or null if no tasks are available.
 * @throws {Error} If database querying encounters an unexpected error.
 */
export const getNextTask = async (profileId?: string, token?: string): Promise<TaskResponse | null> => {
  const db = getDbClient(token);
  let query = db
    .from('tasks')
    .select('*')
    .is('deleted_at', null)
    .is('is_complete', false);

  if (profileId) {
    query = query.eq('profile_id', profileId);
  }

  const { data, error } = await query
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

/**
 * Fetches all non-deleted tasks, optionally filtered by user profile ID, ordered by due date ascending.
 *
 * @param profileId - Optional user profile ID filter.
 * @param token - Optional JWT authentication token.
 * @returns An array of normalized task response objects.
 * @throws {Error} If retrieving tasks from Supabase fails.
 */
export const getAllTasks = async (profileId?: string, token?: string): Promise<TaskResponse[]> => {
  const db = getDbClient(token);
  let query = db
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

  return ((data as Record<string, unknown>[]) || []).map((task) => {
    const item: TaskResponse = {
      id: task['id'] as number,
      title: (task['title'] as string) ?? null,
      description: (task['description'] as string) ?? null,
      dueDate: (task['due_date'] as string) ?? null,
      due_date: (task['due_date'] as string) ?? null,
      isComplete: Boolean(task['is_complete']),
      is_complete: Boolean(task['is_complete']),
      profile_id: (task['profile_id'] as string) ?? null,
      deleted_at: (task['deleted_at'] as string) ?? null,
    };
    if (typeof task['created_at'] === 'string') {
      item.created_at = task['created_at'];
    }
    return item;
  });
};

export const getTasks = getAllTasks;
