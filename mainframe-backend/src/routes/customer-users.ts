import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'))
    .digest('hex');
}

function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

// GET /mainframe/customer-users/profile/:profileId
router.get('/profile/:profileId', requireAuth, async (req, res) => {
  try {
    const users = await prisma.mf_customer_users.findMany({
      where: { customerProfileId: req.params.profileId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, lastLoginAt: true, createdAt: true,
        tempPassword: true, mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/customer-users
router.post('/', requireAuth, async (req, res) => {
  try {
    const { customerProfileId, email, firstName, lastName, role, password } = req.body;

    const user = await prisma.mf_customer_users.create({
      data: {
        customerProfileId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: role || 'STAFF',
        passwordHash: hashPassword(password),
        mustChangePassword: true,
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, createdAt: true,
      },
    });
    return res.status(201).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/customer-users/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, role, isActive } = req.body;
    const user = await prisma.mf_customer_users.update({
      where: { id: req.params.id },
      data: { firstName, lastName, role: role as any, isActive },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true,
      },
    });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/customer-users/:id/reset-password
router.post('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    const tempPassword = generateTempPassword();
    await prisma.mf_customer_users.update({
      where: { id: req.params.id },
      data: {
        passwordHash: hashPassword(tempPassword),
        tempPassword,
        mustChangePassword: true,
      },
    });
    return res.json({ tempPassword });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /mainframe/customer-users/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.mf_customer_users.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
