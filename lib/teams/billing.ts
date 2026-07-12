import { stripe, STRIPE_CONFIG } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/** Number of members currently on a team (includes the owner). */
export async function getTeamMemberCount(teamId: string): Promise<number> {
  const admin = createServiceClient();
  const { count } = await (admin as any)
    .from("zeroed_team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);
  return count || 1;
}

/**
 * Reconcile a team's Stripe seat quantity with its actual member count.
 * Billing = 1 base seat (owner) + (members - 1) add-on seats. Safe to call
 * whenever membership changes; no-op if the team has no active subscription.
 */
export async function syncTeamSeats(teamId: string): Promise<void> {
  if (!stripe) return;
  const admin = createServiceClient();

  const { data: team } = await (admin as any)
    .from("zeroed_teams")
    .select("stripe_subscription_id")
    .eq("id", teamId)
    .single();

  const subscriptionId: string | undefined = team?.stripe_subscription_id;
  if (!subscriptionId) return;

  const members = await getTeamMemberCount(teamId);
  const additionalSeats = Math.max(0, members - 1);

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const seatItem = sub.items.data.find(
    (i) => i.price.id === STRIPE_CONFIG.teamSeatPriceId
  );

  if (additionalSeats === 0) {
    if (seatItem) {
      await stripe.subscriptionItems.del(seatItem.id, {
        proration_behavior: "create_prorations",
      });
    }
  } else if (seatItem) {
    await stripe.subscriptionItems.update(seatItem.id, {
      quantity: additionalSeats,
      proration_behavior: "create_prorations",
    });
  } else {
    await stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: STRIPE_CONFIG.teamSeatPriceId,
      quantity: additionalSeats,
      proration_behavior: "create_prorations",
    });
  }

  await (admin as any)
    .from("zeroed_teams")
    .update({ seats: members, updated_at: new Date().toISOString() })
    .eq("id", teamId);
}
