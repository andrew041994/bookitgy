import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

import { registerCronJobs } from './workers/cron.js';
import { waSend } from './services/whatsapp.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const TZ = process.env.TZ || 'America/Guyana';
const JWT_SECRET = process.env.JWT_SECRET!;

function auth(required: ('ADMIN'|'PROVIDER'|'CLIENT')[] = []) {
  return async (req: any, res: any, next: any) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing token' });
    const token = header.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.user = payload;
      if (required.length && !required.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// --- auth/register updated to accept latitude/longitude (current only)
app.post('/auth/register', async (req, res) => {
  const { role, fullName, phone, email, password, businessName, category,
          latitude, longitude } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { role, fullName, phone, email, passwordHash: hash }
  });
  if (role === 'PROVIDER') {
    await prisma.provider.create({
      data: {
        userId: user.id,
        businessName,
        category,
        workingHoursJson: { mon:[["09:00","17:00"]], tue:[["09:00","17:00"]], wed:[["09:00","17:00"]], thu:[["09:00","17:00"]], fri:[["09:00","17:00"]], sat:[], sun:[] },
        latitude:  latitude  != null ? Number(latitude)  : null,
        longitude: longitude != null ? Number(longitude) : null
      }
    });
  } else if (role === 'CLIENT') {
    await prisma.client.create({ data: { userId: user.id } });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: user.role });
});

app.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: user.role });
});

// --- me
app.get('/me', auth(['ADMIN','PROVIDER','CLIENT']), async (req:any,res)=>{
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { provider: true, client: true } });
  res.json({ id: user?.id, role: user?.role, phone: user?.phone, fullName: user?.fullName, providerId: user?.provider?.id, clientId: user?.client?.id });
});

// --- provider search with optional distance using PUBLISHED coords ONLY
app.get('/providers', async (req, res) => {
  const { q, category, lat, lng, radiusKm } = req.query as any;
  let providers:any = await prisma.provider.findMany({
    where: {
      isLocked: false,
      AND: [
        category ? { category: { equals: String(category), mode: 'insensitive' } } : {},
        q ? {
          OR: [
            { businessName: { contains: String(q), mode: 'insensitive' } },
            { user: { fullName: { contains: String(q), mode: 'insensitive' } } }
          ]
        } : {}
      ]
    },
    include: { user: true, services: { where: { isActive: true } } }
  });

  if (lat && lng && radiusKm) {
    const la = parseFloat(String(lat));
    const lo = parseFloat(String(lng));
    const r  = parseFloat(String(radiusKm));
    const R  = 6371; // km
    providers = providers
      .map((p:any) => {
        const plat = p.publishedLatitude;
        const plng = p.publishedLongitude;
        if (plat == null || plng == null) return null;
        const dLat = (plat - la) * Math.PI / 180;
        const dLon = (plng - lo) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(la*Math.PI/180)*Math.cos(plat*Math.PI/180)*Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;
        return { ...p, _distanceKm: dist };
      })
      .filter(Boolean)
      .filter((p:any)=> p._distanceKm <= r)
      .sort((a:any,b:any)=> a._distanceKm - b._distanceKm);
  }

  res.json(providers);
});

app.get('/providers/:id', async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      services: { where: { isActive: true } },
      appointments: { orderBy: { startsAt: 'asc' }, take: 50 }
    }
  });
  if (!provider) return res.status(404).json({ error: 'Not found' });
  res.json(provider);
});

