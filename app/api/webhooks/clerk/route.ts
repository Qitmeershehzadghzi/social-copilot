import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { db } from '@/db'
import { users, subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const evt = await verifyWebhook(req, { signingSecret: webhookSecret }).catch((err) => {
    console.error('Error verifying webhook:', err)
    return null
  })

  if (!evt) {
    return new NextResponse('Error occurred', {
      status: 400,
    })
  }

  const eventType = evt.type as string

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data as any
        
        const email = email_addresses[0]?.email_address
        const name = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || ''

        await db.insert(users).values({
          clerkId: id,
          email: email || '',
          name: name || null,
        })

        console.log(`User created in database: ${id}`)
        break
      }

      case 'user.deleted': {
        const { id } = evt.data as any
        if (id) {
          await db.delete(users).where(eq(users.clerkId, id))
          console.log(`User deleted: ${id}`)
        }
        break
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data as any
        const email = email_addresses[0]?.email_address
        const name = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || ''

        if (id) {
          await db.update(users)
            .set({ 
              email: email || '', 
              name: name || null,
              updatedAt: new Date()
            })
            .where(eq(users.clerkId, id))
          console.log(`User updated: ${id}`)
        }
        break
      }

      case 'subscription.created':
      case 'subscription.updated': {
        const { id, status, current_period_start, current_period_end, cancel_at_period_end, user_id, items } = evt.data as any;
        
        // If user_id is missing, we might not be able to link it.
        if (!user_id) {
          console.error('No user_id found in subscription webhook', evt.data);
          break;
        }

        const [user] = await db.select().from(users).where(eq(users.clerkId, user_id)).limit(1);
        
        if (!user) {
          console.error(`User with clerkId ${user_id} not found`);
          break;
        }

        const planRaw = items?.data?.[0]?.plan?.name || items?.[0]?.plan?.name || (evt.data as any).plan_id || (evt.data as any).plan || '';
        const planName = String(planRaw).toLowerCase();
        let mappedPlan: 'free' | 'pro' | 'agency' = 'free';
        
        if (planName.includes('agency')) mappedPlan = 'agency';
        else if (planName.includes('pro')) mappedPlan = 'pro';

        const parseDate = (val: any) => {
          if (!val) return new Date();
          const num = typeof val === 'string' ? parseInt(val, 10) : val;
          // if it looks like seconds (before year 2286), multiply by 1000
          if (num < 10000000000) return new Date(num * 1000);
          return new Date(num);
        };

        await db.insert(subscriptions).values({
          userId: user.id,
          clerkSubscriptionId: id,
          plan: mappedPlan,
          status: status || 'active',
          currentPeriodStart: parseDate(current_period_start),
          currentPeriodEnd: parseDate(current_period_end),
          cancelAtPeriodEnd: !!cancel_at_period_end,
          updatedAt: new Date()
        }).onConflictDoUpdate({
          target: subscriptions.clerkSubscriptionId,
          set: {
            plan: mappedPlan,
            status: status || 'active',
            currentPeriodStart: parseDate(current_period_start),
            currentPeriodEnd: parseDate(current_period_end),
            cancelAtPeriodEnd: !!cancel_at_period_end,
            updatedAt: new Date()
          }
        });

        console.log(`Subscription ${id} processed for user ${user_id}`);
        break;
      }

      case 'subscription.deleted': {
        const { id } = evt.data as any;
        if (id) {
          await db.update(subscriptions)
            .set({ status: 'canceled', updatedAt: new Date() })
            .where(eq(subscriptions.clerkSubscriptionId, id));
          console.log(`Subscription ${id} marked as canceled`);
        }
        break;
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}
