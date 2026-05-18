# Render Deployment Guide - Node.js Backend

This guide walks you through deploying your Deepdale backend to Render.

## Prerequisites

- Git repository (GitHub, GitLab, or Bitbucket)
- Render account (free tier available)
- PostgreSQL database (Render provides managed PostgreSQL)

## Step 1: Prepare Your Repository

### 1.1 Add Render Configuration Files

Create a `render.yaml` file in your project root (already created in this directory).

### 1.2 Update Environment Variables

Your application needs these environment variables configured in Render:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<Render PostgreSQL connection string>
APP_BASE_URL=<Your Render web service URL>
CORS_ORIGINS=<Your Netlify frontend URL>
SESSION_SECRET=<Generate a random 32+ character string>
SESSION_COOKIE_NAME=dd_admin_session
CSRF_COOKIE_NAME=dd_admin_csrf
SESSION_TTL_HOURS=168
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
UPLOAD_DRIVER=s3
S3_REGION=<Your S3 region>
S3_BUCKET=<Your S3 bucket name>
S3_ACCESS_KEY_ID=<Your S3 access key>
S3_SECRET_ACCESS_KEY=<Your S3 secret>
S3_PUBLIC_BASE_URL=<Your S3 public URL>
OPENAI_API_KEY=<Your OpenAI API key>
OPENAI_BASE_URL=<Optional custom OpenAI URL>
OPENAI_CHAT_MODEL_DEFAULT=gpt-4o-mini
TTS_PROVIDER=openai
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

**Optional Variables:**
```
ADMIN_SEED_EMAIL=admin@deepdale.local
ADMIN_SEED_PASSWORD=<Secure password>
```

## Step 2: Create PostgreSQL Database on Render

1. Log into [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **PostgreSQL**
3. Configure database:
   - **Name**: `deepdale-db`
   - **Database**: `deepdale`
   - **Region**: Choose closest to your users
   - **Plan**: Free tier (or paid for production)
4. Click **Create Database**
5. **Save the internal connection string** (you'll need this for DATABASE_URL)

## Step 3: Deploy Web Service

1. In Render Dashboard, click **New** → **Web Service**
2. Connect your Git repository
3. Configure the web service:

**Basic Settings:**
```
Name: deepdale-backend
Region: (same as your database)
Branch: main
Root Directory: (leave blank)
Runtime: Node
Build Command: pnpm build
Start Command: node dist/index.js
```

**Environment Variables:**
- Click **Advanced** → **Add Environment Variable**
- Add all variables from Step 1.2
- For `DATABASE_URL`, use the Render PostgreSQL connection string
- Format: `postgresql://user:password@host:port/deepdale?sslmode=require`

**Instance Size:**
- Free tier: 512MB RAM (good for testing)
- Production: Start with Standard ($7/month)

**Auto-Deploy:**
- Keep enabled for automatic deployments on git push

4. Click **Create Web Service**

## Step 4: Run Database Migrations

After the first deployment:

### Option A: Manual Migration (Recommended for initial setup)

1. SSH into your Render instance:
   ```bash
   # In Render dashboard, click your service → Shell
   ```

2. Run migrations:
   ```bash
   pnpm prisma:generate
   pnpm prisma migrate deploy
   pnpm prisma:seed
   ```

### Option B: Automated Migration Script

Create a migration script that runs on startup:

```bash
# Add to package.json scripts
"postinstall": "prisma generate && prisma migrate deploy"
```

Update `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate && prisma migrate deploy"
  }
}
```

## Step 5: Configure CORS

Update `CORS_ORIGINS` to include your Netlify frontend URL:
```
CORS_ORIGINS=https://your-site.netlify.app
```

For multiple origins (comma-separated):
```
CORS_ORIGINS=https://your-site.netlify.app,https://www.yoursite.com
```

## Step 6: Configure File Uploads

For production, use S3-compatible storage:

1. **AWS S3** or **Cloudflare R2** recommended
2. Update environment variables:
   ```
   UPLOAD_DRIVER=s3
   S3_ENDPOINT=<for R2 or other S3-compatible>
   S3_REGION=auto
   S3_BUCKET=your-bucket
   S3_ACCESS_KEY_ID=your-key
   S3_SECRET_ACCESS_KEY=your-secret
   S3_PUBLIC_BASE_URL=https://your-cdn.com
   ```

## Step 7: Verify Deployment

1. Check service logs in Render dashboard
2. Test health endpoint: `https://your-service.onrender.com/health`
3. Test API: `https://your-service.onrender.com/api/...`
4. Verify admin user creation

## Troubleshooting

### Build Fails
- Check Node version compatibility (Render defaults to latest LTS)
- Ensure `pnpm-lock.yaml` is committed
- Review build logs for specific errors

### Database Connection Errors
- Verify DATABASE_URL format includes `?sslmode=require`
- Ensure database is in same region as web service
- Check firewall rules allow Render-to-Render connections

### CORS Errors
- Verify CORS_ORIGINS matches your frontend URL exactly
- Include protocol (https://) in URLs
- No trailing slashes

### Session Issues
- Generate a new SESSION_SECRET (minimum 32 characters)
- Use: `openssl rand -hex 32`

## Monitoring & Maintenance

### Logs
- View real-time logs in Render dashboard
- Download logs for debugging

### Database Backups
- Render provides automatic daily backups (paid plans)
- Export backups regularly for free tier

### Performance
- Monitor memory usage
- Upgrade plan if hitting resource limits
- Consider adding Redis for caching (future optimization)

## Cost Optimization

**Free Tier:**
- Web Service: 750 hours/month (free tier)
- PostgreSQL: 90 days free, then $7/month
- Good for development/testing

**Production:**
- Web Service: $7-25/month
- PostgreSQL: $7-25/month
- Total: ~$14-50/month

## Security Best Practices

1. ✅ Use strong SESSION_SECRET (32+ chars)
2. ✅ Enable HTTPS only (automatic on Render)
3. ✅ Restrict CORS to your domains
4. ✅ Use environment variables for secrets
5. ✅ Regular dependency updates
6. ✅ Database backups
7. ✅ Rate limiting enabled (already configured)

## Next Steps

1. Set up custom domain (in Render dashboard)
2. Configure CDN for static assets
3. Set up monitoring/alerts
4. Implement log aggregation (optional)
5. Configure staging environment

## Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com
