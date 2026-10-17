import { getDb } from '../db.js';
import {
  getTasksForProject,
  getDependenciesForProject,
  getProjectById,
} from '../models/projectModel.js';
import {
  isWorkingDate,
  addWorkingDays,
  formatDateYMD,
  parseYMD,
} from '../utils/calendar.js';

/**
 * Compute CPM analysis for a project.
 * Returns:
 *  - tasks: array of tasks with ES, EF, LS, LF, slack, is_critical
 *  - totalDuration: number of working days from project start to latest finish
 *  - criticalPath: array of task ids that are critical
 *  - scheduleStart: project start date (calendar)
 *  - scheduleFinish: calculated finish date (calendar)
 *  - error?: message when dependency cycle exists
 */
export function getCriticalPathForProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) {
    return { error: 'Proyek tidak ditemukan.' };
  }

  const tasks = getTasksForProject(projectId);
  const dependencies = getDependenciesForProject(projectId);

  if (tasks.length === 0) {
    return {
      project: { id: project.id, name: project.name },
      tasks: [],
      totalDuration: 0,
      criticalPath: [],
      scheduleStart: project.start_date,
      scheduleFinish: project.start_date,
      taskCount: 0,
    };
  }

  // Validate: dependencies should reference known tasks in the same project.
  // Some callers may only provide IDs without joined predecessor/successor objects,
  // so validate using IDs where possible and skip incomplete entries instead of
  // failing the whole CPM computation.

  // Build graph
  const taskMap = new Map();
  for (const t of tasks) {
    taskMap.set(t.id, {
      id: t.id,
      name: t.name,
      duration: Math.max(1, Number(t.duration) || 1),
      predecessors: [],
      successors: [],
      start_date: t.start_date,
      progress: t.progress,
      status: t.status,
      priority: t.priority,
    });
  }
  
    for (const d of dependencies) {
    const predId = d.predecessor_id;
    const succId = d.successor_id;
    if (predId == null || succId == null) {
      continue;
    }
    const predTask = taskMap.get(predId);
    const succTask = taskMap.get(succId);
    if (!predTask || !succTask) {
      continue;
    }
    if (
      predTask.project_id == null ||
      succTask.project_id == null
    ) {
      continue;
    }
    if (
      predTask.project_id !== projectId ||
      succTask.project_id !== projectId
    ) {
      return { error: 'Dependency menghubungkan tugas dari proyek yang berbeda.' };
    }
    if (predTask.parent_task_id || succTask.parent_task_id) {
      return { error: 'Dependency hanya didukung untuk tugas utama.' };
    }
  }

  const depEdges = [];
  for (const d of dependencies) {
    const from = taskMap.get(d.predecessor_id);
    const to = taskMap.get(d.successor_id);
    if (!from || !to) continue;
    from.successors.push({ task: to, type: d.type, lag: d.lag });
    to.predecessors.push({ task: from, type: d.type, lag: d.lag });
    depEdges.push({ from: d.predecessor_id, to: d.successor_id, type: d.type, lag: d.lag });
  }

  // Cycle detection via topological sort (Kahn)
  const inDegree = new Map();
  for (const t of taskMap.values()) inDegree.set(t.id, 0);
  for (const e of depEdges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }

  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topo = [];
  while (queue.length) {
    const id = queue.shift();
    topo.push(id);
    const node = taskMap.get(id);
    for (const s of node.successors) {
      const newDeg = (inDegree.get(s.task.id) || 1) - 1;
      inDegree.set(s.task.id, newDeg);
      if (newDeg === 0) queue.push(s.task.id);
    }
  }

  if (topo.length !== taskMap.size) {
    return {
      project: { id: project.id, name: project.name },
      tasks: [],
      totalDuration: 0,
      criticalPath: [],
      scheduleStart: project.start_date,
      scheduleFinish: project.start_date,
      taskCount: tasks.length,
      error: 'Graf dependency mengandung siklus. CPM tidak dapat dihitung.',
    };
  }

  const calendar = project;
  const projectStart = project.start_date;

  // --- Forward pass ---
  const ES = new Map();
  const EF = new Map();

  for (const id of topo) {
    const node = taskMap.get(id);
    let earliest = 0;

    // Base: project start date (index 0 at project start)
    // We compute index relative to project start, measuring working days
    // For now we use a simple model: start_index = working-day index from project start
    // We'll compute earliest index as max of predecessor constraints

    if (node.predecessors.length === 0) {
      // No predecessor: start from project start (index 0)
      earliest = 0;
    } else {
      for (const pred of node.predecessors) {
        const predEF = EF.get(pred.task.id);
        let candidate;
        if (pred.type === 'SS') {
          // Start-to-Start: successor ES >= predecessor ES + lag
          candidate = (ES.get(pred.task.id) || 0) + pred.lag;
        } else {
          // Finish-to-Start: successor ES >= predecessor EF + lag
          candidate = (EF.get(pred.task.id) || 0) + pred.lag;
        }
        if (candidate > earliest) earliest = candidate;
      }
    }

    ES.set(id, earliest);
    EF.set(id, earliest + node.duration);
  }

  // --- Backward pass ---
  const maxEF = Math.max(...Array.from(EF.values()));
  const LF = new Map();
  const LS = new Map();

  // Initialize LF for nodes with no successors to maxEF
  for (const id of topo) {
    const node = taskMap.get(id);
    if (node.successors.length === 0) {
      LF.set(id, maxEF);
    }
  }

  // Process in reverse topological order
  const reversed = [...topo].reverse();
  for (const id of reversed) {
    const node = taskMap.get(id);
    if (node.successors.length > 0) {
      let latestLF = Infinity;
      for (const succ of node.successors) {
        const succLS = LS.get(succ.task.id);
        let candidate;
        if (succ.type === 'SS') {
          // SS: predecessor LS <= successor LS - lag
          candidate = (succLS || 0) - succ.lag;
        } else {
          // FS: predecessor LF <= successor LS - lag => LF = LS - lag
          // Predecessor LF <= successor LS - lag
          candidate = (succLS || 0) - succ.lag;
        }
        if (candidate < latestLF) latestLF = candidate;
      }
      LF.set(id, latestLF);
    }
  }

  // Compute LS from LF - duration
  for (const id of topo) {
    const node = taskMap.get(id);
    const lf = LF.get(id);
    LS.set(id, lf - node.duration);
  }

  // Slack = LS - ES
  const results = [];
  const criticalPath = [];
  for (const id of topo) {
    const node = taskMap.get(id);
    const es = ES.get(id);
    const ef = EF.get(id);
    const ls = LS.get(id);
    const lf = LF.get(id);
    const slack = Math.round((ls - es) * 100) / 100;
    const isCritical = Math.abs(slack) < 0.0001;
    if (isCritical) criticalPath.push(id);

    // Convert ES/EF indices to calendar dates based on project start + working days
    const startDateObj = parseYMD(projectStart);
    const esDate = indexToDate(projectStart, es, calendar);
    const efDate = indexToDate(projectStart, ef, calendar);

    results.push({
      id: node.id,
      name: node.name,
      duration: node.duration,
      priority: node.priority,
      status: node.status,
      progress: node.progress,
      es,
      ef,
      ls,
      lf,
      slack,
      is_critical: isCritical,
      es_date: esDate,
      ef_date: efDate,
      start_date: node.start_date,
      // For display
      earliest_start: esDate,
      earliest_finish: efDate,
    });
  }

  // scheduleFinish = EF of last task (maxEF) converted to date
  const scheduleFinish = indexToDate(projectStart, maxEF, calendar);

  return {
    project: { id: project.id, name: project.name },
    tasks: results,
    totalDuration: maxEF,
    criticalPath,
    scheduleStart: projectStart,
    scheduleFinish,
    taskCount: tasks.length,
    dependencyCount: dependencies.length,
    error: null,
  };
}

