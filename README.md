# Fancy Analog Clock AOD
# 🚀 Elite Gems: Persistent Ambient Dashboard
**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**

Live Demo: [https://jinkaneki.github.io/AnalogClockHost/]

---

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

---

## 📁 Project Structure
* `index.html` - Core logic, styles, and structure.
* `images/` - Directory for local assets.

## 🧠 Philosophy
> "All things serve the Beam."

This project was built to demonstrate that even a simple utility can be elevated through high-level engineering and attention to browser-specific APIs.

**Developed by Johan_nlb**
