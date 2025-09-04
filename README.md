# receipt-print

A React + Vite + TypeScript application with Tailwind CSS that lets a user compose a receipt (with optional auto-generated/fake data), renders a store-style receipt preview, and prints it automatically.

Unlike typical web apps that rely on the browser print dialog, this project is designed to detect printers and send print jobs automatically when the user submits the form—behaving like a built‑in "print server" companion.

> Note: Modern browsers do not allow truly silent printing or reliable printer detection from the web page alone due to security restrictions. This project addresses that with a local helper service ("Print Agent") that the web app talks to, enabling automatic detection and printing without the OS dialog.

## Recent Enhancements ✨

**Print Job Status Tracking**: Enhanced the print system with real-time job tracking and status updates. Users can now monitor print job progress with visual feedback in the UI.

**Tailwind v4 Compatibility**: Fixed OKLCH color function issues by implementing fallback colors for better compatibility with PDF generation and print preview.

**Improved Readability**: Updated receipt preview with responsive pixel widths and larger text for enhanced readability, while maintaining authentic thermal receipt dimensions.

**Enhanced PDF Generation**: Improved PDF generation with better aspect ratio maintenance, readable A4 sizing options, and capture-safe color handling.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 with thermal receipt utilities
- **Print Agent**: Node.js + Express + TypeScript
- **PDF Generation**: jsPDF + html2canvas
- **Fake Data**: Faker.js

## Key features

- Receipt Composer: user input + optional fake data generation for line items, totals, store information, and timestamps
- Live Preview: receipt layout (e.g., thermal 58/80mm) and standard page (A4/Letter) views with responsive text sizing
- Automatic Printer Detection: show connected printers and their status
- Zero-Click Printing on Submit: submit triggers print directly via the local Print Agent
- **Print Job Status Tracking**: Real-time monitoring of print job progress with visual feedback
- **Exact Thermal Sizing**: maintains authentic thermal receipt dimensions (58mm, 80mm, 112mm) on any printer
- **Enhanced PDF Download**: generates PDFs with exact thermal dimensions and improved readability for archival
- **Color Compatibility**: Tailwind v4 OKLCH color fallbacks for reliable PDF generation and printing
- Fallback to System Print Dialog: if the agent is unavailable, degrade gracefully to window.print
- Cross‑platform Target: macOS first; Windows/Linux planned

## How automatic printing works

Browsers sandbox printing. To support printer discovery and silent printing, we use one of these strategies (primary first):

1) Local Print Agent (recommended)
   - A small local service (Node.js/Express + TypeScript) running on the user's machine
   - Exposes localhost APIs (HTTP/WebSocket) for the web app
   - Talks to the OS spooler (CUPS/IPP on macOS; print APIs elsewhere) or directly to thermal printers
   - Enables: list printers, check status, silent print, job tracking
   - **Exact sizing**: Uses CUPS options to prevent scaling and maintain thermal dimensions

2) Kiosk/Managed Mode (alternative)
   - Chrome/Edge with kiosk printing enabled (e.g., `--kiosk --kiosk-printing`) or enterprise policies
   - No helper service needed, but requires managed environment

3) Direct Device APIs (niche)
   - WebUSB/WebHID/Serial for some ESC/POS thermal printers if supported by vendor firmware
   - Limited device compatibility; still may need permissions/prompts

This project will implement (1) by default and provide extension points for (2) and (3).

## High-level architecture

- Frontend (this app)
  - React + Vite + TypeScript UI for creating and previewing receipts
  - Tailwind CSS with custom thermal receipt utilities (58mm, 80mm, 112mm widths)
  - Communicates with the Print Agent at `http://localhost:3333` (configurable)
  - Flow: user fills form → generate receipt data → render to HTML/PDF → send to agent → agent prints

- Local Print Agent (companion)
  - Node.js + Express + TypeScript service (in `print-agent/`) that:
    - Lists printers and statuses (via CUPS/IPP or platform print APIs)
    - Accepts print jobs (PDF or raw ESC/POS) and sends them to a target printer
    - **Maintains exact thermal dimensions** using CUPS no-scaling options
    - Emits status events over WebSocket (e.g., printerConnected, jobComplete)

### Draft local API (subject to change)

