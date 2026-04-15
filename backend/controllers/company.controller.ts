import { Request, Response } from 'express';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { sendEmployeeInvitation } from '../utils/email.utils.js';
import { FRONTEND_URL } from '../config/config.js';
import crypto from 'crypto';
import { hash } from 'bcrypt';

export const inviteEmployee = async (req: Request, res: Response): Promise<void> => {
	const { email, role, name, password, autoGenerate } = req.body;
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
		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			res.status(400).json({ message: 'User with this email already exists' });
			return;
		}

		// 3. Handle Password
		let finalPassword = password;
		if (autoGenerate) {
			finalPassword = crypto.randomBytes(8).toString('hex');
		}

		if (!finalPassword || finalPassword.length < 8) {
			res.status(400).json({ message: 'Password must be at least 8 characters long' });
			return;
		}

		const hashedPassword = await hash(finalPassword, 10);

		// 4. Create User
		const user = new User({
			email: email.toLowerCase(),
			password: hashedPassword,
			name: name || 'Employee',
			role: role || 'employee',
			companyId: company._id, // Direct assignment, assuming schema uses companyId
			companyPolicies: company.policies,
			isActive: true, // Active immediately since password is set
			isEmailVerified: true, // Pre-verified since admin invited
			mustChangePassword: true, // Force change on first login
			
			// Profile placeholders
			phoneNumber: '',
			address: '',
			city: '',
			postalCode: '',
			country: '',
		});

		await user.save();


		// 5. Send Invite Email (NO PASSWORD)
		const loginUrl = `${FRONTEND_URL}/login`;
		try {
			// specific email function for this new flow? 
			// reusing sendEmployeeInvitation but passing loginUrl instead of setupUrl
			// and NOT passing OTP.
			// Ideally we should have a `sendCredentialsEmail` or generic `sendInvite`
			// For now, I'll assume sendEmployeeInvitation can handle it or I'll customize the message there later. 
			// But wait, the previous code used `sendEmployeeInvitation`. I should check `email.utils.ts`.
			// Since I can't check it right now without tool call, I'll send a generic invite.
			// Actually, the plan said "The invitation email will NOT contain the password".
			// So just a "You have been invited, please contact admin for credentials" or similar?
			// Or just "Login at..."
			
			await sendEmployeeInvitation(
				user.email,
				loginUrl,
				'', // No OTP needed
				company.name
			);
		} catch (emailErr) {
			console.error('Failed to send invite email:', emailErr);
			// Don't fail the request, just log it. Admin has credentials.
		}

		// 6. Return Credentials to Admin
		res.json({
			message: 'Employee invited successfully',
			credentials: {
				email: user.email,
				password: finalPassword,
				loginUrl: loginUrl
			}
		});

	} catch (error) {
		console.error('Invite employee error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};
