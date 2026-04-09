#!/bin/sh
set -e

echo '[migrate] Resolving previously failed migrations...'
node node_modules/prisma/build/index.js migrate resolve \
  --rolled-back 20260319100000_make_ksi_optional 2>/dev/null || true
node node_modules/prisma/build/index.js migrate resolve \
  --rolled-back 20260405000000_fix_gantt_version_missing_columns 2>/dev/null || true

echo '[migrate] Marking db-push-applied migrations as applied...'
for m in \
  20260316000000_init \
  20260317000000_add_input_control_and_photo_annotations \
  20260317100000_add_phase3_remaining \
  20260318000000_phase35_item_types \
  20260319000000_add_ksi_description_tablecode \
  20260320000000_add_contract_photo_entity_type \
  20260320100000_add_aosr_fields \
  20260320200000_ui_redesign_additions \
  20260323000000_add_normative_refs \
  20260324000000_add_material_work_item_link \
  20260324100000_add_work_item_fields \
  20260324200000_phase45_gantt \
  20260324300000_add_daily_log_portal_change_orders \
  20260324400000_add_defects_table \
  20260325000000_add_defect_annotations_dashboard_widgets \
  20260329000000_add_notification_model \
  20260329100000_rename_projects_to_building_objects \
  20260330000000_add_module2_passport \
  20260330145352_add_module3_info_sed \
  20260331000000_add_rfi_fts \
  20260401000000_add_module4_project_management \
  20260401120000_add_module5_pir \
  20260402000000_add_module6_estimates \
  20260403000000_add_module7_gpr_step1 \
  20260403120000_make_gantt_task_contractid_optional \
  20260404000000_add_module8_resources \
  20260405120000_add_module9_journals \
  20260406000000_backfill_id_category \
  20260406120000_add_module11_sk \
  20260407000000_add_module13_tim \
  20260407120000_add_module12_reports
do
  node node_modules/prisma/build/index.js migrate resolve --applied "$m" 2>/dev/null || true
done

echo '[migrate] Waiting for database connection...'
node -e "
const url = new URL(process.env.DATABASE_URL || '');
const net = require('net');
let retries = 30;
const tryConnect = () => {
  const s = net.createConnection(parseInt(url.port) || 5432, url.hostname);
  s.on('connect', () => { s.destroy(); console.log('[migrate] Database ready.'); process.exit(0); });
  s.on('error', () => {
    s.destroy();
    if (--retries <= 0) { console.error('[migrate] ERROR: Database unreachable after 60s'); process.exit(1); }
    console.log('[migrate] Not ready, ' + retries + ' retries left, waiting 2s...');
    setTimeout(tryConnect, 2000);
  });
};
tryConnect();
"

echo '[migrate] Running migrate deploy (new migrations only)...'
node node_modules/prisma/build/index.js migrate deploy

echo '[migrate] Done.'

echo '[worker] Запуск parse-ifc worker...'
node /app/dist/workers/lib/workers/parse-ifc.worker.js &
WORKER_PID=$!
echo '[worker] parse-ifc worker запущен (PID: '"$WORKER_PID"')'

exec node server.js
