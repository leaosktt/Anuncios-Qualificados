const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rkmyzfpvgutzsjeeqgrq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXl6ZnB2Z3V0enNqZWVxZ3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Nzk5ODQsImV4cCI6MjA5NjM1NTk4NH0.9OoISwmmd8IzSIj4NJ7HBm1psW8FW_3eMLDRj5a1GCQ');
async function check() { 
  const {data, error} = await supabase.from('meta_integrations').select('*'); 
  console.log('data:', JSON.stringify(data, null, 2));
  console.log('error:', error);
  process.exit(0);
}
check();
