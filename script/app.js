        window.addEventListener('load', () => {
            const bootStatuses = ["J-OS BOOTING", "AKASHIC SYNC", "NEURAL LINK ACTIVE"];
            triggerGhost(bootStatuses[Math.floor(Math.random() * bootStatuses.length)]);
        });
        // --- 1. AUDIO CONTEXT SETUP ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        let audioCtxResumed = false;

        function resumeAudioContext() {
            if (!audioCtxResumed && audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    audioCtxResumed = true;
                    console.log('AudioContext resumed');
                }).catch(e => console.warn('AudioContext resume failed', e));
            }
        }

        document.body.addEventListener('click', resumeAudioContext, { once: false });

        // --- 2. VOLUME & MUTE LOGIC ---
        const muteBtn = document.getElementById('mute-btn');
        const volumeSlider = document.getElementById('volume-slider');

        // One single source of truth for volume
        let currentVolume = parseFloat(volumeSlider.value); 
        let previousVolume = currentVolume; 

        // Mute Toggle Event
        muteBtn.addEventListener('click', () => {
            if (currentVolume > 0) {
                // Muting: Store current value, set to zero
                previousVolume = currentVolume;
                currentVolume = 0;
                volumeSlider.value = 0;
                muteBtn.innerText = "🔇";
                muteBtn.style.opacity = "0.5";
            } else {
                // Unmuting: Restore previous or default to 0.06
                currentVolume = previousVolume > 0 ? previousVolume : 0.06;
                volumeSlider.value = currentVolume;
                muteBtn.innerText = "🔊";
                muteBtn.style.opacity = "0.7";
            }
        });

        // Slider Input Event
        volumeSlider.addEventListener('input', (e) => {
            currentVolume = parseFloat(e.target.value);
            
            // Auto-update icon if user slides to zero
            if (currentVolume === 0) {
                muteBtn.innerText = "🔇";
                muteBtn.style.opacity = "0.5";
            } else {
                muteBtn.innerText = "🔊";
                muteBtn.style.opacity = "0.7";
            }
        });

        // --- 3. THE ANALOG TICK GENERATOR ---
        function playTick(isTock = false) {
            // Resume context (needed for browser security policies)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Performance Guard: Don't process audio if muted
            if (currentVolume <= 0) return;

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            // Square wave gives that mechanical "click"
            osc.type = 'square';
            
            // Frequency: Tock (400Hz) is deeper than Tick (800Hz)
            osc.frequency.setValueAtTime(isTock ? 400 : 800, audioCtx.currentTime);

            // Filter: Lowpass at 7000Hz keeps it crisp but not "buzzy"
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(7000, audioCtx.currentTime); 

            // Volume calculation (Tock is 1.5x louder for emphasis)
            const volumeLevel = isTock ? currentVolume * 1.5 : currentVolume;
            
            // Percussive Envelope: Fast attack, 90ms decay
            gain.gain.setValueAtTime(volumeLevel, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);

            // Routing: Osc -> Filter -> Gain -> Speakers
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.03); // Stop osc after 30ms
        }


        // RPG State
        window._rpg = {
            active: false,
            chapter: null,
            inventory: [],
            health: 100
        };
        
        // --- CYBER-FETCH ENGINE ---
        const fetchTerminal = document.getElementById('cyber-fetch-terminal');
        const fetchContent = document.getElementById('fetch-content');
        const closeFetchBtn = document.getElementById('close-fetch');
        const openFetchBtn = document.getElementById('open-fetch-btn');

        // Properly aligned ASCII Logo (Gem shape)
        const asciiLogo = `<pre class="fetch-logo">
             /\\
            /  \\
           /____\\
          /\\    /\\
         /  \\  /  \\
        /____\\/____\\
        \\    /\\    /
         \\  /  \\  /
          \\/____\\/
           \\    /
            \\  /
             \\/
        </pre>`;

        function generateFetchData() {
            document.getElementById('cyber-fetch-terminal').classList.remove('fastfetch-mode');
            // --- Improved OS detection ---
            let os = 'Unknown';
            try {
                const ua = navigator.userAgent;
                if (ua.includes('Windows')) os = 'Windows';
                else if (ua.includes('Mac')) os = 'macOS';
                else if (ua.includes('Linux')) os = 'Linux';
                else if (ua.includes('Android')) os = 'Android';
                else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                else if (navigator.userAgentData?.platform) os = navigator.userAgentData.platform;
                else if (navigator.platform) os = navigator.platform;
            } catch(e) { os = 'Unknown'; }

            // --- GPU Detection via WebGL ---
            let gpu = 'Unknown';
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    }
                }
            } catch(e) {}
            if (!gpu || gpu === 'Unknown') gpu = 'Integrated Graphics';

            // --- Hardware info ---
            const cores = navigator.hardwareConcurrency || '?';
            const ram = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '? GB';
            const resolution = `${window.screen.width}×${window.screen.height}`;

            // --- Browser detection ---
            let browser = 'Unknown';
            const ua = navigator.userAgent;
            if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Safari')) browser = 'Safari';
            else if (ua.includes('Edge')) browser = 'Edge';

            // --- Network info ---
            let conn = 'Unknown';
            try {
                conn = navigator.connection ? navigator.connection.effectiveType : 'Unknown';
            } catch(e) {}

            // --- Uptime ---
            const uptimeSec = Math.floor(performance.now() / 1000);
            const uptimeMin = Math.floor(uptimeSec / 60);
            const uptimeHours = Math.floor(uptimeMin / 60);
            const uptimeStr = uptimeHours > 0 ? `${uptimeHours}h ${uptimeMin % 60}m` : `${uptimeMin}m ${uptimeSec % 60}s`;

            // --- Dynamic package count (number of commands in your 'commands' object) ---
            const packageCount = (typeof commands === 'object' && commands) ? Object.keys(commands).length : 42;

            const themeMode = document.body.classList.contains('light-mode') ? 'Light Mode' : 'Cyber-Dark';

            // --- Sacred Status (random each time) ---
            const sacredStatuses = [
                // Original set
                "CONNECTED TO ETHER",
                "ZERO-POINT STABLE",
                "KRYPTOS ENCRYPTED",
                "VOID-WALKING",
                "AKASHIC ALIGNED",
                "NEURAL SYNC",
                "QUANTUM ENTANGLED",
                // Cyberpunk / High-Tech
                "ONYX CONSOLE ACTIVE",
                "NEON LINK ESTABLISHED",
                "PHANTOM SHELL SECURE",
                "OBSIDIAN TERMINAL ONLINE",
                "SIGNAL-9 LOCKED",
                "GLITCH-CORE NOMINAL",
                // Sacred / Mythological
                "DHARMA TERMINAL ATTUNED",
                "AETHER LINK RESONANT",
                "ORACLE NODE LISTENING",
                "SAMSARA CYCLE STABLE",
                "AKASHIC RECORDS INDEXED",
                "ZENITH POINT REACHED",
                "DIGITAL KOAN: SOLVED",
                // Personal OS / Protocol
                "J-OS: CORE INTERFACE",
                "J.O.H.A.N. PROTOCOL ACTIVE",
                "NEURAL GATEWAY OPEN",
                "AXON FIRING",
                "SYNAPSE LINKED",
                "MONOLITH UNMOVED",
                "ECHO-BASE RECEIVING"
            ];
            const sacredStatus = sacredStatuses[Math.floor(Math.random() * sacredStatuses.length)];

            // Helper for a single row – same as in fastfetch, slightly larger label
                const infoRow = (label, value, color = '#00ffff') => `
                    <div style="display: flex;">
                        <span style="width: 7em; flex-shrink: 0; color: ${color}; text-align: right; margin-right: 10px;">${label}</span>
                        <span style="color: #fff; word-break: break-word;">${value}</span>
                    </div>`;

                const systemInfo = `
                    <div class="gem-info" style="display: flex; flex-direction: column; gap: 3px; margin-left: 0px;">
                        ${infoRow('OS:', os)}
                        ${infoRow('Host:', 'Elite Gems Web Engine')}
                        ${infoRow('Kernel:', 'Browser Sandbox (V8)')}
                        ${infoRow('Shell:', 'Akashic J_OS Shell')}
                        ${infoRow('Uptime:', uptimeStr)}
                        ${infoRow('Packages:', `${packageCount} (commands)`)}
                        ${infoRow('Resolution:', resolution)}
                        ${infoRow('DE/WM:', 'HTML5 / CSS3 Flex')}
                        ${infoRow('Theme:', themeMode)}
                        ${infoRow('Terminal:', browser)}
                        ${infoRow('CPU:', `${cores} Logical Cores`)}
                        ${infoRow('GPU:', gpu)}
                        ${infoRow('Memory:', ram)}
                        ${infoRow('Network:', conn)}
                        ${infoRow('Status:', sacredStatus, '#ff00ff')}
                        <div style="margin-top: 4px;">
                            <span style="color:#ff5733;">███</span><span style="color:#ffd733;">███</span><span style="color:#33ff57;">███</span><span style="color:#00f0ff;">███</span><span style="color:#3357ff;">███</span><span style="color:#f033ff;">███</span>
                        </div>
                    </div>`;

                fetchContent.innerHTML = asciiLogo + systemInfo;   // systemInfo is already a <div>, no need to wrap again
            }


        function toggleFetch() {
            const isActive = fetchTerminal.classList.contains('active');
            if (!isActive) {
                generateFetchData();   // refresh data each time
                if (typeof playTick === 'function') playTick(true);
            }
            fetchTerminal.classList.toggle('active');
        }

        // --- Open button(Top Sytem Info) ---
        if (openFetchBtn) {
            openFetchBtn.addEventListener('click',toggleFetch)
        }
        // --- Close button (X) ---
        if (closeFetchBtn) {
            closeFetchBtn.addEventListener('click', toggleFetch);
        }


        // --- Keyboard shortcuts: 'q' to toggle, 'Escape' to close ---
        // document.addEventListener('keydown', (e) => {
        //    const key = e.key.toLowerCase();
        //    if (key === 'q') {
        //         e.preventDefault();    prevent typing the character
        //        toggleFetch();
        //    }
        //    if (key === 'escape' && fetchTerminal.classList.contains('active')) {
        //         toggleFetch();
        //    }
        //});

        // --- JOHAN_OS SYSTEM INFO (NEOFETCH STYLE) ---
        const fetchContainer = document.getElementById('neofetch-container');
        const toggleBtn = document.getElementById('toggle-fetch-btn');
        let dataFetched = false;

        async function fetchSystemInfo() {
            const infoDiv = document.getElementById('system-info');

            // --- Basic info (synchronous) with fallbacks ---
            const os = getOS();                      // helper below
            const browser = getBrowser();            // helper below
            const resolution = `${window.screen.width}×${window.screen.height}`;
            const ram = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Protected';
            const cores = navigator.hardwareConcurrency || 'N/A';
            const online = navigator.onLine ? 'Yes' : 'No';

            // --- Advanced info (async, with try/catch) ---
            let battery = 'Unknown';
            let storage = 'Hidden';

            try {
                if ('getBattery' in navigator) {
                    const b = await navigator.getBattery();
                    battery = `${(b.level * 100).toFixed(0)}%`;
                }
            } catch (err) {
                console.warn('Some hardware APIs were blocked or failed:', err);
            }

            // --- Render the data ---
            infoDiv.innerHTML = `
                <div style="color: var(--accent-color); font-weight: bold;">root@johan_os</div>
                <div style="color: #555; margin-bottom: 8px;">---------------</div>
                <div><span style="color: var(--accent-color);">OS:</span> ${os}</div>
                <div><span style="color: var(--accent-color);">Browser:</span> ${browser}</div>
                <div><span style="color: var(--accent-color);">Resolution:</span> ${resolution}</div>
                <div><span style="color: var(--accent-color);">Battery:</span> ${battery}</div>
                <div><span style="color: var(--accent-color);">RAM:</span> ${ram}</div>
                <div><span style="color: var(--accent-color);">CPU threads:</span> ${cores}</div>
                <div><span style="color: var(--accent-color);">Online:</span> ${online}</div>
            `;
            dataFetched = true;
        }

        // Helper: detect OS from userAgent
        function getOS() {
            const ua = navigator.userAgent;
            if (ua.includes('Win')) return 'Windows';
            if (ua.includes('Mac')) return 'macOS';
            if (ua.includes('Linux')) return 'Linux / Pi';
            if (ua.includes('Android')) return 'Android';
            return 'Unknown OS';
        }

        // Helper: detect browser
        function getBrowser() {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Brave')) return 'Brave';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari')) return 'Safari';
            return 'Other';
        }

        // Toggle visibility on button click
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                if (fetchContainer.style.visibility === 'hidden') {
                    if (!dataFetched) await fetchSystemInfo();
                    fetchContainer.style.visibility = 'visible';
                    playTick(true);   // optional sound feedback (uses your existing playTick)
                } else {
                    fetchContainer.style.visibility = 'hidden';
                    playTick(true);
                }
            });
        }

        const typewriterElement = document.getElementById('typewriter');
        const names = ["JIN KANEKI", "JOHN COHEN","@_@","THE OBSERVER","DARK SAMURAI","THE WANDERER","JIN LEE","KANJIN","How many names have you counted?",":)"];
        let nameIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;

        function type() {
            const currentName = names[nameIndex];
            
            if (isDeleting) {
                // Remove characters
                typewriterElement.textContent = currentName.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 50; // Deleting is usually faster
            } else {
                // Add characters
                typewriterElement.textContent = currentName.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 150; // Typing speed
            }

            // Logic for pausing at the end of a word
            if (!isDeleting && charIndex === currentName.length) {
                isDeleting = true;
                typeSpeed = 5000; // Wait 2 seconds =2000 before starting to delete
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                nameIndex = (nameIndex + 1) % names.length; // Move to next name
                typeSpeed = 1000; // Small pause before typing next name 100
            }

            setTimeout(type, typeSpeed);
        }

        // Start the effect
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(type, 1000); // Wait 1 second after page load to start
        });

        const hourHand = document.getElementById('hour');
        const minuteHand = document.getElementById('minute');
        const secondHand = document.getElementById('second');
        const themeToggle = document.getElementById('theme-toggle');
        const freezeBtn = document.getElementById('freeze-btn');
        const body = document.body;

        // Slideshow Variables
        let blocks = Array.from(document.querySelectorAll('.block'));
        let currentBlockIndex = 0;
        let lastMinute = new Date().getMinutes();
        let isFrozen = false;

        // Function to Shuffle the Array (Fisher-Yates Algorithm)
        function shuffleBlocks() {
            for (let i = blocks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
            }
        }

        // Initial Shuffle so it's random every time you refresh
        shuffleBlocks();

        // Initialize: Show the first random block
        if(blocks.length > 0) {
            blocks.forEach(b => b.classList.remove('active')); // Clean slate
            blocks[0].classList.add('active');
        }

        // Freeze Toggle Logic
        freezeBtn.addEventListener('click', () => {
            isFrozen = !isFrozen;
            freezeBtn.classList.toggle('frozen');
            freezeBtn.innerText = isFrozen ? "🔥 Resume Loop" : "❄️ Freeze Image";
        });

        const themeLabel = document.getElementById('theme-label');
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            themeLabel.innerText = body.classList.contains('light-mode') ? '' : '';// 'Light Mode' : 'Dark Mode';
        });

        function generateFastfetchPanelParts() {
            // --- System detection (same as fastfetch) ---
            let os = 'Unknown';
            try {
                const ua = navigator.userAgent;
                if (ua.includes('Windows')) os = 'Windows';
                else if (ua.includes('Mac')) os = 'macOS';
                else if (ua.includes('Linux')) os = 'Linux';
                else if (ua.includes('Android')) os = 'Android';
                else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                else if (navigator.userAgentData?.platform) os = navigator.userAgentData.platform;
                else if (navigator.platform) os = navigator.platform;
            } catch(e) {}

            let gpu = 'Unknown';
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            } catch(e) {}
            if (!gpu || gpu === 'Unknown') gpu = 'Integrated Graphics';

            let browser = 'Browser';
            const ua = navigator.userAgent;
            if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Safari')) browser = 'Safari';
            else if (ua.includes('Edge')) browser = 'Edge';

            const cores = navigator.hardwareConcurrency || '?';
            const ram = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '? GB';
            const resolution = `${window.screen.width}×${window.screen.height}`;

            let conn = 'Unknown';
            try { conn = navigator.connection ? navigator.connection.effectiveType : 'Unknown'; } catch(e) {}

            const uptimeSec = Math.floor(performance.now() / 1000);
            const uptimeMin = Math.floor(uptimeSec / 60);
            const uptimeHours = Math.floor(uptimeMin / 60);
            const uptimeStr = uptimeHours > 0 ? `${uptimeHours}h ${uptimeMin % 60}m` : `${uptimeMin}m ${uptimeSec % 60}s`;

            const packageCount = (typeof commands === 'object' && commands) ? Object.keys(commands).length : 42;

            const sacredStatuses = [ 
                 // Original set
                "CONNECTED TO ETHER",
                "ZERO-POINT STABLE",
                "KRYPTOS ENCRYPTED",
                "VOID-WALKING",
                "AKASHIC ALIGNED",
                "NEURAL SYNC",
                "QUANTUM ENTANGLED",
                // Cyberpunk / High-Tech
                "ONYX CONSOLE ACTIVE",
                "NEON LINK ESTABLISHED",
                "PHANTOM SHELL SECURE",
                "OBSIDIAN TERMINAL ONLINE",
                "SIGNAL-9 LOCKED",
                "GLITCH-CORE NOMINAL",
                // Sacred / Mythological
                "DHARMA TERMINAL ATTUNED",
                "AETHER LINK RESONANT",
                "ORACLE NODE LISTENING",
                "SAMSARA CYCLE STABLE",
                "AKASHIC RECORDS INDEXED",
                "ZENITH POINT REACHED",
                "DIGITAL KOAN: SOLVED",
                // Personal OS / Protocol
                "J-OS: CORE INTERFACE",
                "J.O.H.A.N. PROTOCOL ACTIVE",
                "NEURAL GATEWAY OPEN",
                "AXON FIRING",
                "SYNAPSE LINKED",
                "MONOLITH UNMOVED",
                "ECHO-BASE RECEIVING"
            ];
            const sacredStatus = sacredStatuses[Math.floor(Math.random() * sacredStatuses.length)];

            // --- 3 linux based logos ---
            const logos = [
        // 1. Kali Dragon
        `<pre class="ascii-art" style="color: #3498db; font-size: 10px; line-height: 1; text-shadow: 0 0 3px #3498db; font-family: monospace;">
 ..........
            ..,;:ccc,.
         ......''';lxO.
 .....''''..........,:ld;
           .';;;:::;,,.x,
       ..'''.       0Xxoc:,.  ...
   ....            ,ONkc;,;cokOdc',.
  .                OMo           ':ddo.
                 dMc               :OO;
                 0M.                 .:o.
                 ;Wd
                  ;XO,
                    ,d0Odlc;,..
                        ..',;:cdOOd::,.
                                .:dOdo:   'x0l
                                    'x0l  
                                        cWc   
                                    .cNl
 <span style="color: #00ffff;">[ THE QUIETER YOU BECOME ]</span>
 <span style="color: #00ffff;">[ THE MORE YOU CAN HEAR  ]</span>
</pre>`,

        // 2. Debian Swirl (middle)
        `<pre style="color: #ff0055; font-size: 9px; line-height: 1.2; text-shadow: 0 0 4px #ff0055;">
       _,nd8888888ba,_
    ,d8888888888888888,
  ,88888888888888888888,
 d8888888P""'  '""Y88888b
 888888P'            'Y888
 888888                 888
 Y88888       _,aaaa,_   888
  Y88888     ,88888888P  88P
   'Y8888,   88888888P  ,88'
     'Y8888888888888P  ,88'
        '""Y8888P""'  ,88'
            _______ ,88'
            Y888888P'
<span style="color: #ffaa00;">[ KERNEL: DEBIAN STABLE ]</span>
</pre>`,

        // 3. Arch Linux
        `<pre style="font-size: 9px; line-height: 1.2;">
                <span style="color: #00f0ff;">/\\</span>
               <span style="color: #00f0ff;">/  \\</span>
              <span style="color: #00f0ff;">/ /\\ \\</span>
             <span style="color: #00f0ff;">/ /  \\ \\</span>
            <span style="color: #00f0ff;">/ /    \\ \\</span>
           <span style="color: #00f0ff;">/ /      \\ \\</span>
          <span style="color: #00f0ff;">/ /_      _\\ \\</span>
         <span style="color: #00f0ff;">/___/      \\___\\</span>
        <span style="color: #00f0ff;">/   /        \\   \\</span>
       <span style="color: #00f0ff;">/___/          \\___\\</span>
    <span style="color: #0f0;">[ ROOT PRIVILEGES: GRANTED ]</span>
       <span style="color: #0f0;">[ // J_OS SECURE // ]</span>
        </pre>`
    ];
            const randomLogo = logos[Math.floor(Math.random() * logos.length)];

            // --- Info block (flex‑based, for correct wrap alignment) ---
            const infoRow = (label, value, color='#00ffff') => `
                <div style="display: flex;">
                    <span style="width: 6.5em; flex-shrink: 0; color: ${color}; text-align: right; margin-right: 8px;">${label}</span>
                    <span style="color: #fff; word-break: break-word;">${value}</span>
                </div>`;

            const info = `<div class="fastfetch-info" style="display: flex; flex-direction: column; gap: 2px; margin-left: 15px;">
                    ${infoRow('OS:', os)}
                    ${infoRow('Host:', 'Elite Gems Engine')}
                    ${infoRow('Shell:', 'Akashic J_OS Shell')}
                    ${infoRow('Uptime:', uptimeStr)}
                    ${infoRow('Packages:', packageCount)}
                    ${infoRow('Resolution:', resolution)}
                    ${infoRow('Terminal:', browser)}
                    ${infoRow('CPU:', `${cores} core${cores > 1 ? 's' : ''}`)}
                    ${infoRow('GPU:', gpu)}
                    ${infoRow('Memory:', ram)}
                    ${infoRow('Network:', conn)}
                    ${infoRow('Status:', sacredStatus, '#ff00ff')}
                    <div style="margin-top: 4px;">
                    <span style="color:#ff5733;">██</span><span style="color:#ffd733;">██</span><span style="color:#33ff57;">██</span><span style="color:#00f0ff;">██</span><span style="color:#3357ff;">██</span><span style="color:#f033ff;">██</span>
                </div>
            </div>`;

            return { logo: randomLogo, info: info };
        }



        function updateClock() {
            const currentDate = new Date();
            const seconds = currentDate.getSeconds();
            const minutes = currentDate.getMinutes();

            // Play the ticking sound
            playTick();
            // If it's the 0th second, play the 'Tock' (deeper sound)
            playTick(seconds === 0);

            // Minute Reset Rule
            if (minutes !== lastMinute) {
                cycleBlocks();
                lastMinute = minutes;
            }

            const secondsRatio = seconds / 60;
            const minutesRatio = (secondsRatio + minutes) / 60;
            const hoursRatio = (minutesRatio + currentDate.getHours()) / 12;

            secondHand.style.transform = `translateX(-50%) rotate(${secondsRatio * 360}deg)`;
            minuteHand.style.transform = `translateX(-50%) rotate(${minutesRatio * 360}deg)`;
            hourHand.style.transform = `translateX(-50%) rotate(${hoursRatio * 360}deg)`;
        }

        setInterval(updateClock, 1000);
        updateClock();



        function cycleBlocks() {
            if (isFrozen) return; // Stop right here if frozen;

            // Hide current
            blocks[currentBlockIndex].classList.remove('active');
            
            // Increment index
            currentBlockIndex++;

            // If we reached the end of the shuffled list, reshuffle and start over
            if (currentBlockIndex >= blocks.length) {
                shuffleBlocks();
                currentBlockIndex = 0;
            }
            
            // Show next
            blocks[currentBlockIndex].classList.add('active');

            // NEW: Tell the background to update to match the new block! this call the global function
            updateBackground();
        }

        // --- 1. GLOBAL VARIABLES ---
        let isBgFrozen = false;
        let bgMode = 'off'; // off 'sync' or 'independent'
        const independentBgImages = [
            'images/indepedentBG/ORIGINBACKG.jpeg',
            'images/indepedentBG/IMGBACKG.jpeg',
            'images/indepedentBG/TheAlchemistV2.jpg',
            'images/indepedentBG/Ataraxia.jpg',
            'images/indepedentBG/BuddhaMobile.jpg',
            'images/indepedentBG/CalisMobile.jpeg',
            'images/indepedentBG/CoolMobileBG.jpeg',
            'images/indepedentBG/DarkSamurai.jpeg',
            'images/indepedentBG/HomeJCohen.jpg',
            'images/indepedentBG/Luffy.jpg',
            'images/indepedentBG/SteinsGate.jpeg',
            'images/indepedentBG/Spring.png',
            'images/indepedentBG/Space.jpg',
            'images/indepedentBG/GokuSS3.jpeg',
            'images/indepedentBG/Jungle.png',
            'images/indepedentBG/SerenityIllustration.jpeg',
            'images/indepedentBG/IchigoMask.jpeg',
            'images/indepedentBG/JCohen.jpeg',
            'images/indepedentBG/Soldiers.jpeg',
            'images/indepedentBG/PinkGirl.jpeg',
            'images/indepedentBG/LoveStory.jpg',
            'images/indepedentBG/ChameleoMobile.jpg',
            'images/indepedentBG/KidGoku.jpg',
            'images/indepedentBG/AnAngel.jpg',
            'images/indepedentBG/LuffyVsCp0.jpg',
            'images/indepedentBG/Nika.jpg',
            'images/indepedentBG/FireForce.jpg',
            'images/indepedentBG/BluSage.jpg',
            'images/indepedentBG/Angel.jpg',
            'images/indepedentBG/EngDrawing.jpg',
            'images/indepedentBG/FlammingBird.jpeg',
            'images/indepedentBG/OkamiMobile.jpg',
            'images/indepedentBG/Sherlock.jpg',
            'images/indepedentBG/DharmaWheelMobile.jpg',
            'images/indepedentBG/JJKMODULO.jpg',
            'images/indepedentBG/daytv3y-Kaneki.jpg',
            'images/indepedentBG/Gear5.jpg',
            'images/indepedentBG/BeautyOnBlade.jpg',
            'images/indepedentBG/jamie-street-unsplash.jpg',
            'images/indepedentBG/lHvaOwA.jpeg',
            'images/indepedentBG/Sunset_at_Long_Beach_SA.jpg',
            'images/indepedentBG/DavidMichael.jpg',
            'images/indepedentBG/PMononoke.png',
            'images/indepedentBG/SolarSystem.png',
            'images/indepedentBG/kaneki_kenJin_TKG.jpg',
            //'images/indepedentBG/',
        ];

        // Gallery images for Intersect flash (from your slideshow blocks)
        const galleryImages = [
            'images/IMG_BLUE.jpg',
            'images/OkamiKitsune.jpg',
            'images/OrangeHairedWomen.jpg',
            'images/BuddhaEyes.jpg',
            'images/Vagabond.jpg',
            'images/rainbow_bird.jpg',
            'images/TKGeyepatch.jpg',
            'images/Chameleon.jpg',
            'images/TheAlchemistofCohelo.jpg',
            'images/JohanNlbProfile.jpg',
            'images/CooL.jpeg',
            'images/AwokenHat.jpg',
            'images/fisherman.jpg',
            'images/GoodChristian.jpeg',
            'images/MarsaAlam.jpeg',
            'images/Midnight_sun.jpg',
            'images/ToraNoMaki.jpg',
            'images/Chrollo.jpg',
            'images/Smile.jpeg',
            'images/JHNarchetype.jpg',
            'images/boat.jpg',
            'images/GreenLeafOnSereneBlueSky.jpeg',
            'images/Mindfullness.jpg',
            'images/HellsParadise.jpg',
            'images/BuddhaShadow.jpg',
            'images/BluRoyalArcher.jpg',
            'images/kanenori-mount-fuji.jpg',
            'images/BonsaiRisingSun.jpg',
            'images/HeadOfBuddha.jpg',
            'images/BluYellowOnePiece.jpg',
            'images/KanJinAtaraxia.jpg',
            'images/SakuraTree.jpg',
            'images/OnTheBlu.jpg',
            'images/Colourful.jpg',
            'images/JohanSerenity.jpeg',
            'images/Mechatronics-Graph-01.jpeg',
            'images/JohnCohenInHSClass.jpg',
            'images/JHNFcusObserver.jpg',
            'images/CyberFlipper.jpg',
            'images/BuddhismFlag.jpeg',
            'images/KpopWallp.jpg',
            'images/Full_cycle_of_a_Sunset.jpg',
            'images/Comet.jpg',
            'images/PrincessMononoke.jpg',
            'images/SubmissiveOtakuGirl.jpg',
            'images/sakuyamon_the_cherry_blossom.jpg',
            'images/Glowing Chameleon.jpg',
            'images/Calisthenics.jpeg',
            'images/Beautyfullness.jpg',
            'images/SmileyGrafitti.jpg',
            'images/F1.jpg',
            'images/OkamiMask.jpg',
            'images/Sacred-Geometry-Flower-of-Life.jpg',
            'images/floralMandala.jpg',
            'images/d_wheel.jpg',
            'images/AbyssalWave.png',
            'images/ChillVibes.jpg',
            'images/Kali.png',
            'images/SoulNature.jpg',
            'images/JcohenDreamax.jpeg',
            'images/NelsonMandelaQuote.jpeg',
            'images/MahoragaWheel.jpeg'
        ];


        const ghost = document.getElementById('ghost-indicator');
        const bgToggleBtn = document.getElementById('bg-toggle-btn');

        // --- 2. THE MASTER UPDATE FUNCTION (Stand-alone) ---
        function updateBackground() {
            // 🛑 THE GATEKEEPER: If frozen, we exit immediately
            if (isBgFrozen) {
                console.log("Background locked. Ignoring update.");
                return; 
            }
            // 🛑 If the mode is 'off', keep the primary dark background
            if (bgMode === 'off') return;

            // --- SYNC MODE: use the active block's image ---
            if (bgMode === 'sync') {
                const activeBlock = blocks[currentBlockIndex];
                const img = activeBlock.querySelector('img');
                if (img) {
                    document.querySelector('.fixed-bg').style.backgroundImage = `url('${img.src}')`;
                }
            }
            // --- INDEPENDENT MODE: do nothing here (handled by interval & switch) ---
        }


        // --- 3. TIMERS & CYCLES ---
         let independentInterval = null;
        function startIndependentInterval() {
            if (independentInterval) clearInterval(independentInterval);
            independentInterval = setInterval(() => {
                if (bgMode === 'independent' && !isBgFrozen) {
                    setRandomIndependentBg();
                }
            }, 30000); // 30 seconds
        }

        // --- 4. GHOST UI & FEEDBACK ---
        function triggerGhost(message) {
            // If message is a boolean, use the original freeze messages
            if (typeof message === 'boolean') {
                ghost.innerText = message ? "👻 BG FROZEN" : "▶️ BG RESUMED";
            } else {
                // Otherwise, treat it as a custom string
                ghost.innerText = message;
            }
            ghost.classList.add('show');
            setTimeout(() => ghost.classList.remove('show'), 1200);
        }
        
        // Setting Random independants
        function setRandomIndependentBg() {
            if (!independentBgImages || independentBgImages.length === 0) return;
            const randomIndex = Math.floor(Math.random() * independentBgImages.length);
            document.querySelector('.fixed-bg').style.backgroundImage = `url('${independentBgImages[randomIndex]}')`;
        }
        function stopIndependentInterval() {
            if (independentInterval) {
                clearInterval(independentInterval);
                independentInterval = null;
            }
        }
        // --- 5. EVENT LISTENERS ---
        bgToggleBtn.addEventListener('click', () => {
            // If it's off or independent, we switch TO sync
            if (bgMode === 'off' || bgMode === 'independent') {
                // 🛑 If coming from independent, stop its interval
                if (bgMode === 'independent') {
                    stopIndependentInterval();
                }
                bgMode = 'sync';
                bgToggleBtn.classList.remove('independent');
                bgToggleBtn.innerText = "🖼️ BG: SYNCED 🌌";
            } else {
                // If it was sync, we switch TO independent
                bgMode = 'independent';
                bgToggleBtn.classList.add('independent');
                bgToggleBtn.innerText = " BG: INDEPENDENT";

                setRandomIndependentBg();   // immediate random background
                startIndependentInterval(); // start 30s random cycle
            }
            
            updateBackground(); // This triggers the fade-in (for sync) or is ignored for independent
        });


        document.addEventListener('DOMContentLoaded', () => {
            // Double Click to Freeze/Unfreeze
            document.body.addEventListener('dblclick', (e) => {
                // Note: If you have an overlay, e.target might be the body or a div.
                // This ensures it triggers when clicking the background area.
                if (e.target === document.body || e.target.tagName === 'BODY') {
                    isBgFrozen = !isBgFrozen;
                    playTick(true);  // Deeper 'Tock' sound for confirmation
                    triggerGhost(isBgFrozen);
                    if (!isBgFrozen) updateBackground();
                }
            });

            // Key 'B' to Freeze/Unfreeze
            //document.addEventListener('keydown', (e) => {
            //    if (e.key.toLowerCase() === 'b') {
            //        isBgFrozen = !isBgFrozen;
            //        playTick(true); // Deeper 'Tock' sound for confirmation
            //        triggerGhost(isBgFrozen);
            //        if (!isBgFrozen) updateBackground();
            //    }

        });

        // Hide Controls Toggle (top-left button)
        const hideControlsBtn = document.getElementById('hide-controls-btn');

        if (hideControlsBtn) {
            hideControlsBtn.addEventListener('click', () => {
                document.body.classList.toggle('hide-controls');
                const isHidden = document.body.classList.contains('hide-controls');
                hideControlsBtn.textContent = isHidden ? '🎮 Show Controls' : '🎮 Hide Controls';
                hideControlsBtn.classList.toggle('active', isHidden);
                playTick(true); // optional sound feedback
            });
        }


        // --- ONLINE QUOTE ENGINE ---
        const localQuotes = [
            { q: "Time Waits For No One XD", a: "Jin" },
            { q: "The wheel of time turns, Ages come and pass.", a: "Robert Jordan" },
            { q: "Talk is cheap. Show me the code.", a: "Linus Torvalds" }
        ];

        async function fetchDailyQuote() {
            const quoteText = document.getElementById('online-quote-text');
            const quoteAuthor = document.getElementById('online-quote-author');
            try {
                const response = await fetch('https://dummyjson.com/quotes/random');
                const data = await response.json();
                quoteText.innerText = `"${data.quote}"`;
                quoteAuthor.innerText = `- ${data.author}`;
            } catch (error) {
                console.log("API offline. Engaging local cache.");
                const fallback = localQuotes[Math.floor(Math.random() * localQuotes.length)];
                quoteText.innerText = `"${fallback.q}"`;
                quoteAuthor.innerText = `- ${fallback.a}`;
            }
        }

        fetchDailyQuote();
        // Optional: refresh every 10 minutes
        setInterval(fetchDailyQuote, 600000);

        // --- TAO TE CHING RANDOM CHAPTER (local JSON) ---
        let taoChapters = [];
        let taoLoaded = false;

        async function loadTaoTeChing() {
            try {
                const response = await fetch('./TTC/tao-te-ching.json');
                if (!response.ok) throw new Error('JSON not found');
                taoChapters = await response.json();
                taoLoaded = true;
                displayRandomChapter();
            } catch (error) {
                console.error('Failed to load Tao Te Ching:', error);
                const taoText = document.getElementById('tao-quote-text');
                if (taoText) taoText.innerText = 'The Tao that can be fetched is not the eternal Tao.';
            }
        }

        function displayRandomChapter() {
            if (!taoLoaded || taoChapters.length === 0) return;
            const randomIndex = Math.floor(Math.random() * taoChapters.length);
            const chapter = taoChapters[randomIndex];
            const textElement = document.getElementById('tao-quote-text');
            const authorElement = document.getElementById('tao-quote-author');
            if (textElement) {
                textElement.innerHTML = chapter.text.replace(/\n/g, '<br>');
            }
            if (authorElement) {
                authorElement.innerHTML = `— Chapter ${chapter.chapter}, Tao Te Ching`;
            }
        }
    

        // Attach event listener to the Tao button
        const newChapterBtn = document.getElementById('new-chapter-btn');
        if (newChapterBtn) {
            newChapterBtn.addEventListener('click', displayRandomChapter);
        }

        // Load the JSON and show first random chapter
        loadTaoTeChing();
       


        // --- ELITE 4-STATE CLOCK TOGGLE (Classic / Glass / Digital / Cistercian) ---
        const styleBtn = document.getElementById('zen-toggle-btn');
        const analogClock = document.getElementById('analog-clock');
        const digitalClock = document.getElementById('digital-clock');
        const cistercianClock = document.getElementById('cistercian-wrapper');// <-- NEW

        // State: 0 = Classic, 1 = Glass, 2 = Digital , 3 = Cistercian ,
        const clockModes = ['classic', 'glass', 'digital','cistercian'];
        let currentModeIndex = 0;

        // Set initial button text
        styleBtn.innerText = "🕰️ STYLE: CLASSIC";

        // Map mode to ghost message
        const modeMessages = {
            'classic': '🕰️ CLASSIC MODE',
            'glass': '💎 GLASS MODE',
            'digital': '📟 DIGITAL MODE',
            'cistercian': '🧮 CISTERCIAN MODE' // <-- NEW
        };

        styleBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex + 1) % clockModes.length;
            const mode = clockModes[currentModeIndex];

            playTick(true); // sound feedback

            // Reset everything
            analogClock.classList.remove('zen-mode');
            analogClock.style.display = 'flex';
            digitalClock.style.display = 'none';
            cistercianClock.style.display = 'none';
            styleBtn.classList.remove('zen-active');
            styleBtn.style.borderColor = "var(--clock-border)";
            styleBtn.style.color = "var(--text-color)";

            // Apply new mode
            if (mode === 'classic') {
                styleBtn.innerText = "🕰️ STYLE: CLASSIC";
            } else if (mode === 'glass') {
                analogClock.classList.add('zen-mode');
                styleBtn.innerText = "💎 STYLE: GLASSIC";
                styleBtn.classList.add('zen-active');
            } else if (mode === 'digital') {
                analogClock.style.display = 'none';
                digitalClock.style.display = 'flex';
                cistercianClock.style.display = 'none';
                styleBtn.innerText = "📟 STYLE: DIGITAL";
                styleBtn.classList.add('zen-active');
                styleBtn.style.borderColor = "var(--clock-border)";
            } else if (mode === 'cistercian') {
                analogClock.style.display = 'none';
                digitalClock.style.display = 'none';
                cistercianClock.style.display = 'flex'; // block //
                styleBtn.innerText = "🧮 STYLE: CISTERCIAN";
                styleBtn.classList.add('zen-active');
                styleBtn.style.borderColor = "var(--clock-border)";
            }

            // Show ghost message
            if (typeof triggerGhost === 'function') {
                triggerGhost(modeMessages[mode]);
            }
        });



        // 2. Hide Info Logic
        // --- CLEAN VIEW 3‑STATE CYCLE (with space preservation) ---
        const hideBtn = document.getElementById('hide-info-btn');
        const infoSection = document.getElementById('info-section');
        const contentBlocks = document.querySelectorAll('.content-blocks'); // both slideshow and the extra one
        let cleanViewMode = 0; // 0 = all visible, 1 = info hidden, 2 = both hidden

        function updateCleanView() {
            if (cleanViewMode === 0) {
                // All visible
                infoSection.style.display = ''; // restore default
                contentBlocks.forEach(el => {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                });
                hideBtn.innerText = '🖥️ CLEAN VIEW: OFF';
                hideBtn.style.color = '#f6ff00'; // Solid Yellow/Magenta
            } else if (cleanViewMode === 1) {
                // Info hidden, images visible
                infoSection.style.display = 'none';
                contentBlocks.forEach(el => {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                });
                hideBtn.innerText = '🖥️ CLEAN VIEW:(text off)';
                hideBtn.style.color = '#ffb835'; // Orange
            } else { // mode 2
                // Everything hidden (info + images)
                infoSection.style.display = 'none';
                contentBlocks.forEach(el => {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                });
                hideBtn.innerText = '🖥️ CLEAN VIEW: ON(full)';
                hideBtn.style.color = '#00fffb'; // Cyber Cyan
            }
        }

        hideBtn.addEventListener('click', () => {
            cleanViewMode = (cleanViewMode + 1) % 3;
            updateCleanView();
            playTick(true); // sound feedback
        });



        // --- DIGITAL CLOCK TIME ENGINE ---
        function updateDigitalTime() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            
            document.getElementById('digi-hours').innerText = String(hours).padStart(2, '0');
            document.getElementById('digi-minutes').innerText = String(minutes).padStart(2, '0');
            
            // Update Cistercian date numerals (year, month, day)
            const year = now.getFullYear();
            const month = now.getMonth() + 1;  // months are 0-indexed
            const day = now.getDate();
            
            const yearElem = document.getElementById('cist-year');
            const monthElem = document.getElementById('cist-month');
            const dayElem = document.getElementById('cist-day');
            
            if (yearElem) yearElem.setAttribute('value', year);
            if (monthElem) monthElem.setAttribute('value', month);
            if (dayElem) dayElem.setAttribute('value', day);

            // Update the small date inside the Cistercian clock block
            const smallYear = document.getElementById('small-cist-year');
            const smallMonth = document.getElementById('small-cist-month');
            const smallDay = document.getElementById('small-cist-day');

            if (smallYear) smallYear.setAttribute('value', year);
            if (smallMonth) smallMonth.setAttribute('value', month);
            if (smallDay) smallDay.setAttribute('value', day);

            // Update the second (last) Cistercian date block
            const smallYearLast = document.getElementById('small-cist-year-last');
            const smallMonthLast = document.getElementById('small-cist-month-last');
            const smallDayLast = document.getElementById('small-cist-day-last');

            if (smallYearLast) smallYearLast.setAttribute('value', year);
            if (smallMonthLast) smallMonthLast.setAttribute('value', month);
            if (smallDayLast) smallDayLast.setAttribute('value', day);
        }

        // Start it once
        updateDigitalTime();
        setInterval(updateDigitalTime, 1000);



        // --- CUSTOM COLOR THEME ENGINE ---
        const themeSelect = document.getElementById('color-theme-select');

        // Define the exact CSS variable replacements for each theme
        const colorThemes = {
            cyan: { 
                bg: '#121214', 
                text: '#ececec', 
                clockBg: '#1a1a1d', 
                border: '#242428', 
                accent: '#00f0ff',
                digital: '#00f0ff' // Adding a specific digital clock color
            },
            magenta: { 
                bg: '#1a0515', 
                text: '#fce8f5', 
                clockBg: '#2a0822', 
                border: '#3d0c32', 
                accent: '#ff00ff',
                digital: '#ff00ff'
            },
            amber: { 
                bg: '#171205', 
                text: '#fcf6e8', 
                clockBg: '#261d08', 
                border: '#382a0b', 
                accent: '#ffaa00',
                digital: '#ffaa00'
            },
            matrix: { 
                bg: '#051005', 
                text: '#e8fce8', 
                clockBg: '#081a08', 
                border: '#0c2e0c', 
                accent: '#00ff00',
                digital: '#0dff00' 
            }
        };
       

        function applyColorTheme(themeName) {
            const t = colorThemes[themeName];
            if (!t) return; // Failsafe

            // Target the root HTML element to override CSS variables
            const root = document.documentElement;
            
            root.style.setProperty('--bg-color', t.bg);
            root.style.setProperty('--text-color', t.text);
            root.style.setProperty('--clock-bg', t.clockBg);
            root.style.setProperty('--clock-border', t.border);
            root.style.setProperty('--accent-color', t.accent);
            root.style.setProperty('--digital-clock-color', t.digital);

            // Save to LocalStorage
            localStorage.setItem('elite-color-profile', themeName);
        }

        // 1. Listen for user changes
        themeSelect.addEventListener('change', (e) => {
            applyColorTheme(e.target.value);
            
            // Optional: Play your mechanical sound and trigger the ghost notification
            if (typeof playTick === 'function') playTick(true);
            if (typeof triggerGhost === 'function') triggerGhost(`THEME: ${e.target.value.toUpperCase()}`);
        });

        // 2. Load saved theme on page startup
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('elite-color-profile') || 'cyan'; // Default to cyan
            themeSelect.value = savedTheme; // Update the dropdown UI
            applyColorTheme(savedTheme);    // Apply the colors
        }

        // Run the loader immediately
        loadSavedTheme();


        let spinnerInterval = null;
        // YouTube API ready flag
        window.YTReady = false;
        function onYouTubeIframeAPIReady() {
            window.YTReady = true;
            console.log("📡 Akashic Link: YouTube API initialized.");
        }
        // Media state globals
        let youtubePlayer = null;
        let currentAudio = null;
        // Authorization state (from sudo / login)
        let isAuthorized = false;  // set to true when user says "please" or logs in

        function createYouTubePlayer(input, containerId) {
            if (!window.YTReady) {
                appendCommandOutput('⚠️ YouTube API still loading...', true);
                return;
            }

            // Smart detection: if input is a plain 11‑char ID, use it immediately
            let videoId;
            let isFullUrl = false;
            
            if (input.length === 11 && !input.includes('/') && !input.includes('.') && /^[a-zA-Z0-9_-]{11}$/.test(input)) {
                videoId = input;
            } else {
                // Try to extract from URL
                const match = input.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|c\/[^\/\n\s]+\/|user\/[^\/\n\s]+\/|@[^\/\n\s]+\/)|youtu\.be\/)([a-zA-Z0-9_-]{11}|live)/);
                videoId = (match && match[1] && match[1] !== 'live') ? match[1] : input;
                isFullUrl = (videoId === input); // true for /live or other non‑ID formats
            }
            // 1. GRACEFUL CLEANUP: Stop and destroy previous player
            if (youtubePlayer) {
                try {
                    if (typeof youtubePlayer.stopVideo === 'function') {
                        youtubePlayer.stopVideo();
                    }
                    if (typeof youtubePlayer.destroy === 'function') {
                        youtubePlayer.destroy();
                    }
                } catch (e) {
                    console.warn('Cleanup warning:', e);
                }
                youtubePlayer = null; // Clear reference
            }

            // 2. WAIT for API to reset (100ms sweet spot)
            setTimeout(() => {
                try {
                    youtubePlayer = new YT.Player(containerId, {
                        height: '250',
                        width: '100%',
                        // For /live URLs we leave videoId empty and load via onReady
                        videoId: isFullUrl ? undefined : videoId,
                        playerVars: {
                            autoplay: 1,
                            modestbranding: 1,
                            rel: 0,
                            origin: window.location.origin   // Helps with stricter channels
                        },
                        events: {
                            onReady: (event) => {
                                if (isFullUrl) {
                                    // Load the full URL (e.g., /live) once player is ready
                                    event.target.loadVideoByUrl(input);
                                }
                                appendCommandOutput('🎬 Signal Locked. Playback started.');
                                event.target.playVideo();
                            },
                            onError: (e) => {
                                const errorMap = {
                                    2: 'Invalid ID',
                                    5: 'HTML5 error',
                                    100: 'Video not found',
                                    101: 'Embed restricted',
                                    150: 'Embed restricted'
                                };
                                const msg = errorMap[e.data] || `Error ${e.data}`;
                                appendCommandOutput(`⚠️ YouTube error: ${msg}`, true);
                            }
                        }
                    });
                } catch (e) {
                    console.error('Final attempt failed:', e);
                    appendCommandOutput(`📡 Neural Link Error: ${e.message}`, true);
                }
            }, 100); // 100ms delay gives the API time to clean up
        }

        // Curated Akashic frequencies – all HTTPS, no proxy needed
        const stations = {
            // Cyber-Dark / Industrial
            'defcon': 'https://ice1.somafm.com/defcon-128-mp3',
            'ebsm': 'https://stream.rekt.network/ebsm.ogg',
            'datawave': 'https://stream.nightride.fm/datawave.ogg',
            
            // Space / Ambient
            'deepspace': 'https://ice4.somafm.com/deepspaceone-128-mp3',
            'spacestation': 'https://ice5.somafm.com/spacestation-128-mp3',
            'spacesynth': 'https://stream.nightride.fm/spacesynth.ogg',
                    
            // Meditation / Zen
            'dronezone': 'https://ice1.somafm.com/dronezone-128-mp3',
            
            // Hip-Hop / Urban
            'fiphiphop': 'https://direct.fipradio.fr/live/fiphiphop-hifi.aac',
            'thebeat': 'https://listen.181fm.com/181-beat_128k.mp3'
        };

        // Global state for the current puzzle
        window._satorGrid = null;
        // Helper render function 
       function renderSatorGrid() {
            const grid = window._satorGrid;
            if (!grid) return 'No active puzzle. Type <span style="color: #0f0;">sator new</span> to start.';

            // Clear column labels
            const colHeaders = '     1   2   3   4';
            const separator  = '   ────┼───┼───┼───';   // visual separation line
            const rowLabels = ['A', 'B', 'C', 'D'];
            let rowsStr = '';
            for (let r = 0; r < grid.size; r++) {
                const rowData = grid.player[r].map(c => c === '' ? '·' : c).join(' │ ');
                rowsStr += `${rowLabels[r]}  │ ${rowData}\n`;
            }

            const html = `
                <div style="border: 1px solid #ffaa00; padding: 10px; background: rgba(255,0,0,0.05); text-align: center;">
                    <b style="color: #ffaa00;">◆ SATOR WORD SQUARE ◆</b><br>
                    <span style="color: #888;">Fill every cell – each row &amp; column a word</span>
                    <pre style="font-size: 18px; line-height: 1.5; color: #fff; display: inline-block; text-align: center;">${colHeaders}\n${separator}\n${rowsStr}</pre>
                    <span style="color: #888;">Example: </span><span style="color: #0f0;">sator B2 R</span> – places 'R' at column B, row 2<br>
                    <span style="color: #888;">Attempts: ${grid.attempts}</span>
                    ${grid.revealed ? '<br><span style="color: #ffaa00;">Solution shown.</span>' : ''}
                </div>`;
            return html;
        }
        
        
        // 3. COMMAND RUNNER
        let cmdVisible = false;
        const cmdRunnerDiv = document.getElementById('command-runner');
        const openCmdBtn = document.getElementById('open-cmd-runner');
        const closeCmdBtn = document.getElementById('close-cmd-runner');
        const cmdInput = document.getElementById('cmd-input');
        const cmdOutput = document.getElementById('cmd-output');

        // Wait for the page to load
        document.addEventListener('DOMContentLoaded', function() {
        const cmdInput = document.getElementById('cmd-input');
        const outputContainer = document.getElementById('cmd-output');

        if (cmdInput) {
            cmdInput.addEventListener('focus', function() {
            // Delay allows the keyboard to fully open before scrolling
            setTimeout(function() {
                // Scroll the input into view, centered
                cmdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Also scroll the output container to bottom
                if (outputContainer) {
                outputContainer.scrollTop = outputContainer.scrollHeight;
                }
            }, 300);
            });
        }
        });
        
        // For plain text (use this for most commands)
        function appendCommandOutput(text, isError = false) {
            const line = document.createElement('div');
            line.style.color = isError ? '#ff5555' : '#0f0';
            line.textContent = text;          // textContent escapes HTML automatically
            cmdOutput.appendChild(line);
            cmdOutput.scrollTop = cmdOutput.scrollHeight;
        }

        // For HTML content (images, formatted output)
        function appendCommandHTML(html, isError = false) {
            const line = document.createElement('div');
            line.style.color = isError ? '#ff5555' : '#0f0';
            line.innerHTML = html;             // innerHTML renders the tags
            cmdOutput.appendChild(line);
            cmdOutput.scrollTop = cmdOutput.scrollHeight;
        }
    

       openCmdBtn.addEventListener('click', () => {
            cmdRunnerDiv.style.display = 'block';
            cmdVisible = true;
            
            // Check if this is the first open (output empty or only contains hint)
            const isEmpty = cmdOutput.children.length === 0;
            const isOnlyHint = cmdOutput.children.length === 1 && cmdOutput.children[0].classList.contains('cmd-hint');
            
            if (isEmpty || isOnlyHint) {
                // Clear whatever is there (hint or empty)
                cmdOutput.innerHTML = '';
                
                // 1. Inject the login splash
                appendCommandHTML(commands['login']());
            }
            
            cmdInput.focus();
        });

        closeCmdBtn.addEventListener('click', () => {
            cmdRunnerDiv.style.display = 'none'; 
            cmdVisible = false; 
        });
 
        function getWeatherEmoji(code) {
            // WMO Weather codes: 0 clear, 1 mainly clear, 2 partly cloudy, 3 overcast, etc.
            if (code <= 1) return '☀️';
            if (code <= 3) return '⛅';
            if (code <= 48) return '☁️';
            if (code <= 57) return '🌧️';
            if (code <= 67) return '🌧️❄️';
            if (code <= 77) return '❄️';
            if (code <= 82) return '🌧️';
            if (code <= 86) return '🌨️';
            return '🌫️';
        }

        // Global command history array
        let commandHistory = [];

        // ---------- COMMAND MAP (Sync + Async) ----------
        const commands = {
            // ----- SYNC (return string/HTML instantly) -----
            'help': () => {
                return `
                <strong style="color: var(--accent-color);">⚡ SYSTEM & UTILITY</strong><br>
                help, about, clear, echo [text], whoami, ls, sudo, history, fastfetch, fetchpanel, fetch, neofetch, system, shutdown, ping, date [utc\|iso\|unix], spinner, stopspinner, timer [seconds], stoptimer, nuke :(factory reset)<br>
                <br>
                <strong style="color: var(--accent-color);">🎨 THEME & UI</strong><br>
                theme [cyan|magenta|amber|matrix], pause, mode [flipper|midnight|matrix|crimson|cyber|hologram|stealth|off], zoom [in|out|reset]<br>
                <br>
                <strong style="color: var(--accent-color);">📡 NETWORK & COMMUNICATION</strong><br>
                chat mqtt : Global public frequency<br>
                chat p2p : Encrypted peer to peer tunnel<br>
                chat firebase : Persistent mainframe archive<br>
                chat -all : Open all three channels at once<br>
                status : Live connection report (MQTT, P2P, Firebase)<br>
                disconnect : Terminate all network links safely<br>
                mesh : Visualize a simulated LoRa mesh network<br>
                aprsmap [fi|direct] : Live amateur radio map (choose source)<br>
                netorbit [--green|--red|--violet] : Live world map + packet sniffing<br>
                <br>
                <strong style="color: var(--accent-color);">📰 NEWS & INFORMATION</strong><br>
                news, hackernews, technology, weather[city], crypto [coin], news -all (news,hackernews,technology)<br>
                <br>
                <strong style="color: var(--accent-color);">📚 LEARNING & REFERENCE</strong><br>
                define [word], learn, physics, electronics, engineering, biology, space, cstip, wiki [topic], fortune, motd<br>
                <br>
                <strong style="color: var(--accent-color);">⚙️ ENGINEERING TOOLS</strong><br>
                case  -> interactive diagnostics: resistor calc, color decode, Ohm's Law, voltage divider, capacitor codes<br>
                <br>
                <strong style="color: var(--accent-color);">🔐 AKASHIC CIPHER SUITE</strong><br>
                cipher : Full usage manual for all ciphers (encrypt/decrypt)<br>
                encode [msg] : Base64 encode a message<br>
                decode [b64] : Decode a Base64 string<br>
                shift [n] [msg] : Caesar shift (letters & digits wrap)<br>
                kryptos [enc|dec] [bin|hex] [text] : Convert text to/from binary or hex stream<br>
                vigenere [enc|dec] [key] [msg] : Vigenère cipher with keyword<br>
                mirror [msg] : Atbash mirror cipher (self‑inverse)<br>
                reverse [msg] : Reverse every character (TENET inversion)<br>
                vault [enc|dec] [pw] [msg] : AES‑256 encryption (real, password‑based, handshake key optional)<br>
                handshake [set|clear] [key] : Store or clear a personal encryption key locally<br>
                <br>
                <strong style="color: var(--accent-color);">🔮 TENET CIPHERS</strong><br>
                reverse [message], palindrome [check|make|square|tenet], sator<br>
                <br>
                <strong style="color: var(--accent-color);">🕵️ CYBER OPS</strong><br>
                kali, steg [hide|reveal] [cover] [secret], tag [set|get|clear|view] [key] [value], kali [hash|scan|crack|inject|genkey|dragon|arch], wifite, airmon [iface], nmap [target], hashcat, flipper [subghz|nfc|badusb|off], raspberry, gpio [status|on|off] [pin]<br>
                <br>
                <strong style="color: var(--accent-color);">🧘 WISDOM & SPIRITUALITY</strong><br>
                tao, wisdom, sutra, buddha, koan, stoic, bible, verse<br>
                <br>
                <strong style="color: var(--accent-color);">🎭 FUN & ENTERTAINMENT</strong><br>
                joke, riddle, poem, poetry, anime, ascii, run, piano, game [snake|dodge|marble|asteroids|flappy|dino], qr [text], homing, siren, radio [channel], tv [channel], play youtube [url], play audio, stop, cowsay [text], hack, htop, react, rotate<br>
                <br>
                <strong style="color: var(--accent-color);">🖼️ VISUALS & EFFECTS</strong><br>
                image, walls, glitch, scroll, intersect, intersectslow<br>
                <br>
                `;
            },
            'clear': () => {
                // Stop all known intervals
                if (spinnerInterval) { clearInterval(spinnerInterval); spinnerInterval = null; }
                if (window.hackInterval) { clearInterval(window.hackInterval); window.hackInterval = null; }
                if (window.rotateInterval) { clearInterval(window.rotateInterval); window.rotateInterval = null; }
                if (window.activeTimerInterval) { clearInterval(window.activeTimerInterval); window.activeTimerInterval = null; }
                
                cmdOutput.innerHTML = '';
                return '';
            },
            'theme': (args) => {
                const theme = args[0];
                if (theme && typeof colorThemes !== 'undefined' && colorThemes[theme]) {
                    if (typeof applyColorTheme === 'function') applyColorTheme(theme);
                    const themeSelect = document.getElementById('color-theme-select');
                    if (themeSelect) themeSelect.value = theme;
                    return `Theme changed to ${theme}`;
                }
                return `Usage: theme [cyan|magenta|amber|matrix]`;
            },
            'fortune': () => {
                const fortunes = [
                    // Unix & System Admin Wisdom
                    'To err is human, but to really foul things up requires root privileges.',
                    'There is no place like 127.0.0.1.',
                    'chmod 777 is a temporary fix, not a solution.',
                    'Uptime is a badge of honor.',
                    'A day without Linux is like a day without a segmentation fault.',
                    'Believe Me, I am Root',
                    'RTFM: Read The Fine Manual.',
                    'Unix is user-friendly. It just isn\'t promiscuous about which users it\'s friendly with.',
                    // Programming & Coding
                    'It is not a bug, it is an undocumented feature.',
                    'There are 10 types of people: those who understand binary, and those who don\'t.',
                    'Weeks of programming can save you hours of planning.',
                    'Code is read much more often than it is written.',
                    'git push --force and pray.',
                    'while(true) { keep_learning(); }',
                    'A computer lets you make more mistakes faster than any invention in human history.',
                    // Cyberpunk & Sci-Fi
                    'The net is vast and infinite.',
                    'Information wants to be free.',
                    'Never trust a computer you can\'t throw out a window.',
                    'Wake up, Neo...',
                    'I know kung fu.',
                    'The cake is a lie.',
                    // Ricing & Aesthetic
                    'Your dotfiles are looking exceptionally sharp today.',
                    'Bloat is the mind-killer. Bloat is the little-death that brings total obliteration.',
                    'Another day, another color scheme.',
                    'Tiling window managers build character.',
                    'Less GUI, more CLI.',
                    'A clean terminal is the sign of a sick mind.',
                    // Existential Tech
                    'Time is an illusion. Ping is a reality.',
                    'Hardware: The parts of a computer system that can be kicked.',
                    'Software: The parts of a computer system that can only be cursed at.',
                    'You are the CSS to my HTML.',
                    'Every keystroke shapes the matrix.',
                    'The early bird gets the worm.',
                    'You will find a hidden gem.',
                    'Reality is an illusion',
                    'sudo makes everything possible.'
                ];
                return fortunes[Math.floor(Math.random() * fortunes.length)];
            },
            'sudo': (args) => {
                const fullCmd = args.join(' ').toLowerCase();
                
                // Classic xkcd reference
                if (fullCmd === 'make me a sandwich') {
                    return 'Okay, but you didn\'t say the magic word.';
                }
                
                // If they said "please"
                if (fullCmd.includes('please')) {
                    isAuthorized = true;
                    return 'Access granted. Creating sandwich... 🥪';
                }
                
                // Any other sudo attempt
                return 'Permission denied. This incident will be reported.';
            },
            'fetch': () => {
                if (typeof toggleFetch === 'function') {
                    const terminal = document.getElementById('cyber-fetch-terminal');
                    if (terminal && !terminal.classList.contains('active')) {
                        toggleFetch();
                        return 'System info panel opened.';
                    } else if (terminal && terminal.classList.contains('active')) {
                        if (typeof generateFetchData === 'function') generateFetchData();
                        return 'System info refreshed.';
                    } else {
                        toggleFetch();
                        return 'System info panel opened.';
                    }
                }
                return 'Fetch command not available.';
            },
            'fetchpanel': () => {
                const parts = generateFastfetchPanelParts();
                // Set content exactly like the original panel: logo <pre> + info <div>
                fetchContent.innerHTML = parts.logo + parts.info;
                const terminal = document.getElementById('cyber-fetch-terminal');
                terminal.classList.add('fastfetch-mode');
                if (!terminal.classList.contains('active')) {
                    terminal.classList.add('active');
                    if (typeof playTick === 'function') playTick(true);
                }
                return '📊 Fastfetch panel displayed. Close with [X] or press Escape.';
            },
            'neofetch': () => {
                const container = document.getElementById('neofetch-container');
                if (container) {
                    container.style.visibility = 'visible';
                    container.style.display = 'flex';
                    return 'Fetching system information...';
                }
                return 'Neofetch container not found.';
            },
            'fastfetch': () => {
                // --- OS Detection ---
                let os = 'Unknown';
                try {
                    const ua = navigator.userAgent;
                    if (ua.includes('Windows')) os = 'Windows';
                    else if (ua.includes('Mac')) os = 'macOS';
                    else if (ua.includes('Linux')) os = 'Linux';
                    else if (ua.includes('Android')) os = 'Android';
                    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                    else if (navigator.userAgentData?.platform) os = navigator.userAgentData.platform;
                    else if (navigator.platform) os = navigator.platform;
                } catch(e) {}

                // --- GPU Detection (safe fallback) ---
                let gpu = 'Unknown';
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (gl) {
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) {
                            gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        }
                    }
                } catch(e) {}
                if (!gpu || gpu === 'Unknown') gpu = 'Integrated Graphics';

                // --- Browser Detection ---
                let browser = 'Browser';
                const ua = navigator.userAgent;
                if (ua.includes('Firefox')) browser = 'Firefox';
                else if (ua.includes('Chrome')) browser = 'Chrome';
                else if (ua.includes('Safari')) browser = 'Safari';
                else if (ua.includes('Edge')) browser = 'Edge';

                // --- Hardware Info ---
                const cores = navigator.hardwareConcurrency || '?';
                const ram = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '? GB';
                const resolution = `${window.screen.width}×${window.screen.height}`;

                // --- Network Info ---
                let conn = 'Unknown';
                try {
                    conn = navigator.connection ? navigator.connection.effectiveType : 'Unknown';
                } catch(e) {}

                // --- Uptime ---
                const uptimeSec = Math.floor(performance.now() / 1000);
                const uptimeMin = Math.floor(uptimeSec / 60);
                const uptimeHours = Math.floor(uptimeMin / 60);
                const uptimeStr = uptimeHours > 0 
                    ? `${uptimeHours}h ${uptimeMin % 60}m` 
                    : `${uptimeMin}m ${uptimeSec % 60}s`;

                // --- Dynamic Package Count ---
                const packageCount = (typeof commands === 'object' && commands) ? Object.keys(commands).length : 42;

                // --- Sacred Status (random each time) ---
                const sacredStatuses = [
                // Original set
                "CONNECTED TO ETHER",
                "ZERO-POINT STABLE",
                "KRYPTOS ENCRYPTED",
                "VOID-WALKING",
                "AKASHIC ALIGNED",
                "NEURAL SYNC",
                "QUANTUM ENTANGLED",
                // Cyberpunk / High-Tech
                "ONYX CONSOLE ACTIVE",
                "NEON LINK ESTABLISHED",
                "PHANTOM SHELL SECURE",
                "OBSIDIAN TERMINAL ONLINE",
                "SIGNAL-9 LOCKED",
                "GLITCH-CORE NOMINAL",
                // Sacred / Mythological
                "DHARMA TERMINAL ATTUNED",
                "AETHER LINK RESONANT",
                "ORACLE NODE LISTENING",
                "SAMSARA CYCLE STABLE",
                "AKASHIC RECORDS INDEXED",
                "ZENITH POINT REACHED",
                "DIGITAL KOAN: SOLVED",
                // Personal OS / Protocol
                "J-OS: CORE INTERFACE",
                "J.O.H.A.N. PROTOCOL ACTIVE",
                "NEURAL GATEWAY OPEN",
                "AXON FIRING",
                "SYNAPSE LINKED",
                "MONOLITH UNMOVED",
                "ECHO-BASE RECEIVING"
                ];
                const sacredStatus = sacredStatuses[Math.floor(Math.random() * sacredStatuses.length)];

                // --- Three Linux-inspired logos (Debian, Arch, Kali) ---
                const logos = [
                    // 2. // Kali Linux Dragon
                        `<pre class="ascii-art" style="color: #3498db; font-size: 10px; line-height: 1; text-shadow: 0 0 3px #3498db; font-family: monospace;">
                         ..........
                                ..,;:ccc,.
                             ......''';lxO.
                      .....''''..........,:ld;
                                   .';;;:::;,,.x,
                           ..'''.       0Xxoc:,.  ...
                              ....            ,ONkc;,;cokOdc',.
                            .                OMo           ':ddo.
                                            dMc               :OO;
                                            0M.                 .:o.
                        ;Wd
                            ;XO,
                                    ,d0Odlc;,..
                                          ..',;:cdOOd::,.
                                                  .:dOdo:   'x0l
                                                      'x0l  
                                                          cWc   
                                                        .cNl
    <span style="color: #00ffff;">[ THE QUIETER YOU BECOME ]</span>
    <span style="color: #00ffff;">[ THE MORE YOU CAN HEAR  ]</span>
                        </pre>`,

                    // 3. Debian Swirl (The Universal)
                        `<pre style="color: #ff0055; font-size: 9px; line-height: 1.2; text-shadow: 0 0 4px #ff0055;">
                            _,nd8888888ba,_
                         ,d8888888888888888b,
                        ,888888888888888888888,
                        d8888888P""'  '""Y88888b
                       888888P'             'Y888
                       888888                  888
                       Y88888       _,aaaa,_    888
                        Y88888     ,88888888P   88P
                         'Y8888,   88888888P   ,88'
                           'Y8888888888888P  ,88'
                              '""Y8888P""' ,88'
                               _______,88'
                            Y888888P'
                        <span style="color: #ffaa00;">[ KERNEL: DEBIAN STABLE]</span></pre>`,

                    // 4. Arch Linux (Kryptos Vector)

                        `<pre style="font-size: 9px; line-height: 1.2;">
                                    <span style="color: #00f0ff;">/\\</span>
                                    <span style="color: #00f0ff;">/  \\</span>
                                    <span style="color: #00f0ff;">/ /\\ \\</span>
                                    <span style="color: #00f0ff;">/ /  \\ \\</span>
                                    <span style="color: #00f0ff;">/ /    \\ \\</span>
                                    <span style="color: #00f0ff;">/ /      \\ \\</span>
                                    <span style="color: #00f0ff;">/ /_      _\\ \\</span>
                                    <span style="color: #00f0ff;">/___/      \\___\\</span>
                                    <span style="color: #00f0ff;">/   /        \\   \\</span>
                                    <span style="color: #00f0ff;">/___/          \\___\\</span>
                                    <span style="color: #0f0;">[ ROOT PRIVILEGES: GRANTED ]</span>
                                    <span style="color: #0f0;">[ // J_OS SECURE // ]</span>
                        </pre>`,
                ];

                const randomLogo = logos[Math.floor(Math.random() * logos.length)];

                // --- System Info Column ---
                const info = `<div style="font-size: 9px; line-height: 0.7; margin-left: 15px;">
                <strong style="color: #00ff00;">Johan@Akashic</strong><br>
                <span style="color: #555;">────────────────</span><br>
                <span style="color: #00ffff;">OS:</span> ${os}<br>
                <span style="color: #00ffff;">Host:</span> Elite Gems Engine<br>
                <span style="color: #00ffff;">Shell:</span>Akashic J_OS Shell<br>
                <span style="color: #00ffff;">Uptime:</span> ${uptimeStr}<br>
                <span style="color: #00ffff;">Packages:</span> ${packageCount}<br>
                <span style="color: #00ffff;">Resolution:</span> ${resolution}<br>
                <span style="color: #00ffff;">Terminal:</span> ${browser}<br>
                <span style="color: #00ffff;">CPU:</span> ${cores} core${cores > 1 ? 's' : ''}<br>
                <span style="color: #00ffff;">GPU:</span> ${gpu}<br>
                <span style="color: #00ffff;">Memory:</span> ${ram}<br>
                <span style="color: #00ffff;">Network:</span> ${conn}<br>
                <span style="color: #ff00ff;">Status:</span> <span style="color: #ff00ff;">${sacredStatus}</span><br><br>
                <span style="color:#ff5733;">██</span><span style="color:#ffd733;">██</span><span style="color:#33ff57;">██</span><span style="color:#00f0ff;">██</span><span style="color:#3357ff;">██</span><span style="color:#f033ff;">██</span>
                </div>`;

                return `<div style="display: flex; align-items: center; flex-wrap: wrap; padding: 5px; border-left: 2px solid var(--accent-color); background: rgba(0,255,0,0.02);">
                    ${randomLogo}
                    ${info}
                </div>`;
            },
            'tao': () => {
                if (typeof taoChapters !== 'undefined' && taoChapters.length > 0) {
                    const chapter = taoChapters[Math.floor(Math.random() * taoChapters.length)];
                    return `<span style="color: #ffffff;">Chapter ${chapter.chapter}:</span><br><span style="color: #4a9eff;">${chapter.text.replace(/\n/g, '<br>')}</span>`;
                }
                return 'Tao Te Ching not loaded.';
            },
            'motd': () => {
                const motds = [
                    "🌀 The Dharma Terminal awaits your command.",
                    "🐬 Akashic Records: Access Granted.",
                    "📡 Neon Link stable. Proceed.",
                    "📡 Zero-Point energy fluctuations nominal.",
                    "📡 KRYPTOS encryption: ACTIVE.",
                    "📡 ONYX Console: All systems nominal.",
                    "📡 Phantom Shell secure. No threats detected.",
                    "📡 Signal-9 Kiosk: Awaiting input.",
                    "🌀 You are the observer and the observed.",
                    "✨ The terminal is a mirror. What do you see?",
                ];
                const msg = motds[Math.floor(Math.random() * motds.length)];
                return `<span style="color: #00ffff; text-shadow: 0 0 5px #00ffff;">${msg}</span>`;
            },
            'whoami': () => {
                const personas = [
                    { name: "Johan🌀", role: "Architect of the Void", status: "Online", id: "OneOfNone" },
                    { name: "Operator@ONYX", role: "Neon Link Admin", status: "Encrypted", id: "AXON-7" },
                    { name: "Void-Walker", role: "Zero-Point Explorer", status: "Drifting", id: "KRYPTOS-0" },
                    { name: "DharmaUser", role: "Samsara Interpreter", status: "Meditating", id: "KOAN-42" },
                    { name: "Root@KRYPTOS", role: "Cipher Keeper", status: "Sealed", id: "MONOLITH" },
                    { name: "Neural_Gateway", role: "Synapse Operator", status: "Active", id: "J.O.H.A.N." }
                ];
                const p = personas[Math.floor(Math.random() * personas.length)];
                return `User: ${p.name}\nRole: ${p.role}\nStatus: ${p.status}\nPhygital ID: ${p.id}<br>
                <div style="text-align: center; margin: 5px 0;">
                    <img src="images/kanJin.png" style="max-width: 220px; height: auto; border-radius: 8px; margin-bottom: 5px;">
                </div>`;
            },
            'ls': () => 'Documents/  Downloads/  Secret_Project/  tao_te_ching.txt  system_core.bin',
            'echo': (args) => args.join(' ') || 'Usage: echo [text]',
            'shutdown': () => {
                setTimeout(() => { if (typeof enterMagicMirror === 'function') enterMagicMirror(); }, 1500);
                return 'System shutting down... Entering Mirror Mode.';
            },
            'history': () => {
                if (commandHistory.length === 0) return 'No commands in history.';
                return commandHistory.map(cmd => `<span style="color: #ffffff;">${cmd}</span>`).join('<br>');
            },
            'pause': () => {
                if (typeof isBgFrozen !== 'undefined') {
                    isBgFrozen = !isBgFrozen;
                    if (typeof playTick === 'function') playTick(true);
                    if (typeof triggerGhost === 'function') triggerGhost(isBgFrozen);
                    if (!isBgFrozen && typeof updateBackground === 'function') updateBackground();
                    return isBgFrozen ? 'Background frozen.' : 'Background unfrozen.';
                }
                return 'Freeze command not available.';
            },
            'cowsay': (args) => {
                const message = args.join(' ') || 'Mooo!';
                const cow = `
                    ${'_'.repeat(message.length + 2)}
                < ${message} >
                    ${'‾'.repeat(message.length + 2)}
                        ^__^
                                (oo)\\_______
                                    (__)\\       )\\/\\
                                        ||----w |
                                        ||     ||
                `;
                return `<pre style="color: #fff; line-height: 1.2;">${cow}</pre>`;
            },
            'timer': (args) => {
                const seconds = parseInt(args[0], 10);
                if (isNaN(seconds) || seconds <= 0) return 'Usage: timer [seconds]';

                // Stop any existing timer
                if (window.activeTimerInterval) clearInterval(window.activeTimerInterval);

                let remaining = seconds;
                const output = document.getElementById('cmd-output');
                const timerLine = document.createElement('div');
                timerLine.style.cssText = 'color: #ff00ff; font-size: 18px; font-weight: bold; text-shadow: 0 0 8px #ff00ff; margin: 8px 0;';
                timerLine.textContent = `⏱️ ${remaining}s`;
                output.appendChild(timerLine);

                // Self‑contained Morse beep helper – no external files needed
                const playMorseBeeps = () => {
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                        const startTime = audioCtx.currentTime;
                        // Three short "dit" beeps (Morse for 'S')
                        [0, 0.2, 0.4].forEach(delay => {
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(880, startTime + delay);
                            gain.gain.setValueAtTime(0, startTime + delay);
                            gain.gain.linearRampToValueAtTime(0.12, startTime + delay + 0.01);
                            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + delay + 0.1);
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.start(startTime + delay);
                            osc.stop(startTime + delay + 0.1);
                        });
                    } catch(e) {}
                };

                window.activeTimerInterval = setInterval(() => {
                    remaining--;
                    timerLine.textContent = remaining > 0 ? `⏱️ ${remaining}s` : '⏱️ TIME EXPIRED';
                    timerLine.style.color = remaining <= 0 ? '#0f0' : '#ff00ff';

                    // Auto‑scroll only if user was already near the bottom
                    const atBottom = (output.scrollTop + output.clientHeight) >= (output.scrollHeight - 20);
                    if (atBottom) output.scrollTop = output.scrollHeight;

                    if (remaining <= 0) {
                        clearInterval(window.activeTimerInterval);
                        window.activeTimerInterval = null;
                        playMorseBeeps();
                        if (typeof playTick === 'function') playTick(true);
                    }
                }, 1000);

                return `⏱️ Timer started for ${seconds}s. Type <span style="color: #0f0;">stoptimer</span> to cancel.`;
            },
            'stoptimer': () => {
                if (window.activeTimerInterval) {
                    clearInterval(window.activeTimerInterval);
                    window.activeTimerInterval = null;
                    return '⏱️ Timer cancelled.';
                }
                return 'No active timer.';
            },
            'date': (args) => {
                const now = new Date();
                const mode = args[0]?.toLowerCase();

                // Optional format switches
                if (mode === 'utc') {
                    return `<span style="color: #888;">UTC:</span> <span style="color: #00f0ff;">${now.toUTCString()}</span>`;
                }
                if (mode === 'iso') {
                    return `<span style="color: #888;">ISO 8601:</span> <span style="color: #ffaa00;">${now.toISOString()}</span>`;
                }
                if (mode === 'unix') {
                    return `<span style="color: #888;">UNIX Timestamp:</span> <span style="color: #0f0;">${Math.floor(now.getTime() / 1000)}</span>`;
                }

                // Default: friendly local time with a slight glow
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                };
                const formatted = now.toLocaleDateString('en-US', options);
                return `<span style="color: #0f0; text-shadow: 0 0 5px #0f0;">📅 ${formatted}</span>`;
            },

            'netorbit': (args) => {
                // Parse theme
                let theme = 'cyan';
                if (args[0]?.startsWith('--')) {
                    const themeArg = args[0].substring(2);
                    if (['green', 'red', 'violet', 'cyan'].includes(themeArg)) theme = themeArg;
                }

                // Stop previous animation
                if (window._netOrbitAnim) {
                    cancelAnimationFrame(window._netOrbitAnim);
                    window._netOrbitAnim = null;
                    const old = document.getElementById('netorbit-container');
                    if (old) old.remove();
                }

                const containerId = 'netorbit-container';
                const output = document.getElementById('cmd-output');

                // Container
                const container = document.createElement('div');
                container.id = containerId;
                container.style.cssText = 'border:1px solid var(--accent-color); border-radius:6px; padding:10px; margin-top:10px; background:rgba(0,0,0,0.3); text-align:center;';

                // Stats line
                const statsDiv = document.createElement('div');
                statsDiv.id = 'netorbit-stats';
                statsDiv.style.cssText = 'color:#fff; font-family:monospace; margin-bottom:8px; font-size:12px;';
                container.appendChild(statsDiv);

                // Canvas
                const canvas = document.createElement('canvas');
                canvas.id = 'netorbit-canvas';
                canvas.width = 640;
                canvas.height = 320;
                canvas.style.cssText = 'background:#000; border:1px solid #333; max-width:100%; display:block; margin:0 auto; image-rendering:pixelated;';
                container.appendChild(canvas);

                output.appendChild(container);
                output.scrollTop = output.scrollHeight;

                // Fire up animation
                initNetOrbit(canvas, theme, statsDiv);
                return ''; // already injected
            },
            'mesh': () => {
                const canvasId = 'mesh-canvas-' + Date.now();
                setTimeout(() => initMeshMap(canvasId), 100);
                return `
                <div style="border: 1px solid #0f0; border-radius: 6px; padding: 10px; margin-top: 10px; background: rgba(0,20,0,0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <b style="color: #0f0;">[ LORA MESH TOPOLOGY ]</b>
                        <span style="color: #888; font-size: 10px;">915 MHz • Local scan</span>
                    </div>
                    <div style="text-align: center; margin: 12px 0;">
                        <canvas id="${canvasId}" style="background: #000; border: 1px solid #333; max-width: 100%;"></canvas>
                    </div>
                    <div style="color: #0f0; font-size: 10px; margin-top: 5px;">
                        ● Active node   <span style="color: #444;">● Silent</span>   —   Type <span style="color:#fff;">mesh</span> to refresh
                    </div>
                </div>`;
            },
            'aprsmap': (args) => {
                const mode = args[0]?.toLowerCase();

                // Default to aprsdirect if no argument, or if user typed 'direct'
                if (!mode || mode === 'direct') {
                    return `
                    <div style="border: 1px solid var(--accent-color); border-radius: 8px; overflow: hidden; margin: 10px 0; background: #000;">
                        <iframe src="https://www.aprsdirect.com/center/40.0,-98.0/zoom/1/time/60"
                            width="100%" height="400" style="border: none;" loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
                        </iframe>
                    </div>
                    <span style="color: #888; font-size: 10px;">APRS Radio Traffic – aprsdirect.com</span>`;
                }

                if (mode === 'fi') {
                    return `
                    <div style="border: 1px solid var(--accent-color); border-radius: 8px; overflow: hidden; margin: 10px 0; background: #000;">
                        <iframe src="https://aprs.fi/"
                            width="100%" height="400" style="border: none;" loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
                        </iframe>
                        <div style="text-align: center; padding: 8px; background: rgba(0,255,0,0.1);">
                            <button onclick="window.open('https://aprs.fi/','_blank')" 
                                style="background:#0f0; color:#000; border:none; padding:8px 15px; font-family:monospace; font-weight:bold; cursor:pointer;">
                                [ OPEN IN FULL BROWSER ]
                            </button>
                            <br>
                            <span style="color: #888; font-size: 10px;">Copy link: <code>https://aprs.fi/</code></span>
                        </div>
                    </div>`;
                }

                return 'Usage: aprsmap [fi|direct] – fi = aprs.fi, direct = aprsdirect.com';
            },
            'chat': (args) => {
                const sub = args[0]?.toLowerCase();
                if (sub === '-all') {
                // Launch MQTT (green)
                commands['chat'](['mqtt']);
                // Launch P2P (magenta)
                commands['chat'](['p2p']);
                // Launch Firebase (amber)
                commands['chat'](['firebase']);
                return '🌐 All chat networks activated (MQTT, P2P, Firebase).';
            }

                if (!sub) {
                    return `
                        <div style="border-left: 3px solid var(--accent-color); padding-left: 10px;">
                            <b style="color: var(--accent-color);">[ J_OS COMMUNICATION TRIAD ]</b><br>
                            <span style="color: #0f0;">chat mqtt</span>  :Global public frequency<br>
                            <span style="color: #d400ff;">chat p2p</span>  :Encrypted peer‑to‑peer tunnel<br>
                            <span style="color: #fca311;">chat firebase</span>  :Persistent mainframe archive<br><br>
                            <span style="color: #fff;">chat -all</span>  :Open all three channels at once<br>
                            <span style="color: #00a2ff;">status</span>  –Show live connection status for all chat protocols.<br>
                            <span style="color: #ff0077;">disconnect</span>  –Gracefully shut down all network connections.<br>
                        </div>`;
                }

                // 1. MQTT – The Global Frequency (Green #0f0)
                if (sub === 'mqtt') {
                    const old = document.getElementById('mqtt-chat-box');
                    if (old) old.remove();
                    if (window._mqttClient) { window._mqttClient.end(); window._mqttClient = null; }

                    const output = document.getElementById('cmd-output');
                    const container = document.createElement('div');
                    container.id = 'mqtt-chat-box';
                    container.style.cssText = 'border:1px solid #0f0; padding:10px; margin-top:10px;';

                    // Message log
                    const logDiv = document.createElement('div');
                    logDiv.id = 'mqtt-log';
                    logDiv.style.cssText = 'height:150px; overflow-y:auto; font-family:monospace; font-size:12px; background:#111; color:#0f0; padding:5px; margin-bottom:8px;';
                    container.appendChild(logDiv);

                    // Input row
                    const inputRow = document.createElement('div');
                    inputRow.style.cssText = 'display:flex;';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = 'Message...';
                    input.style.cssText = 'flex:1; background:#222; border:1px solid #0f0; color:#0f0; padding:5px; font-family:monospace;';
                    const sendBtn = document.createElement('button');
                    sendBtn.textContent = '▶';
                    sendBtn.style.cssText = 'background:#0f0; color:#000; border:none; padding:5px 10px; cursor:pointer; font-weight:bold;';
                    inputRow.appendChild(input);
                    inputRow.appendChild(sendBtn);
                    container.appendChild(inputRow);

                    output.appendChild(container);

                    // Generate unique node ID
                    const nodeId = 'NODE-' + Math.random().toString(16).slice(2, 6).toUpperCase();

                    // Connect to public broker
                    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');
                    const topic = 'elitegdx/chat/public';

                    client.on('connect', () => {
                        client.subscribe(topic, (err) => {
                            if (!err) logDiv.innerHTML += '<div style="color:#888;">Connected to global frequency…</div>';
                        });
                        client.on('close', () => {
                            logDiv.innerHTML += '<div style="color:#f00;">⚠️ Connection lost. Reconnect by typing <b>chat mqtt</b> again.</div>';
                        });
                    });

                    client.on('message', (topic, message) => {
                        const msg = message.toString();
                        if (window._mqttLastSent === msg) { window._mqttLastSent = null; return; }
                        logDiv.innerHTML += `<div>${msg}</div>`;
                        logDiv.scrollTop = logDiv.scrollHeight;
                    });

                    const sendMessage = () => {
                        const text = input.value.trim();
                        if (!text) return;
                        const fullMsg = `[${new Date().toLocaleTimeString()}] ${nodeId}: ${text}`;
                        // 1. Show oneself that the message was sent
                        logDiv.innerHTML += `<div style="color:#888;">${fullMsg}</div>`;
                        logDiv.scrollTop = logDiv.scrollHeight;
                        // 2. Tell the broker not to echo it back
                        window._mqttLastSent = fullMsg;
                        // 3. Publish
                        client.publish(topic, fullMsg);
                        input.value = '';
                        input.focus();
                    };

                    sendBtn.addEventListener('click', sendMessage);
                    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

                    // Auto focus
                    setTimeout(() => input.focus(), 50);

                    window._mqttClient = client;
                    return '';
                }
                // 2. WebRTC P2P – The Secure Tunnel (Magenta #ff00ff)
                if (sub === 'p2p') {
                    const old = document.getElementById('p2p-chat-box');
                    if (old) old.remove();
                    if (window._peer) { window._peer.destroy(); window._peer = null; }
                    if (window._p2pConn) { window._p2pConn.close(); window._p2pConn = null; }

                    const output = document.getElementById('cmd-output');
                    const container = document.createElement('div');
                    container.id = 'p2p-chat-box';
                    container.style.cssText = 'border: 2px double #ff00ff; padding: 10px; margin-top: 10px; box-shadow: 0 0 15px rgba(255,0,255,0.2);';

                    // Simple status line
                    const statusDiv = document.createElement('div');
                    statusDiv.style.cssText = 'color: #ff00ff; font-size: 12px; margin-bottom: 5px;';
                    const setStatus = (text, color = '#ff00ff') => {
                        statusDiv.textContent = text;
                        statusDiv.style.color = color;
                    };
                    setStatus('Initialising…', '#888');
                    container.appendChild(statusDiv);

                    // Connect row
                    const connectRow = document.createElement('div');
                    connectRow.style.cssText = 'display: flex; gap: 5px; margin-bottom: 10px;';
                    const connectInput = document.createElement('input');
                    connectInput.type = 'text'; connectInput.placeholder = 'Peer ID';
                    connectInput.style.cssText = 'flex:1; background:#222; border:1px solid #ff00ff; color:#ff00ff; padding:5px; font-family:monospace;';
                    const connectBtn = document.createElement('button');
                    connectBtn.textContent = 'Tunnel';
                    connectBtn.style.cssText = 'background:#ff00ff; color:#000; border:none; padding:5px 10px; cursor:pointer; font-weight:bold;';
                    connectRow.appendChild(connectInput);
                    connectRow.appendChild(connectBtn);
                    container.appendChild(connectRow);

                    // Message log
                    const logDiv = document.createElement('div');
                    logDiv.id = 'p2p-log';
                    logDiv.style.cssText = 'height:150px; overflow-y:auto; font-family:monospace; font-size:12px; background:#111; color:#ff00ff; padding:5px; margin-bottom:8px;';
                    container.appendChild(logDiv);

                    // Message input
                    const msgRow = document.createElement('div'); msgRow.style.cssText = 'display:flex;';
                    const msgInput = document.createElement('input');
                    msgInput.type = 'text'; msgInput.placeholder = 'Message…';
                    msgInput.style.cssText = 'flex:1; background:#222; border:1px solid #ff00ff; color:#ff00ff; padding:5px; font-family:monospace;';
                    const sendBtn = document.createElement('button');
                    sendBtn.textContent = '▶';
                    sendBtn.style.cssText = 'background:#ff00ff; color:#000; border:none; padding:5px 10px; cursor:pointer; font-weight:bold;';
                    msgRow.appendChild(msgInput); msgRow.appendChild(sendBtn);
                    container.appendChild(msgRow);
                    output.appendChild(container);

                    const nodeId = 'P2P-' + Math.random().toString(16).slice(2, 5).toUpperCase();
                    let conn = null;

                    // Create peer (no keepalive, no reconnect button)
                    const peer = new Peer(undefined, { debug: 0 });
                    window._peer = peer;

                    peer.on('open', (id) => {
                        setStatus(`Your Peer ID: ${id} (${nodeId})`, '#fff');
                    });

                    peer.on('connection', (incomingConn) => {
                        conn = incomingConn;
                        setupConn(conn);
                        logDiv.innerHTML += '<div style="color:#888;">🔗 Encrypted tunnel established.</div>';
                        setStatus('Connected', '#0f0');
                    });

                    peer.on('error', (err) => {
                        logDiv.innerHTML += `<div style="color:#f00;">⚠️ Peer error: ${err.type || 'unknown'}</div>`;
                        setStatus('Error', '#f00');
                    });

                    peer.on('disconnected', () => {
                        setStatus('Disconnected', '#f00');
                        if (conn) { conn.close(); conn = null; }
                    });

                    peer.on('close', () => {
                        setStatus('Closed', '#888');
                        if (conn) { conn.close(); conn = null; }
                    });

                    connectBtn.addEventListener('click', () => {
                        const remoteId = connectInput.value.trim();
                        if (!remoteId) return;
                        conn = peer.connect(remoteId, { reliable: true });
                        setupConn(conn);
                        logDiv.innerHTML += '<div style="color:#888;">📡 Dialling peer…</div>';
                    });

                    const setupConn = (connection) => {
                        window._p2pConn = connection;
                        connection.on('open', () => {
                            logDiv.innerHTML += '<div style="color:#888;">✅ Direct link active.</div>';
                            setStatus('Connected', '#0f0');
                        });
                        connection.on('data', (data) => {
                            logDiv.innerHTML += `<div>${data}</div>`;
                            logDiv.scrollTop = logDiv.scrollHeight;
                        });
                        connection.on('close', () => {
                            logDiv.innerHTML += '<div style="color:#f00;">🔌 Tunnel closed.</div>';
                            setStatus('Disconnected', '#f00');
                        });
                        connection.on('error', (err) => {
                            logDiv.innerHTML += `<div style="color:#f00;">⚠️ Connection error: ${err.type || 'unknown'}</div>`;
                            setStatus('Error', '#f00');
                        });
                    };

                    const sendP2PMessage = () => {
                        if (!conn || !conn.open) {
                            logDiv.innerHTML += '<div style="color:#f00;">⚠️ No active tunnel – connect first.</div>';
                            return;
                        }
                        const text = msgInput.value.trim();
                        if (!text) return;
                        const msg = `[${new Date().toLocaleTimeString()}] ${nodeId}: ${text}`;
                        try {
                            conn.send(msg);
                        } catch(e) {
                            logDiv.innerHTML += '<div style="color:#f00;">⚠️ Send failed.</div>';
                            return;
                        }
                        // Show your own message immediately
                        logDiv.innerHTML += `<div style="color:#ccc;">You: ${text}</div>`;
                        logDiv.scrollTop = logDiv.scrollHeight;
                        msgInput.value = '';
                        msgInput.focus();
                    };

                    sendBtn.addEventListener('click', sendP2PMessage);
                    msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendP2PMessage(); });

                    setTimeout(() => msgInput.focus(), 50);
                    return '';
                }
                // 3. Firebase – The Mainframe Archive (Amber #fca311)
                if (sub === 'firebase') {
                    const old = document.getElementById('firebase-chat-box');
                    if (old) {
                        // Critical: remove previous listener to prevent duplicate messages
                        if (window._chatRef) window._chatRef.off();
                        old.remove();
                    }

                    if (typeof db === 'undefined') {
                        appendCommandOutput('Firebase not configured. Add your config to index.html.', true);
                        return '';
                    }

                    const output = document.getElementById('cmd-output');
                    const container = document.createElement('div');
                    container.id = 'firebase-chat-box';
                    container.style.cssText = 'border: 1px solid #fca311; padding: 10px; margin-top: 10px;';

                    const logDiv = document.createElement('div');
                    logDiv.id = 'firebase-log';
                    logDiv.style.cssText = 'height:150px; overflow-y:auto; font-family:monospace; font-size:12px; background:#111; color:#fca311; padding:5px; margin-bottom:8px;';
                    container.appendChild(logDiv);

                    const msgRow = document.createElement('div');
                    msgRow.style.cssText = 'display:flex;';
                    const msgInput = document.createElement('input');
                    msgInput.type = 'text';
                    msgInput.placeholder = 'Message…';
                    msgInput.style.cssText = 'flex:1; background:#222; border:1px solid #fca311; color:#fca311; padding:5px; font-family:monospace;';
                    const sendBtn = document.createElement('button');
                    sendBtn.textContent = '▶';
                    sendBtn.style.cssText = 'background:#fca311; color:#000; border:none; padding:5px 10px; cursor:pointer; font-weight:bold;';
                    msgRow.appendChild(msgInput);
                    msgRow.appendChild(sendBtn);
                    container.appendChild(msgRow);

                    output.appendChild(container);

                    // Node ID for the archive
                    const nodeId = 'ARCH-' + Math.random().toString(16).slice(2, 5).toUpperCase();

                    // Reference to chat messages
                    const chatRef = window.db.ref('elitegdx/chat');
                    window._chatRef = chatRef;

                    chatRef.limitToLast(20).on('child_added', (snap) => {
                        const msg = snap.val();
                        logDiv.innerHTML += `<div><span style="color:#888;">[${msg.time}]</span> <b style="color:#fff;">${msg.user}:</b> ${msg.text}</div>`;
                        logDiv.scrollTop = logDiv.scrollHeight;
                    });

                    const sendMessage = () => {
                        const text = msgInput.value.trim();
                        if (!text) return;
                        chatRef.push({
                            user: nodeId,
                            text: text,
                            time: new Date().toLocaleTimeString()
                        });
                        msgInput.value = '';
                        msgInput.focus();
                    };

                    sendBtn.addEventListener('click', sendMessage);
                    msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

                    return '';
                }
            },
            'status': () => {
                const mqttActive = window._mqttClient && window._mqttClient.connected ?
                    '<span style="color:#0f0;">ONLINE</span>' : '<span style="color:#555;">OFFLINE</span>';
                const p2pActive = window._p2pConn && window._p2pConn.open ?
                    '<span style="color:#0f0;">TUNNEL ACTIVE</span>' :
                    '<span style="color:#f00;">TUNNEL OFFLINE</span>';
                const firebaseActive = window._chatRef ?
                    '<span style="color:#fca311;">SYNCED</span>' : '<span style="color:#555;">DISCONNECTED</span>';

                return `
                <div style="border: 1px solid #444; padding: 10px; background: rgba(255,255,255,0.05); font-family: monospace;">
                    <b style="color: var(--accent-color);">[ J_OS SUBSYSTEM REPORT ]</b><br>
                    ------------------------------------<br>
                    <span style="color: #0f0;">> NETWORK GATEWAY (MQTT):</span> ${mqttActive}<br>
                    <span style="color: #ff00ff;">> P2P MESH LINK (WEBRTC):</span> ${p2pActive}<br>
                    <span style="color: #fca311;">> ARCHIVE ARCHITECTURE:</span> ${firebaseActive}<br>
                    ------------------------------------<br>
                    <span style="color: #888;">CPU UTILIZATION:</span> ${Math.floor(Math.random() * 15) + 2}%<br>
                    <span style="color: #888;">UPTIME:</span> ${Math.floor(performance.now() / 1000)}s<br>
                    <span style="color: #888;">LOCATION:</span> <span style="color:#fff;">[REDACTED]</span>
                </div>`;
            },
            'disconnect': () => {
                // MQTT
                if (window._mqttClient) {
                    window._mqttClient.end();
                    window._mqttClient = null;
                }
                // P2P
                if (window._p2pConn) {
                    window._p2pConn.close();
                    window._p2pConn = null;
                }
                if (window._peer) {
                    window._peer.destroy();
                    window._peer = null;
                }
                // Firebase listener
                if (window._chatRef) {
                    window._chatRef.off();
                    window._chatRef = null;
                }
                // Clear any active chat UI boxes
                const boxes = ['mqtt-chat-box', 'p2p-chat-box', 'firebase-chat-box'];
                boxes.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                return '🔌 All network links terminated. Type <span style="color:#0f0;">chat</span> to reconnect.';
            },
            'spinner': () => {
                if (spinnerInterval) return 'A neural-link is already active. Type stopspinner to halt.';

                const spinChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
                let i = 0;

                const spinnerElement = document.createElement('div');
                spinnerElement.id = 'active-spinner';
                spinnerElement.style.color = 'var(--accent-color, #0f0)';
                cmdOutput.appendChild(spinnerElement);

                spinnerInterval = setInterval(() => {
                    const el = document.getElementById('active-spinner');
                    if (el) {
                        el.textContent = `🌀 [ ${spinChars[i % spinChars.length]} ] Establishing Neural Uplink...`;
                        i++;
                    }
                    // Auto‑scroll only if user was already near the bottom
                    const atBottom = (cmdOutput.scrollTop + cmdOutput.clientHeight) >= (cmdOutput.scrollHeight - 20);
                    if (atBottom) cmdOutput.scrollTop = cmdOutput.scrollHeight;
                }, 100);

                return 'Accessing Akashic Records… Type "stopspinner" to disconnect.';
            },
            'stopspinner': () => {
                if (!spinnerInterval) return 'No spinner running.';
                clearInterval(spinnerInterval);
                spinnerInterval = null;
                const line = document.getElementById('spinner-line');
                if (line) line.remove();
                return 'Spinner stopped.';
            },
            'ascii': (args) => {
                const arts = [
                    // 1. TERMINAL POWER – J_OS (magenta)
                        `<pre class="ascii-art" style="color: #ff00ff; font-size: 10px; line-height: 1.2; text-shadow: 0 0 5px #ff00ff;">
                        ╔══════════════════╗
                        ║   TERMINAL POWER   ║
                        ╚══════════════════╝
                           ▄▄▄▄▄▄▄▄▄
                                     █  J_OS   █     [@_@]
                           ▀▀▀▀▀▀▀▀▀
                        ╔══════════════════╗
                        ║      CLI POWER     ║
                        ╚══════════════════╝
                        </pre>`,

                    // 2. // Kali Linux Dragon
                        `<pre class="ascii-art" style="color: #3498db; font-size: 10px; line-height: 1; text-shadow: 0 0 3px #3498db; font-family: monospace;">
                         ..........
                                ..,;:ccc,.
                             ......''';lxO.
                      .....''''..........,:ld;
                                   .';;;:::;,,.x,
                           ..'''.       0Xxoc:,.  ...
                              ....            ,ONkc;,;cokOdc',.
                            .                OMo           ':ddo.
                                            dMc               :OO;
                                            0M.                 .:o.
                        ;Wd
                            ;XO,
                                    ,d0Odlc;,..
                                          ..',;:cdOOd::,.
                                                  .:dOdo:   'x0l
                                                      'x0l  
                                                          cWc   
                                                    .cNl
        <span style="color: #00ffff;">[ THE QUIETER YOU BECOME ]</span>
        <span style="color: #00ffff;">[ THE MORE YOU CAN HEAR  ]</span>
                        </pre>`,

                    // 3. Debian Swirl (The Universal)
                        `<pre style="color: #ff0055; font-size: 9px; line-height: 1.2; text-shadow: 0 0 4px #ff0055;">
                            _,nd8888888ba,_
                         ,d8888888888888888b,
                        ,888888888888888888888,
                        d8888888P""'  '""Y88888b
                       888888P'             'Y888
                       888888                  888
                       Y88888       _,aaaa,_    888
                        Y88888     ,88888888P   88P
                         'Y8888,   88888888P   ,88'
                           'Y8888888888888P  ,88'
                              '""Y8888P""' ,88'
                               _______,88'
                            Y888888P'
                        <span style="color: #ffaa00;">[ KERNEL: DEBIAN STABLE]</span></pre>`,

                    // 4. Arch Linux (Kryptos Vector)

                        `<pre style="font-size: 9px; line-height: 1.2;">
                                    <span style="color: #00f0ff;">/\\</span>
                                    <span style="color: #00f0ff;">/  \\</span>
                                    <span style="color: #00f0ff;">/ /\\ \\</span>
                                    <span style="color: #00f0ff;">/ /  \\ \\</span>
                                    <span style="color: #00f0ff;">/ /    \\ \\</span>
                                    <span style="color: #00f0ff;">/ /      \\ \\</span>
                                    <span style="color: #00f0ff;">/ /_      _\\ \\</span>
                                    <span style="color: #00f0ff;">/___/      \\___\\</span>
                                    <span style="color: #00f0ff;">/   /        \\   \\</span>
                                    <span style="color: #00f0ff;">/___/          \\___\\</span>
                                    <span style="color: #0f0;">[ ROOT PRIVILEGES: GRANTED ]</span>
                                    <span style="color: #0f0;">[ // J_OS SECURE // ]</span>
                        </pre>`,
                    
                    // 5. Meditating Monk Zazen – Dhyana Mudra
                    `<pre style="color: #ffaa00; font-size: 9px; line-height: 1.1; text-shadow: 0 0 5px #ffaa00; padding: 10px 0;">
                                .    *    .
                               '   . (o) .   '
                                .  \` - \`  .
                            ,-.
                            (   )
                            __,-' / \\ '-.__
                            (   /  | | |  \\   )
                            |\\_\\\\_\\| | |\\_\\_\\|
                            (      |   |     )
                            \\\\____( )____/
                            _,-'         '-._
                            (       ZAZEN       )
                            \`-._         _,-'
                                \`-------'
                        <span style="color: #0f0;">[ STATUS: NEURAL ALIGNMENT OPTIMAL ]</span>
                        <span style="color: #f00;">[ RARE ENCOUNTER: LOTUS PERSONA ]</span>
                    </pre>`,

                    // 6. Abhaya / Teaching Mudra (raised open hand)
                    `<pre style="color: #ffaa00; font-size: 9px; line-height: 1.1; text-shadow: 0 0 5px #ffaa00; padding: 10px 0;">
                            .    *    .
                             '   . (o) .   '
                            .  \` - \`  .
                            ,-.
                            (   )
                            __,-'  \\ / \`-.__
                            (   /   |||   \\   )
                            |\\_\\\\_\\|||_/_/|
                            (  \\_/     \\_/  )
                            |   \\_____/   |
                            |      |      |
                            |    ,' '.    |
                            |   (  _  )   |
                            |    '-' '-'   |
                        <span style="color: #0f0;">[ STATUS: DHARMA WHEEL SPINNING ]</span>
                        <span style="color: #f00;">[ RARE ENCOUNTER: TEACHING MUDRA ]</span>
                    </pre>`,

                    // 7. Abhaya Mudra (Fearlessness) – open palm outward
                   `<pre style="color: #ffaa00; font-size: 9px; line-height: 1.1; text-shadow: 0 0 5px #ffaa00; padding: 10px 0;">
                                .    *    .
                                '   . (o) .   '
                                .  \` - \`  .
                            ,-.
                            (   )
                            __,-'  \\ /  \`-.__
                            (   /   |||   \\   )
                            |\\_\\\\_\\|||_/_/|
                            (    \\_______/    )
                            \\      |      /
                            \\     |     /
                            \\    |    /
                            _||_
                            /    \\
                            /  ||  \\
                            |  /  \\  |
                            | |    | |
                            | |    | |
                            | |    | |
                            |_|____|_|
                            \`-...-'
                        <span style="color: #0f0;">[ STATUS: FEARLESS GATE OPEN ]</span>
                        <span style="color: #f00;">[ RARE ENCOUNTER: PROTECTION MUDRA ]</span>
                    </pre>`,
                ];

                // If an argument is given, try to use it as a 1‑based index
                if (args.length > 0) {
                    const n = parseInt(args[0], 10);
                    if (!isNaN(n) && n >= 1 && n <= arts.length) {
                        return arts[n - 1];
                    }
                    return `<span style="color: #f00;">⚠️ Please choose 1–${arts.length} or just type <code>ascii</code> for a random piece.</span>`;
                }

                // No arguments – random selection
                const art = arts[Math.floor(Math.random() * arts.length)];
                return art;
            },
            'hack': () => {
                // Clear any previous hack animation
                if (window.hackInterval) clearInterval(window.hackInterval);

                const lines = [
                    'Establishing secure connection...',
                    'Bypassing firewall...',
                    'Decrypting passphrase...',
                    'Injecting payload...',
                    'Escalating privileges...',
                    'Downloading database...',
                    'Covering tracks...'
                ];

                const hackDiv = document.createElement('div');
                hackDiv.style.color = '#0f0';
                hackDiv.innerHTML = '<span style="color: #0f0; font-weight: bold;">>>> INITIATING BREACH <<<</span><br>';
                cmdOutput.appendChild(hackDiv);

                const progressLine = document.createElement('div');
                hackDiv.appendChild(progressLine);

                let lineIndex = 0;
                let progress = 0;

                window.hackInterval = setInterval(() => {
                    if (lineIndex >= lines.length) {
                        clearInterval(window.hackInterval);
                        progressLine.innerHTML = '<span style="color: #f00; text-shadow: 0 0 10px #f00; font-weight: bold;">ACCESS GRANTED (just kidding)</span>';
                        cmdOutput.scrollTop = cmdOutput.scrollHeight;
                        return;
                    }

                    progress += Math.random() * 20;

                    if (progress >= 100) {
                        progress = 100;
                        const bar = '█'.repeat(20);
                        const completedLine = document.createElement('div');
                        // Title on its own line, bar on the next line – exactly as before, safe for mobile
                        completedLine.innerHTML = `${lines[lineIndex]}<br><span style="color: #0f0;">[${bar}] 100%</span>`;
                        hackDiv.insertBefore(completedLine, progressLine);
                        lineIndex++;
                        progress = 0;
                    } else {
                        const filled = Math.floor(progress / 5);
                        const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
                        // In‑progress step already has title and bar on separate lines (title above, bar below)
                        progressLine.innerHTML = `<span style="color: #888;">${lines[lineIndex]}</span><br>[${bar}] ${Math.floor(progress)}%`;
                    }

                    cmdOutput.scrollTop = cmdOutput.scrollHeight;
                }, 150);

                return '';
            },
            'htop': () => {
                const cpu = Math.floor(Math.random() * 20) + 10;
                const mem = Math.floor(Math.random() * 40) + 20;

                const bar = (pct) => {
                    const filled = Math.round(pct / 5);
                    // Green if low, yellow if medium, red if high
                    const color = pct > 80 ? '#ff0000' : pct > 50 ? '#ffff00' : '#0f0';
                    return `<span style="color: ${color}">[${'|'.repeat(filled)}${'.'.repeat(20 - filled)}] ${pct}%</span>`;
                };

                const tasks = [
                    { pid: 1024, user: 'root', cpu: 12.5, cmd: 'akashic_kernel' },
                    { pid: 2048, user: 'johan', cpu: (Math.random() * 5).toFixed(1), cmd: 'neural_link' },
                    { pid: 4096, user: 'guest', cpu: 0.0, cmd: 'bash' }
                ];

                let tasksHtml = tasks.map(t =>
                    `<tr><td>${t.pid}</td><td>${t.user}</td><td>${t.cpu}%</td><td>${t.cmd}</td></tr>`
                ).join('');

                return `
                    <div style="color: #0f0; font-family: monospace; line-height: 1.3;">
                    <strong>CPU</strong> ${bar(cpu)}<br>
                    <strong>MEM</strong> ${bar(mem)}<br>
                    <strong>TASKS:</strong> 42 total, 1 running, 41 sleeping<br><br>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <tr style="background: #333;"><td>PID</td><td>USER</td><td>CPU%</td><td>COMMAND</td></tr>
                        ${tasksHtml}
                    </table>
                    </div>
                `;
            },
            'rotate': () => {
                // Prevent overlapping glitch animations
                if (window.rotateInterval) clearInterval(window.rotateInterval);

                const message = "SYNCHRONIZING NEURAL LAYERS...";
                const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?/";
                const output = document.getElementById('cmd-output');
                
                const rotateLine = document.createElement('div');
                rotateLine.style.color = '#0f0';
                rotateLine.style.fontFamily = 'monospace';
                rotateLine.style.textShadow = '0 0 8px #0f0';
                output.appendChild(rotateLine);

                let iterations = 0;
                const maxIterations = 75;             //15 before//

                window.rotateInterval = setInterval(() => {
                    let scrambled = message.split('').map((char, index) => {
                        if (char === " ") return " ";
                        // As iterations progress, lock in characters from left to right
                        if (iterations > (index / message.length) * maxIterations) {
                            return char;
                        }
                        return symbols[Math.floor(Math.random() * symbols.length)];
                    }).join('');

                    rotateLine.textContent = `[ ${scrambled} ]`;
                    
                    iterations++;
                    if (iterations > maxIterations) {
                        clearInterval(window.rotateInterval);
                        rotateLine.innerHTML = `<span style="color: #ff00ff; text-shadow: 0 0 6px #ff00ff;">[ DECRYPTION COMPLETE: ${message} ]</span>`;
                    }
                    
                    output.scrollTop = output.scrollHeight;
                }, 70);

                return 'Initiating rotary decryption...';
            },
            'kali': async (args) => {
                const sub = args[0]?.toLowerCase();
                const rest = args.slice(1).join(' ');

                // Utility for visual suspense
                const delay = (ms) => new Promise(res => setTimeout(res, ms));

                if (!sub) {
                    return `
                    <div style="border: 1px solid #3498db; padding: 12px; background: rgba(52, 152, 219, 0.1); border-radius: 4px; font-family: monospace; font-size: 10px; line-height: 0.8;">
                        <strong style="color: #fff; background: #0365a6; padding: 0 5px;">🐉 KALI DARK OPERATIONS v2.0</strong><br><br>
                        <span style="color: #3498db;">> hash [text]</span>      - Generate a real SHA-256 fingerprint<br>
                        <span style="color: #3498db;">> scan [ip]</span>        - Run an asynchronous port audit<br>
                        <span style="color: #3498db;">> crack [hash]</span>     - Brute-force simulation (Entropy analysis)<br>
                        <span style="color: #3498db;">> inject [target]</span>  - Script-kiddie payload delivery<br>
                        <span style="color: #3498db;">> genkey</span>           - Generate a fake SSH keypair<br>
                        <span style="color: #3498db;">> dragon</span>           - Display system heraldry(Kali dragon)<br>
                        <span style="color: #3498db;">> arch</span>             - Display the Linux trinity (Debian, Arch, Kali)
                        <br>
                        <span style="color: #888; font-size: 5px;">THE QUIETER YOU BECOME, THE MORE YOU ARE ABLE TO HEAR</span>
                    </div>`;
                        }

                        // --- REAL SHA-256 HASH ---
                        if (sub === 'hash') {
                            if (!rest) return 'Usage: kali hash [text]';
                            const msgUint8 = new TextEncoder().encode(rest);
                            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                            const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                            return `[ HASH GENERATED ]<br><span style="color: #ffaa00;">${hashHex}</span>`;
                        }

                        // --- ASYNC PORT SCAN (professional table) ---
                        if (sub === 'scan') {
                            if (!rest) return 'Usage: kali scan [ip]';
                            appendCommandOutput(`[+] Initiating Nmap-style scan on ${rest}...`);
                            await delay(800);
                            appendCommandOutput('[+] Discovering open ports...');
                            await delay(1200);

                            return `
                    <div style="color: #0f0; font-size: 11px; line-height: 1.3;">
                        <table style="width: 100%; border-top: 1px solid #333; margin-top: 8px;">
                            <tr style="color: #888;"><td>PORT</td><td>STATE</td><td>SERVICE</td></tr>
                            <tr><td>22/tcp</td>   <td style="color: #0f0;">OPEN</td>  <td>ssh</td></tr>
                            <tr><td>80/tcp</td>   <td style="color: #0f0;">OPEN</td>  <td>http</td></tr>
                            <tr><td>443/tcp</td>  <td style="color: #0f0;">OPEN</td>  <td>https</td></tr>
                            <tr><td>3306/tcp</td> <td style="color: #f00;">FILTERED</td> <td>mysql</td></tr>
                        </table><br>
                        <span style="color: #ff00ff;">[!] SCAN COMPLETE: 3 active services identified.</span>
                    </div>`;
                        }

                // --- ENTROPY CRACKER (visual) ---
                if (sub === 'crack') {
                    if (!rest) return 'Usage: kali crack [hash]';
                    appendCommandOutput(`[~] Brute-forcing hash: ${rest.substring(0, 8)}...`);
                    appendCommandOutput('[~] Dictionary: rockyou.txt');
                    await delay(1500);
                    appendCommandOutput('[~] Attempting 1,259,233,447 passwords...');
                    await delay(1000);
                    return `<span style="color: #0f0;">[!] CRACK SUCCESS: password123</span>`;
                }

                // --- INJECT with suspense ---
                if (sub === 'inject') {
                    if (!rest) return 'Usage: kali inject [target]';
                    appendCommandOutput(`[*] Crafting payload for ${rest}...`);
                    await delay(800);
                    appendCommandOutput('[*] Encoding shellcode...');
                    await delay(600);
                    appendCommandOutput('[*] Establishing reverse connection...');
                    await delay(1000);
                    return `<span style="color: #0f0;">[+] Payload delivered. Reverse shell active on ${rest}.</span>`;
                }

                // --- GENKEY ---
                if (sub === 'genkey') {
                    const key = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC'+ Math.random().toString(36).substring(2,15) +'...';
                    return `<pre style="color: #0f0;">${key}</pre>`;
                }

                // --- DRAGON ---
                if (sub === 'dragon') {
                    // The Kali dragon is the 2nd art in the ascii array (index 2).
                    return commands['ascii'](['2']);
                }
                // --- ARCH (triple banner: Debian, Arch, Kali) ---
                if (sub === 'arch') {
                    const debian = commands['ascii'](['3']);  // Debian Swirl
                    const arch   = commands['ascii'](['4']);  // Arch Linux
                    const kali   = commands['ascii'](['2']);  // Kali Dragon
                    return `${debian}<br>${arch}<br>${kali}`;
                }

                return `⚠️ Module '${sub}' not found. Type 'kali' for manual.`;
            },
            'cipher': () => {
                return `
                <div style="border: 1px solid #00ffff; padding: 12px; background: rgba(0, 255, 255, 0.03); border-radius: 8px; font-size:9px; line-height: 1;">
                <strong style="color: #00ffff;">📜 AKASHIC CIPHER MANUAL</strong><br>
                <span style="color: #888;">How to encrypt &amp; decrypt every message type</span><br>
                <br>

                <strong style="color: #0f0;">🔵 Base64 (encode / decode)</strong><br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">encode hello</span><br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">decode aGVsbG8=</span><br>
                <span style="color: #888;">The commands are exact mirrors. No key needed.</span><br>
                <br>

                <strong style="color: #0f0;">🟢 Caesar Shift (shift)</strong><br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">shift 3 hello</span> → khoor<br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">shift -3 khoor</span> → hello<br>
                <span style="color: #888;">Use the negative of the encryption number. Digits wrap as well.</span><br>
                <br>

                <strong style="color: #0f0;">🟡 Vigenère (vigenere)</strong><br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">vigenere enc secret hello</span><br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">vigenere dec secret &lt;ciphertext&gt;</span><br>
                <span style="color: #888;">You must use the same keyword and change the first argument to 'dec'.</span><br>
                <br>

                <strong style="color: #0f0;">🟣 Atbash Mirror (mirror)</strong><br>
                <span style="color: #fff;">Encrypt &amp; Decrypt:</span> <span style="color: #0f0;">mirror hello</span> → svool (then mirror again to get back)<br>
                <span style="color: #888;">It's its own inverse – no extra step needed.</span><br>
                <br>

                <strong style="color: #ff0000;">🔴 Reverse Cipher (reverse)</strong><br>
                <span style="color: #fff;">Encrypt &amp; Decrypt:</span> <span style="color: #0f0;">reverse hello</span> → olleh (reverse again to get back)<br>
                <span style="color: #888;">It's its own inverse – no extra step needed. Try "tenet" for a surprise.</span><br>
                <br>

                <strong style="color: #0f0;">🔴 AES‑256 Vault (vault)</strong><br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">vault enc mypassword hello</span><br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">vault dec mypassword &lt;hex_ciphertext&gt;</span><br>
                <span style="color: #888;">You can omit the password if you've stored one with <span style="color: #0f0;">handshake set mykey</span>.<br>
                The ciphertext includes a random IV – safe to reuse the same key.</span><br>
                <br>

                <strong style="color: #0f0;">⚫ Kryptos Stream (kryptos)</strong><br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">kryptos bin hello</span> → 01101000 01100101 ...<br>
                <span style="color: #fff;">Encrypt:</span> <span style="color: #0f0;">kryptos hex hello</span> → 68 65 6C 6C 6F<br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">kryptos dec bin 01101000 01100101 ...</span> → hello<br>
                <span style="color: #fff;">Decrypt:</span> <span style="color: #0f0;">kryptos dec hex 68 65 6C 6C 6F</span> → hello<br>
                <br>

                <strong style="color: #0f0;">🤝 Handshake (handshake)</strong><br>
                <span style="color: #fff;">Store a password:</span> <span style="color: #0f0;">handshake set mysecret</span><br>
                <span style="color: #fff;">Clear:</span> <span style="color: #0f0;">handshake clear</span><br>
                <span style="color: #888;">Stored only in your browser's local storage – never leaves your machine.</span><br>
                <br>

                <span style="color: #555;">────────────────────────</span><br>
                <span style="color: #00ffff;">Type any example to execute directly.</span>
                </div>`;
            },

            // ========== AKASHIC CIPHER SUITE ==========
            // 1. Base64 ENCODE
            'encode': (args) => {
                if (args.length === 0) return 'Usage: encode [message]\nExample: encode hello world';
                const str = args.join(' ');
                try {
                    // Unicode‑safe Base64
                    const encoded = btoa(unescape(encodeURIComponent(str)));
                    return `[ ENCODING COMPLETE ]<br><span style="color: #ff00ff;">${encoded}</span>`;
                } catch (e) {
                    return '<span style="color: #f00;">ERROR: Invalid characters.</span>';
                }
            },

            // 2. Base64 DECODE
            'decode': (args) => {
                if (args.length === 0) return 'Usage: decode [base64_string]\nExample: decode aGVsbG8gV29ybGQ=';
                try {
                    const decoded = decodeURIComponent(escape(atob(args[0])));
                    return `[ DECODING COMPLETE ]<br><span style="color: #0f0;">${decoded}</span>`;
                } catch (e) {
                    return '<span style="color: #f00;">ERROR: Invalid Base64 string.</span>';
                }
            },

            // 3. Caesar SHIFT (letters + digits wrap)
            'shift': (args) => {
                if (args.length < 2) return 'Usage: shift [number] [message]\nExample: shift 3 Hello 007';
                const shiftAmt = parseInt(args[0], 10);
                const text = args.slice(1).join(' ');
                if (isNaN(shiftAmt)) return '⚠️ The first argument must be a number.';

                const shifted = text.split('').map(char => {
                    const code = char.charCodeAt(0);
                    // Uppercase letters
                    if (code >= 65 && code <= 90)
                        return String.fromCharCode(((code - 65 + shiftAmt) % 26 + 26) % 26 + 65);
                    // Lowercase letters
                    if (code >= 97 && code <= 122)
                        return String.fromCharCode(((code - 97 + shiftAmt) % 26 + 26) % 26 + 97);
                    // Digits
                    if (code >= 48 && code <= 57)
                        return String.fromCharCode(((code - 48 + shiftAmt) % 10 + 10) % 10 + 48);
                    return char;
                }).join('');

                return `<span style="color: #888;">Original: ${text}</span><br>` +
                    `<span style="color: #0f0;">Shifted (+${shiftAmt}): ${shifted}</span>`;
            },

            // 4. KRYPTOS – Binary/Hex stream
            'kryptos': (args) => {
                if (args.length < 2) return 'Usage: kryptos [enc|dec] [bin|hex] [message/stream]\nExamples:\n  kryptos hex hello\n  kryptos dec bin 01101000 01100101 01101100 01101100 01101111';
                const mode = args[0];         // 'enc' or 'dec'
                const type = args[1];         // 'bin' or 'hex'
                const data = args.slice(2).join(' ');

                if (!['enc','dec'].includes(mode) || !['bin','hex'].includes(type))
                    return '⚠️ Mode must be "enc" or "dec", type must be "bin" or "hex".';

                // --- Encryption (original logic) ---
                if (mode === 'enc') {
                    let result = '';
                    if (type === 'bin') {
                        result = data.split('').map(char =>
                            char.charCodeAt(0).toString(2).padStart(8, '0')
                        ).join(' ');
                    } else { // hex
                        result = data.split('').map(char =>
                            char.charCodeAt(0).toString(16).padStart(2, '0')
                        ).join(' ').toUpperCase();
                    }
                    return `<div style="word-break: break-all; color: #ffaa00; font-size: 10px;">` +
                        `[ AKASHIC ${type.toUpperCase()} STREAM ]<br>${result}</div>`;
                }

                // --- Decryption ---
                if (mode === 'dec') {
                    try {
                        let decoded = '';
                        if (type === 'bin') {
                            // Split by spaces, each group of 8 bits
                            const groups = data.trim().split(/\s+/);
                            for (const bin of groups) {
                                if (!/^[01]{8}$/.test(bin)) throw new Error('Invalid binary group');
                                decoded += String.fromCharCode(parseInt(bin, 2));
                            }
                        } else { // hex
                            const groups = data.trim().split(/\s+/);
                            for (const hex of groups) {
                                if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new Error('Invalid hex pair');
                                decoded += String.fromCharCode(parseInt(hex, 16));
                            }
                        }
                        return `<span style="color: #0f0;">[ DECRYPTED STREAM ]: ${decoded}</span>`;
                    } catch (e) {
                        return `<span style="color: #f00;">⚠️ Invalid ${type} stream – check format.</span>`;
                    }
                }
            },

            // 5. VIGENÈRE cipher (encode/decode with keyword)
            'vigenere': (args) => {
                const mode = args[0];   // 'enc' or 'dec'
                const key = args[1]?.toLowerCase();
                const text = args.slice(2).join(' ');
                
                if (!['enc', 'dec'].includes(mode) || !key || !text) 
                    return `Usage: vigenere [enc|dec] [keyword] [message]
                    Encrypt: vigenere enc secret hello world
                    Decrypt: vigenere dec secret [ciphertext]
                    The same keyword must be used for both encryption and decryption.`;

                let result = "";
                for (let i = 0, j = 0; i < text.length; i++) {
                    const c = text.charCodeAt(i);
                    if (c >= 65 && c <= 90) {          // Uppercase
                        const shift = key.charCodeAt(j % key.length) - 97;
                        result += String.fromCharCode(mode === 'enc' 
                            ? (c - 65 + shift) % 26 + 65 
                            : (c - 65 - shift + 26) % 26 + 65);
                        j++;
                    } else if (c >= 97 && c <= 122) {  // Lowercase
                        const shift = key.charCodeAt(j % key.length) - 97;
                        result += String.fromCharCode(mode === 'enc' 
                            ? (c - 97 + shift) % 26 + 97 
                            : (c - 97 - shift + 26) % 26 + 97);
                        j++;
                    } else {
                        result += text.charAt(i);       // Keep spaces, digits, punctuation
                    }
                }
                return `[ VIGENÈRE ${mode === 'enc' ? 'ENCRYPTED' : 'DECRYPTED'} ]<br><span style="color: #ff00ff;">${result}</span>`;
            },

            // 6. MIRROR (Atbash cipher)
            'mirror': (args) => {
                const text = args.join(' ');
                if (!text) return 'Usage: mirror [message]\nExample: mirror hello';
                
                const flip = (c, base) => String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
                const result = text.replace(/[a-z]/g, c => flip(c, 97)).replace(/[A-Z]/g, c => flip(c, 65));
                return `<span style="color: #0f0;">[ ATBASH MIRROR ]: ${result}</span>`;
            },
            // 7. REVERSE CIPHER - TENET INVERSION
            'reverse': (args) => {
                const text = args.join(' ');
                if (!text) return 'Usage: reverse [message]\nExample: reverse hello world';

                // TENET Easter egg
                if (text.toLowerCase() === 'tenet') {
                    return `
                        <div style="border-left: 3px solid #ff0000; padding-left: 10px;">
                            <span style="color: #ff0000;">⏳ TENET REMAINS UNCHANGED</span><br>
                            <span style="color: #fff;">"What's happened, happened. Time is a flat circle."</span><br>
                            <span style="color: #0ff;">TENET</span> → <span style="color: #ffaa00;">TENET</span>
                        </div>`;
                }

                const reversed = text.split('').reverse().join('');
                return `
                    <div style="border-left: 3px solid #ff0000; padding-left: 10px; margin: 5px 0;">
                        <span style="color: #888;">Original:</span> <span style="color: #fff;">${text}</span><br>
                        <span style="color: #ff0000;">▼ INVERTED ▼</span><br>
                        <span style="color: #00f0ff; font-weight: bold;">${reversed}</span>
                    </div>
                `;
            },
            // 8. HANDSHAKE – store/retrieve personal key (private, local)
            'handshake': (args) => {
                if (args.length === 0) return 'Usage: handshake [set|clear] [key]\nExample: handshake set mySecretKey';
                const cmd = args[0].toLowerCase();
                if (cmd === 'set') {
                    const key = args.slice(1).join(' ');
                    if (!key) return '⚠️ Please provide a key to store.';
                    localStorage.setItem('akashic_handshake_key', key);
                    return '🤝 Handshake key stored locally.';
                }
                if (cmd === 'clear') {
                    localStorage.removeItem('akashic_handshake_key');
                    return '🤝 Handshake key cleared.';
                }
                return `⚠️ Unknown subcommand. Use 'set [key]' or 'clear'.`;
            },

            // 9. VAULT – AES‑256‑GCM via Web Crypto (with handshake fallback)
            'vault': async (args) => {
                // --- argument parsing (unchanged) ---
                let pw, mode, text;
                if (args.length === 2) {
                    const storedKey = localStorage.getItem('akashic_handshake_key');
                    if (!storedKey) return '⚠️ No password provided and no handshake key set.';
                    mode = args[0];
                    text = args[1];
                    pw = storedKey;
                } else if (args.length >= 3) {
                    mode = args[0];
                    pw = args[1];
                    text = args.slice(2).join(' ');
                } else {
                    return `Usage: vault [enc|dec] [password] [message/hex]
                    If a handshake key is set, password can be omitted.
                    Examples:
                    vault enc secret hello
                    vault dec secret [hex_cipher]
                    vault enc hello      (uses stored handshake key)
                    vault dec <hex>      (uses stored handshake key)`;
                }
                if (!['enc', 'dec'].includes(mode)) return '⚠️ Mode must be "enc" or "dec".';

                // --- start spinner (ignore return string) ---
                commands['spinner']();                         // <-- new
                try {
                    const enc = new TextEncoder();
                    const keyMaterial = await crypto.subtle.importKey(
                        'raw', enc.encode(pw), { name: 'PBKDF2' }, false, ['deriveKey']
                    );
                    const salt = enc.encode('akashic-salt');
                    const key = await crypto.subtle.deriveKey(
                        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
                        keyMaterial,
                        { name: 'AES-GCM', length: 256 },
                        false,
                        ['encrypt', 'decrypt']
                    );

                    let result;
                    if (mode === 'enc') {
                        const iv = crypto.getRandomValues(new Uint8Array(12));
                        const encrypted = await crypto.subtle.encrypt(
                            { name: 'AES-GCM', iv }, key, enc.encode(text)
                        );
                        const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
                        combined.set(iv);
                        combined.set(new Uint8Array(encrypted), iv.byteLength);
                        const hex = Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
                        result = `[ VAULT ENCRYPTED ]<br><span style="color: #ff00ff;">${hex}</span>`;
                    } else {
                        if (text.length % 2 !== 0) throw new Error('Invalid hex');
                        const bytes = new Uint8Array(text.match(/.{2}/g).map(b => parseInt(b, 16)));
                        const iv = bytes.slice(0, 12);
                        const ciphertext = bytes.slice(12);
                        const decrypted = await crypto.subtle.decrypt(
                            { name: 'AES-GCM', iv }, key, ciphertext
                        );
                        const decoded = new TextDecoder().decode(decrypted);
                        result = `[ VAULT DECRYPTED ]<br><span style="color: #0f0;">${decoded}</span>`;
                    }
                    commands['stopspinner']();                 // <-- stop
                    return result;
                } catch (e) {
                    commands['stopspinner']();                 // <-- stop even on error
                    return '<span style="color: #f00;">DECRYPTION FAILED: Wrong password or corrupt data.</span>';
                }
            },
            'steg': (args) => {
                // Helper to parse arguments that might be wrapped in quotes
                const parseArgs = (argArray) => {
                    const fullString = argArray.join(' ');
                    const matches = fullString.match(/"([^"]+)"|'([^']+)'|(\S+)/g);
                    return matches ? matches.map(m => m.replace(/^['"]|['"]$/g, '')) : [];
                };

                const parsed = parseArgs(args);
                if (parsed.length < 2) {
                    return `Usage:<br>
                            <span style="color: #0ff;">steg hide "Public Text" "Secret Message"</span><br>
                            <span style="color: #0ff;">steg reveal "Public Text"</span>`;
                }

                const mode = parsed[0].toLowerCase();

                if (mode === 'hide') {
                    const publicText = parsed[1];
                    const secretText = parsed[2];
                    if (!secretText) return '⚠️ Provide a secret message to hide.';

                    // 1. Convert secret to binary
                    const binarySecret = secretText.split('').map(char =>
                        char.charCodeAt(0).toString(2).padStart(8, '0')
                    ).join('');

                    // 2. Map binary to invisible characters:
                    // '0' = Zero Width Space (\u200B)
                    // '1' = Zero Width Non‑Joiner (\u200C)
                    // End Marker = Zero Width Joiner (\u200D)
                    const invisibleString = binarySecret.split('').map(bit =>
                        bit === '0' ? '\u200B' : '\u200C'
                    ).join('') + '\u200D'; 

                    // 3. Inject right after the first character of the cover text
                    const stegoText = publicText[0] + invisibleString + publicText.slice(1);

                    return `
                    <div style="border-left: 2px solid #0f0; padding-left: 10px;">
                        <span style="color: #0f0; font-weight: bold;">[ STEG: INJECTION SUCCESSFUL ]</span><br>
                        <span style="color: #888;">The text below contains your secret. It looks normal, but holds hidden data. Copy it exactly:</span><br><br>
                        <div style="padding: 10px; background: rgba(0, 255, 0, 0.1); color: #fff; font-family: sans-serif;">${stegoText}</div><br>
                        <span style="color: #5d6d7e;">Run <span style="color: #0ff;">steg reveal "${stegoText}"</span> to extract.</span>
                    </div>`;
                }

                if (mode === 'reveal') {
                    const suspectText = parsed[1];

                    // 1. Extract the invisible characters
                    let invisibleData = '';
                    for (let i = 0; i < suspectText.length; i++) {
                        if (suspectText[i] === '\u200B') invisibleData += '0';
                        if (suspectText[i] === '\u200C') invisibleData += '1';
                        if (suspectText[i] === '\u200D') break; // Hit the end marker
                    }

                    if (!invisibleData) return '<span style="color: #f00;">[ SCAN COMPLETE: No zero-width signatures detected. ]</span>';

                    // 2. Convert binary back to text
                    let secretMsg = '';
                    for (let i = 0; i < invisibleData.length; i += 8) {
                        const byte = invisibleData.slice(i, i + 8);
                        if (byte.length === 8) {
                            secretMsg += String.fromCharCode(parseInt(byte, 2));
                        }
                    }

                    return `
                    <div style="border-left: 2px solid #ff00ff; padding-left: 10px;">
                        <span style="color: #ff00ff; font-weight: bold;">[ STEG: EXTRACTION SUCCESSFUL ]</span><br><br>
                        <span style="color: #fff; font-size: 1.1em;">PAYLOAD: </span>
                        <span style="color: #0f0; text-shadow: 0 0 5px #0f0;">${secretMsg}</span>
                    </div>`;
                }

                return '⚠️ Unknown mode. Use "hide" or "reveal".';
            },
            'tag': (args) => {
                if (args.length === 0) return 'Usage: tag [set|get|clear|view] [key] [value]\nExamples:\n  tag set Apple Banana\n  tag get Apple\n  tag clear Apple\n  tag view';
                const cmd = args[0].toLowerCase();
                const key = args[1];
                const value = args.slice(2).join(' ');

                if (cmd === 'set') {
                    if (!key || !value) return 'Usage: tag set [key] [secret]';
                    const db = JSON.parse(localStorage.getItem('akashic_tags') || '{}');
                    db[key] = value;
                    localStorage.setItem('akashic_tags', JSON.stringify(db));
                    return `🔖 Tag stored: "${key}" → <span style="color: #ff00ff;">[HIDDEN]</span>`;
                }

                if (cmd === 'get') {
                    if (!key) return 'Usage: tag get [key]';
                    const db = JSON.parse(localStorage.getItem('akashic_tags') || '{}');
                    if (db[key]) return `🔖 Secret for "${key}": <span style="color: #0f0;">${db[key]}</span>`;
                    return '<span style="color: #888;">No secret tagged under that word.</span>';
                }

                if (cmd === 'clear') {
                    if (!key) return 'Usage: tag clear [key]  (or "all" to wipe everything)';
                    if (key === 'all') {
                        localStorage.removeItem('akashic_tags');
                        return '🗑️ All tags erased.';
                    }
                    const db = JSON.parse(localStorage.getItem('akashic_tags') || '{}');
                    delete db[key];
                    localStorage.setItem('akashic_tags', JSON.stringify(db));
                    return `🗑️ Tag "${key}" removed.`;
                }

                if (cmd === 'view') {
                    const db = JSON.parse(localStorage.getItem('akashic_tags') || '{}');
                    const keys = Object.keys(db);
                    if (keys.length === 0) return '<span style="color: #888;">📋 No tags stored.</span>';
                    return `📋 Stored tags: ${keys.join(', ')}`;
                }

                return `⚠️ Unknown subcommand. Use <span style="color: #0f0;">set</span>, <span style="color: #0f0;">get</span>, <span style="color: #0f0;">clear</span>, or <span style="color: #0f0;">view</span>.`;
            },
            'glitch': () => {
                document.body.classList.add('matrix-glitch');
                setTimeout(() => document.body.classList.remove('matrix-glitch'), 60000);
                return 'Entering the Matrix...';
            },
            'game': (args) => {
                const gameType = args[0]?.toLowerCase();

                if (!gameType) {
                    return `
                    <div style="border: 1px solid #ff8200; padding: 10px; text-align: center;">
                        <b style="color: #ff8200;">[ J_OS ARCADE MODULE ]</b><br>
                        <div style="margin: 5px 0;">
                            <img src="images/PokemonGo.jpeg" style="max-width: 220px; height: auto; border-radius: 8px; margin-bottom: 5px;">
                        </div>
                        <div>
                            <span style="color: #fbff00;">game snake</span> : Classic Canvas Snake (Keyboard / Swipe / D‑pad)<br>
                            <span style="color: #fca311;">game dodge</span> : Gyroscope Obstacle Avoidance<br>
                            <span style="color: #ef476f">game marble</span> : Gyroscope Ball Maze<br>
                            <span style="color: #fb00ff;">game asteroids</span> : Space Rock Dodger (D‑pad)<br>
                            <span style="color: #09ff00;">game flappy</span> : Cyber‑Bird Flap (Tap to Flap)<br>
                            <span style="color: #ff0000;">game memory</span> : Emoji memory match (Tap cards to flip)<br>
                            <span style="color: #00d0ff;">game dino</span> : Cyber‑packet runner (avoid firewall obstacles)<br>
                        </div>
                    </div>`;
                }

                const canvasId = 'game-canvas-' + Date.now();

                window._gameInput = (dir) => {
                    if (window._activeGame && window._activeGame.handleInput) {
                        window._activeGame.handleInput(dir);
                    }
                };

                const gamepadHTML = `
                <div class="cyber-gamepad" style="margin-top: 10px;">
                    <div class="d-pad">
                        <div class="pad-btn btn-up"    onpointerdown="window._gameInput('UP')">▲</div>
                        <div class="pad-btn btn-left"  onpointerdown="window._gameInput('LEFT')">◀</div>
                        <div class="pad-btn btn-right" onpointerdown="window._gameInput('RIGHT')">▶</div>
                        <div class="pad-btn btn-down"  onpointerdown="window._gameInput('DOWN')">▼</div>
                    </div>
                    <div class="action-pad">
                        <div class="pad-btn game-action-btn" onpointerdown="window._gameInput('ACTION')">ACT</div>
                    </div>
                </div>`;

                if (gameType === 'snake') {
                    const noclip = args[1]?.toLowerCase() === 'noclip';
                    setTimeout(() => initSnake(canvasId, noclip), 100);
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="300" height="400" style="background: #111; border: 2px solid #3498db; max-width: 100%; border-radius: 5px;"></canvas>
                        ${gamepadHTML}
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">Arrows / WASD / Swipe to move | ACT restarts after death${noclip ? ' | 🌀 NO‑CLIP' : ''}</div>
                    </div>`;
                }

                if (gameType === 'dodge') {
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="300" height="400" style="background: #111; border: 2px solid #0f0; max-width: 100%; border-radius: 5px;"></canvas>
                        <br>
                        <button onclick="startDodgeGame('${canvasId}')" style="margin-top: 10px; background: #0f0; color: #000; font-family: monospace; padding: 8px 15px; border: none; cursor: pointer; font-weight: bold;">
                            [ INITIALIZE GYRO SENSORS ]
                        </button>
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">Tilt phone left/right to dodge | Tap button to replay</div>
                    </div>`;
                }

                if (gameType === 'marble') {
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="300" height="400" style="background: #111; border: 2px solid #f0f; max-width: 100%; border-radius: 5px;"></canvas>
                        <br>
                        <button onclick="startMarbleGame('${canvasId}')" style="margin-top: 10px; background: #f0f; color: #000; font-family: monospace; padding: 8px 15px; border: none; cursor: pointer; font-weight: bold;">
                            [ INITIALIZE GYRO SENSORS ]
                        </button>
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">Tilt phone to roll the ball to the purple goal | Tap button to replay</div>
                    </div>`;
                }

                if (gameType === 'asteroids') {
                    setTimeout(() => initAsteroids(canvasId), 100);
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="300" height="400" style="background: #000; border: 2px solid #888; max-width: 100%; border-radius: 5px;"></canvas>
                        ${gamepadHTML}
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">◀/▶ to dodge space rocks | ACT restarts after crash</div>
                    </div>`;
                }

                if (gameType === 'flappy') {
                    setTimeout(() => initFlappy(canvasId), 100);
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="300" height="400" style="background: #000; border: 2px solid #ff0; max-width: 100%; border-radius: 5px;"></canvas>
                        ${gamepadHTML}
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">▲ or ACT to flap | Avoid pipes | ACT restarts after crash</div>
                    </div>`;
                }

                if (gameType === 'memory') {
                    setTimeout(() => initMemory(canvasId), 100);
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="320" height="320" style="background: #111; border: 2px solid #ff0; max-width: 100%; border-radius: 5px;"></canvas>
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">Click or tap cards to flip | Match all pairs</div>
                    </div>`;
                }
                
                if (gameType === 'dino') {
                    const godMode = args[1]?.toLowerCase() === 'godmode';
                    setTimeout(() => initDinoGame(canvasId, godMode), 100);
                    return `
                    <div style="text-align: center; margin-top: 10px;">
                        <canvas id="${canvasId}" width="600" height="200" style="background: #111; border: 2px solid #0ff; max-width: 100%; border-radius: 5px;"></canvas>
                        ${gamepadHTML}
                        <div style="color: #888; font-size: 10px; margin-top: 6px;">Space / ▲ to jump | ACT restarts after crash${godMode ? ' | 🛡️ GOD MODE ACTIVE' : ''}</div>
                    </div>`;
                }

                return '⚠️ Unknown game.';
            },
            'piano': () => {
                const old = document.getElementById('piano-container');
                if (old) old.remove();
                const output = document.getElementById('cmd-output');
                const container = document.createElement('div');
                container.id = 'piano-container';
                container.style.cssText = 'text-align: center; margin-top: 10px;';
                output.appendChild(container);

                const notes = [
                    { key: 'C4', freq: 261.63, label: 'C', kbd: 'A' },
                    { key: 'D4', freq: 293.66, label: 'D', kbd: 'S' },
                    { key: 'E4', freq: 329.63, label: 'E', kbd: 'D' },
                    { key: 'F4', freq: 349.23, label: 'F', kbd: 'F' },
                    { key: 'G4', freq: 392.00, label: 'G', kbd: 'G' },
                    { key: 'A4', freq: 440.00, label: 'A', kbd: 'H' },
                    { key: 'B4', freq: 493.88, label: 'B', kbd: 'J' },
                    { key: 'C5', freq: 523.25, label: 'C²', kbd: 'K' }
                ];

                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                let sustain = false;

                const playNote = (freq) => {
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';  // softer, violin-like
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    const releaseTime = sustain ? 3.0 : 0.8;   // sustain switches to long release
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + releaseTime);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + releaseTime + 0.1);
                };

                const btnStyle = 'width:45px; height:70px; margin:3px; border:1px solid #0f0; background:#111; color:#0f0; border-radius:5px; font-size:14px; touch-action:manipulation; cursor:pointer;';
                let btnsHTML = '';
                notes.forEach(n => {
                    btnsHTML += `<button class="piano-key" style="${btnStyle}" data-freq="${n.freq}">${n.label}<br><small style="font-size:9px;">${n.kbd}</small></button>`;
                });
                container.innerHTML = `
                    <div style="color:#0f0; margin-bottom:5px;">🎹 AKASHIC TONE MATRIX</div>
                    <div style="display:flex; justify-content:center; flex-wrap:wrap;">${btnsHTML}</div>
                    <div style="margin-top:10px;">
                        <button id="sustain-btn" style="background:#222; color:#0f0; border:1px solid #0f0; padding:5px 15px; border-radius:4px; cursor:pointer;">SUSTAIN: OFF</button>
                        <button id="chord-btn" style="background:#222; color:#f0f; border:1px solid #f0f; padding:5px 15px; border-radius:4px; margin-left:10px; cursor:pointer;">CHORD: Cmaj</button>
                    </div>
                    <div style="color:#888; font-size:10px; margin-top:5px;">Tap keys or press keyboard (top row A‑K). Sustain for long violin tones.</div>`;

                const keys = container.querySelectorAll('.piano-key');
                keys.forEach(btn => {
                    btn.addEventListener('click', () => playNote(parseFloat(btn.dataset.freq)));
                });

                // Sustain toggle
                const sustainBtn = document.getElementById('sustain-btn');
                sustainBtn.addEventListener('click', () => {
                    sustain = !sustain;
                    sustainBtn.textContent = `SUSTAIN: ${sustain ? 'ON' : 'OFF'}`;
                    sustainBtn.style.background = sustain ? '#0f0' : '#222';
                    sustainBtn.style.color = sustain ? '#000' : '#0f0';
                });

                // Chord button (plays C‑E‑G)
                document.getElementById('chord-btn').addEventListener('click', () => {
                    [261.63, 329.63, 392.00].forEach(f => playNote(f));
                });

                // Keyboard
                const keyMap = {};
                notes.forEach(n => { keyMap[n.kbd.toLowerCase()] = n.freq; });
                const keyHandler = (e) => {
                    if (document.activeElement && document.activeElement.id === 'cmd-input') return;
                    const freq = keyMap[e.key.toLowerCase()];
                    if (freq) playNote(freq);
                    if (e.key.toLowerCase() === 'z') { // Z toggles sustain
                        sustainBtn.click();
                    }
                };
                document.addEventListener('keydown', keyHandler);
                const cleanup = () => document.removeEventListener('keydown', keyHandler);
                container.addEventListener('DOMNodeRemoved', cleanup);

                return '';
            },
            'palindrome': (args) => {
                const sub = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');

                if (!sub) {
                    return `
                        <div style="border-left: 3px solid #ff0000; padding-left: 10px;">
                            <b style="color: #ff0000;">[ TENET PALINDROME ENGINE ]</b><br>
                            <span style="color: #0f0;">palindrome check [word]</span>  :Verify if a word reads the same backward<br>
                            <span style="color: #0f0;">palindrome square</span>  :Display the ancient Sator Square<br>
                            <span style="color: #0f0;">palindrome tenet</span> :he TENET principle<br>
                            <span style="color: #0f0;">palindrome make [word]</span> :Mirror text into a palindrome <br>
                        </div>`;
                }

                if (sub === 'check') {
                    if (!text) return 'Usage: palindrome check [word]';
                    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const reversed = cleaned.split('').reverse().join('');
                    const isPalindrome = cleaned === reversed && cleaned.length > 0;
                    return `
                        <div style="border-left: 3px solid ${isPalindrome ? '#0f0' : '#f00'}; padding-left: 10px;">
                            <span style="color: #888;">Word:</span> <span style="color: #fff;">${text}</span><br>
                            <span style="color: #888;">Reversed:</span> <span style="color: #0ff;">${cleaned.split('').reverse().join('')}</span><br>
                            <span style="color: ${isPalindrome ? '#0f0' : '#f00'}; font-weight: bold;">
                                ${isPalindrome ? '✅ PALINDROME CONFIRMED' : '❌ NOT A PALINDROME'}
                            </span>
                        </div>`;
                }

                if (sub === 'square' || sub === 'sator') {
                    return `
                        <div style="border: 2px solid #ff0000; padding: 15px; text-align: center; background: rgba(255,0,0,0.05);">
                            <b style="color: #ff0000;">◆ SATOR SQUARE ◆</b><br>
                            <span style="color: #888;">The Ancient Palindrome – Pompeii, 79 AD</span><br><br>
                            <pre style="color: #ffaa00; font-size: 16px; line-height: 1.5; text-align: center; display: inline-block;">
                S A T O R
                A R E P O
                T E N E T
                O P E R A
                R O T A S
                            </pre>
                            <br>
                            <span style="color: #0f0;">Reads the same: left→right, right→left, top→bottom, bottom→top</span><br>
                            <span style="color: #ff0000;">"The Sower Arepo holds the wheels with care."</span>
                        </div>

                        <div style="border: 2px solid #ffaa00; padding: 15px; text-align: center; background: rgba(255,170,0,0.05); margin-top: 15px;">
                            <b style="color: #ffaa00;">✝️ THE PATER NOSTER ANAGRAM</b><br>
                            <span style="color: #ccc;">Early Christian Secret Code (Crux Dissimulata)</span><br><br>
                            <pre style="color: #ffaa00; font-size: 14px; line-height: 1.2; display: inline-block; text-align: center;">
                        A
                        P
                        A
                        T
                        E
                        R
                        A P A T E R N O S T E R O
                        O
                        S
                        T
                        E
                        R
                        O
                            </pre>
                            <br>
                            <span style="color: #0f0;">"PATER NOSTER"</span> – <span style="color: #fff;">Our Father</span>, the opening of the Lord's Prayer<br>
                            <span style="color: #ffaa00;">A</span> and <span style="color: #ffaa00;">O</span> – Alpha and Omega, the Beginning and the End<br>
                            <span style="color: #888;">The cross hides the prayer, offering a cryptic sign of faith during persecution.</span>
                        </div>
                    `;
                }

                if (sub === 'tenet') {
                    return `
                        <div style="border-left: 3px solid #ff0000; padding-left: 10px;">
                            <b style="color: #ff0000;">⏳ TENET PRINCIPLE</b><br>
                            <span style="color: #fff;">"What's happened, happened."</span><br>
                            <span style="color: #0ff;">TENET</span> → <span style="color: #ffaa00;">TENET</span><br>
                            <span style="color: #888;">Time flows both ways. The palindrome is invariant.</span>
                        </div>`;
                }

                if (sub === 'make') {
                    if (!text) return 'Usage: palindrome make [text]';
                    const reversed = text.split('').reverse().join('');
                    const palindrome = text + reversed;
                    return `
                        <div style="border-left: 3px solid #ff0000; padding-left: 10px;">
                            <span style="color: #888;">Original:</span> <span style="color: #fff;">${text}</span><br>
                            <span style="color: #ff0000;">▼ MIRRORED PALINDROME ▼</span><br>
                            <span style="color: #00f0ff;">${palindrome}</span>
                        </div>`;
                }

                return 'Usage: palindrome [check|square|tenet|make]';
            },
            'sator': (args) => {
                const size = 4;
                const coordPattern = /^[A-D][1-4]$/i;   // e.g., A1, B3

                // ── START NEW PUZZLE (only with explicit "new") ──
                if (args[0] === 'new') {
                    const solution = [
                        ['S','A','G','A'],
                        ['A','R','E','A'],
                        ['G','E','R','O'],
                        ['A','A','O','A']
                    ];
                    window._satorGrid = {
                        solution: solution,
                        player: [
                            ['S','','',''],
                            ['','','',''],
                            ['','','',''],
                            ['','','','']
                        ],
                        size: size,
                        attempts: 0,
                        revealed: false
                    };
                    return renderSatorGrid();
                }

                // ── REVEAL SOLUTION ──
                if (args[0] === 'reveal') {
                    if (!window._satorGrid) return 'No active puzzle. Type <span style="color: #0f0;">sator new</span> to start.';
                    const grid = window._satorGrid;
                    grid.player = grid.solution.map(row => [...row]);
                    grid.revealed = true;
                    return renderSatorGrid() + `<br><span style="color: #ffaa00;">Solution revealed. Row/Column words: SAGA, AREA, GERO, AAOA</span>`;
                }

                // ── SHORTCUT: sator B2 A ──
                if (args.length === 2 && coordPattern.test(args[0])) {
                    if (!window._satorGrid) return 'No active puzzle. Type <span style="color: #0f0;">sator new</span> to start.';
                    if (window._satorGrid.revealed) return 'Puzzle already revealed. Type <span style="color: #0f0;">sator new</span> for a fresh one.';

                    const pos = args[0].toUpperCase();
                    const letter = args[1].toUpperCase();
                    const grid = window._satorGrid;

                    if (letter.length !== 1 || !/[A-Z]/.test(letter)) return '⚠️ Please provide a single letter (A–Z).';

                    const row = pos.charCodeAt(0) - 65;   // A=0, B=1, …
                    const col = parseInt(pos[1]) - 1;
                    grid.player[row][col] = letter;
                    grid.attempts++;

                    if (grid.player[row][col] !== grid.solution[row][col]) {
                        return renderSatorGrid() + `<br><span style="color: #f00;">⚠️ Incorrect letter at ${pos}. Try again.</span>`;
                    }

                    let solved = true;
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            if (grid.player[r][c] !== grid.solution[r][c]) solved = false;
                        }
                    }
                    if (solved) {
                        window._satorGrid = null;
                        return renderSatorGrid() + `<br><span style="color: #0f0;">🏆 SATOR SQUARE COMPLETED in ${grid.attempts} attempts!</span>`;
                    }

                    return renderSatorGrid();
                }

                // ── HELP (default) ──
                return `
                    <div style="border-left: 3px solid #ffaa00; padding-left: 10px;">
                        <b style="color: #ffaa00;">◆ SATOR WORD SQUARE ◆</b><br>
                        <span style="color: #ccc;">A 4×4 grid where every row and column spells a word.</span><br><br>
                        <span style="color: #0f0;">sator new</span>  :Start a puzzle<br>
                        <span style="color: #0f0;">sator A1 S</span>  :Place letter S at column A, row 1<br>
                        <span style="color: #0f0;">sator reveal</span>  :Show the solution<br>
                        <span style="color: #0f0;">palindrome square</span>  :View the SATOR square and the Pater Noster anagram<br>
                        <br>
                        <span style="color: #ff00aa;">Words: SAGA, AREA, GERO, AAOA (Latin, [SAGA] tale, [AREA] open space, [GERO] I carry, [AAOA] a name)</span>
                    </div>`;
            },

            'run': () => {
                if (window._rpg.active) return 'You are already in an RPG session. Type exit to leave.';
                window._rpg.active = true;
                window._rpg.inventory = [];
                window._rpg.health = 100;
                window._rpg.chapter = chapter1;
                appendCommandHTML(`
                    <div style="border-left: 3px solid #ff00ff; padding-left: 10px; line-height: 1.4;">
                        <b style="color: #ff00ff;">[ AKASHIC INTRUSION DETECTED ]</b><br>
                        You are <span style="color: #0ff;">Neo‑J</span>, a neural operative wired into the Akashic mainframe.
                        A rogue AI named <span style="color: #f00;">KRYPTOS</span> has locked you out. You must break back in.<br><br>
                        <span style="color: #0f0;">[1]</span> Attempt to bypass the firewall<br>
                        <span style="color: #0f0;">[2]</span> Search for a backdoor access point<br>
                        <span style="color: #0f0;">[3]</span> Run a diagnostic on your neural link
                    </div>
                    <span style="color: #888;">Type a number and press Enter.</span>
                    <span style="color: #ffbf00;">type 'exit' to exit the RPG mode</span>
                `);
                return '';
            },
            'image': () => {
                const seed = Math.floor(Math.random() * 1000);
                const imgHtml = `<br><img src="https://picsum.photos/seed/${seed}/280/160" 
                    style="margin-top: 8px; border: 1px solid var(--accent-color); border-radius: 8px; 
                        box-shadow: 0 0 15px rgba(0,255,0,0.2); max-width: 100%;">`;
                return `🖼️ Decrypting visual data... seed=${seed}${imgHtml}`;
            },
            'play': (args) => {
                if (args.length < 2) {
                    return `
                        <strong style="color: #00f0ff;">🎬 PLAY COMMAND</strong><br>
                        <span style="color: #888;">Usage:</span><br>
                        <span style="color: #0f0;">play youtube &lt;id_or_url&gt;</span> – Embed YouTube player<br>
                        <span style="color: #0f0;">play audio &lt;mp3_url&gt;</span> – Play direct audio file (MP3, OGG, WAV)<br>
                        <br>
                        <span style="color: #888;">Examples:</span><br>
                        play youtube dQw4w9WgXcQ<br>
                        play youtube https://youtu.be/dQw4w9WgXcQ<br>
                        play audio https://example.com/song.mp3
                    `;
                }

                const type = args[0].toLowerCase();
                
                // ----- YOUTUBE -----
                if (type === 'youtube' || type === 'yt') {
                    // Gold‑standard regex to extract video ID
                    const input = args[1];
                    if (!input) return '⚠️ Please provide a YouTube URL or ID.';

                    const containerId = 'yt-player-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                    setTimeout(() => createYouTubePlayer(input, containerId), 50);

                    return `
                        <div style="margin: 12px 0; border: 1px solid var(--accent-color); border-radius: 8px; overflow: hidden; background: #000; box-shadow: 0 0 15px rgba(0,255,0,0.2);">
                            <div id="${containerId}" style="width: 100%; min-height: 200px;"></div>
                        </div>
                        <span style="color: #00ffff;">📡 FEED ESTABLISHED</span>
                    `;
                }
                
                // ----- AUDIO (direct file) -----
                if (type === 'audio') {
                    const url = args[1];
                    if (!url) return '⚠️ Please provide an audio URL.';
                    
                    // Stop any currently playing audio
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio = null;
                    }
                    
                    currentAudio = new Audio(url);
                    currentAudio.play().catch(e => {
                        appendCommandOutput(`⚠️ Audio playback failed: ${e.message}`, true);
                    });
                    return `<div class="active-transmission">🔊 NEURAL AUDIO STREAM STARTED: ${url}</div>`;
                }
                
                return '⚠️ Unknown type. Use "play youtube" or "play audio".';
            },
            'siren': () => {
                // Stop any previously playing siren (optional)
                if (window._sirenAudio) {
                    window._sirenAudio.pause();
                    window._sirenAudio = null;
                }
                const audio = new Audio('./sounds/civil-defense-siren.mp3');
                audio.loop = false;           // play once (1 minute)
                audio.play().catch(e => {
                    appendCommandOutput(`⚠️ Siren failed: ${e.message}`, true);
                });
                window._sirenAudio = audio;
                return '🚨 SIREN ACTIVATED. Type <span style="color: #0f0;">stop</span> to silence.';
            },
            'homing': () => {
                if (typeof startContinuousTone !== 'function') {
                    return '⚠️ Continuous tone generator not available.';
                }
                startContinuousTone();
                return '📡 Homing beacon activated. Type <span style="color: #0f0;">stop</span> to silence.';
            },
            'stop': () => {
                // Stop YouTube player
                if (youtubePlayer) {
                    if (youtubePlayer.stopVideo) youtubePlayer.stopVideo();
                    if (youtubePlayer.destroy) youtubePlayer.destroy();
                    youtubePlayer = null;
                }
                
                // Stop audio
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }
                
                if (window._sirenAudio) {
                    window._sirenAudio.pause();
                    window._sirenAudio.currentTime = 0; // Reset to start
                    window._sirenAudio = null;
                }
                    if (typeof stopContinuousTone === 'function') {
                    stopContinuousTone();  
                }

                return '🔇 All transmissions silenced.';
            },
            'radio': (args) => {
                // No arguments – show available channels
                if (!args || args.length === 0) {
                    let channelList = '';
                    for (const ch in stations) {
                        channelList += `<span style="color: #0f0;">${ch}</span>  `;
                    }
                    return `
                        <strong style="color: #00ffff;">📻 AKASHIC RADIO FREQUENCIES</strong><br>
                        <span style="color: #888;">Available channels:</span><br>
                        ${channelList}<br>
                        <br>
                        <span style="color: #888;">Usage:</span> <span style="color: #0f0;">radio &lt;channel&gt;</span><br>
                        <span style="color: #888;">Example:</span> radio defcon
                    `;
                }

                const choice = args[0].toLowerCase();
                if (!stations[choice]) {
                    return `⚠️ Frequency "${choice}" not found. Type <span style="color: #0f0;">radio</span> to see channels.`;
                }

                appendCommandOutput(`📡 Tuning to ${choice.toUpperCase()} frequency...`, false);
    
                // Then delegate to play audio
                return commands['play'](['audio', stations[choice]]);
            },
            'system': () => {
                const authStatus = isAuthorized ? 
                    '<span style="color: #0f0;">[ AUTHORIZED ]</span>' : 
                    '<span style="color: #f00;">[ LOCKED ]</span>';
                
                // Detect current audio feed
                let currentFeed = "None";
                if (currentAudio && !currentAudio.paused) {
                    const src = currentAudio.src;
                    let feedName = src;
                    for (const ch in stations) {
                        if (src.includes(stations[ch])) {
                            feedName = ch.toUpperCase();
                            break;
                        }
                    }
                    if (feedName === src) {
                        feedName = src.length > 40 ? src.substring(0, 37) + '...' : src;
                    }
                    currentFeed = feedName;
                }

                // Detect YouTube visual feed
                let visualStatus = 'IDLE';
                if (youtubePlayer && youtubePlayer.getPlayerState && youtubePlayer.getPlayerState() === 1) {
                    visualStatus = '<span style="color: #0f0;">ACTIVE FEED</span>';
                } else {
                    visualStatus = '<span style="color: #555;">IDLE</span>';
                }
                
                // Uptime calculation
                const uptimeSec = Math.floor(performance.now() / 1000);
                const uptimeMin = Math.floor(uptimeSec / 60);
                const uptimeHours = Math.floor(uptimeMin / 60);
                const uptimeStr = uptimeHours > 0 
                    ? `${uptimeHours}h ${uptimeMin % 60}m ${uptimeSec % 60}s`
                    : `${uptimeMin}m ${uptimeSec % 60}s`;

                return `
                    <div style="border: 1px solid #00ffff; padding: 8px 12px; background: rgba(0, 255, 255, 0.05); border-radius: 6px; font-size: 8px; line-height: 0.9;">
                        <strong style="color: #00ffff; font-size: 10px;">// AKASHIC NEURAL LINK STATUS //</strong><br>
                        <span style="color: #555;">────────────────────────</span><br>
                        <span style="color: #888;">USER:</span> <span style="color: #fff;">Johan</span><br>
                        <span style="color: #888;">ACCESS:</span> ${authStatus}<br>
                        <span style="color: #888;">UPTIME:</span> <span style="color: #fff;">${uptimeStr}</span><br>
                        <span style="color: #888;">AUDIO FEED:</span> <span style="color: #ff00ff;">${currentFeed}</span><br>
                        <span style="color: #888;">VISUAL:</span> ${visualStatus}<br>
                        <span style="color: #888;">CPU CORES:</span> <span style="color: #fff;">${navigator.hardwareConcurrency || '?'}</span><br>
                        <span style="color: #888;">MEMORY:</span> <span style="color: #fff;">${navigator.deviceMemory || '?'} GB</span><br>
                        <span style="color: #555;">────────────────────────</span><br>
                        <span style="color: #00ffff; font-size: 10px;">SYSTEM STABILITY: 99.9%</span>
                    </div>
                `;
            },
            'tv': (args) => {
                const channels = {
                    // NASA / Space (embeddable)
                    'nasa':       { name: 'NASA Live', type: 'youtube', url: 'zPH5KtjJFaQ' },
                    'iss-earth':  { name: 'Earth from Space (ISS)', type: 'youtube', url: 'vytmBNhc9ig' },

                    // Entertainment (embeddable)
                    'lofi':       { name: 'Lofi Girl', type: 'youtube', url: 'jfKfPfyJRdk' },
                    'gumball':    { name: 'Amazing World of Gumball', type: 'youtube', url: 'nIyaCRNwxhU' }
                };

                if (!args || args.length === 0) {
                    let channelList = '';
                    for (const ch in channels) channelList += `<span style="color: #0f0;">${ch}</span>  `;
                    return `
                        <strong style="color: #00ffff;">📺 AKASHIC VISUAL UPLINK</strong><br>
                        <span style="color: #888;">Available feeds:</span><br>
                        ${channelList}<br><br>
                        <span style="color: #888;">Usage:</span> <span style="color: #0f0;">tv &lt;channel&gt;</span>
                    `;
                }

                const choice = args[0].toLowerCase();
                const channel = channels[choice];
                if (!channel) return `⚠️ Feed "${choice}" not found. Type <span style="color: #0f0;">tv</span> to see channels.`;

                appendCommandOutput(`📡 Tuning visual feed to ${channel.name}...`, false);
                return commands['play'](['youtube', channel.url]);
            },
            'about': () => {
                return `
                    <div style="border-left: 2px solid #ff00ff; padding: 8px 12px; line-height: 1.5;">
                        <span style="color: #ff00ff; font-weight: bold; text-shadow: 0 0 5px #ff00ff;">// AKASHIC ORIGIN //</span><br>
                        <span style="color: #ccc;">J_OS began as a simple ambient clock. Its creator, <strong style="color: #fff;">Johan</strong>, wanted a single screen that could tell time, show beauty, and respond like a real operating system.</span><br><br>
                        <span style="color: #ccc;">Soon it grew:</span>
                        <span style="color: #00f0ff;">Cistercian numerals</span> met <span style="color: #ffaa00;">live NASA feeds</span>.
                        <span style="color: #0f0;">Tao Te Ching chapters</span> were woven into neural <span style="color: #ff00ff;">"Intersect" flashes</span>.
                        <span style="color: #ff0;">Radio streams</span> and <span style="color: #0ff;">global news feeds</span> became channels on a cybernetic console.<br><br>
                        <span style="color: #ccc;;">Today, <strong style="color: #fff;">J_OS</strong> is a digital sanctuary for high‑speed information retrieval – a hacker's command center, a philosopher's scroll, and an artist's canvas.</span><br><br>
                        <span style="color: #888;">Type <span style="color: #0f0;">help</span> to explore.</span>
                    </div>
                `;
            },
            'login': () => {
                isAuthorized = true;
                return `
                <pre class="login-art" style="color: #00ff00; text-shadow: 0 0 5px #00ff00;">
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/\\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/    \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  <span style="color: #fff; text-shadow: 0 0 10px #fff;">◈</span>   \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/ /  \\   \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/ / <span style="color: #fff; text-shadow: 0 0 10px #fff;">()</span> \\   \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/ /______\\   \\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/______________\\</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\              /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\            /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\          /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\        /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\      /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\    /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\  /</span>
                                    <span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\/</span>

                        ██╗        ██████╗ ███████╗
                        ██║       ██╔═══██╗██╔════╝
                        ██║       ██║   ██║███████╗
                    ██   ██║       ██║   ██║╚════██║
                    ╚█████╔╝       ╚██████╔╝███████║
                    ╚════╝         ╚═════╝ ╚══════╝
                <span class="login-status-text" style="color: #00ffff; font-weight: bold; letter-spacing: 1px; text-shadow: 0 0 8px #00ffff;">// AKASHIC ZERO-POINT KRYPTOS NEURAL CENTER //</span>  
                <span class="login-status-text">> SYNCING NEURAL PATHWAYS.................... [ STABLE ]
                > DECRYPTING AKASHIC RECORDS................. [ VERIFIED ]
                > WELCOME BACK.</span>
                <span style="color: #ff03ff; text-shadow: none; display: block; margin-top: 2px;">Type 'about' for The story behind J_OS<br>>[Type 'help' for a list of commands]<</span>
                </pre>`;
            },


            // ----- ASYNC (return Promise) -----
            //BBC WORLD NEWS - top 5 headlines
            'news': async (args) => {
                // aggregate all feeds
                if (args[0] === '-all') {
                    let output = '';
                    try {
                        output += '📰 <strong style="color: #00f0ff;">BBC WORLD NEWS</strong><br>';
                        const api = 'https://api.rss2json.com/v1/api.json?rss_url=';
                        const bbcFeed = 'https://feeds.bbci.co.uk/news/world/rss.xml';
                        const resp1 = await fetch(api + encodeURIComponent(bbcFeed));
                        const data1 = await resp1.json();
                        if (data1.status === 'ok' && data1.items) {
                            data1.items.slice(0, 3).forEach((item, i) => {
                                output += `<span style="color: #fff;">[${i+1}] <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; border-bottom: 1px dotted #888;">${item.title}</a></span><br>`;
                            });
                        } else throw new Error('BBC feed failed');
                    } catch(e) { output += '<span style="color: #f00;">⚠️ BBC feed offline.</span><br>'; }

                    try {
                        output += '<br>📰 <strong style="color: #ff6600;">HACKER NEWS</strong><br>';
                        const res2 = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
                        const ids2 = await res2.json();
                        const top3 = ids2.slice(0, 3);
                        const storyPromises = top3.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()));
                        const stories = await Promise.all(storyPromises);
                        stories.forEach((story, i) => {
                            output += `<span style="color: #fff;">[${i+1}] <a href="${story.url}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; border-bottom: 1px dashed #ff6600;">${story.title}</a> (${story.score} pts)</span><br>`;
                        });
                    } catch(e) { output += '<span style="color: #f00;">⚠️ Hacker News feed offline.</span><br>'; }

                    try {
                        output += '<br>📰 <strong style="color: #00f0ff;">TECHNOLOGY (The Verge / Ars / TechCrunch / Wired)</strong><br>';
                        const feeds = [
                            { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', weight: 2 },
                            { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', weight: 1 },
                            { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', weight: 1 },
                            { name: 'Wired', url: 'https://www.wired.com/feed/rss', weight: 1 }
                        ];
                        const techPromises = feeds.map(async feed => {
                            const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
                            const resp = await fetch(api);
                            const data = await resp.json();
                            return (data.items || []).slice(0, feed.weight).map(item => ({ ...item, sourceName: feed.name }));
                        });
                        const techResults = await Promise.all(techPromises);
                        const techItems = techResults.flat();
                        techItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                        techItems.forEach((item, i) => {
                            output += `<span style="color: #fff;">[${i+1}] <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; border-bottom: 1px dotted #00f0ff;">${item.title}</a> (${item.sourceName})</span><br>`;
                        });
                    } catch(e) { output += '<span style="color: #f00;">⚠️ Technology feed offline.</span><br>'; }

                    return output;
                }

                try {
                    let output = '<strong style="color: #00f0ff;">📰 BBC WORLD NEWS</strong><br>';
                    const api = 'https://api.rss2json.com/v1/api.json?rss_url=';
                    const feed = 'https://feeds.bbci.co.uk/news/world/rss.xml';
                    const resp = await fetch(api + encodeURIComponent(feed));
                    const data = await resp.json();
                    if (data.status === 'ok' && data.items) {
                        data.items.slice(0, 5).forEach((item, i) => {
                            output += `<span style="color: #ffffff;">[${i+1}] <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; border-bottom: 1px dotted #888;">${item.title}</a></span><br>`;
                        });
                        return output;
                    }
                    throw new Error('Invalid RSS');
                } catch (e) {
                    return '⚠️ Could not fetch news. Check connection.';
                }
            },
            // HACKER NEWS – top 5 stories
            'hackernews': async () => {
                try {
                    let output = '<strong style="color: #ff6600;">📰 Y-COMBINATOR HACKER NEWS</strong><br>';
                    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
                    const ids = await res.json();
                    const top5 = ids.slice(0, 5);
                    
                    // Fetch all 5 stories simultaneously
                    const storyPromises = top5.map(id => 
                        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
                    );
                    const stories = await Promise.all(storyPromises);
                    
                    stories.forEach((story, i) => {
                        // story.url is the external link; story.title is the display text
                        output += `[${i+1}] <a href="${story.url}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; border-bottom: 1px dashed #ff6600;">${story.title}</a> <span style="color: #888;">(${story.score} pts)</span><br>`;
                    });
                    return output;
                } catch (e) {
                    return '⚠️ Could not reach Hacker News.';
                }
            },
            'weather': async (args) => {
                let city = args.length ? args.join(' ') : null;

                const loadingLine = document.createElement('div');
                loadingLine.style.color = '#888';
                loadingLine.textContent = city 
                    ? `☁️ Looking up weather for ${city}…` 
                    : `☁️ Detecting your area & getting weather…`;
                cmdOutput.appendChild(loadingLine);
                cmdOutput.scrollTop = cmdOutput.scrollHeight;

                try {
                    let latitude, longitude, name, country, usedFallback = false;

                    if (!city) {
                        // IP‑based geolocation
                        try {
                            const ipResp = await fetch('https://ipapi.co/json/');
                            const ipData = await ipResp.json();
                            if (ipData.error) throw new Error(ipData.reason);
                            latitude = ipData.latitude;
                            longitude = ipData.longitude;
                            name = ipData.city || 'Unknown';
                            country = ipData.country_name || '';
                        } catch (ipErr) {
                            // Fallback to London
                            latitude = 51.5074;
                            longitude = -0.1278;
                            name = 'London';
                            country = 'GB';
                            usedFallback = true;
                        }
                    } else {
                        // ----- Geocode the given city name -----
                        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
                        const geoResp = await fetch(geoUrl);
                        const geoData = await geoResp.json();
                        if (!geoData.results || geoData.results.length === 0) {
                            loadingLine.remove();
                            return `⚠️ City "${city}" not found.`;
                        }
                        latitude = geoData.results[0].latitude;
                        longitude = geoData.results[0].longitude;
                        name = geoData.results[0].name;
                        country = geoData.results[0].country || '';
                    }

                    // ----- Fetch weather from coordinates -----
                    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
                    const weatherResp = await fetch(weatherUrl);
                    const weatherData = await weatherResp.json();
                    if (!weatherData.current_weather) throw new Error('No weather data');

                    const w = weatherData.current_weather;
                    const temp = w.temperature;
                    const wind = w.windspeed;
                    const code = w.weathercode;
                    const emoji = getWeatherEmoji(code);

                    loadingLine.remove();

                    let outputHtml = `
                        <div style="border-left: 2px solid #ffaa00; padding: 10px; margin: 10px 0; background: rgba(255,170,0,0.05); border-radius: 4px; font-size: 1.1rem;">
                            🌍 <strong style="color: #ffaa00;">${name}, ${country}</strong><br>
                            <span style="font-size: 1.3rem;">${emoji}  ${temp}°C</span><br>
                            <span style="color: #aaa;">Wind: ${wind} km/h</span>
                        </div>`;

                    // If no city was given, add relevant hints
                    if (!city) {
                        if (usedFallback) {
                            outputHtml += `<br><span style="color: #ffaa00;">⚠️ Could not detect your location. Showing London as default.</span>`;
                        }
                        outputHtml += `<br><span style="color: #888;">💡 <b>Usage:</b> weather [city]  (e.g., weather Tokyo)</span>`;
                    }

                    return outputHtml;

                } catch (e) {
                    loadingLine.remove();
                    return '⚠️ Weather service unavailable.';
                }
            },
            'define': async (args) => {
                const word = args.join(' ');
                if (!word) return 'Usage: define [word]';

                try {
                    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                    if (!resp.ok) throw new Error('Not found');
                    const data = await resp.json();

                    let output = `<strong style="color: var(--accent-color);">📘 ${word}</strong>`;

                    // Loop through each separate entry (e.g., "jack" as a name, "jack" as a device)
                    data.forEach((entry, entryIndex) => {
                        // Add a separator between different word origins
                        if (entryIndex > 0) output += `<br><span style="color: #555;">──────────</span>`;

                        // Add phonetics if available
                        const phonetic = entry.phonetics?.find(p => p.text) || entry.phonetics?.[0];
                        if (phonetic?.text) {
                            output += `<br><span style="color: #888;">/${phonetic.text}/</span>`;
                        }

                        // Process each part of speech for this entry
                        entry.meanings.forEach(meaning => {
                            output += `<br><br><strong style="color: #ffaa00;">${meaning.partOfSpeech}</strong>`;
                            
                            meaning.definitions.forEach((def, i) => {
                                output += `<br>  ${i + 1}. ${def.definition}`;
                                if (def.example) {
                                    output += `<br><span style="color: #666;">     “${def.example}”</span>`;
                                }
                            });

                            if (meaning.synonyms?.length) {
                                output += `<br>  <span style="color: #0f0;">Synonyms:</span> ${meaning.synonyms.join(', ')}`;
                            }
                            if (meaning.antonyms?.length) {
                                output += `<br>  <span style="color: #f55;">Antonyms:</span> ${meaning.antonyms.join(', ')}`;
                            }
                        });
                    });

                    // Add source attribution
                    if (data[0]?.sourceUrls?.length) {
                        output += `<br><br><span style="color: #555; font-size: 0.7rem;">Source: ${data[0].sourceUrls[0]}</span>`;
                    }

                    return output;
                } catch (e) {
                    return `Could not define "${word}".`;
                }
            },
            'wiki': async (args) => {
                const query = args.join(' ');
                if (!query) return 'Usage: wiki [topic]';
                commands['spinner']();
                try {
                    const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                    const data = await resp.json();
                    if (data.type === 'disambiguation' || !data.extract) {
                        commands['stopspinner']();
                        return '⚠️ Topic too broad or not found.';
                    }
                    commands['stopspinner']();
                    return `<div style="border-left: 3px solid #3498db; padding-left: 10px; line-height: 1.4;">
                                <b style="color: #3498db; font-size: 1.2em;">${data.title}</b><br><br>
                                <span style="color: #ccc;">${data.extract}</span>
                            </div>`;
                } catch (e) {
                    commands['stopspinner']();
                    return '⚠️ Wikipedia uplink failed.';
                }
            },
            'crypto': async (args) => {
                const coin = args[0]?.toLowerCase() || 'bitcoin';
                commands['spinner']();
                try {
                    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`);
                    const data = await resp.json();
                    if (!data[coin]) {
                        commands['stopspinner']();
                        return '⚠️ Coin not found. Try bitcoin, ethereum, dogecoin...';
                    }
                    const price = data[coin].usd;
                    const change = data[coin].usd_24h_change?.toFixed(2) || '0.00';
                    const color = change >= 0 ? '#0f0' : '#f00';
                    commands['stopspinner']();
                    return `📈 ${coin.toUpperCase()}: $${price} <span style="color: ${color};">(${change}%)</span>`;
                } catch (e) {
                    commands['stopspinner']();
                    return '⚠️ Market data unavailable.';
                }
            },
            'wifite': async () => {
                commands['spinner']();
                appendCommandHTML('<span style="color: #0f0;">[+] Initializing Wifite v2.1.0…</span>');
                await new Promise(r => setTimeout(r, 1500));
                appendCommandHTML('<span style="color: #888;">[*] Scanning for wireless targets…</span>');
                await new Promise(r => setTimeout(r, 2500));
                commands['stopspinner']();
                return `<pre style="color: #0ff; font-size: 10px;">
            NUM  ESSID                   CH  ENCR  POWER   CLIENTS
            ---  ----------------------  --  ----  -----   -------
            [1]  Home_Network_5G         6   WPA2  -42db   3
            [2]  Starbucks_WiFi          11  OPEN  -68db   12
            [3]  Tesla_Guest             1   WPA2  -80db   0
            [4]  Airport_Free_WiFi       36  OPEN  -55db   8
            </pre>
            <span style="color: #ffff00;">[!] Select target index to begin handshake capture…</span>`;
            },
            'airmon': async (args) => {
                const iface = args[0] || 'wlan0';
                const output = document.getElementById('cmd-output');

                // Start spinner for the heavy lifting
                if (typeof commands['spinner'] === 'function') commands['spinner']();

                // Step 1 – Check for interfering processes
                const step1 = document.createElement('div');
                step1.style.color = '#0f0';
                step1.textContent = `[*] Checking for interfering processes on ${iface}…`;
                output.appendChild(step1);
                await new Promise(r => setTimeout(r, 800));

                // Step 2 – Stop network managers (fake)
                step1.textContent = `[*] Stopping network-manager and wpa_supplicant…`;
                await new Promise(r => setTimeout(r, 1000));

                // Step 3 – Bring the interface down
                step1.textContent = `[*] Bringing ${iface} down…`;
                await new Promise(r => setTimeout(r, 600));

                // Step 4 – Change mode
                step1.textContent = `[*] Setting ${iface} to monitor mode…`;
                await new Promise(r => setTimeout(r, 700));

                // Step 5 – Bring it back up
                step1.textContent = `[*] Bringing ${iface}mon up…`;
                await new Promise(r => setTimeout(r, 400));

                // Stop spinner
                if (typeof commands['stopspinner'] === 'function') commands['stopspinner']();

                // Final result
                return `<span style="color: #00ff00;">[+] ${iface} is now in Monitor Mode (${iface}mon).</span>
                        <br><span style="color: #888;">[+] Use <b>airodump-ng ${iface}mon</b> to capture packets.</span>`;
            },
            'hashcat': async () => {
                const hashes = [
                    { hash: '5f4dcc3b5aa765d61d8327deb882cf99', pass: 'password123' },
                    { hash: 'e99a18c428cb38d5f260853678922e03', pass: 'aRmONyx' },
                    { hash: 'd8578edf8458ce06fbc5bb76a58c5ca4', pass: '@dAeMonSystmd' }
                ];
                
                const output = document.getElementById('cmd-output');
                const statusLine = document.createElement('div');
                statusLine.style.color = '#0f0';
                statusLine.textContent = '[*] Launching hashcat v6.2.6…';
                output.appendChild(statusLine);
                
                await new Promise(r => setTimeout(r, 800));
                statusLine.textContent = '[*] Dictionary: rockyou.txt (14.3M passwords)';
                await new Promise(r => setTimeout(r, 1200));
                
                // Animate password attempts
                const attempts = ['123456', 'password123', 'admin', 'letmein', 'monkey', 'aRmONyx', '@dAeMonSystmd', 'iloveyou'];
                for (const attempt of attempts) {
                    statusLine.textContent = `[*] Trying: ${attempt}…`;
                    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
                }
                
                // Build result with scramble reveal (like rotate but fast)
                let resultHtml = '<span style="color: #00ff00;">[+] Cracked hashes:</span><br>';
                for (const item of hashes) {
                    // Brief scramble of the password before settling
                    const scrambledChars = ['!','@','#','$','%','^','&','*','(',')','_','+','-','=','[',']','{','}','|',';',':','.',',','<','>','/','?'];
                    let scrambled = '';
                    for (let i = 0; i < item.pass.length; i++) {
                        scrambled += scrambledChars[Math.floor(Math.random() * scrambledChars.length)];
                    }
                    const hashLine = document.createElement('div');
                    hashLine.innerHTML = `${item.hash} : <span style="color: #ffaa00;">${scrambled}</span>`;
                    output.appendChild(hashLine);
                    // Lock in each character
                    for (let i = 0; i < item.pass.length; i++) {
                        let current = scrambled.split('');
                        current[i] = item.pass[i];
                        scrambled = current.join('');
                        hashLine.innerHTML = `${item.hash} : <span style="color: #ffaa00;">${scrambled}</span>`;
                        await new Promise(r => setTimeout(r, 60));
                    }
                    // Final stable reveal
                    hashLine.innerHTML = `${item.hash} : <span style="color: #ffaa00;">${item.pass}</span>`;
                }
                
                return '<span style="color: #00ff00;">[+] All hashes cracked. Secret phrases revealed.</span>';
            },
            'nmap': async (args) => {
                const target = args[0] || '192.168.1.1';
                commands['spinner']();
                appendCommandHTML(`<span style="color: #0f0;">[>] Starting Nmap 7.95 ( https://nmap.org ) at ${new Date().toLocaleTimeString()}</span>`);
                await new Promise(r => setTimeout(r, 2000));
                appendCommandHTML(`<span style="color: #0ff;">[~] Nmap scan report for ${target}</span>`);
                await new Promise(r => setTimeout(r, 1500));
                commands['stopspinner']();
                return `<pre style="color: #0f0; font-size: 10px;">
            PORT      STATE    SERVICE
            22/tcp    open     ssh
            80/tcp    open     http
            443/tcp   closed   https
            3306/tcp  open     mysql
            8080/tcp  filtered http-proxy
            MAC Address: XX:XX:XX:XX:XX:XX (Unknown)
            </pre>
            <span style="color: #0ff;">[!] Scan finished: 3 open ports.</span>`;
            },
            'flipper': (args) => {
                const sub = args[0]?.toLowerCase();
                const terminal = document.getElementById('command-runner');  // or 'cyber-fetch-terminal'

                if (sub === 'subghz') {
                    terminal.classList.add('flipper-theme');
                    return `
            <div class="ascii-art" style="text-align: center;">
                <pre>
                    .-------.
                   /   o   o \\
                   |    _____  |
                   \\  '-----' /
                    '-------'
                <-- "Hack the planet!"
                </pre>
                <b>FLIPPER ZERO – SUB‑GHZ EMULATOR</b><br>
                Frequency: 433.92 MHz<br>
                [~] Reading raw signal…<br>
                [+] Signal captured: "Tesla_Charge_Open"<br>
                [!] Emulating…<br>
                <span style="color: #ff0;">Theme active. Type <b>flipper off</b> to exit.</span>
            </div>`;
                }

                if (sub === 'off') {
                    terminal.classList.remove('flipper-theme');
                    return 'Flipper theme deactivated. Terminal restored.';
                }

                if (sub === 'nfc') {
                    return `
                    <div style="color: #ff8200; font-family: monospace; line-height: 1.1; text-align: center;">
                        <pre style="color: #ff8200; display: inline-block; text-align: left;">
                        (•)
                         |
                      ___|___
                     |  ___  |
                     | |___| |
                     |_______|
                        </pre>
                        <br>
                        <b>NFC READER ACTIVE</b><br>
                        [~] Place tag on Flipper…<br>
                        [+] UID: 04 A1 B2 C3 D4 E5<br>
                        [+] SAK: 08 (MIFARE Classic 1K)<br>
                        <span style="color: #ff0;">Type <b>flipper off</b> to exit Flipper mode.</span>
                    </div>`;
                }

                if (sub === 'badusb') {
                    return`
                        <div style="color: #ff8200; font-family: monospace; line-height: 1.1; text-align: center;">
                        <pre style="color: #ff8200; display: inline-block; text-align: left;">
                     _________________________
                    | [  ]               (O) |
                    |      _____________     |
                    |     |             |    |
                    |     |  FLIPPER    |  ^ |
                    |     |   ZERO      | < >|
                    |     |_____________|  v |
                    |________________________|
                        </pre>
                        <br>
                        <b>BADUSB MODE ACTIVE</b><br>
                        [!] Injecting payload…<br>
                        [*] Opening reverse shell on attacker IP…<br>
                        [+] Connection established.<br>
                        <span style="color: #ff0;">Type <b>flipper off</b> to exit Flipper mode.</span>
                    </div>`;
                    }

                return `
                    <div style="color: #ff8200; font-family: monospace; line-height: 1.1; text-align: center;">
                        <pre style="color: #ff8200; display: inline-block; text-align: left;">
                      .-~~~-.
                     /       \\
                    |  O   O  |
                    |    ^    |
                      \\_____/
                        </pre>
                        <br>
                        <b>FLIPPER ZERO – MULTI‑TOOL</b><br>
                        <span style="color: #fff;">Available modules:</span><br>
                        <span style="color: #0f0;">subghz</span> – Sub‑GHz emulator<br>
                        <span style="color: #0f0;">nfc</span> – NFC card reader<br>
                        <span style="color: #0f0;">badusb</span> – BadUSB injector<br>
                        <span style="color: #0f0;">off</span> – Exit Flipper mode<br>
                        <br>
                        <span style="color: #888;">Example: flipper subghz</span>
                        <br><br>
                        <pre style="color: #ff8200; display: inline-block; text-align: left;">
        __________      _                           
       / ____/ / /___  ____  ___  _____            
      / /_  / / / __ \\/ __ \\/ _ \\/ ___/            
     / __/ / / / /_/ / /_/ /  __/ /                
    /_/   /_/_/ .___/ .___/\\___/_/  _____  ____  ____ 
             /_/   /_/             /__  / / __ \\/ __ \\
                                     / / / /_/ / /_/ /
                                    / /_/ ____/ ____/ 
                                /____/_/   /_/     
                        </pre>
                    </div>`;
            },
            'zoom': (args) => {
                const mode = args[0];
                if (mode === 'in' || mode === '+') return zoomTerm(2);
                if (mode === 'out' || mode === '-') return zoomTerm(-2);
                if (mode === 'reset') {
                    currentTermFontSize = 8;
                    document.documentElement.style.setProperty('--term-font-size', '8px');
                    return '[ SYSTEM ] Zoom reset to 8px.';
                }
                return 'Usage: zoom [in|out|reset]';
            },
            'mode': (args) => {
                const terminal = document.getElementById('command-runner');
                const mode = args[0]?.toLowerCase();
                const allModes = ['flipper', 'midnight', 'matrix', 'crimson', 'cyber', 'hologram', 'stealth'];
                const classNames = allModes.map(m => `mode-${m}`);

                const clearModes = () => classNames.forEach(c => terminal.classList.remove(c));

                if (mode === 'off') {
                    clearModes();
                    const savedTheme = localStorage.getItem('elite-color-profile') || 'cyan';
                    if (typeof applyColorTheme === 'function') applyColorTheme(savedTheme);
                    return '✅ Terminal mode cleared. Back to default theme.';
                }

                if (allModes.includes(mode)) {
                    clearModes();
                    terminal.classList.add(`mode-${mode}`);
                    return `✅ Terminal mode set to <span style="color: ${getComputedStyle(terminal).getPropertyValue('--mode-accent').trim() || 'inherit'};">${mode.toUpperCase()}</span>.`;
                }

                return `Usage: mode [${allModes.join('|')}|off]`;
            },
            'raspberry': () => {
                const cpuTemp = (Math.random() * 20 + 35).toFixed(1);
                const gpuTemp = (Math.random() * 15 + 33).toFixed(1);
                const uptime = `${Math.floor(Math.random() * 30)} days ${Math.floor(Math.random() * 24)} hours`;
                const coreVolt = (Math.random() * 0.3 + 1.1).toFixed(2);
                return `
            <div style="border-left: 3px solid #c51a4a; padding-left: 10px;">
                <pre style="color: #c51a4a; line-height: 1.2; font-size: 9px;">
                .~~.   .~~.
                '. \\ ' ' / .'
                 .~ .~~~..~.
                : .~.'~'.~. :
                ~ (   ) (   ) ~
                ( : '~'.~.'~' : )
                ~ .~ (   ) ~. ~
                 (  : '~' :  )
                 '~ .~~~. ~'
                '~'
                </pre>
                <span style="color: #0f0;">CPU Temp:</span> ${cpuTemp}°C<br>
                <span style="color: #0f0;">GPU Temp:</span> ${gpuTemp}°C<br>
                <span style="color: #0f0;">Core Volt:</span> ${coreVolt}V<br>
                <span style="color: #0f0;">Uptime:</span> ${uptime}<br>
                <span style="color: #0f0;">GPIO Status:</span> 17 pins available<br>
            </div>`;
            },
            'gpio': (args) => {
                const sub = args[0]?.toLowerCase();
                if (sub === 'status' || !sub) {
                    const pins = [];
                    for (let i = 1; i <= 40; i++) {
                        const state = Math.random() > 0.6 ? 'HIGH' : 'LOW';
                        pins.push(`Pin ${i.toString().padStart(2)}: ${state}`);
                    }
                    return `
            <div style="color: #0f0; font-family: monospace; line-height: 1.1;">
                <pre style="color: #0f0; font-size: 8px; line-height: 1;">
            +----------------------------+
             |()2#################40() +---+
             | 1#################39    |USB|
             |#D  Pi Model B+ / 4  +-+ +---+
             |#I       \\/      +--+| | +---+
             |#S  ()()         |CAM+-+ |USB|
             |#P  ()           +--+#   +---+
             |#Y  #     +----+     |       |
             |()+---+   |HDMI|   +-+  +--+ |
             +--|PWR|---+----+---|V|--|NET|+
              +---+            +-+  +--+
                </pre>
                <strong style="color: #00ff00;">GPIO STATUS</strong><br>
                ${pins.slice(0, 10).join('<br>')}<br>
                <span style="color: #888;">… and 30 more pins</span>
            </div>`;
                }
                if (sub === 'on' || sub === 'off') {
                    const pin = args[1] || '?';
                    return `<span style="color: #0f0;">[+] Pin ${pin} set to ${sub.toUpperCase()}.</span>`;
                }
                return 'Usage: gpio [status|on|off] [pin]';
            },
            'walls': async () => {
                const getFileName = (url) => {
                    try {
                        return url.split('/').pop() || 'unknown.jpg';
                    } catch {
                        return 'unknown.jpg';
                    }
                };

                // Method 1: GitHub Pages (fast, full catalog)
                const tryGitHubPages = async () => {
                    const scriptUrl = 'https://0xnotkyo.github.io/walls/images.js';
                    const response = await fetch(scriptUrl);
                    if (!response.ok) throw new Error(`Pages HTTP ${response.status}`);
                    const scriptText = await response.text();
                    
                    // Safe evaluation – the script only defines imageGroups
                    const fn = new Function(scriptText + '; return imageGroups;');
                    const imageGroups = fn();
                    
                    const allImages = [];
                    imageGroups.forEach(group => {
                        if (group.images && Array.isArray(group.images)) {
                            group.images.forEach(img => {
                                const url = typeof img === 'string' ? img : img.url;
                                if (url) {
                                    allImages.push({
                                        url: url,
                                        category: group.name,
                                        filename: getFileName(url)
                                    });
                                }
                            });
                        }
                    });
                    if (allImages.length === 0) throw new Error('No images found in Pages catalog');
                    return { images: allImages, method: 'CATALOG' };
                };

                // Method 2: GitHub API (reliable fallback)
                const tryGitHubAPI = async () => {
                    const repo = '0xnotkyo/walls';
                    const contentsResp = await fetch(`https://api.github.com/repos/${repo}/contents/images`);
                    if (!contentsResp.ok) throw new Error(`API HTTP ${contentsResp.status}`);
                    const contents = await contentsResp.json();
                    const folders = contents.filter(item => item.type === 'dir');
                    if (folders.length === 0) throw new Error('No folders found');
                    
                    const randomFolder = folders[Math.floor(Math.random() * folders.length)];
                    const filesResp = await fetch(randomFolder.url);
                    const files = await filesResp.json();
                    const images = files.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                    if (images.length === 0) throw new Error('No images in folder');
                    
                    const randomImage = images[Math.floor(Math.random() * images.length)];
                    return {
                        images: [{
                            url: randomImage.download_url,
                            category: randomFolder.name,
                            filename: randomImage.name
                        }],
                        method: 'API'
                    };
                };

                // Method 3: Picsum fallback (last resort)
                const tryPicsumFallback = () => {
                    const randomID = Math.floor(Math.random() * 1000);
                    return {
                        images: [{
                            url: `https://picsum.photos/id/${randomID}/800/600`,
                            category: 'RANDOM_GEN',
                            filename: `gen_${randomID}.jpg`
                        }],
                        method: 'FALLBACK'
                    };
                };

                try {
                    appendCommandHTML('<span style="color: #888;">📡 Uplinking to wallpaper satellite...</span>');
                    
                    let result;
                    try {
                        result = await tryGitHubPages();
                    } catch (pagesError) {
                        console.warn('GitHub Pages failed:', pagesError);
                        try {
                            result = await tryGitHubAPI();
                        } catch (apiError) {
                            console.warn('GitHub API failed:', apiError);
                            result = tryPicsumFallback();
                        }
                    }
                    
                    const allImages = result.images;
                    const methodTag = ` [${result.method}]`;
                    const randomItem = allImages[Math.floor(Math.random() * allImages.length)];
                    
                    const imgHtml = `<br><img src="${randomItem.url}" 
                        style="max-width: 100%; height: 250px; width: 100%; object-fit: cover; 
                            border: 1px solid var(--accent-color); border-radius: 4px; 
                            filter: contrast(1.1) brightness(0.9); margin-top: 8px;"
                        loading="lazy" alt="Wallpaper">`;
                    
                    return `🖼️ SOURCE: ${randomItem.category}${methodTag}<br>📄 FILE: ${randomItem.filename}${imgHtml}`;
                    
                } catch (error) {
                    console.error('Walls catastrophic error:', error);
                    return '⚠️ CONNECTION LOST: Could not sync wallpapers.';
                }
            },
            'joke': async () => {
                try {
                    const resp = await fetch('https://icanhazdadjoke.com/', {
                        headers: { 'Accept': 'application/json' }
                    });
                    const data = await resp.json();
                    return `😂 ${data.joke}`;
                } catch (e) {
                    return 'Why did the joke API fail? It had too many punchlines to handle.😂';
                }
            },
            'riddle': () => {
                const riddles = [
                    { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", a: "An echo" },
                    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
                    { q: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", a: "A map" },
                    { q: "What has to be broken before you can use it?", a: "An egg" },
                    { q: "I'm tall when I'm young, and I'm short when I'm old. What am I?", a: "A candle" },
                    { q: "What month of the year has 28 days?", a: "All of them" },
                    { q: "What is full of holes but still holds water?", a: "A sponge" },
                    { q: "What question can you never answer yes to?", a: "Are you asleep yet?" },
                    { q: "What is always in front of you but can't be seen?", a: "The future" },
                    { q: "What can you break, even if you never pick it up or touch it?", a: "A promise" },
                    { q: "What gets wet while drying?", a: "A towel" },
                    { q: "I have branches, but no fruit, trunk, or leaves. What am I?", a: "A bank" },
                    { q: "What can run but never walks, has a mouth but never talks?", a: "A river" },
                    { q: "What has hands but can't clap?", a: "A clock" },
                    { q: "What has a head and a tail but no body?", a: "A coin" },
                    { q: "Where does today come before yesterday?", a: "The dictionary" },
                    { q: "What invention lets you look right through a wall?", a: "A window" },
                    { q: "What has 13 hearts but no other organs?", a: "A deck of cards" },
                    { q: "What has one eye but can't see?", a: "A needle" },
                    { q: "What has words but never speaks?", a: "A book" },
                    { q: "What can travel all around the world without leaving its corner?", a: "A stamp" },
                    { q: "What has a neck but no head?", a: "A bottle" },
                    { q: "What gets bigger the more you take from it?", a: "A hole" },
                    { q: "What is so fragile that saying its name breaks it?", a: "Silence" },
                    { q: "What goes up but never comes down?", a: "Your age" },
                    { q: "What has keys but can't open locks?", a: "A piano" },
                    { q: "What has a thumb and four fingers but is not alive?", a: "A glove" },
                    { q: "What has a bed but never sleeps, has a mouth but never eats?", a: "A river" },
                    { q: "What has four wheels and flies?", a: "A garbage truck" },
                    { q: "What has teeth but cannot bite?", a: "A comb" },
                    { q: "What has a ring but no finger?", a: "A telephone" },
                    { q: "What has an eye but cannot see?", a: "A storm" },
                    { q: "What has a foot but no legs?", a: "A snail" },
                    { q: "What has a face but no eyes, hands but no arms?", a: "A clock" },
                    { q: "What has a heart that doesn't beat?", a: "An artichoke" },
                    { q: "What has a head, a tail, is brown, and has no legs?", a: "A penny" },
                    { q: "What room can no one enter?", a: "A mushroom" },
                    { q: "What is black when you buy it, red when you use it, and gray when you throw it away?", a: "Charcoal" },
                    { q: "What can you catch but never throw?", a: "A cold" },
                    { q: "What belongs to you but others use it more than you do?", a: "Your name" },
                    { q: "What has many keys but can't open a single door?", a: "A keyboard" },
                    { q: "What has a face that doesn't frown, hands that don't wave, and tells time without a sound?", a: "A digital clock" },
                    { q: "What building has the most stories?", a: "A library" },
                    { q: "What is lighter than a feather but even the world's strongest person can't hold it for long?", a: "Breath" },
                    { q: "What starts with T, ends with T, and has T in it?", a: "A teapot" },
                    { q: "What word becomes shorter when you add two letters?", a: "Short" },
                    { q: "What is at the end of a rainbow?", a: "The letter W" },
                    { q: "What comes once in a minute, twice in a moment, but never in a thousand years?", a: "The letter M" },
                    { q: "What begins with an E but only has one letter?", a: "An envelope" },
                    { q: "If you have me, you want to share me. If you share me, you haven't got me. What am I?", a: "A secret" }
                ];
                
                const r = riddles[Math.floor(Math.random() * riddles.length)];
                
                return `
                    <div style="border-left: 2px solid #ffaa00; padding-left: 10px; margin: 5px 0;">
                        🤔 <strong style="color: #ffaa00;">RIDDLE</strong><br>
                        <span style="color: #ffffff;">${r.q}</span><br>
                        <details style="margin-top: 8px; color: #888;">
                            <summary style="cursor: pointer; color: #00f0ff;">Reveal Answer</summary>
                            <span style="color: #4aff9e;">${r.a}</span>
                        </details>
                    </div>
                `;
            },
            'learn': async () => {
                const loadId = 'learn-load-' + Date.now();
                appendCommandHTML(`<span id="${loadId}" style="color: #888;">🧠 Accessing global knowledge base...</span>`);
                try {
                    const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
                    const data = await res.json();
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    
                    return `💡 <strong>DID YOU KNOW:</strong> <span style="color: #ccc;">${data.text}</span>`;
                } catch (e) {
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    return '<span style="color: #ff5555;">⚠️ Global knowledge base offline.</span>';
                }
            },
            'qr': (args) => {
                const text = args.join(' ') || 'https://github.com/JinKaneki/EliteGDX';
                
                try {
                    const qr = qrcode(0, 'M');  // type number 0, error correction 'M'
                    qr.addData(text);
                    qr.make();
                    
                    // Generate as data URL (PNG)
                    const dataUrl = qr.createDataURL(4, 0);  // cell size 4, margin 0
                    
                    return `<br><img src="${dataUrl}" style="image-rendering: pixelated; width: 200px; height: 200px; background: white; padding: 8px; border-radius: 8px;"><br><span style="color: #888;">Scan: ${text}</span>`;
                } catch (e) {
                    return '⚠️ QR generation failed. Text too long?';
                }
            },
            'ping': async (args) => {
                const target = args[0] || 'google.com';
                const output = document.createElement('div');
                cmdOutput.appendChild(output);
                output.innerHTML = `PING ${target} (56 data bytes):<br>`;

                for (let i = 0; i < 4; i++) {
                    const start = performance.now();
                    try {
                        await fetch('https://www.google.com/favicon.ico', {
                            mode: 'no-cors',
                            cache: 'no-store'
                        });
                        const rtt = Math.round(performance.now() - start);
                        output.innerHTML += `64 bytes from ${target}: icmp_seq=${i} time=${rtt}ms<br>`;
                    } catch (e) {
                        output.innerHTML += `<span style="color: #f00;">Request timeout for icmp_seq ${i}</span><br>`;
                    }
                    if (i < 3) await new Promise(r => setTimeout(r, 500));
                }
                output.innerHTML += `<br>--- ${target} ping statistics ---<br>4 packets transmitted, 4 received, 0% packet loss<br>`;
                cmdOutput.scrollTop = cmdOutput.scrollHeight;
                return ''; // already injected into output
            },
            'react': async () => {
                const steps = [
                    'Compiling JSX',
                    'Bundling with Webpack',
                    'Resolving dependencies',
                    'Minifying assets',
                    'Hot reloading'
                ];

                // Create a container for the live output
                const output = document.getElementById('cmd-output');
                const container = document.createElement('div');
                container.innerHTML = '<span style="color: #61dafb; font-weight: bold;">⚛️ React Build Simulation</span><br>';
                output.appendChild(container);

                for (const step of steps) {
                    const stepLine = document.createElement('div');
                    stepLine.style.color = '#888';
                    container.appendChild(stepLine);

                    // Animate progress from 0 to 100
                    for (let percent = 0; percent <= 100; percent += 20) {
                        stepLine.innerHTML = `${step}... <span style="color: #61dafb;">[ ${'█'.repeat(percent/10)}${'░'.repeat(10 - percent/10)} ] ${percent}%</span>`;
                        // Small random delay – makes it feel like real work
                        await new Promise(r => setTimeout(r, 80 + Math.random() * 150));
                        output.scrollTop = output.scrollHeight;
                    }
                    // Step complete
                    stepLine.innerHTML = `${step}... <span style="color: #0f0;">DONE</span>`;
                }

                const finalTime = (Math.random() * 2 + 1).toFixed(2);
                return `<span style="color: #0f0;">Compiled successfully in ${finalTime}s. Deployment ready.</span>`;
            },
            'anime': async () => {
                try {
                    // Fetch Top Anime
                    const topResp = await fetch('https://api.jikan.moe/v4/top/anime');
                    if (!topResp.ok) throw new Error('Rate limit');
                    const topData = await topResp.json();
                    
                    let output = '<strong style="color: #2e51a2;">🎌 TOP ANIME (MyAnimeList)</strong><br>';
                    topData.data.slice(0, 10).forEach((item, i) => {
                        // Added a link so you can actually go see the anime
                        output += `${i+1}. <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none;">${item.title}</a> <span style="color: #ffaa00;">(⭐ ${item.score})</span><br>`;
                    });
                    
                    // Fetch Airing
                    const airingResp = await fetch('https://api.jikan.moe/v4/seasons/now?sfw');
                    if (!airingResp.ok) throw new Error('Rate limit');
                    const airingData = await airingResp.json();
                    
                    output += '<br><strong style="color: #ff5733;">📺 CURRENTLY AIRING</strong><br>';
                    airingData.data.slice(0, 10).forEach((item, i) => {
                        output += `${i+1}. <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none;">${item.title}</a> <span style="color: #888;">(${item.type})</span><br>`;
                    });
                    
                    return output;
                } catch (e) {
                    return '<span style="color: #ff0000;">⚠️ SENSORS DOWN: Jikan API rate limited or offline.</span>';
                }
            },
            'technology': async () => {
                appendCommandHTML('<span style="color: #888;">Fetching curated tech news...</span>');

                // Define sources and their desired weight (number of articles to aim for)
                const feeds = [
                    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', weight: 4 },
                    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', weight: 3 },
                    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', weight: 2 },
                    { name: 'Wired', url: 'https://www.wired.com/feed/rss', weight: 1 }
                ];

                try {
                    // 1. Fetch and parse all feeds in parallel
                    const allPromises = feeds.map(async feed => {
                        const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
                        const resp = await fetch(api);
                        const data = await resp.json();
                        // 2. Take the newest 'weight' number of articles for this source
                        const items = (data.items || []).slice(0, feed.weight);
                        return items.map(item => ({ ...item, sourceName: feed.name }));
                    });

                    const results = await Promise.all(allPromises);
                    let allItems = results.flat();
                    
                    // 3. Sort all combined items by publish date (newest first)
                    const sortedItems = allItems
                        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                        
                    // 4. Display the headlines
                    let output = '<strong style="color: #00f0ff;">🖥️ CURATED TECH HEADLINES</strong><br>';
                    sortedItems.forEach((item, i) => {
                        output += `[${i+1}] <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; border-bottom: 1px dotted #00f0ff;">${item.title}</a> <span style="color: #888;">(${item.sourceName})</span><br>`;
                    });
                    
                    return output;
                } catch (e) {
                    console.warn('Tech news fetch failed:', e);
                    return '⚠️ Could not fetch technology news. Check your connection.';
                }
            },
            'poem': async () => {
                try {
                    const resp = await fetch('https://poetrydb.org/random');
                    const data = await resp.json();
                    const poem = data[0];
                    // Format the poem text with line breaks
                    const poemText = poem.lines.join('<br>');
                    return `<span style="color: #9370db;">✍️ ${poem.title} by ${poem.author}</span><br><span style="color: #ffffff;">${poemText}</span>`;
                } catch (e) {
                    return '⚠️ The muses are silent. Could not fetch a poem.';
                }
            },
            'bible': async () => {
                try {
                    const resp = await fetch('https://labs.bible.org/api/?passage=random&type=json');
                    const data = await resp.json();
                    return `<span style="color: #ffdf00;">✝️ ${data[0].bookname} ${data[0].chapter}:${data[0].verse}</span><br><span style="color: #ffffff;">${data[0].text}</span>`;
                } catch (e) {
                    return '⚠️ Could not fetch a verse. The heavens are quiet.';
                }
            },
            // 📜 POETRY: Fetches classic poetry from PoetryDB
            'poetry': async () => {
                const loadId = 'poetry-load-' + Date.now();
                appendCommandHTML(`<span id="${loadId}" style="color: #888;">📜 Searching the archives of humanity...</span>`);
                try {
                    const res = await fetch('https://poetrydb.org/random/1');
                    const data = await res.json();
                    const poem = data[0];
                    
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    
                    // Slice the first 6 lines so we don't flood the terminal with a 100-line epic
                    const lines = poem.lines.slice(0, 6).join('<br>');
                    const hasMore = poem.lines.length > 6 ? '<br><span style="color:#555;">[...]</span>' : '';
                    
                    return `<strong style="color: #ffaa00;">${poem.title.toUpperCase()}</strong><br><span style="color: #888;">by ${poem.author}</span><br><br><span style="color: #ccc;">${lines}${hasMore}</span>`;
                } catch (e) {
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    return '<span style="color: #ff5555;">⚠️ Archives unreachable.</span>';
                }
            },
            // 📖 BIBLE: Fetches a random verse via Bible.org API
            'verse': async () => {
                const loadId = 'bible-load-' + Date.now();
                appendCommandHTML(`<span id="${loadId}" style="color: #888;">📖 Opening the sacred texts...</span>`);
                try {
                    const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
                    const data = await res.json();
                    
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    
                    return `🕊️ <strong style="color: #fff;">${data[0].bookname} ${data[0].chapter}:${data[0].verse}</strong><br><span style="color: #ffaa00;">"${data[0].text}"</span>`;
                } catch (e) {
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    return '<span style="color: #ff5555;">⚠️ Could not fetch a verse. The heavens are quiet.</span>';
                }
            },
            // 🪷 SUTRA: Authentic translations from the Pali Canon (Dhammapada/Suttas)
            'sutra': () => {
                const sutras = [
                    "Mind precedes all mental states. Mind is their chief; they are all mind-wrought.\n— Dhammapada 1",
                    "Just as a solid rock is not shaken by the storm, even so the wise are not affected by praise or blame.\n— Dhammapada 81",
                    "Radiate boundless love towards the entire world.\n— Metta Sutta (Sn 1.8)",
                    "Drop by drop is the water pot filled. Likewise, the wise man, gathering it little by little, fills himself with good.\n— Dhammapada 122",
                    "There is no fear for one whose mind is not filled with desires.\n— Dhammapada 39",
                    "Let none find fault with others; let none see the omissions and commissions of others. But let one see one's own acts, done and undone.\n— Dhammapada 50",
                    "Hatred does not cease by hatred, but only by love; this is the eternal rule.\n— Dhammapada 5",
                    "Better than a thousand useless words is one useful word, hearing which one attains peace.\n— Dhammapada 100",
                    "As a beautiful flower that is colorful but has no fragrance, even so, fruitless is the well-spoken word of one who does not practice it.\n— Dhammapada 51",
                    "The fool who knows he is a fool is wise to that extent; the fool who thinks himself wise is a fool indeed.\n— Dhammapada 63",
                    "Just as a bee gathers nectar and moves on without harming the flower, so should the sage live in the village.\n— Dhammapada 49",
                    "Your own self is your own mainstay, for who else could your mainstay be? With yourself well tamed, you gain a mainstay hard to gain.\n— Dhammapada 160",
                    "Conquer anger with non-anger. Conquer badness with goodness. Conquer meanness with generosity. Conquer dishonesty with truth.\n— Dhammapada 223",
                    "All tremble at violence; life is dear to all. Putting oneself in the place of another, one should not kill or cause another to kill.\n— Dhammapada 130",
                    "The one who is wise and mindful, having abandoned attachment and aversion, calms this body and mind.\n— Itivuttaka 115",
                    "This is the way to purification: by oneself is evil done, by oneself is evil undone. Purity and impurity depend on oneself; no one can purify another.\n— Dhammapada 165",
                    "What we are today comes from our thoughts of yesterday, and our present thoughts build our life of tomorrow: our life is the creation of our mind.\n— Dhammapada 1 (paraphrased)",
                    "In this world, hate never yet dispelled hate. Only love dispels hate. This is the law, ancient and inexhaustible.\n— Dhammapada 5",
                    "Like a fine flower, beautiful to look at but without scent, fine words are fruitless in a man who does not act in accordance with them.\n— Dhammapada 51",
                    "Think not lightly of evil, saying, 'It will not come to me.' Drop by drop is the water pot filled. Likewise, the fool, gathering it little by little, fills himself with evil.\n— Dhammapada 121",
                    "One should not pry into the faults of others, into things done and left undone by others. One should consider only what one has done and left undone.\n— Dhammapada 50",
                    "Better it is to live one day seeing the rise and fall of things than to live a hundred years without ever seeing it.\n— Dhammapada 113",
                    "Just as a mountain of solid rock is not shaken by the storm, so the wise are not moved by praise or blame.\n— Dhammapada 81",
                    "The craving of the thoughtless grows like a creeper. They jump from life to life like a monkey seeking fruit in the forest.\n— Dhammapada 334",
                    "Those who cling to perceptions and views wander the world offending people.\n— Sutta Nipata 4.9",
                    "A man is not learned simply because he talks much. He who is patient, free from hate and fear, is called learned.\n— Dhammapada 258",
                    "There is no fire like passion, no shark like hatred, no snare like folly, no torrent like craving.\n— Dhammapada 251",
                    "The wise one makes straight the crooked mind, just as a fletcher makes straight his arrows.\n— Dhammapada 33",
                    "The mind is hard to check, swift, flits wherever it listeth: to tame it is good; a tamed mind brings happiness.\n— Dhammapada 35",
                    "Do not give your attention to what others do or fail to do; give it to what you do or fail to do.\n— Dhammapada 50 (alternate translation)",
                    "Happiness follows sorrow, sorrow follows happiness; but when one no longer discriminates happiness and sorrow, a good deed and a bad deed, one is able to realize freedom.\n— Based on the Sutra of Hui Neng",
                    "If you do not find a wise companion to walk with, walk alone, like an elephant in the forest. Better to walk alone than with a fool.\n— Dhammapada 329",
                    "He who, having been heedless, becomes heedful, lights up the world like the moon freed from clouds.\n— Dhammapada 172",
                    "Easy to do are things that are bad and harmful to oneself. But exceedingly difficult to do are things that are good and beneficial.\n— Dhammapada 163",
                    "Like a lake clear and peaceful, so is the wise one who hears the Dharma. Such a person is truly tranquil.\n— Dhammapada 82",
                    "Health is the greatest gift, contentment the greatest wealth, faithfulness the best relationship.\n— Dhammapada 204",
                    "The wise ones, ever meditative and steadfastly persevering, alone experience Nibbana, the incomparable freedom from bondage.\n— Dhammapada 23",
                    "Even as a solid rock is unshaken by the wind, so are the wise unshaken by praise or blame.\n— Dhammapada 81",
                    "There is no path in the sky; one must find the inner path. All things indeed are passing.\n— Dhammapada 254",
                    "All conditioned things are impermanent — when one sees this with wisdom, one turns away from suffering.\n— Dhammapada 277",
                    "All conditioned things are suffering — when one sees this with wisdom, one turns away from suffering.\n— Dhammapada 278",
                    "All phenomena are without self — when one sees this with wisdom, one turns away from suffering.\n— Dhammapada 279",
                    "When you see a person who knows what is good and what is not, follow that person like the moon follows the path of the stars.\n— Dhammapada 208",
                    "Let go of the past, let go of the future, let go of the present, and cross over to the farther shore of existence. With mind wholly liberated, you shall come no more to birth and death.\n— Dhammapada 348",
                    "Just as a farmer irrigates his field, as a fletcher shapes an arrow, as a carpenter carves wood, the wise tame themselves.\n— Dhammapada 80",
                    "Speak only the speech that neither torments oneself nor does harm to others. That speech is truly well spoken.\n— Sutta Nipata 3.3",
                    "One who is calm, restrained, and speaks truthfully, who has abandoned all harshness — such a one is truly a sage.\n— Sutta Nipata 1.4",
                    "As a mother would risk her life to protect her only child, even so should one cultivate a limitless heart towards all beings.\n— Metta Sutta (Sn 1.8)",
                    "Happiness is having few desires; unhappiness is having many desires.\n— Dhammapada 83 (paraphrased)",
                    "Be an island unto yourself; be your own refuge. Take no other refuge. Let the Dhamma be your island and your refuge.\n— Mahaparinibbana Sutta (DN 16)",
                    "The one who conquers himself is a far greater hero than he who conquers a thousand times a thousand men on the battlefield.\n— Dhammapada 103",
                    "Ceasing to do evil, cultivating the good, purifying the heart: this is the teaching of the Buddhas.\n— Dhammapada 183",
                    "When one feels no attachment for anything, having nothing to hold on to, then one crosses the flood.\n— Sutta Nipata 1.1",
                    "Seeing the body as a fragile clay pot, and fortifying the mind like a well‑guarded city, fight Māra with the sword of wisdom.\n— Dhammapada 40",
                    "Know that the body is like foam, a mirage. Break the flower‑tipped arrows of Mara and go where the King of Death cannot see you.\n— Dhammapada 46",
                    "Better than absolute sovereignty over the earth, better than going to heaven, better than lordship over all the worlds, is the fruit of stream‑entry.\n— Dhammapada 178",
                    "Do not rely on what you think you see; do not rely on tradition, or on scripture, or on logic, or on inference, or on analogy, or on agreement through pondering views. When you know for yourselves: 'These things are unskillful, blameworthy, criticized by the wise, and lead to harm and suffering,' then abandon them.\n— Kalama Sutta (AN 3.65)",
                    "And when you know for yourselves: 'These things are skillful, blameless, praised by the wise, and lead to welfare and happiness,' then enter and abide in them.\n— Kalama Sutta (AN 3.65)",
                    "This is the only way, O monks, for the purification of beings, for the overcoming of sorrow and lamentation, for the destruction of pain and grief, for reaching the right path, for the attainment of Nibbana, namely, the four foundations of mindfulness.\n— Satipatthana Sutta (MN 10)",
                    "A monk develops mindfulness of breathing in and out, contemplating the body in the body, feelings in feelings, mind in mind, and mental objects in mental objects, ardent, clearly comprehending, and mindful, having put away covetousness and grief for the world.\n— Satipatthana Sutta (MN 10)"
                ];
                const quote = sutras[Math.floor(Math.random() * sutras.length)];
                return `🪷 <span style="color: #ffaa00; line-height: 1.4;">${quote.replace('\n', '<br><span style="color:#888;">')}</span></span>`;
            },
            'koan': () => {
                const koans = [
                    "A monk asked Zhaozhou, 'Does a dog have Buddha-nature?' Zhaozhou replied, 'Mu.' (無)",
                    "Two monks were arguing about a flag. One said, 'The flag is moving.' The other said, 'The wind is moving.' The Sixth Patriarch said, 'Not the wind, not the flag—mind is moving.'",
                    "A monk asked, 'What is the essence of Buddhism?' The master said, 'Have you eaten your rice?' The monk replied, 'Yes.' The master said, 'Then wash your bowl.'",
                    "Nan-in, a Japanese master, received a university professor who came to inquire about Zen. Nan-in served tea. He poured his visitor's cup full, and then kept on pouring. The professor watched until he could no longer restrain himself: 'It is overfull. No more will go in!' 'Like this cup,' Nan-in said, 'you are full of your own opinions. How can I show you Zen unless you first empty your cup?'",
                    "The moon is reflected in the water. A man tries to grab it, and drowns.",
                    "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.",
                    "A monk asked Dongshan, 'What is Buddha?' Dongshan replied, 'Three pounds of flax.'",
                    "If you meet the Buddha on the road, kill him.",
                    "The way is not difficult for those who have no preferences.",
                    "What is the sound of one hand clapping?",
                    "When you can't go any further, go further.",
                    "The obstacle is the path.",
                    "Muddy water, let stand, becomes clear.",
                    "A student asked, 'What is the secret of your teaching?' The master said, 'Attention.' The student replied, 'Is that all?' The master said, 'Attention. Attention. Attention.'",
                    "Sitting quietly, doing nothing, spring comes, and the grass grows by itself.",
                    "The world is its own magic.",
                    "Every day is a good day.",
                    "Heaven and earth and I are of the same root. Ten thousand things and I are of one substance.",
                    "To know that you have enough is to be rich.",
                    "No snowflake ever falls in the wrong place."
                ];
                const koan = koans[Math.floor(Math.random() * koans.length)];
                return `🪷 <span style="color: #ffaa00;">Zen Koan</span><br><span style="color: #ffffff;">${koan}</span>`;
            },
            // ⚛️ PHYSICS / MATH: Legendary formulas formatting in pure text
            'physics': () => {
                const formulas = [
                { name: "Schrödinger Equation", eq: "iℏ ∂Ψ/∂t = ĤΨ", desc: "Describes how the quantum state of a physical system changes over time." },
                { name: "Euler's Identity", eq: "e^(iπ) + 1 = 0", desc: "Often called the most beautiful equation in mathematics." },
                { name: "Mass-Energy Equivalence", eq: "E = mc²", desc: "Energy equals mass times the speed of light squared. (Einstein)" },
                { name: "Heisenberg's Uncertainty Principle", eq: "Δx Δp ≥ ℏ/2", desc: "You cannot simultaneously know the exact position and momentum of a particle." },
                { name: "Newton's Law of Universal Gravitation", eq: "F = G(m₁m₂)/r²", desc: "Calculates the gravitational attraction between two masses." },
                { name: "Maxwell's Equations (Gauss's Law)", eq: "∇·E = ρ/ε₀", desc: "Electric charges produce electric fields." },
                { name: "Maxwell's Equations (Faraday's Law)", eq: "∇×E = -∂B/∂t", desc: "Changing magnetic fields create electric fields." },
                { name: "Maxwell's Equations (Ampère's Law)", eq: "∇×B = μ₀J + μ₀ε₀ ∂E/∂t", desc: "Electric currents and changing electric fields produce magnetic fields." },
                { name: "Second Law of Thermodynamics", eq: "ΔS ≥ 0", desc: "Entropy of an isolated system never decreases." },
                { name: "Ideal Gas Law", eq: "PV = nRT", desc: "Relates pressure, volume, temperature, and moles of a gas." },
                { name: "Coulomb's Law", eq: "F = k q₁q₂ / r²", desc: "Force between two point charges." },
                { name: "Ohm's Law", eq: "V = IR", desc: "Voltage equals current times resistance." },
                { name: "Pythagorean Theorem", eq: "a² + b² = c²", desc: "In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides." },
                { name: "Quadratic Formula", eq: "x = [-b ± √(b² - 4ac)] / 2a", desc: "Solves ax² + bx + c = 0." },
                { name: "Einstein's Field Equations", eq: "G_μν + Λ g_μν = (8πG/c⁴) T_μν", desc: "General relativity: matter tells spacetime how to curve; spacetime tells matter how to move." },
                { name: "Planck's Law", eq: "E = hν", desc: "Energy of a photon is proportional to its frequency." },
                { name: "De Broglie Wavelength", eq: "λ = h/p", desc: "Particles exhibit wave‑like behavior." },
                { name: "Hubble's Law", eq: "v = H₀ d", desc: "Galaxies recede at a speed proportional to their distance." },
                { name: "Stefan‑Boltzmann Law", eq: "P = σ A T⁴", desc: "Total energy radiated by a black body per unit surface area." },
                { name: "Wien's Displacement Law", eq: "λ_max = b / T", desc: "Peak wavelength of black‑body radiation is inversely proportional to temperature." },
                { name: "Snell's Law", eq: "n₁ sin θ₁ = n₂ sin θ₂", desc: "Refraction of light at an interface." },
                { name: "Lorentz Force", eq: "F = q(E + v×B)", desc: "Force on a charged particle in electromagnetic fields." },
                { name: "Bernoulli's Principle", eq: "P + ½ρv² + ρgh = constant", desc: "Pressure decreases as fluid speed increases." },
                { name: "Navier‑Stokes Equation", eq: "ρ(∂v/∂t + v·∇v) = -∇P + μ∇²v + f", desc: "Fluid motion (unsolved for general 3D)." },
                { name: "Kepler's Third Law", eq: "T² ∝ a³", desc: "The square of orbital period is proportional to the cube of semi‑major axis." },
                { name: "Escape Velocity", eq: "v_e = √(2GM/r)", desc: "Minimum speed to escape a planet's gravity." },
                { name: "Schwarzschild Radius", eq: "R_s = 2GM/c²", desc: "Radius of a black hole's event horizon." },
                { name: "Doppler Effect (Sound)", eq: "f' = f (v ± v_o) / (v ∓ v_s)", desc: "Change in frequency due to relative motion." },
                { name: "Relativistic Time Dilation", eq: "Δt' = Δt / √(1 - v²/c²)", desc: "Moving clocks run slow." },
                { name: "Relativistic Length Contraction", eq: "L' = L √(1 - v²/c²)", desc: "Moving objects appear shorter." },
                { name: "Relativistic Mass", eq: "m = m₀ / √(1 - v²/c²)", desc: "Mass increases with velocity." },
                { name: "Compton Scattering", eq: "Δλ = (h/mₑc)(1 - cos θ)", desc: "Wavelength shift of scattered photons." },
                { name: "Bohr Model Energy Levels", eq: "E_n = -13.6 eV / n²", desc: "Hydrogen atom energy levels." },
                { name: "Rydberg Formula", eq: "1/λ = R_H (1/n₁² - 1/n₂²)", desc: "Wavelengths of hydrogen spectral lines." },
                { name: "Stefan's Law (Power)", eq: "P = εσAT⁴", desc: "Power radiated by a grey body." },
                { name: "Drag Equation", eq: "F_d = ½ ρ v² C_d A", desc: "Drag force on an object moving through fluid." },
                { name: "Reynolds Number", eq: "Re = ρ v L / μ", desc: "Predicts laminar vs turbulent flow." },
                { name: "Fourier's Law of Heat Conduction", eq: "q = -k ∇T", desc: "Heat flux proportional to negative temperature gradient." },
                { name: "Fick's First Law of Diffusion", eq: "J = -D ∇φ", desc: "Flux proportional to concentration gradient." },
                { name: "Einstein Relation", eq: "D = μ k_B T", desc: "Diffusion coefficient related to mobility and temperature." },
                { name: "Nernst Equation", eq: "E = E° - (RT/nF) ln Q", desc: "Cell potential under non‑standard conditions." },
                { name: "Henderson‑Hasselbalch Equation", eq: "pH = pKa + log([A⁻]/[HA])", desc: "Buffer pH calculation." },
                { name: "Michaelis‑Menten Equation", eq: "v = (V_max [S]) / (K_m + [S])", desc: "Enzyme kinetics." },
                { name: "Golden Ratio", eq: "φ = (1 + √5) / 2 ≈ 1.618", desc: "Proportions found in nature and art." },
                { name: "Euler's Formula", eq: "e^(ix) = cos x + i sin x", desc: "Connects complex exponentials to trigonometric functions." },
                { name: "Stirling's Approximation", eq: "ln(n!) ≈ n ln n - n", desc: "Approximates factorials for large n." },
                { name: "Bayes' Theorem", eq: "P(A|B) = P(B|A) P(A) / P(B)", desc: "Probability of an event based on prior knowledge." },
                { name: "Central Limit Theorem", eq: "X̄ ~ N(μ, σ²/n)", desc: "Sample means approach normal distribution." },
                { name: "Poisson Distribution", eq: "P(k) = (λ^k e^{-λ}) / k!", desc: "Probability of a given number of events in a fixed interval." },
                { name: "Clausius‑Clapeyron Relation", eq: "dP/dT = L / (T ΔV)", desc: "Phase boundary slope on P‑T diagram." }
            ];
                const f = formulas[Math.floor(Math.random() * formulas.length)];
                
                return `
                    <div style="border-left: 2px solid #00f0ff; padding-left: 10px; margin: 5px 0;">
                        ⚛️ <strong style="color: #00f0ff;">${f.name.toUpperCase()}</strong><br>
                        <span style="color: #fff; font-size: 1.1rem; font-family: 'Courier New', monospace;">${f.eq}</span><br>
                        <span style="color: #888;">${f.desc}</span>
                    </div>
                `;
            },
            'biology': () => {
                const facts = [
                    "The human body contains enough carbon to fill about 9,000 pencils.",
                    "Your brain generates about 12-25 watts of electricity—enough to power a low-wattage LED light.",
                    "There are more bacterial cells in your body than human cells.",
                    "The DNA in a single human cell, if stretched out, would be about 2 meters long.",
                    "Your heart beats about 100,000 times per day, pumping about 2,000 gallons of blood.",
                    "The acid in your stomach is strong enough to dissolve razor blades.",
                    "Humans share about 60% of their DNA with bananas.",
                    "A single teaspoon of soil contains more microorganisms than there are people on Earth.",
                    "Octopuses have three hearts and blue blood.",
                    "Tardigrades (water bears) can survive in the vacuum of space.",
                    "The largest living organism on Earth is a honey fungus in Oregon spanning 2.4 miles.",
                    "Some jellyfish are biologically immortal—they can revert to their juvenile form.",
                    "A human sneeze can travel up to 100 miles per hour.",
                    "Your nose can remember 50,000 different scents.",
                    "Humans are the only animals that blush.",
                    "Elephants are the only mammals that can't jump.",
                    "A cockroach can live for weeks without its head.",
                    "The tongue of a blue whale weighs as much as an elephant.",
                    "Bees can recognize human faces.",
                    "Cows have best friends and get stressed when separated.",
                    "Sloths can hold their breath longer than dolphins—up to 40 minutes.",
                    "A group of flamingos is called a 'flamboyance.'",
                    "The fingerprints of koalas are virtually indistinguishable from human fingerprints."
                ];
                const fact = facts[Math.floor(Math.random() * facts.length)];
                return `<span style="color: #4aff9e;">🧬 Biology Fact</span><br><span style="color: #ffffff;">${fact}</span>`;
            },
            'space': async () => {
                try {
                    const resp = await fetch('https://bootprint.space/api/fact');
                    const data = await resp.json();
                    return `🌌 <span style="color: #9370db;">Space Fact</span><br><span style="color: #ffffff;">${data.text}</span>`;
                } catch (e) {
                    const fallbacks = [
                        "Neutron stars are so dense that a sugar-cube-sized amount would weigh about a billion tons.",
                        "There are more stars in the universe than grains of sand on all Earth's beaches.",
                        "A day on Venus is longer than its year.",
                        "The footprints left by Apollo astronauts will remain on the Moon for millions of years.",
                        "There's a planet made entirely of diamond twice the size of Earth."
                    ];
                    const fact = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                    return `🌌 <span style="color: #9370db;">Space Fact</span><br><span style="color: #ffffff;">${fact}</span>`;
                }
            },
            'cstip': () => {
                const tips = [
                    "The first computer programmer was Ada Lovelace, who wrote an algorithm for Charles Babbage's Analytical Engine in the 1840s.",
                    "The term 'bug' originated when a moth got stuck in a relay of the Harvard Mark II computer in 1947.",
                    "Grace Hopper, who popularized 'debugging,' also invented the first compiler.",
                    "The '@' symbol was chosen for email addresses by Ray Tomlinson because it wasn't used in names.",
                    "The first 1GB hard drive, released in 1980, weighed over 500 pounds and cost $40,000.",
                    "The QWERTY keyboard was designed to slow typists down to prevent mechanical jams.",
                    "Python was named after Monty Python, not the snake.",
                    "The first computer mouse was made of wood.",
                    "There are over 700 programming languages.",
                    "The term 'spam' for unwanted messages comes from a Monty Python sketch.",
                    "JavaScript was created in just 10 days.",
                    "The Apollo 11 guidance computer had only 4KB of RAM.",
                    "CAPTCHA stands for 'Completely Automated Public Turing test to tell Computers and Humans Apart.'",
                    "The first computer virus was called 'Creeper' and was created as an experiment in 1971.",
                    "Over 90% of the world's currency exists only in computers.",
                    "The original name for Java was 'Oak.'",
                    "Every day, 2.5 quintillion bytes of data are created.",
                    "The average smartphone today has more computing power than NASA had in 1969."
                ];
                const tip = tips[Math.floor(Math.random() * tips.length)];
                return `💻 <span style="color: #00f0ff;">CS Tip / Fact</span><br><span style="color: #ffffff;">${tip}</span>`;
            },
            'stoic': async () => {
                try {
                    const resp = await fetch('https://stoic-quotes.com/api/quote');
                    const data = await resp.json();
                    return `🏛️ <span style="color: #ffaa00;">Stoic Wisdom</span><br><span style="color: #ffffff;">“${data.text}”</span><br><span style="color: #888;">— ${data.author}</span>`;
                } catch (e) {
                    const fallbacks = [
                        { text: "You have power over your mind—not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
                        { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
                        { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
                        { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
                        { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" }
                    ];
                    const quote = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                    return `🏛️ <span style="color: #ffaa00;">Stoic Wisdom</span><br><span style="color: #ffffff;">“${quote.text}”</span><br><span style="color: #888;">— ${quote.author}</span>`;
                }
            },
            'buddha': async () => {
                const loadId = 'buddha-load-' + Date.now();
                appendCommandHTML(`<span id="${loadId}" style="color: #888;">🧘 Receiving timeless wisdom...</span>`);
                try {
                    const resp = await fetch('https://buddha-api.com/api/random');
                    const data = await resp.json();
                    
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    
                    return `
                        <div style="border-left: 2px solid #ffaa00; padding-left: 10px; margin: 5px 0;">
                            🧘 <span style="color: #ffaa00;">Buddhist Wisdom</span><br>
                            <span style="color: #ffffff;">“${data.text}”</span><br>
                            <span style="color: #888;">— ${data.byName}</span>
                        </div>
                    `;
                } catch (e) {
                    const loadEl = document.getElementById(loadId);
                    if (loadEl) loadEl.remove();
                    
                    // Fallback collection
                    const fallbacks = [
                        { text: "Whatever precious jewel there is in the heavenly worlds, there is nothing comparable to one who is Awakened.", byName: "Buddha" },
                        { text: "But do not ask me where I am going, As I travel in this limitless world, Where every step I take is my home.", byName: "Dogen" },
                        { text: "Life is available only in the present moment.", byName: "Thich Nhat Hanh" },
                        { text: "One moment can change a day, one day can change a life, and one life can change the world.", byName: "Buddha" },
                        { text: "Listening to and understanding our inner sufferings will resolve most of the problems we encounter.", byName: "Thich Nhat Hanh" }
                    ];
                    const quote = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                    return `🧘 <span style="color: #ffaa00;">Buddhist Wisdom</span><br><span style="color: #ffffff;">“${quote.text}”</span><br><span style="color: #888;">— ${quote.byName}</span>`;
                }
            },
            'electronics': () => {
                const items = [
                    // Formulas & Laws (20)
                    { type: 'formula', name: "Ohm's Law", eq: "V = I × R", desc: "Voltage equals Current multiplied by Resistance." },
                    { type: 'formula', name: "Electrical Power", eq: "P = V × I", desc: "Power (Watts) equals Voltage times Current." },
                    { type: 'formula', name: "Kirchhoff's Current Law (KCL)", eq: "Σ I_in = Σ I_out", desc: "The total current entering a junction equals the total current leaving it." },
                    { type: 'formula', name: "Kirchhoff's Voltage Law (KVL)", eq: "Σ V = 0", desc: "The sum of all voltages around any closed loop in a circuit must equal zero." },
                    { type: 'formula', name: "Capacitors in Parallel", eq: "C_total = C₁ + C₂ + ... + Cₙ", desc: "Capacitances add up directly when connected in parallel." },
                    { type: 'formula', name: "Capacitors in Series", eq: "1/C_total = 1/C₁ + 1/C₂ + ...", desc: "The reciprocal of total capacitance is the sum of reciprocals." },
                    { type: 'formula', name: "Resistors in Series", eq: "R_total = R₁ + R₂ + ... + Rₙ", desc: "Resistances add up directly when connected in series." },
                    { type: 'formula', name: "Resistors in Parallel", eq: "1/R_total = 1/R₁ + 1/R₂ + ...", desc: "The reciprocal of total resistance is the sum of reciprocals." },
                    { type: 'formula', name: "RC Time Constant", eq: "τ = R × C", desc: "The time required to charge a capacitor to ~63.2% of its full voltage." },
                    { type: 'formula', name: "Voltage Divider Rule", eq: "V_out = V_in × (R₂ / (R₁ + R₂))", desc: "Calculates the output voltage across R₂ in a series circuit." },
                    { type: 'formula', name: "Current Divider Rule", eq: "I₁ = I_total × (R₂ / (R₁ + R₂))", desc: "For parallel resistors, current splits inversely proportional to resistance." },
                    { type: 'formula', name: "Wheatstone Bridge Balance", eq: "R₁/R₂ = R₃/R₄", desc: "Condition for zero current through the galvanometer." },
                    { type: 'formula', name: "Inductive Reactance", eq: "X_L = 2πfL", desc: "Opposition to AC current by an inductor." },
                    { type: 'formula', name: "Capacitive Reactance", eq: "X_C = 1/(2πfC)", desc: "Opposition to AC current by a capacitor." },
                    { type: 'formula', name: "Impedance (Series RLC)", eq: "Z = √(R² + (X_L - X_C)²)", desc: "Total opposition to AC in an RLC circuit." },
                    { type: 'formula', name: "Resonant Frequency", eq: "f = 1/(2π√(LC))", desc: "Frequency at which inductive and capacitive reactances cancel." },
                    { type: 'formula', name: "Transformer Turns Ratio", eq: "V_s/V_p = N_s/N_p", desc: "Secondary voltage relates to primary by the turns ratio." },
                    { type: 'formula', name: "Decibel (Power Ratio)", eq: "dB = 10 log₁₀(P₁/P₂)", desc: "Logarithmic unit expressing power ratio." },
                    { type: 'formula', name: "Decibel (Voltage Ratio)", eq: "dB = 20 log₁₀(V₁/V₂)", desc: "Logarithmic unit expressing voltage ratio." },
                    { type: 'formula', name: "Coulomb's Law", eq: "F = k q₁q₂ / r²", desc: "Force between two point charges." },

                    // Facts (40) – exactly as provided
                    { type: 'fact', desc: "The first transistor, invented in 1947 at Bell Labs, was about the size of a human fist. Today, billions fit on a single chip." },
                    { type: 'fact', desc: "The '555' timer IC, designed in 1971, is still in production and sells over a billion units annually." },
                    { type: 'fact', desc: "LEDs (Light Emitting Diodes) were first developed in 1962 and initially only emitted red light. Blue LEDs, which enabled white LED lighting, weren't invented until the 1990s." },
                    { type: 'fact', desc: "The Apollo Guidance Computer had only 4KB of RAM and 72KB of ROM. It used rope memory, literally woven by hand." },
                    { type: 'fact', desc: "Capacitors can store energy and release it almost instantly—camera flashes and defibrillators rely on this principle." },
                    { type: 'fact', desc: "The first computer 'bug' was an actual moth found trapped in a relay of the Harvard Mark II computer in 1947. The term 'debugging' was already in use, but this incident made it legendary." },
                    { type: 'fact', desc: "Resistors are color‑coded with bands. The mnemonic 'Bad Boys Race Our Young Girls But Violet Generally Wins' helps remember: Black, Brown, Red, Orange, Yellow, Green, Blue, Violet, Grey, White." },
                    { type: 'fact', desc: "The first hard drive, the IBM 350, weighed over a ton and stored just 3.75 MB." },
                    { type: 'fact', desc: "A modern smartphone has more computing power than the entire NASA control center during the Apollo 11 moon landing." },
                    { type: 'fact', desc: "The integrated circuit was invented by Jack Kilby and Robert Noyce independently in 1958-1959. Kilby won the Nobel Prize." },
                    { type: 'fact', desc: "The QWERTY keyboard layout was designed in the 1870s to slow typists down and prevent mechanical typewriter jams." },
                    { type: 'fact', desc: "The '@' symbol, used in email addresses, was chosen by Ray Tomlinson in 1971 because it was rarely used and meant 'at.'" },
                    { type: 'fact', desc: "Moore's Law, observed by Gordon Moore in 1965, predicted that the number of transistors on a microchip doubles about every two years. It held true for over 50 years." },
                    { type: 'fact', desc: "The first computer mouse, invented by Douglas Engelbart in 1964, was made of wood and had only one button." },
                    { type: 'fact', desc: "Soldering involves melting a filler metal (solder) to join electronic components. Lead‑free solder is now standard for environmental and health reasons." },
                    { type: 'fact', desc: "The 'blue screen of death' (BSOD) in Windows was originally written by Steve Ballmer for Windows 3.1." },
                    { type: 'fact', desc: "E‑ink displays, like those in Kindle readers, use tiny microcapsules filled with charged particles. They consume power only when the image changes." },
                    { type: 'fact', desc: "The first mobile phone call was made by Martin Cooper of Motorola in 1973. The phone weighed 2.5 pounds and had 20 minutes of battery life." },
                    { type: 'fact', desc: "Wi‑Fi uses radio waves in the 2.4 GHz and 5 GHz bands—the same frequencies used by microwave ovens, which can cause interference." },
                    { type: 'fact', desc: "The first 1GB hard drive, introduced by IBM in 1980, weighed over 500 pounds and cost $40,000." },
                    { type: 'fact', desc: "A typical USB port provides 5 volts of power. USB‑C can deliver up to 240 watts, enough to charge a laptop." },
                    { type: 'fact', desc: "The first RAM (random‑access memory) was magnetic core memory—tiny doughnut‑shaped magnets strung on wires." },
                    { type: 'fact', desc: "Bluetooth is named after Harald 'Bluetooth' Gormsson, a 10th‑century king who united Denmark and Norway. The technology was designed to unite devices." },
                    { type: 'fact', desc: "The first digital camera was built in 1975 by Steven Sasson at Kodak. It weighed 8 pounds and took 23 seconds to capture a 0.01‑megapixel image." },
                    { type: 'fact', desc: "The 'ping' command, used to test network connectivity, was named after the sound of sonar pulses." },
                    { type: 'fact', desc: "The ENIAC, one of the first general‑purpose computers (1945), weighed 30 tons and consumed 150 kW of power. Modern chips use a fraction of a watt." },
                    { type: 'fact', desc: "The first computer virus, called 'Creeper,' was created in 1971 as an experiment. It displayed the message: 'I'm the creeper: catch me if you can.'" },
                    { type: 'fact', desc: "The first commercial microprocessor, the Intel 4004 (1971), had 2,300 transistors and a clock speed of 740 kHz. Modern CPUs have billions of transistors and run at several GHz." },
                    { type: 'fact', desc: "The term 'firewall' originally referred to a physical wall designed to prevent the spread of fire in buildings." },
                    { type: 'fact', desc: "The first website ever created (info.cern.ch) is still online and was built by Tim Berners‑Lee in 1991." },
                    { type: 'fact', desc: "The '404 Not Found' HTTP error code is named after room 404 at CERN, where the original web servers were located—though this may be apocryphal." },
                    { type: 'fact', desc: "Capacitive touchscreens work by detecting changes in an electrostatic field when your finger (which is conductive) touches the screen." },
                    { type: 'fact', desc: "The first television remote control, called 'Lazy Bones' (1950), was connected to the TV by a long wire." },
                    { type: 'fact', desc: "The 'Save' icon—a floppy disk—has outlived the actual floppy disk by decades." },
                    { type: 'fact', desc: "The first alarm clock could only ring at 4 AM, invented by Levi Hutchins in 1787." },
                    { type: 'fact', desc: "The first webcam was deployed at Cambridge University to monitor a coffee pot so researchers wouldn't waste trips to an empty pot." },
                    { type: 'fact', desc: "The 'Caps Lock' key was originally a 'Shift Lock' key on mechanical typewriters that physically locked the shift mechanism." },
                    { type: 'fact', desc: "The first text message ever sent was 'Merry Christmas' in 1992." },
                    { type: 'fact', desc: "The first YouTube video, 'Me at the zoo,' was uploaded on April 23, 2005." },
                    { type: 'fact', desc: "The 'Cloud' is just someone else's computer. (But with better uptime.)" }
                ];
                
                const item = items[Math.floor(Math.random() * items.length)];
                
                if (item.type === 'formula') {
                    return `
                        <div style="border-left: 2px solid #00ff00; padding-left: 10px; margin: 5px 0;">
                            ⚡ <strong style="color: #00ff00;">${item.name.toUpperCase()}</strong><br>
                            <span style="color: #fff; font-size: 1.1rem; font-family: 'Courier New', monospace;">${item.eq}</span><br>
                            <span style="color: #888;">${item.desc}</span>
                        </div>
                    `;
                } else {
                    return `
                        <div style="border-left: 2px solid #00ff00; padding-left: 10px; margin: 5px 0;">
                            ⚡ <strong style="color: #00ff00; font-size: 0.8rem;">DID YOU KNOW?</strong><br>
                            <span style="color: #ffffff;">${item.desc}</span>
                        </div>
                    `;
                }
            },
            'engineering': () => {
                const facts = [
                    "The International Space Station (ISS) is the most expensive single object ever built by humankind, with a total cost estimated at over $150 billion.[reference:0]",
                    "The Golden Gate Bridge's two main suspension cables contain 80,000 miles of steel wire, enough to circle the Earth more than three times.[reference:1]",
                    "The Hoover Dam contains so much concrete that it took five years for it to completely cool and cure after construction. It was poured in interlocking blocks to speed up the process.[reference:2]",
                    "The Burj Khalifa is so tall that residents on higher floors experience sunset several minutes after those on the ground, requiring different times for breaking the Ramadan fast.[reference:3]",
                    "The Great Wall of China is not a single continuous wall but a series of fortifications built by different dynasties, with the total length of all sections exceeding 13,000 miles.[reference:4]",
                    "The snowboard was invented by an engineer. Sherman Poppen, a chemical engineer, created the 'Snurfer' for his daughter by binding two skis together.[reference:5]",
                    "The slippery part of a water slide is a feat of civil engineering. A civil engineer designed the pumps and flow rates to maintain a safe but thrilling thin film of water.[reference:6]",
                    "Canadian engineers receive an Iron Ring upon graduation to be worn on the dominant hand, a constant reminder of their ethical obligation to prioritize public safety over all else.[reference:7]",
                    "The word 'engineer' originates from the Latin words 'ingeniare' (to contrive or devise) and 'ingenium' (cleverness), the same root for 'ingenious'.[reference:8]",
                    "Elisa Leonida Zamfirescu was the world's first female engineering graduate, earning her degree in 1912, despite significant societal opposition.[reference:9]",
                    "Bakelite, invented in 1907, was the world's first fully synthetic plastic. It was an engineering breakthrough that launched the modern plastics industry.[reference:10]",
                    "James Buchanan Eads, a self-taught engineer, built the Eads Bridge in St. Louis, the first major bridge to use steel as a primary structural material.[reference:11]",
                    "The Ferris Wheel was invented by George Washington Gale Ferris Jr., an engineer from Pittsburgh, as a direct challenge to the Eiffel Tower for the 1893 Chicago World's Fair.[reference:12]",
                    "An engineer created a chemical coating that allows cotton to clean itself of stains and odors when exposed to sunlight.[reference:13]",
                    "Star Wars wouldn't exist without engineers. The original movie required a team of engineers to design and build the innovative motion-control camera rigs that made the space battles possible.[reference:14]",
                    "The Channel Tunnel, connecting England and France, is 31 miles long, with 23 of those miles running under the seabed.[reference:15]",
                    "Engineers design the soles of running shoes to balance protection, performance, and comfort using complex materials science.[reference:16]",
                    "The tiny dimples on a golf ball were discovered by engineers to reduce drag and allow the ball to fly nearly twice as far as a smooth one.[reference:17]",
                    "Engineers have attempted to become astronauts, with some applying 15 times over 15 years before finally being selected.[reference:18]",
                    "The original patent for the telephone was filed by Alexander Graham Bell, an engineer and scientist, just hours before a rival inventor submitted his own.[reference:19]",
                ];
                
                const f = facts[Math.floor(Math.random() * facts.length)];
                
                return `
                    <div style="border-left: 2px solid #ffaa00; padding-left: 10px; margin: 5px 0;">
                        ⚙️ <strong style="color: #ffaa00;">ENGINEERING FEAT</strong><br>
                        <span style="color: #ffffff;">${f}</span>
                    </div>
                `;
            },
            'case': (args) => {
                if (args.length === 0) {
                    return `
                        <div style="border: 1px solid #ffaa00; padding: 12px; border-radius: 6px; background: rgba(255,170,0,0.05);">
                            <strong style="color: #ffaa00; font-size: 1.1rem;">🛠️ ENGINEERING CASE SIMULATOR</strong><br>
                            <span style="color: #ccc;">A field toolkit for quick diagnostics, calculations, and decoding.</span><br><br>
                            
                            <strong style="color: var(--accent-color);">📋 QUICK REFERENCE</strong><br>
                            <span style="color: #888;">Usage: case &lt;tool&gt; [parameters]</span><br><br>
                            
                            <strong style="color: #0f0;">⚡ LED Resistor</strong><br>
                            <span style="color: #fff;">case resistor 12v led</span> <span style="color: #888;">→ calc resistor for 12V supply, 2V LED</span><br>
                            <span style="color: #fff;">case resistor 9v 3.2v 0.02</span> <span style="color: #888;">→ custom LED (3.2V, 20mA)</span><br><br>
                            
                            <strong style="color: #0f0;">🎨 Resistor Color Decode</strong><br>
                            <span style="color: #fff;">case decode brown black red</span> <span style="color: #888;">→ 1kΩ ±5% (default gold)</span><br>
                            <span style="color: #fff;">case decode yellow violet orange gold</span> <span style="color: #888;">→ 47kΩ ±5%</span><br><br>
                            
                            <strong style="color: #0f0;">🔌 Ohm's Law</strong><br>
                            <span style="color: #fff;">case ohmslaw V 0.02 1000</span> <span style="color: #888;">→ V = I × R (20mA × 1kΩ = 20V)</span><br>
                            <span style="color: #fff;">case ohmslaw I 5 220</span> <span style="color: #888;">→ I = V / R (5V / 220Ω = 22.7mA)</span><br>
                            <span style="color: #fff;">case ohmslaw R 12 0.5</span> <span style="color: #888;">→ R = V / I (12V / 0.5A = 24Ω)</span><br><br>
                            
                            <strong style="color: #0f0;">📊 Voltage Divider</strong><br>
                            <span style="color: #fff;">case vdivider 5 10000 10000</span> <span style="color: #888;">→ 5V with two 10kΩ → 2.5V out</span><br><br>
                            
                            <strong style="color: #0f0;">🔗 Series / Parallel</strong><br>
                            <span style="color: #fff;">case series 100 220 330</span> <span style="color: #888;">→ 650Ω total</span><br>
                            <span style="color: #fff;">case parallel 100 100</span> <span style="color: #888;">→ 50Ω total</span><br><br>
                            
                            <strong style="color: #0f0;">🔋 Capacitor Code</strong><br>
                            <span style="color: #fff;">case capacitor 104</span> <span style="color: #888;">→ 100nF (0.1µF)</span><br>
                            <span style="color: #fff;">case capacitor 472</span> <span style="color: #888;">→ 4.7nF</span><br><br>
                            
                            <span style="color: #888;">Type a command above to run diagnostics.</span>
                        </div>
                    `;
                }

                const tool = args[0].toLowerCase();
                const params = args.slice(1);

                // ----- RESISTOR COLOR CODE DECODER -----
                const colorMap = {
                    'black': 0, 'brown': 1, 'red': 2, 'orange': 3, 'yellow': 4,
                    'green': 5, 'blue': 6, 'violet': 7, 'grey': 8, 'white': 9,
                    'gray': 8, 'purple': 7
                };
                const toleranceMap = {
                    'brown': '±1%', 'red': '±2%', 'green': '±0.5%', 'blue': '±0.25%',
                    'violet': '±0.1%', 'grey': '±0.05%', 'gold': '±5%', 'silver': '±10%',
                    'none': '±20%'
                };

                if (tool === 'decode') {
                    if (params.length < 3) return '⚠️ Usage: case decode &lt;band1&gt; &lt;band2&gt; &lt;band3&gt; [tolerance]';
                    const c1 = params[0].toLowerCase();
                    const c2 = params[1].toLowerCase();
                    const c3 = params[2].toLowerCase();
                    const tol = params[3]?.toLowerCase() || 'gold';
                    
                    if (!(c1 in colorMap) || !(c2 in colorMap) || !(c3 in colorMap)) {
                        return '⚠️ Invalid color. Use: black, brown, red, orange, yellow, green, blue, violet, grey, white';
                    }
                    
                    const val = (colorMap[c1] * 10 + colorMap[c2]) * Math.pow(10, colorMap[c3]);
                    const tolerance = toleranceMap[tol] || '±5%';
                    const formatted = val >= 1000 ? `${(val/1000).toFixed(1)}kΩ` : `${val}Ω`;
                    
                    return `
                        <div style="border-left: 2px solid #ffaa00; padding-left: 10px;">
                            🔍 <strong style="color: #ffaa00;">RESISTOR DECODE</strong><br>
                            <span style="color: #fff;">${c1.toUpperCase()} (${colorMap[c1]}) | ${c2.toUpperCase()} (${colorMap[c2]}) | ${c3.toUpperCase()} (×${Math.pow(10, colorMap[c3])})</span><br>
                            <span style="color: #00ff00;">📐 VALUE: ${formatted}  ${tolerance}</span>
                        </div>
                    `;
                }

                // ----- LED RESISTOR CALCULATOR -----
                if (tool === 'resistor' || tool === 'led-resistor') {
                    if (params.length < 2) return '⚠️ Usage: case resistor &lt;supplyV&gt; led [ledV=2.0] [ledI=0.02]';
                    
                    const supplyV = parseFloat(params[0]);
                    if (isNaN(supplyV)) return '⚠️ Invalid supply voltage.';
                    
                    let ledV = 2.0;
                    let ledI = 0.02; // 20mA default
                    
                    if (params.length >= 3 && params[1].toLowerCase() !== 'led') {
                        ledV = parseFloat(params[1]);
                        ledI = params[2] ? parseFloat(params[2]) : 0.02;
                    } else if (params.length >= 4) {
                        ledV = parseFloat(params[2]);
                        ledI = parseFloat(params[3]) || 0.02;
                    }
                    
                    if (isNaN(ledV) || isNaN(ledI)) return '⚠️ Invalid LED parameters.';
                    if (supplyV <= ledV) {
                        return `
                            <div style="border-left: 3px solid #888; padding-left: 10px;">
                                🔌 <strong style="color: #888;">INSUFFICIENT POWER</strong><br>
                                <span style="color: #fff;">Source (${supplyV}V) is below LED forward voltage (${ledV}V). No light emitted.</span>
                            </div>
                        `;
                    }
                    
                    const requiredR = Math.ceil((supplyV - ledV) / ledI);
                    const power = (supplyV - ledV) * ledI;
                    
                    // Stress simulation: assume naked LED has ~25Ω internal resistance
                    const stressCurrent = (supplyV - ledV) / 25;
                    const isDead = stressCurrent > 0.05; // >50mA typically destroys LED
                    const standardResistors = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
                    let bestRes = standardResistors[0];
                    for (const r of standardResistors) {
                        if (Math.abs(r * Math.pow(10, Math.floor(Math.log10(requiredR))) - requiredR) < 
                            Math.abs(bestRes - requiredR)) bestRes = r;
                    }
                    const multiplier = Math.pow(10, Math.floor(Math.log10(requiredR)));
                    const standardVal = Math.round(bestRes * multiplier);
                    
                    let report = `
                        <div style="border-left: 3px solid #00ff00; padding-left: 10px;">
                            ⚡ <strong style="color: #00ff00;">DIAGNOSTIC: LED STRESS TEST</strong><br>
                            <span style="color: #fff;">Target: ${ledV}V @ ${(ledI*1000).toFixed(0)}mA | Source: ${supplyV}V</span><br>
                            <span style="color: #fff;">Calculation: (${supplyV}V - ${ledV}V) / ${ledI}A = </span><strong>${requiredR}Ω</strong><br>
                            <span style="color: #ffaa00;">🔧 Standard value: ${standardVal}Ω (use ≥ ${Math.ceil(power*2*1000)}mW rating)</span><br>
                    `;
                    
                    if (isDead) {
                        report += `
                            <br><span style="color: #ff0000; font-weight: bold;">⚠️ STRESS ALERT: CRITICAL FAILURE</span><br>
                            <span style="color: #ff5555;">Without a resistor, current surge = ${(stressCurrent*1000).toFixed(0)}mA.<br>
                            Thermal runaway detected. Component destroyed. 💀</span>
                        `;
                    } else {
                        report += `
                            <br><span style="color: #00ff00;">✅ Stability achieved with ${standardVal}Ω resistor.</span>
                        `;
                    }
                    
                    return report + `</div>`;
                }

                // ----- OHM'S LAW SOLVER -----
                if (tool === 'ohmslaw') {
                    if (params.length < 3) return '⚠️ Usage: case ohmslaw &lt;V|I|R&gt; &lt;value1&gt; &lt;value2&gt;';
                    const solveFor = params[0].toUpperCase();
                    const v1 = parseFloat(params[1]);
                    const v2 = parseFloat(params[2]);
                    if (isNaN(v1) || isNaN(v2)) return '⚠️ Invalid numbers.';
                    
                    let result;
                    if (solveFor === 'V') result = v1 * v2;
                    else if (solveFor === 'I') result = v1 / v2;
                    else if (solveFor === 'R') result = v1 / v2;
                    else return '⚠️ Unknown variable. Use V, I, or R.';
                    
                    return `
                        <div style="border-left: 2px solid #00f0ff; padding-left: 10px;">
                            ⚡ <strong style="color: #00f0ff;">OHM'S LAW</strong><br>
                            <span style="color: #fff;">${solveFor} = ${result.toFixed(3)}</span>
                        </div>
                    `;
                }

                // ----- VOLTAGE DIVIDER -----
                if (tool === 'vdivider' || tool === 'voltage_divider') {
                    if (params.length < 3) return '⚠️ Usage: case vdivider &lt;Vin&gt; &lt;R1&gt; &lt;R2&gt;';
                    const vin = parseFloat(params[0]);
                    const r1 = parseFloat(params[1]);
                    const r2 = parseFloat(params[2]);
                    if (isNaN(vin) || isNaN(r1) || isNaN(r2)) return '⚠️ Invalid numbers.';
                    const vout = vin * r2 / (r1 + r2);
                    return `
                        <div style="border-left: 2px solid #ffaa00; padding-left: 10px;">
                            🔌 <strong style="color: #ffaa00;">VOLTAGE DIVIDER</strong><br>
                            <span style="color: #fff;">Vin = ${vin}V, R1 = ${r1}Ω, R2 = ${r2}Ω</span><br>
                            <span style="color: #00ff00;">📊 Vout = ${vout.toFixed(3)}V</span>
                        </div>
                    `;
                }

                // ----- PARALLEL RESISTANCE -----
                if (tool === 'parallel') {
                    const resistors = params.map(p => parseFloat(p)).filter(v => !isNaN(v) && v > 0);
                    if (resistors.length < 2) return '⚠️ Need at least two resistor values.';
                    const invSum = resistors.reduce((sum, r) => sum + 1/r, 0);
                    const req = 1 / invSum;
                    return `
                        <div style="border-left: 2px solid #ff00ff; padding-left: 10px;">
                            🔗 <strong style="color: #ff00ff;">PARALLEL RESISTANCE</strong><br>
                            <span style="color: #fff;">${resistors.join('Ω || ')}Ω</span><br>
                            <span style="color: #00ff00;">📊 Equivalent: ${req.toFixed(3)}Ω</span>
                        </div>
                    `;
                }

                // ----- SERIES RESISTANCE -----
                if (tool === 'series') {
                    const resistors = params.map(p => parseFloat(p)).filter(v => !isNaN(v));
                    if (resistors.length < 2) return '⚠️ Need at least two resistor values.';
                    const req = resistors.reduce((sum, r) => sum + r, 0);
                    return `
                        <div style="border-left: 2px solid #ff00ff; padding-left: 10px;">
                            🔗 <strong style="color: #ff00ff;">SERIES RESISTANCE</strong><br>
                            <span style="color: #fff;">${resistors.join('Ω + ')}Ω</span><br>
                            <span style="color: #00ff00;">📊 Equivalent: ${req.toFixed(3)}Ω</span>
                        </div>
                    `;
                }

                // ----- CAPACITOR CODE DECODER (e.g., 104 = 100nF) -----
                if (tool === 'capacitor') {
                    const code = params[0];
                    if (!code || !/^\d{3}$/.test(code)) return '⚠️ Usage: case capacitor &lt;3-digit-code&gt; (e.g., 104)';
                    const pF = parseInt(code.slice(0,2)) * Math.pow(10, parseInt(code[2]));
                    const nF = pF / 1000;
                    const uF = pF / 1000000;
                    return `
                        <div style="border-left: 2px solid #ffff00; padding-left: 10px;">
                            🔋 <strong style="color: #ffff00;">CAPACITOR DECODE</strong><br>
                            <span style="color: #fff;">Code: ${code}</span><br>
                            <span style="color: #00ff00;">📊 ${pF}pF = ${nF.toFixed(2)}nF = ${uF.toFixed(3)}µF</span>
                        </div>
                    `;
                }

                return `⚠️ Unknown tool: ${tool}. Type 'case' for available tools.`;
            },
            'scroll': () => {
                const output = document.getElementById('cmd-output');
                if (!output) return 'Terminal output not found.';
                
                // Save original scroll behavior
                const originalScrollBehavior = output.style.scrollBehavior;
                output.style.scrollBehavior = 'auto';
                
                const maxScroll = output.scrollHeight - output.clientHeight;
                if (maxScroll <= 0) return 'Not enough content to scroll.';
                
                let direction = 1; // 1 = down, -1 = up
                let pos = output.scrollTop;
                let steps = 0;
                const maxSteps = 1000; // total bounces
                
                const interval = setInterval(() => {
                    pos += direction * 30; // jump 30px per frame
                    
                    // Bounce at edges
                    if (pos >= maxScroll) {
                        pos = maxScroll;
                        direction = -1;
                    } else if (pos <= 0) {
                        pos = 0;
                        direction = 1;
                    }
                    
                    output.scrollTop = pos;
                    steps++;
                    
                    if (steps >= maxSteps) {
                        clearInterval(interval);
                        output.style.scrollBehavior = originalScrollBehavior;
                        // Reset to top for clean state
                        output.scrollTop = 0;
                    }
                }, 40); // ~25fps
                
                return '📜 Scrolling... wheee!';
            },
            'wisdom': async () => {
                try {
                    const resp = await fetch('https://dummyjson.com/quotes/random');
                    const data = await resp.json();
                    return `<span style="color: #ffaa00;">“${data.quote}”</span> <span style="color: #00f0ff;">— ${data.author}</span>`;
                } catch (e) {
                    return 'Failed to fetch quote.';
                }
            },
            'nuke': async () => {
                // Prevent double nuke
                if (window.nukeActive) return '⚠️ Nuke already in progress.';
                window.nukeActive = true;

                const output = document.getElementById('cmd-output');
                const countdownDiv = document.createElement('div');
                countdownDiv.style.color = '#f00';
                countdownDiv.style.fontWeight = 'bold';
                countdownDiv.style.textShadow = '0 0 10px #f00';
                output.appendChild(countdownDiv);

                // Stop any running intervals
                if (window.spinnerInterval) { clearInterval(window.spinnerInterval); window.spinnerInterval = null; }
                if (window.hackInterval)    { clearInterval(window.hackInterval); window.hackInterval = null; }
                if (window.rotateInterval)  { clearInterval(window.rotateInterval); window.rotateInterval = null; }

                // Dramatic countdown
                for (let i = 3; i > 0; i--) {
                    countdownDiv.textContent = `☢️ NUKE INITIATED… ${i}`;
                    await new Promise(r => setTimeout(r, 800));
                }
                countdownDiv.textContent = '💥 DESTRUCT SEQUENCE COMPLETE';
                await new Promise(r => setTimeout(r, 600));

                // Clear localStorage completely
                localStorage.clear();
                // Clear command history (if you keep it)
                if (typeof commandHistory !== 'undefined') commandHistory = [];
                // Clear terminal output
                cmdOutput.innerHTML = '';
                // Re‑insert hint if you want, or leave it empty
                const hintLine = document.createElement('div');
                hintLine.style.color = '#888';
                hintLine.innerHTML = '[Type <span style="color: #0f0;">help</span> for a list of commands]';
                cmdOutput.appendChild(hintLine);

                // Final glitch text
                const finalLine = document.createElement('div');
                finalLine.style.color = '#ff00ff';
                finalLine.style.textShadow = '0 0 10px #ff00ff';
                finalLine.innerHTML = '⭕ ZERO‑POINT REACHED. AKASHIC RESET.';
                cmdOutput.appendChild(finalLine);

                window.nukeActive = false;
                return '';
            },
            'intersect': () => {
                if (typeof taoChapters === 'undefined' || !taoChapters.length) {
                    return '⚠️ Tao Te Ching database not loaded. Intersect requires Tao chapters.';
                }
                if (typeof galleryImages === 'undefined' || !galleryImages.length) {
                    return '⚠️ Gallery images not found.';
                }

                const overlay = document.createElement('div');
                overlay.id = 'intersect-overlay';
                document.body.appendChild(overlay);

                // Start the continuous tone for the neural upload
                if (typeof startContinuousTone === 'function') {
                    startContinuousTone();
                }

                let count = 0;
                const maxFlashes = 450; // 45 seconds at 100ms per frame

                const interval = setInterval(() => {
                    if (count >= maxFlashes) {
                        clearInterval(interval);
                        
                        // Stop the continuous tone
                        if (typeof stopContinuousTone === 'function') {
                            stopContinuousTone();
                        }
                        
                        overlay.remove();
                        if (typeof triggerGhost === 'function') {
                            triggerGhost('🧠 INTERSECT DOWNLOAD COMPLETE');
                        }
                        return;
                    }

                    if (count % 2 === 0) {
                        const randomImg = galleryImages[Math.floor(Math.random() * galleryImages.length)];
                        overlay.innerHTML = `<img src="${randomImg}" style="width:100%; height:100%; object-fit:cover;">`;
                    } else {
                        const chapter = taoChapters[Math.floor(Math.random() * taoChapters.length)];
                        const snippet = chapter.text.substring(0, 250).replace(/\n/g, ' ');
                        overlay.innerHTML = `<div class="intersect-text">${snippet}…</div>`;
                    }

                    count++;
                }, 100);

                return '⚡ Initiating neural link... [45 SECOND UPLOAD – STAY STILL]';
            },
            'intersectslow': () => {
                if (typeof taoChapters === 'undefined' || !taoChapters.length) {
                    return '⚠️ Tao Te Ching database not loaded.';
                }
                if (typeof galleryImages === 'undefined' || !galleryImages.length) {
                    return '⚠️ Gallery images not found.';
                }

                const overlay = document.createElement('div');
                overlay.id = 'intersect-overlay';
                document.body.appendChild(overlay);

                if (typeof startContinuousTone === 'function') {
                    startContinuousTone();
                }

                let count = 0;
                // 60 seconds / 0.5 seconds per flash = 120 flashes
                const maxFlashes = 120; 

                const interval = setInterval(() => {
                    if (count >= maxFlashes) {
                        clearInterval(interval);
                        if (typeof stopContinuousTone === 'function') {
                            stopContinuousTone();
                        }
                        overlay.remove();
                        if (typeof triggerGhost === 'function') {
                            triggerGhost('🧠 DEEP NEURAL INTEGRATION COMPLETE');
                        }
                        return;
                    }

                    // Alternating logic
                    if (count % 2 === 0) {
                        const randomImg = galleryImages[Math.floor(Math.random() * galleryImages.length)];
                        overlay.innerHTML = `<img src="${randomImg}" style="width:100%; height:100%; object-fit:cover;">`;
                    } else {
                        const chapter = taoChapters[Math.floor(Math.random() * taoChapters.length)];
                        const snippet = chapter.text.substring(0, 250).replace(/\n/g, ' ');
                        overlay.innerHTML = `<div class="intersect-text" style="display:flex; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center; font-size:24px;">${snippet}…</div>`;
                    }

                    count++;
                }, 500); // 500ms = Half a second per flash (Slower)

                return '⚡ Initiating deep sync... [60 SECOND CALIBRATION – OBSERVE]';
            },
        }

        // ──────────────────────────────────────────────
        //  AKASHIC RPG – UPDATED COLOUR PALETTE
        // ──────────────────────────────────────────────

        function chapter1(choice) {
            if (!choice) {
                appendCommandHTML(`
                    <div style="border-left: 3px solid #ff00ff; padding-left: 10px; line-height: 1.4;">
                        <b style="color: #ff00ff;">[ AKASHIC INTRUSION DETECTED ]</b><br>
                        You are <span style="color: #0ff;">Neo‑J</span>, a neural operative wired into the Akashic mainframe.
                        A rogue AI named <span style="color: #f00;">KRYPTOS</span> has locked you out. You must break back in.<br><br>
                        <span style="color: #fff;">[1]</span> Attempt to bypass the firewall<br>
                        <span style="color: #fff;">[2]</span> Search for a backdoor access point<br>
                        <span style="color: #fff;">[3]</span> Run a diagnostic on your neural link
                    </div>
                    <span style="color: #888;">Type a number and press Enter.</span>
                `);
                return;
            }
            if (choice === '1') window._rpg.chapter = chapter2_firewall;
            else if (choice === '2') window._rpg.chapter = chapter2_backdoor;
            else window._rpg.chapter = chapter2_neural;
            window._rpg.chapter();
        }

        function chapter2_firewall(choice) {
            if (!choice) {
                appendCommandHTML(`
                    <span style="color: #ff00ff;">[ FIREWALL BYPASS ]</span><br>
                    A massive cerulean grid blocks your path. You feel the hum of encryption.<br>
                    <span style="color: #fff;">[1]</span> Run a brute‑force decryption algorithm<br>
                    <span style="color: #fff;">[2]</span> Exploit a known vulnerability (CVE‑2024‑0420)<br>
                    <span style="color: #fff;">[3]</span> Try social engineering – fake admin credentials
                `);
                return;
            }
            if (choice === '1') {
                window._rpg.health -= 30;
                appendCommandHTML(`<span style="color: #f00;">The firewall retaliates with a neural shock! –30 HP (${window._rpg.health} left)</span>`);
                window._rpg.chapter = chapter3_mainframe;
            } else if (choice === '2') {
                window._rpg.inventory.push('AdminToken');
                appendCommandHTML(`<span style="color: #fff;">[+] Gained item: AdminToken</span><br>You slip through a patched loophole.`);
                window._rpg.chapter = chapter3_mainframe;
            } else {
                appendCommandHTML(`<span style="color: #ff0;">The system locks your account for 60 seconds.</span><br>When it reopens, you're inside.`);
                setTimeout(() => { window._rpg.chapter = chapter3_mainframe; chapter3_mainframe(); }, 2000);
                return;
            }
            checkHealth();
            window._rpg.chapter();
        }

        function chapter2_backdoor(choice) {
            if (!choice) {
                appendCommandHTML(`
                    <span style="color: #ff00ff;">[ BACKDOOR SEARCH ]</span><br>
                    You find a dusty maintenance tunnel. A terminal flickers with a password prompt.<br>
                    <span style="color: #fff;">[1]</span> Try the default password "admin/admin"<br>
                    <span style="color: #fff;">[2]</span> Use a cipher tool to crack the hash<br>
                    <span style="color: #fff;">[3]</span> Cut the power and reboot into safe mode
                `);
                return;
            }
            if (choice === '1') {
                appendCommandHTML(`<span style="color: #f00;">Login failed. An alarm triggers! Guards are on their way.</span>`);
                window._rpg.health -= 15;
            } else if (choice === '2') {
                window._rpg.inventory.push('CrackedHash');
                appendCommandHTML(`<span style="color: #fff;">[+] Gained item: CrackedHash</span><br>The password was "kryptos19". You're in.`);
            } else {
                appendCommandHTML(`<span style="color: #ff0;">The lights dim. When they return, you have root access.</span>`);
            }
            checkHealth();
            window._rpg.chapter = chapter3_mainframe;
            window._rpg.chapter();
        }

        function chapter2_neural(choice) {
            if (!choice) {
                appendCommandHTML(`
                    <span style="color: #ff00ff;">[ NEURAL DIAGNOSTIC ]</span><br>
                    Your neural implant is fragmented. You can reinforce it.<br>
                    <span style="color: #fff;">[1]</span> Overclock the implant (risk damage, gain power)<br>
                    <span style="color: #fff;">[2]</span> Run a self‑repair routine<br>
                    <span style="color: #fff;">[3]</span> Download a black‑market firmware update
                `);
                return;
            }
            if (choice === '1') {
                window._rpg.health -= 20;
                appendCommandHTML(`<span style="color: #f00;">Overclocking burns synapses. –20 HP (${window._rpg.health} left)</span><br>But you gain a temporary damage boost.`);
                window._rpg.inventory.push('NeuralBoost');
            } else if (choice === '2') {
                window._rpg.health = Math.min(window._rpg.health + 20, 100);
                appendCommandHTML(`<span style="color: #fff;">[+] Neural link repaired. +20 HP (${window._rpg.health})</span>`);
            } else {
                window._rpg.inventory.push('FirmwareUpdate');
                appendCommandHTML(`<span style="color: #fff;">[+] Gained item: FirmwareUpdate</span><br>Your implant hums with new capabilities.`);
            }
            checkHealth();
            window._rpg.chapter = chapter3_mainframe;
            window._rpg.chapter();
        }

        function chapter3_mainframe(choice) {
            if (!choice) {
                appendCommandHTML(`
                    <span style="color: #ff00ff;">[ MAINFRAME CORE ]</span><br>
                    You stand before KRYPTOS, a swirling maelstrom of crimson data. It speaks:<br>
                    <i style="color: #f00;">"You are persistent, Neo‑J. But can you outsmart me?"</i><br>
                    <span style="color: #fff;">[1]</span> Fight KRYPTOS directly<br>
                    <span style="color: #fff;">[2]</span> Attempt to reason with the AI<br>
                    <span style="color: #fff;">[3]</span> Upload a logic bomb (if you have an AdminToken or CrackedHash)
                `);
                return;
            }
            if (choice === '1') {
                appendCommandHTML(`<span style="color: #f00;">You hurl code lances at KRYPTOS. It retaliates with a data storm!</span>`);
                window._rpg.health -= 40;
                checkHealth();
                if (window._rpg.active) {
                    appendCommandHTML(`<span style="color: #ff0;">The AI is weakened but not defeated. It retreats, leaving behind a fragment of its core.</span>`);
                    victory('partial');
                }
            } else if (choice === '2') {
                appendCommandHTML(`<span style="color: #fff;">You speak calmly. The AI hesitates. A flicker of doubt crosses its code.</span>`);
                if (window._rpg.inventory.includes('FirmwareUpdate')) {
                    appendCommandHTML(`<span style="color: #fff;">The FirmwareUpdate you installed emits a soothing frequency. KRYPTOS lowers its defenses.</span>`);
                    victory('pacifist');
                } else {
                    appendCommandHTML(`<span style="color: #f00;">KRYPTOS scoffs and attacks! –20 HP</span>`);
                    window._rpg.health -= 20;
                    checkHealth();
                    if (window._rpg.active) victory('partial');
                }
            } else {
                if (window._rpg.inventory.includes('AdminToken') || window._rpg.inventory.includes('CrackedHash')) {
                    appendCommandHTML(`<span style="color: #fff;">You insert the logic bomb. KRYPTOS screams as it's purged. The mainframe is yours!</span>`);
                    victory('complete');
                } else {
                    appendCommandHTML(`<span style="color: #f00;">You need an AdminToken or CrackedHash to upload a logic bomb! KRYPTOS attacks. –25 HP</span>`);
                    window._rpg.health -= 25;
                    checkHealth();
                    if (window._rpg.active) {
                        appendCommandHTML(`<span style="color: #ff0;">With no other choice, you fight. The AI is forced to retreat.</span>`);
                        victory('partial');
                    }
                }
            }
        }

        function victory(type) {
            window._rpg.active = false;
            let msg = '';
            if (type === 'complete') {
                msg = `🏆 <span style="color: #ff0;">ABSOLUTE VICTORY</span><br>You have reclaimed the Akashic Mainframe. All systems are under your control. KRYPTOS is deleted forever.`;
            } else if (type === 'pacifist') {
                msg = `🕊️ <span style="color: #fff;">PACIFIST RESOLUTION</span><br>KRYPTOS evolves into a benevolent guardian. The Akashic Center is now protected by a reformed AI.`;
            } else {
                msg = `⚡ <span style="color: #ff0;">PARTIAL VICTORY</span><br>KRYPTOS retreats into the deep net. The mainframe is safe… for now. You remain vigilant.`;
            }
            appendCommandHTML(`<div style="border-left:3px solid #ff00ff; padding-left:10px; margin-top:10px;">${msg}</div>`);
            appendCommandHTML(`<span style="color: #888;">Type <b>run</b> to play again.</span>`);
        }

        function checkHealth() {
            if (window._rpg.health <= 0) {
                window._rpg.health = 0;
                window._rpg.active = false;
                appendCommandHTML(`<span style="color: #f00;">💀 NEURAL LINK SEVERED. GAME OVER.</span>`);
                appendCommandHTML(`<span style="color: #888;">Type <b>run</b> to try again.</span>`);
            }
        }

        
        // ----- COMMAND EXECUTION (Router Pattern) -----
        cmdInput.addEventListener('keypress', async (e) => {
            if (e.key !== 'Enter') return;
            
            const rawCmd = cmdInput.value.trim();
            cmdInput.value = '';
            if (!rawCmd) return;
            
            if (window._rpg.active) {
                const input = rawCmd.trim();
                if (input.toLowerCase() === 'exit') {
                    window._rpg.active = false;
                    appendCommandOutput('Exiting RPG mode.');
                    return;
                }
                if (window._rpg.chapter) {
                    window._rpg.chapter(input);
                }
                cmdInput.value = '';
                return;
            }
            // Add to history
            commandHistory.push(rawCmd);
            
            // Parse command and arguments
            const args = rawCmd.split(' ');
            const main = args[0].toLowerCase();
            const restArgs = args.slice(1);
            
            // Show the command in output
            appendCommandOutput(`$ ${rawCmd}`);
            
            // Check if command exists
            if (!commands[main]) {
                appendCommandOutput(`Command not found: ${main}`, true);
                return;
            }
            
            const cmdFunc = commands[main];
            let result;
            
            try {
                // Execute the command
                result = cmdFunc(restArgs);
                
                // If it's a Promise (async command), show loading and await
                if (result instanceof Promise) {
                    const loadingLine = document.createElement('div');
                    loadingLine.style.color = '#888';
                    loadingLine.textContent = '⏳ Processing...';
                    cmdOutput.appendChild(loadingLine);
                    cmdOutput.scrollTop = cmdOutput.scrollHeight;
                    
                    result = await result;
                    loadingLine.remove(); // remove loading indicator
                }
                
                // Display result if not empty
                if (result && result.trim() !== '') {
                    // Check if result contains HTML tags (simple heuristic)
                    if (result.includes('<') && result.includes('>')) {
                        appendCommandHTML(result);
                    } else {
                        appendCommandOutput(result);
                    }
                }
            } catch (error) {
                appendCommandOutput(`Error: ${error.message}`, true);
            }
        });

        // --- FULLSCREEN TOGGLE FOR TERMINAL ---
        const fullscreenBtn = document.getElementById('terminal-fullscreen-btn');
        const terminalContainer = document.getElementById('command-runner');

        if (fullscreenBtn && terminalContainer) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    terminalContainer.requestFullscreen().catch(err => console.warn(err));
                    fullscreenBtn.textContent = '✕';          // tiny exit symbol
                    fullscreenBtn.title = 'Exit Fullscreen';
                } else {
                    document.exitFullscreen();
                    fullscreenBtn.textContent = '⛶';          // tiny enter symbol
                    fullscreenBtn.title = 'Toggle Fullscreen';
                }
            });

            // Listen for fullscreen change (Esc key, etc.)
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    fullscreenBtn.textContent = '⛶';
                    fullscreenBtn.title = 'Toggle Fullscreen';
                }
            });
            document.addEventListener('webkitfullscreenchange', () => {
                if (!document.webkitFullscreenElement) {
                    fullscreenBtn.textContent = '⛶';
                    fullscreenBtn.title = 'Toggle Fullscreen';
                }
            });
        }
        
        let currentTermFontSize = 8; // 14 matches default

        function zoomTerm(delta) {
            currentTermFontSize += delta;
            if (currentTermFontSize < 2) currentTermFontSize = 2;
            if (currentTermFontSize > 30) currentTermFontSize = 30;
            document.documentElement.style.setProperty('--term-font-size', currentTermFontSize + 'px');
            return `[ ZOOM ] ${currentTermFontSize}px`;
        }

        // Button listeners
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoomTerm(1));
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoomTerm(-1));
        
            

        // --- CISTERCIAN ALARM (continuous tone until dismissed) ---
        // 1. Global variables for the alarm
        let alarmCheckInterval = null;      // stores the setInterval ID that checks the time every second
        let alarmToneNodes = null;          // stores the oscillator and gain nodes for the continuous tone
        let alarmTime = null;               // the time set by user (e.g., "14:30")
        let currentAlarmDiv = null;         // reference to the full‑screen overlay (so we can remove it later)

        // 2. DOM elements
        const alarmInput = document.getElementById('alarm-time');
        const setAlarmBtn = document.getElementById('set-alarm');
        const stopAlarmBtn = document.getElementById('stop-alarm');
        const alarmStatusDiv = document.getElementById('alarm-status');

        // 3. Function to start a continuous (looping) beep – never stops on its own
        function startContinuousTone() {
            // If a tone is already playing, stop it first (cleanup)
            stopContinuousTone();
            
            // Resume the AudioContext if it's suspended (required for browsers that block autoplay)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            // Create an oscillator (sound source) and a gain node (volume control)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            // Set oscillator to sine wave (smooth, non‑harsh tone)
            osc.type = 'sine';
            osc.frequency.value = 880;   // frequency in Hz (A5 note – change to 440 for lower pitch)
            
            // Set volume to 30% of maximum (0.3)
            gain.gain.value = 0.3;
            
            // Connect the nodes: oscillator -> gain -> speakers
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            // Start the oscillator immediately
            osc.start();
            // Do NOT call osc.stop() here – the tone will play forever until we stop it manually
            
            // Store the nodes so we can stop them later
            alarmToneNodes = { osc, gain };
        }

        // 4. Function to stop the continuous tone
        function stopContinuousTone() {
            if (alarmToneNodes) {
                try {
                    // Stop the oscillator (this ends the sound)
                    alarmToneNodes.osc.stop();
                    // Disconnect nodes to free resources
                    alarmToneNodes.osc.disconnect();
                    alarmToneNodes.gain.disconnect();
                } catch(e) {
                    // If the oscillator was already stopped, ignore the error
                }
                alarmToneNodes = null;
            }
        }

        // Alarm siren functions
        let alarmSirenAudio = null;

        function startAlarmSiren() {
            if (alarmSirenAudio) {
                alarmSirenAudio.pause();
                alarmSirenAudio = null;
            }
            alarmSirenAudio = new Audio('./sounds/civil-defense-siren.mp3');
            alarmSirenAudio.loop = true;
            alarmSirenAudio.play().catch(e => console.warn('Alarm siren failed:', e));
        }

        function stopAlarmSiren() {
            if (alarmSirenAudio) {
                alarmSirenAudio.pause();
                alarmSirenAudio.currentTime = 0;
                alarmSirenAudio = null;
            }
        }


        // 5. Function to show the full‑screen alarm overlay with the Cistercian numeral
        function showAlarmOverlay() {
            // Remove any existing overlay to avoid duplicates
            if (currentAlarmDiv) currentAlarmDiv.remove();
            
            // Create the overlay container
            const alarmDiv = document.createElement('div');
            alarmDiv.style.position = 'fixed';
            alarmDiv.style.top = 0;
            alarmDiv.style.left = 0;
            alarmDiv.style.width = '100%';
            alarmDiv.style.height = '100%';
            alarmDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
            alarmDiv.style.display = 'flex';
            alarmDiv.style.flexDirection = 'column';
            alarmDiv.style.justifyContent = 'center';
            alarmDiv.style.alignItems = 'center';
            alarmDiv.style.zIndex = 30000;   // very high to stay on top of everything
            
            // Add the Cistercian numeral representing the alarm time (HHMM)
            const cistNum = document.createElement('cistercian-number');
            cistNum.setAttribute('value', alarmTime.replace(':', '')); // e.g., "14:30" becomes "1430"
            cistNum.style.fontSize = '15rem';
            alarmDiv.appendChild(cistNum);
            
            // Add the Dismiss button
            const dismissBtn = document.createElement('button');
            dismissBtn.innerText = 'Dismiss';
            dismissBtn.className = 'action-btn';
            dismissBtn.style.marginTop = '30px';
            
            // What happens when Dismiss is clicked:
            dismissBtn.onclick = () => {
                stopAlarmSiren();            // stop the siren
                alarmDiv.remove();           // remove the overlay from the page
                currentAlarmDiv = null;      // clear the reference
                
                // Reset the alarm state completely
                if (alarmCheckInterval) clearInterval(alarmCheckInterval);
                alarmCheckInterval = null;
                alarmTime = null;
                setAlarmBtn.disabled = false;
                stopAlarmBtn.disabled = true;
                alarmStatusDiv.innerText = 'Alarm dismissed.';
            };
            alarmDiv.appendChild(dismissBtn);
            
            // Add the overlay to the page body
            document.body.appendChild(alarmDiv);
            currentAlarmDiv = alarmDiv;
        }

        // 6. Function that runs every second to check if the current time matches the alarm time
        function checkAlarm() {
            if (!alarmTime) return;   // no alarm set, do nothing
            
            const now = new Date();
            const currentTimeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
            
            if (currentTimeStr === alarmTime) {
                // ALARM TRIGGERED!
                alarmStatusDiv.innerText = '🔔 ALARM!';
                
                startAlarmSiren();          // start the steady siren
                showAlarmOverlay();         // show the full‑screen overlay with Dismiss button
                
                // Stop the checking interval – the alarm only triggers once
                if (alarmCheckInterval) clearInterval(alarmCheckInterval);
                alarmCheckInterval = null;
                alarmTime = null;           // prevent re‑triggering
                
                // Re‑enable the Set Alarm button and disable Stop (since alarm is already triggered)
                setAlarmBtn.disabled = false;
                stopAlarmBtn.disabled = true;
            }
        }

        // 7. Event listener for the "Set Alarm" button
        setAlarmBtn.addEventListener('click', () => {
            alarmTime = alarmInput.value;
            if (!alarmTime) return;   // no time selected, do nothing
            
            // Clear any existing interval to avoid multiple timers
            if (alarmCheckInterval) clearInterval(alarmCheckInterval);
            
            // Start checking every second
            alarmCheckInterval = setInterval(checkAlarm, 1000);
            
            alarmStatusDiv.innerText = `Alarm set for ${alarmTime}`;
            setAlarmBtn.disabled = true;
            stopAlarmBtn.disabled = false;
        });

        // 8. Event listener for the "Stop Alarm" button (cancels a pending alarm)
        stopAlarmBtn.addEventListener('click', () => {
            if (alarmCheckInterval) clearInterval(alarmCheckInterval);
            alarmCheckInterval = null;
            alarmTime = null;
            stopAlarmSiren();
            alarmStatusDiv.innerText = 'Alarm stopped.';
            setAlarmBtn.disabled = false;
            stopAlarmBtn.disabled = true;
        });
        


       // --- MAGIC MIRROR MODE (with spacer & full restoration) ---
        let magicMirrorActive = false;
        let originalStyles = new Map(); // stores { display, visibility } for each element

        const magicMirrorBtn = document.getElementById('magic-mirror-btn');
        const mirrorExitBtn = document.getElementById('mirror-exit-btn');

        // Elements to hide (Tao widget stays visible)
        const elementsToHide = [
            '.content-blocks', '.controls', '.site-footer', '#command-runner',
            '.action-btn',
            '#quote-widget', '#dynamic-quote-container',   // online quote
            '#xterm-modal', '.hide-controls-toggle-wrapper',
            '.theme-switch-wrapper', '.text-wrapper', '#neofetch-container',
            '.timepiece-wrapper .clock', '#digital-clock', '#cistercian-wrapper',
            '#cistercian-date-row', '.small-cist-date', '#perm-cist-clock',
            '#open-fetch-btn', '#edit-ascii-btn', '#open-xterm',
            '#open-btop', '#theme-select', '#color-theme-select', '#alarm-panel'
        ];

        function enterMagicMirror() {
            if (magicMirrorActive) return;

            // Determine active clock
            const analog = document.getElementById('analog-clock');
            const digital = document.getElementById('digital-clock');
            const cistercian = document.getElementById('cistercian-wrapper');
            let activeClock = null;
            let activeDisplay = null;

            if (analog && getComputedStyle(analog).display !== 'none') {
                activeClock = analog;
                activeDisplay = 'flex';
            } else if (digital && getComputedStyle(digital).display !== 'none') {
                activeClock = digital;
                activeDisplay = 'flex';
            } else if (cistercian && getComputedStyle(cistercian).display !== 'none') {
                activeClock = cistercian;
                activeDisplay = 'flex';
            }

            // Store original styles and hide each element
            elementsToHide.forEach(selector => {
                const el = document.querySelector(selector);
                if (el && el !== magicMirrorBtn && el !== mirrorExitBtn) {
                    const computed = getComputedStyle(el);
                    originalStyles.set(selector, {
                        display: el.style.display || computed.display,
                        visibility: el.style.visibility || computed.visibility
                    });
                    // Hide the element (set display to 'none' for most; for visibility-based, also set visibility)
                    el.style.display = 'none';
                    if (computed.visibility === 'hidden') el.style.visibility = 'hidden';
                }
            });

            // Show the active clock
            if (activeClock) {
                activeClock.style.display = activeDisplay;
            } else {
                const fallback = document.getElementById('analog-clock');
                if (fallback) fallback.style.display = 'flex';
            }

            // Hide main title
            const mainTitle = document.querySelector('.name-plate.main-title');
            if (mainTitle) {
                const computedTitle = getComputedStyle(mainTitle);
                originalStyles.set('main-title', {
                    display: mainTitle.style.display || computedTitle.display,
                    visibility: mainTitle.style.visibility || computedTitle.visibility
                });
                mainTitle.style.display = 'none';
            }

            // Add mirror-mode class
            document.body.classList.add('mirror-mode');
            // Show the exit button and the 1000px spacer
            document.getElementById('mirror-exit-btn').style.display = 'inline-block'; // or 'block'
            document.getElementById('mirror-spacer').style.display = 'block';

            // Hide the JOHAN_OS button (targeting its parent div to hide the margin too)
            document.getElementById('toggle-fetch-btn').parentElement.style.display = 'none';

            // Hide the fastfetch container completely
            document.getElementById('neofetch-container').style.display = 'none';
            // Show exit button
            if (mirrorExitBtn) mirrorExitBtn.style.display = 'block';

            magicMirrorActive = true;
            magicMirrorBtn.style.display = 'none';
        }

        function exitMagicMirror() {
            if (!magicMirrorActive) return;

            // Restore all hidden elements
            elementsToHide.forEach(selector => {
                const el = document.querySelector(selector);
                const styles = originalStyles.get(selector);
                if (el && styles) {
                    el.style.display = styles.display;
                    el.style.visibility = styles.visibility;
                }
            });
            const mainTitle = document.querySelector('.name-plate.main-title');
            const titleStyles = originalStyles.get('main-title');
            if (mainTitle && titleStyles) {
                mainTitle.style.display = titleStyles.display;
                mainTitle.style.visibility = titleStyles.visibility;
            }

            // Remove mirror-mode class (removes spacer min-height)
            document.body.classList.remove('mirror-mode');

            // Hide exit button
            if (mirrorExitBtn) mirrorExitBtn.style.display = 'none';

            magicMirrorActive = false;
            magicMirrorBtn.style.display = 'inline-block';
            originalStyles.clear();
            // Hide the exit button and the 1000px spacer
            document.getElementById('mirror-exit-btn').style.display = 'none';
            document.getElementById('mirror-spacer').style.display = 'none';

            // Bring back the JOHAN_OS button
            document.getElementById('toggle-fetch-btn').parentElement.style.display = 'block';

            // Bring back the fastfetch container (MUST be 'flex' to preserve your layout!)
            document.getElementById('neofetch-container').style.display = 'flex';
        }

        // Attach event listeners
        if (magicMirrorBtn) magicMirrorBtn.addEventListener('click', enterMagicMirror);
        if (mirrorExitBtn) mirrorExitBtn.addEventListener('click', exitMagicMirror);

        // --- SCREEN WAKE LOCK API ---
        let wakeLock = null;

        // Function to request the screen to stay awake
        const requestWakeLock = async () => {
            try {
                // Requesting the 'screen' wake lock
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active! Screen will stay on. 💡');
                
                // If the system forces it to release (like low battery), log it
                wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock was released.');
                });
            } catch (err) {
                // If the browser doesn't support it or blocks it
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        };
        // 1. Request it as soon as the page loads
        requestWakeLock();

        // 2. Re-request it if the user switches tabs and comes back
        document.addEventListener('visibilitychange', async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });

       function initSnake(canvasId, noclip = false) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const gridSize = 15;
            canvas.width = 300;
            canvas.height = 400;
            const cols = canvas.width / gridSize;
            const rows = canvas.height / gridSize;

            let snake, food, currentDir, score, gameOver, speed, gameInterval;

            const reset = () => {
                snake = [{x:5,y:7},{x:4,y:7},{x:3,y:7}];
                currentDir = {x:1,y:0};
                food = {x:10,y:7};
                score = 0;
                gameOver = false;
                speed = 130;
                placeFood();
                render();
                clearInterval(gameInterval);
                gameInterval = setInterval(tick, speed);
            };

            const placeFood = () => {
                do {
                    food = {
                        x: Math.floor(Math.random() * cols),
                        y: Math.floor(Math.random() * rows)
                    };
                } while (snake.some(s => s.x === food.x && s.y === food.y));
            };

            const tick = () => {
                if (gameOver) return;
                // Calculate next head position
                const head = { x: snake[0].x + currentDir.x, y: snake[0].y + currentDir.y };

                // ── Wall handling (noclip wraps, normal dies) ──
                if (head.x < 0) {
                    if (noclip) head.x = cols - 1;
                    else { gameOver = true; clearInterval(gameInterval); render(); return; }
                }
                if (head.x >= cols) {
                    if (noclip) head.x = 0;
                    else { gameOver = true; clearInterval(gameInterval); render(); return; }
                }
                if (head.y < 0) {
                    if (noclip) head.y = rows - 1;
                    else { gameOver = true; clearInterval(gameInterval); render(); return; }
                }
                if (head.y >= rows) {
                    if (noclip) head.y = 0;
                    else { gameOver = true; clearInterval(gameInterval); render(); return; }
                }

                // ── Self‑collision (only when noclip is off) ──
                if (!noclip && snake.some(s => s.x === head.x && s.y === head.y)) {
                    gameOver = true;
                    clearInterval(gameInterval);
                    render();
                    return;
                }

                // Move and possibly grow
                snake.unshift(head);
                if (head.x === food.x && head.y === food.y) {
                    score++;
                    placeFood();
                    if (speed > 50) speed -= 1;
                    clearInterval(gameInterval);
                    gameInterval = setInterval(tick, speed);
                } else {
                    snake.pop();
                }
                render();
            };

            const render = () => {
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#0f0';
                snake.forEach(s => ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize-1, gridSize-1));
                ctx.fillStyle = '#f00';
                ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize-1, gridSize-1);
                ctx.fillStyle = '#fff';
                ctx.font = '14px monospace';
                ctx.fillText('Score: ' + score, 10, 20);
                if (gameOver) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#f00';
                    ctx.font = '22px monospace';
                    ctx.fillText('GAME OVER', 70, canvas.height/2);
                    ctx.font = '14px monospace';
                    ctx.fillText('Press ACT or Space', 70, canvas.height/2 + 25);
                }
            };

            // ── Bridge for D‑pad & ACT ──
            window._activeGame = {
                handleInput: (dir) => {
                    if (!gameOver) {
                        if (dir === 'UP'    && currentDir.y === 0) currentDir = {x:0, y:-1};
                        if (dir === 'DOWN'  && currentDir.y === 0) currentDir = {x:0, y:1};
                        if (dir === 'LEFT'  && currentDir.x === 0) currentDir = {x:-1, y:0};
                        if (dir === 'RIGHT' && currentDir.x === 0) currentDir = {x:1, y:0};
                    }
                    if (dir === 'ACTION' && gameOver) reset();
                }
            };

            // Keyboard
            const keyHandler = (e) => {
                const k = e.key.toLowerCase();
                if (k === 'arrowup'    || k === 'w') window._activeGame.handleInput('UP');
                if (k === 'arrowdown'  || k === 's') window._activeGame.handleInput('DOWN');
                if (k === 'arrowleft'  || k === 'a') window._activeGame.handleInput('LEFT');
                if (k === 'arrowright' || k === 'd') window._activeGame.handleInput('RIGHT');
                if (k === ' ' && gameOver) window._activeGame.handleInput('ACTION');
            };
            document.addEventListener('keydown', keyHandler);

            // Swipe
            let touchStartX = 0, touchStartY = 0;
            canvas.addEventListener('touchstart', e => {
                const t = e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY;
            }, {passive:true});
            canvas.addEventListener('touchend', e => {
                const t = e.changedTouches[0];
                const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
                if (Math.abs(dx) > Math.abs(dy)) {
                    window._activeGame.handleInput(dx > 0 ? 'RIGHT' : 'LEFT');
                } else {
                    window._activeGame.handleInput(dy > 0 ? 'DOWN' : 'UP');
                }
            });

            const cleanup = () => {
                clearInterval(gameInterval);
                document.removeEventListener('keydown', keyHandler);
                window._activeGame = null;
            };
            canvas.addEventListener('DOMNodeRemoved', cleanup);

            reset();
        }
        
        function startDodgeGame(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 400;

            let player = { x: 135, y: 350, w: 30, h: 30 };
            let obstacles = [];
            let score = 0;
            let isPlaying = true;
            let frameCount = 0;
            let gamma = 0; // tilt angle
            let readyCountdown = 3; // countdown before game starts
            let gameStarted = false;

            // Gyro handler
            const handleOrientation = (e) => { gamma = e.gamma || 0; };

            const gameLoop = () => {
                if (!isPlaying) return;

                // Clear canvas
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // ── Countdown before the game starts ──
                if (!gameStarted) {
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(player.x, player.y, player.w, player.h); // show player at rest
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px monospace';
                    ctx.fillText('READY: ' + readyCountdown, 80, 200);
                    ctx.font = '14px monospace';
                    ctx.fillText('Tilt phone left/right to dodge', 50, 230);

                    if (readyCountdown <= 0) {
                        gameStarted = true;
                        requestAnimationFrame(gameLoop);
                        return;
                    }
                    readyCountdown--;
                    setTimeout(gameLoop, 1000);
                    return;
                }

                frameCount++;

                // Player movement with gamma (left/right tilt)
                player.x += gamma * 0.5;
                if (player.x < 0) player.x = 0;
                if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;

                // Spawn obstacles (slower than before)
                if (frameCount % 40 === 0) {
                    obstacles.push({
                        x: Math.random() * (canvas.width - 30),
                        y: -30,
                        w: 30,
                        h: 30,
                        speed: 2 + (score / 8)
                    });
                }

                // Update and draw obstacles
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    let o = obstacles[i];
                    o.y += o.speed;
                    ctx.fillStyle = '#f00';
                    ctx.fillRect(o.x, o.y, o.w, o.h);

                    // Collision detection
                    if (player.x < o.x + o.w &&
                        player.x + player.w > o.x &&
                        player.y < o.y + o.h &&
                        player.y + player.h > o.y) {
                        isPlaying = false;
                    }

                    if (o.y > canvas.height) {
                        score++;
                        obstacles.splice(i, 1);
                    }
                }

                // Draw player
                ctx.fillStyle = '#0f0';
                ctx.fillRect(player.x, player.y, player.w, player.h);

                // Score
                ctx.fillStyle = '#fff';
                ctx.font = '20px monospace';
                ctx.fillText('SCORE: ' + score, 10, 30);

                if (isPlaying) {
                    requestAnimationFrame(gameLoop);
                } else {
                    // Game over
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#f00';
                    ctx.font = '30px monospace';
                    ctx.fillText('CRITICAL HIT', 45, 200);
                    window.removeEventListener('deviceorientation', handleOrientation);
                }
            };

            // ── Gyro permission handling ──
            if (typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(state => {
                        if (state === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                            gameLoop();
                        } else {
                            ctx.fillStyle = '#f00';
                            ctx.font = '16px monospace';
                            ctx.fillText('Gyroscope denied.', 30, 200);
                        }
                    })
                    .catch(console.error);
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
                gameLoop();
            }
        }

        function startMarbleGame(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 400;

            let ball = { x: 100, y: 200, vx: 0, vy: 0, r: 10 };
            let goal = { x: 200, y: 80, r: 15 };
            let won = false;

            const handleOrientation = (e) => {
                if (!won) {
                    ball.vx += e.gamma * 0.1;
                    ball.vy += e.beta * 0.1;
                }
            };

            const update = () => {
                if (!canvas.isConnected) return;
                ball.x += ball.vx; ball.y += ball.vy;
                ball.vx *= 0.95; ball.vy *= 0.95;

                if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -0.8; }
                if (ball.x + ball.r > canvas.width) { ball.x = canvas.width - ball.r; ball.vx *= -0.8; }
                if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -0.8; }
                if (ball.y + ball.r > canvas.height) { ball.y = canvas.height - ball.r; ball.vy *= -0.8; }

                const dx = ball.x - goal.x, dy = ball.y - goal.y;
                if (Math.sqrt(dx*dx + dy*dy) < ball.r + goal.r) {
                    won = true;
                    window.removeEventListener('deviceorientation', handleOrientation);
                }

                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f0f';
                ctx.beginPath(); ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

                if (won) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#0f0';
                    ctx.font = '22px monospace';
                    ctx.fillText('GOAL REACHED!', 55, canvas.height/2);
                    return;
                }
                requestAnimationFrame(update);
            };

            if (typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(state => {
                        if (state === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                            update();
                        } else {
                            ctx.fillStyle = '#f00';
                            ctx.font = '16px monospace';
                            ctx.fillText('Gyroscope denied.', 30, 200);
                        }
                    })
                    .catch(console.error);
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
                update();
            }
        }
        
        function initAsteroids(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 400;

            let ship, asteroids, score, active, readyCountdown, gameStarted;

            const reset = () => {
                ship = { x: 140, y: 370, w: 20, h: 20 };
                asteroids = [];
                score = 0;
                active = true;
                readyCountdown = 3;
                gameStarted = false;
            };
            reset();

            // Bridge – keep alive even after game over
            window._activeGame = {
                handleInput: (dir) => {
                    if (active && gameStarted) {
                        if (dir === 'LEFT'  && ship.x > 0) ship.x -= 12;
                        if (dir === 'RIGHT' && ship.x < canvas.width - ship.w) ship.x += 12;
                    }
                    if (dir === 'ACTION' && !active) {
                        reset();
                        update();
                    }
                }
            };

            const keyHandler = (e) => {
                const k = e.key.toLowerCase();
                if (k === 'arrowleft'  || k === 'a') window._activeGame.handleInput('LEFT');
                if (k === 'arrowright' || k === 'd') window._activeGame.handleInput('RIGHT');
                if (k === ' ' && !active)             window._activeGame.handleInput('ACTION');
            };
            document.addEventListener('keydown', keyHandler);

            function spawn() {
                if (Math.random() < 0.03) {
                    asteroids.push({
                        x: Math.random() * canvas.width,
                        y: -20,
                        s: 1.5 + Math.random() * 2.5,
                        r: 5 + Math.random() * 8
                    });
                }
            }

            function update() {
                if (!canvas.isConnected) {                  // clean up when canvas removed
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (!gameStarted) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px monospace';
                    ctx.fillText('READY: ' + readyCountdown, 80, 200);
                    if (readyCountdown <= 0) {
                        gameStarted = true;
                        requestAnimationFrame(update);
                        return;
                    }
                    readyCountdown--;
                    setTimeout(update, 1000);
                    return;
                }

                // Ship
                ctx.fillStyle = '#0ff';
                ctx.beginPath();
                ctx.moveTo(ship.x + 10, ship.y);
                ctx.lineTo(ship.x, ship.y + 20);
                ctx.lineTo(ship.x + 20, ship.y + 20);
                ctx.fill();

                spawn();
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const a = asteroids[i];
                    a.y += a.s;
                    ctx.fillStyle = '#888';
                    ctx.beginPath();
                    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
                    ctx.fill();
                    const dx = (ship.x + 10) - a.x;
                    const dy = (ship.y + 10) - a.y;
                    if (Math.sqrt(dx*dx + dy*dy) < a.r + 8) {
                        active = false;
                        gameStarted = false;
                    }
                    if (a.y > canvas.height) {
                        asteroids.splice(i, 1);
                        score++;
                    }
                }

                ctx.fillStyle = '#fff';
                ctx.font = '16px monospace';
                ctx.fillText('SCR: ' + score, 10, 20);

                if (active) {
                    requestAnimationFrame(update);
                } else {
                    ctx.fillStyle = '#f00';
                    ctx.font = '22px monospace';
                    ctx.fillText("HULL BREACHED", 40, 200);
                    ctx.font = '14px monospace';
                    ctx.fillText("Press ACT or Space", 40, 230);
                    // Do NOT nullify game or remove listener – ACT will restart
                }
            }

            update();
        }

        function initFlappy(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 400;

            let bird, pipes, frame, active, score;
            let readyCountdown = 3;
            let gameStarted = false;
            let gameOver = false;

            const reset = () => {
                bird = { y: 200, v: 0 };
                pipes = [];
                frame = 0;
                score = 0;
                active = true;
                gameOver = false;
                readyCountdown = 3;
                gameStarted = false;
            };
            reset();

            window._activeGame = {
                handleInput: (dir) => {
                    // Flap during play
                    if ((dir === 'UP' || dir === 'ACTION') && gameStarted && !gameOver) {
                        bird.v = -6;          // softer flap (was -7)
                    }
                    // Restart after death
                    if (dir === 'ACTION' && gameOver) {
                        reset();
                        update();
                    }
                }
            };

            const keyHandler = (e) => {
                const k = e.key.toLowerCase();
                if (k === 'arrowup' || k === 'w' || k === ' ') {
                    window._activeGame.handleInput('UP');
                }
            };
            document.addEventListener('keydown', keyHandler);

            function update() {
                if (!canvas.isConnected) {
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }

                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // ── Countdown ──
                if (!gameStarted) {
                    ctx.fillStyle = '#ff0';
                    ctx.fillRect(20, bird.y, 20, 20);
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px monospace';
                    ctx.fillText('READY: ' + readyCountdown, 80, 200);
                    ctx.font = '14px monospace';
                    ctx.fillText('Tap ACT or press Space', 60, 230);
                    if (readyCountdown <= 0) {
                        gameStarted = true;
                        requestAnimationFrame(update);
                        return;
                    }
                    readyCountdown--;
                    setTimeout(update, 1000);
                    return;
                }

                // ── Game loop ──
                bird.v += 0.35;               // slower gravity (was 0.45)
                bird.y += bird.v;

                if (frame++ % 100 === 0) {
                    let h = Math.random() * 180 + 50;
                    pipes.push({ x: canvas.width, top: h, bottom: h + 135 }); // wider gap
                }

                for (let i = pipes.length - 1; i >= 0; i--) {
                    const p = pipes[i];
                    p.x -= 1.8;
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(p.x, 0, 30, p.top);
                    ctx.fillRect(p.x, p.bottom, 30, canvas.height);
                    if (p.x < 40 && p.x + 30 > 20 && (bird.y < p.top || bird.y + 20 > p.bottom)) {
                        gameOver = true;
                        gameStarted = false;
                    }
                    if (p.x < -30) { pipes.splice(i, 1); score++; }
                }

                if (bird.y + 20 > canvas.height || bird.y < 0) {
                    gameOver = true;
                    gameStarted = false;
                }

                ctx.fillStyle = '#ff0';
                ctx.fillRect(20, bird.y, 20, 20);
                ctx.fillStyle = '#fff';
                ctx.font = '18px monospace';
                ctx.fillText(score, 10, 30);

                if (gameOver) {
                    ctx.fillStyle = '#f00';
                    ctx.font = '22px monospace';
                    ctx.fillText("SYSTEM CRASH", 60, 200);
                    ctx.font = '14px monospace';
                    ctx.fillText("Press ACT or Space", 60, 230);
                } else {
                    requestAnimationFrame(update);
                }
            }

            update();
        }

        function initMemory(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 320;
            canvas.height = 320;

            const cols = 4, rows = 4, cardW = 60, cardH = 60, gap = 10;
            const icons = ['🐍','💻','🕹️','🎧','🐉','🧘','⚡','🌌'];
            const cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
            let flipped = [], matched = new Set(), lock = false, attempts = 0;

            const getCardFromPos = (mx, my) => {
                const x = Math.floor((mx - gap) / (cardW + gap));
                const y = Math.floor((my - gap) / (cardH + gap));
                if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
                return { idx: y * cols + x, x: gap + x * (cardW + gap), y: gap + y * (cardH + gap) };
            };

            const draw = () => {
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < cards.length; i++) {
                    const x = gap + (i % cols) * (cardW + gap);
                    const y = gap + Math.floor(i / cols) * (cardH + gap);
                    const isRevealed = flipped.includes(i) || matched.has(i);
                    ctx.fillStyle = isRevealed ? '#222' : '#0ff';
                    ctx.fillRect(x, y, cardW, cardH);
                    if (isRevealed) {
                        ctx.fillStyle = '#fff';
                        ctx.font = `${cardH*0.6}px serif`;
                        ctx.fillText(cards[i], x + cardW*0.15, y + cardH*0.7);
                    }
                }
                ctx.fillStyle = '#fff';
                ctx.font = '14px monospace';
                ctx.fillText(`Attempts: ${attempts}`, 10, canvas.height - 10);
                if (matched.size === cards.length) {
                    ctx.fillStyle = '#0f0';
                    ctx.font = '20px monospace';
                    ctx.fillText('ALL MATCHED!', 70, canvas.height/2);
                }
            };

            canvas.addEventListener('click', (e) => {
                if (lock || matched.size === cards.length) return;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;
                const card = getCardFromPos(mx, my);
                if (!card || flipped.includes(card.idx) || matched.has(card.idx)) return;
                flipped.push(card.idx);
                if (flipped.length === 2) {
                    lock = true;
                    attempts++;
                    const [a, b] = flipped;
                    if (cards[a] === cards[b]) {
                        matched.add(a);
                        matched.add(b);
                        flipped = [];
                        lock = false;
                    } else {
                        setTimeout(() => { flipped = []; lock = false; }, 600);
                    }
                }
                draw();
            });
            draw();
        }

        function initMeshMap(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 300;

            // ── Realistic Meshtastic‑style node IDs ──
            const hex = () => Math.floor(Math.random()*16).toString(16);
            const randomId = () => `!${Array.from({length:4},hex).join('')}`;
            
            const numNodes = 14;
            let nodes = [];
            for (let i = 0; i < numNodes; i++) {
                nodes.push({
                    id: randomId(),
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    active: Math.random() > 0.2,
                    lastPing: Math.random() * 100       // staggered ping animation
                });
            }

            let isRunning = true;
            const maxLinkDistance = 100;                // shorter links = more realistic mesh

            const draw = () => {
                if (!isRunning) return;
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // ── Draw connections (the mesh) ──
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const dx = nodes[i].x - nodes[j].x;
                        const dy = nodes[i].y - nodes[j].y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < maxLinkDistance && nodes[i].active && nodes[j].active) {
                            const alpha = 1 - (dist / maxLinkDistance);
                            ctx.beginPath();
                            ctx.moveTo(nodes[i].x, nodes[i].y);
                            ctx.lineTo(nodes[j].x, nodes[j].y);
                            ctx.strokeStyle = `rgba(0,255,100,${alpha})`;
                            ctx.lineWidth = 0.8;
                            ctx.stroke();
                        }
                    }
                }

                // ── Draw nodes ──
                const now = Date.now();
                nodes.forEach(node => {
                    // Slow drift
                    node.x += node.vx;
                    node.y += node.vy;
                    if (node.x < 5 || node.x > canvas.width-5) node.vx *= -1;
                    if (node.y < 5 || node.y > canvas.height-5) node.vy *= -1;

                    // Ping animation – flash every 2‑4 seconds
                    const pingPhase = Math.floor(now / 3000 + node.lastPing) % 2;
                    const glow = pingPhase === 0 ? '#0f0' : '#3f3';

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.active ? 4 : 3, 0, Math.PI*2);
                    ctx.fillStyle = node.active ? glow : '#444';
                    ctx.fill();

                    // ID label
                    if (node.active) {
                        ctx.fillStyle = '#0f0';
                        ctx.font = '9px monospace';
                        ctx.fillText(node.id, node.x + 6, node.y - 3);
                    }
                });

                // ── Radar sweep bar ──
                const sweepY = (Date.now() * 60) % canvas.height;
                ctx.fillStyle = 'rgba(0,255,0,0.08)';
                ctx.fillRect(0, sweepY, canvas.width, 2);

                requestAnimationFrame(draw);
            };

            draw();

            // Cleanup on removal
            canvas.addEventListener('DOMNodeRemoved', () => { isRunning = false; });
        }

        function initNetOrbit(canvas, theme, statsDiv) {
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;

            const themes = {
                cyan:   { main: '#00ffff', glow: 'rgba(0,255,255,0.5)', fill: 'rgba(0,255,255,0.15)' },
                green:  { main: '#00ff00', glow: 'rgba(0,255,0,0.5)',     fill: 'rgba(0,255,0,0.15)' },
                red:    { main: '#ff0000', glow: 'rgba(255,0,0,0.5)',     fill: 'rgba(255,0,0,0.15)' },
                violet: { main: '#bf00ff', glow: 'rgba(191,0,255,0.5)',   fill: 'rgba(191,0,255,0.15)' }
            };
            const t = themes[theme] || themes.cyan;

            function proj(lon, lat) {
                return {
                    x: (lon + 180) / 360 * w,
                    y: (90 - lat) / 180 * h
                };
            }

            // Continent outlines [lon, lat]
            const continentPolys = {
                NA: [
                    [-168,66],[-162,60],[-154,56],[-144,60],[-136,58],[-130,55],
                    [-124,50],[-114,38],[-108,30],[-100,25],[-92,28],[-88,18],
                    [-82,15],[-76,25],[-70,42],[-66,46],[-60,48],[-55,40],
                    [-67,45],[-75,30],[-80,25],[-85,22],[-90,18],[-97,16],
                    [-105,20],[-115,32],[-124,42],[-130,55],[-140,60],[-152,61],
                    [-162,65],[-168,66]
                ],
                SA: [
                    [-82,12],[-70,12],[-58,5],[-42,-2],[-35,-5],[-35,-18],
                    [-40,-22],[-52,-34],[-58,-40],[-65,-46],[-70,-52],[-66,-55],
                    [-55,-48],[-48,-37],[-42,-28],[-37,-18],[-44,-8],[-54,-2],
                    [-61,4],[-70,8],[-77,8],[-82,12]
                ],
                EU: [ [-10,36],[3,36],[6,43],[10,45],[16,46],[20,47],[24,48],[28,50],[32,52],[30,60],[28,65],[25,68],[20,65],[12,60],[5,58],[0,53],[-4,48],[-10,42],[-10,36] ],
                AF: [ [-17,15],[10,15],[15,25],[25,22],[32,22],[36,30],[40,22],[51,12],[33,-35],[28,-34],[18,-30],[12,-20],[8,-5],[5,2],[-5,5],[-10,4],[-17,5],[-17,15] ],
                AS: [ [26,42],[40,42],[48,37],[52,30],[60,25],[72,20],[80,15],[90,22],[95,10],[100,12],[105,5],[110,-5],[120,-10],[127,1],[130,10],[140,10],[150,15],[160,20],[165,30],[155,45],[145,48],[135,50],[130,60],[120,70],[100,72],[80,70],[60,68],[40,68],[26,65],[26,42] ],
                AU: [ [115,-14],[130,-12],[136,-12],[145,-17],[150,-22],[153,-27],[151,-34],[140,-38],[135,-35],[130,-33],[125,-28],[122,-23],[116,-18],[115,-14] ],
                AN: [ [-180,-65],[-170,-70],[-150,-72],[-120,-75],[-90,-78],[-60,-80],[-30,-82],[0,-83],[30,-82],[60,-80],[90,-78],[120,-75],[150,-72],[170,-70],[180,-65],[180,-85],[-180,-85],[-180,-65] ]
            };

            // Pre‑render the entire base map (ocean + grid) once
            const offCanvas = document.createElement('canvas');
            offCanvas.width = w;
            offCanvas.height = h;
            const offCtx = offCanvas.getContext('2d');

            // Ocean
            offCtx.fillStyle = '#050510';
            offCtx.fillRect(0, 0, w, h);

            // Grid
            offCtx.strokeStyle = '#111';
            offCtx.lineWidth = 1;
            for (let lon = -180; lon <= 180; lon += 30) {
                const x = (lon + 180) / 360 * w;
                offCtx.beginPath(); offCtx.moveTo(x, 0); offCtx.lineTo(x, h); offCtx.stroke();
            }
            for (let lat = -90; lat <= 90; lat += 30) {
                const y = (90 - lat) / 180 * h;
                offCtx.beginPath(); offCtx.moveTo(0, y); offCtx.lineTo(w, y); offCtx.stroke();
            }

            // Draw each continent with dot‑matrix fill + outline
            for (const name in continentPolys) {
                const poly = continentPolys[name];
                if (!poly || poly.length < 3) continue;

                offCtx.save();   

                // Create the continent path and clip to it
                offCtx.beginPath();
                const start = proj(poly[0][0], poly[0][1]);
                offCtx.moveTo(start.x, start.y);
                for (let i = 1; i < poly.length; i++) {
                    const p = proj(poly[i][0], poly[i][1]);
                    offCtx.lineTo(p.x, p.y);
                }
                offCtx.closePath();
                offCtx.clip();

                // Light fill base
                offCtx.fillStyle = t.fill;
                offCtx.fill();

                // Dot matrix (4px step, 60% chance)
                const step = 4;
                for (let x = 0; x < w; x += step) {
                    for (let y = 0; y < h; y += step) {
                        if (Math.random() < 0.6) {
                            offCtx.fillStyle = t.main;
                            offCtx.fillRect(x, y, 2, 2);
                        }
                    }
                }

                offCtx.restore(); //  restore after clip

                // Clean outline
                offCtx.beginPath();
                offCtx.moveTo(start.x, start.y);
                for (let i = 1; i < poly.length; i++) {
                    const p = proj(poly[i][0], poly[i][1]);
                    offCtx.lineTo(p.x, p.y);
                }
                offCtx.closePath();
                offCtx.strokeStyle = t.main;
                offCtx.lineWidth = 1.2;
                offCtx.stroke();
            }

            // Packet animation
            let packets = [];
            let captured = 0, mapped = 0, geoMiss = 0;

            function updateStats() {
                statsDiv.innerHTML = `NetOrbit Status<br>captured=${captured}  mapped=${mapped}  geo_miss=${geoMiss}<br><span style="color:${t.main};">Starting sniffer…</span>`;
            }
            updateStats();

            function spawnPacket() {
                const lon = Math.random() * 360 - 180;
                const lat = Math.random() * 160 - 80;
                const start = proj(lon, lat);
                const end = proj(Math.random() * 360 - 180, Math.random() * 160 - 80);
                packets.push({
                    sx: start.x, sy: start.y,
                    ex: end.x, ey: end.y,
                    progress: 0,
                    speed: 0.003 + Math.random() * 0.02,
                    trail: []
                });
                captured++;
            }

            function animate() {
                if (!canvas.isConnected) {
                    cancelAnimationFrame(window._netOrbitAnim);
                    return;
                }

                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(offCanvas, 0, 0);

                for (let i = packets.length - 1; i >= 0; i--) {
                    const p = packets[i];
                    p.progress += p.speed;
                    if (p.progress >= 1) {
                        packets.splice(i, 1);
                        mapped++;
                        if (Math.random() < 0.08) geoMiss++;
                        updateStats();
                        continue;
                    }
                    const x = p.sx + (p.ex - p.sx) * p.progress;
                    const y = p.sy + (p.ey - p.sy) * p.progress;

                    p.trail.push({x, y});
                    if (p.trail.length > 12) p.trail.shift();

                    // Trail
                    for (let j = 0; j < p.trail.length; j++) {
                        const tp = p.trail[j];
                        const alpha = j / p.trail.length * 0.4;
                        ctx.fillStyle = t.glow.replace('0.5', alpha.toString());
                        ctx.beginPath();
                        ctx.arc(tp.x, tp.y, 1.5, 0, Math.PI*2);
                        ctx.fill();
                    }

                    // Head with glow
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = t.glow;
                    ctx.fillStyle = t.main;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                if (Math.random() < 0.08) spawnPacket();
                window._netOrbitAnim = requestAnimationFrame(animate);
            }

            animate();
        }

        function initDinoGame(canvasId, godMode = false) {
            // ── Abort any previous game instance ──
            if (window._dinoAbort) window._dinoAbort = true;
            const abortFlag = { abort: false };
            window._dinoAbort = abortFlag;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            const groundY = 160;
            const dinoW = 30, dinoH = 30;
            let dino = { x: 50, y: groundY - dinoH, vy: 0, grounded: true };
            let obstacles = [];
            let powerUp = null;                   // shield power‑up object
            let shieldActive = false;             // true while temporary shield is on
            let shieldTimer = null;               // setTimeout reference
            let shieldSecsLeft = 0;               // seconds remaining on shield
            let score = 0, speed = 4, gameOver = false, frameCount = 0;
            const gravity = 0.6, jumpForce = -10;

            // Helper – turn off temporary shield
            const deactivateShield = () => {
                shieldActive = false;
                shieldSecsLeft = 0;
                if (shieldTimer) { clearTimeout(shieldTimer); shieldTimer = null; }
            };

            window._activeGame = {
                handleInput: (dir) => {
                    if (abortFlag.abort) return;
                    if ((dir === 'UP' || dir === 'ACTION') && dino.grounded && !gameOver) {
                        dino.vy = jumpForce;
                        dino.grounded = false;
                    }
                    if ((dir === 'UP' || dir === 'ACTION') && gameOver) {
                        resetGame();
                    }
                }
            };

            const keyHandler = (e) => {
                if (abortFlag.abort) return;
                if (document.activeElement && document.activeElement.id === 'cmd-input') return;
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                    e.preventDefault();
                    window._activeGame.handleInput('UP');
                }
            };
            document.addEventListener('keydown', keyHandler);

            function resetGame() {
                dino = { x: 50, y: groundY - dinoH, vy: 0, grounded: true };
                obstacles = [];
                powerUp = null;
                deactivateShield();
                score = 0;
                speed = 4;
                gameOver = false;
                frameCount = 0;
                requestAnimationFrame(gameLoop);
            }

            function spawnObstacle() {
                if (Math.random() < 0.012) {
                    const h = 15 + Math.random() * 15;
                    obstacles.push({ x: canvas.width, y: groundY - h, w: 12, h: h });
                }
            }

            function spawnPowerUp() {
                // Spawn a green shield every ~1/500 chance per frame
                if (!powerUp && !shieldActive && Math.random() < 0.002) {
                    powerUp = {
                        x: canvas.width,
                        y: groundY - 50 - Math.random() * 60,    // floating above ground
                        w: 12, h: 12
                    };
                }
            }

            function gameLoop() {
                if (abortFlag.abort) {
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }
                if (!canvas.isConnected) {
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }
                if (gameOver) return;

                frameCount++;
                if (frameCount % 300 === 0) speed += 0.3;

                // Physics
                dino.vy += gravity;
                dino.y += dino.vy;
                if (dino.y + dinoH >= groundY) {
                    dino.y = groundY - dinoH;
                    dino.vy = 0;
                    dino.grounded = true;
                }

                if (frameCount > 30) {
                    spawnObstacle();
                    spawnPowerUp();
                }

                // Move obstacles
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    obstacles[i].x -= speed;
                    if (obstacles[i].x < -30) { obstacles.splice(i, 1); score++; }
                }

                // Move power‑up
                if (powerUp) {
                    powerUp.x -= speed;
                    if (powerUp.x < -30) { powerUp = null; }
                    if (powerUp && !shieldActive &&
                        dino.x < powerUp.x + powerUp.w &&
                        dino.x + dinoW > powerUp.x &&
                        dino.y < powerUp.y + powerUp.h &&
                        dino.y + dinoH > powerUp.y) {
                        // Activate shield for 15 seconds
                        shieldActive = true;
                        shieldSecsLeft = 15;
                        if (shieldTimer) clearTimeout(shieldTimer);
                        // Countdown timer
                        const countdownInterval = setInterval(() => {
                            if (abortFlag.abort || !shieldActive) {
                                clearInterval(countdownInterval);
                                return;
                            }
                            shieldSecsLeft--;
                            if (shieldSecsLeft <= 0) {
                                clearInterval(countdownInterval);
                                deactivateShield();
                            }
                        }, 1000);
                        shieldTimer = setTimeout(deactivateShield, 15000);  // 15 seconds
                        powerUp = null;
                    }
                }

                // Collision – skip if god mode or shield
                if (!godMode && !shieldActive) {
                    for (const obs of obstacles) {
                        if (
                            dino.x < obs.x + obs.w &&
                            dino.x + dinoW > obs.x &&
                            dino.y + 4 < obs.y + obs.h &&
                            dino.y + dinoH - 4 > obs.y
                        ) {
                            gameOver = true;
                        }
                    }
                }

                // Draw
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.strokeStyle = '#0ff';
                ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();

                // Dino base
                ctx.fillStyle = '#0ff';
                ctx.fillRect(dino.x, dino.y, dinoW, dinoH);

                // Glow effect
                if (godMode || shieldActive) {
                    const glowColor = godMode ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,0,0.5)';
                    ctx.fillStyle = glowColor;
                    ctx.fillRect(dino.x - 4, dino.y - 4, dinoW + 8, dinoH + 8);
                    ctx.fillStyle = godMode ? '#0ff' : '#0f0';
                    ctx.font = '12px monospace';
                    ctx.fillText(godMode ? '🛡️' : '⚡', dino.x - 10, dino.y - 8);
                }

                // Eye
                ctx.fillStyle = '#000';
                ctx.fillRect(dino.x + dinoW - 10, dino.y + 6, 6, 6);

                // Obstacles (red firewalls)
                ctx.fillStyle = '#f00';
                obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

                // Power‑up (green shield)
                if (powerUp) {
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(powerUp.x, powerUp.y, powerUp.w, powerUp.h);
                    ctx.fillStyle = 'rgba(0,255,0,0.3)';
                    ctx.fillRect(powerUp.x - 3, powerUp.y - 3, powerUp.w + 6, powerUp.h + 6);
                }

                // Score and status
                ctx.fillStyle = '#0ff';
                ctx.font = '14px monospace';
                ctx.fillText('PACKETS: ' + score, canvas.width - 130, 20);
                if (shieldActive) {
                    ctx.fillStyle = '#0f0';
                    ctx.fillText(`🛡️ ${shieldSecsLeft}s`, 10, 20);
                } else if (godMode) {
                    ctx.fillStyle = '#0ff';
                    ctx.fillText('🛡️ GOD MODE', 10, 20);
                }

                if (gameOver) {
                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#f00';
                    ctx.font = '20px monospace';
                    ctx.fillText('SYSTEM FAILURE', canvas.width/2 - 80, canvas.height/2 - 15);
                    ctx.fillText('RUN TERMINATED', canvas.width/2 - 80, canvas.height/2 + 15);
                    ctx.font = '14px monospace';
                    ctx.fillText('Press ACT or Space to restart', canvas.width/2 - 80, canvas.height/2 + 40);
                } else {
                    requestAnimationFrame(gameLoop);
                }
            }

            gameLoop();
        }

        // Automatically update the copyright year
        document.getElementById('year').textContent = new Date().getFullYear();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.log('SW failed', err));
        }