/**
 * Convert an index (working-day count from project start) to a calendar date.
 * Index 0 = project start date (if working day) else first working day.
 * We use addWorkingDays to advance from project start by index working days.
 */
function indexToDate(projectStart, index, project) {
  if (index <= 0) return projectStart;

  // Simple & safe: hitung tanggal dengan mengabaikan Sabtu/Minggu
  // (versi sederhana, tidak menghitung hari libur khusus — bisa ditambahkan nanti)
  const start = parseYMD(projectStart);
  if (!start) return projectStart;

  const workingDays = [1, 2, 3, 4, 5]; // Senin-Jumat
  let current = new Date(start);
  let count = 0;

  // Advance index hari kerja
  while (count < index) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay(); // 0=Minggu, 6=Sabtu
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
    // Safety: max 10000 iterasi untuk hindari infinite loop
    if (count > 10000) break;
  }

  return formatDateYMD(current);
}

/**
 * Build Gantt chart data for Frappe Gantt.
 * Returns array of task objects with start, end, name, progress, etc.
 */
export function getGanttForProject(projectId) {
  const cpm = getCriticalPathForProject(projectId);
  if (cpm.error) {
    return { error: cpm.error, tasks: [], project: cpm.project };
  }

  const ganttTasks = cpm.tasks.map((t) => ({
    id: String(t.id),
    name: t.name,
    start: t.es_date,
    end: t.ef_date,
    duration: t.duration,
    progress: t.progress,
    priority: t.priority,
    status: t.status,
    is_critical: t.is_critical,
    parent: null,
    dependencies: [], // filled later
  }));

  // Build dependency lines for display
  const project = getProjectById(projectId);
  const dependencies = project ? (project.dependencies || []) : [];
  const dependencyLines = dependencies.map((d) => ({
    from: String(d.predecessor_id),
    to: String(d.successor_id),
    type: d.type,
    lag: d.lag,
  }));

  // Attach subtasks (children)
  const taskById = new Map(ganttTasks.map((t) => [t.id, t]));
  for (const t of ganttTasks) {
    // find subtasks in cpm tasks (they have same project and parent id)
    // cpm only includes main tasks, so subtasks not included here for simplicity
    t.parent = null;
  }

  return {
    project: cpm.project,
    tasks: ganttTasks,
    dependencies: dependencyLines,
    totalDuration: cpm.totalDuration,
    scheduleStart: cpm.scheduleStart,
    scheduleFinish: cpm.scheduleFinish,
    criticalPath: cpm.criticalPath,
    error: null,
  };
}

