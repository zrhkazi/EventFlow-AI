// ============================================================
// EventFlow AI — Core AI Engine
// ============================================================

// ---- EVENT TYPE SYSTEM ----
const EVENT_TYPES = {
  conference: {
    name:'Conference', icon:'C', desc:'Tech talks, keynotes, panel discussions',
    labels:{ speaker:'Speaker',speakers:'Speakers',venue:'Venue',venues:'Venues',attendee:'Attendee',attendees:'Attendees',timeslot:'Time Slot',timeslots:'Time Slots',topic:'Topic',fee:'Fee',duration:'Duration' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:8000}, timeSlots:[] }
  },
  hackathon: {
    name:'Hackathon', icon:'H', desc:'Coding sprints, team challenges, demo pitches',
    labels:{ speaker:'Team',speakers:'Teams',venue:'Lab',venues:'Labs',attendee:'Participant',attendees:'Participants',timeslot:'Sprint',timeslots:'Sprints',topic:'Project',fee:'Resource Cost',duration:'Sprint Length' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:5000}, timeSlots:[] }
  },
  festival: {
    name:'Festival', icon:'F', desc:'Music, food, art, cultural celebrations',
    labels:{ speaker:'Performer',speakers:'Performers',venue:'Stage',venues:'Stages',attendee:'Festival-goer',attendees:'Festival-goers',timeslot:'Set Time',timeslots:'Set Times',topic:'Act/Show',fee:'Performance Fee',duration:'Set Length' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:15000}, timeSlots:[] }
  },
  workshop: {
    name:'Workshop', icon:'W', desc:'Hands-on training, bootcamps, skill sessions',
    labels:{ speaker:'Instructor',speakers:'Instructors',venue:'Classroom',venues:'Classrooms',attendee:'Student',attendees:'Students',timeslot:'Session',timeslots:'Sessions',topic:'Course',fee:'Instructor Fee',duration:'Session Length' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:4000}, timeSlots:[] }
  },
  corporate: {
    name:'Corporate Event', icon:'B', desc:'Town halls, product launches, team retreats',
    labels:{ speaker:'Presenter',speakers:'Presenters',venue:'Room',venues:'Rooms',attendee:'Employee',attendees:'Employees',timeslot:'Time Slot',timeslots:'Time Slots',topic:'Presentation',fee:'Budget Allocation',duration:'Duration' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:6000}, timeSlots:[] }
  },
  custom: {
    name:'Custom Event', icon:'+', desc:'Define your own event from scratch',
    labels:{ speaker:'Presenter',speakers:'Presenters',venue:'Location',venues:'Locations',attendee:'Guest',attendees:'Guests',timeslot:'Time Slot',timeslots:'Time Slots',topic:'Activity',fee:'Cost',duration:'Duration' },
    templates:{ speakers:[], venues:[], attendees:[], budget:{total:5000}, timeSlots:[] }
  }
};

const EQUIPMENT_OPTIONS = ['projector','microphone','stage','whiteboard','monitors','streaming','recording','lighting','power-strips','wifi'];

const VENUE_PALETTE = ['#6c5ce7','#00b894','#0984e3','#fdcb6e','#e17055','#00cec9','#d63031','#636e72','#a29bfe','#55efc4'];

// ---- HELPERS ----
function uid(){ return 'id'+Date.now()+Math.random().toString(36).slice(2,6); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function L(key){ return (App?.state?.current?.eventLabels || EVENT_TYPES.conference.labels)[key] || key; }
function venueColor(venues, vid){ const i = venues.findIndex(v => v.id === vid); return VENUE_PALETTE[i % VENUE_PALETTE.length]; }
function formatDate(dateStr){
  if(!dateStr) return dateStr;
  try { const d = new Date(dateStr+'T00:00:00'); if(isNaN(d)) return dateStr; return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}); }
  catch(e){ return dateStr; }
}

