import { supabase } from './supabaseClient.js';

export const softDeleteTask = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw new Error(`Failed to delete task: ${error.message}`);
};
