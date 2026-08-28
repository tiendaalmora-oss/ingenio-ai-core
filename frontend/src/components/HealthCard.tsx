import React from 'react';
import { Server, Database, MessageSquare, Zap, Activity, Users, Send } from 'lucide-react';

const iconMap: Record<string, any> = {
  Database: Database,
  WAHA: MessageSquare,
  Hermes: Zap,
  Knowledge: Server,
  EventBus: Activity,
  CRM: Users,
  Memory: Database,
  FollowUp: Send,
  Outbound: Send
};

interface HealthCardProps {
  name: string;
  status: string;
}

export default function HealthCard({ name, status }: HealthCardProps) {
  const Icon = iconMap[name] || Server;
  
  let statusColor = 'bg-green-500';
  let statusBg = 'bg-green-50';
  let statusText = 'text-green-700';

  if (status === 'DOWN') {
    statusColor = 'bg-red-500';
    statusBg = 'bg-red-50';
    statusText = 'text-red-700';
  } else if (status === 'WARNING') {
    statusColor = 'bg-yellow-500';
    statusBg = 'bg-yellow-50';
    statusText = 'text-yellow-700';
  }

  return (
    <div className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${statusBg} border-transparent`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white bg-opacity-60`}>
          <Icon className={`w-5 h-5 ${statusText}`} />
        </div>
        <span className={`font-semibold ${statusText}`}>{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColor}`}></span>
        </span>
        <span className={`text-sm font-medium ${statusText}`}>{status}</span>
      </div>
    </div>
  );
}
