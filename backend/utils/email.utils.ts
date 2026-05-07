import crypto from 'crypto';
import transporter from '../config/nodemailer.config.js';
import { FRONTEND_URL, EMAIL_FROM } from '../config/config.js';

export const generateOTP = (): string => {
	return crypto.randomInt(100000, 999999).toString();
};

export const generateVerificationToken = (): string => {
	return crypto.randomBytes(32).toString('hex');
};

const wrapTemplate = (title: string, content: string, role: 'customer' | 'manufacturer' | 'common' = 'common') => {
	const dashboardLink = role === 'customer' ? `${FRONTEND_URL}/customer/cabinet` : role === 'manufacturer' ? `${FRONTEND_URL}/manufacturer/analytics` : FRONTEND_URL;
	const notificationsLink = role === 'customer' ? `${FRONTEND_URL}/customer/notifications` : role === 'manufacturer' ? `${FRONTEND_URL}/manufacturer/notifications` : `${FRONTEND_URL}/login`;
	const settingsLink = role === 'customer' ? `${FRONTEND_URL}/customer/settings` : role === 'manufacturer' ? `${FRONTEND_URL}/manufacturer/settings` : `${FRONTEND_URL}/login`;

	return `
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
        .footer-links { margin: 16px 0; padding-top: 16px; border-top: 1px solid #e4e4e7; }
        .footer-link { color: #71717a; text-decoration: underline; margin: 0 8px; font-size: 12px; }
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
                <div class="footer-links">
                    <a href="${dashboardLink}" class="footer-link">Dashboard</a>
                    <a href="${notificationsLink}" class="footer-link">Notification Settings</a>
                    <a href="${settingsLink}" class="footer-link">Privacy Policy</a>
                </div>
                &copy; ${new Date().getFullYear()} ChainTrust. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
`;
};

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
		html: wrapTemplate('Verify your email', content, 'common'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending verification email:', error);
		console.log('---------------------------------------------------------');
		console.log(`[LOCAL DEV FALLBACK] Verification for: ${email}`);
		console.log(`OTP: ${otp}`);
		console.log(`Link: ${verificationUrl}`);
		console.log('---------------------------------------------------------');
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
		html: wrapTemplate('Password reset', content, 'common'),
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
		html: wrapTemplate('You are invited', content, 'manufacturer'),
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
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
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
			<a href="${medicineUrl}" class="btn">${medicineId ? 'View Medicine Details' : 'View My Medicines'}</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Medicine Expiry Alert: ${medicineName}`,
		html: wrapTemplate('Expiry Alert', content, 'customer'),
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
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
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
		
		<div class="btn-wrapper">
			<a href="${medicineUrl}" class="btn">Log Medication Intake</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Dose Reminder: ${medicineName}`,
		html: wrapTemplate('Medication Reminder', content, 'customer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending dose reminder email:', error);
		return false;
	}
};

export const sendMissedDoseAlert = async (
	email: string,
	name: string,
	medicineName: string,
	timeString: string,
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
	const content = `
		<p class="text">Hello <strong>${name}</strong>, you missed your scheduled medicine intake.</p>
		
		<div class="card" style="background-color: #fffbeb; border-color: #fcd34d;">
			<div class="label" style="color: #b45309;">Missed Dose Alert</div>
			<div class="otp" style="font-size: 24px; color: #18181b; letter-spacing: normal;">${medicineName}</div>
			
			<div class="divider"></div>
			<p class="text" style="font-size: 14px; margin-top: 8px;">Scheduled Time: <strong>${timeString}</strong></p>
		</div>

		<p class="text">You can still record it as late if you take it now. Please consult your healthcare provider if you have questions about missed doses.</p>

		<div class="btn-wrapper">
			<a href="${medicineUrl}" class="btn" style="background-color: #d97706;">Check My Cabinet</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Missed Dose Alert: ${medicineName}`,
		html: wrapTemplate('Missed Medicine', content, 'customer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending missed dose alert email:', error);
		return false;
	}
};

