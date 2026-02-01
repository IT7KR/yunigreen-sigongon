# Camera Feature Showcase

## Visual Design Language

### Industrial Construction Aesthetic

This implementation breaks away from generic mobile UI patterns to create a **distinctive, purpose-built interface** for construction professionals.

**Design Principles:**
1. **Bold & Geometric** - Strong shapes, clear hierarchy
2. **High Contrast** - Optimized for outdoor visibility
3. **Tactile** - Large touch targets for gloved hands
4. **Coded** - Color categorization system
5. **Professional** - Technical, authoritative typography

## Component Gallery

### 1. Camera Capture

```
┌─────────────────────────────────────────┐
│ [×]                            [Flash]  │  ← Controls (black/40 blur)
│                                          │
│                                          │
│          ╔═══════════╦═══════════╗      │
│          ║           ║           ║      │  ← Grid overlay (30%)
│          ║           ║           ║      │     Rule of thirds
│          ╠═══════════╬═══════════╣      │
│          ║           ║           ║      │
│          ║           ║           ║      │
│          ╚═══════════╩═══════════╝      │
│                                          │
│                                          │
│          ○                     ⟲        │  ← 80px capture button
│      (Camera)               (Flip)      │     Flip camera button
└─────────────────────────────────────────┘
```

**Key Features:**
- Full-screen viewfinder
- Translucent controls with backdrop blur
- Large 80px white capture button (ring + fill)
- Animated press feedback (scale down)
- Grid overlay for composition
- Flash toggle (amber when active)
- Camera flip (front/back)

### 2. Photo Type Selector

```
┌──────────────────────────────────────────────┐
│ PHOTO TYPE SELECTION   ▸ 시공 전 현황       │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │ 📷     │  │ 🔍     │  │ 📍 ●   │        │  ← Selection dot
│  │        │  │        │  │        │        │
│  │ 공사전 │  │  상세  │  │  현황  │        │
│  └────────┘  └────────┘  └────────┘        │
│    Blue       Amber      Green (Selected)   │
│                                              │
└──────────────────────────────────────────────┘
```

**Visual States:**
- **Unselected**: White bg, gray border, gray icon
- **Selected**: Green bg, green border, green icon, shadow + dot
- **Hover**: Gray background
- **Pattern**: Diagonal stripes on selected (5% opacity)

**Color Coding:**
- 공사 전 (Before): `#0e325a` - Primary Blue
- 상세 (Detail): `#f59e0b` - Amber
- 현황 (Current): `#48ae2f` - Point Green

### 3. Photo Thumbnails

```
┌──────────────────────────────────────────────┐
│ CAPTURED PHOTOS                          3장  │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │[×]   │  │[×]   │  │[×]   │              │  ← Delete on hover
│  │공사전 │  │ 상세 │  │ 현황 │              │  ← Type badge
│  │      │  │      │  │      │              │
│  │      │  │      │  │      │              │
│  │14:23 │  │14:25 │  │14:27 │              │  ← Timestamp
│  └──────┘  └──────┘  └──────┘              │
│   128px     128px     128px                 │
│                                 ▶           │  ← Scroll
└──────────────────────────────────────────────┘
```

**Interactions:**
- Horizontal scroll for many photos
- Hover shows delete button + darker overlay
- Badge shows type (icon + label)
- Timestamp at bottom (white text on black/60)
- Green border on hover

### 4. Upload Progress

```
┌──────────────────────────────────────────────┐
│ 🔼 UPLOAD STATUS              ● Uploading    │
├──────────────────────────────────────────────┤
│                                              │
│  ⟳  photo-1234.jpg                    67%   │
│     ████████████████░░░░░░░░               │  ← Progress bar
│                                              │
│  ✓  photo-1233.jpg                          │
│     업로드 완료                              │
│                                              │
│  ✗  photo-1232.jpg                      🔄  │  ← Retry
│     네트워크 오류                            │
│                                              │
└──────────────────────────────────────────────┘
```

**Status Icons:**
- **Uploading**: Spinning circle
- **Success**: Green checkmark
- **Failed**: Red X + retry button

### 5. Offline Banner

**Offline State:**
```
┌──────────────────────────────────────────────┐
│ 📶 오프라인 모드                         [3] │
│ 인터넷 연결이 끊어졌습니다. 연결 복구 시    │
│ 자동으로 동기화됩니다.                      │
└──────────────────────────────────────────────┘
  Amber background (#fef3c7)
```

**Syncing State:**
```
┌──────────────────────────────────────────────┐
│ ⟳ 동기화 중                                 │
│ 오프라인 작업을 서버와 동기화하고 있습니다. │
└──────────────────────────────────────────────┘
  Green background (#d1fae5)
  Animated spinner
```

