# Coworkers App Build Guide

This guide covers building and distributing the Coworkers Electron app for macOS.

---

## Prerequisites

- Node.js 22+
- pnpm 10+
- Apple Developer account (for signed distribution)
- Xcode Command Line Tools (`xcode-select --install`)

---

## Build Commands

### Development

```bash
# Start the app in development mode
pnpm dev:app
```

### Production Build

Before building the app, ensure shared-services is built first:

```bash
# Build shared-services (required before app build)
pnpm build:shared

# Build macOS app
pnpm --filter coworker-app build:mac
```

`build:mac` clears `coworker-app/dist` to avoid stale artifacts, then runs a single app build and packages a universal macOS app.

Build output location: `coworker-app/dist/`

- `Coworkers-1.0.0.dmg` — macOS universal installer
- `Coworkers-1.0.0-mac.zip` — OTA update payload (universal)
- `Coworkers-1.0.0-mac.zip.blockmap` — OTA differential updates
- `latest-mac.yml` — OTA update metadata

---

## Distribution (Vercel Blob)

After building the macOS DMGs, upload them to Vercel Blob and update the
public release manifest.

### Environment

Create a root `.env.distribution` file with a Vercel Blob read/write token:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Upload Command

```bash
pnpm dist:upload:mac
```

This command:

- Uploads DMG to:
  - `/downloads/macos/<version>/Coworkers-<version>.dmg`
- Uploads OTA update artifacts to:
  - `/updates/macos/stable/latest-mac.yml`
  - `/updates/macos/stable/<version>-mac.zip`
  - `/updates/macos/stable/<version>-mac.zip.blockmap`
- Updates `/downloads/releases.json` with:
  - `latest` version
  - release `date` (UTC)
  - universal macOS file URL

### Auto-setting Update Feed URL

The macOS packaging steps run a helper script that derives the Blob public base URL and writes
`COWORKER_UPDATES_URL` into `coworker-app/.env.production` before packaging:

```bash
pnpm dist:set-updates-url
```

This requires `BLOB_READ_WRITE_TOKEN` in the root `.env.distribution`. If no blobs
exist yet, upload at least one artifact first.

### Landing Page Integration

The Pilot landing page reads the release manifest from a server-only env var:

```bash
# coworker-pilot/.env
DOWNLOAD_MANIFEST_URL=https://<your-blob-public-url>/downloads/releases.json
```

### App Update Feed

The Electron app reads the OTA update feed from a build-time env var:

```bash
# coworker-app/.env.production
COWORKER_UPDATES_URL=https://<your-blob-public-url>/updates/macos/stable
```

---

## Build Configuration

The build is configured via `coworker-app/electron-builder.yml`.

### Current Configuration

| Setting | Value |
|---------|-------|
| App ID | `com.works.myco` |
| Product Name | `Coworkers` |
| Electron Version | `39.4.0` |
| macOS Category | `public.app-category.productivity` |
| Target Architecture | `universal` |
| Target Format | `dmg` + `zip` |
| Notarization | Enabled (requires `.env` credentials) |

### Key Configuration Sections

```yaml
appId: com.works.myco
productName: Coworkers

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch:
        - universal
      artifactName: ${name}-${version}.${ext}
    - target: zip
      arch:
        - universal
      artifactName: ${name}-${version}-mac.${ext}
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: true

dmg:
  sign: false
```

### macOS Workspace Package Association

The macOS build registers `.cowork` as a document package and file association:

- Finder treats `.cowork` folders as a single file (`LSTypeIsPackage`)
- Double-click opens Coworkers via Launch Services
- UTI export: `com.works.myco.cowork`

This is configured in `coworker-app/electron-builder.yml` via:
- `fileAssociations` (extension, role, rank, `isPackage`)
- `mac.extendInfo.UTExportedTypeDeclarations` (UTI + extension mapping)

### Build Resources

Located in `coworker-app/build/`:

| File | Purpose |
|------|---------|
| `icon.icns` | macOS app icon |
| `icon.ico` | Windows app icon |
| `icon.png` | Fallback/Linux icon |
| `entitlements.mac.plist` | macOS security entitlements |

### Entitlements

The app uses these macOS entitlements (`build/entitlements.mac.plist`):

- `com.apple.security.cs.allow-jit` — Required for Electron JIT compilation
- `com.apple.security.cs.allow-unsigned-executable-memory` — Required for V8
- `com.apple.security.cs.allow-dyld-environment-variables` — Required for Electron

---

## Code Signing Setup

For distributing to testers, the app should be signed with a Developer ID certificate.

### Option 1: Automatic Signing (Recommended)

If you have a Developer ID certificate in your Keychain, electron-builder will automatically discover and use it.

#### Step 1: Create a Certificate Signing Request (CSR)

1. Open **Keychain Access** (`/Applications/Utilities/Keychain Access.app`)
2. Menu: **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**
3. Fill in:
   - **User Email Address**: Your Apple Developer account email
   - **Common Name**: A descriptive name (e.g., "Coworkers Dev Key")
   - **CA Email Address**: Leave empty
   - **Request is**: Select **Saved to disk**
4. Click **Continue** and save the `.certSigningRequest` file

#### Step 2: Create Developer ID Application Certificate

