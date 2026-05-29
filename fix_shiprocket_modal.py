f = open('pages/admin-panel.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find <!-- Ship Order Modal --> line
start = None
end = None
for i, line in enumerate(lines):
    if '<!-- Ship Order Modal -->' in line:
        start = i
    if start and i > start and '<!-- Customer Detail Modal -->' in line:
        end = i
        break

print(f'Modal from line {start+1} to {end+1}')

new_modal_lines = """<!-- Ship Order Modal (Shiprocket) -->
<div id="ship-modal" class="modal-overlay" style="display:none;" onclick="if(event.target===this)closeShipModal()">
  <div class="modal-box" style="width:480px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f97316,#ea580c);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h2 style="font-size:16px;font-weight:700;color:#0F172A;margin:0;">Ship via Shiprocket</h2>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeShipModal()">[[icon:x]]</button>
    </div>
    <input type="hidden" id="ship-order-id">
    <input type="hidden" id="ship-mongo-id">
    <div id="ship-order-info" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#475569;"></div>
    <!-- Step 1 -->
    <div id="sr-step1" style="margin-bottom:16px;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94A3B8;margin-bottom:10px;">Step 1 — Create Shipment</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <label class="form-label">Weight (kg)</label>
          <input class="form-input" id="sr-weight" type="number" value="0.5" min="0.1" step="0.1"/>
        </div>
        <div>
          <label class="form-label">Dimensions L&times;B&times;H (cm)</label>
          <div style="display:flex;gap:4px;">
            <input class="form-input" id="sr-length" type="number" value="15" min="1" style="padding:8px;text-align:center;"/>
            <input class="form-input" id="sr-breadth" type="number" value="15" min="1" style="padding:8px;text-align:center;"/>
            <input class="form-input" id="sr-height" type="number" value="10" min="1" style="padding:8px;text-align:center;"/>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="sr-create-btn" onclick="srCreateShipment()" style="width:100%;">
        [[icon:package]] Create Shipment on Shiprocket
      </button>
    </div>
    <!-- Step 2 -->
    <div id="sr-step2" style="display:none;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94A3B8;margin-bottom:10px;">Step 2 — Select Courier &amp; Assign AWB</p>
      <div id="sr-courier-list" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;margin-bottom:10px;"></div>
      <button class="btn btn-primary" id="sr-awb-btn" onclick="srAssignAWB()" style="width:100%;">
        [[icon:check-circle]] Assign AWB Number
      </button>
    </div>
    <!-- Step 3 -->
    <div id="sr-step3" style="display:none;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94A3B8;margin-bottom:10px;">Step 3 — Schedule Pickup</p>
      <div id="sr-awb-display" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:13px;"></div>
      <button class="btn btn-primary" id="sr-pickup-btn" onclick="srGeneratePickup()" style="width:100%;background:#16a34a;">
        [[icon:truck]] Schedule Pickup
      </button>
    </div>
    <!-- Success -->
    <div id="sr-success" style="display:none;text-align:center;padding:20px 0;">
      <div style="font-size:2.5rem;margin-bottom:8px;">&#9989;</div>
      <p style="font-weight:700;color:#16a34a;font-size:15px;">Shipment Created!</p>
      <p style="font-size:13px;color:#64748B;margin-top:4px;" id="sr-success-msg"></p>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px;">
      <button class="btn btn-secondary" onclick="closeShipModal()">Close</button>
    </div>
  </div>
</div>

""".splitlines(keepends=True)

new_lines = lines[:start] + new_modal_lines + lines[end:]
f = open('pages/admin-panel.html', 'w', encoding='utf-8', newline='\r\n')
f.writelines(new_lines)
f.close()
print('done')
