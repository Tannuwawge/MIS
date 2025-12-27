import sql from './src/db.js';

async function testPMFlow() {
  console.log('1. Fetching assets to link...');
  const assets = await sql`SELECT id FROM public.assets_master LIMIT 1`;
  if (assets.length === 0) {
    console.error('No assets found! Cannot test PM flow.');
    process.exit(1);
  }
  const assetId = assets[0].id;
  console.log('   Using Asset ID:', assetId);

  console.log('2. Creating a PM schedule with checklist...');
  const pmData = {
    asset_id: assetId,
    title: 'Test PM Schedule ' + Date.now(),
    frequency: 'MONTHLY',
    due_date: new Date().toISOString().slice(0, 10),
    checklist: [
      { id: 1, task: 'Check oil level', completed: false },
      { id: 2, task: 'Inspect belts', completed: false }
    ],
    status: 'PENDING',
    last_completed_at: null
  };

  try {
    const result = await sql`
      INSERT INTO public.pm_schedule (asset_id, title, frequency, due_date, checklist, status, last_completed_at)
      VALUES (${pmData.asset_id}, ${pmData.title}, ${pmData.frequency}, ${pmData.due_date}, ${pmData.checklist}, ${pmData.status}, ${pmData.last_completed_at})
      RETURNING *
    `;
    const createdPM = result[0];
    console.log('   PM Schedule created:', createdPM.id);

    console.log('3. Fetching PM schedule...');
    const fetchedPMs = await sql`SELECT * FROM public.pm_schedule WHERE id = ${createdPM.id}`;
    const fetchedPM = fetchedPMs[0];
    
    if (fetchedPM) {
        console.log('   PM found!');
        console.log('   Checklist type:', typeof fetchedPM.checklist);
        console.log('   Checklist value:', JSON.stringify(fetchedPM.checklist, null, 2));
        
        // Verify checklist content
        const checklist = fetchedPM.checklist;
        if (Array.isArray(checklist) && checklist.length === 2 && checklist[0].task === 'Check oil level') {
            console.log('   Checklist verification: OK');
        } else {
            console.log('   Checklist verification: FAIL');
        }
    } else {
        console.log('   PM NOT found!');
    }

    console.log('4. Cleaning up...');
    await sql`DELETE FROM public.pm_schedule WHERE id = ${createdPM.id}`;
    console.log('   Test PM deleted.');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}

testPMFlow();
