// ============================================================
// EventFlow AI — Chatbot Module
// ============================================================

const Chatbot = {
  respond(q){
    const s = App.state?.current;
    const lo = q.toLowerCase();
    const sp=s?.speakers||[]; const vn=s?.venues||[]; const ts=s?.timeSlots||[];
    const sess=s?.sessions||[]; const atts=s?.attendees||[]; const bud=s?.budget||{};

    if(/^(hi|hello|hey|sup|yo)\b/.test(lo)) return 'Hello! I\'m your EventFlow AI assistant. Ask me about your event — speakers, venues, budget, schedule, or how to use any feature.';

    if(/speaker|team|performer|presenter/.test(lo)){
      if(/how many|count|total/.test(lo)) return `You have <b>${sp.length}</b> ${L('speakers')}.${sp.length?' Names: '+sp.map(x=>x.name).join(', ')+'.':' Add some via the '+L('speakers')+' tab.'}`;
      if(/add|create|new/.test(lo)) return `Click the <b>${L('speakers')}</b> icon in the nav, then click <b>"+ Add ${L('speaker')}"</b>. Fill in name, topic, duration, fee, preferred time slots, and team members.`;
      if(/edit|update|modify/.test(lo)) return `Go to the <b>${L('speakers')}</b> tab, find the card, and click <b>"Edit"</b>.`;
      if(/delete|remove/.test(lo)) return `On the <b>${L('speakers')}</b> tab, click <b>"Remove"</b>. Use <b>Undo</b> in the sidebar if needed.`;
      if(/member/.test(lo)) return `When editing a ${L('speaker')}, scroll down to <b>"Team Members"</b>. Click <b>"+ Add Member"</b> to add name, roll/ID, phone, and email.`;
      if(sp.length){const top=sp.reduce((a,b)=>(a.fee||0)>(b.fee||0)?a:b); return `You have <b>${sp.length}</b> ${L('speakers')}. Highest fee: <b>${top.name}</b> at $${top.fee||0}. Total fees: $${sp.reduce((s,x)=>s+(x.fee||0),0)}.`;}
      return `No ${L('speakers')} yet. Go to the ${L('speakers')} tab and add some.`;
    }

    if(/venue|hall|room|lab|location|place/.test(lo)){
      if(/how many|count|total/.test(lo)) return `You have <b>${vn.length}</b> ${L('venues')}.${vn.length?' Names: '+vn.map(x=>x.name+' (cap: '+x.capacity+')').join(', ')+'.':' Add via the '+L('venues')+' tab.'}`;
      if(/add|create|new/.test(lo)) return `Click the <b>${L('venues')}</b> icon, then <b>"+ Add ${L('venue')}"</b>. Enter name, capacity, cost/hour, equipment, and available time slots.`;
      if(/capacity/.test(lo) && vn.length){const total=vn.reduce((s,x)=>s+(x.capacity||0),0); return `Total capacity: <b>${total}</b>. Largest: <b>${vn.reduce((a,b)=>(a.capacity||0)>(b.capacity||0)?a:b).name}</b>.`;}
      if(vn.length) return `You have <b>${vn.length}</b> ${L('venues')}: ${vn.map(x=>x.name).join(', ')}.`;
      return `No ${L('venues')} yet. Add via the ${L('venues')} tab.`;
    }

    if(/time.?slot|schedule|slot|sprint|set.?time/.test(lo)){
      if(/how many|count|total/.test(lo)) return `You have <b>${ts.length}</b> ${L('timeslots')}.`;
      if(/add|create|new/.test(lo)) return `Click the <b>${L('timeslots')}</b> icon, then <b>"+ Add ${L('timeslot')}"</b>. Pick a date and set start/end times.`;
      if(ts.length) return `You have <b>${ts.length}</b> ${L('timeslots')}: ${ts.map(x=>(x.day||'')+' '+(x.label||'')).join(', ')}.`;
      return `No ${L('timeslots')} yet. Add them so the AI can schedule your ${L('speakers')}.`;
    }

    if(/budget|cost|money|expense|spend|fee|price/.test(lo)){
      const total=bud.total||0; const allocated=sess.reduce((s,x)=>s+x.cost,0); const remaining=total-allocated;
      if(/set|change|update/.test(lo)) return `On the <b>Budget</b> tab, click <b>"Set Budget"</b>.`;
      if(total) return `Budget: <b>$${total}</b>. Allocated: <b>$${allocated}</b> (${Math.round(allocated/total*100)}%). Remaining: <b>$${remaining}</b>. ${remaining<0?'⚠️ OVER BUDGET!':'Budget healthy.'}`;
      return `No budget set yet. Go to the <b>Budget</b> tab and click <b>"Set Budget"</b>.`;
    }

    if(/attendee|participant|audience|people/.test(lo)){
      if(/how many|count|total/.test(lo)) return `You have <b>${atts.length}</b> ${L('attendees')}.`;
      if(/add|create|new/.test(lo)) return `Click the <b>${L('attendees')}</b> icon, then <b>"+ Add ${L('attendee')}"</b>. Enter name, VIP level, interests, and preferred ${L('speakers')}.`;
      if(atts.length){const vips=atts.filter(a=>(a.vipLevel||0)>=3).length; return `You have <b>${atts.length}</b> ${L('attendees')}. ${vips} are VIP (level 3+).`;}
      return `No ${L('attendees')} yet. Adding them helps the AI calculate satisfaction scores.`;
    }

    if(/session|scheduled|optimize|reschedule/.test(lo)){
      if(sess.length) return `<b>${sess.length}</b> sessions scheduled across <b>${new Set(sess.map(x=>x.venueName)).size}</b> ${L('venues')}. Total cost: <b>$${sess.reduce((s,x)=>s+x.cost,0)}</b>.`;
      return `No sessions yet. Add ${L('speakers')}, ${L('venues')}, and ${L('timeslots')}, then generate the AI schedule.`;
    }

    if(/csp|constraint|backtrack|algorithm|solver|how.*(ai|work|schedule)/.test(lo)) return 'EventFlow AI uses a <b>CSP solver</b> with arc consistency (AC-3) and backtracking search with MRV heuristic. It ensures no two speakers share the same venue+time, respects budget limits, and uses a <b>capacity-aware LCV heuristic</b> to match speakers to appropriately-sized venues.';

    if(/score|satisfaction|quality/.test(lo)){
      const sat=s?.satisfaction?.satisfaction||0;
      if(sat) return `AI Satisfaction Score: <b>${sat}%</b>. This measures how well attendee preferences match the schedule.`;
      return `No satisfaction score yet. Run the scheduler and add ${L('attendees')} with preferences.`;
    }

    if(/dashboard|overview|summary|status/.test(lo)) return `The <b>Dashboard</b> shows: schedule grid, 5 AI metrics, Analysis insights, and Scheduler Reasoning. Click the first icon in the nav.`;
    if(/undo|history|revert/.test(lo)) return `Click <b>"Undo"</b> in the sidebar Tools section to restore the previous state.`;
    if(/export|import|save|load|json|backup/.test(lo)) return `<b>Export JSON</b>: Downloads your event as a .json file. <b>Import JSON</b>: Loads a previously exported event. Both are in the sidebar.`;
    if(/event.?type|conference|hackathon|festival|workshop|corporate/.test(lo)) return `EventFlow AI supports 6 event types: <b>Conference, Hackathon, Festival, Workshop, Corporate, Custom</b>. Each has unique labels. Current type: <b>${s?.eventType||'Not set'}</b>.`;
    if(/dark.?mode|theme|light/.test(lo)) return 'Click the 🌙 icon at the bottom of the nav panel to toggle dark/light mode.';
    if(/feature|what.*(can|do)|capabilit/.test(lo)) return 'EventFlow AI offers: <b>AI-optimized scheduling</b> (CSP solver), <b>capacity-aware venue assignment</b>, <b>budget tracking</b>, <b>chain-of-thought reasoning</b>, <b>multi-agent orchestration</b>, <b>undo/redo</b>, <b>export/import</b>, <b>6 event types</b>, <b>dark mode</b>, and this <b>AI chatbot</b>.';
    if(/thank|thanks/.test(lo)) return 'You\'re welcome! Let me know if you need anything else.';

    return `I can help with: <b>speakers</b>, <b>venues</b>, <b>time slots</b>, <b>budget</b>, <b>attendees</b>, <b>scheduling</b>, <b>AI score</b>, <b>features</b>, <b>export/import</b>, and more. Try asking "How many speakers do I have?" or "How does the AI work?"`;
  }
};
