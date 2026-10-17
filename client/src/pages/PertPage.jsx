import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  GitBranch,
  Minimize,
  Maximize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const CRITICAL_BG = '#DC2626';
const NORMAL_BG = '#FFFFFF';
const CRITICAL_BORDER = '#B91C1C';
const NORMAL_BORDER = '#E2E8F0';

function PertNode({ data, selected }) {
  const {
    id,
    name,
    duration,
    es,
    ef,
    ls,
    lf,
    slack,
    is_critical,
    es_date,
    ef_date,
    priority,
    status,
  } = data;

  const bgColor = is_critical ? CRITICAL_BG : NORMAL_BG;
  const borderColor = is_critical ? CRITICAL_BORDER : NORMAL_BORDER;
  const textColor = is_critical ? '#FFFFFF' : '#0F172A';

  return (
    <div
      className="rounded-lg border p-3 shadow-sm transition-shadow cursor-pointer"
      style={{
        backgroundColor: bgColor,
        borderColor,
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? '0 0 0 3px rgba(37, 99, 235, 0.3)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: textColor, opacity: 0.7 }}>
          T{id}
        </span>
        {is_critical && (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: textColor }}>
            CRITICAL
          </span>
        )}
      </div>
      <div className="text-sm font-semibold truncate" style={{ color: textColor }}>
        {name}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]" style={{ color: is_critical ? 'rgba(255,255,255,0.85)' : '#64748B' }}>
        <span>Durasi: {duration}h</span>
        <span>Slack: {slack.toFixed(1)}d</span>
        <span>ES: {es_date}</span>
        <span>EF: {ef_date}</span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] uppercase" style={{ color: is_critical ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{
          backgroundColor: priority === 'High' ? '#EA580C' : priority === 'Medium' ? '#F59E0B' : '#2563EB'
        }} />
        {priority} · {status}
      </div>
    </div>
  );
}

function CustomPanel({ projectId }) {
  const [zoom, setZoom] = useState(1);

  return (
    <Panel position="top-right" className="flex items-center gap-2 p-1">
      <button
        onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:bg-border/60"
        title="Zoom out"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs text-text-secondary w-8 text-center">{Math.round(zoom * 100)}%</span>
      <button
        onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:bg-border/60"
        title="Zoom in"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => {}}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:bg-border/60"
        title="Fit view"
      >
        <Minimize className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => {
          window.open(`/projects/${projectId}/tasks`, '_blank');
        }}
        className="rounded border border-border bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
        title="Daftar tugas"
      >
        <GitBranch className="h-3.5 w-3.5" />
      </button>
    </Panel>
  );
}

function EmptyPert() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
        <GitBranch className="h-7 w-7 text-text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">Belum ada data PERT</p>
        <p className="mt-0.5 text-xs text-text-secondary">Tambahkan tugas dan dependency untuk melihat diagram PERT.</p>
      </div>
    </div>
  );
}

export default function PertPage() {
  const { projectId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/pert`);
      const pertData = res.data || {};
      setData(pertData);

      const nodesData = pertData.nodes || [];
      const edgesData = pertData.edges || [];

      setNodes(
        nodesData.map((n) => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: 0, y: 0 },
          data: {
            ...n,
            id: n.id,
          },
        }))
      );

      setEdges(
        edgesData.map((e) => ({
          id: e.id || `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          type: e.type === 'SS' ? 'smoothstep' : 'default',
          label: e.type || '',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: pertData.criticalPath?.includes(Number(e.target)) ? CRITICAL_BG : '#64748B',
          },
          style: {
            stroke: pertData.criticalPath?.includes(Number(e.target)) ? CRITICAL_BG : '#CBD5E1',
            strokeWidth: pertData.criticalPath?.includes(Number(e.target)) ? 2 : 1.5,
          },
        }))
      );
    } catch (err) {
      setError(err.message || 'Gagal memuat data PERT.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onNodeClick = useCallback((event, node) => {
    const taskId = node.data.id;
    if (taskId) {
      window.location.href = `/projects/${projectId}/tasks/${taskId}`;
    }
  }, [projectId]);

  const nodeTypes = useMemo(
    () => ({
      custom: PertNode,
    }),
    []
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat PERT...</span>
          </div>
        </div>
        <div className="h-[500px] animate-pulse rounded-card bg-border" />
      </div>
    );
  }

  if (error && (!data || !data.nodes?.length)) {
    return (
      <div className="mx-auto max-w-7xl">
        <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Overview
        </Link>
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={fetchData} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.nodes?.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
          <LinkToArrow className="h-4 w-4" />
          Kembali ke Overview
        </Link>
        <div className="rounded-card border border-border bg-surface shadow-sm p-6">
          <EmptyPert />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb */}
      <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <LinkToArrow className="h-4 w-4" />
        Kembali ke Overview
      </Link>

      {error && data?.nodes?.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Peringatan</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">PERT Chart</h1>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CRITICAL_BG }} />
            Critical Path
          </span>
          <span>·</span>
          <span>{data.nodes?.length || 0} node</span>
          <span>·</span>
          <span>{data.edges?.length || 0} edge</span>
          <span>·</span>
          <span> total: {data.totalDuration || 0} hari</span>
        </div>
      </div>

      {/* React Flow */}
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
          connectionLineStyle={{ stroke: '#94A3B8', strokeWidth: 2 }}
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
          className="pt-16"
        >
          <Background color="#E2E8F0" gap={20} size={1} />
          <MiniMap
            nodeColor={(node) => {
              const isCrit = node.data?.is_critical;
              return isCrit ? CRITICAL_BG : '#CBD5E1';
            }}
            maskColor="rgba(0,0,0,0.05)"
            style={{ backgroundColor: '#FFFFFF' }}
          />
          <CustomPanel projectId={projectId} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: CRITICAL_BG }} />
          <span>Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#2563EB' }} />
          <span>Low priority</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
          <span>Medium priority</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#EA580C' }} />
          <span>High priority</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span>Klik node untuk melihat detail tugas</span>
        </div>
      </div>
    </div>
  );
}

function ArrowLeft({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function LinkToArrow({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}
