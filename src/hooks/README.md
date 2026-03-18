# Hooks

React hooks for the User Center SDK.

## usePoints

React hook for managing points balance with SWR-based caching and revalidation.

### Features

- Automatic data fetching and caching
- Loading and error state management
- Manual refresh capability
- Automatic revalidation on focus/reconnect

### Usage

```typescript
import { usePoints } from '@ai-agent/user-center-sdk/points'

function PointsDisplay() {
  const { balance, isLoading, error, refresh } = usePoints()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!balance) return null

  return (
    <div>
      <p>Available: {balance.available} points</p>
      <p>Frozen: {balance.frozen} points</p>
      <p>Total: {balance.total} points</p>
      <p>Level: {balance.level.level}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  )
}
```

### Return Value

```typescript
interface UsePointsReturn {
  balance: PointsBalance | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}
```

### SWR Configuration

The hook uses SWR with the following default configuration:

- `revalidateOnFocus: true` - Refetch when window regains focus
- `revalidateOnReconnect: true` - Refetch when network reconnects
- `revalidateIfStale: true` - Refetch if data is stale
- `dedupingInterval: 2000` - Dedupe requests within 2 seconds

You can wrap your app with `SWRConfig` to customize these settings globally.

## useCheckIn

React hook for managing daily check-in functionality with idempotency handling.

### Features

- Daily check-in with automatic error handling
- Track check-in state (isCheckedIn)
- Handle idempotency (already checked in today)
- Loading and error state management

### Usage

```typescript
import { useCheckIn } from '@ai-agent/user-center-sdk/points'

function CheckInButton() {
  const { checkIn, isCheckedIn, isLoading, error } = useCheckIn()

  const handleCheckIn = async () => {
    try {
      const result = await checkIn()
      if (result.success) {
        console.log(`Earned ${result.points} points!`)
        console.log(`Consecutive days: ${result.consecutiveDays}`)
      }
    } catch (err) {
      console.error('Check-in failed:', err)
    }
  }

  return (
    <div>
      <button 
        onClick={handleCheckIn} 
        disabled={isCheckedIn || isLoading}
      >
        {isLoading ? 'Checking in...' : isCheckedIn ? 'Checked In' : 'Check In'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

### Return Value

```typescript
interface UseCheckInReturn {
  checkIn: () => Promise<CheckInResult>
  isCheckedIn: boolean
  isLoading: boolean
  error: Error | null
}

interface CheckInResult {
  success: boolean
  points: number
  consecutiveDays: number
  message: string
}
```

### Idempotency Handling

The hook automatically handles the "already checked in" scenario:

- If the API returns an `ALREADY_CHECKED_IN` error, the hook sets `isCheckedIn` to `true` and returns a result object instead of throwing
- If `checkIn()` is called when `isCheckedIn` is already `true`, it returns immediately without calling the API
- This prevents duplicate check-ins and provides a smooth user experience

