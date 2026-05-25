import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/telemetry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, data } = body;
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters: title and message' },
        { status: 400 }
      );
    }
    
    // Call server-side alert dispatcher (this will trigger Webhook POST)
    await sendAlert(title, message, data);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch telemetry alert' },
      { status: 500 }
    );
  }
}
