# Vercel Quick Deploy Guide

## 1. Prepare Your Git Repository

Make sure your code is pushed to GitHub/GitLab/Bitbucket:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## 2. Create Vercel Account

- Go to [vercel.com](https://vercel.com)
- Click **"Sign Up"**
- Choose **"Continue with GitHub"** (or your Git provider)
- Authorize Vercel to access your repositories

## 3. Import Project to Vercel

1. After signing in, click **"Add New"** → **"Project"**
2. Click **"Continue with Git"**
3. Find `cold-email-tool` repository
4. Click **"Import"**

## 4. Configure Project Settings

**Framework:** Next.js (auto-detected)  
**Build Command:** `npm run build` (auto-detected)  
**Output Directory:** `.next` (auto-detected)  
**Install Command:** `npm install` (auto-detected)

Click **"Continue"**

## 5. Add Environment Variables

In the **Environment Variables** section, add these variables:

```
LIBSQL_URL=libsql://your-database.turso.io
LIBSQL_AUTH_TOKEN=<your_turso_auth_token>
DEEPSEEK_API_KEY=<your_deepseek_api_key>
DEEPSEEK_MODEL=deepseek-v4-flash
SMTP_HOST=mail.spacemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_user_here
SMTP_PASS=your_smtp_password_here
FROM_NAME=Your Name
FROM_EMAIL=your_email@example.com
SENDER_ACCOUNTS=[{"key":"your_sender_key","name":"Your Sender","email":"your_sender@example.com","smtpUser":"your_smtp_user_here","smtpPass":"your_smtp_password_here"}]
IMAP_HOST=mail.spacemail.com
IMAP_PORT=993
SESSION_SECRET=your_session_secret_here
APP_PASSWORD=your_secure_password_here
APP_BASE_URL=https://your-vercel-domain.vercel.app
CRON_SECRET=your_cron_secret_here
```

**For each variable:**
- Select **Production**, **Preview**, and **Development** (all three)
- Click **"Save"**

## 6. Deploy

Click **"Deploy"** button

**Wait 2-5 minutes for:**
- Dependencies install (`npm install`)
- Build process (`npm run build`)
- Function creation

## 7. Get Your URL

Once deployment succeeds, you'll see:
```
✓ Production: https://cold-email-tool-xxxxx.vercel.app
```

Click the link to test! 🚀

## 8. Test Immediately

1. **Homepage:** Should load the dashboard UI
2. **CSV Import:** Try uploading a test CSV
3. **API Endpoint:** Visit `/api/companies` in browser
4. **Check Logs:** If issues, view logs in Vercel Dashboard

## 9. Update Final URLs (Optional)

Once you have your Vercel domain:

1. Go to **Settings** → **Environment Variables**
2. Update `APP_BASE_URL` to your final domain
3. Save and redeploy

## After Deployment

✅ **Auto-Deployments:** Every Git push to `main` redeploys  
✅ **Cron Jobs:** Email and reply monitoring run automatically  
✅ **Database:** Turso persists all data  
✅ **Analytics:** Available in Vercel Dashboard

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check logs in Vercel Dashboard → Deployments |
| API 500 error | Verify all env vars are set (Dashboard → Settings → Environment Variables) |
| CSV won't upload | Check Turso credentials in env vars |
| Emails not sending | Verify SMTP credentials and IP whitelist with Spacemail |

## Support Links

- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- Turso: [docs.turso.tech](https://docs.turso.tech)

---

**Status:** ✅ Build Complete | Ready for Vercel
