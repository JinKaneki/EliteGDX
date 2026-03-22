# 🚀 Elite Gems: Persistent Ambient Dashboard Fancy Analog/Digital Clock AOD

# 🕰️ Elite Ambient Dashboard

**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**

Live Demo: [https://jinkaneki.github.io/AnalogClockHost/]

---

## 🚀 Key Features

- **Always-On Display:** Integrated Screen Wake Lock API prevents display dimming.
- **Dual-Mode Backgrounds:**
  - **Synced:** Background mirrors the central gallery image.
  - **Independent:** Background cycles on its own 30s timer, separate from the minute clock.
- **Three‑State Clock Style:**
  - **Classic:** Solid analog clock with neumorphic shadows.
  - **Glass:** Transparent analog clock (numbers and hands only).
  - **Digital:** Large, minimal digital display with glowing colon.
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

---

## 📁 Project Structure

```
index.html                     # Core logic, styles, and structure
/images/                       # Gallery images for the slideshow
/images/independentBgImages/  # Independent background set (optimized for mobile vertically)
```

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

## 🧠 Philosophy
> "All things serve the Steam. XD"

This project demonstrates that even a simple utility can be elevated through high‑level engineering and attention to browser‑specific APIs.

**Developed by Jin_Kaneki**
