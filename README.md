# ProMan - Project Manager

Full-stack web application for project management with work calendar, tasks, dependencies, team management, workload, and Critical Path Method (CPM) analysis.

## Tech Stack

- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- Authentication: express-session + bcrypt
- Frontend: React + Vite + Tailwind CSS
- Gantt Chart: Frappe Gantt
- PERT Chart: React Flow
- Icons: Lucide React

## Requirements

- Node.js >= 18
- npm

## Installation

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

## Configuration

Copy `.env.example` to `.env` and adjust if needed.

```bash
cp .env.example .env
```

Default environment variables:

- `PORT` — port for backend server (default 3001)
- `SESSION_SECRET` — secret key for session cookies
- `NODE_ENV` — environment (development/production)

For local development without HTTPS, session cookie is configured to work over HTTP.
In production, set `NODE_ENV=production` and use HTTPS.

## Running

### Development (both backend and frontend)

```bash
# From project root
npm run dev
```

Or run separately:

```bash
# Backend
cd server
npm run dev

# Frontend (new terminal)
cd client
npm run dev
```

Frontend dev server runs on port 5173 and proxies API requests to backend.

### Production build

```bash
cd client
npm run build
cd ..
npm run start
```

## Database

Database is created automatically on first run at `server/data/proman.db`.

Do not delete the database file between server restarts. The database persists Project data.

## Seeder

The admin account is seeded automatically on first run:

- Username: admin
- Password: admin123

Password is hashed with bcrypt. Seeder is idempotent — running it repeatedly does not create duplicate admin accounts.

## API

All API endpoints except authentication require an active session (login first).

### Auth

- POST /api/auth/login — login with username and password
- POST /api/auth/logout — logout
- GET /api/auth/me — check current session

### Projects

- GET /api/projects — list projects
- POST /api/projects — create project
- GET /api/projects/:id — project detail
- PUT /api/projects/:id — update project
- DELETE /api/projects/:id — delete project (cascade)

### Calendar

- GET /api/projects/:id/calendar — work calendar
- PUT /api/projects/:id/calendar — update calendar
- GET /api/projects/:id/holidays — list holidays
- POST /api/projects/:id/holidays — add holiday
- PUT /api/projects/:id/holidays/:holidayId — update holiday
- DELETE /api/projects/:id/holidays/:holidayId — delete holiday

### Tasks

- GET /api/projects/:id/tasks — list tasks for project
- POST /api/projects/:id/tasks — create task
- GET /api/tasks/:id — task detail
- PUT /api/tasks/:id — update task
- DELETE /api/tasks/:id — delete task
- GET /api/tasks/:id/subtasks — list subtasks
- POST /api/tasks/:id/subtasks — add subtask
- PUT /api/subtasks/:id — update subtask
- DELETE /api/subtasks/:id — delete subtask

### Dependencies

- GET /api/projects/:id/dependencies — list dependencies
- POST /api/projects/:id/dependencies — add dependency
- PUT /api/dependencies/:id — update dependency
- DELETE /api/dependencies/:id — delete dependency

### Team

- GET /api/projects/:id/team — list team members
- POST /api/projects/:id/team — add member
- GET /api/team/:id — member detail
- PUT /api/team/:id — update member
- DELETE /api/team/:id — delete member
- GET /api/team/:id/leaves — list leaves
- POST /api/team/:id/leaves — add leave
- DELETE /api/leaves/:id — delete leave

### Assignments

- GET /api/tasks/:id/assignments — list assignments
- POST /api/tasks/:id/assignments — assign member to task
- DELETE /api/assignments/:id — remove assignment
- GET /api/projects/:id/workload — workload per member

### Analysis

- GET /api/projects/:id/critical-path — CPM analysis
- GET /api/projects/:id/gantt — data for Gantt chart
- GET /api/projects/:id/pert — data for PERT chart

## Work Calendar Rules