export const sendBatchRecallAlert = async (
	email: string,
	name: string,
	medicineName: string,
	batchNumber: string,
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
	const content = `
		<p class="text">Hello <strong>${name}</strong>, this is an urgent safety notification.</p>
		
		<div class="card" style="border-color: #ef4444; background-color: #fef2f2;">
			<div class="label" style="color: #ef4444;">Safety Recall Alert</div>
			<div class="otp" style="font-size: 24px; color: #18181b; letter-spacing: normal;">${medicineName}</div>
			<p class="text" style="margin-top: 8px;">Batch: <strong>${batchNumber}</strong></p>
			
			<div class="divider"></div>
			<p class="text" style="color: #b91c1c; font-weight: 600;">Please discontinue use immediately.</p>
		</div>

		<p class="text">The manufacturer has issued a recall for this batch. Please consult your healthcare provider or pharmacy for replacement options.</p>

		<div class="btn-wrapper">
			<a href="${medicineUrl}" class="btn" style="background-color: #ef4444;">Review Safety Information</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `URGENT: Safety Recall for ${medicineName}`,
		html: wrapTemplate('Safety Recall Alert', content, 'customer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending batch recall email:', error);
		return false;
	}
};

export const sendBatchRestoredAlert = async (
	email: string,
	name: string,
	medicineName: string,
	batchNumber: string,
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
	const content = `
		<p class="text">Hello <strong>${name}</strong>, we have a safety update regarding your medication.</p>
		
		<div class="card card-blue">
			<div class="label label-blue">Safety Update: Restored</div>
			<div class="otp" style="font-size: 24px; color: #18181b; letter-spacing: normal;">${medicineName}</div>
			<p class="text" style="margin-top: 8px;">Batch: <strong>${batchNumber}</strong></p>
			
			<div class="divider"></div>
			<p class="text" style="color: #059669; font-weight: 600;">Status: Safe to Use</p>
		</div>

		<p class="text">The manufacturer has resolved the previous safety concerns for this batch. It has been restored and is now marked as authentic and safe.</p>

		<div class="btn-wrapper">
			<a href="${medicineUrl}" class="btn">View Updated Details</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Update: ${medicineName} has been Restored`,
		html: wrapTemplate('Medicine Safety Update', content, 'customer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending batch restored email:', error);
		return false;
	}
};

export const sendLowStockAlert = async (
	email: string,
	name: string,
	medicineName: string,
	currentQuantity: number,
	medicineId?: string,
): Promise<boolean> => {
	const medicineUrl = medicineId ? `${FRONTEND_URL}/customer/cabinet/${medicineId}` : `${FRONTEND_URL}/customer/cabinet`;
	const content = `
		<p class="text">Hello <strong>${name}</strong>, your medication supply is running low.</p>
		
		<div class="card" style="background-color: #fffbeb; border-color: #fcd34d;">
			<div class="label" style="color: #b45309;">Low Stock Warning</div>
			<div class="otp" style="font-size: 24px; color: #18181b; letter-spacing: normal;">${medicineName}</div>
			
			<div class="divider"></div>
			<div class="highlight-date" style="color: #d97706;">${currentQuantity} Remaining</div>
		</div>

		<p class="text">Based on your current schedule, you have less than a 3-day supply remaining. We recommend replenishing your stock soon.</p>

		<div class="btn-wrapper">
			<a href="${medicineUrl}" class="btn" style="background-color: #d97706;">Refill Medicine</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Low Stock Alert: ${medicineName}`,
		html: wrapTemplate('Refill Reminder', content, 'customer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending low stock alert email:', error);
		return false;
	}
};

export const sendSuspiciousScanAlert = async (
	email: string,
	name: string,
	productName: string,
	batchNumber: string,
	reason: string,
	batchId?: string,
): Promise<boolean> => {
	const analyticsUrl = batchId ? `${FRONTEND_URL}/manufacturer/batches/${batchId}` : `${FRONTEND_URL}/manufacturer/analytics`;
	const content = `
		<p class="text">Hello <strong>${name}</strong>, a potential security incident has been flagged.</p>
		
		<div class="card" style="border-color: #ef4444; background-color: #fef2f2;">
			<div class="label" style="color: #ef4444;">Suspicious Activity Detected</div>
			<div class="otp" style="font-size: 20px; color: #18181b; letter-spacing: normal;">${productName}</div>
			<p class="text" style="font-size: 13px; margin-top: 4px;">Batch: ${batchNumber}</p>
			
			<div class="divider"></div>
			<p class="label">Primary Flag</p>
			<p class="text" style="color: #b91c1c; font-weight: 600; margin-bottom: 0;">${reason}</p>
		</div>

		<p class="text">A scan for one of your products was flagged as high-risk. Please review the scan analytics to determine if further action is required.</p>

		<div class="btn-wrapper">
			<a href="${analyticsUrl}" class="btn" style="background-color: #18181b;">View Threat Intelligence</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Security Alert: Suspicious Scan Detected`,
		html: wrapTemplate('Security Alert', content, 'manufacturer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending suspicious scan alert email:', error);
		return false;
	}
};

export const sendScanMilestoneAlert = async (
	email: string,
	name: string,
	batchNumber: string,
	scanCount: number,
	batchId?: string,
): Promise<boolean> => {
	const batchUrl = batchId ? `${FRONTEND_URL}/manufacturer/batches/${batchId}` : `${FRONTEND_URL}/manufacturer/batches`;
	const content = `
		<p class="text">Congratulations <strong>${name}</strong>! Your batch has reached a new engagement milestone.</p>
		
		<div class="card card-blue">
			<div class="label label-blue">Adoption Milestone</div>
			<div class="otp" style="font-size: 48px; color: #1d4ed8;">${scanCount}</div>
			<p class="label" style="margin-top: 8px;">Total Verified Scans</p>
			
			<div class="divider"></div>
			<p class="text" style="font-size: 14px; margin-bottom: 0;">Batch: <strong>${batchNumber}</strong></p>
		</div>

		<p class="text">Your product is successfully reaching consumers. This milestone indicates growing trust and active verification in the field.</p>

		<div class="btn-wrapper">
			<a href="${batchUrl}" class="btn">View Batch Analytics</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Milestone Achieved: ${scanCount} Scans for Batch ${batchNumber}`,
		html: wrapTemplate('Milestone Achievement', content, 'manufacturer'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending scan milestone alert email:', error);
		return false;
	}
};

export const sendSystemNotification = async (
	email: string,
	name: string,
	subject: string,
	message: string,
): Promise<boolean> => {
	const content = `
		<p class="text">Hello <strong>${name}</strong>, you have a new system update from ChainTrust.</p>
		
		<div class="card">
			<div class="label">Message Summary</div>
			<p class="text" style="font-weight: 600; margin-bottom: 12px;">${subject}</p>
			<div class="divider"></div>
			<p class="text" style="font-size: 14px; text-align: left; margin-bottom: 0;">${message}</p>
		</div>

		<div class="btn-wrapper">
			<a href="${FRONTEND_URL}" class="btn">Go to Dashboard</a>
		</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `ChainTrust System Update: ${subject}`,
		html: wrapTemplate('System Notification', content, 'common'),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending system notification email:', error);
		return false;
	}
};