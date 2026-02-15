# Kriya - UX Decisions

**Last Updated:** 2026-02-14

## Design Principles

1. **Mobile-First**: Designed for one-handed use
2. **30-Second Rule**: Core actions complete in 30 seconds
3. **Context-Aware**: UI adapts to user's current activity
4. **Trust Visible**: Reputation always visible, never hidden

---

## Color Palette (Light Mode)

| Purpose | Color | Hex |
|---------|-------|-----|
| Primary | Vibrant Blue | #2563EB |
| Secondary | Warm Orange | #F97316 |
| Success | Green | #16A34A |
| Warning | Amber | #F59E0B |
| Error | Red | #DC2626 |
| Background | Off-White | #FAFAFA |
| Surface | White | #FFFFFF |
| Text Primary | Near Black | #171717 |
| Text Secondary | Gray | #525252 |
| Border | Light Gray | #E5E5E5 |

---

## Navigation Structure

### Bottom Tabs (4 items)
1. **Home** - Dual feed (gigs to do / my posted gigs)
2. **Search** - Find gigs with filters
3. **Post** - Create new gig (FAB-style prominent)
4. **Profile** - Settings, wallet, history

### No Tab for "My Gigs"
- Integrated into Home with horizontal swipe
- Reduces cognitive load

---

## Home Screen: Dual Feed

### Implementation
- Horizontal swipe between two feeds
- Left: "Available Gigs" (worker mode)
- Right: "My Posted Gigs" (poster mode)
- Pill indicator shows current view

### Card Design
- Title (bold, 18sp)
- Pay amount (prominent, colored)
- Location + distance
- Poster/Worker reputation badge
- Time info (when, duration)
- Quick action button

---

## Gig Posting Flow (Quest-Style)

### Steps (30-second target)
1. **Category** - Tap to select (grid of icons)
2. **Title + Pay** - Single screen, minimal fields
3. **Details** - Description, location, time
4. **Review + Post** - Confirm and submit

### Design Choices
- Progress bar at top
- Large touch targets
- Smart defaults (location = current, time = today)
- "Draft" auto-save

---

## Gig Application Flow

### Steps
1. View gig details
2. Tap "Apply"
3. Optional: Add message
4. Confirm

### Post-Application
- Show confirmation
- Add to "Applied" section
- Push notification when response received

---

## Rating Flow

### Trigger
- Appears after gig marked complete
- Reminder notification after 24 hours
- Expires after 7 days

### UI
- Star rating (1-5, large tappable stars)
- Optional comment
- "Both rated" reveal mechanism

---

## Wallet Screen

### Sections
1. **Momentum Balance** (prominent, non-monetary feel)
   - Current balance
   - "How to earn more" link
   - Recent transactions

2. **Earnings Balance** (INR)
   - Available balance
   - Pending payments
   - Withdraw button

### Design Note
- Momentum styled as "energy/points"
- Earnings styled as "money"
- Visual distinction prevents confusion

---

## Empty States

| Screen | Empty Message |
|--------|---------------|
| Available Gigs | "No gigs nearby. Try expanding your search area." |
| My Posted Gigs | "You haven't posted any gigs yet. Ready to get help?" |
| Applications | "No applications yet. Boost your gig to reach more people." |
| Transaction History | "Your momentum journey starts with your first gig." |

---

## Loading States

- Skeleton screens for lists
- Pull-to-refresh on all feeds
- Optimistic UI for quick actions

---

## Error Handling

- Toast for minor errors
- Modal for critical errors
- Retry buttons always visible
- Offline mode indication

---

## Accessibility

- Minimum touch target: 44x44dp
- Color contrast ratio: 4.5:1 minimum
- Screen reader labels on all interactive elements
- Reduced motion option

---

## Screen Layout Schema (Sticky Footer Pattern)

**Rule:** Every screen with a primary action button (Save, Post, Continue, Verify, Apply) must use the sticky footer pattern. The button is always visible; content above scrolls freely.

### Mandatory Structure

```tsx
// Screens WITH text inputs:
<KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: Colors.background }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
  <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
    {/* all content here */}
  </ScrollView>
  <StickyFooter>
    <Pressable ...>...</Pressable>
  </StickyFooter>
</KeyboardAvoidingView>

// Screens WITHOUT text inputs (e.g., category grid, gender selection):
<View style={{ flex: 1, backgroundColor: Colors.background }}>
  <ScrollView style={{ flex: 1 }}>
    {/* all content here */}
  </ScrollView>
  <StickyFooter>
    <Pressable ...>...</Pressable>
  </StickyFooter>
</View>
```

### StickyFooter Component

Location: `frontend/components/ui/StickyFooter.tsx`

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function StickyFooter({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {children}
    </View>
  );
}
// styles: backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, paddingHorizontal: 16
```

### Custom Headers (non-tab screens)

Screens with a custom back-arrow header must place the header **outside** the ScrollView so it stays fixed:

```tsx
<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
  <Pressable onPress={() => router.back()} style={styles.backButton}>
    <Feather name="arrow-left" size={22} color={Colors.text.primary} />
  </Pressable>
  <Text style={styles.headerTitle}>Screen Title</Text>
  <View style={{ width: 34 }} /> {/* balance the back button */}
</View>
<ScrollView style={{ flex: 1 }}>
  ...
</ScrollView>
```

### Rules

1. **Never** use `position: absolute` for footer buttons — use `StickyFooter`
2. **Never** add a `<View style={{ height: 80 }} />` spacer to fake footer clearance
3. **Always** wrap screens with text inputs in `KeyboardAvoidingView`
4. **Always** use `useSafeAreaInsets` — never hardcode top/bottom inset values
5. `ScrollView` must have `style={{ flex: 1 }}` (not `contentContainerStyle`) to fill available space
6. `contentContainerStyle` on ScrollView is for **padding/gap only** — never `flex: 1`

### Canonical Examples

| Screen | File |
|--------|------|
| Onboarding (4 steps) | `frontend/app/onboarding/profile.tsx` |
| Post Gig (4 steps) | `frontend/app/(main)/post/index.tsx` |
| Edit Profile | `frontend/app/(main)/edit-profile.tsx` |
| Verify Identity | `frontend/app/(main)/verify-identity.tsx` |
| Gig Detail | `frontend/app/(main)/gig/[id].tsx` |

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial UX decisions documented |
| 2026-02-15 | Added Screen Layout Schema (sticky footer pattern) |
