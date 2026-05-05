
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MetricsCard = ({ title, value, icon: Icon, colorClass, trend }) => {
  return (
    <Card className="shadow-sm border-0 border-l-4 overflow-hidden transition-all hover:shadow-md" style={{ borderLeftColor: colorClass }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            {trend && (
              <p className={cn("text-xs font-medium", trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500")}>
                {trend > 0 ? '+' : ''}{trend}% desde mês passado
              </p>
            )}
          </div>
          <div className="p-4 rounded-full" style={{ backgroundColor: `${colorClass}1A`, color: colorClass }}>
            <Icon className="w-8 h-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