**Pending State:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ 대기 중인 작업                [동기화]   │
│ 3개의 작업이 동기화 대기 중입니다           │
└──────────────────────────────────────────────┘
  Blue background (#dbeafe)
  Action button
```

## User Flows

### Happy Path: Photo Capture

1. **Select Type** → User chooses "현황" (Current)
2. **Open Camera** → Full-screen camera appears
3. **Compose** → Grid helps with framing
4. **Capture** → Large button, satisfying press animation
5. **Review** → Thumbnail appears in gallery
6. **Upload** → Progress shown, auto-uploads
7. **Complete** → Success checkmark

### Offline Flow

1. **Go Offline** → Network disconnects
2. **Banner Appears** → Amber banner shows "오프라인 모드"
3. **Work Continues** → User captures photos normally
4. **Queue Fills** → Photos stored in IndexedDB
5. **Come Online** → Green banner "동기화 중"
6. **Auto Sync** → Photos upload automatically
7. **Success** → Green banner "동기화 완료"

### Error Recovery

1. **Upload Fails** → Red X appears
2. **Error Message** → "네트워크 오류"
3. **Retry Button** → User clicks 🔄
4. **Re-upload** → Upload retries
5. **Success** → Green checkmark

## Responsive Design

### Touch Targets

All interactive elements meet accessibility standards:

- **Capture button**: 80px (2x minimum)
- **Type selectors**: 60px height
- **Delete buttons**: 48px
- **Nav buttons**: 48-56px
- **Action buttons**: 48-56px

### Typography Scale

```
12px - Captions, timestamps
14px - Body text, descriptions
16px - Important info, inputs
18px - Section headers
20px - Page titles
24px - Large headings
```

### Spacing System

```
4px  - Tiny gaps
8px  - Small gaps
12px - Default padding
16px - Card padding
24px - Section spacing
32px - Large spacing
```

## Color System

### Brand Colors

```css
/* Primary - 공사 전 */
--brand-primary-500: #0e325a
--brand-primary-100: #d1dce9

/* Point - 현황 */
--brand-point-500: #48ae2f
--brand-point-100: #d9f1d3

/* Amber - 상세 */
--amber-500: #f59e0b
--amber-100: #fef3c7
```

### Status Colors

```css
/* Success */
--green-500: #10b981
--green-100: #d1fae5

/* Error */
--red-500: #ef4444
--red-100: #fee2e2

/* Warning */
--amber-500: #f59e0b
--amber-100: #fef3c7
```

### Neutral Scale

```css
--slate-50:  #f8fafc  /* Background */
--slate-100: #f1f5f9  /* Card bg */
--slate-200: #e2e8f0  /* Border */
--slate-400: #94a3b8  /* Muted text */
--slate-700: #334155  /* Body text */
--slate-900: #0f172a  /* Headings */
```

## Animation System

### Timing Functions

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Durations

```css
--duration-fast: 150ms    /* Hover states */
--duration-normal: 200ms  /* Most transitions */
--duration-slow: 300ms    /* Enter/exit */
```

### Key Animations

```css
/* Button press */
.button:active {
  transform: scale(0.95);
  transition: transform 100ms ease-out;
}

/* Selection pulse */
.selected::after {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Upload spinner */
.spinner {
  animation: spin 1s linear infinite;
}
```

## Accessibility

### Keyboard Navigation

- All controls are keyboard accessible
- Logical tab order
- Visible focus states
- Esc closes camera

### Screen Readers

- ARIA labels on all icons
- Status announcements
- Error messages
- Progress updates

### Visual Accessibility

- Minimum 4.5:1 contrast ratio
- Color is not the only indicator
- Clear focus indicators
- Large text options supported

## Technical Details

### Performance

- Canvas reuse (no recreation)
- Blob URLs (not data URIs)
- Optimized re-renders
- Debounced sync
- Efficient IndexedDB queries

### Browser APIs

```javascript
// Camera
navigator.mediaDevices.getUserMedia({
  video: { facingMode, width: 1920, height: 1080 }
})

// Flash
videoTrack.applyConstraints({
  advanced: [{ torch: true }]
})

// Offline
window.addEventListener('online', handleOnline)
navigator.onLine

// Storage
indexedDB.open('sigongon_offline', 1)
```

## Future Enhancements

1. **Camera**: Zoom, exposure, filters
2. **Offline**: Background Sync API, compression
3. **UX**: Photo annotations, batch capture
4. **Accessibility**: Voice commands, haptics
5. **Performance**: Image optimization, lazy loading

---

**Result:** A distinctive, production-ready camera system that feels purpose-built for construction professionals working in challenging field environments.
