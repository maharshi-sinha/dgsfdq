import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="text-left py-2.5 px-3 text-[11px] text-gray-400 dark:text-gray-500 font-normal border-b border-gray-200 dark:border-gray-800">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
            {columns.map((col) => (
              <td key={col.key} className="py-2.5 px-3 text-gray-900 dark:text-gray-100 tabular-nums border-b border-gray-100 dark:border-gray-800/50">
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
