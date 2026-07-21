# Hussayni Document Compiler

**Hussayni** is a modern, professional custom Arabic markup compiler that formats custom text directives into standard, beautifully formatted A4 Portrait Microsoft Word (DOCX) and PDF documents.

## Key Features

1. **Custom Arabic Markup Parser**: Simple tag-based parser that handles Header, Body paragraphs, Footers, and manual page breaks.
2. **Dynamic Layout Optimizer**: Automatically calculates page packing. It tries font sizes from `32pt` down to `24pt` to fit multiple body/footer pairs on a page. If they don't fit at `24pt`, it splits them onto separate pages automatically.
3. **Professional Document Design**: Supports Arial font, full RTL (Right-to-Left) text formatting, and narrow margins (0.5 inches) for standard printing layouts.
4. **Serverless DOCX Generation**: Native client-side Word document constructor preserving all header/footer and page separation layouts.
5. **Headless Browser PDF Generation**: Fully integrated window print styling which allows printing or saving A4 pages as high-fidelity PDFs instantly.
6. **Autosave Protection**: Automatically saves text in browser `localStorage` so your session is never lost.

---

## Markup Syntax Guide

Hussayni supports four specific, easy-to-use markup lines:

* **`H = <Header Text>`**: Defines the header to be repeated on subsequent pages. Can be redefined at any time.
* **`B = <Body Text>`**: Defines a paragraph of body content.
* **`F = <Footer Text>`**: Associates a specific footer label with the preceding body paragraph.
* **`P`**: Forces a manual page break immediately.

### Sample Document

```markup
H = بسم الله الرحمن الرحيم
B = الحمد لله رب العالمين، الرحمن الرحيم، ملك يوم الدين، إياك نعبد وإياك نستعين، اهدنا الصراط المستقيم.
F = سورة الفاتحة

P

H = بسم الله الرحمن الرحيم
B = قل هو الله أحد، الله الصمد، لم يلد ولم يولد، ولم يكن له كفوا أحد.
F = سورة الإخلاص

B = قل أعوذ برب الفلق، من شر ما خلق، ومن شر غاسق إذا وقب.
F = سورة الفلق
```

---

## Validation & Errors

The compiler validates input live and raises errors with line numbers for:
- Missing headers
- Body paragraphs without footers (`B` without following `F`)
- Footers without body paragraphs (`F` without preceding `B`)
- Empty header, body, or footer strings
- Unrecognized or corrupt line markup

---

## Local Development Instructions

### Prerequisites

Make sure you have Node.js (version 18 or higher) installed.

### Setup and Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Build for Production**:
   ```bash
   npm run build
   ```
   This compiles the optimized production files into the `/dist` folder.
