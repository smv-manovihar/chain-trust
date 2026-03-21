import crypto from 'crypto';
import transporter from '../config/nodemailer.config.js';
import { FRONTEND_URL, EMAIL_FROM } from '../config/config.js';

export const generateOTP = (): string => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateVerificationToken = (): string => {
	return crypto.randomBytes(32).toString('hex');
};

const wrapTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 32px; overflow: hidden; color: #ffffff; }
        .header { padding: 48px 40px; text-align: center; border-bottom: 1px solid #27272a; background: linear-gradient(to bottom, #111114, #09090b); }
        .content { padding: 48px 40px; }
        .footer { padding: 32px; text-align: center; background-color: #09090b; border-top: 1px solid #27272a; color: #52525b; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; }
        .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.05em; color: #ffffff; text-decoration: none; }
        .accent { color: #10b981; }
        .title { font-size: 24px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.03em; color: #ffffff; }
        .text { color: #a1a1aa; line-height: 1.7; margin-bottom: 24px; font-size: 15px; }
        .otp-container { background-color: #111114; border: 1px solid #27272a; border-radius: 20px; padding: 32px; text-align: center; margin: 32px 0; }
        .otp-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 12px; }
        .otp { font-size: 42px; font-weight: 900; letter-spacing: 0.25em; color: #10b981; margin: 0; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #000000 !important; padding: 16px 40px; border-radius: 100px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3); }
        .hash-box { background-color: #111114; border: 1px solid #27272a; border-radius: 12px; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #10b981; word-break: break-all; }
        .divider { height: 1px; background-color: #27272a; margin: 32px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="${FRONTEND_URL}" class="brand">CHAIN<span class="accent">TRUST</span></a>
        </div>
        <div class="content">
            <h2 class="title">${title}</h2>
            ${content}
        </div>
        <div class="footer">
            &copy; 2026 CHAINTRUST &bull; SECURE BLOCKCHAIN INFRASTRUCTURE
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
		<p class="text">Hello ${name}, welcome to the network. To activate your account and ensure secure access to ChainTrust, please verify your identity.</p>
		
		<div class="otp-container">
			<div class="otp-label">Verification Passcode</div>
			<h3 class="otp">${otp}</h3>
			<p style="color: #71717a; font-size: 11px; margin-top: 12px;">Valid for 10 minutes</p>
		</div>

		<div class="divider"></div>

		<p class="text">Alternatively, you can use the direct secure link below:</p>
		<div class="btn-container">
			<a href="${verificationUrl}" class="btn">VERIFY ACCOUNT</a>
		</div>
		<p style="color: #52525b; font-size: 11px; text-align: center;">This link remains active for 24 hours.</p>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'Verify your ChainTrust Account',
		html: wrapTemplate('Finalizing Setup', content),
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
		<p class="text">Hello ${name}, we received a request to reset your master password. Use the security code below to proceed.</p>
		
		<div class="otp-container">
			<div class="otp-label">Reset Token</div>
			<h3 class="otp">${otp}</h3>
			<p style="color: #71717a; font-size: 11px; margin-top: 12px;">Security window: 10 minutes</p>
		</div>

		<p class="text">If you did not initiate this request, please secure your account immediately or ignore this message.</p>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'Security Alert: Password Reset Requested',
		html: wrapTemplate('Password Recovery', content),
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
		<p class="text">You have been formally invited to join the <strong>${companyName}</strong> administrative console on ChainTrust.</p>
		
		<div class="otp-container">
			<div class="otp-label">Invitation Code</div>
			<h3 class="otp">${otp}</h3>
		</div>

		<div class="btn-container">
			<a href="${inviteLink}" class="btn">ACCEPT INVITATION</a>
		</div>

		<p class="text">To complete your enrollment, use the code above on the setup page or click the secure link.</p>
		<div class="hash-box">${inviteLink}</div>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Action Required: Join ${companyName} on ChainTrust`,
		html: wrapTemplate('Institutional Invite', content),
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
	hash: string,
	expiryDate: Date,
): Promise<boolean> => {
	const content = `
		<p class="text">Urgent synchronization alert: A product registered under your authority is approaching its expiration threshold.</p>
		
		<div style="background-color: #111114; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
			<p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">Product Identification Hash</p>
			<div class="hash-box">${hash}</div>
			
			<div style="margin-top: 20px;">
				<p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #71717a; margin-bottom: 4px;">Registry Expiry</p>
				<p style="font-size: 18px; font-weight: 900; color: #f43f5e;">${new Date(expiryDate).toLocaleDateString()}</p>
			</div>
		</div>

		<p class="text">We recommend auditing your supply chain nodes to prevent counterfeit infiltration or public health risks.</p>
	`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'Critical Alert: Impending Product Expiry',
		html: wrapTemplate('Supply Chain Alert', content),
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending expiry alert email:', error);
		return false;
	}
};

