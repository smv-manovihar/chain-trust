import { Request, Response } from 'express';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { generateOTP } from '../utils/email.utils.js';
import { sendEmployeeInvitation } from '../utils/email.utils.js';
import { FRONTEND_URL, OTP_EXPIRY_MINUTES } from '../config/config.js';
import crypto from 'crypto';

export const inviteEmployee = async (req: Request, res: Response): Promise<void> => {
  const { email, role } = req.body;
  const adminUser = (req as any).user;

  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    // 1. Verify admin has a company
    const company = await Company.findOne({ adminId: adminUser.id });
    if (!company) {
      res.status(403).json({ message: 'Only company admins can invite employees' });
      return;
    }

    // 2. Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    // If user exists and is active, we can't invite them as a new employee easily 
    // without more complex logic (e.g. multi-tenant). For now, assume fresh invite.
    if (user && user.isActive) {
       res.status(400).json({ message: 'User with this email already exists' });
       return;
    }

    // 3. Generate Invite Data
    const otp = generateOTP();
    const token = crypto.randomBytes(32).toString('hex');
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for invite
    
    if (!user) {
      // Create skeleton user
      user = new User({
        email: email.toLowerCase(),
        name: 'Invited Employee', // Placeholder
        role: role || 'employee',
        companyId: company._id,
        companyPolicies: company.policies,
        isActive: false, // Inactive until setup
        isInvited: true,
        invitationToken: token,
        invitationExpires: otpExpiry,
        emailVerificationOtp: otp, // Reuse OTP field or add specific invite OTP
        emailVerificationOtpExpiresAt: otpExpiry,
      });
    } else {
        // Re-invite inactive user
        user.isInvited = true;
        user.invitationToken = token;
        user.invitationExpires = otpExpiry;
        user.emailVerificationOtp = otp;
        user.emailVerificationOtpExpiresAt = otpExpiry;
        user.companyId = company._id;
        user.companyPolicies = company.policies;
    }

    await user.save();

    // 4. Send Email
    // Format: /setup-account?uid=USER_ID&cid=COMPANY_ID&token=TOKEN
    // Token is optional security, OTP is the main verification
    const inviteLink = `${FRONTEND_URL}/setup-account?uid=${user._id}&cid=${company._id}`;
    
    const emailSent = await sendEmployeeInvitation(
      user.email, 
      inviteLink, 
      otp, 
      company.name
    );

    if (!emailSent) {
      res.status(500).json({ message: 'Failed to send invitation email' });
      return;
    }

    res.json({ message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('Invite employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
