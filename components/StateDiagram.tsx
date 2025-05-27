"use client";

import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
  Position,
  NodeTypes,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface StateNodeData {
  label: string;
  isStart?: boolean;
  isAccept?: boolean;
  isHighlighted?: boolean;
  isCurrent?: boolean;
}

interface StateDiagramProps {
  states: Array<{
    id: string;
    isStartState?: boolean;
    isAcceptState?: boolean;
  }>;
  transitions: Array<{
    from: string;
    to: string;
    symbol: string;
  }>;
  highlightedStates?: string[];
  highlightedEdges?: string[];
  title?: string;
  className?: string;
}

const StateNode = ({ data }: { data: StateNodeData }) => {
  return (
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center relative
        ${data.isHighlighted ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border border-gray-300'}
        ${data.isAccept ? 'border-double border-4' : ''}
        ${data.isCurrent ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
    >
      <span className="text-sm font-medium">{data.label}</span>
      {data.isStart && (
        <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-4">
          <div className="w-4 h-1 bg-gray-400"></div>
          <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 transform rotate-45 -mt-1"></div>
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  state: StateNode,
};

export function StateDiagram({
  states,
  transitions,
  highlightedStates = [],
  highlightedEdges = [],
  title,
  className = 'h-96',
}: StateDiagramProps) {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  // Convert states and transitions to ReactFlow nodes and edges
  const updateDiagram = useCallback(() => {
    const position = { x: 0, y: 0 };
    let x = 50;
    let y = 50;
    const nodeWidth = 48;
    const nodeHeight = 48;
    const horizontalSpacing = 150;
    const verticalSpacing = 120;

    // Create nodes
    const newNodes: Node[] = states.map((state, index) => {
      const isHighlighted = highlightedStates.includes(state.id);
      const isStart = state.isStartState;
      const isAccept = state.isAcceptState;
      
      // Simple grid layout
      if (index > 0 && index % 3 === 0) {
        x = 50;
        y += verticalSpacing;
      } else if (index > 0) {
        x += horizontalSpacing;
      }

      return {
        id: state.id,
        type: 'state',
        position: { x, y },
        data: { 
          label: state.id.replace(/{|}/g, ''), // Remove curly braces from state IDs
          isStart,
          isAccept,
          isHighlighted,
          isCurrent: isHighlighted
        },
        style: {
          width: nodeWidth,
          height: nodeHeight,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      };
    });

    // Add start arrow for start state
    const startState = states.find(s => s.isStartState);
    if (startState) {
      newNodes.push({
        id: 'start',
        type: 'input',
        position: { x: position.x - 40, y: position.y + 25 },
        data: { label: '' },
        style: { background: 'transparent', border: 'none' },
      });
    }

    // Create edges
    const newEdges: Edge[] = [];
    const edgeMap = new Map<string, { symbols: Set<string>; edge: Edge }>();

    transitions.forEach(transition => {
      const edgeKey = `${transition.from}-${transition.to}`;
      const isHighlighted = highlightedEdges.includes(`${transition.from}-${transition.to}-${transition.symbol}`);
      
      if (edgeMap.has(edgeKey)) {
        // If edge already exists, just add the symbol to the label
        const existing = edgeMap.get(edgeKey)!;
        existing.symbols.add(transition.symbol);
        existing.edge.label = Array.from(existing.symbols).join(',');
      } else {
        // Create new edge
        const edge: Edge = {
          id: `e${transition.from}-${transition.to}-${transition.symbol}`,
          source: transition.from,
          target: transition.to,
          label: transition.symbol,
          type: 'smoothstep',
          animated: isHighlighted,
          style: {
            stroke: isHighlighted ? '#3b82f6' : '#666',
            strokeWidth: isHighlighted ? 2 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlighted ? '#3b82f6' : '#666',
          },
          labelStyle: { 
            fontSize: 12,
            fill: isHighlighted ? '#3b82f6' : '#666',
          },
        };
        edgeMap.set(edgeKey, { symbols: new Set([transition.symbol]), edge });
        newEdges.push(edge);
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [states, transitions, highlightedStates, highlightedEdges, setNodes, setEdges]);

  React.useEffect(() => {
    updateDiagram();
  }, [updateDiagram]);

  return (
    <div className={`flex flex-col ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={[1, 2]} // Only allow pan with middle/right mouse button
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
