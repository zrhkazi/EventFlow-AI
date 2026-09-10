// ============================================================
// EventFlow AI — UI Rendering Module
// ============================================================

const UI = {
  currentView: 'dashboard',
  changeReasons: {},

  switchView(view){
    this.currentView = view;
    document.querySelectorAll('.nav-icon-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const s = App.state.current;
    const titles = {dashboard:'Dashboard', speakers:L('speakers'), venues:L('venues'), budget:'Budget', attendees:L('attendees'), timeslots:L('timeslots'), log:'Agent Decision Log'};
    document.getElementById('viewTitle').innerHTML = `${titles[view]||view} <span class="badge">LIVE</span>`;
    this.render();
  },

  render(){
    const s = App.state.current; if(!s) return;
    const body = document.getElementById('contentBody');
    const map = {
      dashboard: () => this._dashboard(s), speakers: () => this._speakers(s),
      venues: () => this._venues(s), budget: () => this._budget(s),
      attendees: () => this._attendees(s), timeslots: () => this._timeslots(s), log: () => this._log()
    };
    body.innerHTML = (map[this.currentView] || map.dashboard)();
    this._renderCoT(); this._undoBtn();
  },

  // ---- TIMELINE ----
  renderTimeline(){
    const uc = document.getElementById('upcoming-timeline');
    const pc = document.getElementById('past-timeline');
    const pe = document.getElementById('past-empty');
    uc.innerHTML = ''; pc.innerHTML = '';
    const now = new Date(); let hasPast = false;
    const events = [...App.events].sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
    events.forEach(ev => {
      const eventDate = new Date(ev.date+'T'+ev.time);
      const isPast = eventDate < now;
      const dateStr = eventDate.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      const dayStr = eventDate.toLocaleDateString('en-GB',{weekday:'long'});
      const timeStr = eventDate.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      const totalAtts = (ev.attendees||[]).length;
      const totalSpk = (ev.speakers||[]).length;
      const totalRm = (ev.venues||[]).length;
      const totalSess = (ev.sessions||[]).length;
      const html = `
        <div class="tl-row">
          <div class="tl-date-col">
            <div class="tl-date-text">
              <div class="tl-date-day">${dateStr.split(' ')[0]} ${dateStr.split(' ')[1]}</div>
              <div class="tl-date-weekday">${dayStr}</div>
            </div>
            <div class="tl-date-line"><div class="tl-dot ${isPast?'past':'upcoming'}"></div></div>
          </div>
          <div class="tl-card">
            <div class="tl-card-body">
              <div class="tl-card-top">
                <div class="tl-card-time">${timeStr}</div>
                <div style="display:flex;gap:6px;align-items:center">
                  <span class="tl-card-badge">${ev.visibility||'Public'}</span>
                  <button class="tl-delete-btn" onclick="event.stopPropagation();App.deleteEvent('${ev.id}')" title="Delete Event">
                    <span class="material-symbols-outlined" style="font-size:16px">delete</span>
                  </button>
                </div>
              </div>
              <div class="tl-card-title">${ev.name}</div>
              <div class="tl-card-meta">
                <span class="tl-card-meta-item tl-card-meta-gold"><span class="material-symbols-outlined">location_on</span>${ev.location||'TBA'}</span>
                <span class="tl-card-meta-item tl-card-meta-dim"><span class="material-symbols-outlined">groups</span>${totalAtts} Attendees · ${totalSpk} Speakers · ${totalRm} Rooms</span>
              </div>
              <div class="tl-card-meta">
                <span class="tl-card-meta-item tl-card-meta-dim"><span class="material-symbols-outlined">category</span>${EVENT_TYPES[ev.eventType]?.name||ev.eventType}</span>
                <span class="tl-card-meta-item tl-card-meta-dim"><span class="material-symbols-outlined">payments</span>₹${ev.budget?.total||0}</span>
                ${totalSess ? `<span class="tl-card-meta-item" style="color:var(--green)"><span class="material-symbols-outlined">check_circle</span>${totalSess} sessions scheduled</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button onclick="App.manageEvent('${ev.id}')" class="tl-manage-btn">
                  <span class="material-symbols-outlined" style="font-size:16px">edit</span> Manage
                </button>
                <button onclick="event.stopPropagation();App.shareEvent('${ev.id}')" class="tl-manage-btn" style="background:rgba(0,184,148,.15);color:var(--green)">
                  <span class="material-symbols-outlined" style="font-size:16px">share</span> Share Link
                </button>
              </div>
            </div>
          </div>
        </div>`;
      if(isPast){ pc.insertAdjacentHTML('beforeend', html); hasPast = true; }
      else { uc.insertAdjacentHTML('beforeend', html); }
    });
    pe.style.display = hasPast ? 'none' : 'block';
  },

  // ---- DASHBOARD ----
  _dashboard(s){
    const nSp=(s.speakers||[]).length, nVn=(s.venues||[]).length, nTs=(s.timeSlots||[]).length;
    if(!s.sessions?.length){
      const etName = EVENT_TYPES[s.eventType]?.name || 'Event';
      const steps = [
        {done:nTs>0, label:`Add ${L('timeslots')}`, nav:'timeslots', count:nTs, icon:'🗓️'},
        {done:nVn>0, label:`Add ${L('venues')}`, nav:'venues', count:nVn, icon:'🏛️'},
        {done:nSp>0, label:`Add ${L('speakers')}`, nav:'speakers', count:nSp, icon:'🎤'},
      ];
      const done = steps.filter(x=>x.done).length;
      const allReady = nSp>0 && nVn>0 && nTs>0;
      let h = `<div style="max-width:560px;margin:20px auto;padding:0 20px">
        <div style="text-align:center;padding:30px 20px;border-radius:20px;background:linear-gradient(135deg,rgba(108,92,231,.12),rgba(9,132,227,.08));position:relative;overflow:hidden;margin-bottom:24px;border:1px solid rgba(108,92,231,.15)">
          <h2 style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#6c5ce7,#0984e3);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">Getting Started</h2>
          <p style="font-size:13px;color:#636e72;margin-bottom:16px">${etName} — Complete these steps to unlock AI scheduling</p>
          <div style="display:flex;align-items:center;gap:10px;max-width:280px;margin:0 auto">
            <div style="flex:1;height:6px;border-radius:3px;background:var(--bg);box-shadow:inset 2px 2px 4px var(--sh-d),inset -2px -2px 4px var(--sh-l);overflow:hidden">
              <div style="height:100%;width:${Math.round(done/steps.length*100)}%;border-radius:3px;background:linear-gradient(90deg,#6c5ce7,#00b894);transition:width .5s"></div></div>
            <span style="font-size:11px;font-weight:700;color:var(--accent)">${done}/${steps.length}</span></div>
        </div><div style="display:flex;flex-direction:column;gap:10px">`;
      steps.forEach((step,i) => {
        const isDone = step.done;
        const bg = isDone ? 'background:linear-gradient(135deg,#00b894,#00a884);color:white' : 'background:linear-gradient(135deg,rgba(108,92,231,.15),rgba(9,132,227,.1));color:var(--accent)';
        h += `<div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:14px;background:var(--bg);box-shadow:var(--out);border:1px solid ${isDone?'rgba(0,184,148,.2)':'var(--border)'};cursor:pointer" onclick="UI.switchView('${step.nav}')">
          <div style="width:36px;height:36px;border-radius:10px;${bg};display:flex;align-items:center;justify-content:center;font-size:${isDone?'14px':'18px'};font-weight:700;flex-shrink:0">${isDone?'✓':step.icon}</div>
          <div style="flex:1"><div style="font-size:14px;font-weight:700;color:${isDone?'var(--green)':'var(--dark)'}">${step.label}</div>
          ${isDone?`<span style="font-size:10px;font-weight:600;background:rgba(0,184,148,.12);color:var(--green);padding:2px 8px;border-radius:6px">${step.count} added</span>`:''}</div>
          <div style="color:${isDone?'var(--green)':'#b2bec3'};font-size:18px">${isDone?'':'→'}</div></div>`;
      });
      if(allReady) h += `<button class="ebtn primary" style="padding:14px;font-size:14px;border-radius:12px;width:100%;justify-content:center;display:flex;align-items:center;gap:8px" onclick="App.runOptimization('Manual generation');UI.render()">⚡ Generate AI Schedule</button>`;
      h += '</div></div>';
      return h;
    }
    // Full dashboard with schedule
    const sessions = s.sessions||[]; const totalCost = sessions.reduce((sum,x)=>sum+x.cost,0);
    const budgetTotal = s.budget?.total||1; const budgetPct = Math.min(100,Math.round(totalCost/budgetTotal*100));
    const uniqueVenues = new Set(sessions.map(x=>x.venueId)).size;
    const conflicts = (s.satisfaction?.violations||[]).length;
    const satisfaction = s.satisfaction?.satisfaction||0;
    let out = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px">
      <div style="padding:14px;border-radius:14px;background:var(--bg);box-shadow:var(--out);text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent)">${sessions.length}</div><div style="font-size:10px;color:#636e72;text-transform:uppercase;letter-spacing:1px">Sessions</div></div>
      <div style="padding:14px;border-radius:14px;background:var(--bg);box-shadow:var(--out);text-align:center"><div style="font-size:24px;font-weight:800;color:${budgetPct>90?'#d63031':'#00b894'}">${budgetPct}%</div><div style="font-size:10px;color:#636e72;text-transform:uppercase;letter-spacing:1px">Budget Used</div></div>
      <div style="padding:14px;border-radius:14px;background:var(--bg);box-shadow:var(--out);text-align:center"><div style="font-size:24px;font-weight:800;color:#0984e3">${uniqueVenues}</div><div style="font-size:10px;color:#636e72;text-transform:uppercase;letter-spacing:1px">${L('venues')} Used</div></div>
      <div style="padding:14px;border-radius:14px;background:var(--bg);box-shadow:var(--out);text-align:center"><div style="font-size:24px;font-weight:800;color:${conflicts?'#d63031':'#00b894'}">${conflicts}</div><div style="font-size:10px;color:#636e72;text-transform:uppercase;letter-spacing:1px">Conflicts</div></div>
      <div style="padding:14px;border-radius:14px;background:var(--bg);box-shadow:var(--out);text-align:center"><div style="font-size:24px;font-weight:800;color:#6c5ce7">${satisfaction}%</div><div style="font-size:10px;color:#636e72;text-transform:uppercase;letter-spacing:1px">AI Score</div></div>
    </div>`;
    out += `<div style="padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(108,92,231,.08),rgba(9,132,227,.08));margin-bottom:16px;border-left:3px solid var(--accent)">
      <div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">AI Schedule Analysis</div>
      <div style="font-size:12px;color:var(--dark);line-height:1.5">${this._aiInsight(s)}</div></div>`;
    // Schedule grid
    const days = [...new Set((s.timeSlots||[]).map(t=>t.day))]; const venues = s.venues||[];
    for(const day of days){
      out += `<h2 style="font-size:15px;font-weight:700;margin:8px 0 12px">${formatDate(day)}</h2>`;
      const slots = (s.timeSlots||[]).filter(t=>t.day===day);
      out += `<div class="schedule-grid" style="grid-template-columns:80px ${venues.map(()=>'1fr').join(' ')};margin-bottom:20px">`;
      out += `<div class="grid-header"></div>`;
      for(const v of venues) out += `<div class="grid-header" style="color:${venueColor(venues,v.id)}">${v.name}</div>`;
      for(const slot of slots){
        out += `<div class="time-label">${slot.label}</div>`;
        for(const v of venues){
          const sess = sessions.find(x => x.timeSlotId===slot.id && x.venueId===v.id);
          if(sess){
            const reason = this.changeReasons[sess.speakerId]||'';
            out += `<div class="session-card${reason?' changed':''}" style="border-left:3px solid ${venueColor(venues,v.id)}" onclick="App.showSessionDetail('${sess.speakerId}')">
              ${reason?`<div class="tooltip">${reason}</div>`:''}
              <div class="speaker">${sess.speakerName}</div><div class="topic">${sess.topic}</div>
              <div class="meta"><span class="venue-tag" style="background:${venueColor(venues,v.id)}">${v.name}</span><span>${sess.attendeeCount} interested</span></div></div>`;
          } else out += `<div class="empty-slot"></div>`;
        }
      }
      out += '</div>';
    }
    return out;
  },

  _aiInsight(s){
    const sessions=s.sessions||[]; const speakers=s.speakers||[]; const venues=s.venues||[]; const timeSlots=s.timeSlots||[];
    const lines = [];
    const totalSlots = venues.length*timeSlots.length; const filled = sessions.length;
    lines.push(`Schedule density: ${totalSlots?Math.round(filled/totalSlots*100):0}% (${filled}/${totalSlots} slots filled).`);
    const venueLoads = {}; for(const sess of sessions) venueLoads[sess.venueId] = (venueLoads[sess.venueId]||0)+1;
    const loads = Object.values(venueLoads);
    if(loads.length > 1){
      const maxL = Math.max(...loads); const minL = Math.min(...loads);
      lines.push(maxL-minL > 1 ? `Load imbalance: busiest venue has ${maxL} sessions, quietest has ${minL}.` : 'Venue load is well-balanced.');
    }
    const totalCost = sessions.reduce((sum,x)=>sum+x.cost,0); const budgetTotal = s.budget?.total||1;
    if(totalCost > budgetTotal) lines.push(`OVER BUDGET by $${totalCost-budgetTotal}.`);
    else if(totalCost/budgetTotal > 0.9) lines.push(`Budget nearly exhausted (${Math.round(totalCost/budgetTotal*100)}%).`);
    else lines.push(`Budget healthy: $${budgetTotal-totalCost} remaining.`);
    const scheduled = new Set(sessions.map(x=>x.speakerId));
    const unsched = speakers.filter(sp => !scheduled.has(sp.id));
    if(unsched.length) lines.push(`${unsched.length} ${L('speakers')} unscheduled: ${unsched.map(u=>u.name).join(', ')}.`);
    return lines.join(' ');
  },

  // ---- ENTITY VIEWS ----
  _speakers(s){
    let h = '<div class="cards-grid">';
    for(const sp of (s.speakers||[])){
      const ses = (s.sessions||[]).find(x => x.speakerId===sp.id);
      const sl = ses ? (s.timeSlots||[]).find(t => t.id===ses.timeSlotId) : null;
      const memCount = (sp.members||[]).length;
      h += `<div class="entity-card"><div class="ec-head"><h4>${sp.name}</h4></div><p class="ec-sub">${sp.topic}</p>
        <div class="ec-tags"><span class="etag t-purple">${sp.duration}min</span><span class="etag t-green">$${sp.fee}</span>
        ${memCount?`<span class="etag t-blue">${memCount} member${memCount>1?'s':''}</span>`:''}
        ${ses?`<span class="etag t-blue">${formatDate(sl?.day)} ${sl?.label||''}</span>`:`<span class="etag t-red">Unscheduled</span>`}</div>
        <div class="ec-actions"><button class="ebtn primary" onclick="App.showSpeakerModal('${sp.id}')">Edit</button><button class="ebtn danger" onclick="App.removeSpeaker('${sp.id}')">Remove</button></div></div>`;
    }
    h += `<div class="entity-card add-card" onclick="App.showSpeakerModal()"><div class="add-icon">+</div><span>Add ${L('speaker')}</span></div></div>`;
    return h;
  },

  _venues(s){
    let h = '<div class="cards-grid">';
    for(const v of (s.venues||[])){
      const cnt = (s.sessions||[]).filter(x => x.venueId===v.id).length;
      h += `<div class="entity-card" style="border-top:3px solid ${venueColor(s.venues,v.id)}"><div class="ec-head"><h4>${v.name}</h4></div>
        <p class="ec-sub">Capacity: ${v.capacity} | $${v.costPerHour}/hr</p>
        <div class="ec-tags">${(v.equipment||[]).map(e=>`<span class="etag t-blue">${e}</span>`).join('')}<span class="etag t-purple">${cnt} sessions</span></div>
        <div class="ec-actions"><button class="ebtn primary" onclick="App.showVenueModal('${v.id}')">Edit</button><button class="ebtn danger" onclick="App.removeVenue('${v.id}')">Remove</button></div></div>`;
    }
    h += `<div class="entity-card add-card" onclick="App.showVenueModal()"><div class="add-icon">+</div><span>Add ${L('venue')}</span></div></div>`;
    return h;
  },

  _timeslots(s){
    const days = [...new Set((s.timeSlots||[]).map(t=>t.day))].sort();
    let h = `<div style="margin-bottom:12px"><button class="ebtn primary" style="padding:10px 20px;font-size:13px" onclick="App.showTimeSlotModal()">+ Add ${L('timeslot')}</button></div>`;
    if(!days.length) return h + `<p style="color:#636e72;text-align:center;margin-top:30px">No ${L('timeslots')} defined yet.</p>`;
    for(const day of days){
      h += `<h3 style="font-size:14px;font-weight:600;margin:16px 0 8px">${formatDate(day)}</h3><div class="cards-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">`;
      for(const t of (s.timeSlots||[]).filter(x => x.day===day)){
        h += `<div class="entity-card"><h4>${t.label}</h4><p class="ec-sub">${t.start} - ${t.end}</p>
          <div class="ec-actions"><button class="ebtn primary" onclick="App.showTimeSlotModal('${t.id}')">Edit</button><button class="ebtn danger" onclick="App.removeTimeSlot('${t.id}')">Remove</button></div></div>`;
      }
      h += '</div>';
    }
    return h;
  },

  _attendees(s){
    let h = '<div class="cards-grid">';
    for(const a of (s.attendees||[])){
      h += `<div class="entity-card"><div class="ec-head"><h4>${a.name}</h4><span class="vip-stars">${'⭐'.repeat(a.vipLevel||0)}</span></div>
        <p class="ec-sub">Interests: ${(a.interests||[]).join(', ')||'None'}</p>
        <div class="ec-tags">${(a.preferredSpeakers||[]).map(sp => {
          const spk = (s.speakers||[]).find(x=>x.id===sp);
          const ok = (s.sessions||[]).some(x=>x.speakerId===sp);
          return `<span class="etag ${ok?'t-green':'t-red'}">${spk?.name||sp}</span>`;
        }).join('')}</div>
        <div class="ec-actions"><button class="ebtn primary" onclick="App.showAttendeeModal('${a.id}')">Edit</button><button class="ebtn danger" onclick="App.removeAttendee('${a.id}')">Remove</button></div></div>`;
    }
    h += `<div class="entity-card add-card" onclick="App.showAttendeeModal()"><div class="add-icon">+</div><span>Add ${L('attendee')}</span></div></div>`;
    return h;
  },

  _budget(s){
    const total = s.budget?.total||0; const sessions = s.sessions||[];
    const allocated = sessions.reduce((sum,x)=>sum+x.cost,0);
    const remaining = total - allocated;
    const pct = total>0 ? Math.min(999,Math.round(allocated/total*100)) : 0;
    const bd = {}; for(const sess of sessions){ const v=(s.venues||[]).find(vn=>vn.id===sess.venueId); const name=v?.name||sess.venueId; if(!bd[sess.venueId])bd[sess.venueId]={name,cost:0,sessions:0}; bd[sess.venueId].cost+=sess.cost; bd[sess.venueId].sessions++; }
    const breakdown = Object.values(bd);
    let svg = `<svg viewBox="0 0 200 200" style="width:180px;height:180px;margin:0 auto;display:block">`;
    let c = -90; breakdown.forEach((item,i) => { const a = allocated>0?(item.cost/allocated)*360:0; const r1=c*Math.PI/180,r2=(c+a)*Math.PI/180;
      svg += `<path d="M100,100 L${100+80*Math.cos(r1)},${100+80*Math.sin(r1)} A80,80 0 ${a>180?1:0},1 ${100+80*Math.cos(r2)},${100+80*Math.sin(r2)} Z" fill="${VENUE_PALETTE[i%10]}" opacity="0.8"/>`; c+=a; });
    svg += `<circle cx="100" cy="100" r="50" fill="var(--bg)"/><text x="100" y="95" text-anchor="middle" font-size="24" font-weight="700" fill="var(--dark)">${pct}%</text><text x="100" y="115" text-anchor="middle" font-size="10" fill="#636e72">utilized</text></svg>`;
    let tbl = `<div style="margin:16px 0 8px"><button class="ebtn primary" style="padding:10px 20px;font-size:13px" onclick="App.showBudgetModal()">Set Budget - Current: $${total}</button></div>`;
    tbl += `<table class="crud-table"><tr><th>${L('venue')}</th><th>Sessions</th><th>Cost</th><th>Share</th></tr>`;
    breakdown.forEach((item,i) => { const share=allocated>0?Math.round(item.cost/allocated*100):0;
      tbl += `<tr><td><span class="dot" style="background:${VENUE_PALETTE[i%10]}"></span>${item.name}</td><td>${item.sessions}</td><td>$${item.cost}</td><td><div class="bar-bg"><div class="bar-fill" style="width:${share}%;background:${VENUE_PALETTE[i%10]}"></div></div>${share}%</td></tr>`; });
    tbl += `<tr class="total-row"><td>Total</td><td>${sessions.length}</td><td>$${allocated}</td><td>of $${total}</td></tr></table>`;
    const statusClass = remaining<0?'danger':pct>90?'danger':'healthy';
    const statusText = remaining<0?`OVER BUDGET by $${Math.abs(remaining)}!`:pct>90?'Budget critical!':'Budget healthy';
    tbl += `<div class="budget-status ${statusClass}">${statusText} | Remaining: $${remaining}</div>`;
    return `<div style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start">${svg}<div>${tbl}</div></div>`;
  },

  _log(){
    const logs = App.orchestrator.logs;
    if(!logs.length) return '<p style="color:#636e72;text-align:center;margin-top:40px">No agent decisions yet.</p>';
    let h = '<div class="log-feed">';
    for(let i=logs.length-1; i>=0; i--){ const l=logs[i]; h += `<div class="log-entry ${l.type}"><div class="log-time">${l.time}</div><div class="log-agent">${l.agent}</div><div class="log-msg">${l.message}</div></div>`; }
    return h + '</div>';
  },

  // ---- COT PANEL ----
  _renderCoT(){
    const panel = document.getElementById('cotPanel'); if(!panel) return;
    const cot = App.orchestrator.cot||[];
    const s = App.state.current;
    let html = '';
    if(cot.length){
      for(const entry of cot){
        if(entry.type==='place'){
          html += `<div style="padding:6px 8px;margin-bottom:4px;border-radius:8px;background:var(--bg);box-shadow:var(--in)">
            <div style="font-weight:600;color:var(--dark);font-size:11px">${entry.speaker} → ${entry.venue}</div>
            <div style="color:#0984e3;font-size:10px">${formatDate(entry.time.split(' ')[0])} ${entry.time.split(' ').slice(1).join(' ')}</div>
            <div style="font-size:10px;color:#636e72">${entry.reasons.join(' | ')}</div></div>`;
        } else if(entry.type==='summary'){
          html += `<div style="padding:6px 8px;margin-top:6px;border-radius:8px;background:rgba(108,92,231,.1);font-weight:600;color:var(--accent);font-size:10px">${entry.msg}</div>`;
        } else if(entry.type==='fail'){
          html += `<div style="padding:6px 8px;border-radius:8px;background:rgba(214,48,49,.1);color:#d63031;font-size:10px;font-weight:600">${entry.msg}</div>`;
        }
      }
    }
    if(s){
      const recs = this._aiRecommendations(s);
      if(recs.length){
        html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <div style="font-size:9px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">AI Recommendations</div>`;
        for(const rec of recs) html += `<div style="padding:4px 8px;margin-bottom:3px;border-radius:6px;border-left:2px solid ${rec.color};font-size:10px;color:var(--dark);line-height:1.4">${rec.text}</div>`;
        html += '</div>';
      }
    }
    if(!html) html = '<p class="cot-empty">Add entities to see AI reasoning.</p>';
    panel.innerHTML = html;
  },

  _aiRecommendations(s){
    const recs=[]; const sp=s.speakers||[]; const vn=s.venues||[]; const ts=s.timeSlots||[]; const sess=s.sessions||[];
    if(!ts.length) recs.push({color:'#0984e3',text:'Start by adding '+L('timeslots')+'.'});
    else if(!vn.length) recs.push({color:'#0984e3',text:'Add '+L('venues')+' with capacity and equipment.'});
    else if(!sp.length) recs.push({color:'#0984e3',text:'Add '+L('speakers')+' to generate your AI schedule.'});
    if(sp.length>vn.length*ts.length && vn.length && ts.length) recs.push({color:'#d63031',text:`${sp.length} ${L('speakers')} but only ${vn.length*ts.length} slots. Add more ${L('venues')} or ${L('timeslots')}.`});
    const totalFees=sp.reduce((sum,x)=>sum+(x.fee||0),0); const bTotal=s.budget?.total||0;
    if(bTotal>0 && totalFees>bTotal*0.8) recs.push({color:'#fdcb6e',text:`Speaker fees ($${totalFees}) use ${Math.round(totalFees/bTotal*100)}% of $${bTotal} budget.`});
    const atts=s.attendees||[];
    if(sess.length && !atts.length) recs.push({color:'#00b894',text:'Add '+L('attendees')+' with preferences for AI satisfaction scoring.'});
    const sat=s.satisfaction?.satisfaction||0;
    if(sat>0 && sat<70 && atts.length) recs.push({color:'#e17055',text:`AI Score ${sat}% is low. Check preferences vs scheduled ${L('speakers')}.`});
    return recs;
  },

  _undoBtn(){
    const btn=document.getElementById('undoBtn'), cnt=document.getElementById('historyCount'), n=App.state.history.length;
    if(btn) btn.disabled = n===0;
    if(cnt) cnt.textContent = n>0 ? `${n} snapshot${n>1?'s':''} saved` : 'No history';
  },

  // ---- UI HELPERS ----
  showModal(html){ document.getElementById('modalContent').innerHTML = html; document.getElementById('modalOverlay').classList.add('show'); },
  hideModal(){ document.getElementById('modalOverlay').classList.remove('show'); },
  showProgress(msg){ const el=document.getElementById('progressOverlay'); el.querySelector('.progress-text').textContent=msg||'Re-optimizing...'; el.classList.add('show'); },
  hideProgress(){ document.getElementById('progressOverlay').classList.remove('show'); },
  toast(msg, type='info'){ const c=document.getElementById('toastContainer'),t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t); setTimeout(()=>t.remove(),3000); }
};
