# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

This is a College Notice Board web application built with vanilla HTML, CSS, and JavaScript. It's a full-featured client-side application with cloud synchronization capabilities that allows users to create, view, filter, and manage notices with different categories, priorities, and deadlines. The application supports both online and offline modes with real-time data synchronization across multiple users.

## Architecture

- **Frontend-only application**: No backend server required - runs entirely in the browser
- **Cloud synchronization**: Uses JSONBin.io for real-time data sync across users (5-second polling)
- **Offline-first design**: Graceful fallback to localStorage when cloud service is unavailable
- **Admin authentication**: Session-based admin system with hardcoded access control
- **Mobile-responsive**: Modern responsive design with bottom search/filter bar on mobile
- **Single-page application**: All functionality contained in one HTML page with modal interactions
- **Class-based JavaScript**: Main functionality encapsulated in `NoticeBoard` class (`script.js:1`)

## File Structure

- `index.html` - Main HTML structure with modals for adding notices, admin login, and export
- `script.js` - Core application logic in NoticeBoard class with cloud sync capabilities
- `styles.css` - Complete styling with CSS variables, dark mode, and responsive design
- `CLAUDE.md` - This documentation file for Claude Code guidance
- `JSONBIN_SETUP.md` - Setup instructions for JSONBin.io cloud synchronization
- `package-lock.json` - Minimal package file (no dependencies - static app)

## Development Commands

Since this is a vanilla JavaScript application with no build process:

**Local Development:**
- **Run locally**: Open `index.html` in a web browser or use a local server
- **Local server options**: 
  - `python -m http.server 8000` (Python)
  - `npx serve .` (Node.js)
  - `php -S localhost:8000` (PHP)
- **No build/compile step required**
- **No testing framework currently configured**
- **No linting configured** (pure vanilla JS/CSS/HTML)

**JSONBin Configuration:**
- Configure cloud sync by updating `window.JSONBIN_CONFIG` in `index.html:239-247`
- Replace placeholder API key and bin ID with actual JSONBin.io credentials
- See `JSONBIN_SETUP.md` for detailed setup instructions

## Key Features

### Core Notice Management
- **Notice CRUD**: Create, edit, delete, and view notices with rich text editing using Quill.js
- **Rich Text Editor**: Quill.js integration with formatting toolbar (`script.js:296`)
- **Categories**: Academic, Events, Exams, Urgent with visual color coding and icons
- **Priority System**: Normal, High, Critical with visual indicators and animations
- **Deadline Tracking**: Optional deadlines with visual overdue/approaching indicators
- **Tag System**: Custom keyword tags for organization and filtering

### Advanced Search & Organization
- **Real-time Search**: Search across title, content, author, and tags (`script.js:338`)
- **Multi-filter System**: Category filters, tag filters, and text search combined
- **Sorting Options**: Sort by date, priority, deadline, or title (`script.js:350`)
- **View Modes**: Toggle between grid and list layouts (`script.js:271`)
- **Active Tag Filtering**: Click tags to filter notices, visual active tag indicators

### Admin & Authentication
- **Admin Authentication**: Keyword-based login system (`script.js:13`)
- **Admin Code**: `teju_smp` (hardcoded in `script.js:13`)
- **Session Management**: Uses sessionStorage for login persistence (`script.js:12`)
- **Permission Control**: Edit/delete restricted to authenticated admin users
- **UI State Management**: Dynamic showing/hiding of admin controls (`script.js:985`)

### Cloud Synchronization & Data Management
- **JSONBin Integration**: Real-time cloud sync with 5-second polling (`script.js:673`)
- **Offline Fallback**: Automatic fallback to localStorage when cloud unavailable
- **Conflict Resolution**: Last-write-wins with automatic local backup
- **Sync Status Indicators**: Visual sync status with error handling (`script.js:1001`)
- **Auto-backup**: Data saved both online and locally for reliability

### Modern UI/UX Features
- **Dark Mode**: Complete dark theme with CSS variables and persistence (`script.js:280`)
- **Responsive Design**: Mobile-first approach with bottom search bar on mobile
- **Glassmorphism**: Modern design with backdrop-filter effects and transparency
- **Animations**: Smooth transitions, hover effects, and priority pulse animations
- **Export/Import**: JSON, CSV, and PDF export with JSON import capability (`script.js:827`)
- **Notification System**: Toast notifications for user feedback (`script.js:500`)
- **Keyboard Shortcuts**: Ctrl/Cmd+N for new notice, Escape to close modals (`script.js:1089`)

## Data Structure

