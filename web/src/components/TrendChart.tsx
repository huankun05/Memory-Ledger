import { useMemo } from 'react';
import type { Item } from '../types';

interface TrendChartProps {
  items: Item[];
}

export function TrendChart({ items }: TrendChartProps) {
  const data = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    
    items.forEach(item => {
      if (item.purchaseDate) {
        const date = new Date(item.purchaseDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (months[key] !== undefined) {
          months[key] += item.purchasePrice || 0;
        }
      }
    });
    
    return Object.entries(months).map(([month, value]) => ({
      month: month.split('-')[1] + '月',
      value,
    }));
  }, [items]);

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const height = 80;
  const width = 280;
  const padding = 10;
  
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - (d.value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>
        <path d={`M${areaPoints}Z`} fill="url(#trendGradient)" />
        <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = padding + (i * (width - padding * 2)) / (data.length - 1);
          const y = height - padding - (d.value / maxValue) * (height - padding * 2);
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="#3B82F6" className="transition-all duration-200 hover:r-6" />
          );
        })}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-gray-500">{d.month}</span>
        ))}
      </div>
    </div>
  );
}
