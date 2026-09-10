# EventFlow AI

**AI-Powered Agentic Event Planning with Constraint Satisfaction**

*A hybrid neuro-symbolic scheduling system that uses backtracking search with AC-3 constraint propagation to dynamically organize event schedules — zero APIs, zero dependencies, runs entirely in the browser.*

### What Is This?

EventFlow AI is an **agentic AI system** for event planning that combines:

- **Symbolic AI** (CSP Solver) — guarantees no hard constraint violations (room conflicts, speaker double-bookings, budget overruns)
- **Neural-style Reasoning** (Agent Orchestrator) — weighted soft-constraint optimization with chain-of-thought explanations

It handles conferences, hackathons, festivals, workshops, corporate events, and custom formats — all from a single, beautiful neumorphic interface.

### Architecture

```text
┌─────────────────────────────────────────────┐
│              Frontend (Neumorphic UI)       │
│   Dashboard │ Wizard │ CRUD Modals │ Chat   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Agent Orchestrator                │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Scheduling│ │ Resource │ │  Attendee   │  │
│  │ Planner  │ │Allocator │ │  Optimizer  │  │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
└───────┼─────────────┼──────────────┼────────┘
        │             │              │
┌───────▼─────────────▼──────────────▼────────┐
│              CSP Solver Engine              │
│   Backtracking + AC-3 + MRV + LCV           │
│   Hard Constraints │ Soft Optimization      │
│   State Manager    │ Conflict Resolver      │
└─────────────────────────────────────────────┘
```

### Quick Start

**No installation. No build step. No backend.**

```bash
# Clone the repo
git clone [https://github.com/zrhkazi/EventFlow-AI.git](https://github.com/zrhkazi/EventFlow-AI.git)

# Open in browser
# Just double-click index.html, or:
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

**Default login:** `admin@nexus.ai` / `nexus2026`

> Or deploy to **GitHub Pages** — it works out of the box since it's pure static files.

### Features

Core AI Engine
- **CSP Solver** — Backtracking with AC-3 arc consistency and MRV heuristic
- **Capacity-Aware LCV** — Matches speakers to right-sized venues, minimizing waste
- **Budget Constraint** — Hard constraint — total cost never exceeds budget
- **Real-Time Re-optimization** — Any mutation triggers full CSP re-solve with diff analysis
- **Chain-of-Thought** — Every placement decision is explained with reasoning
- **3-Agent Pipeline** — Scheduling Planner, Resource Allocator, Attendee Optimizer

Hard Constraints (Guaranteed)
- No room double-booking
- No speaker time conflicts
- Budget cap enforcement
- Speaker availability windows
- Venue availability windows
- Venue capacity limits

Soft Constraints (Optimized)
- VIP attendee preference satisfaction
- Topic diversity per time slot
- Budget efficiency optimization
- Speaker-venue capacity matching
- Preferred time slot honoring

Platform Features
- **6 Event Types** — Conference, Hackathon, Festival, Workshop, Corporate, Custom
- **7-Step Creation Wizard** — Guided event setup with live preview
- **Live Dashboard** — Schedule grid, metrics, AI insights
- **AI Chatbot** — Context-aware assistant for all event queries
- **Undo System** — State snapshots with instant rollback
- **Import/Export** — Full JSON serialization
- **Event Sharing** — Join links for collaboration
- **Dark Mode** — Full neumorphic dark theme
- **Team Members** — Per-speaker team tracking with contact details
- **Resource Tracking** — Chairs, lunch, equipment inventory

### Project Structure

```text
eventflow-ai/
├── index.html                          # Main application shell
├── login.html                          # Authentication page
├── css/
│   └── styles.css                      # Complete neumorphic design system
├── js/
│   ├── engine.js                       # CSP Solver, State Manager, Agent Orchestrator
│   ├── ui.js                           # Dashboard rendering, entity views, CoT panel
│   ├── wizard.js                       # 7-step event creation wizard
│   ├── chatbot.js                      # Context-aware AI chatbot
│   └── app.js                          # Main controller, CRUD operations, event binding
├── sample_data/
│   └── enterprise_tech_summit.json     # Enterprise-scale sample (15 speakers, 6 venues, 30 attendees)
├── implementation_plan.md              # Technical architecture document
├── LICENSE                             # MIT License
└── README.md                           # This file
```

### Sample Data

Import the included enterprise dataset to see the system at scale:

1. Click **Import** in the sidebar
2. Select `sample_data/enterprise_tech_summit.json`
3. Open "Global Tech Summit 2026" → Click **Manage**

This loads: **15 speakers** × **6 venues** × **18 time slots** (3 days) × **30 attendees** with $150K budget.
### How the CSP Solver Works

```text
1. BUILD domains: For each speaker, find all valid (venue, timeSlot) pairs
2. AC-3 PRE-PROCESSING: Prune impossible values via arc consistency
3. BACKTRACK with MRV: Pick the speaker with fewest remaining options
4. CAPACITY-AWARE LCV: Sort venue choices by demand fit, then load balance
5. FORWARD CHECK: After each assignment, prune neighbor domains
6. BUDGET CHECK: Only accept complete assignments within budget
7. DIFF: Compare old vs new schedule, generate change explanations
```

### Contributing

Contributions welcome! Some ideas:

- Real LLM integration for richer agent reasoning
- Drag-and-drop schedule editing
- PDF/Excel export
- Multi-user real-time collaboration
- Soft constraint relaxation with user approval
- Calendar integration (Google Calendar, Outlook)

**Built with pure JavaScript — no frameworks, no APIs, no nonsense.**
