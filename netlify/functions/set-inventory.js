const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const items = JSON.parse(event.body);
  // Clear table and insert all items (simple sync)
  const { error: delError } = await supabase.from('inventory').delete().neq('id', '');
  if (delError) {
    return { statusCode: 500, body: JSON.stringify({ error: delError.message }) };
  }
  const { error: insError } = await supabase.from('inventory').insert(items);
  if (insError) {
    return { statusCode: 500, body: JSON.stringify({ error: insError.message }) };
  }
  return { statusCode: 200, body: 'OK' };
};
