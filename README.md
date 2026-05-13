# Elite Gems Dashboard: Persistent Ambient Dashboard Fancy Analog/Digital/Cistercian Clock AOD 🕰️

**An "Always-On" productivity clock and personal gallery engineered for professional workspaces.**
**An ambient, cyber‑punk inspired dashboard with multiple clock faces, a rotating image gallery, and a powerful built‑in terminal command runner(CLI).**

Live at : [https://jinkaneki.github.io/EliteGDX/]

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
  - **Key ``:** Keyboard shortcut for the same stealth freeze.
  - **Key ``:** Cycles through clock styles (classic → glass → digital).
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
- **Toggle with button or keyboard** – press ` ` (or click the `🖥️ System Info` button) to open/close the terminal. `Escape` closes it.
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
- Use the `STYLE` button or press ` ` to cycle through **Classic → Glass → Digital → Cistercian**.
- PRESS ` ` to freeze or pause Background Image or on Android double TAP on your screen on an empty space on the webpage, AVOID any element on the webpage while doing it.

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
/
├── index.html                     # Main dashboard (all HTML)  
├── manifest.json                  # PWA manifest  
├── sw.js                          # Service worker (offline cache)  
├── sitemap.xml                    # SEO sitemap  
├── images/                        # Slideshow & background images  
│   └── independentBGImages/       # Optimized mobile background images  
├── sounds/                        # Audio files (siren, etc.)  
├── TTC/                           # Local data  
│   └── Tao_te_ching.json          # Tao Te Ching chapters  
├── styles/
│   └── styles.css                 # Main Stylesheet  
├── script/
│   └── app.js                     # Main Application Logic  
└── README.md                      # Documentation  

## ⌨️ CLI Reference
  "You know how some people have a clock screensaver? I made something way cooler. It's a web page I keep open that not only tells time but also lets me type commands. I can type 'weather Tokyo' and it shows me the forecast. I can type 'tv nasa' and it plays a live stream from the space station. It also shows inspirational quotes, plays music, and even has a secret 'Intersect' flash. It's like my own little command center." **-Jin Kaneki**
### 💻 J_OS // AKASHIC ZERO-POINT KRYPTOS NEURAL CENTER (AZKNC)
The built‑in command runner—a full‑featured terminal emulator with over 50 commands, fullscreen support, and a cyber‑mystical aesthetic.

### Command Categories

**⚡ System & Utility**  
`help` `about` `clear` `echo` `whoami` `ls` `history` `shutdown` `sudo` `login` `sytem` `ping` `date` `spinner` `stopspinner` `timer` `stoptimer` `nuke`

**🎨 Theme & UI**  
`theme` `pause` `fetchpanel` `fastfetch` `fetch` `neofetch` `zoom` `mode`

**📡 NETWORK & COMMUNICATION**
`chat` `status` `disconect` `mesh` `aprsmap` `meshmap` `netorbit`

**📰 News & Information**  
`news` `hackernews` `technology` `weather` `crypto` 

**📚 Learning & Reference**  
`define` `wiki` `physics` `electronics` `biology` `space` `cstip` `learn` `fortune` `motd`

**🔐 Akashic Cipher Suite**   
`cipher`

**🕵️ Cyber Ops**   
`kali` `hashcat` `wifite` `flipper` `nmap` `airmon` `raspberry` `gpio`

**🧘 Wisdom & Spirituality**  
`tao` `wisdom` `sutra` `buddha` `koan` `stoic` `bible` `verse`

**🎭 Fun & Entertainment**  
`joke` `riddle` `game` `run` `poem` `ascii` `poetry` `anime` `qr` `radio` `tv` `play youtube` `play audio` `stop` `cowsay` `hack` `htop` `react` `rotate`  `banner` `piano` `homing`

**🖼️ Visuals & Effects**  
`image` `walls` `glitch` `scroll` `intersect` `intersectslow` `graph`

**Type `help` to see the full list.**
## 💻 Terminal Command Runner(CLI)

| Command               | Description |
|-----------------------|-------------|
| `help`                | List all available commands |
| `about`               | Read the story behind J_OS and its Akashic origin |
| `clear`               | Clear terminal output |
| `echo [text]`         | Print text |
| `whoami`              | Rotating cyber‑spiritual persona |
| `ls`                  | List fake directories |
| `sudo`                | Try to make a sandwich (say please) |
| `history`             | Show command history |
| `fetch`               | Open the original gem‑logo system panel |
| `neofetch`            | Trigger the JOHAN_OS system info |
| `fastfetch`           | Display system info with a random Linux logo (Debian, Arch, Kali) |
| `fetchpanel`          | Show the fastfetch panel floating outside the terminal |
| `shutdown`            | Enter Magic Mirror mode |
| `motd`                | Message of the Day – random mystical status |
| `system`              | Unified neural link status (auth, audio feed, uptime) |
| `ping`                | Test network latency to Google |
| `date` [utc\|iso\|unix] | Display current date/time with optional formats |
| `spinner`             | Start a terminal spinner animation |
| `stopspinner`         | Stop the running spinner |
| `timer [seconds]`     | Start a countdown with Morse beeps (bigger font) |
| `stoptimer`           | Cancel a running countdown |
| `theme [name]`        | Switch color profile (cyan, magenta, amber, matrix) |
| `mode [name\|off]`    | Terminal theme (flipper, midnight, matrix, crimson, cyber) |
| `zoom [in\|out\|reset]` | Adjust output text size |
| `pause`               | Freeze/unfreeze background |
| `news`                | BBC World News headlines |
| `hackernews`          | Top 5 Hacker News stories |
| `crypto [coin]`       | Live cryptocurrency price |
| `technology`          | Curated tech news (Verge, Ars Technica, TechCrunch, Wired) |
| `weather [city]`      | Weather for a city (type alone for automatic IP‑based location)|
| `define [word]`       | Full dictionary entry with phonetics, definitions, synonyms, antonyms |
| `wiki [topic]`        | Wikipedia summary lookup |
| `learn`               | Random educational fact |
| `physics`             | Random physics/math formula |
| `electronics`         | Electronics formulas and hardware facts |
| `engineering`         | Engineering marvels and history |
| `biology`             | Fascinating biology facts |
| `space`               | Random astronomy fact |
| `cstip`               | Computer science tip |
| `fortune`             | Unix/coding fortune |
| `cipher`              | Full usage manual for all ciphers (encrypt/decrypt) |
| `case`                | Engineering diagnostics (resistor, decode, Ohm's Law, etc.) |
| `encode [msg]`        | Base64 encode a message |
| `decode [b64]`        | Decode a Base64 string |
| `shift [n] [msg]`     | Caesar cipher (letters and digits wrap) |
| `kryptos [enc\|dec] [bin\|hex] [text]` | Convert text to/from binary or hex stream |
| `vigenere [enc\|dec] [key] [msg]` | Vigenère cipher |
| `mirror [msg]`        | Atbash mirror cipher (self‑inverse) |
| `vault [enc\|dec] [pw] [msg]` | AES‑256‑GCM encryption (real, password‑based) |
| `handshake [set\|clear] [key]` | Store or clear a personal encryption key locally |
| `steg [hide\|reveal] "cover" "secret"` | Steganography – hide & extract secret messages inside normal text |
| `tag [set\|get\|clear\|view] [key] [value]` | Cipher dictionary – store, retrieve, list, or delete hidden key‑value pairs |
| `kali [module]`       | Pentest toolbox: hash, scan, crack, inject, genkey, dragon, arch |
| `wifite`              | Wi‑Fi attack simulation |
| `airmon [iface]`      | Monitor mode simulation |
| `nmap [target]`       | Nmap scan simulation |
| `hashcat`             | Cinematic hash cracking |
| `flipper [subghz\|nfc\|badusb\|off]` | Flipper Zero emulator |
| `raspberry`           | Virtual Raspberry Pi system dashboard (temps, uptime, GPIO) |
| `gpio [status\|on\|off] [pin]` | Raspberry Pi GPIO pin simulator |
| `chat mqtt`           | Global public frequency chat (IoT / radio vibe) |
| `chat p2p`            | Encrypted peer‑to‑peer direct tunnel |
| `chat firebase`       | Persistent chat archive with message history |
| `chat -all`           | Open all three channels at once |
| `status`              | Show live connection status for all chat protocols |
| `disconnect`          | Gracefully shut down all network connections |
| `mesh`                | Animated LoRa mesh topology simulator (canvas) |
| `aprsmap [fi\|direct]` | Live APRS amateur radio map (choose source) |
| `meshmap`             | Live Meshtastic node map (MQTT network) |
| `netorbit [--green\|--red\|--violet]`| Live world map (Braille‑style dot matrix) + packet sniffing|
| `nuke`                | Factory reset – clears localStorage, stops animations, resets terminal |
| `tao`                 | Random Tao Te Ching chapter |
| `wisdom`              | Inspirational quote |
| `sutra`               | Buddhist teaching from the Pali Canon |
| `buddha`              | Quote from Buddha, Dogen, Thich Nhat Hanh |
| `koan`                | Random Zen koan |
| `stoic`               | Stoic wisdom (Marcus Aurelius, Seneca) |
| `bible` / `verse`     | Random Bible verse |
| `joke`                | Random dad joke |
| `riddle`              | Riddle with hidden answer (click to reveal) |
| `poem` / `poetry`     | Classic poetry |
| `anime`               | Top 10 anime + currently airing |
| `qr [text]`           | Generate scannable QR code |
| `play youtube <id/url>`   | Embed YouTube video player in the terminal |
| `play audio <preset>` | Start playing a built‑in sound. Available presets:<br>`siren`, `bell`, `gong`, `ascension`, `medit`, `deeptown`, `elite`, `cote` |
| `play audio <preset> -loop` | Play a preset in a continuous loop (stops when you type `stop`). |
| `play audio <url>` | Play an external audio file (must be a direct link to a `.mp3`, `.ogg`, `.wav`, etc.). |
| `radio [channel]`     | Tune into a curated radio channel |
| `tv [channel]`        | Watch a curated live TV feed (NASA, ISS, Lofi, Gumball) |
| `stop`                | Stop all currently playing media (YouTube and audio) |
| `cowsay [text]`       | An ASCII cow speaks your message |
| `ascii [1‑7]`         | Display specific cyber‑mystical ASCII art (random if no number) |
| `hack`                | Simulate a fake hacking sequence (animated) |
| `htop`                | Show a fake system monitor (CPU, memory, processes) |
| `react`               | Simulate a React build process |
| `rotate`              | Matrix‑style character scrambler animation |
| `image`               | Display a random Picsum photo |
| `walls`               | Fetch a random wallpaper from 0xnotkyo/walls |
| `glitch`              | Activate glitch effect for 10 seconds |
| `scroll`              | Bouncy terminal scroll animation |
| `intersect`           | Neural‑link flash sequence (45 sec) |
| `homing`              | Start a continuous homing tone (bypasses volume slider) |
| `intersectslow`       | Deep neural integration (60 sec) |
| `siren`              | Play the 1‑minute civil defense siren (local MP3) |
| `login`               | Display the J_OS Akashic Zero‑Point Kryptos Neural Center splash screen |
| `game [snake\|dodge\|marble\|asteroids\|flappy\|dino]` | Play interactive canvas games (Snake, Gyro Dodge, Ball Maze, Asteroids, Cyber‑Bird) with D‑pad and gyro controls |
| `game snake noclip`  | Classic Snake with portal-wrapping walls (never die from walls or tail) |
| `game dino godmode`  | Cyber‑packet runner in god mode (invincible, obstacles pass through you) |
| `sator`              | Interactive 4×4 Sator word square puzzle |
| `reverse [message]`  | Reverse‑text cipher (TENET inversion) |
| `palindrome [check\|square\|tenet\|make]` | Palindrome verifier, maker & ancient Sator Square and the Pater Noster anagram |
| `run`                | Cyberpunk text RPG – reclaim the Akashic Mainframe |
| `piano`              | Interactive on‑screen piano with sustain, chords, and keyboard |
| `flow`               | Extract a random "Thought Seed" |
| `graph`              | Toggle the live Obsidian graph command‑co‑occurrence overlay |

## 🧠 Neural Graph
- **`graph`** – Toggle the live command‑co‑occurrence overlay (Obsidian‑style).
- **`brain clear`** – Erase all nodes and connections.
- **`brain layout`** – Toggle between freeform and circular layout.

## 📖 Cyberpunk RPG (`run`)
Type `run` to start a branching text adventure where you play as Neo‑J, a neural operative battling the rogue AI KRYPTOS. All game choices are entered directly in the terminal. Type `exit` to leave the RPG. Three different endings await.

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

### 🎧 Built‑in Audio Presets

The `play audio` command now accepts shortcut names:

- `play audio siren` – Civil defense siren
- `play audio bell` – Large church bells
- `play audio gong` – Temple gong
- `play audio ascension` – Ascension ambient
- `play audio medit` – Meditation music
- `play audio deeptown` – DeepTown routine (used in RPG)
- `play audio elite` – Ayano Sinister Schemes (used in RPG)
- `play audio cote` – COTE A‑Class Arisu (used in RPG)

add -loop at the end to play in a continuous loop. e.g: `play audio ascension -loop` until you type `stop`

## 🗺️ NetOrbit – Global Packet Map

`netorbit` draws an animated world map with moving packets and live telemetry, inspired by [NetOrbit](https://github.com/ZXCurban/NetOrbit)

### 🖼️ Slideshow Overlay
`slide` – Start / stop an automatic 30‑second image rotation  
`slide src gallery` – Use the main gallery images (default)  
`slide src indie` – Use independent background images  
`slide next` – Skip to the next image  
`slide prev` – Go back to the previous image  
`slide pause` / `slide resume` – Pause / resume the timer

### 🕵️ Steganography vs. Tag Store

| Feature               | Steganography (`steg`)                       | Cipher Dictionary (`tag`)               |
|-----------------------|----------------------------------------------|-----------------------------------------|
| **Logic**             | Data is hidden inside the text itself.       | Data is hidden in your browser's memory.|
| **Persistence**       | If you delete the text, the secret is gone.  | If you delete the text, the secret stays in the terminal. |
| **Portability**       | You can send the "steg" text to a friend; they can reveal it. | If you send the word "Apple" to a friend, they see nothing. |
| **The "Reveal"**      | You must Paste the specific invisible‑ink word. | You just type the Keyword (e.g., `tag get Apple`). |
| **List stored items** | Not applicable – nothing is stored.         | `tag view` – shows all saved keys.      |

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

## 🧘 Final Reflection

The **J_OS // AKASHIC ZERO-POINT KRYPTOS NEURAL CENTER** console now supports:

- 🔮 **Mystical wisdom** (`tao`, `sutra`, `koan`, `stoic`, `buddha`, `bible`, `verse`, `wisdom`)
- 📡 **Live information** (`news`, `technology`, `hackernews`,`weather`)
- 🛠️ **Engineering diagnostics** (`case`, `physics`, `electronics`, `engineering`)
- 🎬 **Media playback** (`play youtube`, `play audio`, `radio`, `tv`, `stop`)
- 🖼️ **Ambient visuals** (`walls`, `intersect`, `intersectslow`, `matrix`, `image`, `scroll`)
- 🧠 **System introspection** (`fastfetch`, `system`, `whoami`, `about`, `ping`, `date`, `spinner`, `stopspinner`, `timer`, `history`, `motd`, `login`, `nuke`)
- 🔐 **Akashic Cipher Suite** (`encode`/`decode`, `shift`, `kryptos`, `vigenere`, `mirror`, `vault`, `handshake`)
- 🕵️ **Cyber Ops** (`steg`, `tag`, `kali`)
- 📡 **Network & Communication** (`chat mqtt`, `chat p2p`, `chat firebase`, `status`, `disconnect`, `mesh`, `aprsmap`, `meshmap`)
- 🎭 **Fun & Entertainment** (`joke`, `riddle`, `poem`, `poetry`, `anime`, `qr`, `cowsay`, `ascii`, `hack`, `react`, `htop`, `fortune`, `rotate`)
- ⚙️ **Utilities** (`theme`, `clear`, `sudo`, `fetch`, `neofetch`, `history`, `pause`, `shutdown`, `echo`, `ls`, `whoami`)

It is functionally complete, aesthetically cohesive, and ready for daily use as an ambient always‑on companion for your workspace or as a fast information retrieval and communication tool.

## version 1.0 Change Log(Base)
## 📜 Version 2.1 Change Log(Aesthetics) (March 2026)

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

## version 3.0 Change Log(CyberAkashicMystic) (April 2026)
| Date | Change |
|------|--------|
| 2026‑04‑11 | Added Cyber‑Fetch terminal with JOHAN_OS ASCII + maple leaf |
| 2026‑04‑11 | Added ` ` keyboard shortcuts to toggle System Info panel |
| 2026‑04‑11 | Made terminal bulletproof with try/catch and fallbacks |
| 2026‑04‑11 | Fixed mobile overflow – horizontal scrolling or size reduction |
| 2026‑04‑10 | Added Hide Controls button (top‑left) |
| 2026‑04‑10 | Improved sticky footer and removed double scrollbars |
| 2026‑04‑09 | Added responsive Cistercian clock sizes |
| 2026‑04‑08 | Integrated rainbow colours for Cistercian numerals |

## 📜 Version 4.0 Change Log(CyberOps) (May 2026)

The "Akashic Update" transforms the dashboard into a comprehensive information retrieval & cyber‑operations hub, with over 40 new commands, a full cipher suite, media playback, and live data feeds.

| Feature | Description | Interaction |
| :--- | :--- | :--- |
| **Command Runner** | Built‑in terminal with sync/async router, HTML output, and fullscreen mode. | `💻 Command Runner` button, `⛶ Fullscreen` |
| **Login & Identity** | Majestic Akashic splash with rotating header, typewriter names, and `whoami` personas. | Auto on terminal open, `login`, `whoami`, `motd`, `about` |
| **News & Information** | BBC World News, Hacker News, curated tech headlines, weather. | `news`, `hackernews`, `technology` |
| **Dictionary & Learning** | Full phonetic dictionary, physics/math formulas, electronics facts, engineering marvels, biology, space, CS tips. | `define`, `physics`, `electronics`, `engineering`, `biology`, `space`, `cstip`, `learn`, `fortune` |
| **Engineering Diagnostics** | Resistor calculator, color code decoder, Ohm's Law, voltage divider, capacitor decoder, parallel/series. | `case` (interactive), `case resistor`, `case decode`, etc. |
| **Wisdom & Spirituality** | Tao Te Ching, Bible verses, Buddhist sutras, Zen koans, Stoic quotes, Buddha quotes. | `tao`, `bible`, `verse`, `sutra`, `koan`, `stoic`, `buddha`, `wisdom` |
| **Media Playback** | YouTube video/playlist/tv embedding, direct audio streaming, curated radio stations, live TV feeds (NASA, ISS, Lofi, Gumball). | `play youtube`, `play audio`, `radio [channel]`, `tv [channel]`, `stop` |
| **Akashic Cipher Suite** | Base64 encode/decode, Caesar shift (with digit wrap), Binary/Hex streams, Vigenère cipher, Atbash mirror, AES‑256‑GCM vault with handshake password. | `encode`, `decode`, `shift`, `kryptos`, `vigenere`, `mirror`, `vault`, `handshake` |
| **Steganography & Tag Store** | Hide secret messages inside normal text via zero‑width characters; permanent private tag dictionary. | `steg hide/reveal`, `tag set/get/view/clear` |
| **Kali Pentest Suite** | Real SHA‑256 hashing, simulated port scans, brute‑force cracking, payload injection, SSH keygen, Kali dragon banner. | `kali hash/scan/crack/inject/genkey/banner` |
| **Fun & Utility** | Riddles with reveal, dad jokes, random facts, QR codes, anime top 10, poetry, cowsay, coinflip, 8‑ball, rainbow text. | `joke`, `riddle`, `fact`, `qr`, `anime`, `poem`, `cowsay` |
| **Visual Effects** | Glitch matrix, terminal scroll bounce, animated fake hacking, React build simulator, text rotation scrambler. | `matrix`, `scroll`, `hack`, `react`, `rotate` |
| **Timers & Diagnostics** | Countdown with Morse beeps, network ping (real), system monitor (`htop`), spinner animation. | `timer`, `ping`, `htop`, `spinner`/`stopspinner` |
| **ASCII Art Gallery** | 5+ cyber‑mystical ASCII pieces: J_OS box, meditating monk, Debian swirl, Arch Linux, Kali dragon, Akashic emblem. Selectable by index. | `ascii`, `kali arch` |
| **Factory Reset** | `nuke` command clears all local data, stops animations, and resets terminal to Zero‑Point. | `nuke` |
| **UI & Mobile Polish** | Compressed terminal output for small screens, fixed ASCII wrapping, login splash responsive font, fullscreen support, `cipher` reference manual. | Automatic |

---

- *Version 4.0 makes J_OS a fast persistent information retrieval tool, a personal cipher lab, and an ambient workspace companion, all accessible from a single CLI.*
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
    git clone [https://github.com/JinKaneki/EliteGDX.git](https://github.com/JinKaneki/EliteGDX.git)
    cd EliteGDX
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
- Tao Te Ching text (public domain) translated by **Stephen Mitchell**.


## 🧠 Philosophy
  > "All things serve the Steam. XD"

This project demonstrated that even a simple utility like a clock can be elevated through high‑level engineering, browser‑specific APIs, and unique historical aesthetics. 
Focused on **"The Tao of Ricing"** balancing high-tech aesthetics with low-distraction utility.
