-- =======================================================
-- USERS / PROFILES (already inserted above)
-- =======================================================
insert into public.profiles (id, full_name, role) values
  ('854ebeb9-12fa-476e-baa3-88dbbe492d56', 'Saroj Phalke', 'operator'),
  ('887f3d18-4927-4d41-8d4b-566efbdc3a30', 'Tanushri Engineer', 'engineer'),
  ('51b21474-4946-44ce-b8ff-5eac106f70d7', 'Saroj Admin', 'admin');

-- =======================================================
-- MACHINE MASTER
-- =======================================================
insert into public.machine_master (machine_no, manufacturer, bu_name) values
  ('MCH-001', 'Arburg', 'BU-Molding'),
  ('MCH-002', 'Atlas Copco', 'BU-Utilities');

-- =======================================================
-- ASSETS MASTER
-- =======================================================
insert into public.assets_master 
(id, asset_code, asset_name, machine_no, location, category, manufacturer, model, serial_number, install_date, status)
values
  (1, 'AST-001', 'Injection Molding Machine', 'MCH-001', 'Plant 1', 'Machine', 'Arburg', 'A-370', 'SN-1001', '2022-01-15', 'ACTIVE'),
  (2, 'AST-002', 'Compressor Unit', 'MCH-002', 'Plant 1', 'Auxiliary', 'Atlas Copco', 'AC-500', 'SN-2001', '2021-09-10', 'UNDER_AMC');

-- =======================================================
-- PM SCHEDULE
-- =======================================================
insert into public.pm_schedule (asset_id, title, frequency, due_date, checklist, status, responsible_person)
values
  (1, 'Monthly PM - Injection Molding', 'MONTHLY', '2025-09-10',
   '["Check oil","Inspect filters","Check alignment"]', 'PENDING',
   '887f3d18-4927-4d41-8d4b-566efbdc3a30'),
  (2, 'Weekly PM - Compressor', 'WEEKLY', '2025-08-28',
   '["Check pressure","Drain moisture","Inspect valves"]', 'DUE',
   '887f3d18-4927-4d41-8d4b-566efbdc3a30');

-- PM Compliance
insert into public.pm_compliance (pm_id, compliance_date, bu_name, shift_code, remarks)
values
  (1, '2025-08-01', 'BU-Molding', 'A', 'Done on time'),
  (2, '2025-08-20', 'BU-Utilities', 'B', 'Delayed due to spare shortage');

-- =======================================================
-- BREAKDOWN LOGS
-- =======================================================
insert into public.breakdown_logs (asset_id, description, reported_by, status)
values
  (1, 'Machine not starting - suspected motor issue', '854ebeb9-12fa-476e-baa3-88dbbe492d56', 'OPEN'),
  (2, 'Air pressure dropping intermittently', '854ebeb9-12fa-476e-baa3-88dbbe492d56', 'ACK');

-- =======================================================
-- DAILY ENTRY (Operator & Engineer)
-- =======================================================
insert into public.daily_entry_operator (breakdown_id, asset_id, shift, production_opening_time, machine_no, bu_name, operator_name, status_type, equipment_type, key_issue, nature_of_complaint, note, created_by)
values
  (1, 1, 'A', '07:05:00', 'MCH-001', 'BU-Molding', 'Saroj Phalke',
   'BD', 'MACHINE', 'Motor not running', 'Noise followed by shutdown',
   'Observed abnormal noise and shutdown during shift A',
   '854ebeb9-12fa-476e-baa3-88dbbe492d56');

insert into public.daily_entry_engineer (breakdown_id, asset_id, action_taken, engineer_findings, spare_part_use, responsible_person, job_completion_date, done_time, remarks, memo_taken, work_done, created_by)
values
  (1, 1, 'Replaced motor fuse', 'Fuse blown due to overload', 'Hydraulic Oil Filter',
   '887f3d18-4927-4d41-8d4b-566efbdc3a30', '2025-08-23', '09:30:00',
   'Machine restarted successfully', 'Memo signed', 'Fuse replaced and machine running',
   '887f3d18-4927-4d41-8d4b-566efbdc3a30');

-- =======================================================
-- SPARE PARTS INVENTORY
-- =======================================================
insert into public.spare_parts_inventory (part_code, part_name, part_no, stock_on_hand, min_level, reorder_level, unit_cost, supplier, location)
values
  ('SP-001', 'Hydraulic Oil Filter', 'P-1001', 50, 10, 20, 1500.00, 'ABC Supplies', 'Store A'),
  ('SP-002', 'Air Filter', 'P-2001', 20, 5, 10, 1200.00, 'XYZ Traders', 'Store B');

-- Spare Transactions
insert into public.spare_txn (part_id, qty, direction, asset_id, related_breakdown_id, created_by)
values
  (1, 2, 'ISSUE', 1, 1, '887f3d18-4927-4d41-8d4b-566efbdc3a30'),
  (2, 1, 'ISSUE', 2, 2, '887f3d18-4927-4d41-8d4b-566efbdc3a30'),
  (1, 1, 'RETURN', 1, 1, '887f3d18-4927-4d41-8d4b-566efbdc3a30');

-- =======================================================
-- UTILITIES LOG
-- =======================================================
insert into public.utilities_log (utility_type, meter_point, reading, reading_at)
values
  ('POWER', 'Main Plant Meter', 12500.50, '2025-08-22 08:00:00'),
  ('AIR', 'Compressor Line 1', 350.75, '2025-08-22 08:15:00');

-- =======================================================
-- ASSET QR
-- =======================================================
insert into public.asset_qr (asset_id, qr_payload) values
  (1, 'QR-AST-001'),
  (2, 'QR-AST-002');
