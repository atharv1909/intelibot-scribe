import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type IdeaGraphNodeData = {
  label: string;
  type: 'user_idea' | 'existing_work' | 'methodology' | 'gap' | 'application';
  description: string;
};

function CustomNode({ data }: { data: IdeaGraphNodeData }) {
  const nodeType = data?.type || 'existing_work';
  const isUserIdea = nodeType === 'user_idea';
  const isGap = nodeType === 'gap';

  const borderColor = isUserIdea ? 'border-[var(--forest)] shadow-md' : isGap ? 'border-[var(--warn)]' : 'border-[var(--sienna)]';
  const badgeColor = isUserIdea ? 'bg-[var(--forest)] text-[var(--forest-foreground)]' : isGap ? 'bg-[var(--warn)] text-[var(--warn-foreground)]' : 'bg-[var(--sienna)] text-[var(--sienna-foreground)]';

  return (
    <div className={`px-4 py-3 rounded-sm border-2 bg-[var(--parchment)] text-[var(--ink)] min-w-[200px] max-w-[260px] shadow-paper ${borderColor}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wider ${badgeColor}`}>
          {nodeType.replace('_', ' ')}
        </span>
      </div>
      <div className="font-semibold text-xs text-[var(--ink)] leading-snug line-clamp-2">
        {data.label}
      </div>
      {data.description && (
        <div className="mt-1 text-[11px] text-[var(--muted-foreground)] leading-tight line-clamp-2">
          {data.description}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export function IdeaGraphCanvas({ nodesData, edgesData }: { nodesData: any[]; edgesData: any[] }) {
  const { nodes, edges } = useMemo(() => {
    const centerNode = nodesData.find((n) => n.type === 'user_idea') || nodesData[0];
    const outerNodes = nodesData.filter((n) => n.id !== centerNode?.id);

    const radius = 220;
    const centerX = 350;
    const centerY = 220;

    const rfNodes: Node[] = [];

    if (centerNode) {
      rfNodes.push({
        id: centerNode.id,
        type: 'custom',
        position: { x: centerX, y: centerY },
        data: { label: centerNode.label, type: centerNode.type, description: centerNode.description },
      });
    }

    outerNodes.forEach((node, idx) => {
      const angle = (idx / outerNodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      rfNodes.push({
        id: node.id,
        type: 'custom',
        position: { x, y },
        data: { label: node.label, type: node.type, description: node.description },
      });
    });

    const rfEdges: Edge[] = edgesData.map((e, idx) => ({
      id: `e-${idx}`,
      source: e.source,
      target: e.target,
      label: e.label || e.relationship,
      labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' },
      labelBgStyle: { fill: 'var(--parchment)', fillOpacity: 0.95 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      animated: e.relationship === 'extends' || e.relationship === 'fills_gap',
      style: { stroke: e.relationship === 'contradicts' ? 'oklch(0.5 0.17 27)' : 'var(--sienna)', strokeWidth: 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.relationship === 'contradicts' ? 'oklch(0.5 0.17 27)' : 'var(--sienna)' },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [nodesData, edgesData]);

  return (
    <div className="w-full h-[480px] rounded-sm border border-[var(--rule)] bg-[var(--background)] overflow-hidden relative paper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="bg-[var(--background)]"
      >
        <Background color="var(--rule)" gap={20} size={1} />
        <Controls className="!bg-[var(--parchment)] !border-[var(--rule)] !text-[var(--ink)]" />
        <MiniMap
          nodeColor={(n: any) => (n.data?.type === 'user_idea' ? 'oklch(0.43 0.062 165)' : n.data?.type === 'gap' ? 'oklch(0.62 0.13 68)' : 'oklch(0.44 0.09 45)')}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-[var(--parchment)] !border-[var(--rule)]"
        />
      </ReactFlow>
    </div>
  );
}
