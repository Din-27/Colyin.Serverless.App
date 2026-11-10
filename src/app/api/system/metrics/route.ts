import { NextResponse } from "next/server";
import os from "os";
import {
  getSystemCpuUsage,
  getSystemMemoryUsage,
  getSystemDiskUsage,
  getServicesTelemetry,
} from "@/lib/engine/telemetry";

export async function GET() {
  try {
    const cpu = getSystemCpuUsage();
    const memory = getSystemMemoryUsage();
    const disk = getSystemDiskUsage();
    const services = await getServicesTelemetry();

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptimeSec: Math.floor(os.uptime()),
        loadAvg: os.loadavg(),
      },
      metrics: {
        cpu,
        memory,
        disk,
      },
      services,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

