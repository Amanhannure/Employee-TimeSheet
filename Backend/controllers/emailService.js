import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendPasswordResetCode(email, code, employeeId) {
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@yourcompany.com',
            to: email,
            subject: 'Password Reset Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>You have requested to reset your password for employee code: <strong>${employeeId}</strong></p>
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
                        <h3 style="color: #007bff; margin: 0; font-size: 24px;">${code}</h3>
                        <p style="color: #666; margin: 10px 0 0 0;">This code will expire in 15 minutes</p>
                    </div>
                    <p>If you didn't request this reset, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset code sent to ${email}`);
            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }

    async sendPasswordResetSuccess(email, employeeId) {
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@yourcompany.com',
            to: email,
            subject: 'Password Reset Successful',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">Password Reset Successful</h2>
                    <p>Hello,</p>
                    <p>Your password for employee code <strong>${employeeId}</strong> has been successfully reset.</p>
                    <p>If you did not perform this action, please contact your administrator immediately.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Success email sending failed:', error);
            return false;
        }
    }
}

export default new EmailService();