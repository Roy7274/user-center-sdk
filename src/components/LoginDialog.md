# LoginDialog Component

A tabbed authentication dialog component that provides three login methods:
- **Web3Auth**: Social and wallet-based authentication
- **User Center**: Redirect to User Center login page
- **Guest**: Quick guest login without account creation

## Features

- Tabbed interface with smooth transitions
- Integration with NextAuth for session management
- Web3Auth integration for social/wallet login
- User Center redirect flow
- Guest login with optional custom ID
- Loading states and error handling
- Success/error callbacks
- Responsive design with Tailwind CSS

## Usage

```tsx
import { LoginDialog } from '@ai-agent/user-center-sdk/components'
import { useState } from 'react'

function MyApp() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsLoginOpen(true)}>
        Sign In
      </button>

      <LoginDialog
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onSuccess={(session) => {
          console.log('Login successful:', session)
        }}
        onError={(error) => {
          console.error('Login failed:', error)
        }}
        defaultTab="web3auth"
      />
    </>
  )
}
```

## Props

### `open: boolean` (required)
Controls whether the dialog is visible.

### `onOpenChange: (open: boolean) => void` (required)
Callback when the dialog should be opened or closed.

### `onSuccess?: (session: Session) => void` (optional)
Callback when login succeeds. Receives the NextAuth session object.

### `onError?: (error: Error) => void` (optional)
Callback when login fails. Receives the error object.

### `defaultTab?: 'web3auth' | 'usercenter' | 'guest'` (optional)
The tab to show by default. Defaults to `'web3auth'`.

## Configuration

The LoginDialog respects SDK configuration:

```typescript
import { initSDKConfig } from '@ai-agent/user-center-sdk/config'

initSDKConfig({
  // Enable/disable Web3Auth tab
  enableWeb3Auth: true,
  
  // Enable/disable Guest login tab
  enableGuestLogin: true,
  
  // User Center URL for redirect
  userCenterUrl: 'https://user-center.example.com',
  
  // App ID for authentication
  appId: 'your-app-id',
  
  // Web3Auth configuration
  web3AuthClientId: 'your-web3auth-client-id',
  web3AuthNetwork: 'testnet',
})
```

## Login Flows

### Web3Auth Login
1. User clicks "Connect with Web3Auth"
2. Web3Auth modal opens
3. User authenticates with social provider or wallet
4. Component calls NextAuth `signIn('web3auth', credentials)`
5. Session is created and `onSuccess` is called

### User Center Login
1. User clicks "Go to User Center Login"
2. Browser redirects to User Center login page
3. User authenticates on User Center
4. User Center redirects back with token
5. App calls NextAuth `signIn('credentials', {token})`
6. Session is created

### Guest Login
1. User optionally enters a guest ID
2. User clicks "Continue as Guest"
3. Component generates guest ID if not provided
4. Component calls NextAuth `signIn('guest', {guestId})`
5. Session is created and `onSuccess` is called

## Styling

The component uses Tailwind CSS classes. You can customize the appearance by:

1. Overriding Tailwind classes in your global CSS
2. Using Tailwind's configuration to adjust colors and spacing
3. Wrapping the component and applying custom styles

## Error Handling

The component displays error messages inline and calls the `onError` callback:

```tsx
<LoginDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onError={(error) => {
    // Log to error tracking service
    console.error('Login error:', error)
    
    // Show toast notification
    toast.error(error.message)
  }}
/>
```

## Accessibility

- Keyboard navigation support
- ARIA labels for close button
- Focus management
- Screen reader friendly

## Requirements

- Next.js 14+
- NextAuth 4.24+
- React 18+
- Tailwind CSS (for styling)
- Web3Auth SDK (if using Web3Auth login)

## Related Components

- `Web3AuthProvider` - Provides Web3Auth context
- `AuthGuard` - Protects routes requiring authentication
- `PointsDisplay` - Shows user points after login