// ---- CSP SOLVER ----
class CSPSolver {
  solve(speakers, venues, timeSlots, budget, attendees){
    if(!speakers.length || !venues.length || !timeSlots.length) return [];
    const variables = speakers.map(s => s.id);
    const allSlotIds = timeSlots.map(t => t.id);
    const domains = {};
    for(const sp of speakers){
      domains[sp.id] = [];
      const spSlots = sp.preferredSlots?.length ? sp.preferredSlots.filter(s => allSlotIds.includes(s)) : allSlotIds;
      for(const v of venues){
        const vSlots = v.availableSlots?.length ? v.availableSlots.filter(s => allSlotIds.includes(s)) : allSlotIds;
        for(const tsId of spSlots){ if(vSlots.includes(tsId)) domains[sp.id].push({venueId:v.id, timeSlotId:tsId}); }
      }
      if(!domains[sp.id].length) domains[sp.id] = allSlotIds.flatMap(tsId => venues.map(v => ({venueId:v.id, timeSlotId:tsId})));
    }
    const constraint = (valA, valB) => !(valA.venueId === valB.venueId && valA.timeSlotId === valB.timeSlotId);
    this._ac3(variables, domains, constraint);
    const demand = {};
    for(const sp of speakers){
      demand[sp.id] = (attendees||[]).filter(a => (a.preferredSpeakers||[]).includes(sp.id)).length;
    }
    const assignment = this._backtrack({}, variables, domains, constraint, speakers, venues, budget, demand);
    if(!assignment) return null;
    return this._toSessions(assignment, speakers, venues, timeSlots, attendees);
  }

  _ac3(variables, domains, constraint){
    const queue = [];
    for(let i=0; i<variables.length; i++) for(let j=i+1; j<variables.length; j++){
      queue.push([variables[i],variables[j]]); queue.push([variables[j],variables[i]]);
    }
    while(queue.length){
      const [xi,xj] = queue.shift();
      if(this._revise(domains, xi, xj, constraint)){
        if(!domains[xi].length) return false;
        for(const xk of variables) if(xk!==xi && xk!==xj) queue.push([xk,xi]);
      }
    }
    return true;
  }

  _revise(domains, xi, xj, constraint){
    let revised = false;
    domains[xi] = domains[xi].filter(vi => {
      const ok = domains[xj].some(vj => constraint(vi,vj));
      if(!ok) revised = true;
      return ok;
    });
    return revised;
  }

  _backtrack(assignment, variables, domains, constraint, speakers, venues, budget, demand){
    if(Object.keys(assignment).length === variables.length){
      let cost = 0;
      for(const [spId,val] of Object.entries(assignment)){
        const sp = speakers.find(s => s.id === spId);
        const v = venues.find(vn => vn.id === val.venueId);
        cost += (sp?.fee||0) + (v?.costPerHour||0);
      }
      if(cost > budget.total) return null;
      return {...assignment};
    }
    const unassigned = variables.filter(v => !(v in assignment));
    unassigned.sort((a,b) => domains[a].length - domains[b].length);
    const varName = unassigned[0];
    const spDemand = demand[varName] || 0;
    const venueUsage = {};
    for(const val of Object.values(assignment)) venueUsage[val.venueId] = (venueUsage[val.venueId]||0)+1;
    const sorted = [...domains[varName]].sort((a,b) => {
      const vA = venues.find(v => v.id === a.venueId), vB = venues.find(v => v.id === b.venueId);
      const capA = vA?.capacity||0, capB = vB?.capacity||0;
      const fitA = capA >= spDemand ? 0 : 1000, fitB = capB >= spDemand ? 0 : 1000;
      if(fitA !== fitB) return fitA - fitB;
      const wasteA = capA - spDemand, wasteB = capB - spDemand;
      if(Math.abs(wasteA - wasteB) > 2) return wasteA - wasteB;
      return (venueUsage[a.venueId]||0) - (venueUsage[b.venueId]||0);
    });
    for(const value of sorted){
      if(this._isConsistent(varName, value, assignment, constraint)){
        assignment[varName] = value;
        const saved = {}; let feasible = true;
        for(const other of unassigned){
          if(other === varName) continue;
          saved[other] = [...domains[other]];
          domains[other] = domains[other].filter(val => constraint(value, val));
          if(!domains[other].length){ feasible = false; break; }
        }
        if(feasible){
          const result = this._backtrack(assignment, variables, domains, constraint, speakers, venues, budget, demand);
          if(result) return result;
        }
        for(const [k,v] of Object.entries(saved)) domains[k] = v;
        delete assignment[varName];
      }
    }
    return null;
  }

  _isConsistent(varName, value, assignment, constraint){
    for(const aVal of Object.values(assignment)) if(!constraint(value, aVal)) return false;
    return true;
  }

