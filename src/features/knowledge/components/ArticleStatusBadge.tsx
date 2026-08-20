import React from 'react';

export function ArticleStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status === 'published' ? 'bg-green-100 text-green-800' : status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
