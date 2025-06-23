import React from 'react';
import { ChevronDownIcon } from '../icons';

type SidebarProps = {
    activeView: string;
    setActiveView: (view: string) => void;
};

const NAV_ITEMS = [
  {
    section: 'Teams',
    items: [
      {
        subSection: 'Github',
        subItems: [
          { viewName: 'issue-analyzer', label: 'Issues' },
          { viewName: 'pr-analyzer', label: 'PRs' },
        ],
      },
      { viewName: 'devops', label: 'OpenShift' },
      { viewName: 'automation', label: 'Ansible' },
    ],
  },
  {
    section: 'Team Management',
    items: [
      { viewName: 'create-agents', label: 'Create your agents' },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => (
  <nav className="bg-[#18181B] text-white w-64 p-6 space-y-10 flex-shrink-0 border-r border-gray-800 min-h-screen" aria-label="Sidebar">
    <div className="border-b border-gray-700 pb-4 mb-8">
      <label htmlFor="project-selector" className="text-xs text-gray-400 font-semibold tracking-wide">Project</label>
      <div className="flex items-center justify-between bg-gray-800 p-2 rounded-md mt-2">
        <span className="font-medium text-gray-200">cloud-native-agents</span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </div>
    </div>
    {NAV_ITEMS.map((section, idx) => (
      <div className={`space-y-5 ${idx > 0 ? 'pt-8 mt-8 border-t border-gray-700' : ''}`} key={section.section}>
        <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">{section.section}</h3>
        {section.items.map((item, itemIdx) => (
          item.subSection ? (
            <div key={item.subSection} className="ml-2 mb-6 mt-2">
              <h4 className="px-2 text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3 mt-1">{item.subSection}</h4>
              <div className="space-y-2 ml-5">
                {item.subItems.map(subItem => (
                  <button
                    key={subItem.viewName}
                    onClick={() => setActiveView(subItem.viewName)}
                    className={`w-full text-left px-6 py-2 text-sm rounded-md transition-colors duration-150 font-medium focus:outline-none ${
                      activeView === subItem.viewName
                        ? 'bg-gray-700 text-white border border-gray-500'
                        : 'text-gray-300 hover:bg-gray-700 focus:bg-gray-700'
                    }`}
                    aria-current={activeView === subItem.viewName ? 'page' : undefined}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            item.viewName && item.label ? (
              <button
                key={item.viewName}
                onClick={() => setActiveView(item.viewName)}
                className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors duration-150 font-medium focus:outline-none mt-3 ${
                  activeView === item.viewName
                    ? 'bg-gray-700 text-white border border-gray-500'
                    : 'text-gray-300 hover:bg-gray-700 focus:bg-gray-700'
                }`}
                aria-current={activeView === item.viewName ? 'page' : undefined}
              >
                {item.label}
              </button>
            ) : null
          )
        ))}
      </div>
    ))}
  </nav>
);

export default Sidebar; 
