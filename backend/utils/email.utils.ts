import crypto from 'crypto';
import transporter from '../config/nodemailer.config.js';
import { FRONTEND_URL, EMAIL_FROM } from '../config/config.js';

export const generateOTP = (): string => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateVerificationToken = (): string => {
	return crypto.randomBytes(32).toString('hex');
};

export const sendEmailVerification = async (
	email: string,
	otp: string,
	token: string,
	name: string,
): Promise<boolean> => {
	const verificationUrl = `${FRONTEND_URL}/auth/verify-email?token=${token}`;

	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'ChainTrust - Verify Your Email Address',
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="margin: 0; font-size: 28px;">ChainTrust</h1>
					<p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
				</div>

				<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						Thank you for registering with ChainTrust! To complete your account verification,
						you can use either of the following methods:
					</p>

					<div style="background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
						<h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Method 1: OTP Verification</h3>
						<p style="color: #666; margin-bottom: 15px;">Enter this 6-digit code in the verification form:</p>
						<div style="background: #f8f9fa; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 15px 0;">
							<h3 style="color: #0ea5e9; margin: 0; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h3>
							<p style="color: #999; margin: 10px 0 0 0; font-size: 14px;">This OTP will expire in 10 minutes</p>
						</div>
					</div>

					<div style="background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
						<h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Method 2: Link Verification</h3>
						<p style="color: #666; margin-bottom: 15px;">Click the button below to verify your email:</p>
						<div style="text-align: center; margin: 15px 0;">
							<a href="${verificationUrl}"
							   style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
							          color: white;
							          padding: 15px 30px;
							          text-decoration: none;
							          border-radius: 25px;
							          display: inline-block;
							          font-weight: bold;
							          box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
								Verify Email Address
							</a>
						</div>
						<p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
							This link will expire in 24 hours.
						</p>
					</div>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						If you didn't create an account with ChainTrust, please ignore this email.
					</p>

					<div style="text-align: center; margin-top: 30px;">
						<p style="color: #999; font-size: 12px; margin: 0;">
							This is an automated email. Please do not reply to this message.
						</p>
					</div>
				</div>
			</div>
		`,
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
	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'ChainTrust - Password Reset OTP',
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="margin: 0; font-size: 28px;">ChainTrust</h1>
					<p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
				</div>

				<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						We received a request to reset your password. Use the following OTP to complete the process:
					</p>

					<div style="background: #fff; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
						<h3 style="color: #0ea5e9; margin: 0; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h3>
						<p style="color: #999; margin: 10px 0 0 0; font-size: 14px;">This OTP will expire in 10 minutes</p>
					</div>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						If you didn't request a password reset, please ignore this email and your password will remain unchanged.
					</p>

					<div style="text-align: center; margin-top: 30px;">
						<p style="color: #999; font-size: 12px; margin: 0;">
							This is an automated email. Please do not reply to this message.
						</p>
					</div>
				</div>
			</div>
		`,
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
	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: `Invitation to join ${companyName} on ChainTrust`,
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="margin: 0; font-size: 28px;">ChainTrust</h1>
					<p style="margin: 10px 0 0 0; opacity: 0.9;">Employee Invitation</p>
				</div>

				<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333; margin-bottom: 20px;">You've been invited!</h2>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						You have been invited to join <strong>${companyName}</strong> on ChainTrust. 
						To accept this invitation and set up your account, please use the OTP or link below within the next 24 hours.
					</p>

					<div style="background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
						<h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Verification Code</h3>
						<p style="color: #666; margin-bottom: 15px;">Use this 6-digit code during setup:</p>
						<div style="background: #f8f9fa; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 15px 0;">
							<h3 style="color: #0ea5e9; margin: 0; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h3>
						</div>
					</div>

					<div style="text-align: center; margin: 25px 0;">
						<a href="${inviteLink}"
						   style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
								  color: white;
								  padding: 15px 30px;
								  text-decoration: none;
								  border-radius: 25px;
								  display: inline-block;
								  font-weight: bold;
								  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
							Accept Invitation
						</a>
					</div>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						If the button doesn't work, copy and paste this link into your browser:
						<br>
						<a href="${inviteLink}" style="color: #0ea5e9; word-break: break-all;">${inviteLink}</a>
					</p>

					<div style="text-align: center; margin-top: 30px;">
						<p style="color: #999; font-size: 12px; margin: 0;">
							This works because you were invited by an administrator of ${companyName}.
						</p>
					</div>
				</div>
			</div>
		`,
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
	const mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: 'ChainTrust - Product Expiry Alert',
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="margin: 0; font-size: 28px;">ChainTrust</h1>
					<p style="margin: 10px 0 0 0; opacity: 0.9;">Product Expiry Alert</p>
				</div>

				<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333; margin-bottom: 20px;">Urgent: Product Expiring Soon</h2>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						This is an automated alert to inform you that a product tracked on the blockchain is nearing its expiry date.
					</p>

					<div style="background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
						<h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Product Details</h3>
						
						<div style="margin-bottom: 15px;">
							<p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Blockchain Hash:</p>
							<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; font-family: monospace; word-break: break-all; color: #333;">
								${hash}
							</div>
						</div>

						<div style="margin-bottom: 15px;">
							<p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Expiry Date:</p>
							<div style="font-weight: bold; color: #ef4444; font-size: 18px;">
								${new Date(expiryDate).toLocaleDateString()}
							</div>
						</div>
					</div>

					<p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
						Please take necessary actions regarding this product.
					</p>

					<div style="text-align: center; margin-top: 30px;">
						<p style="color: #999; font-size: 12px; margin: 0;">
							This is an automated email. Please do not reply to this message.
						</p>
					</div>
				</div>
			</div>
		`,
	};

	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Error sending expiry alert email:', error);
		return false;
	}
};

