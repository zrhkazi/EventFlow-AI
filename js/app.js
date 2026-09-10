// ============================================================
// EventFlow AI — Main App Controller
// ============================================================

const App = {
  events: [],
  currentEventId: null,
  state: new StateManager(),
  orchestrator: new AgentOrchestrator(),
  wiz: Wizard,
  _dark: false,

  // ---- INIT ----
  init(){
    // Auth guard
    if(!this._checkAuth()) return;
    this.loadEvents();
    this._setProfileFromAuth();
    this._handleJoinEvent();
    UI.renderTimeline();
    this.wiz.renderEquipmentChips();
    this.wiz._renderBreadcrumb();
    this.bindGlobalEvents();
    // Set default date for wizard
    const today = new Date().toISOString().split('T')[0];
    const startDate = document.getElementById('wiz-start-date');
    const endDate = document.getElementById('wiz-end-date');
    const tsDate = document.getElementById('wiz-ts-date');
    if(startDate) startDate.value = today;
    if(endDate) endDate.value = today;
    if(tsDate) tsDate.value = today;
  },

  _checkAuth(){
    try{
      const auth = JSON.parse(localStorage.getItem('nexus_auth'));
      if(auth && auth.loggedIn) return true;
    }catch(e){}
    window.location.href = 'login.html';
    return false;
  },

  _setProfileFromAuth(){
    try{
      const auth = JSON.parse(localStorage.getItem('nexus_auth'));
      if(auth){
        const nameEl = document.querySelector('.profile-name');
        const emailEl = document.querySelector('.profile-email');
        if(nameEl) nameEl.textContent = auth.name || 'EventFlow AI';
        if(emailEl) emailEl.textContent = auth.email || 'agent@eventflow.ai';
      }
    }catch(e){}
  },

  _handleJoinEvent(){
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join') || localStorage.getItem('nexus_join_event');
    if(!joinId) return;
    localStorage.removeItem('nexus_join_event');
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    // Find event by ID
    const ev = this.events.find(e => e.id === joinId);
    if(ev){
      UI.toast(`Joined event: ${ev.name}`, 'success');
      setTimeout(() => this.manageEvent(ev.id), 300);
    } else {
      UI.toast('Event not found. It may have been deleted.', 'error');
    }
  },

  logout(){
    localStorage.removeItem('nexus_auth');
    window.location.href = 'login.html';
  },

  // ---- TIMELINE TABS ----
  switchTimelineTab(tab){
    document.getElementById('btn-upcoming').classList.toggle('active', tab==='upcoming');
    document.getElementById('btn-upcoming').classList.toggle('glow', tab==='upcoming');
    document.getElementById('btn-past').classList.toggle('active', tab==='past');
    document.getElementById('btn-past').classList.toggle('glow', tab==='past');
    document.getElementById('view-upcoming').style.display = tab==='upcoming' ? '' : 'none';
    document.getElementById('view-past').style.display = tab==='past' ? '' : 'none';
  },

  // ---- SHARE EVENT ----
  shareEvent(id){
    const url = `${window.location.origin}${window.location.pathname}?join=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      UI.toast('Join link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy this link to share:', url);
    });
  },

  // ---- EVENT PERSISTENCE ----
  loadEvents(){
    try { const s = localStorage.getItem('nexus_events'); if(s) this.events = JSON.parse(s); }
    catch(e){ this.events = []; }
  },
  saveEvents(){
    try { localStorage.setItem('nexus_events', JSON.stringify(this.events)); } catch(e){}
  },

  // ---- WIZARD OPEN/CLOSE ----
  openWizard(eventId){
    this.wiz.reset();
    if(eventId){
      const ev = this.events.find(e => e.id === eventId);
      if(!ev) return;
      this.wiz.editingEventId = ev.id;
      document.getElementById('modal-title').textContent = 'Edit Event';
      document.getElementById('wiz-event-name').value = ev.name;
      document.getElementById('wiz-event-type').value = ev.eventType || 'conference';
      document.getElementById('wiz-start-date').value = ev.date;
      document.getElementById('wiz-start-time').value = ev.time;
      document.getElementById('wiz-end-date').value = ev.endDate || '';
      document.getElementById('wiz-end-time').value = ev.endTime || '';
      document.getElementById('wiz-event-loc').value = ev.location || '';
      document.getElementById('wiz-event-desc').value = ev.description || '';
      document.getElementById('wiz-total-budget').value = ev.budget?.total || '';
      this.wiz.setVisibility(ev.visibility || 'Public');
      this.wiz.timeSlots = clone(ev.timeSlots || []);
      this.wiz.rooms = clone(ev.venues || []);
      this.wiz.speakers = clone(ev.speakers || []);
      this.wiz.attendees = clone(ev.attendees || []);
      this.wiz.resources = clone(ev.resources || []);
    } else {
      document.getElementById('modal-title').textContent = 'Create Event';
      document.getElementById('wiz-event-name').value = '';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('wiz-start-date').value = today;
      document.getElementById('wiz-start-time').value = '09:00';
      document.getElementById('wiz-end-date').value = today;
      document.getElementById('wiz-end-time').value = '17:00';
      document.getElementById('wiz-event-loc').value = '';
      document.getElementById('wiz-event-desc').value = '';
      document.getElementById('wiz-event-type').value = 'conference';
      document.getElementById('wiz-total-budget').value = '';
      this.wiz.setVisibility('Public');
    }
    this.wiz._renderLists();
    document.getElementById('event-modal').classList.add('active');
    this.wiz.goToStep(1);
  },
  closeWizard(){ document.getElementById('event-modal').classList.remove('active'); },

  deleteEvent(id){
    const ev = this.events.find(e => e.id === id);
    if(!ev || !confirm(`Delete event "${ev.name}"? This cannot be undone.`)) return;
    this.events = this.events.filter(e => e.id !== id);
    this.saveEvents();
    UI.renderTimeline();
    UI.toast('Event deleted', 'info');
  },

  // ---- MANAGE EVENT (enter dashboard mode) ----
  manageEvent(id){
    const ev = this.events.find(e => e.id === id);
    if(!ev) return;
    this.currentEventId = id;
    const et = EVENT_TYPES[ev.eventType] || EVENT_TYPES.conference;
    this.state.init({
      eventType: ev.eventType, eventLabels: clone(et.labels),
      speakers: clone(ev.speakers||[]), venues: clone(ev.venues||[]),
      timeSlots: clone(ev.timeSlots||[]), attendees: clone(ev.attendees||[]),
      budget: clone(ev.budget||{total:5000}), sessions: clone(ev.sessions||[]),
      satisfaction: clone(ev.satisfaction||null)
    });
    // Re-run optimization if no sessions exist but data is present
    if(!ev.sessions?.length && ev.speakers?.length && ev.venues?.length && ev.timeSlots?.length){
      this.runOptimization('Entering event management');
    }
    document.getElementById('timeline-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'flex';
    document.getElementById('dashboard-view').style.flexDirection = 'column';
    document.getElementById('dashboard-view').style.flex = '1';
    document.getElementById('backBtn').style.display = '';
    UI.switchView('dashboard');
  },

  backToEvents(){
    this._syncEventFromState();
    this.currentEventId = null;
    this.state.history = [];
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('timeline-view').style.display = '';
    document.getElementById('backBtn').style.display = 'none';
    // Reset nav icons
    document.querySelectorAll('.nav-icon-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-icon-btn[data-view="dashboard"]').classList.add('active');
    UI.renderTimeline();
    UI._renderCoT();
    UI._undoBtn();
  },

  _syncEventFromState(){
    if(!this.currentEventId || !this.state.current) return;
    const idx = this.events.findIndex(e => e.id === this.currentEventId);
    if(idx < 0) return;
    const s = this.state.current;
    const ev = this.events[idx];
    ev.speakers = clone(s.speakers||[]);
    ev.venues = clone(s.venues||[]);
    ev.timeSlots = clone(s.timeSlots||[]);
    ev.attendees = clone(s.attendees||[]);
    ev.budget = clone(s.budget||{total:5000});
    ev.sessions = clone(s.sessions||[]);
    ev.satisfaction = clone(s.satisfaction||null);
    this.saveEvents();
  },

  // ---- CSP SOLVER ----
  runOptimization(reason){
    this.orchestrator.clearLogs();
    this.orchestrator.log('info','Orchestrator',`Trigger: ${reason}`);
    const old = this.state.current.sessions ? [...this.state.current.sessions] : [];
    const result = this.orchestrator.run(this.state.current);
    if(result.success){
      const changes = this.state.diff(old, result.sessions);
      UI.changeReasons = {};
      for(const c of changes){
        if(c.type==='moved'||c.type==='added') UI.changeReasons[c.session.speakerId] = c.reason;
        this.orchestrator.log(c.type==='removed'?'conflict':'success','Diff Engine',c.reason);
      }
      this.state.update({sessions:result.sessions, budget:result.budget, satisfaction:result.satisfaction});
    } else {
      this.state.update({sessions:[], satisfaction:result.satisfaction});
      UI.toast('No feasible schedule — check agent log','error');
    }
    this._syncEventFromState();
  },

  reoptimize(reason){
    UI.showProgress(`Re-optimizing: ${reason}...`);
    setTimeout(() => { this.runOptimization(reason); UI.hideProgress(); UI.render(); }, 50);
  },

  // ---- SPEAKER CRUD (Dashboard inline) ----
  showSpeakerModal(id){
    const s = this.state.current; const sp = id ? (s.speakers||[]).find(x=>x.id===id) : null;
    const editId = sp ? sp.id : uid(); const allSlots = s.timeSlots||[];
    let slotsHtml = '';
    if(!allSlots.length) slotsHtml = `<p style="color:#636e72;font-size:12px">No ${L('timeslots')} yet.</p>`;
    else { slotsHtml = '<div class="checkbox-grid">'; for(const t of allSlots){ const chk=sp?(sp.preferredSlots||[]).includes(t.id):true; slotsHtml+=`<label class="cb-label"><input type="checkbox" class="sp-slot" value="${t.id}" ${chk?'checked':''}> ${formatDate(t.day)} ${t.label}</label>`; } slotsHtml+='</div>'; }
    const members = sp?.members||[];
    let membersHtml = `<div class="form-group"><label>Team Members (<span id="memberCount">${members.length}</span>)</label><div id="membersContainer">`;
    members.forEach((m,i) => { membersHtml += this._memberRowHTML(i,m); });
    membersHtml += `</div><button type="button" class="ebtn primary" style="margin-top:6px" onclick="App._addMemberRow()">+ Add Member</button></div>`;
    UI.showModal(`<h2>${sp?'Edit':'Add'} ${L('speaker')}</h2>
      <div class="form-group"><label>Name*</label><input class="form-input" id="fSpName" value="${sp?.name||''}" placeholder="Name"></div>
      <div class="form-group"><label>${L('topic')}*</label><input class="form-input" id="fSpTopic" value="${sp?.topic||''}" placeholder="${L('topic')}"></div>
      <div class="form-row"><div class="form-group"><label>${L('duration')} (min)*</label><input class="form-input" id="fSpDur" type="number" value="${sp?.duration||30}" min="1" max="120"></div>
      <div class="form-group"><label>${L('fee')} ($)*</label><input class="form-input" id="fSpFee" type="number" value="${sp?.fee||500}" min="0"></div></div>
      <div class="form-group"><label>Preferred ${L('timeslots')}</label>${slotsHtml}</div>
      ${membersHtml}
      <div class="form-actions"><button class="modal-btn cancel" onclick="UI.hideModal()">Cancel</button>
      <button class="modal-btn submit" onclick="App.saveSpeaker('${editId}',${sp?'true':'false'})">${sp?'Save':'Add'}</button></div>`);
  },
  _memberRowHTML(idx,m){
    m=m||{name:'',roll:'',phone:'',email:''};
    return `<div class="member-row" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Member #${idx+1}</span>
        <button style="background:var(--red);color:white;border:none;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;font-weight:600" onclick="this.closest('.member-row').remove();App._updateMemberCount()">x</button>
      </div>
      <div class="form-row"><input class="form-input m-name" placeholder="Full Name" value="${m.name||''}"><input class="form-input m-roll" placeholder="Roll/ID" value="${m.roll||''}"></div>
      <div class="form-row" style="margin-top:4px"><input class="form-input m-phone" placeholder="Phone" value="${m.phone||''}"><input class="form-input m-email" placeholder="Email" value="${m.email||''}"></div></div>`;
  },
  _addMemberRow(){
    const c=document.getElementById('membersContainer'); const idx=c.querySelectorAll('.member-row').length;
    c.insertAdjacentHTML('beforeend',this._memberRowHTML(idx)); this._updateMemberCount();
  },
  _updateMemberCount(){ const el=document.getElementById('memberCount'); if(el) el.textContent=document.querySelectorAll('#membersContainer .member-row').length; },
  saveSpeaker(id,isEdit){
    const name=document.getElementById('fSpName').value.trim(); const topic=document.getElementById('fSpTopic').value.trim();
    const dur=parseInt(document.getElementById('fSpDur').value)||30; const fee=parseInt(document.getElementById('fSpFee').value)||0;
    if(!name){UI.toast('Name is required','error');return;} if(!topic){UI.toast(`${L('topic')} is required`,'error');return;}
    const slots=[...document.querySelectorAll('.sp-slot:checked')].map(c=>c.value);
    const allSlots=(this.state.current.timeSlots||[]).map(t=>t.id);
    const memberRows=document.querySelectorAll('.member-row'); const members=[];
    memberRows.forEach(row=>{ const n=(row.querySelector('.m-name')?.value||'').trim(); const r=(row.querySelector('.m-roll')?.value||'').trim();
      const p=(row.querySelector('.m-phone')?.value||'').trim(); const e=(row.querySelector('.m-email')?.value||'').trim();
      if(n||r||p||e) members.push({name:n,roll:r,phone:p,email:e}); });
    const obj={id,name,topic,duration:dur,fee,preferredSlots:slots.length?slots:allSlots,members};
    this.state.snapshot();
    if(isEdit==true){const i=this.state.current.speakers.findIndex(s=>s.id===id);if(i>=0)this.state.current.speakers[i]=obj;}
    else this.state.current.speakers.push(obj);
    UI.hideModal(); this.reoptimize(isEdit==true?`${L('speaker')} "${name}" updated`:`${L('speaker')} "${name}" added`);
  },
  removeSpeaker(id){
    const sp=this.state.current.speakers.find(s=>s.id===id);if(!sp)return;
    if(!confirm(`Remove ${L('speaker')} "${sp.name}"?`))return;
    this.state.snapshot(); this.state.current.speakers=this.state.current.speakers.filter(s=>s.id!==id);
    this.state.current.sessions=(this.state.current.sessions||[]).filter(s=>s.speakerId!==id);
    this.reoptimize(`${L('speaker')} "${sp.name}" removed`);
  },

  // ---- VENUE CRUD ----
  showVenueModal(id){
    const s=this.state.current; const v=id?(s.venues||[]).find(x=>x.id===id):null; const editId=v?v.id:uid();
    let eqHtml='<div class="checkbox-grid">'; for(const eq of EQUIPMENT_OPTIONS){ const chk=v?(v.equipment||[]).includes(eq):false; eqHtml+=`<label class="cb-label"><input type="checkbox" class="v-eq" value="${eq}" ${chk?'checked':''}> ${eq}</label>`; } eqHtml+='</div>';
    const allSlots=s.timeSlots||[]; let slHtml='';
    if(!allSlots.length) slHtml=`<p style="color:#636e72;font-size:12px">No ${L('timeslots')} yet.</p>`;
    else { slHtml='<div class="checkbox-grid">'; for(const t of allSlots){ const chk=v?(v.availableSlots||[]).includes(t.id):true; slHtml+=`<label class="cb-label"><input type="checkbox" class="v-slot" value="${t.id}" ${chk?'checked':''}> ${formatDate(t.day)} ${t.label}</label>`; } slHtml+='</div>'; }
    UI.showModal(`<h2>${v?'Edit':'Add'} ${L('venue')}</h2>
      <div class="form-group"><label>Name*</label><input class="form-input" id="fVName" value="${v?.name||''}" placeholder="${L('venue')} name"></div>
      <div class="form-row"><div class="form-group"><label>Capacity*</label><input class="form-input" id="fVCap" type="number" value="${v?.capacity||100}" min="1"></div>
      <div class="form-group"><label>Cost/hr ($)*</label><input class="form-input" id="fVCost" type="number" value="${v?.costPerHour||100}" min="0"></div></div>
      <div class="form-group"><label>Equipment</label>${eqHtml}</div>
      <div class="form-group"><label>Available ${L('timeslots')}</label>${slHtml}</div>
      <div class="form-actions"><button class="modal-btn cancel" onclick="UI.hideModal()">Cancel</button>
      <button class="modal-btn submit" onclick="App.saveVenue('${editId}',${v?'true':'false'})">${v?'Save':'Add'}</button></div>`);
  },
  saveVenue(id,isEdit){
    const name=document.getElementById('fVName').value.trim(); if(!name){UI.toast('Name required','error');return;}
    const cap=parseInt(document.getElementById('fVCap').value)||100; const cost=parseInt(document.getElementById('fVCost').value)||0;
    const equipment=[...document.querySelectorAll('.v-eq:checked')].map(c=>c.value);
    const availableSlots=[...document.querySelectorAll('.v-slot:checked')].map(c=>c.value);
    const obj={id,name,capacity:cap,costPerHour:cost,equipment,availableSlots};
    this.state.snapshot();
    if(isEdit==true){const i=this.state.current.venues.findIndex(v=>v.id===id);if(i>=0)this.state.current.venues[i]=obj;}
    else this.state.current.venues.push(obj);
    UI.hideModal(); this.reoptimize(isEdit==true?`${L('venue')} "${name}" updated`:`${L('venue')} "${name}" added`);
  },
  removeVenue(id){const v=this.state.current.venues.find(x=>x.id===id);if(!v||!confirm(`Remove ${L('venue')} "${v.name}"?`))return;this.state.snapshot();this.state.current.venues=this.state.current.venues.filter(x=>x.id!==id);this.reoptimize(`${L('venue')} "${v.name}" removed`);},

  // ---- TIMESLOT CRUD ----
  showTimeSlotModal(id){
    const s=this.state.current;const t=id?(s.timeSlots||[]).find(x=>x.id===id):null;const editId=t?t.id:uid();
    const today=new Date().toISOString().split('T')[0];
    const dateVal=t?.day||today;
    UI.showModal(`<h2>${t?'Edit':'Add'} ${L('timeslot')}</h2>
      <div class="form-group"><label>Date*</label><input class="form-input" id="fTDay" type="date" value="${dateVal}"></div>
      <div class="form-group"><label>Label</label><input class="form-input" id="fTLabel" value="${t?.label||''}" placeholder="Auto-generated from time"></div>
      <div class="form-row"><div class="form-group"><label>Start*</label><input class="form-input" id="fTStart" type="time" value="${t?.start||'09:00'}"></div>
      <div class="form-group"><label>End*</label><input class="form-input" id="fTEnd" type="time" value="${t?.end||'09:45'}"></div></div>
      <div class="form-actions"><button class="modal-btn cancel" onclick="UI.hideModal()">Cancel</button>
      <button class="modal-btn submit" onclick="App.saveTimeSlot('${editId}',${t?'true':'false'})">${t?'Save':'Add'}</button></div>`);
  },
  saveTimeSlot(id,isEdit){
    const day=document.getElementById('fTDay').value;if(!day){UI.toast('Date required','error');return;}
    let label=document.getElementById('fTLabel').value.trim();
    const start=document.getElementById('fTStart').value;const end=document.getElementById('fTEnd').value;
    if(!start||!end){UI.toast('Start/end times required','error');return;}
    if(!label){try{const[h,m]=start.split(':');const d=new Date();d.setHours(parseInt(h),parseInt(m));label=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}catch(e){label=start;}}
    const obj={id,label,day,start,end};
    this.state.snapshot();
    if(isEdit==true){const i=this.state.current.timeSlots.findIndex(t=>t.id===id);if(i>=0)this.state.current.timeSlots[i]=obj;}
    else{this.state.current.timeSlots.push(obj);(this.state.current.venues||[]).forEach(v=>{if(!v.availableSlots)v.availableSlots=[];v.availableSlots.push(id);});}
    UI.hideModal();this.reoptimize(isEdit==true?`${L('timeslot')} updated`:`${L('timeslot')} added`);
  },
  removeTimeSlot(id){
    const t=this.state.current.timeSlots.find(x=>x.id===id);if(!t||!confirm(`Remove ${L('timeslot')} "${formatDate(t.day)} ${t.label}"?`))return;
    this.state.snapshot();this.state.current.timeSlots=this.state.current.timeSlots.filter(x=>x.id!==id);
    (this.state.current.venues||[]).forEach(v=>{v.availableSlots=(v.availableSlots||[]).filter(s=>s!==id);});
    (this.state.current.speakers||[]).forEach(sp=>{sp.preferredSlots=(sp.preferredSlots||[]).filter(s=>s!==id);});
    this.reoptimize(`${L('timeslot')} removed`);
  },

  // ---- ATTENDEE CRUD ----
  showAttendeeModal(id){
    const s=this.state.current;const a=id?(s.attendees||[]).find(x=>x.id===id):null;const editId=a?a.id:uid();
    let spHtml='';
    if(!(s.speakers||[]).length) spHtml=`<p style="color:#636e72;font-size:12px">No ${L('speakers')} yet.</p>`;
    else{spHtml='<div class="checkbox-grid">';for(const sp of(s.speakers||[])){const chk=a?(a.preferredSpeakers||[]).includes(sp.id):false;spHtml+=`<label class="cb-label"><input type="checkbox" class="a-sp" value="${sp.id}" ${chk?'checked':''}> ${sp.name}</label>`;}spHtml+='</div>';}
    UI.showModal(`<h2>${a?'Edit':'Add'} ${L('attendee')}</h2>
      <div class="form-group"><label>Name*</label><input class="form-input" id="fAName" value="${a?.name||''}" placeholder="Name"></div>
      <div class="form-row"><div class="form-group"><label>Interests</label><input class="form-input" id="fAInt" value="${(a?.interests||[]).join(', ')}" placeholder="AI, design"></div>
      <div class="form-group"><label>VIP Level (0-5)</label><input class="form-input" id="fAVip" type="number" value="${a?.vipLevel||0}" min="0" max="5"></div></div>
      <div class="form-group"><label>Preferred ${L('speakers')}</label>${spHtml}</div>
      <div class="form-actions"><button class="modal-btn cancel" onclick="UI.hideModal()">Cancel</button>
      <button class="modal-btn submit" onclick="App.saveAttendee('${editId}',${a?'true':'false'})">${a?'Save':'Add'}</button></div>`);
  },
  saveAttendee(id,isEdit){
    const name=document.getElementById('fAName').value.trim();if(!name){UI.toast('Name required','error');return;}
    const interests=document.getElementById('fAInt').value.split(',').map(s=>s.trim()).filter(Boolean);
    const vipLevel=Math.max(0,Math.min(5,parseInt(document.getElementById('fAVip').value)||0));
    const preferredSpeakers=[...document.querySelectorAll('.a-sp:checked')].map(c=>c.value);
    const obj={id,name,interests,vipLevel,preferredSpeakers};
    this.state.snapshot();
    if(isEdit==true){const i=this.state.current.attendees.findIndex(a=>a.id===id);if(i>=0)this.state.current.attendees[i]=obj;}
    else this.state.current.attendees.push(obj);
    UI.hideModal();this.reoptimize(isEdit==true?`${L('attendee')} updated`:`${L('attendee')} added`);
  },
  removeAttendee(id){const a=this.state.current.attendees.find(x=>x.id===id);if(!a||!confirm(`Remove ${L('attendee')} "${a.name}"?`))return;this.state.snapshot();this.state.current.attendees=this.state.current.attendees.filter(x=>x.id!==id);this.reoptimize(`${L('attendee')} "${a.name}" removed`);},

  // ---- BUDGET ----
  showBudgetModal(){
    const b=this.state.current.budget||{total:0};
    UI.showModal(`<h2>Set Event Budget</h2>
      <div class="form-group"><label>Total Budget ($)*</label><input class="form-input" id="fBTotal" type="number" value="${b.total}" min="100" step="100"></div>
      <div class="form-actions"><button class="modal-btn cancel" onclick="UI.hideModal()">Cancel</button>
      <button class="modal-btn submit" onclick="App.saveBudget()">Save</button></div>`);
  },
  saveBudget(){const t=parseInt(document.getElementById('fBTotal').value)||0;if(t<100){UI.toast('Budget min $100','error');return;} this.state.current.budget.total=t;UI.hideModal();this.reoptimize(`Budget set to $${t}`);},

  // ---- SESSION DETAIL ----
  showSessionDetail(speakerId){
    const s=this.state.current;const sess=(s.sessions||[]).find(x=>x.speakerId===speakerId);const sp=(s.speakers||[]).find(x=>x.id===speakerId);if(!sess||!sp)return;
    const slot=(s.timeSlots||[]).find(t=>t.id===sess.timeSlotId);const venue=(s.venues||[]).find(v=>v.id===sess.venueId);
    const reason=UI.changeReasons[speakerId]||'No recent changes';
    UI.showModal(`<h2>${sp.name}</h2><p style="color:#636e72;margin-bottom:16px">${sp.topic}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div><strong>${L('venue')}:</strong> ${venue?.name}</div><div><strong>Time:</strong> ${formatDate(slot?.day)} ${slot?.label}</div>
        <div><strong>${L('duration')}:</strong> ${sp.duration}min</div><div><strong>${L('fee')}:</strong> $${sp.fee}</div>
        <div><strong>${L('attendees')}:</strong> ${sess.attendeeCount}</div><div><strong>Cost:</strong> $${sess.cost}</div></div>
      <div style="margin-top:16px;padding:10px;border-radius:10px;background:rgba(108,92,231,.1);font-size:12px;color:var(--accent)"><strong>Last Change:</strong> ${reason}</div>
      <div class="form-actions"><button class="modal-btn cancel" onclick="App.removeSpeaker('${speakerId}');UI.hideModal()">Remove</button>
      <button class="modal-btn submit" onclick="App.showSpeakerModal('${speakerId}')">Edit</button></div>`);
  },

  // ---- SIMULATIONS ----
  simRemoveSpeaker(){const s=this.state.current;const sched=(s.speakers||[]).filter(sp=>(s.sessions||[]).some(x=>x.speakerId===sp.id));if(!sched.length){UI.toast(`No scheduled ${L('speakers')}`,'error');return;}const sp=sched[Math.floor(Math.random()*sched.length)];this.removeSpeaker(sp.id);},
  simBudgetCut(){const s=this.state.current;if(s.budget.total<=500){UI.toast('Budget at minimum','error');return;}const cut=Math.round(s.budget.total*0.2);s.budget.total=Math.max(500,s.budget.total-cut);this.reoptimize(`Budget cut by 20% (-$${cut})`);},
  simVenueReduce(){const s=this.state.current;const v=s.venues;if(!v.length){UI.toast('No venues','error');return;}const venue=v[Math.floor(Math.random()*v.length)];const old=venue.capacity;venue.capacity=Math.max(10,Math.floor(venue.capacity*0.5));this.reoptimize(`${venue.name} capacity: ${old} → ${venue.capacity}`);},

  // ---- UNDO / EXPORT / IMPORT ----
  undo(){if(this.state.undo()){UI.changeReasons={};this._syncEventFromState();UI.toast('Reverted','info');UI.render();}else UI.toast('Nothing to undo','error');},
  exportJSON(){
    const data = this.currentEventId ? this.state.current : {events:this.events};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`eventflow_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);UI.toast('Exported as JSON','success');
  },
  importJSON(){
    const input=document.createElement('input');input.type='file';input.accept='.json';
    input.onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();
      reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);
        if(data.events){this.events=data.events;this.saveEvents();UI.renderTimeline();UI.toast(`Imported ${data.events.length} events`,'success');return;}
        if(data.speakers&&data.venues){
          if(!data.eventLabels)data.eventLabels=EVENT_TYPES[data.eventType||'conference'].labels;
          if(!data.eventType)data.eventType='custom';
          // Wrap as event
          const ev={id:uid(),name:data.name||'Imported Event',eventType:data.eventType,date:new Date().toISOString().split('T')[0],time:'09:00',location:'Imported',visibility:'Public',...data,sessions:[],satisfaction:null};
          this.events.push(ev);this.saveEvents();UI.renderTimeline();UI.toast('Event imported','success');
        } else UI.toast('Invalid JSON','error');
      }catch(err){UI.toast('Invalid JSON: '+err.message,'error');}};reader.readAsText(file);};input.click();
  },

  // ---- CHATBOT ----
  toggleChat(){
    const panel=document.getElementById('chatPanel');
    panel.classList.toggle('open');
    if(panel.classList.contains('open')) document.getElementById('chatInput').focus();
  },
  sendChat(){
    const input=document.getElementById('chatInput');const q=input.value.trim();if(!q)return;
    input.value='';const msgs=document.getElementById('chatMessages');
    msgs.innerHTML+=`<div class="chat-msg user">${q}</div><div class="chat-typing" id="chatTyping">AI is thinking...</div>`;
    msgs.scrollTop=msgs.scrollHeight;
    setTimeout(()=>{const typing=document.getElementById('chatTyping');if(typing)typing.remove();
      msgs.innerHTML+=`<div class="chat-msg bot"><div class="bot-label">AI Assistant</div>${Chatbot.respond(q)}</div>`;
      msgs.scrollTop=msgs.scrollHeight;},300+Math.random()*400);
  },

  // ---- DARK MODE ----
  toggleDarkMode(){
    const r=document.documentElement.style;this._dark=!this._dark;
    if(this._dark){r.setProperty('--bg','#1a1b1e');r.setProperty('--bg2','#2d2e32');r.setProperty('--dark','#f0f0f0');r.setProperty('--sh-d','rgba(0,0,0,0.5)');r.setProperty('--sh-l','rgba(50,50,55,0.4)');r.setProperty('--border','rgba(60,60,65,0.6)');UI.toast('Dark mode','info');}
    else{r.setProperty('--bg','#e0e5ec');r.setProperty('--bg2','#d1d9e6');r.setProperty('--dark','#222528');r.setProperty('--sh-d','rgba(163,177,198,0.6)');r.setProperty('--sh-l','rgba(255,255,255,0.9)');r.setProperty('--border','rgba(163,177,198,0.9)');UI.toast('Light mode','info');}
  },

  // ---- GLOBAL EVENT BINDING ----
  bindGlobalEvents(){
    // Nav icon clicks
    document.querySelectorAll('.nav-icon-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        if(!this.currentEventId){
          // In timeline mode, clicking nav should enter last managed event or do nothing
          UI.toast('Open an event first to use this view','info');
          return;
        }
        UI.switchView(btn.dataset.view);
      });
    });
    // Modal close
    document.getElementById('modalOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) UI.hideModal(); });
    document.addEventListener('keydown', e => {
      if(e.key==='Escape'){ UI.hideModal(); this.closeWizard(); }
    });
  }
};

// ---- BOOTSTRAP ----
document.addEventListener('DOMContentLoaded', () => App.init());