  _toSessions(assignment, speakers, venues, timeSlots, attendees){
    return Object.entries(assignment).map(([spId, val]) => {
      const sp = speakers.find(s => s.id === spId);
      const v = venues.find(vn => vn.id === val.venueId);
      const ts = timeSlots.find(t => t.id === val.timeSlotId);
      const interestedAtts = (attendees||[]).filter(a => (a.preferredSpeakers||[]).includes(spId));
      return {
        id:`sess_${spId}`, speakerId:spId, venueId:val.venueId, timeSlotId:val.timeSlotId,
        speakerName:sp.name, topic:sp.topic, venueName:v.name,
        cost:(sp?.fee||0)+(v?.costPerHour||0), attendeeCount:interestedAtts.length||0
      };
    });
  }
}

// ---- STATE MANAGER ----
class StateManager {
  constructor(){ this.history = []; this.current = null; }
  init(state){ this.current = clone(state); }
  snapshot(){ this.history.push(clone(this.current)); }
  undo(){ if(!this.history.length) return false; this.current = this.history.pop(); return true; }
  update(partial){ Object.assign(this.current, partial); }
  diff(oldS, newS){
    const changes = [];
    const oldMap = new Map((oldS||[]).map(s => [s.speakerId, s]));
    const newMap = new Map((newS||[]).map(s => [s.speakerId, s]));
    for(const [spId, n] of newMap){
      const o = oldMap.get(spId);
      if(!o) changes.push({type:'added', session:n, reason:`${n.speakerName} added to schedule`});
      else if(o.venueId !== n.venueId || o.timeSlotId !== n.timeSlotId){
        const rs = [];
        if(o.venueId !== n.venueId) rs.push(`moved from ${o.venueName} to ${n.venueName}`);
        if(o.timeSlotId !== n.timeSlotId){
          const oS = (App?.state?.current?.timeSlots||[]).find(t => t.id === o.timeSlotId);
          const nS = (App?.state?.current?.timeSlots||[]).find(t => t.id === n.timeSlotId);
          rs.push(`rescheduled from ${oS?.day||''} ${oS?.label||''} to ${nS?.day||''} ${nS?.label||''}`);
        }
        changes.push({type:'moved', session:n, reason:`${n.speakerName}: ${rs.join(', ')}`});
      }
    }
    for(const [spId, o] of oldMap) if(!newMap.has(spId)) changes.push({type:'removed', session:o, reason:`${o.speakerName} removed`});
    return changes;
  }
}

// ---- AGENT ORCHESTRATOR ----
class AgentOrchestrator {
  constructor(){ this.solver = new CSPSolver(); this.logs = []; this.cot = []; }

