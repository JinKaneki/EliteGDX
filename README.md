# Elite Gems Dashboard: Persistent Ambient Dashboard Fancy Analog/Digital/Cistercian Clock AOD 🕰️

**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**
**An ambient, cyber‑punk inspired dashboard with multiple clock faces, a rotating image gallery, and a powerful built‑in terminal command runner.**

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

**Router‑Pattern Command Parser** – Executes sync commands instantly, async commands with loading indicators.
- **CORS‑Aware APIs** – Uses `rss2json` proxy for RSS feeds, direct fetch for CORS‑enabled services.


## 🎨 UI/UX Features (Latest Updates)
### 🖥️ Cyber‑Fetch Terminal (JOHAN_OS)
- A **hacker‑style system information panel** inspired by `fastfetch` / `neofetch`.
- **Command runner** – interactive terminal with commands: `help`, `theme`, `fortune`, `clear`, `sudo`, `fetch`, `pause`.
- **Custom ASCII art** – displays a bold **JOHAN_OS** banner with a **maple leaf** for a unique, personal touch.
- **Real system data** – shows OS, browser, resolution, uptime, CPU cores, approximate RAM, network type, and theme mode.
- **Privacy‑safe fallbacks** – if a browser blocks any API (e.g., `deviceMemory`, `connection`), the terminal shows `"Unknown"` or `"Protected"` – **no crashes**.
- **Toggle with button or keyboard** – press `q` (or click the `🖥️ System Info` button) to open/close the terminal. `Escape` closes it.
- **Glass‑morphic design** – semi‑transparent background with backdrop‑blur, matching the dashboard’s cyber aesthetic.
- **Responsive** – on mobile, the ASCII art shrinks and the panel uses horizontal scrolling (or wraps gracefully) to fit small screens.

### 🎨 Customisation
- **Color themes** – Cyan Night, Magenta Dream, Amber Glow, Matrix Green (saved in `localStorage`).

### 🎮 Hide Controls Toggle
- A **dedicated button** in the **top‑left corner** (opposite the theme toggle) 
hides/shows all five control buttons:
  - FREEZE MOMENT
  - BG: SYNCED / INDEPENDENT
  - STYLE (Classic / Glass / Digital / Cistercian)
  - CLEAN VIEW
  - Volume slider & mute button
- When hidden, the buttons **remain in the layout** (space is preserved) – no layout shift.
- Works independently of the “Clean View” mode.
- Styled to match the dashboard’s cyber‑cyan theme.
- **Typewriter Effect:** Terminal‑style name‑plate with custom typing/deletion speeds.
- **Neumorphic Design:** Hybrid light/dark modes using CSS variables for smooth theme transitions.
- **Freeze Mode:** Halt the minute‑cycle to pin a specific image/quote.
- **Space Preservation:** When clean view hides images, the layout reserves the exact space – the clock never jumps.


#### Cycle Clock Styles
- Use the `STYLE` button or press `Z` to cycle through **Classic → Glass → Digital → Cistercian**.
- PRESS `B` to freeze or pause Background Image or on Android double TAP on your screen on an empty space on the webpage, AVOID any element on the webpage while doing it.

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

### ⏰ Cistercian Alarm
- Set a time (HH:MM). At the chosen time, a continuous beep plays and a full‑screen overlay shows the alarm time as a Cistercian numeral. Dismiss stops the sound.

### Magic Mirror Mode
- Hides all UI elements except the **active clock** (analog, digital, or Cistercian) and the **Tao Te Ching widget**.
- Adds a large empty space under the clock (Aesthetics) and shows an **Exit Mirror Mode** button.
- All other elements (controls, slideshow, footer, etc.) are hidden but restored exactly when exiting.

### 📜 Wisdom & Quotes
- **Online quote API** – random quotes from `dummyjson.com` (falls back to local cache).
- **Tao Te Ching widget** – random chapters from a local JSON file (81 chapters).


## 📁 Project Structure

    index.html                     # Main dashboard (all HTML/CSS/JS)
    /images/                       # Slideshow images (profile, backgrounds, etc.)
    manifest.json                  # PWA manifest
    sw.js                          # service worker
    TTC/Tao_te_ching.json          # Local Chapters
    /images/independentBgImages/   # Independent background images (optimized for mobile screens)
    README.md                      # This file
---

## ⌨️ Terminal Command Reference

### 💻 J_OS // AKASHIC ZERO-POINT KRYPTOS NEURAL CENTER (AZKNC)
The built‑in command runner—a full‑featured terminal emulator with over 40 commands, fullscreen support, and a cyber‑mystical aesthetic.

### Command Categories

**⚡ System & Utility**  
`help` `clear` `echo` `whoami` `ls` `history` `shutdown` `sudo` `motd` `login` `sytem`

