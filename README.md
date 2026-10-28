# NebulaPDF — Your Documents. Infinite Possibilities.

> **Free PDF Tools • Smart AI • Privacy First**  
> A premium, zero-cost, browser-local PDF super toolkit with AI document intelligence, built for 100% free deployment on **Cloudflare Pages**.

---

## 🌟 Overview & Architecture

NebulaPDF eliminates the security vulnerabilities and monthly paywalls of legacy online PDF websites. While traditional services upload private files to remote servers, **NebulaPDF processes documents entirely inside your browser memory (RAM)** using WebAssembly and client-side JavaScript.

- **100% Client-Side Processing**: Core tools (Merge, Split, Rotate, Convert, Compress, OCR, Watermark, Page Numbers) execute locally on your computer or phone.
- **Zero Server Uploads**: Your files never traverse external networks or sit in remote databases.
- **Cloudflare Pages Free Ready**: Requires no paid domain, no database, and no paid hosting. Runs on your free `*.pages.dev` subdomain.
- **AI Document Studio**: Grounded document analysis (chat, summaries, deadline extraction, flashcards, and Web Speech voice narration) with explicit user consent.

---

## 📋 Comprehensive Feature Matrix

| Tool / Feature | Status | Execution Engine | Needs API Key? |
| :--- | :--- | :--- | :--- |
| **Merge PDF** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **Split PDF** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **Extract Pages** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **Delete Pages** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **Reorder Pages** | ✅ Working | `pdf-lib` + `PDF.js` (Local) | No |
| **Rotate PDF (90°/180°)** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **PDF to JPG / PNG** | ✅ Working | `PDF.js` + `JSZip` (Local) | No |
| **Images to PDF** | ✅ Working | `pdf-lib` (Local Browser) | No |
| **Compress PDF** | ✅ Working | `pdf-lib` stream optimizer | No |
| **Watermark PDF** | ✅ Working | `pdf-lib` vector stamp | No |
| **Add Page Numbers** | ✅ Working | `pdf-lib` vector stamp | No |
| **PDF Text Extractor** | ✅ Working | `PDF.js` text layer | No |
| **PDF Preview & Print** | ✅ Working | `PDF.js` Canvas + Browser Print | No |
| **PDF Compare** | ✅ Working | Local semantic line diff | No |
| **Annotation Studio** | ✅ Working | Canvas overlay + `pdf-lib` burn | No |
| **Browser OCR Reader** | ✅ Working | `Tesseract.js` (On-demand) | No |
| **PDF Health Check** | ✅ Working | `pdf-lib` dictionary parser | No |
| **Workflow Builder** | ✅ Working | Multi-step pipeline engine | No |
| **Document Pack** | ✅ Working | Cosmic cover generator + merge | No |
| **PDF Form Helper** | ✅ Working | AcroForm field scanner & JSON | No |
| **AI Studio (Local Mode)** | ✅ Working | Deterministic heuristic engine | No |
| **AI Studio (Speech Narrator)**| ✅ Working | Browser Web Speech API | No |
| **AI Studio (Cloudflare Proxy)**| ⚙️ Optional Setup | Gemini API via `/functions/api/ai.ts` | Server Secret |

---

## 🚀 Beginner-Friendly Deployment Guide (Cloudflare Pages Free)

You can deploy NebulaPDF directly from your computer, tablet, or even an **Android phone** using a free GitHub account and Cloudflare account. **You do not need a paid domain or credit card.**

### Step 1: Create Free Accounts
1. Sign up for a free account at [GitHub](https://github.com).
2. Sign up for a free account at [Cloudflare](https://dash.cloudflare.com).

### Step 2: Push Repository to GitHub
If using a terminal or mobile Git client (like Termux or GitHub Web):
```bash
git init
git add .
git commit -m "Initial NebulaPDF release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nebulapdf.git
git push -u origin main
```
*(On Android, you can also use GitHub Mobile or upload files directly via the GitHub website in desktop mode).*

### Step 3: Connect to Cloudflare Pages
1. In your Cloudflare Dashboard, go to **Compute (Workers) > Workers & Pages > Create application**.
2. Select the **Pages** tab and click **Connect to Git**.
3. Authorize GitHub and choose your `nebulapdf` repository.
4. Set the following build configuration:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

Cloudflare Pages will build the application in under 60 seconds and give you a free permanent URL:  
`https://nebulapdf.pages.dev` (or your chosen project name).

---

## 🔑 (Optional) Setting Up the AI Proxy Secret

NebulaPDF includes a Cloudflare Pages Function (`/functions/api/ai.ts`) that acts as a secure server-side proxy for Gemini AI.

If you wish to enable external AI generation:
1. Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com).
2. In the Cloudflare Dashboard, go to your NebulaPDF project:
   **Settings > Environment Variables > Add variable**.
3. Variable name: `GEMINI_API_KEY`
4. Value: Paste your Gemini API key.
5. Encrypt / save as Secret, then re-deploy.

*Note: Even without this key, NebulaPDF's AI Studio runs in **Local Heuristic Mode** and all other 20+ PDF tools remain 100% functional!*

---

## 🧪 Manual Test Checklist

Before distribution, verify these core verification flows:

- [ ] **Merge PDF**: Add 2 sample PDFs, reorder using tactile arrow buttons, click Merge, and verify downloaded PDF has all pages in correct sequence.
- [ ] **Split / Extract**: Open a multi-page PDF, select pages 1 and 2, click Extract, verify single PDF download.
- [ ] **Images to PDF**: Upload 2 photos, change margin slider to 20pt, click Generate, verify formatted PDF download.
- [ ] **PDF to JPG/PNG**: Convert a PDF page, download individual image and ZIP archive.
- [ ] **Rotate PDF**: Rotate page 1 by 90°, click Save, verify orientation in Adobe Acrobat or browser preview.
- [ ] **Watermark**: Stamp "CONFIDENTIAL", set opacity to 35%, verify transparent watermark overlay.
- [ ] **Add Page Numbers**: Position "Bottom Center", format "Page X of Y", verify pagination.
- [ ] **Text Extractor**: Pull text from sample PDF, click "Copy Text" and verify clipboard content.
- [ ] **OCR Reader**: Upload a scanned image, verify Tesseract progress bar advances, and text is recognized.
- [ ] **AI PDF Studio**: Inspect executive summary, browse generated flashcards, and test "Play Speech" voice narration.
- [ ] **Session Cleaner**: Click "Clear Session" in header and verify all loaded documents are purged from browser RAM.

---

## 🔒 Security & Privacy Commitments

- **No Data Harvesting**: Zero user telemetry, no tracking cookies, no Google Analytics.
- **Air-Gap Capability**: Testable by turning off Wi-Fi/data after loading; all core PDF tools continue to operate.
- **Explicit AI Consent**: NebulaPDF never sends extracted text to an external server without an explicit confirmation modal displaying the exact text payload.

---

*© NebulaPDF. Open Document Engineering for Everyone.*
