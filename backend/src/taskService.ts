import { supabase } from './supabaseClient.js';

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

  return data ? {
    id: data.id,
    title: data.title,
    description: data.description,
    dueDate: data.due_date,
    isComplete: data.is_complete,
  } : null;
};
