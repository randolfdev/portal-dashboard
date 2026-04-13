import fetch from 'node-fetch';

const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function main() {
  // Reset failed jobs to pending
  const res = await fetch('http://127.0.0.1:54321/rest/v1/jobs?status=eq.failed', {
    method: 'PATCH',
    headers: {
      apikey: SK,
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status: 'pending', error_message: null }),
  });
  console.log('Reset failed->pending:', res.status);

  // Also reset running (stuck) jobs
  const res2 = await fetch('http://127.0.0.1:54321/rest/v1/jobs?status=eq.running', {
    method: 'PATCH',
    headers: {
      apikey: SK,
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status: 'pending', error_message: null }),
  });
  console.log('Reset running->pending:', res2.status);

  process.exit(0);
}

main();
