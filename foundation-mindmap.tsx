import React, { useState } from 'react';

const MindMap = () => {
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const Node = ({ id, title, color, children, level = 0 }) => (
    <div className={`relative ${level === 0 ? 'mb-4' : 'mb-2'}`}>
      <div 
        className={`
          cursor-pointer rounded-lg p-3 shadow-md transition-all
          hover:shadow-lg border-l-4 ${color}
          ${level === 0 ? 'text-lg font-bold' : 'text-base'}
        `}
        onClick={() => toggleNode(id)}
      >
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm bg-gray-700 text-white px-2 py-1 rounded-full">{id}</span>
        </div>
      </div>
      {expandedNodes[id] && children && (
        <div className="ml-8 mt-2 pl-4 border-l-2 border-gray-300">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Module 1: Foundation Techniques Mind Map
      </h2>
      
      {/* Core Concepts - Blue Section */}
      <Node 
        id="1.0" 
        title="Foundation Techniques" 
        color="border-blue-500 bg-blue-50"
        level={0}
      >
        <Node 
          id="1.1" 
          title="Basic Understanding" 
          color="border-blue-400 bg-blue-50"
        >
          <Node id="1.1.1" title="Core Concepts" color="border-blue-300 bg-blue-50" />
          <Node id="1.1.2" title="Terminology" color="border-blue-300 bg-blue-50" />
          <Node id="1.1.3" title="Framework Basics" color="border-blue-300 bg-blue-50" />
        </Node>

        {/* Prompt Components - Purple Section */}
        <Node 
          id="1.2" 
          title="Prompt Components" 
          color="border-purple-400 bg-purple-50"
        >
          <Node id="1.2.1" title="Structure Elements" color="border-purple-300 bg-purple-50" />
          <Node id="1.2.2" title="Context Setting" color="border-purple-300 bg-purple-50" />
          <Node id="1.2.3" title="Instruction Design" color="border-purple-300 bg-purple-50" />
          <Node id="1.2.4" title="Output Formatting" color="border-purple-300 bg-purple-50" />
        </Node>

        {/* Prompt Types - Green Section */}
        <Node 
          id="1.3" 
          title="Prompt Types" 
          color="border-green-400 bg-green-50"
        >
          <Node id="1.3.1" title="Zero-shot Prompts" color="border-green-300 bg-green-50" />
          <Node id="1.3.2" title="Few-shot Prompts" color="border-green-300 bg-green-50" />
          <Node id="1.3.3" title="Chain-of-thought" color="border-green-300 bg-green-50" />
        </Node>

        {/* Implementation - Orange Section */}
        <Node 
          id="1.4" 
          title="Implementation" 
          color="border-orange-400 bg-orange-50"
        >
          <Node id="1.4.1" title="Best Practices" color="border-orange-300 bg-orange-50" />
          <Node id="1.4.2" title="Common Patterns" color="border-orange-300 bg-orange-50" />
          <Node id="1.4.3" title="Error Handling" color="border-orange-300 bg-orange-50" />
          <Node id="1.4.4" title="Optimization" color="border-orange-300 bg-orange-50" />
        </Node>

        {/* Advanced Concepts - Red Section */}
        <Node 
          id="1.5" 
          title="Advanced Concepts" 
          color="border-red-400 bg-red-50"
        >
          <Node id="1.5.1" title="Context Windows" color="border-red-300 bg-red-50" />
          <Node id="1.5.2" title="Token Management" color="border-red-300 bg-red-50" />
          <Node id="1.5.3" title="Model Specifics" color="border-red-300 bg-red-50" />
        </Node>
      </Node>

      {/* Legend */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Color Legend:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500 mr-2"></div>
            <span>Core Concepts</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-50 border-l-4 border-purple-500 mr-2"></div>
            <span>Prompt Components</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-50 border-l-4 border-green-500 mr-2"></div>
            <span>Prompt Types</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-50 border-l-4 border-orange-500 mr-2"></div>
            <span>Implementation</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-50 border-l-4 border-red-500 mr-2"></div>
            <span>Advanced Concepts</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Click on any node to expand/collapse its children
      </div>
    </div>
  );
};

export default MindMap;