Notices are stored as objects with these properties:
- `id`: string - Unique identifier (timestamp-based)
- `title`: string - Notice title  
- `content`: string - Rich HTML content from Quill editor
- `category`: 'academic'|'events'|'exams'|'urgent' - Notice category
- `priority`: 'normal'|'high'|'critical' - Priority level
- `date`: string - Notice publication date (YYYY-MM-DD format)
- `deadline`: string|null - Optional deadline date
- `author`: string - Department/faculty name (defaults to "Administration")
- `tags`: string[] - Array of custom keyword tags
- `timestamp`: string - Creation timestamp (ISO format)
- `lastModified`: string - Last edit timestamp (ISO format)

### Storage Keys

**localStorage:**
- `college-notices`: Main notices array (backup/offline storage)
- `darkMode`: Dark theme preference (boolean string)

**sessionStorage:**
- `isAdmin`: Admin authentication state (boolean string)

**Cloud Storage (JSONBin):**
- Configured via `window.JSONBIN_CONFIG` object in `index.html`
- Structure: `{ notices: Notice[], lastUpdated: string }`

## UI Components & Architecture

### Core Classes
- **NoticeBoard class**: Main controller with state management (`script.js:1`)
  - Handles all notice operations, filtering, searching, sorting
  - Manages admin authentication and UI state
  - Controls cloud sync and offline fallback
  - Implements real-time polling for updates

### Modal System
- **Add/Edit Notice Modal**: Rich form with Quill editor, category/priority selection
- **Admin Login Modal**: Simple password-based authentication
- **Export Modal**: Data export/import functionality with multiple formats

### State Management
- **Filter State**: Current category filter, selected tags, search query
- **View State**: Grid/list mode, sort order, dark mode preference  
- **Admin State**: Authentication status, UI visibility controls
- **Sync State**: Online/offline mode, last sync time, error states

### Mobile-Responsive Features
- **Bottom Search Bar**: Fixed search/filter controls on mobile (`styles.css:1241`)
- **Collapsible Filters**: Horizontal scrolling filter buttons on mobile
- **Touch-friendly**: Appropriate touch targets and spacing
- **Responsive Grid**: Auto-adjusting grid columns based on screen size

## Admin Authentication System

- **Access Control**: All notice creation, editing, and deletion requires admin login
- **Admin Code**: Hardcoded as `teju_smp` in `script.js:13`
- **Session Persistence**: Login state maintained via sessionStorage
- **UI Adaptation**: Admin controls shown/hidden based on authentication state
- **Security Note**: Client-side only - suitable for controlled environments, not production security

## JSONBin Cloud Synchronization

### Configuration
- Set up via `window.JSONBIN_CONFIG` in `index.html:242-246`
- Requires API key and bin ID from JSONBin.io account
- See JSONBIN_SETUP.md for detailed setup instructions

### Sync Behavior
- **Polling Frequency**: Checks for updates every 5 seconds (`script.js:673`)
- **Write Strategy**: Immediate save to cloud on any change
- **Read Strategy**: Load from cloud on startup, check for updates via polling
- **Conflict Resolution**: Last-write-wins with local backup retention
- **Error Handling**: Graceful fallback to offline mode with user notifications

### Status Indicators
- Visual sync status indicators (syncing, synced, offline, error)
- Color-coded status with auto-hide for success states
- Error notifications for sync failures with offline fallback

## Styling Architecture

### CSS Variables System
- Complete design system with CSS custom properties (`styles.css:2-33`)
- Dark mode support via CSS variable overrides (`styles.css:36-44`)
- Consistent spacing, colors, shadows, and border radius values

### Responsive Breakpoints
- **Desktop**: Default styles, grid layout
- **Tablet** (1024px): Adjusted grid columns
- **Mobile** (768px): Bottom search bar, single column, touch-friendly
- **Small Mobile** (480px): Further spacing adjustments

### Design Features
- **Glassmorphism**: Backdrop-filter effects with transparency
- **Smooth Animations**: CSS transitions with cubic-bezier timing
- **Priority Indicators**: Visual emphasis for high/critical notices
- **Category Color Coding**: Consistent color scheme across categories

## External Dependencies (CDN)

- **Quill.js** (1.3.6): Rich text editor with Snow theme
- **Font Awesome** (6.0.0): Icon library for consistent iconography  
- **Inter Font**: Modern typography from Google Fonts
- **No npm dependencies**: Purely client-side with CDN resources

## Browser Compatibility

Requires modern browser support for:
- CSS Grid and Flexbox layouts
- CSS Custom Properties (variables) for theming
- Backdrop-filter for glassmorphism effects
- ES6 classes and modern JavaScript features
- LocalStorage and SessionStorage APIs
- File API for import/export functionality
- Fetch API for cloud synchronization

## Performance Considerations

- **Efficient Rendering**: Only re-renders notices when data changes
- **Search Optimization**: Real-time search with debounced input
- **Memory Management**: Proper cleanup of event listeners and timers
- **Offline Performance**: Instant operations when using localStorage fallback
- **Network Efficiency**: Minimal API calls with smart polling and caching