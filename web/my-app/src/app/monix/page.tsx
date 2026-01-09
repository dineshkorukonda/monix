"use client";

/**
 * Monix Server Dashboard
 * 
 * Comprehensive real-time monitoring dashboard showing:
 * - System statistics (CPU, memory, disk, network)
 * - Active network connections
 * - Security alerts
 * - Traffic analysis
 * - Process monitoring
 */

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Cpu,
  HardDrive,
  Network,
  Shield,
  TrendingUp,
  Users,
  Globe,
  Server,
  Clock,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getDashboardData,
  getSystemStats,
  getConnections,
  getAlerts,
  type DashboardData,
  type SystemStats,
  type Connection,
} from "@/lib/api";

export default function MonixDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const [dashboard, stats, conns, alertList] = await Promise.all([
        getDashboardData(),
        getSystemStats(),
        getConnections(),
        getAlerts(),
      ]);

      setDashboardData(dashboard);
      setSystemStats(stats);
      setConnections(conns);
      setAlerts(alertList);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "<1m";
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="container mx-auto px-6 max-w-[1600px]">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tighter uppercase">
                  Monix Dashboard
                </span>
                <span className="ml-2 text-[10px] text-gray-500 font-mono hidden sm:inline">
                  REAL_TIME_MONITORING
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="font-mono">
                {lastUpdate.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchData}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 max-w-[1600px]">
        {error && (
          <div className="mb-8 p-4 rounded border border-red-500/20 bg-red-500/5 flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-mono tracking-tight">{error}</span>
          </div>
        )}

        {/* System Stats Grid */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  CPU Usage
                </span>
                <Cpu className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {systemStats.cpu_percent.toFixed(1)}%
                </span>
                <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                    style={{ width: `${systemStats.cpu_percent}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-[9px] text-gray-600 font-mono">
                Load: {systemStats.load_avg.map((l) => l.toFixed(2)).join(", ")}
              </div>
            </Card>

            <Card className="p-6 border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Memory
                </span>
                <Activity className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {systemStats.memory_percent.toFixed(1)}%
                </span>
                <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${systemStats.memory_percent}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-[9px] text-gray-600 font-mono">
                {systemStats.process_count} processes
              </div>
            </Card>

            <Card className="p-6 border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Disk Usage
                </span>
                <HardDrive className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {systemStats.disk_percent.toFixed(1)}%
                </span>
                <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                    style={{ width: `${systemStats.disk_percent}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-[9px] text-gray-600 font-mono">
                Uptime: {formatUptime(systemStats.uptime)}
              </div>
            </Card>

            <Card className="p-6 border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Network I/O
                </span>
                <Network className="w-4 h-4 text-gray-500" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono">
                  ↑ {formatBytes(systemStats.network_sent)}
                </div>
                <div className="text-xs font-mono">
                  ↓ {formatBytes(systemStats.network_recv)}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connections */}
          <div className="lg:col-span-2">
            <Card className="border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400">
                  <Globe className="w-3.5 h-3.5" />
                  Active Connections ({connections.length})
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {connections.slice(0, 50).map((conn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded bg-[#1a1a1a]/30 border border-[#1a1a1a] hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              conn.state === "ESTABLISHED"
                                ? "default"
                                : conn.state === "LISTEN"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-[8px] h-4"
                          >
                            {conn.state}
                          </Badge>
                          <span className="text-xs font-mono text-gray-300">
                            {conn.local_ip}:{conn.local_port}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-600 font-mono">
                          {conn.pname || `PID:${conn.pid}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">→</span>
                        <span className="font-mono text-gray-400">
                          {conn.remote_ip}:{conn.remote_port}
                        </span>
                        {conn.geo && (
                          <Badge variant="secondary" className="text-[8px] h-3">
                            {conn.geo}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {connections.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      No active connections
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Alerts & Traffic */}
          <div className="space-y-6">
            {/* Alerts */}
            <Card className="border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Security Alerts ({alerts.length})
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-red-500/5 border border-red-500/20 text-xs font-mono"
                    >
                      {alert}
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-4 text-gray-600 text-sm">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No active alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Traffic Summary */}
            {dashboardData && (
              <Card className="border-[#1a1a1a] bg-[#0a0a0a]">
                <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Traffic Analysis
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Requests</span>
                    <span className="font-mono font-bold">
                      {dashboardData.traffic_summary.total_requests}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Unique IPs</span>
                    <span className="font-mono font-bold">
                      {dashboardData.traffic_summary.unique_ips}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">404 Errors</span>
                    <span className="font-mono font-bold text-yellow-500">
                      {dashboardData.traffic_summary.total_404s}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">High-Risk Hits</span>
                    <span className="font-mono font-bold text-red-500">
                      {dashboardData.traffic_summary.high_risk_hits}
                    </span>
                  </div>
                  {dashboardData.traffic_summary.suspicious_ips.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                      <div className="text-[10px] uppercase text-gray-500 mb-2">
                        Suspicious IPs
                      </div>
                      <div className="space-y-1">
                        {dashboardData.traffic_summary.suspicious_ips
                          .slice(0, 5)
                          .map((ip, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-xs"
                            >
                              <span className="font-mono text-gray-400">
                                {ip.ip}
                              </span>
                              <Badge
                                variant="destructive"
                                className="text-[8px] h-3"
                              >
                                {ip.threat_score}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