/**
 * Build PERT chart data for React Flow.
 * Returns nodes and edges based on CPM results.
 */
export function getPertForProject(projectId) {
  const cpm = getCriticalPathForProject(projectId);
  if (cpm.error) {
    return { error: cpm.error, nodes: [], edges: [], project: cpm.project };
  }

  const nodes = cpm.tasks.map((t) => ({
    id: String(t.id),
    name: t.name,
    duration: t.duration,
    es: t.es,
    ef: t.ef,
    ls: t.ls,
    lf: t.lf,
    slack: t.slack,
    is_critical: t.is_critical,
    es_date: t.es_date,
    ef_date: t.ef_date,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    position: { x: 0, y: 0 }, // layout handled by frontend or auto-layout
  }));

  const edges = [];
  const project = getProjectById(projectId);
  const dependencies = project ? (project.dependencies || []) : [];
  for (const d of dependencies) {
    edges.push({
      id: `e-${d.id}`,
      source: String(d.predecessor_id),
      target: String(d.successor_id),
      type: d.type,
      lag: d.lag,
    });
  }

  // Auto-layout: simple layered approach based on topological depth
  const layout = computeLayout(cpm.tasks, dependencies);
  for (const n of nodes) {
    const pos = layout.get(n.id);
    if (pos) {
      n.position = { x: pos.x, y: pos.y };
    }
  }

  return {
    project: cpm.project,
    nodes,
    edges,
    totalDuration: cpm.totalDuration,
    scheduleStart: cpm.scheduleStart,
    scheduleFinish: cpm.scheduleFinish,
    criticalPath: cpm.criticalPath,
    error: null,
  };
}

/**
 * Compute simple layered layout for PERT nodes.
 * Assigns layer based on longest path from source (ES), then positions within layer.
 */
function computeLayout(tasks, dependencies) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const layer = new Map();

  // Calculate layer = ES value (approximate depth)
  for (const t of tasks) {
    layer.set(t.id, t.es);
  }

  // Group by layer
  const layers = new Map();
  for (const [id, l] of layer) {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l).push(id);
  }

  // Position: x based on layer index with spacing, y based on order within layer
  const layerSpacing = 250;
  const nodeSpacing = 180;
  const positions = new Map();

  let globalY = 80;
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  for (const l of sortedLayers) {
    const ids = layers.get(l);
    const x = l * layerSpacing + 120;
    for (let i = 0; i < ids.length; i++) {
      positions.set(ids[i], { x, y: globalY + i * nodeSpacing });
    }
    globalY += ids.length * nodeSpacing + 60;
  }

  return positions;
}
