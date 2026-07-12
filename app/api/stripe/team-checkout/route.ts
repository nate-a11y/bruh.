import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";
import { getTeamMemberCount, syncTeamSeats } from "@/lib/teams/billing";

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await request.json();
    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Only the team owner may start/manage billing.
    const { data: team } = await (supabase as any)
      .from("zeroed_teams")
      .select("id, slug, owner_id, stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", teamId)
      .single();

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json({ error: "Only the team owner can manage billing" }, { status: 403 });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teams/${team.slug}/settings`;

    // Already subscribed → reconcile seat count, then send to the billing portal.
    if (team.stripe_customer_id && team.subscription_status === "active") {
      try {
        await syncTeamSeats(teamId);
      } catch (e) {
        console.error("Seat reconcile before portal failed:", e);
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: team.stripe_customer_id,
        return_url: returnUrl,
      });
      return NextResponse.json({ url: portal.url });
    }

    // Reuse or create the Stripe customer for this team.
    let customerId: string | undefined = team.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id, team_id: teamId },
      });
      customerId = customer.id;
      await (supabase as any)
        .from("zeroed_teams")
        .update({ stripe_customer_id: customerId })
        .eq("id", teamId);
    }

    const members = await getTeamMemberCount(teamId);
    const additionalSeats = Math.max(0, members - 1);

    const lineItems: { price: string; quantity: number }[] = [
      { price: STRIPE_CONFIG.priceId, quantity: 1 }, // owner base seat
    ];
    if (additionalSeats > 0) {
      lineItems.push({ price: STRIPE_CONFIG.teamSeatPriceId, quantity: additionalSeats });
    }

    const returnBase = `${process.env.NEXT_PUBLIC_APP_URL}/teams/${team.slug}/settings`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${returnBase}?billing=success`,
      cancel_url: `${returnBase}?billing=canceled`,
      metadata: { team_id: teamId },
      subscription_data: { metadata: { team_id: teamId } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating team checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
