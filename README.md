# 🕰️ Elite Gems Dashboard: Persistent Ambient Dashboard Fancy Analog/Digital/Cistercian Clock AOD

**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**

Live at : [https://jinkaneki.github.io/AnalogClockHost/]

---

## 🚀 Key Features

- **Always-On Display:** Integrated Screen Wake Lock API prevents display dimming.
- **Dual-Mode Backgrounds:**
  - **Synced:** Background mirrors the central gallery image.
  - **Independent:** Background cycles on its own 30s timer, separate from the minute clock.
- **Four Clock Styles** (Toggle with the **STYLE** button):
  - **Classic:** Solid analog clock with neumorphic shadows.
  - **Glass:** Transparent analog clock (numbers and hands only).
  - **Digital:** Large, minimal digital display with glowing colon.
  - **Cistercian**: Displays the full time as a single medieval numeral (Hours + Minutes + Seconds) with **rainbow‑coloured lines**.

- **Cistercian Date Display**:
  - Year, month, and day displayed as three separate Cistercian numerals below the main clock.
  - Rainbow-colored strokes with natural spacing.

- **Three‑State Clean View:**
  - **OFF:** All text and images visible.
  - **Text Off:** Info text hidden, images remain.
  - **Full Clean:** Both text and images hidden – only the clock floats on the wallpaper.
- **Stealth Controls (Ghost UI):**
  - **Double‑Click Background:** Freezes/Unfreezes the background immediately.
  - **Key `B`:** Keyboard shortcut for the same stealth freeze.
  - **Key `Z`:** Cycles through clock styles (classic → glass → digital).
  - **Key `C`:** Cycles through clean view states.
  - **Visual Feedback:** Temporary "Ghost Indicator" appears for state confirmation.
- **Mechanical Sound Engine:** Web Audio API generated ticks/tocks with adjustable volume and instant mute.

---
## 📸 Screenshots



## 🛠️ Technical Highlights

### 🔋 Screen Wake Lock API
As a desk clock, the app uses the **Web Wake Lock API** to prevent device dimming or sleep mode while the tab is active.  
*Resilience:* `visibilitychange` listeners re‑acquire the lock when the user returns to the tab.

### 🎲 Fisher‑Yates (Knuth) Shuffle
Gallery content is randomized with the **Fisher‑Yates Algorithm** ($O(n)$ time complexity).  
*Advantage:* Unbiased, mathematically perfect shuffle – all items are shown exactly once before the deck is reshuffled.

### ⏱️ Deterministic State Management
UI transitions are synchronized with the system clock, occurring precisely at `00` seconds of every minute, respecting the "Minute Reset" rule regardless of page load timing.

### 🎨 UI/UX Features
- **Typewriter Effect:** Terminal‑style name‑plate with custom typing/deletion speeds.
- **Neumorphic Design:** Hybrid light/dark modes using CSS variables for smooth theme transitions.
- **Freeze Mode:** Halt the minute‑cycle to pin a specific image/quote.
- **Space Preservation:** When clean view hides images, the layout reserves the exact space – the clock never jumps.


### 🧮 Cistercian Numerals – Technical Details

This project uses the [`cistercian-numerals`](https://github.com/hsablonniere/cistercian-numerals) Web Components library.

### Components used

| Component | Purpose |
|-----------|---------|
| `<cistercian-clock>` | Displays current time (hours+minutes+seconds) as a single Cistercian symbol. |
| `<cistercian-number>` | Displays any number from 0 to 9999 as a Cistercian numeral. |

### Custom styling applied

I set the following CSS custom properties to achieve the **rainbow line effect**:

    css
    --cistercian-color-0: #ffffff;   /* centre line */
    --cistercian-color-1: #ff5733;   /* top line */
    --cistercian-color-2: #33ff57;   /* NW‑SE diagonal */
    --cistercian-color-3: #3357ff;   /* bottom line */
    --cistercian-color-4: #f033ff;   /* NE‑SW diagonal */
    --cistercian-color-5: #ffd733;   /* right line */
    --cistercian-width: 3px;          /* line thickness */
---



## 📁 Project Structure

    index.html                     # Main dashboard (all HTML/CSS/JS)
    /images/                       # Slideshow images (profile, backgrounds, etc.)
    manifest.json                  # PWA manifest
    /images/independentBgImages/   # Independent background images (optimized for mobile vertically)
    README.md                      # This file
---

## 📜 Version 2.1 Change Log (March 2026)

The "Elite Update" focuses on UI symmetry, stealth interactions, and advanced state management.

| Feature | Description | Interaction |
| :--- | :--- | :--- |
| **Clock Style Toggle** | Cycle between classic analog, glass analog, and digital. | `💎 STYLE` Button or `[Z]` |
| **Clean View Toggle** | Three states: all visible, text hidden, images+text hidden. | `🖥️ CLEAN VIEW` Button or `[C]` |
| **Space Preservation** | Images fade out (opacity 0) instead of `display: none` – layout never shifts. | Automatic |
| **Independent Mode** | Background cycles on a separate 30s timer from the gallery. | `🖼️ BG: SYNCED` Button |
| **Stealth Freeze** | "Ghost UI" locks the background without extra buttons. | `Double‑Click` or `[B]` |
| **Mechanical Sound 2.0** | Web Audio API generated ticks with percussive envelopes. | `playTick()` Function |
| **Pyramid UI Layout** | Re‑architected 2x2 Control Deck for visual balance. | `.controls` Flexbox |
| **Instant Mute** | One‑touch audio kill with volume memory. | `🔊` Icon Click |
| **Ambient Landing** | Site starts with deep charcoal `#121214` solid background. | Automatic on Load |

---

## 🛠️ Installation & Customization

1. **Images:** Drop your gallery images into `/images/`.
2. **Independent Backgrounds:** Update the `independentBgImages` array in the script with your preferred ultra‑wide wallpapers (vertical layout recommended for mobile).
3. **Colors:** Modify `:root` variables in the CSS to change the Cyan/Magenta neon theme.

---

## How to Run / Use

1. **Clone the repository**
    ```bash:
    git clone [https://github.com/JinKaneki/AnalogClockHost.git](https://github.com/JinKaneki/AnalogClockHost.git)
    cd AnalogClockHost
---

2. Serve locally (any static server)
   ```bash:
    npx serve .
    # or
    python -m http.server 8000
---

3. Open in a browser – all features work offline after first load.
---


### 🛠️ Dependencies

    cistercian-numerals – loaded via CDN: 
        <script type="module" src="https://unpkg.com/cistercian-numerals"></script>
      Web Audio API – no external library.  
      Wake Lock API – modern browsers only (fallback silently). 
---

## 🙏 Credits
Original Cistercian Web Components by Hubert Sablonnière. 
Dashboard Design & Engineering by Jin Kaneki. 
Inspiration: Medieval Cistercian monks and the pursuit of compact data visualization.


## 🧠 Philosophy
  > "All things serve the Steam. XD"

This project demonstrated that even a simple utility—like a clock—can be elevated through high‑level engineering, browser‑specific APIs, and unique historical aesthetics.

- **Developed by Jin_Kaneki**