**🎨 Theme & UI**  
`theme` `pause` `fetch` `fastfetch` `neofetch`

**📰 News & Information**  
`news` `hackernews` / `hn` `technology` `weather`

**📚 Learning & Reference**  
`define` `physics` `electronics` `biology` `space` `cstip` `learn` `fortune` `akashic`

**🧘 Wisdom & Spirituality**  
`tao` `wisdom` `sutra` `buddha` `koan` `stoic` `bible` `verse`

**🎭 Fun & Entertainment**  
`joke` `riddle` `poem` `poetry` `anime` `qr` `radio` `tv` `play youtube` `play audio` `stop`

**🖼️ Visuals & Effects**  
`image` `walls` `matrix` `scroll` `intersect` `intersectslow`

**Type `help` to see the full list.**

| Command               | Description |
|-----------------------|-------------|
| `help`                | List all available commands |
| `theme [name]`        | Switch color profile (cyan, magenta, amber, matrix) |
| `fortune`             | Random Unix / coding fortune |
| `clear`               | Clear terminal output |
| `sudo`                | Try to make a sandwich (say please)|
| `system`              | Unified neural link status: user auth, audio feed, uptime, system stability |
| `play youtube <id/url>` | Embed YouTube video player in the terminal |
| `play audio <url>`      | Play direct audio file (MP3, OGG, WAV) or live stream URL |
| `radio [channel]`       | Tune into a curated Akashic radio frequency (see channel list below) |
| `tv [channel]`          | Watch a curated live TV feed: Gumball, nasa, iss, lofi, and more |
| `stop`                  | Stop all currently playing media (YouTube and audio) |
| `fetch`               | Display system info panel (cyber‑fetch terminal) |
| `neofetch`            | Manually trigger the RUN JOHAN_OS system info panel |
| `whoami`              | Show user identity: Rotating cyber‑spiritual persona |
| `ls`                  | List fake directories |
| `echo [text]`         | Print text |
| `shutdown`            | Enter Magic Mirror mode |
| `history`             | Show command history |
| `pause`               | Freeze/unfreeze background |
| `matrix`              | Activate glitch effect for 10 seconds |
| `motd`                | Message of the Day – random mystical status from the Akashic terminal |
| `tao`                 | Random chapter from Tao Te Ching |
| `wisdom`              | Random inspirational quote (DummyJSON) |
| `hackernews`          | Top 5 Hacker News stories |
| `news`                | BBC World News headlines |
| `define [word]`       | Full dictionary entry with phonetics, definitions, synonyms, antonyms |
| `image`               | Display a random Picsum photo |
| `walls`               | Fetch a random wallpaper from [0xnotkyo/walls](https://github.com/0xnotkyo/walls) |
| `weather [city]`      | Terminal‑style forecast from wttr.in |
| `joke`                | Random dad joke |
| `riddle`              | Random riddle with a hidden answer (click to reveal) |
| `learn`               | Random educational fact / "Did you know?" |
| `qr [text]`           | Generate a scannable QR code |
| `anime`               | Top 10 anime + currently airing (Jikan API) |
| `technology`          | Curated tech news (The Verge, Ars Technica, TechCrunch, Wired) |
| `poem`                | Random classic poem with title and author |
| `poetry`              | Short poetry excerpt (first 6 lines) |
| `bible`               | Random Bible verse (labs.bible.org) |
| `verse`               | Same as `bible` – random sacred verse |
| `physics`             | Random physics or math formula with explanation |
| `scroll`              | Bouncy terminal scroll animation |
| `biology`             | Fascinating biology facts |
| `space`               | Random astronomy / space fact |
| `cstip`               | Computer science tip or historical fact |
| `koan`                | Random Zen koan |
| `stoic`               | Stoic wisdom quote (Marcus Aurelius, Seneca, Epictetus) |
| `buddha`              | Buddhist wisdom quote (Buddha, Dogen, Thich Nhat Hanh, Dalai Lama) |
| `sutra`               | Authentic teaching from the Pali Canon (Dhammapada, Suttas) |
| `electronics`         | Electronics formulas, laws, and fascinating hardware facts |
| `engineering`         | Fascinating engineering facts and historical marvels |
| `case`                | Engineering diagnostics: resistor calc, color decode, Ohm's Law, voltage divider, capacitor codes         |
| `intersect`           | Neural‑link flash sequence (Chuck‑style Intersect) |
| `intersectslow`       | Neural‑link flash sequence (for 60 seconds of meditative state) |
| `login`               | Display the J_OS Akashic Zero‑Point Kryptos Neural Center splash screen |

### 🎧 Media Playback

The terminal supports YouTube video embedding, direct audio playback, live radio streams, and curated live TV channels.

| Command                   | Description |
|---------------------------|-------------|
| `play youtube <id/url>`   | Embed a YouTube video or live stream in the terminal |
| `play audio <url>`        | Play a direct audio file (MP3, OGG, WAV) or live stream URL |
| `radio [channel]`         | Tune into a curated Akashic radio frequency |
| `tv [channel]`            | Watch a curated live TV feed (news, space, anime, documentaries) |
| `stop`                    | Stop all currently playing media (YouTube and audio) |

#### 📻 Akashic Radio Frequencies

| Channel      | Genre / Vibe                | Source                     |
|--------------|-----------------------------|----------------------------|
| `defcon`     | Darkwave / Industrial       | SomaFM DEF CON Radio       |
| `ebsm`       | Dark Electro / Synthwave    | Nightride FM EBSM          |
| `datawave`   | Glitchy / Retro Computing   | Nightride FM Datawave      |
| `deepspace`  | Deep Ambient / Space        | SomaFM Deep Space One      |
| `spacestation` | Ambient / Space           | SomaFM Space Station       |
| `spacesynth` | Space Disco / Retro         | Nightride FM Spacesynth    |
| `dronezone`  | Meditation / Drone          | SomaFM Drone Zone          |
| `fiphiphop`  | Hip‑Hop (French)            | Fip Hip‑Hop                |
| `thebeat`    | Hip‑Hop / Urban             | 181.fm The Beat            |

### 📺 Akashic Visual Uplink Channels

| Channel       | Description                 |
|---------------|-----------------------------|
| `nasa`        | NASA Live (HD)              |
| `iss-earth`   | Earth from Space (ISS)      |
| `lofi`        | Lofi Girl (beats to relax)  |
| `gumball`     | Amazing World of Gumball    |


Type `radio` or `tv` without arguments to see the channel list directly in the terminal.


### ⚙️ Engineering Case Simulator (`case`)

The `case` command is a field toolkit for quick electronics diagnostics. It simulates component stress, decodes resistor color bands, and performs common calculations—all with immediate, educational feedback.

**Usage:** `case <tool> [parameters]`

| Tool | Example | Description |
|------|---------|-------------|
| `resistor` | `case resistor 12v led` | Calculates the resistor needed for an LED. Shows failure simulation if used without one. |
| `decode` | `case decode brown black red` | Decodes 3‑band resistor colors. Supports tolerance (e.g., `gold`). |
| `ohmslaw` | `case ohmslaw V 0.02 1000` | Solves for V, I, or R (e.g., `V` = I × R). |
| `vdivider` | `case vdivider 5 10000 10000` | Calculates output voltage of a two‑resistor divider. |
| `series` | `case series 100 220 330` | Adds resistances in series. |
| `parallel` | `case parallel 100 100` | Calculates equivalent resistance for parallel resistors. |
| `capacitor` | `case capacitor 104` | Decodes 3‑digit capacitor codes (e.g., 104 → 100nF). |

**Examples:**

### LED resistor with failure warning
case resistor 12v led
> DIAGNOSTIC: LED STRESS TEST
> Calculation: (12V - 2.0V) / 0.02A = 500Ω
> Standard value: 560Ω
> ⚠️ STRESS ALERT: Without resistor, current = 400mA. Component destroyed.

### Resistor color decode
case decode yellow violet orange gold
> RESISTOR DECODE
> 4 | 7 | ×1k → 47kΩ ±5%

### Ohm's Law
case ohmslaw R 5 0.02
> R = 250Ω

### Voltage divider
case vdivider 9 2200 1000
> Vout = 2.81V
---
**This command is perfect for hobbyists, students, or anyone who wants a quick sanity check before wiring up a circuit.**

### 🧘 Final Reflection

the **J_OS // AKASHIC ZERO-POINT KRYPTOS NEURAL CENTER** Console now supports:

- 🔮 **Mystical wisdom** (`tao`, `sutra`, `koan`, `stoic`, `buddha`,`akashic`)
- 📡 **Live information** (`news`, `weather`, `technology`)
- 🛠️ **Engineering diagnostics** (`case`, `physics`, `electronics`)
- 🎬 **Media playback** (`play youtube`, `play audio`, `radio`, `tv`)
- 🖼️ **Ambient visuals** (`walls`, `intersect`, `matrix`)
- 🧠 **System introspection** (`fastfetch`, `system`, `whoami`)

It is functionally complete and aesthetically cohesive.

## 📜 Version 2.1 Change Log (March 2026)

The "Elite Update" focuses on UI symmetry, stealth interactions, and advanced state management.

| Feature | Description | Interaction |
| :--- | :--- | :--- |
| **Clock Style Toggle** | Cycle between classic analog, glass analog, and digital. | `💎 STYLE` Button or `[Z]` |
| **Clean View Toggle** | Three states: all visible, text hidden, images+text hidden. | `🖥️ CLEAN VIEW` Button    |
| **Space Preservation** | Images fade out (opacity 0) instead of `display: none` – layout never shifts. | Automatic |
| **Independent Mode** | Background cycles on a separate 30s timer from the gallery. | `🖼️ BG: SYNCED` Button |
| **Stealth Freeze** | "Ghost UI" locks the background without extra buttons. | `Double‑Click` or `[B]` |
| **Mechanical Sound 2.0** | Web Audio API generated ticks with percussive envelopes. | `playTick()` Function |
| **Pyramid UI Layout** | Re‑architected 2x2 Control Deck for visual balance. | `.controls` Flexbox |
| **Instant Mute** | One‑touch audio kill with volume memory. | `🔊` Icon Click |
| **Ambient Landing** | Site starts with deep charcoal `#121214` solid background. | Automatic on Load |

## version 4.0 Change Log (April 2026)
| Date | Change |
|------|--------|
| 2026‑04‑11 | Added Cyber‑Fetch terminal with JOHAN_OS ASCII + maple leaf |
| 2026‑04‑11 | Added `q` keyboard shortcuts to toggle System Info panel |
| 2026‑04‑11 | Made terminal bulletproof with try/catch and fallbacks |
| 2026‑04‑11 | Fixed mobile overflow – horizontal scrolling or size reduction |
| 2026‑04‑10 | Added Hide Controls button (top‑left) |
| 2026‑04‑10 | Improved sticky footer and removed double scrollbars |
| 2026‑04‑09 | Added responsive Cistercian clock sizes |
| 2026‑04‑08 | Integrated rainbow colours for Cistercian numerals |

---

### 📱 PWA & Offline Support
- Service worker caches `index.html`, manifest, Tao Te Ching JSON, Cistercian CDN, and 7 essential images.
- Works offline after first visit (most features available).
- Manifest enables “Add to Home Screen” (fullscreen mode)/ "Install" as an app in browsers.


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

- [Cistercian Numerals](https://www.npmjs.com/package/cistercian-numerals) (Web Component)
- [QRCode Generator](https://github.com/kazuhikoarase/qrcode-generator) (via CDN)
- Web Audio API – no external library.  
- Wake Lock API – modern browsers only (fallback silently).

### Public APIs (no keys required)

| API | Endpoint / Documentation |
|-----|--------------------------|
| Hacker News | [firebaseio.com/v0](https://github.com/HackerNews/API) |
| Lobste.rs | [lobste.rs/hottest.json](https://lobste.rs/api) |
| ZenQuotes | [zenquotes.io/api](https://zenquotes.io/) |
| Dictionary API | [api.dictionaryapi.dev](https://dictionaryapi.dev/) |
| wttr.in | [wttr.in/:help](https://github.com/chubin/wttr.in) |
| Jikan (MyAnimeList) | [api.jikan.moe/v4](https://jikan.moe/) |
| DummyJSON | [dummyjson.com/quotes](https://dummyjson.com/docs/quotes) |
| rss2json | [rss2json.com](https://rss2json.com/) |
| Picsum | [picsum.photos](https://picsum.photos/) |
| PoetryDB | [poetrydb.org](https://poetrydb.org/) |
| Bible API | [labs.bible.org/api](https://labs.bible.org/api/) |
| Stoic Quotes | [stoic-quotes.com/api](https://stoic-quotes.com/api/quote) |
| Buddha API | [buddha-api.com/api](https://buddha-api.com/api/random) |
| Bootprint (Space) | [bootprint.space/api](https://bootprint.space/api/fact) |
| icanhazdadjoke | [icanhazdadjoke.com](https://icanhazdadjoke.com/) |
| Useless Facts | [uselessfacts.jsph.pl](https://uselessfacts.jsph.pl/) |


## 🤝 Credits & Inspiration
- Original Cistercian Web Components by **Hubert Sablonnière**.
- **Engineered by** [Johan_nlb](https://github.com/JinKaneki) (Jin Kaneki)
- Inspired by Linux ricing communities, Medieval Cistercian monks and the pursuit of compact data visualization and the TTC.
- Wallpaper collection sourced from [0xnotkyo/walls](https://github.com/0xnotkyo/walls)
- Tao Te Ching text (public domain) translated by **Stephen Mitchell**.


## 🧠 Philosophy
  > "All things serve the Steam. XD"

This project demonstrated that even a simple utility like a clock can be elevated through high‑level engineering, browser‑specific APIs, and unique historical aesthetics. 
Focused on **"The Tao of Ricing"** balancing high-tech aesthetics with low-distraction utility.
