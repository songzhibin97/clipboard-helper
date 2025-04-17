# Electron Clipboard

A lightweight clipboard history manager for macOS that helps users record, view, and quickly reuse clipboard content. It supports application icon display, window pinning, shortcut keys, and more features suitable for daily work and development scenarios.

## Features

- **Clipboard History**:
  - Automatically records text clipboard content (up to 100 entries)
  - Displays source application name and icon (supports common apps like Safari, WeChat, TextEdit, etc.)
  - Preserves original source when copying from this app (doesn't show as Electron)

- **Search & Management**:
  - Keyword search for history records
  - One-click history clearing
  - Quick copy with feedback on click

- **Window Control**:
  - Pin window (📍 button)
  - Auto-hide when losing focus (configurable)
  - Shortcut key to open (default `Cmd+Shift+V`, customizable)

- **System Tray**:
  - Custom tray icon (`assets/tray-icon.png`) or default text icon
  - Right-click menu to control show/hide, pinning, exit

- **Reliable Icon Display**:
  - Prioritizes loading app `.icns` icons, falls back to text icons (based on app name)
  - No broken icon issues (blank or error icons)

## Installation

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd electron-clipboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **(Optional) Set up tray icon**:
   - Place a 16x16 or 32x32 pixel `tray-icon.png` in the `assets/` directory
   - Run `make create-icon` to verify

4. **Start the application**:
   ```bash
   npm start
   ```

## Usage

1. **Copy content**:
   - Copy text from any application (WeChat, Safari, etc.), automatically recorded in history
   - Copying from this app (clicking on history items) preserves the original source

2. **View history**:
   - Press `Cmd+Shift+V` (or click the tray icon) to open the window
   - Use the search bar to filter records

3. **Manage records**:
   - Click on a record to copy its content
   - Click "Clear History" to delete all records

4. **Window settings**:
   - Click 📍 to pin the window
   - Click ⚙️ to enter settings:
     - Toggle "Auto-hide"
     - Modify shortcut key (e.g., `CommandOrControl+Shift+V`)

5. **Exit**:
   - Choose "Exit" from the tray's right-click menu

## Project Structure

```
.
├── assets/
│   └── tray-icon.png (optional, tray icon)
├── index.html        (frontend interface)
├── main.js           (main process: clipboard monitoring, icon loading)
├── preload.js        (context bridge)
├── package.json      (dependencies and build configuration)
├── Makefile          (helper commands)
└── README.md
```

## Development & Debugging

1. **Run development mode**:
   ```bash
   npm start
   ```

2. **Package the application**:
   ```bash
   npm run dist
   ```

3. **Debugging**:
   - Open developer tools (`Cmd+Option+I`)
   - Check console logs:
     - Clipboard changes: `Clipboard change detected`
     - Icon loading: `Icon successfully generated` or `Using text icon`
     - Source preservation: `Copying from this app, preserving original source`

4. **Common issues**:
   - **Blank icons**: Verify app path (`/Applications`), check logs ("Failed to get icon")
   - **Missing records**: Verify clipboard permissions (System Settings > Privacy & Security > Clipboard)
   - **Shortcut key not working**: Check shortcut configuration in settings

## Dependencies

- **Electron**: `^31.3.1` (Cross-platform desktop application framework)
- **electron-store**: `^8.2.0` (Store history and settings)
- **applescript**: `^1.0.0` (Get application paths and names)

## Building

```bash
make pack    # Package unsigned application
make dist    # Build complete distribution package
```

## Notes

- **macOS permissions**: Ensure the application has clipboard access permissions
- **Icon support**: Some applications (like WeChat) may have non-standard `.icns` files, automatically falling back to text icons
- **Performance**: Clipboard monitoring uses a non-polling method (500ms interval), low CPU usage

## Contributing

Issues and PRs are welcome! Please provide:
- Problem description (logs, screenshots)
- Reproduction steps (e.g., "After copying text from WeChat...")
- macOS version

## License

ISC License