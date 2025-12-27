const BASE_URL = 'http://localhost:3000/api';

async function testInventoryFlow() {
  try {
    console.log('1. Creating a spare part...');
    const spareData = {
      part_code: 'SP-' + Date.now(),
      part_name: 'Test Bearing',
      uom: 'NOS',
      stock_on_hand: 10,
      reorder_level: 2,
      location: 'Bin A1'
    };
    
    const spareRes = await fetch(`${BASE_URL}/spares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spareData)
    });

    if (!spareRes.ok) throw new Error(`Spare creation failed: ${spareRes.statusText}`);
    const spare = await spareRes.json();
    console.log('   Spare created:', spare.id);

    console.log('2. Fetching spares...');
    const listRes = await fetch(`${BASE_URL}/spares`);
    if (!listRes.ok) throw new Error(`Spare fetch failed: ${listRes.statusText}`);
    
    const list = await listRes.json();
    const foundSpare = list.find(s => s.id === spare.id);
    
    if (foundSpare) {
        console.log('   Spare found in list!');
        console.log('   Stock type:', typeof foundSpare.stock_on_hand);
        console.log('   Stock value:', foundSpare.stock_on_hand);
        console.log('   Data verification:');
        console.log('   - Name:', foundSpare.part_name === spareData.part_name ? 'OK' : 'FAIL');
        console.log('   - Stock:', foundSpare.stock_on_hand === spareData.stock_on_hand ? 'OK' : 'FAIL');
    } else {
        console.error('   Spare NOT found in list!');
    }

    console.log('3. Updating spare...');
    const updateRes = await fetch(`${BASE_URL}/spares/${spare.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stock_on_hand: 15,
        location: 'Bin A2'
      })
    });

    if (!updateRes.ok) throw new Error(`Spare update failed: ${updateRes.statusText}`);
    const updatedSpare = await updateRes.json();
    console.log('   Spare updated.');
    console.log('   - New Stock:', updatedSpare.stock_on_hand === 15 ? 'OK' : 'FAIL');
    console.log('   - New Location:', updatedSpare.location === 'Bin A2' ? 'OK' : 'FAIL');

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testInventoryFlow();