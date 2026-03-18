# PointsDisplay Component

A React component that displays the user's points balance, member level, and provides daily check-in functionality.

## Features

- Displays available and frozen points balance
- Shows member level with expiration date
- Provides daily check-in button
- Handles loading and error states
- Fully customizable with props
- Styled with Tailwind CSS

## Usage

```tsx
import { PointsDisplay } from '@ai-agent/user-center-sdk'

function MyApp() {
  const handleCheckInSuccess = (result) => {
    console.log(`Earned ${result.points} points!`)
    console.log(`Consecutive days: ${result.consecutiveDays}`)
  }

  return (
    <PointsDisplay
      showLevel={true}
      showCheckIn={true}
      onCheckInSuccess={handleCheckInSuccess}
      className="my-4"
    />
  )
}
```

## Props

### `showLevel?: boolean`
- **Default:** `true`
- **Description:** Whether to display the member level section

### `showCheckIn?: boolean`
- **Default:** `true`
- **Description:** Whether to display the check-in button

### `onCheckInSuccess?: (result: CheckInResult) => void`
- **Default:** `undefined`
- **Description:** Callback function called when check-in succeeds

### `className?: string`
- **Default:** `''`
- **Description:** Additional CSS classes to apply to the component

## States

### Loading State
Displays a loading spinner while fetching points data.

### Error State
Shows an error message if points data fails to load.

### Empty State
Displays a message when no points data is available.

### Check-in States
- **Default:** "Daily Check-In" button
- **Loading:** "Checking in..." with spinner
- **Checked In:** "Checked In Today" (disabled)

## Examples

### Minimal Display (Points Only)
```tsx
<PointsDisplay showLevel={false} showCheckIn={false} />
```

### Full Display with Callback
```tsx
<PointsDisplay
  showLevel={true}
  showCheckIn={true}
  onCheckInSuccess={(result) => {
    alert(`You earned ${result.points} points!`)
  }}
/>
```

### Custom Styling
```tsx
<PointsDisplay className="max-w-md mx-auto shadow-lg" />
```

## Integration

The component integrates with:
- `usePoints` hook for points balance data
- `useCheckIn` hook for check-in functionality

Both hooks handle authentication and API communication automatically.

## Styling

The component uses Tailwind CSS classes and follows the SDK's design system:
- White background with shadow
- Blue accent color for buttons and highlights
- Gradient background for member level section
- Responsive padding and spacing

## Error Handling

The component handles errors gracefully:
- Points loading errors are displayed with a red error message
- Check-in errors are shown above the check-in button
- Network errors are logged to console
- All errors are non-blocking and allow the user to retry
