# Email Invoice Setup Guide

## Overview
The billing system now supports sending invoice emails directly using Node.js and nodemailer, without requiring the FastAPI backend.

## Quick Setup

### Option 1: Gmail (Recommended for Testing)

1. **Generate App Password**
   - Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
   - Sign in with your Gmail account
   - Create a new app password for "Aushadhi 360"
   - Copy the 16-character password

2. **Configure Environment Variables**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password-here
   SMTP_FROM=Aushadhi 360 <your-email@gmail.com>
   ```

### Option 2: Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Testing

### Without Email Configuration
The system will work without email configuration. When you generate a bill:
- Bill will be created and saved successfully
- Inventory will be updated
- You'll see a message: "Bill created. Email service not configured."

### With Email Configuration
Once configured:
- Invoices will be sent automatically if customer email is provided
- Beautiful HTML invoices with branding
- Fallback to plain text for email clients that don't support HTML

## Features

### Invoice Email Includes:
- ✉️ Professional HTML template with gradient header
- 📋 Detailed item breakdown with batch numbers
- 💰 Subtotal, GST (18%), and total amount
- 🏥 Store branding (Aushadhi 360)
- 📅 Invoice date and number
- 📧 Customer email address

### Performance Optimizations:
- Email sending doesn't block billing operations
- Graceful fallback if email service is unavailable
- No dependency on external FastAPI backend

## Troubleshooting

### "Email service not configured"
This means SMTP credentials are missing. The system will still work, just won't send emails.

### "Failed to send email"
Check your SMTP credentials and ensure:
- App password is correct (for Gmail)
- 2FA is enabled (required for Gmail app passwords)
- SMTP host and port are correct
- Firewall isn't blocking port 587/465

### Gmail "Less Secure Apps" Error
Don't use "less secure apps" - use App Passwords instead:
1. Enable 2-Step Verification
2. Generate App Password
3. Use the app password in .env file

## Security Notes

⚠️ **Important:**
- Never commit .env file to git
- Use App Passwords, not your main password
- Keep .env.example updated without real credentials
- Rotate passwords regularly

## Support

For issues, check:
- Environment variables are set correctly
- Nodemailer package is installed (`npm install`)
- Server logs for specific error messages