  run(state){
    const { speakers, venues, timeSlots, budget, attendees } = state;
    this.log('info','Orchestrator','Starting schedule optimization pipeline...');
    if(!speakers?.length){ this.log('conflict','Orchestrator',`No ${L('speakers')} defined.`); return {success:false, sessions:[], budget:state.budget, satisfaction:{satisfaction:0, violations:[]}}; }
    if(!venues?.length){ this.log('conflict','Orchestrator',`No ${L('venues')} defined.`); return {success:false, sessions:[], budget:state.budget, satisfaction:{satisfaction:0, violations:[]}}; }
    if(!timeSlots?.length){ this.log('conflict','Orchestrator',`No ${L('timeslots')} defined.`); return {success:false, sessions:[], budget:state.budget, satisfaction:{satisfaction:0, violations:[]}}; }
    this.log('info','Scheduling Planner',`CSP solver (BT+AC-3+MRV+LCV): ${speakers.length} ${L('speakers')}, ${venues.length} ${L('venues')}, ${timeSlots.length} ${L('timeslots')}...`);
    const sessions = this.solver.solve(speakers, venues, timeSlots, budget, attendees);
    if(!sessions){
      this.log('conflict','Scheduling Planner','No feasible schedule found!');
      this.cot.push({type:'fail', msg:'CSP solver could not find a feasible assignment. The constraints are too tight.'});
      const totalFees = speakers.reduce((s,x) => s+(x.fee||0), 0);
      const minVC = Math.min(...venues.map(v => v.costPerHour||0)) * speakers.length;
      if(totalFees+minVC > budget.total) this.log('info','Scheduling Planner',`Suggestion: Total costs ~$${totalFees+minVC} exceed budget $${budget.total}. Increase budget or reduce costs.`);
      if(venues.length*timeSlots.length < speakers.length) this.log('info','Scheduling Planner',`Suggestion: ${venues.length*timeSlots.length} slots < ${speakers.length} ${L('speakers')}. Add ${L('venues')} or ${L('timeslots')}.`);
      return {success:false, sessions:[], budget:state.budget, satisfaction:{satisfaction:0, violations:[]}};
    }
    this.log('success','Scheduling Planner',`Scheduled ${sessions.length} sessions across ${new Set(sessions.map(s=>s.venueId)).size} ${L('venues')}.`);
    this.cot = [];
    for(const sess of sessions){
      const sp = speakers.find(s => s.id === sess.speakerId);
      const v = venues.find(vn => vn.id === sess.venueId);
      const ts = timeSlots.find(t => t.id === sess.timeSlotId);
      const reasons = [];
      const demand = (attendees||[]).filter(a => (a.preferredSpeakers||[]).includes(sess.speakerId)).length;
      const prefSlots = sp?.preferredSlots || [];
      reasons.push(prefSlots.includes(sess.timeSlotId) ? `Preferred ${L('timeslot')}` : `Best available ${L('timeslot')}`);
      if(v && demand > 0){
        reasons.push(v.capacity >= demand ? `${v.name} fits ${demand} interested (cap: ${v.capacity})` : `WARNING: ${v.name} cap ${v.capacity} < ${demand} interested`);
      } else if(v) reasons.push(`${v.name} capacity: ${v.capacity}`);
      reasons.push(`Cost: $${(sp?.fee||0)+(v?.costPerHour||0)}`);
      this.cot.push({type:'place', speaker:sp?.name, venue:v?.name, time:`${ts?.day||''} ${ts?.label||''}`, reasons});
    }
    this.cot.push({type:'summary', msg:`Total: ${sessions.length} sessions, $${sessions.reduce((s,x)=>s+x.cost,0)} of $${budget.total} budget used`});
    const totalCost = sessions.reduce((s,x) => s+x.cost, 0);
    const alloc = {...budget, allocated:totalCost, remaining:budget.total-totalCost, utilization:Math.round(totalCost/budget.total*100)};
    const breakdown = {};
    for(const s of sessions){
      const v = venues.find(vn => vn.id === s.venueId);
      if(!breakdown[s.venueId]) breakdown[s.venueId] = {name:v?.name||s.venueId, cost:0, sessions:0};
      breakdown[s.venueId].cost += s.cost; breakdown[s.venueId].sessions++;
    }
    alloc.breakdown = Object.values(breakdown);
    this.log(alloc.utilization > 90 ? 'conflict' : 'success','Resource Allocator',`Budget: $${totalCost}/$${budget.total} (${alloc.utilization}% utilized).`);
    let totalScore=0, maxScore=0;
    for(const att of (attendees||[])){
      const w = 1+(att.vipLevel||0);
      for(const prefSpId of (att.preferredSpeakers||[])){
        maxScore += w*10;
        if(sessions.some(s => s.speakerId === prefSpId)) totalScore += w*10;
      }
    }
    const satisfaction = maxScore > 0 ? Math.round((totalScore/maxScore)*100) : 100;
    const violations = [];
    const vips = (attendees||[]).filter(a => (a.vipLevel||0) >= 2);
    for(const vip of vips){
      const unmet = (vip.preferredSpeakers||[]).filter(sp => !sessions.some(s => s.speakerId === sp));
      if(unmet.length){
        const names = unmet.map(id => speakers.find(s => s.id === id)?.name || id);
        violations.push({type:'vip_unmet', message:`VIP ${vip.name} missing: ${names.join(', ')}`});
      }
    }
    this.log(violations.length ? 'conflict' : 'success','Attendee Optimizer',`Satisfaction: ${satisfaction}%. ${violations.length} soft violations.`);
    return { success:true, sessions, budget:alloc, satisfaction:{satisfaction, violations} };
  }

  log(type, agent, message){ this.logs.push({type, agent, message, time:new Date().toLocaleTimeString()}); }
  clearLogs(){ this.logs = []; this.cot = []; }
}
