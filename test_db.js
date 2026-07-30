const { Client } = require('pg');

const PROJECT_REF = 'lyksqvqtiysjttwpgeyw';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a3NxdnF0aXlzanR0d3BnZXl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEwMzY5NSwiZXhwIjoyMDk2Njc5Njk1fQ.mBa1eT-HjIzAkJaHz0ucRG6KuaFEC_dCcJZD5rrtUis';

async function tryConnect(label, connStr) {
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 AS ok');
    console.log('OK:', label, '- connected, result:', res.rows[0].ok);
    await client.end();
    return true;
  } catch (err) {
    console.log('FAIL:', label, '-', err.message.substring(0, 100));
    try { await client.end() } catch {}
    return false;
  }
}

async function main() {
  const regions = ['eu-west-1', 'eu-west-2', 'eu-central-1', 'us-east-1', 'us-east-2', 'us-west-1', 'eu-west-3', 'ca-central-1', 'af-south-1'];
  
  for (const region of regions) {
    const encoded = encodeURIComponent(SERVICE_KEY);
    await tryConnect(`pooler-${region}`, `postgresql://postgres.${PROJECT_REF}:${encoded}@aws-0-${region}.pooler.supabase.com:6543/postgres`);
  }
  
  await tryConnect('db-direct', `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SERVICE_KEY)}@db.${PROJECT_REF}.supabase.co:5432/postgres`);
}

main().catch(console.error);
