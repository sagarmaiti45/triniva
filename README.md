# Triniva AI - Free AI Image Generation Platform

A modern, feature-rich AI image generation platform built with Next.js 15, TypeScript, and Stability AI API.

![Triniva AI](public/images/triniva.svg)

## Features

- 🎨 **AI Image Generation** - Create stunning images from text prompts using Stability AI models
- 🎯 **Multiple AI Models** - Support for SD 3.5 Medium, Large Turbo, Flash, and more
- 🎨 **Style Presets** - Apply various artistic styles to generated images
- 📐 **Aspect Ratios** - Multiple aspect ratio options (Square, Portrait, Landscape, Wide, Ultra Wide)
- 🔐 **User Authentication** - Secure email-based authentication with OTP verification
- 📊 **Generation Limits** - Smart tracking for guest (3 free) and registered users (10 free)
- 💾 **Image History** - Save and manage generated images with automatic cleanup
- 🌓 **Dark/Light Mode** - Beautiful theme switching with smooth transitions
- 📱 **Responsive Design** - Fully responsive across all devices
- 🛡️ **Security First** - reCAPTCHA v3 integration and rate limiting

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **Authentication**: Custom JWT implementation with OTP
- **Database**: Redis (Upstash) for session and data storage
- **AI API**: Stability AI
- **Email**: Resend for OTP delivery
- **Security**: Google reCAPTCHA v3
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Redis instance (Upstash recommended)
- Stability AI API key
- Resend API key
- Google reCAPTCHA v3 keys

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sagarmaiti45/triniva.git
cd triniva
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file with all required keys:
```env
# Stability AI
STABILITY_API_KEY=your_stability_api_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# JWT Secret
JWT_SECRET=your_jwt_secret

# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
triniva/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Radix UI components
│   └── ...               # Feature components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and services
│   ├── auth.ts          # Authentication logic
│   ├── redis.ts         # Redis client
│   └── db/              # Database services
├── public/              # Static assets
└── scripts/             # Utility scripts
```

## Key Features Implementation

### Generation Limits
- Guest users: 3 free generations, 30-day storage
- Registered users: 10 lifetime free generations, permanent storage
- Automatic guest-to-user data migration on signup

### Security Measures
- Environment variable protection
- Rate limiting with Redis
- Google reCAPTCHA v3 for bot protection
- Secure OTP-based authentication
- HTTP-only JWT cookies

### Image Storage
- Efficient caching system
- Automatic cleanup for expired guest images
- Download functionality for all generated images

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run cleanup-duplicates` - Remove duplicate entries from database

### Code Style

The project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

## Deployment

The application can be deployed on any platform that supports Next.js:

1. **Vercel** (Recommended)
2. **Netlify**
3. **AWS Amplify**
4. **Traditional VPS**

Make sure to set all environment variables in your deployment platform.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Stability AI](https://stability.ai/) for the image generation API
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Upstash](https://upstash.com/) for serverless Redis
- [Resend](https://resend.com/) for email delivery

## Support

For support, email support@triniva.com or open an issue on GitHub.

---

Built with ❤️ by [Triniva.com](https://triniva.com)