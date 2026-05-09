# Mobile App — Navigation & Routing

## File-Based Routing (expo-router)

```
app/
├── index.tsx                    # Auth gate — redirects based on session state
├── _layout.tsx                  # Root layout (fonts, Supabase listener)
├── (auth)/
│   ├── _layout.tsx              # Auth stack
│   ├── login.tsx                # Phone input
│   ├── otp.tsx                  # OTP verify
│   ├── role-select.tsx          # Runner/Host picker (auto-skipped currently)
│   └── onboarding/profile.tsx   # 4-step: Name → DOB → Gender → City+State
├── (main)/
│   ├── _layout.tsx              # Main stack
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigator
│   │   ├── home.tsx
│   │   ├── explore.tsx
│   │   ├── post.tsx             # Host only (hidden for runners)
│   │   ├── space.tsx
│   │   ├── arena.tsx
│   │   ├── chat.tsx             # href: null (hidden)
│   │   ├── search.tsx           # href: null (hidden)
│   │   ├── profile.tsx          # href: null (accessed via avatar button)
│   │   └── personality.tsx      # href: null (legacy, hidden)
│   ├── gig/[id].tsx
│   ├── gig/applicants/[gigId].tsx
│   ├── event/[id].tsx
│   ├── event/create.tsx
│   ├── post.tsx                 # Post a gig
│   ├── edit-profile.tsx
│   └── chat/[id].tsx
```

## Auth Gate (index.tsx)

```
session? → no  → /login
         → yes → onboarded? → no  → /onboarding/profile
                            → yes → activeRole? → null → /(auth)/role-select
                                                → set  → /(main)/(tabs)/home
```

## Role-Select Auto-Skip

`SHOW_HOST_ROLE = false` in `role-select.tsx` → `useEffect` fires immediately:
```tsx
useEffect(() => {
  if (!SHOW_HOST_ROLE) {
    setActiveRole("runner");
    router.replace("/(main)/(tabs)/home");
  }
}, []);
```

## Tab Navigators

### RunnerTabsNavigator (current — always rendered)
Tabs: **Home | Explore | My Space | Arena**

```tsx
<Tabs.Screen name="home"    options={HOME_OPT} />
<Tabs.Screen name="explore" options={EXPLORE_OPT} />
<Tabs.Screen name="post"    options={HIDDEN} />   // hidden
<Tabs.Screen name="space"   options={SPACE_OPT} />
<Tabs.Screen name="arena"   options={ARENA_OPT} />
<Tabs.Screen name="chat"    options={HIDDEN} />   // hidden
```

### HostTabsNavigator (unreachable while SHOW_HOST_ROLE=false)
Tabs: **Home | Explore | + (FAB) | My Space | Arena**  
Has `FloatingFab` + `FabOverlay` for "Create Event" / "Post a Gig".

## SHOW_HOST_ROLE Flag Locations

Set all five to `true` to re-enable Host mode:

| File | Line |
|------|------|
| `frontend/pocket/app/(auth)/role-select.tsx` | top of file |
| `frontend/pocket/app/(main)/(tabs)/_layout.tsx` | top of file |
| `frontend/pocket/app/(main)/(tabs)/home.tsx` | top of file |
| `frontend/pocket/app/(main)/(tabs)/space.tsx` | top of file |
| `frontend/pocket/app/(main)/(tabs)/explore.tsx` | `isHost = false` hardcoded comment |

## Navigation Patterns

```typescript
// Push onto stack
router.push("/(main)/gig/123");

// Replace (no back)
router.replace("/(main)/(tabs)/home");

// Sign out — ALWAYS use this, never router.replace("/(auth)/login")
router.replace("/");
```

**Why `router.replace("/")`:** From nested tab navigators, replacing to `/(auth)/login` doesn't escape the navigator. Only `"/"` reliably triggers `index.tsx` which gates to login.

## Sub-Page Header Pattern

All sub-pages (Applicants, Gig detail, etc.) use `Stack.Screen headerShown: false` + custom dark gradient header:

```tsx
<LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
  <Pressable onPress={() => router.back()}>
    <Feather name="chevron-left" size={24} color={T.text} />
  </Pressable>
  <Text style={styles.title}>Page Title</Text>
  <View style={{ width: 24 }} /> {/* spacer */}
</LinearGradient>
```

## Tab Page Header Pattern (with internal tabs)

```tsx
<LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
  <View style={styles.tabBar}>
    <Pressable style={[styles.tabBtn, activeTab === "a" && styles.tabBtnActive]} onPress={() => setActiveTab("a")}>
      <Text style={[styles.tabBtnText, activeTab === "a" && styles.tabBtnTextActive]}>Tab A</Text>
    </Pressable>
  </View>
</LinearGradient>
```

Styles:
- `header`: `{ paddingHorizontal: 20, paddingBottom: 14 }`
- `tabBar`: `{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 12, padding: 3 }`
- `tabBtn`: `{ flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 }`
- `tabBtnActive`: `{ backgroundColor: T.selBg }` (lime)
- `tabBtnText`: `{ fontSize: 14, fontWeight: "600", color: T.textMuted }`
- `tabBtnTextActive`: `{ color: T.selText }` (black)

**Home page exception:** white surface header with Kria wordmark + avatar button (no gradient).
