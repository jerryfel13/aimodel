import { NextResponse } from 'next/server';
import { getActivitySummary } from '@/lib/activity';

export async function GET() {
  return NextResponse.json(getActivitySummary());
}
