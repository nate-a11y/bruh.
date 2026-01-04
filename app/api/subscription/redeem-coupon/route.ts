import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redeemCoupon } from '@/lib/subscriptions';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const result = await redeemCoupon(user.id, code);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to redeem coupon' },
      { status: 500 }
    );
  }
}
