import crypto from 'crypto';
import transporter from '../config/nodemailer.config.js';
import { FRONTEND_URL, EMAIL_FROM } from '../config/config.js';

export const generateOTP = (): string => {
	return crypto.randomInt(100000, 999999).toString();
};

export const generateVerificationToken = (): string => {
	return crypto.randomBytes(32).toString('hex');
};

const wrapTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
        /* Reset & Base Typography */
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #3f3f46; }
        
        /* Layout */
        .wrapper { width: 100%; background-color: #f4f4f5; padding: 60px 20px; box-sizing: border-box; }
        .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); }
        
        /* Header & Dual-Tone Branding */
        .header { padding: 40px 40px 0 40px; text-align: center; }
        .brand { font-size: 26px; font-weight: 800; text-decoration: none; letter-spacing: -0.03em; }
        .brand-chain { color: #000000; }
        .brand-trust { color: #2563eb; } /* Professional Blue */
        
        /* Content & Typography */
        .content { padding: 32px 40px; }
        .title { font-size: 20px; font-weight: 600; margin: 0 0 20px 0; letter-spacing: -0.02em; color: #18181b; text-align: center; }
        .text { line-height: 1.6; margin: 0 0 24px 0; font-size: 15px; text-align: center; }
        .text strong { color: #18181b; }
        
        /* UI Elements & Cards */
        .card { background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
        .card-blue { background-color: #eff6ff; border: 1px solid #bfdbfe; }
        .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 12px; }
        .label-blue { color: #3b82f6; }
        .otp { font-size: 40px; font-weight: 800; letter-spacing: 0.15em; color: #1d4ed8; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        
        /* Buttons */
        .btn-wrapper { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: opacity 0.2s; }
        
        /* Code blocks & Dividers */
        .monospace { background-color: #f4f4f5; border-radius: 6px; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #3f3f46; word-break: break-all; margin: 16px 0; text-align: center; border: 1px solid #e4e4e7; }
        .divider { height: 1px; background-color: #e4e4e7; margin: 32px 0; }
        .highlight-date { font-size: 22px; font-weight: 700; color: #ef4444; margin-top: 8px; }
        
        /* Footer */
        .footer { padding: 24px 40px; text-align: center; background-color: #fafafa; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 13px; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <a href="${FRONTEND_URL}" class="brand">
                    <span class="brand-chain">Chain</span><span class="brand-trust">Trust</span>
                </a>
            </div>
            <div class="content">
                <h2 class="title">${title}</h2>
                ${content}
            </div>
            <div class="footer">
                <strong>ChainTrust Security</strong><br>
                This is an automated message, please do not reply.<br>
                &copy; ${new Date().getFullYear()} ChainTrust. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
`;

export const sendEmailVerification = async (
	email: string,
	otp: string,
	token: string,
	name: string,
): Promise<boolean> => {
	const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

	const content = `
		<p class="text">Hello <strong>${name}</strong>, please verify your email address to complete your registration.</p>
		
		<div class="card card-blue">
			<div class="label label-blue">Verification Code</div>
			<div class="otp">${otp}</div>
		</div>

		<div class="divider"></div>

		<p class="text">Alternatively, you can verify your account instantly by clicking the button below:</p>
		<div class="btn-wrapper">
			<a href="${verificationUrl}" class="btn">Verify Account</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'Verify your ChainTrust Account',
		html: wrapTemplate('Verify your email', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending verification email:', error);
		return false;
	}
};

export const sendPasswordResetOTP = async (
	email: string,
	otp: string,
	name: string,
): Promise<boolean> => {
	const content = `
		<p class="text">Hello <strong>${name}</strong>, use the secure code below to reset your password. If you didn't request this change, you can safely ignore this email.</p>
		
		<div class="card card-blue">
			<div class="label label-blue">Secure Reset Code</div>
			<div class="otp">${otp}</div>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'Reset your ChainTrust password',
		html: wrapTemplate('Password reset', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending password reset OTP email:', error);
		return false;
	}
};

export const sendEmployeeInvitation = async (
	email: string,
	inviteLink: string,
	otp: string,
	companyName: string,
): Promise<boolean> => {
	const content = `
		<p class="text">You've been invited to join <strong>${companyName}</strong> on ChainTrust.</p>
		
		<div class="btn-wrapper">
			<a href="${inviteLink}" class="btn">Accept Invitation</a>
		</div>

		<div class="divider"></div>

		<p class="text">If you are entering the code manually, use the following:</p>
		<div class="card">
			<div class="label">Invite Code</div>
			<div class="otp" style="font-size: 28px; color: #18181b;">${otp}</div>
		</div>

		<p class="text" style="font-size: 13px; color: #71717a;">Or copy and paste this link into your browser:</p>
		<div class="monospace">${inviteLink}</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Join ${companyName} on ChainTrust`,
		html: wrapTemplate('You are invited', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending employee invitation email:', error);
		return false;
	}
};

export const sendExpiryAlert = async (
	email: string,
	medicineName: string,
	expiryDate: string,
	daysLeft: number,
): Promise<boolean> => {
	const content = `
		<p class="text">This is an automated alert regarding your medicine that is expiring soon.</p>
		
		<div class="card">
			<div class="label">Medicine Name</div>
			<div class="otp" style="font-size: 24px; color: #18181b; letter-spacing: normal;">${medicineName}</div>
			
			<div class="divider"></div>
			
			<div class="label">Expiry Status</div>
			<div class="highlight-date">${daysLeft === 0 ? 'Expires Today' : `Expires in ${daysLeft} days`}</div>
			<p class="text" style="font-size: 13px; margin-top: 8px;">Date: ${expiryDate}</p>
		</div>

		<div class="btn-wrapper">
			<a href="${FRONTEND_URL}/customer/cabinet" class="btn">View My Medicines</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Medicine Expiry Alert: ${medicineName}`,
		html: wrapTemplate('Expiry Alert', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending expiry alert email:', error);
		return false;
	}
};

export const sendDoseReminder = async (
	email: string,
	medicineName: string,
	dosage?: number,
	mealContext?: string,
	unit?: string,
): Promise<boolean> => {
	const mealText = mealContext ? `<p class="label label-blue">${mealContext.replace('_', ' ')}</p>` : '';
	const unitText = unit ? ` ${unit}` : '';
	const content = `
		<p class="text">It's time to take your scheduled dose.</p>
		
		<div class="card card-blue">
			<div class="label label-blue">Now Taking</div>
			<div class="otp" style="font-size: 32px; color: #1d4ed8; letter-spacing: -0.02em;">${medicineName}</div>
			${dosage ? `<p class="text" style="font-size: 18px; font-weight: 600; margin: 12px 0 0 0;">Dosage: ${dosage}${unitText}</p>` : ''}
			${mealText}
		</div>

		<p class="text" style="font-size: 13px; color: #71717a;">Please stay consistent with your medication for the best results.</p>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Dose Reminder: ${medicineName}`,
		html: wrapTemplate('Medication Reminder', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending dose reminder email:', error);
		return false;
	}
};