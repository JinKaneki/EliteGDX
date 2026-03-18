# Fancy Analog Clock AOD
# 🚀 Elite Gems: Persistent Ambient Dashboard
**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**

Live Demo: [https://jinkaneki.github.io/AnalogClockHost/]

---
# 🕰️ Elite Ambient Dashboard

A high-performance, minimalist ambient display designed for professional workspaces. It merges a precision clock with a dynamic visual gallery.

## 🚀 Key Features

- **Always-On Display:** Integrated Screen Wake Lock API to prevent display dimming.
- **Dual-Mode Backgrounds:** - **Synced:** Background mirrors the central gallery image.
  - **Independent:** Background cycles on its own 30s timer, separate from the minute clock.
- **Stealth Controls (Ghost UI):** - **Double-Click Background:** Freezes/Unfreezes the background immediately.
  - **Key 'B':** Keyboard shortcut for the same stealth freeze.
  - **Visual Feedback:** Temporary "Ghost Indicator" appears for state confirmation.
- **Zen Mode/Glass ON/OFF**: Switches the clock in a seamless transparent state.
  - **Key [z]:** Toggle "Zen Mode/Glass ON/OFF".
- **Mechanical Sound Engine:** Web Audio API generated ticks/tocks with adjustable volume and instant mute.


## 🛠️ Technical Highlights

### 🔋 Screen Wake Lock API
To serve its purpose as a desk clock, the application utilizes the **Web Wake Lock API**. This prevents the device from dimming the screen or entering sleep mode while the tab is active.
* **Resilience:** Includes `visibilitychange` listeners to re-acquire the lock automatically if the user switches back to the tab.

### 🎲 Fisher-Yates (Knuth) Shuffle
Content randomization is handled via the **Fisher-Yates Algorithm**. 
* **Complexity:** $O(n)$ time complexity.
* **Advantage:** Unlike simple random sorting, this ensures an unbiased, mathematically perfect shuffle, ensuring all gallery items are shown once before the cycle repeats.

### ⏱️ Deterministic State Management
The UI is synchronized with the system clock. Transitions between content blocks occur precisely at `00` seconds of every minute, ensuring the "Minute Reset" rule is always respected, regardless of when the page was loaded.

### 🎨 UI/UX Features
* **Typewriter Effect:** A terminal-style name-plate with customized typing/deletion speeds.
* **Neumorphic Design:** A hybrid of Light and Dark modes using CSS variables for smooth theme transitions.
* **Freeze Mode:** Allows the user to halt the minute-cycle and pin a specific image/quote to the display.


## 🛠️ Technical Deep Dive

### Algorithm: Fisher-Yates Shuffle
To prevent the "Playlist Fatigue" common in simple randomizers, this project uses the Fisher-Yates algorithm. This ensures that every image in the gallery is shown exactly once before the deck is reshuffled, maintaining $O(n)$ efficiency.

### State Management
The system uses a master `updateBackground()` function that acts as a gatekeeper. It checks the `isBgFrozen` and `bgMode` flags before allowing any DOM manipulations, ensuring the UI stays consistent even during complex user interactions.

---

## 📁 Project Structure
* `index.html` - Core logic, styles, and structure.
* `images/` - Directory for local assets.
* `images/independentBgImages/` -Directory for local assets mostly for Mobile Device backgrounds.

---

## 📜 Version 2.0 Change Log (March 2026)

The "Elite Update" focuses on UI symmetry, stealth interactions, and advanced state management.

| Feature | Description | Interaction |
| :--- | :--- | :--- |
| **Independent Mode** | Background cycles on a separate 30s timer from the gallery. | `🖼️ BG: SYNCED` Button |
| **Stealth Freeze** | "Ghost UI" allows locking the background without extra buttons. | `Double-Click` or `[B]` |
| **Zen Mode** | Toggles clock transparency and removes borders for a "floating" look. | `[Z]` Key or `💎 GLASS` |
| **Mechanical Sound 2.0** | Web Audio API generated ticks with percussive envelopes. | `playTick()` Function |
| **Pyramid UI Layout** | Re-architected 2x2 Control Deck for visual balance. | `.controls` Flexbox |
| **Instant Mute** | One-touch audio kill with volume memory. | `🔊` Icon Click |
| **Ambient Landing** | Site starts with a deep charcoal `#121214` solid background. | Automatic on Load |

---

## 🛠️ Installation & Customization

1. **Images:** Drop your gallery images into `/images/`.
2. **Independent Backgrounds:** Update the `independentBgImages` array in the script with your preferred ultra-wide wallpapers.This folder is intended for mobile device format backgrounds in a vertical layout.
3. **Colors:** Modify `:root` variables in the CSS to change the Cyan/Magenta neon theme.

---

## 🧠 Philosophy
> "All things serve the Beam."

This project was built to demonstrate that even a simple utility can be elevated through high-level engineering and attention to browser-specific APIs.

**Developed by Jin_Kaneki**
