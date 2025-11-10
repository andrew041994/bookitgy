import cron from 'node-cron';
import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';
import { waSend } from '../services/whatsapp.js';

const TZ = process.env.TZ || 'America/Guyana';

export function registerCronJobs(prisma: PrismaClient) {
  cron.schedule('5 0 1 * *', async () => {
    const now = DateTime.now().setZone(TZ);
    const prev = now.minus({ months: 1 });
    const [year, month] = [prev.year, prev.month];

    const providers = await prisma.provider.findMany({ include: { user: true } });

    for (const p of providers) {
      const appts = await prisma.appointment.findMany({
        where: {
          providerId: p.id,
          status: 'COMPLETED',
          startsAt: {
            gte: prev.startOf('month').toJSDate(),
            lt: prev.endOf('month').toJSDate()
          }
        }
      });
      const gross = appts.reduce((s,a)=> s + a.priceCents, 0);

      // Apply promo-free appointments (skip earliest N)
      let promo = p.promoFreeAppointments || 0;
      let effectiveGross = gross;
      if (promo > 0 && appts.length > 0) {
        const sorted = appts.sort((a,b)=> a.startsAt.getTime() - b.startsAt.getTime());
        let skipped = 0, total = 0;
        for (const a of sorted) {
          if (skipped < promo) { skipped++; continue; }
          total += a.priceCents;
        }
        effectiveGross = total;
        // Decrement provider promo balance
        await prisma.provider.update({ where:{ id: p.id }, data:{ promoFreeAppointments: Math.max(0, promo - skipped) }});
      }

      const percent = p.servicePercent ?? 10;
      const serviceCents = Math.floor(effectiveGross * percent / 100);

      const st = await prisma.monthlyStatement.upsert({
        where: { providerId_periodYear_periodMonth: { providerId: p.id, periodYear: year, periodMonth: month } },
        update: { grossCents: effectiveGross, percent, serviceCents },
        create: { providerId: p.id, periodYear: year, periodMonth: month, grossCents: effectiveGross, percent, serviceCents }
      });

      await waSend(p.user.phone, `BOOKIT GY: Your service charge for ${prev.toFormat('LLLL yyyy')} is ${(st.serviceCents/100).toFixed(2)} GYD. Due by the 15th. Method: cash/bank/MMG.`);
    }
  }, { timezone: TZ });

  for (const day of [5,10,15]) {
    cron.schedule(`0 8 ${day} * *`, async ()=>{
      const now = DateTime.now().setZone(TZ);
      const prev = now.minus({ months: 1 });
      const [year, month] = [prev.year, prev.month];

      const statements = await prisma.monthlyStatement.findMany({
        where: { periodYear: year, periodMonth: month, isPaid: false },
        include: { provider: { include: { user: true } } }
      });

      for (const st of statements) {
        await waSend(st.provider.user.phone, `REMINDER: Service charge ${(st.serviceCents/100).toFixed(2)} GYD for ${prev.toFormat('LLLL yyyy')} due by the 15th.`);
      }
    }, { timezone: TZ });
  }

  cron.schedule('0 0 16 * *', async ()=>{
    const now = DateTime.now().setZone(TZ);
    const prev = now.minus({ months: 1 });
    const [year, month] = [prev.year, prev.month];

    const unpaid = await prisma.monthlyStatement.findMany({
      where: { periodYear: year, periodMonth: month, isPaid: false }
    });

    for (const st of unpaid) {
      await prisma.provider.update({ where: { id: st.providerId }, data: { isLocked: true, lockReason: 'Unpaid service charge' }});
    }
  }, { timezone: TZ });
}
