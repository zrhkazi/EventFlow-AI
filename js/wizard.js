// ============================================================
// EventFlow AI — Wizard Module (7-step event creation)
// ============================================================

const Wizard = {
  step: 1,
  totalSteps: 7,
  visibility: 'Public',
  editingEventId: null,
  // Arrays for wizard entities (temporary until save)
  timeSlots: [], rooms: [], speakers: [], attendees: [], resources: [],
  selectedEquipment: [],
  // Stepper values
  roomCap: 50, spkDur: 45, resQty: 10,

  STEPS: [
    {id:1,label:'Basics'},{id:2,label:'Time Slots'},{id:3,label:'Rooms'},
    {id:4,label:'Speakers'},{id:5,label:'Attendees'},{id:6,label:'Resources'},{id:7,label:'Review'}
  ],

  // ---- NAVIGATION ----
  goToStep(n){
    if(n<1||n>this.totalSteps) return;
    document.getElementById(`step-${this.step}`).classList.remove('active');
    this.step = n;
    setTimeout(() => document.getElementById(`step-${n}`).classList.add('active'), 50);
    document.getElementById('wiz-scroll-area').scrollTo({top:0, behavior:'smooth'});
    document.getElementById('wiz-progress-bar').style.width = `${(this.step/this.totalSteps)*100}%`;
    document.getElementById('wiz-btn-prev').disabled = (this.step===1);
    const isLast = this.step===this.totalSteps;
    document.getElementById('wiz-btn-next').style.display = isLast ? 'none' : 'flex';
    document.getElementById('wiz-btn-save').style.display = isLast ? 'flex' : 'none';
    this._renderBreadcrumb();
    // Refresh dynamic elements per step
    if(n===3) this._refreshRoomSlots();
    if(n===4) this._refreshSpeakerSlots();
    if(n===5) this._refreshAttendeeSpeakers();
    if(n===7) this._buildReview();
  },
  next(){ this.goToStep(this.step+1); },
  prev(){ this.goToStep(this.step-1); },

  _renderBreadcrumb(){
    const nav = document.getElementById('wiz-breadcrumb-nav'); nav.innerHTML = '';
    this.STEPS.forEach((step,i) => {
      const cls = this.step > step.id ? 'done' : this.step === step.id ? 'active' : 'pending';
      nav.innerHTML += `<div class="crumb ${cls}" onclick="App.wiz.goToStep(${step.id})">
        <div class="crumb-dot"></div><span class="crumb-label">${step.label}</span></div>
        ${i < this.STEPS.length-1 ? '<div class="crumb-line"></div>' : ''}`;
    });
  },

  setVisibility(v){
    this.visibility = v;
    document.getElementById('mod-pub').classList.toggle('active', v==='Public');
    document.getElementById('mod-priv').classList.toggle('active', v==='Private');
  },

  // ---- STEPPER HELPERS ----
  adj(field, delta){
    const map = {roomCap:{min:1,display:'wiz-room-cap-display'}, spkDur:{min:1,display:'wiz-spk-dur-display'}, resQty:{min:0,display:'wiz-res-qty-display'}};
    const cfg = map[field]; if(!cfg) return;
    this[field] = Math.max(cfg.min, this[field]+delta);
    const el = document.getElementById(cfg.display);
    if(el) el.value = this[field];
  },

  toggleEquipment(el, val){
    el.classList.toggle('selected');
    if(el.classList.contains('selected')) this.selectedEquipment.push(val);
    else this.selectedEquipment = this.selectedEquipment.filter(e => e!==val);
  },

  // ---- TIME SLOTS (Step 2) ----
  addTimeSlot(){
    const date = document.getElementById('wiz-ts-date').value;
    if(!date){ UI.toast('Date is required','error'); return; }
    const start = document.getElementById('wiz-ts-start').value;
    const end = document.getElementById('wiz-ts-end').value;
    if(!start||!end){ UI.toast('Start/end times required','error'); return; }
    let label = document.getElementById('wiz-ts-label').value.trim();
    if(!label){
      try{ const [h,m]=start.split(':'); const d=new Date(); d.setHours(parseInt(h),parseInt(m)); label=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
      catch(e){ label=start; }
    }
    this.timeSlots.push({id:uid(), label, day:date, start, end});
    document.getElementById('wiz-ts-label').value = '';
    this._renderLists();
  },
  removeTimeSlot(id){ this.timeSlots = this.timeSlots.filter(t => t.id!==id); this._renderLists(); },
  editTimeSlot(id){
    const t = this.timeSlots.find(x => x.id===id); if(!t) return;
    this.removeTimeSlot(id);
    document.getElementById('wiz-ts-date').value = t.day;
    document.getElementById('wiz-ts-start').value = t.start;
    document.getElementById('wiz-ts-end').value = t.end;
    document.getElementById('wiz-ts-label').value = t.label || '';
  },

  // ---- ROOMS (Step 3) ----
  addRoom(){
    const name = document.getElementById('wiz-room-name').value.trim();
    if(!name){ UI.toast('Room name required','error'); return; }
    const cost = parseInt(document.getElementById('wiz-room-cost').value)||0;
    const location = document.getElementById('wiz-room-location').value.trim();
    const availableSlots = [...document.querySelectorAll('#wiz-room-avail-slots input:checked')].map(c => c.value);
    this.rooms.push({id:uid(), name, capacity:this.roomCap, costPerHour:cost, location, equipment:[...this.selectedEquipment], availableSlots});
    document.getElementById('wiz-room-name').value = '';
    document.getElementById('wiz-room-location').value = '';
    this.selectedEquipment = [];
    document.querySelectorAll('#wiz-equipment-tags .tag-chip').forEach(c => c.classList.remove('selected'));
    this._renderLists();
  },
  removeRoom(id){ this.rooms = this.rooms.filter(r => r.id!==id); this._renderLists(); },
  editRoom(id){
    const r = this.rooms.find(x => x.id===id); if(!r) return;
    this.removeRoom(id);
    document.getElementById('wiz-room-name').value = r.name;
    this.roomCap = r.capacity; document.getElementById('wiz-room-cap-display').value = r.capacity;
    document.getElementById('wiz-room-cost').value = r.costPerHour;
    document.getElementById('wiz-room-location').value = r.location || '';
    this.selectedEquipment = [...(r.equipment||[])];
    document.querySelectorAll('#wiz-equipment-tags .tag-chip').forEach(c => {
      const eq = c.textContent.trim();
      c.classList.toggle('selected', this.selectedEquipment.includes(eq));
    });
  },

  _refreshRoomSlots(){
    const wrap = document.getElementById('wiz-room-slots-wrap');
    const container = document.getElementById('wiz-room-avail-slots');
    if(!this.timeSlots.length){ wrap.style.display='none'; return; }
    wrap.style.display='block';
    container.innerHTML = this.timeSlots.map(t => `<label class="wiz-cb-label"><input type="checkbox" value="${t.id}" checked> ${t.day} ${t.label}</label>`).join('');
  },

  // ---- SPEAKERS (Step 4) ----
  addSpeaker(){
    const name = document.getElementById('wiz-speaker-name').value.trim();
    if(!name){ UI.toast('Speaker name required','error'); return; }
    const topic = document.getElementById('wiz-speaker-topic').value.trim() || 'TBA';
    const fee = parseInt(document.getElementById('wiz-speaker-fee').value)||0;
    const preferredSlots = [...document.querySelectorAll('#wiz-spk-pref-slots input:checked')].map(c => c.value);
    // Collect members
    const memberRows = document.querySelectorAll('#wiz-members-container .wiz-member-row');
    const members = [];
    memberRows.forEach(row => {
      const n = (row.querySelector('.m-name')?.value||'').trim();
      const r = (row.querySelector('.m-roll')?.value||'').trim();
      const p = (row.querySelector('.m-phone')?.value||'').trim();
      const e = (row.querySelector('.m-email')?.value||'').trim();
      if(n||r||p||e) members.push({name:n,roll:r,phone:p,email:e});
    });
    this.speakers.push({id:uid(), name, topic, duration:this.spkDur, fee, preferredSlots:preferredSlots.length?preferredSlots:this.timeSlots.map(t=>t.id), members});
    document.getElementById('wiz-speaker-name').value = '';
    document.getElementById('wiz-speaker-topic').value = '';
    document.getElementById('wiz-members-container').innerHTML = '';
    this._renderLists();
  },
  removeSpeaker(id){ this.speakers = this.speakers.filter(s => s.id!==id); this._renderLists(); },
  editSpeaker(id){
    const s = this.speakers.find(x => x.id===id); if(!s) return;
    this.removeSpeaker(id);
    document.getElementById('wiz-speaker-name').value = s.name;
    document.getElementById('wiz-speaker-topic').value = s.topic || '';
    document.getElementById('wiz-speaker-fee').value = s.fee || 0;
    this.spkDur = s.duration; document.getElementById('wiz-spk-dur-display').value = s.duration;
    // Re-populate members
    const mc = document.getElementById('wiz-members-container'); mc.innerHTML = '';
    (s.members||[]).forEach((m,i) => {
      mc.insertAdjacentHTML('beforeend', `<div class="wiz-member-row">
        <div class="wiz-member-header"><span class="wiz-member-label">Member #${i+1}</span>
        <button class="wiz-member-del" onclick="this.closest('.wiz-member-row').remove()">✕</button></div>
        <div class="wiz-member-grid"><input class="wiz-member-input m-name" placeholder="Full Name" value="${m.name||''}">
        <input class="wiz-member-input m-roll" placeholder="Roll/ID No." value="${m.roll||''}"></div>
        <div class="wiz-member-grid" style="margin-top:4px"><input class="wiz-member-input m-phone" placeholder="Phone" value="${m.phone||''}">
        <input class="wiz-member-input m-email" placeholder="Email" value="${m.email||''}"></div></div>`);
    });
  },

  addMemberRow(){
    const container = document.getElementById('wiz-members-container');
    const idx = container.querySelectorAll('.wiz-member-row').length;
    container.insertAdjacentHTML('beforeend', `<div class="wiz-member-row">
      <div class="wiz-member-header"><span class="wiz-member-label">Member #${idx+1}</span>
      <button class="wiz-member-del" onclick="this.closest('.wiz-member-row').remove()">✕</button></div>
      <div class="wiz-member-grid"><input class="wiz-member-input m-name" placeholder="Full Name">
      <input class="wiz-member-input m-roll" placeholder="Roll/ID No."></div>
      <div class="wiz-member-grid" style="margin-top:4px"><input class="wiz-member-input m-phone" placeholder="Phone">
      <input class="wiz-member-input m-email" placeholder="Email"></div></div>`);
  },

  _refreshSpeakerSlots(){
    const wrap = document.getElementById('wiz-spk-slots-wrap');
    const container = document.getElementById('wiz-spk-pref-slots');
    if(!this.timeSlots.length){ wrap.style.display='none'; return; }
    wrap.style.display='block';
    container.innerHTML = this.timeSlots.map(t => `<label class="wiz-cb-label"><input type="checkbox" value="${t.id}" checked> ${t.day} ${t.label}</label>`).join('');
  },

  // ---- ATTENDEES (Step 5) ----
  addAttendee(){
    const name = document.getElementById('wiz-att-name').value.trim();
    if(!name){ UI.toast('Attendee name required','error'); return; }
    const vipLevel = Math.max(0,Math.min(5,parseInt(document.getElementById('wiz-att-vip').value)||0));
    const interests = document.getElementById('wiz-att-interests').value.split(',').map(s=>s.trim()).filter(Boolean);
    const preferredSpeakers = [...document.querySelectorAll('#wiz-att-pref-speakers input:checked')].map(c => c.value);
    this.attendees.push({id:uid(), name, vipLevel, interests, preferredSpeakers});
    document.getElementById('wiz-att-name').value = '';
    document.getElementById('wiz-att-interests').value = '';
    this._renderLists();
  },
  removeAttendee(id){ this.attendees = this.attendees.filter(a => a.id!==id); this._renderLists(); },
  editAttendee(id){
    const a = this.attendees.find(x => x.id===id); if(!a) return;
    this.removeAttendee(id);
    document.getElementById('wiz-att-name').value = a.name;
    document.getElementById('wiz-att-vip').value = a.vipLevel || 0;
    document.getElementById('wiz-att-interests').value = (a.interests||[]).join(', ');
  },

  _refreshAttendeeSpeakers(){
    const wrap = document.getElementById('wiz-att-spk-wrap');
    const container = document.getElementById('wiz-att-pref-speakers');
    if(!this.speakers.length){ wrap.style.display='none'; return; }
    wrap.style.display='block';
    container.innerHTML = this.speakers.map(s => `<label class="wiz-cb-label"><input type="checkbox" value="${s.id}"> ${s.name}</label>`).join('');
  },

  // ---- RESOURCES (Step 6) ----
  addResource(){
    const name = document.getElementById('wiz-resource-name').value.trim();
    if(!name){ UI.toast('Resource name required','error'); return; }
    const unit = document.getElementById('wiz-resource-unit').value;
    this.resources.push({id:uid(), name, qty:this.resQty, unit});
    document.getElementById('wiz-resource-name').value = '';
    this._renderLists();
  },
  quickAddResource(name, unit){
    this.resources.push({id:uid(), name, qty:0, unit});
    this._renderLists();
  },
  removeResource(id){ this.resources = this.resources.filter(r => r.id!==id); this._renderLists(); },
  editResource(id){
    const r = this.resources.find(x => x.id===id); if(!r) return;
    this.removeResource(id);
    document.getElementById('wiz-resource-name').value = r.name;
    this.resQty = r.qty; document.getElementById('wiz-res-qty-display').value = r.qty;
    document.getElementById('wiz-resource-unit').value = r.unit;
  },

  // ---- RENDER ALL LISTS ----
  _renderLists(){
    // Time slots
    document.getElementById('wiz-timeslots-list').innerHTML = this.timeSlots.map(t => `<div class="wiz-entity-row">
      <div class="wiz-entity-info"><span class="material-symbols-outlined">calendar_month</span>
      <div><div class="wiz-entity-name">${t.day} · ${t.label}</div><div class="wiz-entity-sub">${t.start} – ${t.end}</div></div></div>
      <div style="display:flex;gap:4px"><button class="wiz-entity-edit" onclick="App.wiz.editTimeSlot('${t.id}')"><span class="material-symbols-outlined">edit</span></button>
      <button class="wiz-entity-delete" onclick="App.wiz.removeTimeSlot('${t.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`).join('');
    // Rooms
    document.getElementById('wiz-rooms-list').innerHTML = this.rooms.map(r => `<div class="wiz-entity-row">
      <div class="wiz-entity-info"><span class="material-symbols-outlined">meeting_room</span>
      <div><div class="wiz-entity-name">${r.name}</div><div class="wiz-entity-sub">Cap: ${r.capacity} · $${r.costPerHour}/hr · ${r.location||'–'}</div></div></div>
      <div style="display:flex;gap:4px"><button class="wiz-entity-edit" onclick="App.wiz.editRoom('${r.id}')"><span class="material-symbols-outlined">edit</span></button>
      <button class="wiz-entity-delete" onclick="App.wiz.removeRoom('${r.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`).join('');
    // Speakers
    document.getElementById('wiz-speakers-list').innerHTML = this.speakers.map(s => `<div class="wiz-entity-row">
      <div class="wiz-entity-info"><span class="material-symbols-outlined">person</span>
      <div><div class="wiz-entity-name">${s.name}</div><div class="wiz-entity-sub">${s.topic} · ${s.duration}min · $${s.fee}${s.members?.length?' · '+s.members.length+' members':''}</div></div></div>
      <div style="display:flex;gap:4px"><button class="wiz-entity-edit" onclick="App.wiz.editSpeaker('${s.id}')"><span class="material-symbols-outlined">edit</span></button>
      <button class="wiz-entity-delete" onclick="App.wiz.removeSpeaker('${s.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`).join('');
    // Attendees
    document.getElementById('wiz-attendees-list').innerHTML = this.attendees.map(a => `<div class="wiz-entity-row">
      <div class="wiz-entity-info"><span class="material-symbols-outlined">person</span>
      <div><div class="wiz-entity-name">${a.name} ${'⭐'.repeat(a.vipLevel||0)}</div><div class="wiz-entity-sub">${(a.interests||[]).join(', ')||'No interests'}</div></div></div>
      <div style="display:flex;gap:4px"><button class="wiz-entity-edit" onclick="App.wiz.editAttendee('${a.id}')"><span class="material-symbols-outlined">edit</span></button>
      <button class="wiz-entity-delete" onclick="App.wiz.removeAttendee('${a.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`).join('');
    // Resources
    document.getElementById('wiz-resources-list').innerHTML = this.resources.map(r => `<div class="wiz-entity-row">
      <div class="wiz-entity-info"><span class="material-symbols-outlined">inventory_2</span>
      <span class="wiz-entity-name">${r.name}</span></div>
      <div style="display:flex;align-items:center;gap:10px"><span class="wiz-entity-val" style="font-size:14px">${r.qty} ${r.unit}</span>
      <button class="wiz-entity-edit" onclick="App.wiz.editResource('${r.id}')"><span class="material-symbols-outlined">edit</span></button>
      <button class="wiz-entity-delete" onclick="App.wiz.removeResource('${r.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`).join('');
  },

  // ---- EQUIPMENT CHIPS ----
  renderEquipmentChips(){
    document.getElementById('wiz-equipment-tags').innerHTML = EQUIPMENT_OPTIONS.map(eq =>
      `<span class="tag-chip" onclick="App.wiz.toggleEquipment(this,'${eq}')"><span class="material-symbols-outlined" style="font-size:14px">${
        eq==='projector'?'videocam':eq==='microphone'?'mic':eq==='wifi'?'wifi':eq==='stage'?'stairs':eq==='whiteboard'?'edit_note':eq==='monitors'?'monitor':eq==='streaming'?'cast':eq==='recording'?'fiber_manual_record':eq==='lighting'?'light':eq==='power-strips'?'power':'devices'
      }</span>${eq}</span>`
    ).join('');
  },

  // ---- REVIEW (Step 7) ----
  _buildReview(){
    const name = document.getElementById('wiz-event-name').value || 'Unnamed';
    const totalA = this.attendees.length;
    const budget = document.getElementById('wiz-total-budget').value || '0';
    document.getElementById('wiz-review-summary').innerHTML = `
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">event</span><span class="wiz-entity-name">Event</span></div><span style="color:var(--d-gold);font-weight:700">${name}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">calendar_month</span><span class="wiz-entity-name">Time Slots</span></div><span style="color:var(--d-gold);font-weight:700">${this.timeSlots.length}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">meeting_room</span><span class="wiz-entity-name">Rooms</span></div><span style="color:var(--d-gold);font-weight:700">${this.rooms.length}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">person</span><span class="wiz-entity-name">Speakers</span></div><span style="color:var(--d-gold);font-weight:700">${this.speakers.length}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">groups</span><span class="wiz-entity-name">Attendees</span></div><span style="color:var(--d-gold);font-weight:700">${totalA}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">inventory_2</span><span class="wiz-entity-name">Resources</span></div><span style="color:var(--d-gold);font-weight:700">${this.resources.length}</span></div>
      <div class="wiz-entity-row"><div class="wiz-entity-info"><span class="material-symbols-outlined">payments</span><span class="wiz-entity-name">Budget</span></div><span style="color:var(--d-gold);font-weight:700">$${budget}</span></div>
      ${this.timeSlots.length && this.rooms.length && this.speakers.length
        ? '<div style="margin-top:16px;padding:12px;border-radius:10px;background:rgba(0,184,148,.1);color:#00b894;font-size:13px;font-weight:600;text-align:center">✅ Ready for AI schedule generation!</div>'
        : '<div style="margin-top:16px;padding:12px;border-radius:10px;background:rgba(214,48,49,.1);color:#d63031;font-size:13px;font-weight:600;text-align:center">⚠️ Need at least: time slots + rooms + speakers for AI scheduling</div>'}`;
  },

  // ---- SAVE EVENT ----
  saveEvent(){
    const name = document.getElementById('wiz-event-name').value.trim() || 'Untitled Event';
    const eventType = document.getElementById('wiz-event-type').value;
    const date = document.getElementById('wiz-start-date').value;
    const time = document.getElementById('wiz-start-time').value || '09:00';
    const endDate = document.getElementById('wiz-end-date').value;
    const endTime = document.getElementById('wiz-end-time').value;
    const location = document.getElementById('wiz-event-loc').value.trim() || 'TBA';
    const description = document.getElementById('wiz-event-desc').value.trim();
    const rawBudget = parseInt(document.getElementById('wiz-total-budget').value);
    const totalBudget = isNaN(rawBudget) ? 5000 : rawBudget;

    const event = {
      id: this.editingEventId || uid(),
      name, eventType, date, time, endDate, endTime, location, description,
      visibility: this.visibility,
      speakers: clone(this.speakers),
      venues: clone(this.rooms),
      timeSlots: clone(this.timeSlots),
      attendees: clone(this.attendees),
      resources: clone(this.resources),
      budget: { total: totalBudget },
      sessions: [],
      satisfaction: null
    };

    // Ensure venues have availableSlots
    event.venues.forEach(v => {
      if(!v.availableSlots?.length) v.availableSlots = event.timeSlots.map(t => t.id);
    });

    // Run CSP solver if we have the data
    if(event.speakers.length && event.venues.length && event.timeSlots.length){
      const et = EVENT_TYPES[eventType] || EVENT_TYPES.conference;
      App.state.init({
        eventType, eventLabels: clone(et.labels),
        speakers: event.speakers, venues: event.venues,
        timeSlots: event.timeSlots, attendees: event.attendees,
        budget: event.budget, sessions: [], satisfaction: null
      });
      App.orchestrator.clearLogs();
      App.orchestrator.log('info','Orchestrator','Trigger: New event created');
      const result = App.orchestrator.run(App.state.current);
      if(result.success){
        event.sessions = result.sessions;
        event.budget = result.budget;
        event.satisfaction = result.satisfaction;
      }
    }

    // Add or update event
    if(this.editingEventId){
      const idx = App.events.findIndex(e => e.id === this.editingEventId);
      if(idx >= 0) App.events[idx] = event;
    } else {
      App.events.push(event);
    }
    App.saveEvents();
    App.closeWizard();
    UI.renderTimeline();
    UI.toast(this.editingEventId ? 'Event updated!' : `Event "${name}" created with ${event.sessions.length} sessions!`, 'success');
  },

  // ---- RESET ----
  reset(){
    this.step = 1; this.visibility = 'Public'; this.editingEventId = null;
    this.timeSlots = []; this.rooms = []; this.speakers = [];
    this.attendees = []; this.resources = []; this.selectedEquipment = [];
    this.roomCap = 50; this.spkDur = 45; this.resQty = 10;
  }
};