- `GET  /status` → `{ ok: boolean, version: string }`
- `GET  /printers` → `[{ name, isDefault, status }]`
- `POST /print` → body `{ printerName, jobType: 'pdf' | 'raw', data: <base64>, options?: { copies, widthMm, heightMm } }` → returns `{ jobId, status }`
- `GET  /jobs/:jobId` → `{ jobId, status: 'queued' | 'processing' | 'completed' | 'error', progress?: number }`
- `POST /download-pdf` → downloads PDF with exact thermal dimensions
- `WS   /events` → events: `printerConnected`, `printerDisconnected`, `jobAccepted`, `jobComplete`, `jobError`

Example payload for `/print` (PDF job):

```json
{
  "printerName": "Star_TSP143III",
  "jobType": "pdf",
  "data": "<base64-encoded-pdf>",
  "options": { 
    "copies": 1, 
    "widthMm": 80, 
    "heightMm": 150 
  }
}
```

## Development

Prerequisites:
- Node.js ≥ 18
- npm ≥ 9 (or pnpm ≥ 10 if preferred)
- TypeScript knowledge
- macOS: CUPS is included by default; ensure printing works from the OS (System Settings → Printers & Scanners)

Install and run the web app:

```bash
npm install
npm run dev:app
```

For concurrent development (both app and print agent):

```bash
npm install
npm run dev
```

When running only the web app (before the agent exists), printing will fall back to the system print dialog.

Print Agent (TypeScript):
- Location: `print-agent/`
- Build: `cd print-agent && npm run build`
- Start (dev): `cd print-agent && npm run dev`
- Start (prod): `cd print-agent && npm start`
- The frontend will detect the agent at startup and before printing; if not found, it will show a non-blocking warning and use the fallback.

## Thermal Receipt Sizing

This project maintains **exact thermal receipt dimensions** regardless of the target printer:

- **58mm thermal**: Prints as 58mm wide strip on any paper size
- **80mm thermal**: Prints as 80mm wide strip on any paper size  
- **112mm thermal**: Prints as 112mm wide strip on any paper size

**Implementation**:
- Tailwind utilities: `w-58mm`, `w-80mm`, `w-112mm`
- PDF generation with exact dimensions
- CUPS print options: `fit-to-page=false`, `print-scaling=none`
- Custom media sizes: `custom_80x150mm` etc.

## Project scope

- MVP
  - Receipt form with basic fields (store name, address, items, tax, total, cashier, timestamp)
  - Fake data generator (seeded for consistent demos)
  - Preview in thermal receipt layout (58mm/80mm/112mm)
  - Print Agent: list printers, print PDFs silently to a selected/default printer with exact sizing
  - PDF download with thermal dimensions
  - Auto-print on submit when the agent is available

- Future enhancements
  - Windows/Linux packaging (service/installer)
  - ESC/POS raw printing for thermal printers (USB/Network)
  - Printer profiles (paper width, density, margins)
  - Job queue UI and error handling (paper out, offline)
  - Kiosk mode support and documentation

## Security & privacy

- The Print Agent binds to `localhost` only and should restrict allowed origins
- No data leaves the machine unless explicitly configured
- Users must explicitly install/run the agent; browsers will still require one-time permissions for device APIs (if used)

## Commands

**Frontend (React + TypeScript + Tailwind)**:
- Start dev server: `npm run dev:app`
- Start both app and agent: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`
- Lint: `npm run lint`

**Print Agent (Node.js + TypeScript)**:
- Build TypeScript: `cd print-agent && npm run build`
- Start dev (with hot reload): `cd print-agent && npm run dev`
- Start production: `cd print-agent && npm start`
- Clean build: `cd print-agent && npm run clean`

## Troubleshooting

**Print Job Issues**:
- If prints appear blank or with incorrect colors, ensure your system supports the target printer's paper size
- For thermal printers, verify the printer is set to the correct paper width (58mm, 80mm, or 112mm)
- Check print job status via the UI - failed jobs will show error details

**Color Rendering Issues**:
- Modern Tailwind CSS uses OKLCH colors which may not render in PDFs - the app includes fallback colors for compatibility
- If you see color issues, check that the `.capture-safe` class is applied during PDF generation

**Print Agent Connection**:
- Ensure the print agent is running on `http://localhost:3333` (or your configured URL)
- Check that CORS is properly configured if running on different ports
- The app will gracefully fall back to browser print dialog if the agent is unavailable

**Development Setup**:
- If using pnpm, replace `npm` commands with `pnpm` equivalents
- For concurrent development, ensure both frontend and print-agent dependencies are installed

## License

MIT (subject to change). See `LICENSE` when added.
