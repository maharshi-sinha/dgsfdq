interface TabGroupProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabGroup({ tabs, active, onChange }: TabGroupProps) {
  return (
    <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 mb-5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
            active === tab
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
