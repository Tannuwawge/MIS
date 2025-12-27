import sql from './src/db.js';

async function testBreakdownFlow() {
  console.log('1. Fetching assets to link...');
  const assets = await sql`SELECT id FROM public.assets_master LIMIT 1`;
  if (assets.length === 0) {
    console.error('No assets found! Cannot test Breakdown flow.');
    process.exit(1);
  }
  const assetId = assets[0].id;
  console.log('   Using Asset ID:', assetId);

  console.log('2. Creating a Breakdown log...');
  const breakdownData = {
    asset_id: assetId,
    description: 'Motor overheating', // nature_of_complaint
    reported_by: 'Operator John',
    started_at: new Date().toISOString(),
    status: 'OPEN',
    bu_name: 'Production Unit 1',
    production_opening_time: '08:00:00',
    entry_date: new Date().toISOString().slice(0, 10),
    entry_time: '09:30:00',
    equipment_type: 'CNC Machine',
    note: 'Urgent attention required'
  };

  try {
    const result = await sql`
      INSERT INTO public.breakdown_logs (
        asset_id, description, reported_by, started_at, status, 
        bu_name, production_opening_time, entry_date, entry_time, equipment_type, note
      )
      VALUES (
        ${breakdownData.asset_id}, ${breakdownData.description}, ${breakdownData.reported_by}, ${breakdownData.started_at}, ${breakdownData.status},
        ${breakdownData.bu_name}, ${breakdownData.production_opening_time}, ${breakdownData.entry_date}, ${breakdownData.entry_time}, ${breakdownData.equipment_type}, ${breakdownData.note}
      )
      RETURNING *
    `;
    const createdBreakdown = result[0];
    console.log('   Breakdown created:', createdBreakdown.id);

    console.log('3. Fetching Breakdown...');
    const fetchedBreakdowns = await sql`SELECT * FROM public.breakdown_logs WHERE id = ${createdBreakdown.id}`;
    const fetchedBreakdown = fetchedBreakdowns[0];
    
    if (fetchedBreakdown) {
        console.log('   Breakdown found!');
        console.log('   BU Name:', fetchedBreakdown.bu_name);
        console.log('   Note:', fetchedBreakdown.note);
        
        if (fetchedBreakdown.bu_name === 'Production Unit 1' && fetchedBreakdown.note === 'Urgent attention required') {
            console.log('   Data verification: OK');
        } else {
            console.log('   Data verification: FAIL');
        }
    } else {
        console.log('   Breakdown NOT found!');
    }

    console.log('4. Cleaning up...');
    await sql`DELETE FROM public.breakdown_logs WHERE id = ${createdBreakdown.id}`;
    console.log('   Test Breakdown deleted.');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}

testBreakdownFlow();