// Existing settings (still can update hours/percent)
app.patch('/providers/:id/settings', auth(['PROVIDER','ADMIN']), async (req:any, res) => {
  const { workingHoursJson, servicePercent } = req.body;
  const owner = await prisma.provider.findUnique({where:{id:req.params.id}});
  if (req.user.role === 'PROVIDER' && req.user.id !== owner?.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const updated = await prisma.provider.update({
    where: { id: req.params.id },
    data: { workingHoursJson, ...(servicePercent !== undefined ? { servicePercent: Number(servicePercent) } : {}) }
  });
  res.json(updated);
});

// NEW: update CURRENT location (private)
app.patch('/providers/:id/location', auth(['PROVIDER','ADMIN']), async (req:any, res) => {
  const { latitude, longitude, address } = req.body;
  const owner = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (req.user.role === 'PROVIDER' && req.user.id !== owner?.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const p = await prisma.provider.update({
    where: { id: req.params.id },
    data: {
      latitude:  latitude  != null ? Number(latitude)  : owner?.latitude,
      longitude: longitude != null ? Number(longitude) : owner?.longitude,
      address:   address ?? owner?.address
    }
  });
  res.json(p);
});

// NEW: publish & lock public location
app.post('/providers/:id/location/publish', auth(['PROVIDER','ADMIN']), async (req:any, res) => {
  const { label } = req.body;
  const prov = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!prov) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'PROVIDER' && req.user.id !== prov.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (prov.latitude == null || prov.longitude == null) {
    return res.status(400).json({ error: 'No current location set' });
  }
  const p = await prisma.provider.update({
    where: { id: prov.id },
    data: {
      publishedLatitude:  prov.latitude,
      publishedLongitude: prov.longitude,
      publishedLabel:     label ?? prov.publishedLabel,
      isLocationLocked:   true
    }
  });
  res.json(p);
});

// NEW: unlock public location (allows republish)
app.post('/providers/:id/location/unlock', auth(['PROVIDER','ADMIN']), async (req:any, res) => {
  const prov = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!prov) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'PROVIDER' && req.user.id !== prov.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const p = await prisma.provider.update({
    where: { id: prov.id },
    data: { isLocationLocked: false }
  });
  res.json(p);
});

// Appointments and admin endpoints (unchanged snippets for brevity)
app.post('/appointments', auth(['CLIENT','ADMIN']), async (req:any,res)=>{
  const { providerId, serviceId, startsAt } = req.body;
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(400).json({ error: 'Invalid service' });

  const starts = DateTime.fromISO(startsAt, { zone: TZ });
  const ends = starts.plus({ minutes: service.durationMin });

  const appt = await prisma.appointment.create({
    data: {
      providerId,
      clientId: (await prisma.client.findUnique({ where: { userId: req.user.id } }))!.id,
      serviceId,
      startsAt: starts.toJSDate(),
      endsAt: ends.toJSDate(),
      priceCents: service.priceCents
    },
    include: { provider: { include: { user: true } }, client: { include: { user: true } }, service: true }
  });

  await waSend(appt.provider.user.phone, `New appointment request: ${appt.service.name} on ${starts.toFormat('ccc, dd LLL yyyy HH:mm')} for ${appt.priceCents/100} GYD.`);

  res.json(appt);
});

app.post('/appointments/:id/confirm', auth(['PROVIDER','ADMIN']), async (req:any,res)=>{
  const appt = await prisma.appointment.update({ where: { id: req.params.id }, data: { status: 'CONFIRMED' }, include: { client: { include: { user: true } } }});
  await waSend(appt.client.user.phone, `Your appointment is CONFIRMED for ${DateTime.fromJSDate(appt.startsAt).setZone(TZ).toFormat('ccc, dd LLL yyyy HH:mm')}.`);
  res.json(appt);
});

app.post('/appointments/:id/deny', auth(['PROVIDER','ADMIN']), async (req:any,res)=>{
  const appt = await prisma.appointment.update({ where: { id: req.params.id }, data: { status: 'DENIED' }, include: { client: { include: { user: true } } }});
  await waSend(appt.client.user.phone, `Sorry, your appointment was DENIED. You can rebook another slot.`);
  res.json(appt);
});

app.post('/appointments/:id/cancel', auth(['PROVIDER','CLIENT','ADMIN']), async (req:any,res)=>{
  const appt = await prisma.appointment.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' }, include: { client: { include: { user: true } }, provider: { include: { user: true } } }});
  await waSend(appt.client.user.phone, `Your appointment was CANCELLED.`);
  await waSend(appt.provider.user.phone, `Appointment was CANCELLED by client or admin.`);
  res.json(appt);
});

app.get('/providers/:id/running-total', async (req,res)=>{
  const providerId = req.params.id;
  const now = DateTime.now().setZone(TZ);
  const start = now.startOf('month').toJSDate();
  const appts = await prisma.appointment.findMany({
    where: { providerId, status: 'COMPLETED', startsAt: { gte: start, lt: now.toJSDate() } }
  });
  const provider = await prisma.provider.findUnique({ where: { id: providerId }});
  const gross = appts.reduce((s,a)=> s + a.priceCents,0);
  const serviceCents = Math.floor(gross * (provider?.servicePercent ?? 10) / 100);
  res.json({ grossCents: gross, serviceCents, percent: provider?.servicePercent ?? 10 });
});

// (admin helpers from earlier omitted for brevity)

app.get('/health', (_req,res)=> res.json({ ok: true }));

const port = 4000;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
  registerCronJobs(prisma);
});
