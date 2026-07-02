import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rkmyzfpvgutzsjeeqgrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXl6ZnB2Z3V0enNqZWVxZ3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Nzk5ODQsImV4cCI6MjA5NjM1NTk4NH0.9OoISwmmd8IzSIj4NJ7HBm1psW8FW_3eMLDRj5a1GCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('leads').select('user_id').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

checkSchema();
