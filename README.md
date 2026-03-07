# better-auth-usos

USOS OAuth 1.0a authentication plugin for [Better Auth](https://www.better-auth.com).

## What is USOS?

USOS (University Study-Oriented System) is a comprehensive academic system used by universities across Poland and other countries. It manages student records, course registration, grades, schedules, and more.

### Universities Using USOS

This plugin works with any USOS instance. Some notable universities include:

- **Poland**: Wrocław University of Science and Technology (PWR), University of Warsaw (UW), Warsaw University of Technology (PW), AGH University of Science and Technology, Jagiellonian University, and many more
- Other countries with USOS deployments

Each university has its own USOS instance with a unique base URL (e.g., `https://apps.usos.pwr.edu.pl`).

## Features

- Full OAuth 1.0a flow implementation for USOS
- Automatic user creation and updates
- Configurable scopes and email domain
- TypeScript support with full type definitions
- Works with any USOS instance
- Both server-side and client-side plugins

## Installation

```bash
npm install better-auth-usos
```

### Peer Dependencies

This plugin requires the following packages:

```bash
npm install better-auth crypto-js oauth-1.0a zod
```

## Usage

### 1. Get USOS API Credentials

To use this plugin, you need to register your application with your university's USOS system:

1. Go to your university's USOS Apps page (e.g., `https://apps.usos.pwr.edu.pl`)
2. Navigate to "For developers" or "API" section
3. Register a new application
4. Set the callback URL to: `https://yourdomain.com/api/auth/usos/callback`
5. Note your Consumer Key and Consumer Secret

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
USOS_BASE_URL=https://apps.usos.pwr.edu.pl
USOS_CONSUMER_KEY=your_consumer_key
USOS_CONSUMER_SECRET=your_consumer_secret
USOS_EMAIL_DOMAIN=student.pwr.edu.pl
```

### 3. Database Schema

Add custom fields to your Better Auth user table. This plugin stores additional USOS data:

```typescript
import { betterAuth } from 'better-auth';
import { usosAuth } from 'better-auth-usos';

export const auth = betterAuth({
  database: {
    // your database config
  },
  user: {
    additionalFields: {
      studentNumber: {
        type: 'number',
        required: false,
      },
      usosId: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    usosAuth({
      usosBaseUrl: process.env.USOS_BASE_URL!,
      consumerKey: process.env.USOS_CONSUMER_KEY!,
      consumerSecret: process.env.USOS_CONSUMER_SECRET!,
      emailDomain: process.env.USOS_EMAIL_DOMAIN!,
      scopes: 'studies|offline_access',
      onSuccess: async (user) => {
        return '/dashboard';
      },
    }),
  ],
});
```

After configuration, run Better Auth migrations to create the database schema:

```bash
npx better-auth migrate
```

### 4. Client Setup

Add the client plugin to your Better Auth client:

```typescript
import { createAuthClient } from 'better-auth/client';
import { usosAuthClient } from 'better-auth-usos/client';

export const authClient = createAuthClient({
  plugins: [usosAuthClient()],
});
```

### 5. Use in Your Application

Redirect users to the USOS login:

```typescript
// React example
function LoginButton() {
  const handleLogin = () => {
    window.location.href = "/api/auth/usos/login";
  };

  return <button onClick={handleLogin}>Login with USOS</button>;
}
```

## Configuration Options

### `UsosAuthPluginOptions`

| Option           | Type                                                | Required | Default                     | Description                                                            |
| ---------------- | --------------------------------------------------- | -------- | --------------------------- | ---------------------------------------------------------------------- |
| `usosBaseUrl`    | `string`                                            | Yes      | -                           | Base URL of your USOS instance                                         |
| `consumerKey`    | `string`                                            | Yes      | -                           | OAuth consumer key from USOS                                           |
| `consumerSecret` | `string`                                            | Yes      | -                           | OAuth consumer secret from USOS                                        |
| `emailDomain`    | `string`                                            | Yes      | -                           | Email domain for users without USOS email (e.g., `student.pwr.edu.pl`) |
| `scopes`         | `string`                                            | No       | `"studies\|offline_access"` | OAuth scopes to request                                                |
| `onSuccess`      | `(user: UsosAuthUser) => Promise<string> \| string` | No       | `"/"`                       | Redirect path after successful auth                                    |

## Available Scopes

Common USOS scopes include:

- `studies` - Access to student data (courses, grades, etc.)
- `offline_access` - Long-lived access tokens
- `email` - Access to user's email
- `personal` - Access to personal information
- `photo` - Access to user's photo

Combine multiple scopes with `|`: `"studies|offline_access|email"`

Check your USOS instance documentation for available scopes.

## User Data

The plugin automatically retrieves and stores:

- First name and last name (combined as `name`)
- Email (if available from USOS, otherwise generated as `{student_number}@{emailDomain}`)
- Student number (`studentNumber` field)
- USOS user ID (`usosId` field)
- Profile photo 50x50 (if available)

When a user doesn't have an email in USOS (common for students), the plugin generates one using their student number and the configured `emailDomain`. For example, if `emailDomain` is `student.pwr.edu.pl` and student number is `123456`, the email will be `123456@student.pwr.edu.pl`.

## API Endpoints

The plugin creates these endpoints:

- `GET /api/auth/usos/login` - Initiates OAuth flow
- `GET /api/auth/usos/callback` - Handles OAuth callback

## TypeScript

Full TypeScript support is included. Import types as needed:

```typescript
import type {
  UsosAuthPluginOptions,
  UsosAuthUser,
  UsosUserProfile,
} from 'better-auth-usos';
```

## Example Projects

### Full Stack Example

```typescript
// auth.ts (server)
import { betterAuth } from 'better-auth';
import { usosAuth } from 'better-auth-usos';

export const auth = betterAuth({
  database: {
    provider: 'pg',
    url: process.env.DATABASE_URL!,
  },
  user: {
    additionalFields: {
      studentNumber: {
        type: 'number',
        required: false,
      },
      usosId: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    usosAuth({
      usosBaseUrl: process.env.USOS_BASE_URL!,
      consumerKey: process.env.USOS_CONSUMER_KEY!,
      consumerSecret: process.env.USOS_CONSUMER_SECRET!,
      emailDomain: process.env.USOS_EMAIL_DOMAIN!,
      onSuccess: async (user) => '/dashboard',
    }),
  ],
});
```

## Troubleshooting

### "Failed to get request token"

- Verify your consumer key and secret are correct
- Check that your callback URL is registered in USOS
- Ensure the USOS base URL is correct

### "Missing OAuth state"

- Check that cookies are enabled
- Verify your site is using HTTPS in production
- Check cookie settings (sameSite, secure)

### "Invalid OAuth token"

- This usually indicates a CSRF attack or cookie issues
- Ensure cookies are properly configured
- Check that the user completes the OAuth flow within 10 minutes

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/qamarq/better-auth-usos/issues)
- Better Auth Docs: [https://www.better-auth.com](https://www.better-auth.com)

## Credits

Created for the Polish university community using USOS systems.