1. Go to [Apple Developer - Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Sign in with your Apple Developer account
3. Click the **+** button to create a new certificate
4. Under **Software**, select **Developer ID Application**
5. Click **Continue**
6. Click **Choose File** and select your `.certSigningRequest` file
7. Click **Continue**, then **Download**

#### Step 3: Install Certificate in Keychain

1. Double-click the downloaded `.cer` file
2. Keychain Access opens and installs the certificate
3. Verify under **My Certificates** category

#### Step 4: Verify Installation

```bash
security find-identity -v -p codesigning
```

Expected output:

```
1) ABCDEF123456... "Developer ID Application: Your Name (TEAM_ID)"
```

#### Step 5: Build

```bash
pnpm build:shared
pnpm --filter coworker-app build:mac
```

electron-builder automatically uses the Developer ID certificate from your Keychain.

### Option 2: Explicit Certificate (CI/CD)

For CI/CD or when you have multiple certificates, use environment variables.

#### Export Certificate as .p12

1. Open **Keychain Access**
2. Find your certificate under **My Certificates**
3. Right-click and select **Export**
4. Choose **Personal Information Exchange (.p12)** format
5. Save securely and set a strong password

#### Set Environment Variables

```bash
export CSC_LINK="$HOME/certificates/coworkers-dev-id.p12"
export CSC_KEY_PASSWORD="your-certificate-password"
```

Or add to `~/.zshrc` for persistence.

### Option 3: Ad-hoc Signing (No Certificate)

If no certificate is available, electron-builder falls back to ad-hoc signing. Testers must bypass Gatekeeper:

1. Right-click the app
2. Select **Open**
3. Click **Open** in the security dialog

---

## Distributing to Testers

### With Developer ID Signing

1. Share the DMG file (email, cloud storage, etc.)
2. Tester opens the DMG
3. Tester drags Coworkers to Applications
4. First launch shows a Gatekeeper prompt
5. Tester clicks **Open**

### With Ad-hoc Signing

Instruct testers to:

1. Download and open the DMG
2. Drag Coworkers to Applications
3. **Right-click** the app and select **Open**
4. Click **Open** in the security dialog

---

## Notarization

Notarization is enabled by default and required for macOS 15+ to avoid Gatekeeper blocking. The build script automatically loads credentials from `coworker-app/.env`.

### Setup (One-Time)

1. **Generate an app-specific password** at [appleid.apple.com](https://appleid.apple.com) > Sign-In and Security > App-Specific Passwords

2. **Create `.env` file** in `coworker-app/`:

```
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=84D9A6MA23
```

3. **Build** — credentials must be available in the environment (or `.env.production`):

```bash
pnpm build:shared
pnpm --filter coworker-app build:mac
```

### How It Works

- The macOS packaging scripts use `dotenv-cli` to load `.env.production` before running electron-builder
- Credentials are passed to Apple's notarization service during the build
- The notarization ticket is "stapled" to the app, so it works offline
- `.env`/`.env.production` are in `.gitignore` and never committed

### Verification

After building, verify notarization:

```bash
spctl -a -vvv -t install coworker-app/dist/mac-universal/Coworkers.app
```

Expected output:

```
dist/mac-universal/Coworkers.app: accepted
source=Notarized Developer ID
```

### Disabling Notarization

To build without notarization (for local testing only), temporarily set in `electron-builder.yml`:

```yaml
mac:
  notarize: false
```

**Note**: Non-notarized apps will be blocked by Gatekeeper on macOS 15+.

---

## Troubleshooting

### "Cannot find module '@coworker/shared-services'"

Build shared-services first:

```bash
pnpm build:shared
```

### "No identity found for signing"

Verify your certificate is installed:

```bash
security find-identity -v -p codesigning
```

If not listed:
- Re-download from Apple Developer portal
- Double-click to install
- Ensure the private key was created on this machine (CSR step)

### "The certificate has an invalid issuer"

Install Apple's WWDR intermediate certificates:

1. Go to [Apple PKI](https://www.apple.com/certificateauthority/)
2. Download "Developer ID - G2" certificate
3. Double-click to install

### Testers see "App is damaged" error

The app wasn't signed properly. Verify:

```bash
codesign -dv --verbose=4 /path/to/Coworkers.app
```

Look for `Authority=Developer ID Application: Your Name (TEAM_ID)`.

### EPERM errors during DMG build

electron-builder needs write access to `~/Library/Caches/electron-builder/`. Ensure:
- You have write permissions to your home directory
- No sandbox is blocking access

### "Unable to authenticate" during notarization

- Verify `.env` exists in `coworker-app/` with correct values
- Check that `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` are set correctly
- Regenerate the app-specific password at [appleid.apple.com](https://appleid.apple.com) if needed

### Notarization takes too long

Notarization typically takes 2-5 minutes. If it takes longer than 10 minutes:
- Check [Apple System Status](https://developer.apple.com/system-status/) for outages
- Retry the build later

---

## Architecture Notes

### Build Process Flow

```
pnpm build:shared          →  Compiles shared-services to dist/
pnpm --filter coworker-app build:mac
  └─ dotenv -e .env        →  Loads Apple credentials from .env
  └─ npm run build         →  TypeScript check + electron-vite build
      └─ electron-vite     →  Builds main, preload, renderer to out/
  └─ electron-builder      →  Packages app + creates DMG
      └─ Code signing      →  Signs with Developer ID
      └─ Notarization      →  Uploads to Apple, receives ticket
      └─ Stapling          →  Embeds ticket in app
      └─ DMG creation      →  Creates distributable installer
```

### Output Structure

```
coworker-app/
├── out/                    # Compiled app code (intermediate)
│   ├── main/
│   ├── preload/
│   └── renderer/
└── dist/                   # Distribution artifacts
    ├── mac-universal/      # Unpacked app (universal)
    │   └── Coworkers.app
    ├── Coworkers-1.0.0.dmg
    ├── Coworkers-1.0.0-mac.zip
    ├── Coworkers-1.0.0-mac.zip.blockmap
    └── latest-mac.yml
```