- Each project has one work calendar.
- Default: Monday–Friday as working days, Saturday–Sunday as weekly holidays.
- Tasks duration is measured in working days.
- Saturday and Sunday are counted as working days only if enabled.
- Custom holidays are not counted as working days.
- Task start date must be a valid working day.
- Duration addition and lag skip non-working days.
- A centralized calendar utility ensures consistency between backend calculations and frontend display.

## Critical Path Method (CPM)

CPM is calculated from all main tasks and valid dependencies in a project.

### Output per task

- ES (Earliest Start) — earliest working-day index when task can start
- EF (Earliest Finish) — ES + duration
- LS (Latest Start) — LF - duration
- LF (Latest Finish) — latest working-day index when task must finish
- Slack/Float — LS - ES
- Critical status — task with zero slack
- Earliest start date (calendar)
- Earliest finish date (calendar)

### Project output

- Total project duration based on CPM
- Schedule start date
- Calculated finish date
- List of critical tasks
- List of tasks with slack
- Error message if dependencies are invalid or graph has a cycle

### Conventions

- ES is the first working day index the task starts.
- EF is the boundary after the last working day: EF = ES + duration.
- LS = LF - duration.
- Slack = LS - ES.

### Forward pass

1. Topological sort of dependency graph.
2. For each task, determine earliest start from project start date, task minimum start date, and all predecessors.
3. Tasks without predecessors start from their valid earliest start.
4. FS: successor cannot start before predecessor finish + lag.
5. SS: successor cannot start before predecessor start + lag.
6. Take the maximum of all constraints.
7. Calculate EF from ES and duration.

### Backward pass

1. Project finish bound from maximum EF of final tasks.
2. Tasks without successors use project finish bound as LF.
3. Process tasks in reverse topological order.
4. FS: limit predecessor start based on successor start, lag, and predecessor duration.
5. SS: limit predecessor start based on successor start and lag.
6. Use the strictest bound from all successors.
7. Calculate LS, LF, and slack consistently.

### Critical path identification

- Tasks with zero slack are critical.
- Multiple critical paths with the same duration are possible.
- Total project duration is the latest finish based on CPM results.
- Empty project shows empty state, not misleading values.
- Cyclic graph does not produce analysis as if valid.

## Folder Structure

```
proman/
├── server/                 # Backend
│   ├── server.js           # Express app entry
│   ├── package.json
│   ├── .env.example
│   ├── data/               # SQLite database
│   ├── models/             # Database queries
│   ├── controllers/        # Request handlers
│   ├── routes/             # Express routers
│   ├── middlewares/        # Auth, error handler
│   ├── services/           # Business logic (CPM, calendar, dependency)
│   ├── utils/              # Calendar utility, helpers
│   ├── scripts/            # DB init, seeder
│   └── tests/              # Automated tests
├── client/                 # Frontend
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── api/            # API client
│       ├── components/     # Reusable components
│       ├── layouts/        # App layout
│       ├── pages/          # Page components
│       ├── context/        # Auth context
│       ├── hooks/          # Custom hooks
│       └── utils/          # Calendar utils, formatters
├── package.json            # Root scripts
├── .env.example
└── README.md
```

## Security

- bcrypt for password hashing
- express-session for session management
- Protected API endpoints require valid session
- Input validation on both frontend and backend
- Prepared statements via better-sqlite3
- Centralized error handler
- Session secret via environment variable
- .gitignore excludes database, .env, and node_modules

## Limitations

- Single user account (admin) for demo purposes.
- Session cookie configured for local HTTP development.
- Frontend dev server proxies API to avoid CORS issues during development.
- No automated deployment or production hardening by default.

## Troubleshooting

- If database is missing, delete `server/data/proman.db` and restart server to recreate.
- If login fails, ensure seeder ran and admin account exists.
- If session issues occur, check SESSION_SECRET and cookie configuration.
- For API errors, check server terminal for detailed messages.

## Tampilan Antarmuka (UI)
![Dashboard](dashboard.png)
![Gantt Chart](gantt.png)
