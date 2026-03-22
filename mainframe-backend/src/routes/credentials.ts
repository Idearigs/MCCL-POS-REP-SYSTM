import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /mainframe/credentials/export/:profileId/:userId
router.get('/export/:profileId/:userId', requireAuth, async (req, res) => {
  try {
    const { profileId, userId } = req.params;

    const [profile, user] = await Promise.all([
      prisma.mf_customer_profiles.findUnique({
        where: { id: profileId },
        include: { subscription: true },
      }),
      prisma.mf_customer_users.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, tempPassword: true },
      }),
    ]);

    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      profile: {
        businessName: profile.businessName,
        subdomain: profile.subdomain,
        fullDomain: `${profile.subdomain}.truedesk.co.uk`,
        status: profile.status,
      },
      user: {
        email: user.email,
        tempPassword: user.tempPassword,
        role: user.role,
      },
      loginUrl: `https://${profile.subdomain}.truedesk.co.uk/login`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
