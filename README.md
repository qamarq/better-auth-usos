# better-auth-usos

[![npm version](https://badge.fury.io/js/better-auth-usos.svg)](https://www.npmjs.com/package/better-auth-usos)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-Plugin-blue)](https://www.better-auth.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

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

### 3. Database Schema & Custom Fields

The plugin allows you to map USOS profile data to your custom user fields using the `userFields` option:

```typescript
import { betterAuth } from "better-auth";
import { usosAuth } from "better-auth-usos";

export const auth = betterAuth({
  database: {
    // your database config
  },
  user: {
    additionalFields: {
      studentNumber: {
        type: "number",
        required: false,
      },
      usosId: {
        type: "string",
        required: false,
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
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
      scopes: "studies|offline_access",
      userFields: (usosProfile) => ({
        studentNumber: usosProfile.student_number
          ? Number.parseInt(usosProfile.student_number)
          : null,
        usosId: usosProfile.id,
        firstName: usosProfile.first_name,
        lastName: usosProfile.last_name,
      }),
      onSuccess: async (user) => {
        console.log(user.firstName, user.lastName);
        return "/dashboard";
      },
    }),
  ],
});
```

The `userFields` function receives the USOS profile and returns an object with your custom fields. These fields will be:

- Added when creating a new user
- Updated when an existing user logs in
- Available in the `onSuccess` callback with full TypeScript support

After configuration, run Better Auth migrations to create the database schema:

```bash
npx better-auth migrate
```

### 4. Client Setup

Add the client plugin to your Better Auth client:

```typescript
import { createAuthClient } from "better-auth/client";
import { usosAuthClient } from "better-auth-usos/client";

export const authClient = createAuthClient({
  plugins: [usosAuthClient()],
});
```

### 5. Use in Your Application

#### Option 1: Using the client helper (Recommended)

```typescript
import { authClient } from "./auth-client";

// React example
function LoginButton() {
  const handleLogin = async () => {
    await authClient.signIn.usos();
  };

  return <button onClick={handleLogin}>Login with USOS</button>;
}

// With options
function LoginWithOptions() {
  const handleLogin = async () => {
    await authClient.signIn.usos({
      callbackURL: "/dashboard", // Custom redirect after login
      newTab: false, // Open in new tab (optional)
    });
  };

  return <button onClick={handleLogin}>Login with USOS</button>;
}
```

#### Option 2: Direct redirect

```typescript
function LoginButton() {
  const handleLogin = () => {
    window.location.href = "/api/auth/usos/login";
  };

  return <button onClick={handleLogin}>Login with USOS</button>;
}
```

## Configuration Options

### `UsosAuthPluginOptions`

| Option           | Type                                                    | Required | Default                     | Description                                                            |
| ---------------- | ------------------------------------------------------- | -------- | --------------------------- | ---------------------------------------------------------------------- |
| `usosBaseUrl`    | `string`                                                | Yes      | -                           | Base URL of your USOS instance                                         |
| `consumerKey`    | `string`                                                | Yes      | -                           | OAuth consumer key from USOS                                           |
| `consumerSecret` | `string`                                                | Yes      | -                           | OAuth consumer secret from USOS                                        |
| `emailDomain`    | `string`                                                | Yes      | -                           | Email domain for users without USOS email (e.g., `student.pwr.edu.pl`) |
| `scopes`         | `string`                                                | No       | `"studies\|offline_access"` | OAuth scopes to request                                                |
| `userFields`     | `(usosProfile: UsosUserProfile) => T`                   | No       | -                           | Function to map USOS profile to custom user fields                     |
| `onSuccess`      | `(user: UsosAuthUser & T) => Promise<string> \| string` | No       | `"/"`                       | Redirect path after successful auth                                    |

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

### Default Fields

The plugin automatically stores these standard Better Auth fields:

- `email` - If available from USOS, otherwise generated as `{student_number}@{emailDomain}`
- `name` - First name and last name combined
- `image` - Profile photo 50x50 (if available)
- `emailVerified` - Always `true` for USOS users

When a user doesn't have an email in USOS (common for students), the plugin generates one using their student number and the configured `emailDomain`. For example, if `emailDomain` is `student.pwr.edu.pl` and student number is `123456`, the email will be `123456@student.pwr.edu.pl`.

### Custom Fields with `userFields`

Use the `userFields` option to map any USOS profile data to your custom database fields. The function receives the full USOS profile:

```typescript
interface UsosUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  email: string | null;
  photo_urls?: {
    "50x50"?: string;
    "100x100"?: string;
  };
}
```

Example mapping common fields:

```typescript
userFields: (usosProfile) => ({
  studentNumber: usosProfile.student_number
    ? Number.parseInt(usosProfile.student_number)
    : null,
  usosId: usosProfile.id,
  firstName: usosProfile.first_name,
  lastName: usosProfile.last_name,
});
```

These custom fields are automatically created/updated for every user login.

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
} from "better-auth-usos";
```

## Example Projects

### Full Stack Example

```typescript
// auth.ts (server)
import { betterAuth } from "better-auth";
import { usosAuth } from "better-auth-usos";

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: process.env.DATABASE_URL!,
  },
  user: {
    additionalFields: {
      studentNumber: {
        type: "number",
        required: false,
      },
      usosId: {
        type: "string",
        required: false,
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
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
      userFields: (usosProfile) => ({
        studentNumber: usosProfile.student_number
          ? Number.parseInt(usosProfile.student_number)
          : null,
        usosId: usosProfile.id,
        firstName: usosProfile.first_name,
        lastName: usosProfile.last_name,
      }),
      onSuccess: async (user) => {
        console.log(`Welcome ${user.firstName} ${user.lastName}!`);
        return "/dashboard";
      },
    }),
  ],
});

// auth-client.ts (client)
import { createAuthClient } from "better-auth/client";
import { usosAuthClient } from "better-auth-usos/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [usosAuthClient()],
});

// login-page.tsx
import { authClient } from "./auth-client";

function LoginPage() {
  const handleLogin = async () => {
    await authClient.signIn.usos();
  };

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleLogin}>Login with USOS</button>
    </div>
  );
}
```

## Client API

The client plugin provides a convenient `signIn.usos()` method:

```typescript
await authClient.signIn.usos(options);
```

### Options

| Option        | Type      | Default | Description                                |
| ------------- | --------- | ------- | ------------------------------------------ |
| `callbackURL` | `string`  | -       | Custom redirect URL after successful login |
| `newTab`      | `boolean` | `false` | Open login in a new tab                    |

### Examples

```typescript
// Basic usage
await authClient.signIn.usos();

// With custom callback
await authClient.signIn.usos({
  callbackURL: "/dashboard",
});

// Open in new tab
await authClient.signIn.usos({
  newTab: true,
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
