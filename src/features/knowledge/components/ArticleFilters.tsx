import React from 'react';

export function ArticleFilters({ filters, setFilters, categories, allTags }: { filters: any, setFilters: any, categories: any[], allTags: any[] }) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <input 
        type="text" 
        placeholder="Search..." 
        value={filters.search} 
        onChange={e => setFilters({ ...filters, search: e.target.value })}
        className="border px-2 py-1 rounded"
      />
      <select 
        value={filters.category} 
        onChange={e => setFilters({ ...filters, category: e.target.value })}
        className="border px-2 py-1 rounded"
      >
        <option value="Todos">Todas as Categorias</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
