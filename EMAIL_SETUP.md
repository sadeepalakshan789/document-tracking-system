# Email OTP Setup Guide (Resend)

## Step 1: Create Resend API Key

1. Go to https://resend.com/api-keys
2. Create a new API key with sending permissions
3. Copy the key value

## Step 2: Update `server/.env`

Set these values in your backend env file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/document_tracking_db
JWT_SECRET=supersecretjwtkey_12345
RESEND_API=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=Document Tracking System <onboarding@resend.dev>
```

Notes:
- `RESEND_API` is required.
- `RESEND_FROM` is optional. If omitted, backend defaults to `Document Tracking System <onboarding@resend.dev>`.
- `onboarding@resend.dev` is the Resend development sender domain.

## Step 3: Restart Backend Server

```powershell
cd server
npm start
```

## Step 4: Test Registration OTP

1. Open `http://localhost:3000`
2. Register a new user
3. Open the OTP verification page
4. Check inbox (and spam) for the OTP email
5. If OTP is delayed, use `Resend OTP`

## Troubleshooting

- `Failed to send OTP email`: verify `RESEND_API` is valid and active.
- OTP not in inbox: check spam/junk and retry `Resend OTP`.
- Still failing: check backend logs for Resend API errors.
