# Camera Components

Industrial-strength camera and photo management system for construction site documentation.

## Design Philosophy

**Industrial Aesthetic** - Purpose-built for construction professionals working in challenging environments. Bold, high-contrast UI with generous touch targets and clear visual hierarchy.

**Key Characteristics:**
- Strong geometric patterns and grid overlays
- High-contrast color badges for photo categorization
- Tactile button design with clear feedback states
- Professional typography with all-caps labels
- Prominent status indicators and progress tracking

## Components

### CameraCapture

Full-screen camera interface with professional controls.

**Features:**
- Native getUserMedia API integration
- Front/back camera switching
- Flash toggle (when supported)
- Rule-of-thirds grid overlay
- Large tactile capture button
- Mirrored preview for front camera
- High-quality JPEG output (92% quality)

**UX Details:**
- 80px capture button (exceeds 48px minimum)
- Smooth scale animations on button press
- Grid overlay at 30% opacity for composition
- Error state with clear retry options

### PhotoTypeSelector

Three-way categorization system for construction photos.

**Photo Types:**
- **공사 전** (Before) - Pre-construction state
- **상세** (Detail) - Problem detail shots
- **현황** (Current) - Current condition

**Visual Design:**
- Color-coded categories (Primary blue, Amber, Point green)
- Icon + label for clarity
- Animated selection indicator
- Striped background pattern on selection
- Scale-up animation and shadow effects

### PhotoThumbnails

Horizontal scrolling gallery with management controls.

**Features:**
- 128x128px thumbnails with 2:1 aspect
- Type badge overlay
- Timestamp display
- Hover-activated delete button
- Empty state with guidance

**Design Details:**
- Gradient borders on hover
- Badge with icon + label
- Backdrop blur on timestamp
- Delete button appears on hover
- Smooth opacity transitions

### PhotoUploader

Background upload manager with progress tracking.

**Features:**
- EXIF metadata extraction
- Progress bar per photo
- Retry logic for failed uploads
- Status indicators (pending/uploading/success/failed)
- Simulated upload with progress updates

**Visual Feedback:**
- Spinning indicator for active uploads
- Green checkmark for success
- Red X for failures
- Percentage display during upload
- Retry button for failures

### OfflineBanner

Global network status indicator with action controls.

**States:**
1. **Offline** - Amber banner with pending count
2. **Syncing** - Green banner with spinner
3. **Pending** - Blue banner with sync button
4. **Complete** - Green banner with checkmark

**Features:**
- Auto-dismisses when online and synced
- Shows pending operation count
- Manual sync trigger
- Clear status messages
- Color-coded by state

## Usage

```tsx
import {
  CameraCapture,
  PhotoTypeSelector,
  PhotoThumbnails,
  PhotoUploader,
  OfflineBanner,
} from "@/components/camera";

function PhotoPage() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType>("current");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const handleCapture = (blob: Blob, facingMode: "user" | "environment") => {
    const photoId = generateId();
    const url = URL.createObjectURL(blob);

    setPhotos(prev => [...prev, {
      id: photoId,
      url,
      type: selectedType,
      timestamp: new Date(),
    }]);

    setIsCameraOpen(false);
  };

  return (
    <div>
      <OfflineBanner />

      <PhotoTypeSelector
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      <button onClick={() => setIsCameraOpen(true)}>
        Open Camera
      </button>

      <PhotoThumbnails photos={photos} onDelete={deletePhoto} />

      {isCameraOpen && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
```

## Mobile UX Guidelines

All components follow mobile-first design principles:

- **Minimum touch target**: 48px (most buttons are 48-56px)
- **Body text**: 14-16px
- **Important info**: 18px+
- **Button height**: 48px minimum
- **Icon size**: 20-24px in buttons
- **Icons with labels**: Always paired for clarity
- **High contrast**: WCAG AA compliant
- **Safe areas**: Respects iOS/Android safe area insets

## Offline Support

See `/lib/offline` for queue management and sync logic.

## Browser Compatibility

- Chrome/Edge 87+
- Safari 14.1+
- Firefox 90+

Requires:
- `navigator.mediaDevices.getUserMedia`
- `IndexedDB`
- `navigator.onLine`
