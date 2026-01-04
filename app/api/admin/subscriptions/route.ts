import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/admin/subscriptions - Get all subscriptions with user info
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('zeroed_user_preferences')
      .select('is_admin')
      .eq('user_id', user.id)
      .single() as { data: { is_admin: boolean } | null };

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get subscription stats
    const adminClient = createServiceClient();

    const { data: subscriptions, error } = await adminClient
      .from('zeroed_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false }) as {
        data: Array<{
          id: string;
          user_id: string;
          status: string;
          trial_ends_at: string | null;
          current_period_end: string | null;
          coupon_code: string | null;
          updated_at: string;
        }> | null;
        error: Error | null;
      };

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    // Get user emails for subscriptions
    const userIds = subscriptions?.map(s => s.user_id) || [];
    const { data: authUsers } = await adminClient.auth.admin.listUsers();

    const userMap = new Map(
      authUsers?.users?.map(u => [u.id, u.email]) || []
    );

    // Get display names
    const { data: preferences } = await adminClient
      .from('zeroed_user_preferences')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const displayNameMap = new Map(
      preferences?.map(p => [p.user_id, p.display_name]) || []
    );

    // Combine data
    const enrichedSubscriptions = subscriptions?.map(sub => ({
      ...sub,
      user_email: userMap.get(sub.user_id) || 'Unknown',
      display_name: displayNameMap.get(sub.user_id) || null,
    })) || [];

    // Calculate stats
    const stats = {
      total: subscriptions?.length || 0,
      active: subscriptions?.filter(s => s.status === 'active').length || 0,
      trialing: subscriptions?.filter(s => s.status === 'trialing').length || 0,
      freeForever: subscriptions?.filter(s => s.status === 'free_forever').length || 0,
      canceled: subscriptions?.filter(s => s.status === 'canceled' || s.status === 'trial_expired').length || 0,
    };

    return NextResponse.json({
      subscriptions: enrichedSubscriptions,
      stats,
    });
  } catch (error) {
    console.error('Error in admin subscriptions:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/admin/subscriptions - Grant free_forever status to a user
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('zeroed_user_preferences')
      .select('is_admin')
      .eq('user_id', user.id)
      .single() as { data: { is_admin: boolean } | null };

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    const adminClient = createServiceClient();

    if (action === 'grant_free_forever') {
      // Grant free forever status
      const { error } = await (adminClient as any)
        .from('zeroed_subscriptions')
        .upsert({
          user_id: userId,
          status: 'free_forever',
          coupon_code: 'ADMIN_GRANTED',
          coupon_applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error granting free forever:', error);
        return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Lifetime access granted' });
    }

    if (action === 'revoke_free_forever') {
      // Revoke free forever, set back to trialing
      const { error } = await (adminClient as any)
        .from('zeroed_subscriptions')
        .update({
          status: 'trialing',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          coupon_code: null,
          coupon_applied_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error revoking free forever:', error);
        return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Lifetime access revoked, 30-day trial started' });
    }

    if (action === 'extend_trial') {
      // Extend trial by 30 days
      const { data: currentSub } = await (adminClient as any)
        .from('zeroed_subscriptions')
        .select('trial_ends_at')
        .eq('user_id', userId)
        .single() as { data: { trial_ends_at: string | null } | null };

      const currentEnd = currentSub?.trial_ends_at
        ? new Date(currentSub.trial_ends_at)
        : new Date();

      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000);

      const { error } = await (adminClient as any)
        .from('zeroed_subscriptions')
        .upsert({
          user_id: userId,
          status: 'trialing',
          trial_ends_at: newEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error extending trial:', error);
        return NextResponse.json({ error: 'Failed to extend trial' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Trial extended by 30 days' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in admin subscription action:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
