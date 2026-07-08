import { useMemo } from 'react';
import type { Item } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

interface PieChartProps {
  items: Item[];
  size?: number;
}

export function PieChart({ items, size = 120 }: PieChartProps) {
  const data = useMemo(() => {
    const categories: Record<string, { count: number; value: number }> = {};
    
    items.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = { count: 0, value: 0 };
      }
      categories[item.category].count += item.quantity;
      categories[item.category].value += item.purchasePrice || 0;
    });

    return Object.entries(categories).map(([category, data]) => ({
      category,
      ...data,
      color: DEFAULT_CATEGORIES[category as keyof typeof DEFAULT_CATEGORIES]?.color || '#6B7280',
    }));
  }, [items]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm text-gray-400">暂无数据</span>
      </div>
    );
  }

  let currentAngle = -90;
  const paths = data.map(d => {
    const percentage = d.count / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    
    const radius = size / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: d.color,
      percentage: Math.round(percentage * 100),
      name: DEFAULT_CATEGORIES[d.category as keyof typeof DEFAULT_CATEGORIES]?.name || d.category,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {paths.map((path, i) => (
          <path key={i} d={path.d} fill={path.color} className="transition-all duration-300 hover:opacity-80" />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold">{total}</div>
          <div className="text-xs text-gray-400">物品</div>
        </div>
      </div>
    </div>
  );
}

export function PieLegend({ items }: { items: Item[] }) {
  const data = useMemo(() => {
    const categories: Record<string, { count: number; value: number }> = {};
    items.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = { count: 0, value: 0 };
      }
      categories[item.category].count += item.quantity;
      categories[item.category].value += item.purchasePrice || 0;
    });
    return Object.entries(categories).map(([category, data]) => ({
      category,
      ...data,
      color: DEFAULT_CATEGORIES[category as keyof typeof DEFAULT_CATEGORIES]?.color || '#6B7280',
      name: DEFAULT_CATEGORIES[category as keyof typeof DEFAULT_CATEGORIES]?.name || category,
    })).sort((a, b) => b.value - a.value);
  }, [items]);

  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-600">{item.name}</span>
          </div>
          <span className="text-gray-800 font-medium">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
