        window.addEventListener('load', () => {
            const bootStatuses = ["J-OS BOOTING", "AKASHIC SYNC"];
            triggerGhost(bootStatuses[Math.floor(Math.random() * bootStatuses.length)]);
        });

        // VERSION CHECK NOTIFICATION
        const APP_VERSION = EG.VERSION;   // single source of truth lives in eg-core.js

        function checkVersion() {
            const storedVersion = EG.store.get('eliteGDX_version');
            if (storedVersion && storedVersion !== APP_VERSION) {
                EG.toast('✨ EliteGDX updated to <b>v' + APP_VERSION + '</b>');
            }
            EG.store.set('eliteGDX_version', APP_VERSION);
        }

        function showUpdateNotification() {
            // Remove existing banner if any
            const existing = document.querySelector('.update-banner');
            if (existing) existing.remove();

            const banner = document.createElement('div');
            banner.className = 'update-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #1a1a2e;
                border: 1px solid #0091ff;
                padding: 12px 24px;
                border-radius: 12px;
                z-index: 99999;
                color: #fff;
                font-family: 'Comfortaa', sans-serif;
                font-size: 0.95rem;
                box-shadow: 0 4px 30px rgba(0,255,204,0.15);
                display: flex;
                align-items: center;
                gap: 16px;
                backdrop-filter: blur(8px);
                max-width: 90%;
            `;
            banner.innerHTML = `
                <span>🔄 <strong style="color: #00ffcc;">EliteGDX v${APP_VERSION}</strong> is available!</span>
                <button onclick="location.reload()" style="background:#00ffcc; color:#000; border:none; padding:6px 18px; border-radius:6px; cursor:pointer; font-weight:bold;">Refresh</button>
                <button onclick="this.parentElement.remove()" style="background:transparent; color:#666; border:none; cursor:pointer; font-size:1.2rem;">✕</button>
            `;
            document.body.appendChild(banner);
        }

        // Call on page load
        checkVersion();


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
            if (document.visibilityState === 'visible') {
                await requestWakeLock(); // Always try to grab it when the tab becomes visible
            }
        });

        // ---- GLOBAL EPHEMERIS DATA (can be overridden by fetch) ----
        const EPHEMERIS = {
            // Clean year‑start epoch – good for all 2026 calculations
            refDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), // Jan 1, 2026 00:00 UTC
            refLon: {
                Sun: 280.46,          // ~Jan 1, 2026
                Moon: 45.2,
                Mercury: 300.8,
                Venus: 135.6,
                Mars: 112.3,
                Jupiter: 89.7,
                Saturn: 345.2,
                Uranus: 210.5,
                Neptune: 340.1,
                Pluto: 298.4
            },
            dailyMotion: {
                Sun: 0.9856,
                Moon: 13.176,
                Mercury: 1.383,
                Venus: 1.602,
                Mars: 0.524,
                Jupiter: 0.083,
                Saturn: -0.033,        // retrograde
                Uranus: 0.012,
                Neptune: -0.006,       // retrograde
                Pluto: -0.004          // retrograde
            }
        };

        async function fetchUpdatedEphemeris() {
            try {
                const response = await fetch('./data/ephemeris.json'); // or a CDN URL
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                // Validate structure
                if (data.refDate && data.refLon && data.dailyMotion) {
                    EPHEMERIS.refDate = new Date(data.refDate);
                    // Ensure the date is valid
                    if (isNaN(EPHEMERIS.refDate.getTime())) {
                        throw new Error('Invalid refDate in JSON');
                    }
                    Object.assign(EPHEMERIS.refLon, data.refLon);
                    Object.assign(EPHEMERIS.dailyMotion, data.dailyMotion);
                    console.log('✅ Ephemeris updated from external source');
                } else {
                    console.warn('⚠️ External ephemeris missing required fields - using defaults');
                }
            } catch (e) {
                console.warn('⚠️ Using default ephemeris (fetch failed)', e.message);
            }
        }

        // ============================================================
        // J2000 SUN & MOON – Real‑Time Physics (Accurate for 100+ years)
        // ============================================================
        // 1. J2000 Keplerian Math for the Sun
        function getSunPosition(simTime) {
            const refDate = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
            const diffDays = (simTime.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
            
            const meanSunAnomaly = (357.529 + 0.98560028 * diffDays) * Math.PI / 180;
            const sunEclipticLon = (280.459 + 0.98564736 * diffDays + 1.915 * Math.sin(meanSunAnomaly)) * Math.PI / 180;
            const obliquity = 23.439 * Math.PI / 180;
            
            let sunRA = Math.atan2(
                Math.sin(sunEclipticLon) * Math.cos(obliquity),
                Math.cos(sunEclipticLon)
            );
            if (sunRA < 0) sunRA += 2 * Math.PI;
            
            let sunLon = sunEclipticLon * 180 / Math.PI;
            sunLon = ((sunLon % 360) + 360) % 360;
            
            return { lon: sunLon, ra: sunRA, eclipticLon: sunEclipticLon };
        }

        // 2. J2000 Keplerian Math for the Moon
        function getMoonPosition(simTime) {
            const refDate = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
            const diffDays = (simTime.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
            
            const obliquity = 23.439 * Math.PI / 180;
            const meanSunAnomaly = (357.529 + 0.98560028 * diffDays) * Math.PI / 180;
            const sunEclipticLon = (280.459 + 0.98564736 * diffDays + 1.915 * Math.sin(meanSunAnomaly)) * Math.PI / 180;
            
            // Mean lunar elements
            let L = (218.3165 + 13.176396 * diffDays) * Math.PI / 180;
            let M = (134.9634 + 13.064993 * diffDays) * Math.PI / 180;
            let F = (93.2720 + 13.229350 * diffDays) * Math.PI / 180;
            let Omega = (125.044 - 0.052954 * diffDays) * Math.PI / 180;
            
            let argLat = F - Omega;
            const eclipticLat = 5.145 * Math.PI / 180 * Math.sin(argLat);
            const eclipticLon = L + 6.289 * Math.PI / 180 * Math.sin(M);
            
            // Convert to equatorial
            const sinDec = Math.sin(eclipticLat) * Math.cos(obliquity) + 
                        Math.cos(eclipticLat) * Math.sin(obliquity) * Math.sin(eclipticLon);
            const moonDec = Math.asin(sinDec);
            
            let moonRA = Math.atan2(
                Math.sin(eclipticLon) * Math.cos(obliquity) - Math.tan(eclipticLat) * Math.sin(obliquity),
                Math.cos(eclipticLon)
            );
            if (moonRA < 0) moonRA += 2 * Math.PI;
            
            let moonLon = eclipticLon * 180 / Math.PI;
            moonLon = ((moonLon % 360) + 360) % 360;
            
            return { 
                lon: moonLon, 
                ra: moonRA, 
                dec: moonDec, 
                eclipticLon: eclipticLon, 
                eclipticLat: eclipticLat 
            };
        }
        
        // ── NEURAL GRAPH STATE ──
        let nodes = [];
        let links = [];
        const MAX_NODES = 30;
        const DRIFT_SPEED = 0.7;   // more vivid neural activity
        let graphCanvas = null;
        let graphCtx = null;
        let graphAnimationId = null;
        const NODE_COLORS = ['#0f0', '#0ff', '#ff0', '#f0f', '#f00']; // green, cyan, yellow, magenta, red
        let graphLayout = 'free'; // 'free', 'circle', 'grid'
        
        // Trance state
        let tranceActive = false;
        let tranceFloatRunning = false;
        let tranceSpiralRunning = false;
        let tranceFloatTexts = [];
        let tranceFloatAnimationId = null;
        let tranceSpiralAnimationId = null;

        // Global Audio Engine variable
        let tactileAudioCtx = null;

        // The core feedback function
        function triggerTactileFeedback() {
            // 1. TACTILE HAPTICS (Vibration)
            if (navigator.vibrate) {
                navigator.vibrate(10); // 10ms mechanical click
            }

            // 2. SYNTH BLIP (Web Audio API)
            try {
                // Initialize the audio engine on the first click to bypass browser blocks
                if (!tactileAudioCtx) {
                    tactileAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                // Wake it up if the browser put it to sleep
                if (tactileAudioCtx.state === 'suspended') {
                    tactileAudioCtx.resume();
                }

                // Create the sound wave
                const osc = tactileAudioCtx.createOscillator();
                const gainNode = tactileAudioCtx.createGain();
                
                osc.type = 'sine'; // Clean retro beep
                
                // Pitch drop effect (800Hz down to 150Hz in 80ms)
                osc.frequency.setValueAtTime(800, tactileAudioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, tactileAudioCtx.currentTime + 0.08);
                
                // Volume fade out
                gainNode.gain.setValueAtTime(0.15, tactileAudioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, tactileAudioCtx.currentTime + 0.08);
                
                osc.connect(gainNode);
                gainNode.connect(tactileAudioCtx.destination);
                
                // Play the sound
                osc.start();
                osc.stop(tactileAudioCtx.currentTime + 0.08);
                
            } catch (error) {
                console.warn("Audio feedback blocked or unsupported", error);
            }
        }

        // List of button IDs that should get the reactive class
        const reactiveButtons = [
            'az-playpause', 'az-sync', 'az-speed', 'az-day', 'az-prev-mo', 'az-next-mo',
            'az-6mo', 'az-year', 'az-reset',
            'astro-playpause', 'astro-sync', 'astro-speed', 'astro-day',
            'astro-prev-mo', 'astro-next-mo', 'astro-6mo', 'astro-year', 'astro-reset',
            'toggle-zodiac', 'toggle-planets', 'toggle-acmc', 'toggle-clock',
            'fe-play-pause', 'fe-now', 'fe-speed', 'fe-next-hr', 'fe-prev-hr',
            'fe-next-day', 'fe-prev-day', 'fe-next-mo', 'fe-prev-mo', 'fe-6mo', 'fe-year', 'fe-reset',
            'hide-controls-btn', 'hide-info-btn', 'freeze-btn', 'bg-toggle-btn',
            'zen-toggle-btn', 'magic-mirror-btn', 'mirror-exit-btn', 'fe-toggle-btn',
            'open-fetch-btn', 'toggle-fetch-btn', 'open-cmd-runner', 'close-cmd-runner',
            'gnosis-toggle-btn', 
        ];

        // Also include any buttons with specific classes (e.g., .cosmic-btn inside #cosmic-wrapper)
        document.querySelectorAll('#cosmic-wrapper .cosmic-btn').forEach(btn => {
            if (!reactiveButtons.includes(btn.id)) reactiveButtons.push(btn.id);
        });
        
        document.querySelectorAll('#sephirot-group circle').forEach(circle => {
            circle.classList.add('reactive-btn');
        });

        // Now apply the class
        reactiveButtons.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('reactive-btn');
        });



        // 3. THE AUTO-CONNECTOR
        // automatically finds every button with the class 'reactive-btn' and attaches the feedback!
        document.querySelectorAll('.reactive-btn').forEach(button => {
            // We use 'pointerdown' instead of 'click' so the sound/vibration happens 
            // the exact millisecond they press the screen/mouse, not when they release it.
            button.addEventListener('pointerdown', triggerTactileFeedback);
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
        let currentVolume = 0.06;
        if (volumeSlider) {
            currentVolume = parseFloat(volumeSlider.value);
        }
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

        // ── Audio preset shortcuts ──
        const audioPresets = {
            siren:     './sounds/civil-defense-siren.mp3',
            bell:      './sounds/LargeChurchBells.mp3',
            gong:      './sounds/TempleGong.mp3',
            ascension: './sounds/Ascension.mp3',
            medit:     './sounds/MeditMusic.mp3',
            deeptown:  './sounds/DeepTown-Routine_128k.mp3',
            wot:       './sounds/The-Wheel-of-Time128k.mp3',
            wotsedai:  './sounds/WOTMoiraine-Sedai128k.mp3',
            elite:     './sounds/AyanoSinister-Schemes_128k.mp3',
            cote:      './sounds/COTE A-Class-Arisu_128k.mp3'
        };


        // RPG State
        window._rpg = {
            active: false,
            chapter: null,
            inventory: [],
            health: 100
        };

        function startRpgPlaylist() {
            stopRpgAudio(); // stop any previous

            const playlist = ['deeptown', 'elite', 'cote'];
            let currentIndex = 0;

            function playNext() {
                if (!window._rpg.active) return; // RPG ended, stop
                const preset = playlist[currentIndex];
                const audio = new Audio(audioPresets[preset]);
                window._rpgCurrentAudio = audio;
                audio.play().catch(e => console.warn('RPG audio failed:', e));
                audio.onended = () => {
                    currentIndex = (currentIndex + 1) % playlist.length;
                    playNext();
                };
            }

            playNext();
        }

        function stopRpgAudio() {
            if (window._rpgCurrentAudio) {
                window._rpgCurrentAudio.pause();
                window._rpgCurrentAudio.currentTime = 0;
                window._rpgCurrentAudio.onended = null;
                window._rpgCurrentAudio = null;
            }
        }
        
        // Load saved graph from localStorage
        function loadGraph() {
            try {
                const saved = JSON.parse(EG.store.get('akashic_graph'));
                if (saved && saved.nodes && saved.links) {
                    nodes = saved.nodes;
                    links = saved.links;
                }
            } catch (e) { /* ignore corrupt data */ }
        }

        // Save graph to localStorage
        function saveGraph() {
            EG.store.set('akashic_graph', JSON.stringify({ nodes, links }));
        }

        // Add a command to the graph
        function addNodeToGraph(label) {
            if (!label) return;
            // Look for an existing node with the same label
            let existing = nodes.find(n => n.label === label);
            if (existing) {
                existing.size = Math.min(existing.size + 2, 20);
                // Cycle colour
                const currentIdx = NODE_COLORS.indexOf(existing.color);
                const nextIdx = (currentIdx + 1) % NODE_COLORS.length;
                existing.color = NODE_COLORS[nextIdx] !== -1 ? NODE_COLORS[nextIdx] : NODE_COLORS[0];
                // … link logic …
                saveGraph();
                return;
            }

            // Create new node at random position
            const w = window.innerWidth, h = window.innerHeight;
            const newNode = {
                label: label,
                relX: Math.random() * 0.8 + 0.1,   // 10%–90% of width
                relY: Math.random() * 0.6 + 0.2,   // 20%–80% of height
                size: 5,
                color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)]
            };

            // Link from the previous node (if any)
            if (nodes.length > 0) {
                links.push({ source: nodes[nodes.length - 1], target: newNode });
            }

            nodes.push(newNode);

            // Trim old nodes
            if (nodes.length > MAX_NODES) {
                const removed = nodes.shift();
                // Remove any links that reference the removed node
                links = links.filter(l => l.source !== removed && l.target !== removed);
            }

            saveGraph();
        }

        // Draw the brain graph
       function drawBrainGraph() {
            if (!graphCtx) return;

            // Keep canvas dimensions in sync with the window
            const w = window.innerWidth, h = window.innerHeight;
            if (graphCanvas.width !== w || graphCanvas.height !== h) {
                graphCanvas.width = w;
                graphCanvas.height = h;
            }

            // Fade previous frame
            graphCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            graphCtx.fillRect(0, 0, w, h);

            // Convert relative → absolute, apply drift, keep inside bounds
            nodes.forEach(node => {
                // If rel not yet set (for old data), compute from stored absolute (fallback)
                if (node.relX === undefined) {
                    node.relX = node.x / w || 0.1;
                    node.relY = node.y / h || 0.2;
                }
                // Get current absolute position from relative
                let ax = node.relX * w;
                let ay = node.relY * h;
                
                // Drift + Apply stored velocity (from layout burst) and small random drift
                ax += (node.vx || 0) + (Math.random() - 0.5) * DRIFT_SPEED;
                ay += (node.vy || 0) + (Math.random() - 0.5) * DRIFT_SPEED;
                // Clamp + Dampen velocities so they fade out
                node.vx = (node.vx || 0) * 0.95;
                node.vy = (node.vy || 0) * 0.95;
                if (Math.abs(node.vx) < 0.01) node.vx = 0;
                if (Math.abs(node.vy) < 0.01) node.vy = 0;

                // Store back as relative
                node.relX = ax / w;
                node.relY = ay / h;

                // Temporary absolute for drawing
                node.x = ax;
                node.y = ay;
            });

            // ── if in circle mode, place nodes evenly on a circle ──
            if (graphLayout === 'circle') {
                const centerX = w / 2, centerY = h / 2;
                const radius = Math.min(w, h) * 0.4;
                const total = nodes.length;
                nodes.forEach((node, i) => {
                    const angle = (i / total) * Math.PI * 2 - Math.PI / 2; // start from top
                    const targetX = centerX + Math.cos(angle) * radius;
                    const targetY = centerY + Math.sin(angle) * radius;
                    // Smoothly move towards the target (lerp)
                    node.x += (targetX - node.x) * 0.1;
                    node.y += (targetY - node.y) * 0.1;
                    // Store relative positions (for persistence)
                    node.relX = node.x / w;
                    node.relY = node.y / h;
                });
            }

            // ── if in grid mode, snap nodes to a neat grid ──
            if (graphLayout === 'grid') {
                const total = nodes.length;
                if (total > 0) {
                    const cols = Math.ceil(Math.sqrt(total));
                    const rows = Math.ceil(total / cols);
                    const gridW = w / (cols + 1);
                    const gridH = h / (rows + 1);
                    nodes.forEach((node, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const targetX = gridW * (col + 1);
                        const targetY = gridH * (row + 1);
                        // Lerp toward target
                        node.x += (targetX - node.x) * 0.1;
                        node.y += (targetY - node.y) * 0.1;
                        node.relX = node.x / w;
                        node.relY = node.y / h;
                    });
                }
            }

            // ── if in fibonacci mode, arrange nodes in a sunflower spiral ──
            if (graphLayout === 'fibonacci') {
                const total = nodes.length;
                if (total > 0) {
                    const centerX = w / 2, centerY = h / 2;
                    const scale = Math.min(w, h) * 0.3;            // adjust spread
                    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
                    nodes.forEach((node, i) => {
                        const radius = scale * Math.sqrt(i + 0.5);
                        const angle = i * goldenAngle;
                        const targetX = centerX + radius * Math.cos(angle);
                        const targetY = centerY + radius * Math.sin(angle);
                        node.x += (targetX - node.x) * 0.1;
                        node.y += (targetY - node.y) * 0.1;
                        node.relX = node.x / w;
                        node.relY = node.y / h;
                    });
                }
            }

            // Draw links (using node.x, node.y which we just set)
            graphCtx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
            graphCtx.lineWidth = 1;
            links.forEach(link => {
                graphCtx.beginPath();
                graphCtx.moveTo(link.source.x, link.source.y);
                graphCtx.lineTo(link.target.x, link.target.y);
                graphCtx.stroke();
            });

            // Draw nodes (with new label positioning)
            nodes.forEach(node => {
                graphCtx.fillStyle = node.color;
                graphCtx.beginPath();
                graphCtx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                graphCtx.fill();

                // Label above the node
                graphCtx.fillStyle = '#fff';
                graphCtx.font = '10px monospace';
                graphCtx.textAlign = 'center';
                graphCtx.textBaseline = 'bottom';
                graphCtx.fillText(node.label, node.x, node.y - node.size - 4);
            });
            // Reset text alignment
            graphCtx.textAlign = 'start';
            graphCtx.textBaseline = 'alphabetic';

            saveGraph(); // periodic save (with relative coords)
            graphAnimationId = requestAnimationFrame(drawBrainGraph);
        }

        // Start the graph overlay
        function startGraph() {
            graphCanvas = document.getElementById('neural-canvas');
            if (!graphCanvas) return;
            graphCanvas.style.display = 'block';
            graphCanvas.width = window.innerWidth;
            graphCanvas.height = window.innerHeight;
            graphCtx = graphCanvas.getContext('2d');
            window._graphActive = true;
            drawBrainGraph();
        }

        // Stop the graph overlay
        function stopGraph() {
            if (graphAnimationId) cancelAnimationFrame(graphAnimationId);
            if (graphCanvas) graphCanvas.style.display = 'none';
            window._graphActive = false;
        }


        // Slideshow Overlay
        let slideshowInterval = null;
        window._slideshowActive = false;
        window._slideshowPaused = false;
        let currentSlideIndex = 0;

        function drawImageCover(img, canvas, ctx) {
            const cw = canvas.width, ch = canvas.height;
            const iw = img.naturalWidth, ih = img.naturalHeight;
            const scale = Math.max(cw / iw, ch / ih);
            const sw = iw * scale, sh = ih * scale;
            const sx = (cw - sw) / 2, sy = (ch - sh) / 2;
            ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(img, sx, sy, sw, sh);
        }

        function startSlideshow() {
            const canvas = document.getElementById('slideshow-canvas');
            if (!canvas) return;
            canvas.style.display = 'block';
            canvas.style.zIndex = '1000';    // ensure it floats above all else
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            window._slideshowActive = true;
            window._slideshowPaused = false;

            function drawSlide() {
                if (!window._slideshowActive || window._slideshowPaused) return;
                const img = new Image();
                img.onload = () => drawImageCover(img, canvas, ctx);
                const sources = slideshowSource;
                img.src = sources[currentSlideIndex % sources.length];
                currentSlideIndex++;
                if (currentSlideIndex >= sources.length) currentSlideIndex = 0;
            }
            drawSlide();

            slideshowInterval = setInterval(() => {
                if (window._slideshowActive && !window._slideshowPaused) drawSlide();
            }, 30000); // change every 30 seconds

            // ─── GUARD INTERVAL Extra robustness ─── 
            if (window._slideshowGuard) clearInterval(window._slideshowGuard);
            window._slideshowGuard = setInterval(() => {
                if (window._slideshowActive) {
                    const canvas = document.getElementById('slideshow-canvas');
                    if (canvas && canvas.style.display !== 'block') {
                        canvas.style.display = 'block';
                        refreshSlideshowIfActive();
                    }
                }
            }, 2000);

        }

        function advanceSlideshow() {
            const canvas = document.getElementById('slideshow-canvas');
            if (!canvas || !window._slideshowActive) return;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => drawImageCover(img, canvas, ctx);
            const sources = slideshowSource;
            img.src = sources[currentSlideIndex % sources.length];
            currentSlideIndex++;
        }
        function previousSlideshow() {
            const canvas = document.getElementById('slideshow-canvas');
            if (!canvas || !window._slideshowActive) return;
            const ctx = canvas.getContext('2d');
            const sources = slideshowSource;
            currentSlideIndex = (currentSlideIndex - 2 + sources.length) % sources.length; // go back
            if (currentSlideIndex < 0) currentSlideIndex = sources.length - 1;
            const img = new Image();
            img.onload = () => drawImageCover(img, canvas, ctx);
            img.src = sources[currentSlideIndex % sources.length];
        }

        window.addEventListener('resize', () => {
            const canvas = document.getElementById('slideshow-canvas');
            if (canvas && window._slideshowActive) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                // Immediately redraw the current image after resize
                refreshSlideshowIfActive();
            }
        });

        function stopSlideshow() {
            window._slideshowActive = false;
            if (slideshowInterval) clearInterval(slideshowInterval);
            const canvas = document.getElementById('slideshow-canvas');
            if (canvas) canvas.style.display = 'none';
            if (window._slideshowGuard) clearInterval(window._slideshowGuard);
            canvas.style.zIndex = '6';   // back to original
        }

        const categoriesList = [
            'animation', 'auto', 'business', 'classic', 'comedy', 'cooking',
            'culture', 'documentary', 'education', 'entertainment', 'family',
            'general', 'kids', 'legislative', 'lifestyle', 'movies', 'music',
            'news', 'outdoor', 'public', 'relax', 'religious', 'science',
            'series', 'shop', 'sports', 'travel', 'weather'
        ];

        // Click‑to‑fill – a universal helper
        function fillInput(text) {
            const input = document.getElementById('cmd-input');
            if (input) {
                input.value = text;
                input.focus();
            }
        }

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

            // --- Dynamic package count (number of commands in 'commands' object) ---
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
            if (ua.includes('Linux')) return 'Linux';
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
                    playTick(true);   // sound feedback (uses existing playTick)
                } else {
                    fetchContainer.style.visibility = 'hidden';
                    playTick(true);
                }
            });
        }

        const typewriterElement = document.getElementById('typewriter');
        const names = ["JIN KANEKI", "JOHN COHEN","@_@","THE OBSERVER","0_0","How many names have you counted?","THE WANDERER","JIN LEE","!_0","KANJIN","Johan D. Awakened","How many names have you counted?","*_0",":)"];
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
        document.addEventListener('DOMContentLoaded', async () => {
            await fetchUpdatedEphemeris();  // wait for fetch (or fail silently)
            initFlatEarthClock();
            setTimeout(type, 1000);  // Wait 1 second after page load to start
        });

        const hourHand = document.getElementById('hour');
        const minuteHand = document.getElementById('minute');
        const secondHand = document.getElementById('second');
        const themeToggle = document.getElementById('theme-toggle');
        const freezeBtn = document.getElementById('freeze-btn');
        const body = document.body;

        // Slideshow Variables
        let blocks = Array.from(document.querySelectorAll('.content-blocks > .block'));   // was '.block' — it also grabbed the static Project-Intent block, giving an empty slide now and then
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
            if (window.EG_prefetch) { EG_prefetch(blocks[0]); EG_prefetch(blocks[1]); }
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
            if (window.EG_prefetch) EG_prefetch(blocks[(currentBlockIndex + 1) % blocks.length]);   // next slide is ready before the fade

            // NEW: Tell the background to update to match the new block! this call the global function
            updateBackground();
        }

        // NEW: go to the PREVIOUS slide (mirror of cycleBlocks, no reshuffle)
        function cycleBlocksBack() {
            if (isFrozen) return;
            blocks[currentBlockIndex].classList.remove('active');
            currentBlockIndex = (currentBlockIndex - 1 + blocks.length) % blocks.length;
            blocks[currentBlockIndex].classList.add('active');
            if (window.EG_prefetch) EG_prefetch(blocks[(currentBlockIndex - 1 + blocks.length) % blocks.length]);
            updateBackground();
        }
        EG.gallery = {
            next() { if (isFrozen) return 'frozen — press Freeze (or double-click the background) to resume'; cycleBlocks(); return 'slide ' + (currentBlockIndex + 1) + '/' + blocks.length; },
            prev() { if (isFrozen) return 'frozen — press Freeze (or double-click the background) to resume'; cycleBlocksBack(); return 'slide ' + (currentBlockIndex + 1) + '/' + blocks.length; },
        };

        // --- 1. GLOBAL VARIABLES ---
        let isBgFrozen = false;
        let bgMode = 'off'; // off 'sync' or 'independent'
        const independentBgImages = [
            'images/indepedentBG/ORIGINBACKG.jpeg',
            'images/indepedentBG/Ataraxia.jpg',
            'images/indepedentBG/YHNH.png',
            'images/indepedentBG/TheAlchemistV2.jpg',
            'images/indepedentBG/IMGBACKG.jpeg',
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
            'images/indepedentBG/june-17-solstice-sunset.png',
            'images/indepedentBG/Eugenics.jpg',
            'images/indepedentBG/chameleonBg.jpg',
            'images/indepedentBG/SSYHVHBg.jpg',
            'images/indepedentBG/TreeOfLife.jpeg',
            'images/indepedentBG/NikaBack.jpeg',
            //'images/indepedentBG/',
        ];

        // Gallery images for Intersect flash (from slideshow blocks)
        const galleryImages = [
            'images/IMG_BLUE.jpg',
            'images/OkamiKitsune.jpg',
            'images/YHNH.png',
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
            'images/MahoragaWheel.jpeg',
            'images/EinSof.jpeg',
            'images/Screenshot_YHVH.jpg',
            'images/AllisOneisAll.jpeg',
            'images/Kircher-Diagram_of_the_names_of_God.jpg',
            'images/SoularSystem.png'
        ];

        let slideshowSource = galleryImages;   // default

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
            independentIdx = randomIndex;                 // remember it, so `bg next` / `bg prev` continue from here
            document.querySelector('.fixed-bg').style.backgroundImage = `url('${independentBgImages[randomIndex]}')`;
        }
        // NEW: step the independent-folder background forwards/backwards (used by the `bg next` / `bg prev` commands)
        let independentIdx = -1;
        EG.bg = {
            step(dir) {
                if (isBgFrozen) return 'background is frozen — double-click the background to unfreeze';
                const n = independentBgImages.length; if (!n) return 'no independent backgrounds';
                if (bgMode !== 'independent') {                     // switch into independent mode first (same state changes as the BG button)
                    bgMode = 'independent'; bgToggleBtn.classList.add('independent'); bgToggleBtn.innerText = ' BG: INDEPENDENT';
                }
                independentIdx = independentIdx < 0 ? (dir > 0 ? 0 : n - 1) : (independentIdx + dir + n) % n;
                document.querySelector('.fixed-bg').style.backgroundImage = `url('${independentBgImages[independentIdx]}')`;
                startIndependentInterval();                         // restart the 30 s auto-cycle so it does not flip again immediately
                return 'background ' + (independentIdx + 1) + '/' + n + ' — ' + independentBgImages[independentIdx].split('/').pop();
            },
            next() { return EG.bg.step(+1); }, prev() { return EG.bg.step(-1); },
            status() { return 'mode: ' + bgMode + (independentIdx >= 0 ? ' · image ' + (independentIdx + 1) + '/' + independentBgImages.length : '') + (isBgFrozen ? ' · FROZEN' : ''); },
        };
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

            // ============================================================
            // HELPER: Check if user is typing in a text field
            // ============================================================
            function isTyping() {
                const active = document.activeElement;
                if (!active) return false;
                const tag = active.tagName.toLowerCase();
                // Check if it's an input, textarea, or contenteditable
                if (tag === 'input' || tag === 'textarea') return true;
                if (active.isContentEditable) return true;
                return false;
            }

            // ============================================================
            // DOUBLE CLICK: Freeze/Unfreeze (only on body background)
            // ============================================================
            document.body.addEventListener('dblclick', (e) => {
                // Only trigger when clicking the background (body or its direct children)
                if (e.target === document.body || e.target.tagName === 'BODY') {
                    isBgFrozen = !isBgFrozen;
                    playTick(true);  // Deeper 'Tock' sound for confirmation
                    triggerGhost(isBgFrozen);
                    if (!isBgFrozen) updateBackground();
                }
            });

            // ============================================================
            // KEYBOARD: 'B' to Freeze/Unfreeze (skip if typing)
            // ============================================================
            document.addEventListener('keydown', (e) => {
                // Skip if user is typing in a text field
                if (isTyping()) return;
                
                if (e.key.toLowerCase() === 'b') {
                    e.preventDefault(); // Prevent 'b' from being typed
                    isBgFrozen = !isBgFrozen;
                    playTick(true); // Deeper 'Tock' sound for confirmation
                    triggerGhost(isBgFrozen);
                    if (!isBgFrozen) updateBackground();
                }
            });
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
        // Optional: refresh every 30 minutes
        setInterval(fetchDailyQuote, 1800000);

        // --- TAO TE CHING RANDOM CHAPTER ---
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
       
        // --- YOHAN TE CHING RANDOM CHAPTER ---
        let yohanChapters = [];
        let yohanLoaded = false;

        async function loadYohanTeChing() {
            try {
                const response = await fetch('./TTC/yohan-te-ching.json');
                if (!response.ok) throw new Error('Yohan Te Ching JSON not found');
                yohanChapters = await response.json();
                yohanLoaded = true;
                displayRandomYohanChapter();
            } catch (error) {
                console.error('Failed to load Yohan Te Ching:', error);
                const yohanText = document.getElementById('yohan-quote-text');
                if (yohanText) yohanText.innerText = 'The ridge is silent, waiting for your step.';
            }
        }

        function displayRandomYohanChapter() {
            if (!yohanLoaded || yohanChapters.length === 0) return;
            const randomIndex = Math.floor(Math.random() * yohanChapters.length);
            const chapter = yohanChapters[randomIndex];
            const textElement = document.getElementById('yohan-quote-text');
            const authorElement = document.getElementById('yohan-quote-author');
            if (textElement) {
                // Format: Chapter X: Title\n\nText (with line breaks)
                const formattedText = `Chapter ${chapter.chapter}: ${chapter.title}<br><br>${chapter.text.replace(/\n/g, '<br>')}`;
                textElement.innerHTML = formattedText;
            }
            if (authorElement) {
                authorElement.innerHTML = `— YHNH (Yohan D. Awakened)`;
            }
        }

        // Attach event listener to the Yohan button
        const newYohanBtn = document.getElementById('new-yohan-chapter-btn');
        if (newYohanBtn) {
            newYohanBtn.addEventListener('click', displayRandomYohanChapter);
        }

        // Load the Yohan Te Ching JSON and show first random chapter
        loadYohanTeChing();


        // --- ELITE 6-STATE CLOCK TOGGLE (Classic / Glass / Digital / Cistercian/ Cosmic/ Celestial) ---
        const styleBtn = document.getElementById('zen-toggle-btn');
        const analogClock = document.getElementById('analog-clock');
        const digitalClock = document.getElementById('digital-clock');
        const cistercianClock = document.getElementById('cistercian-wrapper');

        // State: 0 = Classic, 1 = Glass, 2 = Digital , 3 = Cistercian , 4 = Cosmic, 5 = Celestial
        const clockModes = ['classic', 'glass', 'digital', 'cistercian', 'cosmic', 'celestial'];
        let currentModeIndex = 0;

        // Set initial button text
        styleBtn.innerText = "🕰️ STYLE: CLASSIC";

        // Map mode to ghost message
        const modeMessages = {
            'classic': '🕰️ CLASSIC MODE',
            'glass': '💎 GLASS MODE',
            'digital': '📟 DIGITAL MODE',
            'cistercian': '🧮 CISTERCIAN MODE',
            'cosmic': '🌌 COSMIC CLOCK',
            'celestial': '🌀 CELESTIAL WHEEL'
        };

        styleBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex + 1) % clockModes.length;
            const mode = clockModes[currentModeIndex];

            const cosmicWrapper = document.getElementById('cosmic-wrapper');
            const cosmicCanvas = document.getElementById('cosmic-canvas');

            playTick(true); // sound feedback

            // Reset everything
            analogClock.classList.remove('zen-mode');
            analogClock.style.display = 'flex';
            digitalClock.style.display = 'none';
            cistercianClock.style.display = 'none';
            cosmicWrapper.style.display = 'none';
            document.querySelector('.timepiece-wrapper').classList.remove('cosmic-glass-active');
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
            } else if (mode === 'cosmic') {
                analogClock.style.display = 'none';
                digitalClock.style.display = 'none';
                cistercianClock.style.display = 'none';
                cosmicWrapper.style.display = 'flex';
                styleBtn.innerText = "🌌 STYLE: COSMIC";
                styleBtn.classList.add('zen-active');
                styleBtn.style.borderColor = "var(--clock-border)";
                // Initialize the cosmic engine only once
                if (!window._cosmicInit) initCosmicClock();
            } else if (mode === 'celestial') {
                analogClock.style.display = 'flex';
                analogClock.classList.add('zen-mode'); // transparent glass
                digitalClock.style.display = 'none';
                cistercianClock.style.display = 'none';
                cosmicWrapper.style.display = 'flex';
                styleBtn.innerText = "🌀 STYLE: CELESTIAL";
                styleBtn.classList.add('zen-active');
                styleBtn.style.borderColor = "var(--clock-border)";
                document.querySelector('.timepiece-wrapper').classList.add('cosmic-glass-active');
                if (!window._cosmicInit) initCosmicClock();
            }

            // Show ghost message
            if (typeof triggerGhost === 'function') {
                triggerGhost(modeMessages[mode]);
            }
        });

        // Swipe LEFT/RIGHT - Change Clock Mode
        (function initSwipe() {
            const wrapper = document.querySelector('.timepiece-wrapper');
            if (!wrapper) return;

            // Get the STYLE button 
            const styleBtn = document.getElementById('zen-toggle-btn');
            if (!styleBtn) return;

            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            wrapper.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
                isSwiping = false;
            }, { passive: true });

            wrapper.addEventListener('touchmove', (e) => {
                const deltaX = e.changedTouches[0].screenX - touchStartX;
                const deltaY = e.changedTouches[0].screenY - touchStartY;
                if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isSwiping = true;
                }
            }, { passive: true });

            wrapper.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                const deltaX = e.changedTouches[0].screenX - touchStartX;
                const threshold = 50;

                if (Math.abs(deltaX) > threshold) {
                    // ---- Determine direction ----
                    let direction = deltaX < 0 ? 1 : -1; // 1 = next, -1 = previous

                    const clockModesLength = 6; // classic, glass, digital, cistercian, cosmic, celestial
                    const clicks = direction === 1 ? 1 : clockModesLength - 1;

                    for (let i = 0; i < clicks; i++) {
                        styleBtn.click();
                    }
                }
                isSwiping = false;
            }, { passive: true });

            console.log('Swipe gesture initialized (using style button).');
        })();



        // 2. Hide Info Logic
        // --- CLEAN VIEW 3‑STATE CYCLE (with space preservation) ---
        const hideBtn = document.getElementById('hide-info-btn');
        const infoSection = document.getElementById('info-section');
        const contentBlocks = document.querySelectorAll('.content-blocks'); // both slideshow and the extra one
        // Get static block
        const staticBlock = document.getElementById('static-block');
        let cleanViewMode = 0; // 0 = all visible, 1 = info hidden, 2 = both hidden
        
        function updateCleanView() {
            // Define mode
            const mode = clockModes[currentModeIndex];
            const isCosmicOrCelestial = (mode === 'cosmic' || mode === 'celestial');

            // Get the controls container more reliably
            const cosmicWrapper = document.getElementById('cosmic-wrapper');
            const cosmicCanvas = document.getElementById('cosmic-canvas');
            const cosmicControls = cosmicWrapper ? cosmicWrapper.querySelector('.cosmic-controls') : null;
            const feSection = document.getElementById('flat-earth-section');

            // Helper: Get the relevant containers
            const azControls = document.querySelector('.azimuthal-dashboard .az-controls');
            const azTimeDisplay = document.getElementById('az-time-display');
            const astrolabeControls = document.querySelector('.astrolabe-dashboard .engine-controls');
            const astrolabeToggles = document.querySelector('.astrolabe-dashboard .engine-controls.bottom');
            const astrolabeTitle = document.querySelector('.astrolabe-dashboard .astrolabe-title');
            const astrolabeDivider = document.querySelector('.astrolabe-dashboard .dashboard-divider');
            
            if (cleanViewMode === 0) {
                // ---- ALL VISIBLE ----
                infoSection.style.display = '';
                contentBlocks.forEach(el => {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                });

                // Restore cosmic/celestial visibility
                if (cosmicWrapper) {
                    cosmicWrapper.style.display = isCosmicOrCelestial ? 'flex' : 'none';
                    if (cosmicControls) cosmicControls.style.display = 'flex';
                }
                // Ensure analog clock is visible if celestial mode
                if (mode === 'celestial') {
                    analogClock.style.display = 'flex';
                    analogClock.classList.add('zen-mode');
                } else if (mode === 'cosmic') {
                    analogClock.style.display = 'none';
                }

                // FLAT EARTH – RESTORE CONTROLS FULL (all visible)
                if (feSection) {
                    // 1. Restore the main cosmic controls row
                    const cosmicContainer = feSection.querySelector('.cosmic-controls');
                    if (cosmicContainer) {
                        cosmicContainer.style.display = 'flex'; 
                        cosmicContainer.style.opacity = '1'; // <--- Forces visibility back
                        cosmicContainer.style.pointerEvents = 'auto';
                    }

                    // 2. Restore the coordinates row
                    const feCoordsRow = feSection.querySelector('.fe-coords-row');
                    if (feCoordsRow) {
                        feCoordsRow.style.display = 'flex'; 
                        feCoordsRow.style.opacity = '1'; // <--- Forces visibility back
                        feCoordsRow.style.pointerEvents = 'auto';
                    }

                    // 3. Restore the button group
                    const feBtnGroup = feSection.querySelector('.fe-btn-group');
                    if (feBtnGroup) {
                        feBtnGroup.style.display = 'flex'; 
                        feBtnGroup.style.opacity = '1'; // <--- Forces visibility back
                        feBtnGroup.style.pointerEvents = 'auto';
                    }
                    
                    // 4. Catch any stray inputs or buttons
                    const feControls = feSection.querySelectorAll('#fe-time-display, input, .cosmic-btn, button');
                    feControls.forEach(el => {
                        el.style.display = ''; 
                        el.style.opacity = '1'; // <--- Forces visibility back
                        el.style.pointerEvents = 'auto';
                    });

                    // Keep canvases visible
                    const feCanvas = document.getElementById('fe-canvas');
                    const feStretched = document.getElementById('fe-stretched-canvas');
                    if (feCanvas) feCanvas.style.display = '';
                    if (feStretched) feStretched.style.display = '';
                }

                // ---- SHOW ALL CONTROLS, PRESERVE DASHBOARD STRUCTURAL WIDTH ----
                const controlsToHide = [astrolabeControls, astrolabeToggles, astrolabeTitle, astrolabeDivider, azControls, azTimeDisplay];
                
                controlsToHide.forEach(el => {
                    if (el) {
                        el.style.opacity = '1';
                        el.style.pointerEvents = 'auto';
                    }
                });

                // ---- SHOW STATIC BLOCK ----
                if (staticBlock) {
                    staticBlock.style.opacity = '1';
                    staticBlock.style.pointerEvents = 'auto';
                    staticBlock.style.visibility = 'visible';
                }

                hideBtn.innerText = '🖥️ CLEANVIEW: OFF';
                hideBtn.style.color = '#f6ff00'; // Solid Yellow/Magenta
            } else if (cleanViewMode === 1) {
                // ---- TEXT OFF (info hidden, images visible) ----
                infoSection.style.display = 'none';
                contentBlocks.forEach(el => {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                });

                if (cosmicWrapper) {
                    cosmicWrapper.style.display = isCosmicOrCelestial ? 'flex' : 'none';
                    if (cosmicControls) cosmicControls.style.display = 'flex';
                }
                if (mode === 'celestial') {
                    analogClock.style.display = 'flex';
                    analogClock.classList.add('zen-mode');
                } else if (mode === 'cosmic') {
                    analogClock.style.display = 'none';
                } 
   
                // FLAT EARTH – RESTORE CONTROLS FULL (all visible)
                if (feSection) {
                    // 1. Restore the main cosmic controls row
                    const cosmicContainer = feSection.querySelector('.cosmic-controls');
                    if (cosmicContainer) {
                        cosmicContainer.style.display = 'flex'; 
                        cosmicContainer.style.opacity = '1';
                        cosmicContainer.style.pointerEvents = 'auto';
                    }

                    // 2. Restore the coordinates row
                    const feCoordsRow = feSection.querySelector('.fe-coords-row');
                    if (feCoordsRow) {
                        feCoordsRow.style.display = 'flex'; 
                        feCoordsRow.style.opacity = '1';
                        feCoordsRow.style.pointerEvents = 'auto';
                    }

                    // 3. Restore the button group
                    const feBtnGroup = feSection.querySelector('.fe-btn-group');
                    if (feBtnGroup) {
                        feBtnGroup.style.display = 'flex'; 
                        feBtnGroup.style.opacity = '1';
                        feBtnGroup.style.pointerEvents = 'auto';
                    }
                    
                    // 4. Catch any stray inputs or buttons
                    const feControls = feSection.querySelectorAll('#fe-time-display, input, .cosmic-btn, button');
                    feControls.forEach(el => {
                        el.style.display = ''; 
                        el.style.opacity = '1';
                        el.style.pointerEvents = 'auto';
                    });

                    // Keep canvases visible
                    const feCanvas = document.getElementById('fe-canvas');
                    const feStretched = document.getElementById('fe-stretched-canvas');
                    if (feCanvas) feCanvas.style.display = '';
                    if (feStretched) feStretched.style.display = '';
                }

                // ---- SHOW ALL CONTROLS
                const controlsToHide = [astrolabeControls, astrolabeToggles, astrolabeTitle, astrolabeDivider, azControls, azTimeDisplay];
                
                controlsToHide.forEach(el => {
                    if (el) {
                        el.style.opacity = '1';
                        el.style.pointerEvents = 'auto';
                    }
                });

                // ---- SHOW STATIC BLOCK ----
                if (staticBlock) {
                    staticBlock.style.opacity = '1';
                    staticBlock.style.pointerEvents = 'auto';
                    staticBlock.style.visibility = 'visible';
                }

                hideBtn.innerText = '🖥️CLEANVIEW:(text off)';
                hideBtn.style.color = '#ffb835'; // Orange
            } else { // mode 2: FULL CLEAN VIEW (info + images hidden)
                infoSection.style.display = 'none';
                contentBlocks.forEach(el => {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                });

                // ---- Cosmic / Celestial: keep wheel visible, hide controls ----
                if (cosmicWrapper && isCosmicOrCelestial) {
                    cosmicWrapper.style.display = 'flex';
                    if (cosmicControls) cosmicControls.style.display = 'none'; // hide anchor, time, buttons
                    if (cosmicCanvas) cosmicCanvas.style.display = 'block';
                    // For celestial, keep analog clock visible too
                    if (mode === 'celestial') {
                        analogClock.style.display = 'flex';
                        analogClock.classList.add('zen-mode');
                    } else {
                        analogClock.style.display = 'none';
                    }
                    // Make sure canvas is visible
                } else if (cosmicWrapper) {
                    cosmicWrapper.style.display = 'none';
                } 

                // FLAT EARTH – keep canvases, hide controls AND SHRINK CANVAS
                if (feSection) {
                    // 1. Hide the main cosmic controls row
                    const cosmicContainer = feSection.querySelector('.cosmic-controls');
                    if (cosmicContainer) {
                        cosmicContainer.style.display = 'none'; // Triggers shrink
                    }

                    // 2. Hide the coordinates row
                    const feCoordsRow = feSection.querySelector('.fe-coords-row');
                    if (feCoordsRow) {
                        feCoordsRow.style.display = 'none'; // Triggers shrink
                    }

                    // 3. Hide the button group
                    const feBtnGroup = feSection.querySelector('.fe-btn-group');
                    if (feBtnGroup) {
                        feBtnGroup.style.display = 'none'; // Triggers shrink
                    }
                    
                    // 4. Catch and hide any stray inputs or buttons
                    const feControls = feSection.querySelectorAll('#fe-time-display, input, .cosmic-btn, button');
                    feControls.forEach(el => {
                        el.style.display = 'none'; // Triggers shrink
                    });

                    // Keep canvases visible
                    const feCanvas = document.getElementById('fe-canvas');
                    const feStretched = document.getElementById('fe-stretched-canvas');
                    if (feCanvas) feCanvas.style.display = 'block';
                    if (feStretched) feStretched.style.display = 'block';
                }
                
                // ---- HIDE CONTROLS, PRESERVE DASHBOARD STRUCTURAL WIDTH ----
                const controlsToHide = [astrolabeControls, astrolabeToggles, astrolabeTitle, astrolabeDivider, azControls, azTimeDisplay];
                
                controlsToHide.forEach(el => {
                    if (el) {
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }
                });

                if (staticBlock) {
                    staticBlock.style.opacity = '0';
                    staticBlock.style.pointerEvents = 'none';
                }          

                hideBtn.innerText = '🖥️CLEANVIEW: ON(full)';
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
            EG.store.set('elite-color-profile', themeName);
        }

        // 1. Listen for user changes
        themeSelect.addEventListener('change', (e) => {
            applyColorTheme(e.target.value);
            
            // Play mechanical sound and trigger the ghost notification
            if (typeof playTick === 'function') playTick(true);
            if (typeof triggerGhost === 'function') triggerGhost(`THEME: ${e.target.value.toUpperCase()}`);
        });

        // 2. Load saved theme on page startup
        function loadSavedTheme() {
            const savedTheme = EG.store.get('elite-color-profile') || 'cyan'; // Default to cyan
            themeSelect.value = savedTheme; // Update the dropdown UI
            applyColorTheme(savedTheme);    // Apply the colors
        }

        // Run the loader immediately
        loadSavedTheme();

        let spinnerInterval = null;

        // YouTube API
        function waitForYouTubeAPI() {
            return new Promise((resolve, reject) => {
                // Already loaded?
                if (window.YT && window.YT.Player) {
                    resolve();
                    return;
                }

                const timeout = setTimeout(() => {
                    reject(new Error('YouTube API timeout – check network or ad‑blocker'));
                }, 10000);

                // Save any previously assigned callback (none in code, but safe)
                const previousCallback = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    clearTimeout(timeout);
                    if (previousCallback) previousCallback();
                    resolve();
                };
                EG.loadLib('youtube').catch(() => {});   // script is fetched now, AFTER the callback exists
            });
        }
        // Media state globals
        let youtubePlayer = null;          // Single player instance
        let currentAudio = null;
        // Authorization state (from sudo / login)
        let isAuthorized = false;  // set to true when user says "please" or logs in

        async function createYouTubePlayer(input, containerId) {
            try {
                await waitForYouTubeAPI();
            } catch (err) {
                appendCommandOutput(`⚠️ ${err.message}`, true);
                return false;
            }

            // Robust video ID extractor – handles standard, live, shorts
            function extractVideoId(url) {
                if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
                    return url;
                }
                const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                return match ? match[1] : null;
            }

            const videoId = extractVideoId(input);
            if (!videoId) {
                appendCommandOutput(`⚠️ Invalid YouTube URL or Video ID format.`, true);
                return false;
            }

            // ── TERMINAL CLEANUP: destroy old player so new video appears in fresh container ──
            if (youtubePlayer) {
                try {
                    if (typeof youtubePlayer.stopVideo === 'function') youtubePlayer.stopVideo();
                    if (typeof youtubePlayer.destroy === 'function') youtubePlayer.destroy();
                } catch (e) {
                    // Ignore cleanup errors
                }
                youtubePlayer = null;
            }

            // Ensure the container exists
            const container = document.getElementById(containerId);
            if (!container) {
                appendCommandOutput(`⚠️ Container element not found.`, true);
                return false;
            }

            // Create new player in the fresh container
            try {
                youtubePlayer = new YT.Player(containerId, {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        rel: 0,
                        origin: window.location.origin.replace(/\/$/, '')  // clean trailing slash
                    },
                    events: {
                        onReady: () => {
                            appendCommandOutput('🎬 Signal Locked. Stream initialized.');
                        },
                        onError: (e) => {
                            const errorMap = {
                                2: 'Invalid ID format',
                                5: 'HTML5 player playback failure',
                                100: 'Video not found or marked private',
                                101: 'Embedding restricted by content owner',
                                150: 'Embedding restricted by content owner (video may be private)'
                            };
                            const msg = errorMap[e.data] || `Error Code ${e.data}`;
                            appendCommandOutput(`⚠️ YouTube Interface: ${msg}`, true);
                        }
                    }
                });
                return true;
            } catch (e) {
                console.error('YouTube player creation failed:', e);
                appendCommandOutput(`📡 Neural Link Error: ${e.message}`, true);
                return false;
            }
        }

        // Quick IPTV player – inserts a <video> element into cmd-output
        function playIPTVInTerminal(url, channelName) {
            const containerId = 'iptv-player-' + Date.now();
            const safeName = channelName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

             // Build title with a copy button inline
            const titleHtml = channelName
                ? `<div style="color:var(--accent-color); padding:4px 8px; font-family:monospace; font-size:0.5rem; background:rgba(0,0,0,0.7); display:flex; justify-content:space-between; align-items:center;">
                    <span>📺 ${channelName}</span>
                    <span onclick="navigator.clipboard.writeText('${url}')" 
                            style="cursor:pointer; font-size:1rem; opacity:0.7; transition:0.2s;"
                            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"
                            title="Copy stream URL">📋</span>
                </div>`
                : '';
                
            const html = `
            <div id="${containerId}-wrapper" class="iptv-player-wrapper" style="margin:12px 0; border:1px solid var(--accent-color); border-radius:8px; overflow:hidden; background:#000;">
                ${titleHtml}
                <video id="${containerId}" class="iptv-video" controls autoplay width="100%" style="min-height:200px; display:block; background:#000;"></video>
            </div>`;
            
            appendCommandHTML(html);
            const video = document.getElementById(containerId);
            if (!video) return;

            const showError = (customMsg = null) => {
                const wrapper = document.getElementById(`${containerId}-wrapper`);
                if (wrapper) {
                    wrapper.innerHTML = `
                        <div style="color:#f00; padding:20px; text-align:center; font-family:monospace;">
                            ⚠️ ${customMsg || 'Stream offline or unavailable.'}<br><br>
                            <button onclick="playIPTVInTerminal('${url}','${safeName}')" 
                                    style="background:#333; color:#fff; border:1px solid #f00; cursor:pointer;">
                                RETRY
                            </button>
                            <button onclick="navigator.clipboard.writeText('${url}')" 
                                    style="background:#333; color:#fff; border:1px solid #0f0; cursor:pointer; margin-left:10px;">
                                📋 COPY URL
                            </button>
                        </div>`;
                }
            };

            let hasStartedPlaying = false;

            // 10‑second timeout – only triggers if never started playing
            const timeout = setTimeout(() => {
                if (!hasStartedPlaying) {
                    showError();
                }
            }, 10000);

            // Clear timeout as soon as playback actually begins
            video.addEventListener('playing', () => {
                hasStartedPlaying = true;
                clearTimeout(timeout);
            }, { once: true });

           video.addEventListener('error', () => {
                clearTimeout(timeout);
                showError();
            });

            // ---- FALLBACK FOR NON-HLS STREAMS ----
            const isHlsStream = url.includes('.m3u8') || url.includes('.m3u');

            if (isHlsStream && typeof Hls !== 'undefined' && Hls.isSupported()) {
                // HLS.js for Chrome/Firefox/Edge
                const hls = new Hls({ maxLoadingDelay: 4 });
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        clearTimeout(timeout);
                        showError('HLS fatal error');
                        hls.destroy();
                    }
                });
            } else if (video.canPlayType('application/x-mpegURL') || video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS
                video.src = url;
            } else {
                // Native fallback for MP4, TS, etc.
                video.src = url;
                // If it fails to load, show error after timeout
                const nativeTimeout = setTimeout(() => {
                    if (!hasStartedPlaying && (video.paused || video.readyState < 2)) {
                        showError('Cannot play this stream format.');
                    }
                }, 10000);
                video.addEventListener('playing', () => {
                    hasStartedPlaying = true;
                    clearTimeout(nativeTimeout);
                    clearTimeout(timeout);
                }, { once: true });
            }
        }

        window.playIPTVInTerminal = playIPTVInTerminal;

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
            'thebeat': 'https://listen.181fm.com/181-beat_128k.mp3',

            'skyrock':   'https://icecast.skyrock.net/s/natio_mp3_128k',
            '1mix':      'https://fr3.1mix.co.uk:8000/192hr',   // Trance / EDM
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
            EG.trimOutput(cmdOutput);   // keep the DOM small on always-on screens
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
    
        function typewriterWelcome() {
            const welcomeSpan = document.getElementById('login-welcome');
            if (!welcomeSpan) return;
            
            const text = "WEEEEEEEELLLLLLLCOOOOOOOOOMMMMMMMMME!";
            let i = 0;
            welcomeSpan.textContent = "";  // clear placeholder
            
            function typeNext() {
                if (i < text.length) {
                    welcomeSpan.textContent += text[i];
                    i++;
                    setTimeout(typeNext, 80); // speed
                    // Auto-scroll the terminal output
                    const cmdOut = document.getElementById('cmd-output');
                    if (cmdOut) cmdOut.scrollTop = cmdOut.scrollHeight;
                }
            }
            typeNext();
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

                // Trigger typewriter after the HTML is inserted
                setTimeout(() => typewriterWelcome(), 50);
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

        // Helper to escape HTML special characters
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }

        // ---------- COMMAND MAP (Sync + Async) ----------
        const commands = {
            // ----- SYNC (return string/HTML instantly) -----
            'help': () => {
return `
<strong style="color: var(--accent-color);">⚡ SYSTEM & UTILITY</strong><br>
help, about, clear, echo [text], whoami, ls, sudo,<br>
history, fastfetch, fetchpanel, fetch, neofetch, system,<br>
pingg, date [utc\|iso\|unix], spinner, stopspinner,<br>
timer [seconds], stoptimer, shutdown, nuke :(factory reset)<br>
<br>
<strong style="color: var(--accent-color);">🧠 NEURAL GRAPH</strong><br>
graph : Toggle live neural command graph (Obsidian-style),<br>
brain : Info on how to toggle and Reset the graph<br>
<br>
<strong style="color: var(--accent-color);">🎨 THEME & UI</strong><br>
theme [cyan|magenta|amber|matrix], zoom [in|out|reset],<br>
mode [flipper|midnight|matrix|crimson|cyber|hologram|stealth|off],<br>
flipper subghz, pause,<br>
<br>
<strong style="color: var(--accent-color);">📡 NETWORK & COMMUNICATION</strong><br>
chat mqtt : Global public frequency,<br>
chat p2p : Encrypted peer to peer tunnel,<br>
chat firebase : Persistent mainframe archive,<br>
chat -all : Open all three channels at once,<br>
ping : Start MQTT radar sweep - track active nodes on the subnet<br>
pingstop : Stop the active radar sweep<br>
status : Live connection report (MQTT, P2P, Firebase),<br>
disconnect : Shut down all network links & stop radar,<br>
mesh : Visualize a simulated LoRa mesh network,<br>
aprsmap [fi|direct] : Live amateur radio map (choose source),<br>
netorbit [--green|--red|--violet] : Live world map + packet sniffing<br>
<br>
<strong style="color: var(--accent-color);">📰 NEWS & INFORMATION</strong><br>
news, hackernews, technology, weather[city],<br> 
crypto [coin], news -all (news,hackernews,technology)<br>
<br>
<strong style="color: var(--accent-color);">📚 LEARNING & REFERENCE</strong><br>
define [word], learn, wiki [topic], electronics, moon<br>
engineering, physics, biology, space, cstip, fortune, motd<br>
<br>
<strong style="color: var(--accent-color);">⚙️ ENGINEERING TOOLS</strong><br>
case   :-> interactive diagnostics: resistor calc, color decode, Ohm's Law, voltage divider, capacitor codes<br>
<br>
<strong style="color: var(--accent-color);">🔐 AKASHIC CIPHER SUITE</strong><br>
cipher : Full usage manual for all ciphers (encrypt/decrypt),<br>
encode [msg] : Base64 encode a message,<br>
decode [b64] : Decode a Base64 string,<br>
shift [n] [msg] : Caesar shift (letters & digits wrap),<br>
kryptos [enc|dec] [bin|hex] [text] : Convert text to/from binary or hex stream,<br>
vigenere [enc|dec] [key] [msg] : Vigenère cipher with keyword,<br>
mirror [msg] : Atbash mirror cipher (self-inverse),<br>
stegano [hide|reveal] [cover] [secret] : Steganography,<br>
reverse [msg] : Reverse every character (TENET inversion),<br>
vault [enc|dec] [pw] [msg] : AES-256 encryption (real, password-based, handshake key optional),<br>
handshake [set|clear] [key] : Store or clear a personal encryption key locally<br>
<br>
<strong style="color: var(--accent-color);">🔮 TENET CIPHERS</strong><br>
reverse [message], sator,<br>
palindrome [check|make|square|tenet]<br>
<br>
<strong style="color: var(--accent-color);">🕵️ CYBER OPS</strong><br>
kali, stegano [hide|reveal] [cover] [secret],  wifite,<br>
tag [set|get|clear|view] [key] [value],  airmon [iface],<br>
kali [hash|scan|crack|inject|genkey|dragon|arch],  nmap [target], hashcat,<br>
flipper [subghz|nfc|badusb|off],<br>
raspberry, gpio [status|on|off] [pin]<br>
portal, remoteview, grabimg, fetchpage<br>
<br>
<strong style="color: var(--accent-color);">🧘 WISDOM & SPIRITUALITY</strong><br>
tao, stoic, buddha, bible, verse, koan, sutra, wisdom, yhn,<br>
<br>
<strong style="color: var(--accent-color);">🎭 FUN & ENTERTAINMENT</strong><br>
joke, riddle, poem, game, run (Role Player Game), poetry, anime,<br>
ascii, banner [text], piano, qr [text], homing,<br>
cowsay [text], hack, htop, react, rotate, flow,<br>
radio [channel], tv [channel], play, stop,<br>
iptv all : list all IPTV channels,<br>
iptv [country_code] : Browse IPTV channels by country (us, uk, fr, ca, jp, au, …),<br>
play iptv <url> : Play an IPTV stream in the terminal ,play youtube,<br>
iptv cat : List all available categories, ipset,<br>
iptv cat [category] : Browse by category (animation, news, sports, music…),<br>
<br>
<strong style="color: var(--accent-color);">🖼️ VISUALS & EFFECTS</strong><br>
image, walls, glitch, scroll, intersect, graph, intersectslow, slide,<br>
slide [src|next|prev|pause|resume] : Control the overlay slideshow<br>

clear          :- Wipes the terminal display
stop :-Stop all active media, radio, or IPTV streams.
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

                return `
<div style="display: flex; align-items: center; flex-wrap: wrap; padding: 5px; border-left: 2px solid var(--accent-color); background: rgba(0,255,0,0.02);">
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
            'yhn': () => {
                if (yohanLoaded && yohanChapters.length > 0) {
                    const chapter = yohanChapters[Math.floor(Math.random() * yohanChapters.length)];
                    return `<span style="color: #ffffff;">Chapter ${chapter.chapter}: ${chapter.title}</span><br><span style="color: #ffaa00;">${chapter.text.replace(/\n/g, '<br>')}</span>`;
                }
                return 'Yohan Te Ching not loaded yet.';
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
                    "🍁 You are the observer and the observed.",
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
                setTimeout(() => { enterPerfectMirror(); }, 1500);
                return 'System shutting down... Entering Mirror Mode.';
            },
            'history': () => {
                if (commandHistory.length === 0) return 'No commands in history.';
                const list = commandHistory.map(cmd => `<span style="color: #ffffff;">${cmd}</span>`).join('<br>');
                return `${list}<br><br><span style="color: #888;">💡 Type <b style="color:#00f0ff;">graph</b> to see your visual command constellation</span>`;
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
                                     (__)\\        )\\/\\
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
            'moon': () => {
                const now = new Date();
                const phase = getMoonPhase(now);
                const phaseName = getMoonPhaseName(phase);
                const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
                // Calculate next new/full moon (simple approximation)
                const daysUntilNew = phase < 0.5 ? (1 - phase) * 29.53058867 : (1 - phase) * 29.53058867;
                const daysUntilFull = phase < 0.5 ? (0.5 - phase) * 29.53058867 : (1.5 - phase) * 29.53058867;
                
                return `
<div style="border-left: 2px solid #ffd700; padding: 8px 12px; line-height: 1.6;">
<span style="color: #ffd700; font-weight: bold;">🌙 MOON PHASE 🌙</span><br>
<span style="font-size: 2rem;"><strong>${phaseName}</strong><br>
<span style="color: #aaa; font-weight: bold;">Illumination: ${illumination}%</span><br>
<span style="color: #888; font-size: 0.9rem;">Phase fraction: ${(phase * 100).toFixed(1)}% of cycle</span><br>
<span style="color: #fbff00; font-size: 0.9rem;">≈ ${daysUntilNew.toFixed(1)} days until next New Moon</span><br>
<span style="color: #fcfcfc; font-size: 0.9rem; font-weight: bold;">≈ ${Math.abs(daysUntilFull).toFixed(1)} days until next Full Moon</span>
</div>`;
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
    <span style="color: #0f0;">chat mqtt</span>  : Global public frequency (MQTT)<br>
    <span style="color: #d400ff;">chat p2p</span>  : Encrypted peer-to-peer tunnel (WebRTC)<br>
    <span style="color: #fca311;">chat firebase</span>  : Persistent mainframe archive (Firebase)<br><br>
    <span style="color: #fff;">chat -all</span>  : Open all three channels at once<br>
    <span style="color: #0f0;">ping</span>  : Start MQTT radar sweep - track active nodes on the subnet, Show who's online<br>
    <span style="color: #ffaa00;">pingstop</span>  : Stop the active radar sweep<br>
    <span style="color: #00a2ff;">status</span>  : Show live connection status for all chat protocols<br>
    <span style="color: #ff0077;">disconnect</span>  : Gracefully shut down all network links & stop radar<br>
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
                        // GUARD: Ignore radar pings/pongs and only accept chat traffic
                        if (topic !== 'elitegdx/chat/public') return;
                        
                        const msg = message.toString();
                        if (window._mqttLastSent === msg) { window._mqttLastSent = null; return; }
                        
                        // Safe DOM creation – no innerHTML for untrusted content
                        const msgDiv = document.createElement('div');
                        msgDiv.textContent = msg;   // escapes any HTML
                        logDiv.appendChild(msgDiv);
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
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();   // prevents accidental form submission
                            sendMessage();
                        }
                    });

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
                            const msgDiv = document.createElement('div');
                            msgDiv.textContent = data;   // escapes any HTML
                            logDiv.appendChild(msgDiv);
                            logDiv.scrollTop = logDiv.scrollHeight;
                        })
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
                    msgInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            sendP2PMessage();
                        }
                    });

                    setTimeout(() => msgInput.focus(), 50);
                    return '';
                }
                // 3. Firebase – The Mainframe Archive (Amber #fca311)
                if (sub === 'firebase') {
                    // Remove existing chat UI and detach listener to avoid duplicates
                    const old = document.getElementById('firebase-chat-box');
                    if (old) {
                        if (window._chatRef) window._chatRef.off(); // detach previous listener
                        old.remove();
                    }

                    if (typeof firebase === 'undefined' || !firebase.database) {
                        return '<span style="color:#f00;">⚠️ Firebase not configured. Ensure scripts are loaded in index.html.</span>';
                    }

                    // Create chat container
                    const output = document.getElementById('cmd-output');
                    const container = document.createElement('div');
                    container.id = 'firebase-chat-box';
                    container.style.cssText = 'border: 1px solid #fca311; padding: 10px; margin-top: 10px;';

                    // Log area (message display)
                    const logDiv = document.createElement('div');
                    logDiv.id = 'firebase-log';
                    logDiv.style.cssText = 'height:150px; overflow-y:auto; font-family:monospace; font-size:12px; background:#111; color:#fca311; padding:5px; margin-bottom:8px;';
                    container.appendChild(logDiv);

                    // Input row
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

                    // Unique node ID for this user
                    const nodeId = 'ARCH-' + Math.random().toString(16).slice(2, 5).toUpperCase();

                    // ---------- DATABASE REFERENCES ----------
                    // Write reference – used to push new messages
                    const writeRef = firebase.database().ref('elitegdx/chat');
                    // Read reference – ordered by timestamp, limited to last 50
                    const readRef = writeRef.orderByChild('timestamp').limitToLast(50);
                    window._chatRef = readRef;  // store for cleanup later

                    let lastDate = null;  // track date changes to insert headers

                    // Listen for new messages (and existing ones)
                    readRef.on('child_added', (snap) => {
                        const msg = snap.val();
                        const logDivNow = document.getElementById('firebase-log');
                        if (!logDivNow) return;

                        // Insert date header if the message's date is different from the last one
                        if (msg.date && lastDate !== msg.date) {
                            const dateHeader = document.createElement('div');
                            dateHeader.style.cssText = 'color: #ffaa00; font-weight: bold; margin-top: 8px; border-bottom: 1px solid #fca311;';
                            dateHeader.textContent = `📅 ${msg.date}`;
                            logDivNow.appendChild(dateHeader);
                            lastDate = msg.date;
                        }

                        // Create message div safely (no innerHTML for user content)
                        const msgDiv = document.createElement('div');

                        // Time span
                        const timeSpan = document.createElement('span');
                        timeSpan.style.color = '#888';
                        timeSpan.textContent = `[${msg.time}] `;

                        // Username (bold)
                        const userB = document.createElement('b');
                        userB.style.color = '#fff';
                        userB.textContent = `${msg.user}: `;

                        // Message text (safe)
                        const textNode = document.createTextNode(msg.text);

                        // Assemble
                        msgDiv.appendChild(timeSpan);
                        msgDiv.appendChild(userB);
                        msgDiv.appendChild(textNode);
                        logDivNow.appendChild(msgDiv);
                        logDivNow.scrollTop = logDivNow.scrollHeight;
                    });

                    // Function to send a new message
                    const sendMessage = () => {
                        const text = msgInput.value.trim();
                        if (!text) return;
                        const now = new Date();
                        // Push to the write reference (not the read query)
                        writeRef.push({
                            user: nodeId,
                            text: text,
                            timestamp: now.getTime(),
                            date: now.toLocaleDateString(),
                            time: now.toLocaleTimeString()
                        });
                        msgInput.value = '';
                        msgInput.focus();
                    };

                    sendBtn.addEventListener('click', sendMessage);
                    msgInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            sendMessage();
                        }
                    });

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
            'ping': () => {
                if (window._pingActive) {
                    return '⚠️ Radar sweep already active. Type <span style="color:#ff0077;">pingstop</span> to halt.';
                }

                if (typeof mqtt === 'undefined' || !window._mqttClient || !window._mqttClient.connected) {
                    return '⚠️ Network gateway offline. Type <span style="color:#0f0;">chat mqtt</span> first.';
                }

                const client = window._mqttClient;
                const pingTopic = 'elitegdx/ping';
                const pongTopic = 'elitegdx/pong';
                const userId = 'NODE-' + Math.random().toString(16).slice(2, 6).toUpperCase();
                const activeUsers = new Map();

                window._pingActive = true;

                // ---- Show the online counter ----
                const statusEl = document.getElementById('online-count');
                if (statusEl) {
                    statusEl.style.display = 'inline';
                    statusEl.textContent = '[ 1 NODE ONLINE ]';
                }

                // ---- Create terminal display ----
                const output = document.getElementById('cmd-output');
                const liveDisplay = document.createElement('div');
                liveDisplay.id = 'mqtt-radar-display';
                liveDisplay.style.cssText = 'border: 1px dashed #00ffcc; padding: 10px; margin-top: 10px; background: rgba(0, 255, 204, 0.05); font-family: monospace;';
                liveDisplay.innerHTML = `
                    <div style="color: #00ffcc; font-weight: bold;">📡 RADAR TELEMETRY ACTIVE [ID: ${userId}]</div>
                    <div id="radar-status-text" style="color: #aaa; margin-top: 4px;">Scanning subnet for active nodes...</div>
                `;
                output.appendChild(liveDisplay);

                // ---- Message handler ----
                const messageHandler = (topic, message) => {
                    if (!window._pingActive) return;
                    try {
                        const data = JSON.parse(message.toString());
                        // Only respond to pings from others
                        if (topic === pingTopic && data.userId !== userId) {
                            client.publish(pongTopic, JSON.stringify({ userId, timestamp: Date.now() }));
                        }
                        // Only add pongs from others
                        // NEW GUARD: Register incoming pongs ONLY if they aren't us, and aren't stale
                        if (topic === pongTopic && data.userId !== userId && (Date.now() - data.timestamp) < 3000) {
                            activeUsers.set(data.userId, data.timestamp);
                        }
                    } catch (e) { /* ignore malformed */ }
                };

                client.subscribe(pingTopic);
                client.subscribe(pongTopic);
                client.on('message', messageHandler);

                // ---- Initial ping ----
                client.publish(pingTopic, JSON.stringify({ userId, timestamp: Date.now() }));

                // ---- Ping interval ----
                const pingInterval = setInterval(() => {
                    if (!window._pingActive) return;
                    client.publish(pingTopic, JSON.stringify({ userId, timestamp: Date.now() }));

                    const now = Date.now();
                    for (const [id, ts] of activeUsers) {
                        if (now - ts > 15000) activeUsers.delete(id);
                    }

                    const statusText = document.getElementById('radar-status-text');
                    if (statusText) {
                        const nodeList = Array.from(activeUsers.keys()).join(', ');
                        statusText.innerHTML = `Active Peers (${activeUsers.size}): <span style="color:#fff;">${nodeList || 'No external peers detected'}</span>`;
                    }

                    if (statusEl) {
                        statusEl.textContent = `[ ${activeUsers.size + 1} NODES ACTIVE ]`;
                    }
                }, 5000);

                // ---- Stop function ----
                window._stopPing = () => {
                    window._pingActive = false;
                    clearInterval(pingInterval);
                    client.unsubscribe(pingTopic);
                    client.unsubscribe(pongTopic);
                    client.removeListener('message', messageHandler);

                    // Hide counter
                    if (statusEl) {
                        statusEl.style.display = 'none';
                        statusEl.textContent = '[ RADAR OFFLINE ]';
                    }

                    const display = document.getElementById('mqtt-radar-display');
                    if (display) {
                        display.style.borderColor = '#ff0077';
                        display.innerHTML = '<span style="color: #ff0077;">🛑 RADAR TELEMETRY HALTED</span>';
                    }

                    window._stopPing = null;
                    return '🛑 Radar sweep terminated. All ping listeners detached.';
                };

                return '';
            },
            'pingstop': () => {
                if (window._stopPing) {
                    const result = window._stopPing();
                    window._stopPing = null;
                    return result;
                }
                return '⚠️ No active radar sweep to stop.';
            },
            'disconnect': () => {
                // STOP RADAR PING
                if (window._stopPing) {
                    window._stopPing();
                    window._stopPing = null;
                }
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
                return '🔌 All network links terminated. Radar disabled. Type <span style="color:#0f0;">chat</span> to reconnect.';
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
<span style="color: #ffaa00;">[ KERNEL: DEBIAN STABLE]</span>
                        </pre>`,

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
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('encode hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">encode hello</span><br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('decode aGVsbG8')" style="color: #0f0; cursor:pointer; text-decoration:underline;">decode aGVsbG8=</span><br>
    <span style="color: #888;">The commands are exact mirrors. No key needed.</span><br>
    <br>

    <strong style="color: #0f0;">🟢 Caesar Shift (shift)</strong><br>
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('shift 3 hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">shift 3 hello</span> → khoor<br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('shift -3 khoor')" style="color: #0f0; cursor:pointer; text-decoration:underline;">shift -3 khoor</span> → hello<br>
    <span style="color: #888;">Use the negative of the encryption number. Digits wrap as well.</span><br>
    <br>

    <strong style="color: #0f0;">🟡 Vigenère (vigenere)</strong><br>
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('vigenere enc secret hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">vigenere enc secret hello</span><br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('vigenere dec secret')" style="color: #0f0; cursor:pointer; text-decoration:underline;">vigenere dec secret &lt;ciphertext&gt;</span><br>
    <span style="color: #888;">You must use the same keyword and change the first argument to 'dec'.</span><br>
    <br>

    <strong style="color: #0f0;">🟣 Atbash Mirror (mirror)</strong><br>
    <span style="color: #fff;">Encrypt &amp; Decrypt:</span> <span onclick="fillInput('mirror hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">mirror hello</span> → svool (then mirror again to get back)<br>
    <span style="color: #888;">It's its own inverse – no extra step needed.</span><br>
    <br>

    <strong style="color: #ff0000;">🔴 Reverse Cipher (reverse)</strong><br>
    <span style="color: #fff;">Encrypt &amp; Decrypt:</span> <span onclick="fillInput('reverse hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">reverse hello</span> → olleh (reverse again to get back)<br>
    <span style="color: #888;">It's its own inverse – no extra step needed. Try "tenet" for a surprise.</span><br>
    <br>

    <strong style="color: #0f0;">🔴 AES‑256 Vault (vault)</strong><br>
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('vault enc mypassword hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">vault enc mypassword hello</span><br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('vault dec mypassword')" style="color: #0f0; cursor:pointer; text-decoration:underline;">vault dec mypassword &lt;hex_ciphertext&gt;</span><br>
    <span style="color: #888;">You can omit the password if you've stored one with <span style="color: #0f0;">handshake set mykey</span>.<br>
    The ciphertext includes a random IV – safe to reuse the same key.</span><br>
    <br>

    <strong style="color: #0f0;">⚫ Kryptos Stream (kryptos)</strong><br>
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('kryptos bin hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">kryptos bin hello</span> → 01101000 01100101 ...<br>
    <span style="color: #fff;">Encrypt:</span> <span onclick="fillInput('kryptos hex hello')" style="color: #0f0; cursor:pointer; text-decoration:underline;">kryptos hex hello</span> → 68 65 6C 6C 6F<br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('kryptos dec bin')" style="color: #0f0; cursor:pointer; text-decoration:underline;">kryptos dec bin 01101000 01100101 ...</span> → hello<br>
    <span style="color: #fff;">Decrypt:</span> <span onclick="fillInput('kryptos dec hex')" style="color: #0f0; cursor:pointer; text-decoration:underline;">kryptos dec hex 68 65 6C 6C 6F</span> → hello<br>
    <br>

    <strong style="color: #0f0;">🤝 Handshake (handshake)</strong><br>
    <span style="color: #fff;">Store a password:</span> <span onclick="fillInput('handshake set mysecret')" style="color: #0f0; cursor:pointer; text-decoration:underline;">handshake set mysecret</span><br>
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
                    EG.store.set('akashic_handshake_key', key);
                    return '🤝 Handshake key stored locally.';
                }
                if (cmd === 'clear') {
                    EG.store.remove('akashic_handshake_key');
                    return '🤝 Handshake key cleared.';
                }
                return `⚠️ Unknown subcommand. Use 'set [key]' or 'clear'.`;
            },

            // 9. VAULT – AES‑256‑GCM via Web Crypto (with handshake fallback)
            'vault': async (args) => {
                // --- argument parsing (unchanged) ---
                let pw, mode, text;
                if (args.length === 2) {
                    const storedKey = EG.store.get('akashic_handshake_key');
                    if (!storedKey) return '⚠️ No password provided and no handshake key set.';
                    mode = args[0];
                    text = args[1];
                    pw = storedKey;
                } else if (args.length >= 3) {
                    mode = args[0];
                    pw = args[1];
                    text = args.slice(2).join(' ');
                } else {
                    return `
Usage: vault [enc|dec] [password] [message/hex]<br>

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
            'stegano': (args) => {
                // Helper to parse arguments that might be wrapped in quotes
                const parseArgs = (argArray) => {
                    const fullString = argArray.join(' ');
                    const matches = fullString.match(/"([^"]+)"|'([^']+)'|(\S+)/g);
                    return matches ? matches.map(m => m.replace(/^['"]|['"]$/g, '')) : [];
                };

                const parsed = parseArgs(args);
                if (parsed.length < 2) {
                    return `
                    Usage:<br>
<span style="color: #0ff;">stegano hide "Public Text" "Secret Message"</span><br>
<span style="color: #0ff;">stegano reveal "Public Text"</span>`;
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
    <span style="color: #0f0; font-weight: bold;">[ STEGANOGRAPHY: INJECTION SUCCESSFUL ]</span><br>
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
                    const db = JSON.parse(EG.store.get('akashic_tags') || '{}');
                    db[key] = value;
                    EG.store.set('akashic_tags', JSON.stringify(db));
                    return `🔖 Tag stored: "${key}" → <span style="color: #ff00ff;">[HIDDEN]</span>`;
                }

                if (cmd === 'get') {
                    if (!key) return 'Usage: tag get [key]';
                    const db = JSON.parse(EG.store.get('akashic_tags') || '{}');
                    if (db[key]) return `🔖 Secret for "${key}": <span style="color: #0f0;">${db[key]}</span>`;
                    return '<span style="color: #888;">No secret tagged under that word.</span>';
                }

                if (cmd === 'clear') {
                    if (!key) return 'Usage: tag clear [key]  (or "all" to wipe everything)';
                    if (key === 'all') {
                        EG.store.remove('akashic_tags');
                        return '🗑️ All tags erased.';
                    }
                    const db = JSON.parse(EG.store.get('akashic_tags') || '{}');
                    delete db[key];
                    EG.store.set('akashic_tags', JSON.stringify(db));
                    return `🗑️ Tag "${key}" removed.`;
                }

                if (cmd === 'view') {
                    const db = JSON.parse(EG.store.get('akashic_tags') || '{}');
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
                    //  Stop any currently playing audio, then start looping the deeptown arcade theme
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio = null;
                    }
                    currentAudio = new Audio(audioPresets['deeptown']);
                    currentAudio.loop = true; 
                    currentAudio.play().catch(e => console.warn('Arcade audio failed:', e));

                    return `
<div style="border: 1px solid #ff8200; padding: 10px; text-align: center;">
    <b style="color: #ff8200;">[ J_OS ARCADE MODULE ]</b><br>
    <div style="margin: 5px 0;">
        <img src="images/PokemonGo.jpeg" style="max-width: 220px; height: auto; border-radius: 8px; margin-bottom: 5px;">
    </div>
    <div>
        <span onclick="fillInput('game snake')" style="color: #fbff00; cursor:pointer; text-decoration:underline;">game snake</span> : Classic Canvas Snake (Keyboard / Swipe / D‑pad)<br>
        <span onclick="fillInput('game dodge')" style="color: #fca311; cursor:pointer; text-decoration:underline;">game dodge</span> : Gyroscope Obstacle Avoidance<br>
        <span onclick="fillInput('game marble')" style="color: #ef476f; cursor:pointer; text-decoration:underline;">game marble</span> : Gyroscope Ball Maze<br>
        <span onclick="fillInput('game asteroids')" style="color: #fb00ff; cursor:pointer; text-decoration:underline;">game asteroids</span> : Space Rock Dodger (D‑pad)<br>
        <span onclick="fillInput('game flappy')" style="color: #09ff00; cursor:pointer; text-decoration:underline;">game flappy</span> : Cyber‑Bird Flap (Tap to Flap)<br>
        <span onclick="fillInput('game memory')" style="color: #ff0000; cursor:pointer; text-decoration:underline;">game memory</span> : Emoji memory match (Tap cards to flip)<br>
        <span onclick="fillInput('game dino')" style="color: #00d0ff; cursor:pointer; text-decoration:underline;">game dino</span> : Cyber‑packet runner (avoid firewall obstacles)<br>
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
    <span onclick="fillInput('palindrome check racecar')" style="color: #0f0; cursor:pointer; text-decoration:underline;">palindrome check [word]</span>  :Verify if a word reads the same backward<br>
    <span onclick="fillInput('palindrome square')" style="color: #0f0; cursor:pointer; text-decoration:underline;">palindrome square</span>  :Display the ancient Sator Square<br>
    <span onclick="fillInput('palindrome tenet')" style="color: #0f0; cursor:pointer; text-decoration:underline;">palindrome tenet</span> :the TENET principle<br>
    <span onclick="fillInput('palindrome make ')" style="color: #0f0; cursor:pointer; text-decoration:underline;">palindrome make [word]</span> :Mirror text into a palindrome <br>
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
<span style="color: #ccc;">A 4x4 grid where every row and column spells a word.</span><br><br>
<span style="color: #0f0;">sator new</span>  :Start a puzzle<br>
<span style="color: #0f0;">sator A1 S</span>  :Place letter S at column A, row 1<br>
<span style="color: #0f0;">sator reveal</span>  :Show the solution<br>
<span style="color: #0f0;">palindrome square</span>  :View the SATOR square and the Pater Noster anagram<br>
<br>
<span style="color: #ff00aa;">Words: SAGA, AREA, GERO, AAOA (Latin, [SAGA] tale, [AREA] open space, [GERO] I carry, [AAOA] a name)</span>
                    </div>`;
            },
            'banner': (args) => {
                const text = args.join(' ').trim();
                if (!text) return '⚠️ <b>Usage:</b> banner [text] (max 20 characters)';
                if (text.length > 20) return '⚠️ Text too long (max 20 characters).';

                // ---- The ASCII font ----
                const asciiFont = {
                    'A': ['  ███  ', ' ██ ██ ', ' █████ ', ' ██ ██ ', ' ██ ██ '],
                    'B': [' ████  ', ' ██ ██ ', ' ████  ', ' ██ ██ ', ' ████  '],
                    'C': ['  ████ ', ' ██    ', ' ██    ', ' ██    ', '  ████ '],
                    'D': [' ████  ', ' ██ ██ ', ' ██ ██ ', ' ██ ██ ', ' ████  '],
                    'E': [' █████ ', ' ██    ', ' ████  ', ' ██    ', ' █████ '],
                    'F': [' █████ ', ' ██    ', ' ████  ', ' ██    ', ' ██    '],
                    'G': ['  ████ ', ' ██    ', ' ██ ██ ', ' ██ ██ ', '  ████ '],
                    'H': [' ██ ██ ', ' ██ ██ ', ' █████ ', ' ██ ██ ', ' ██ ██ '],
                    'I': [' █████ ', '   ██  ', '   ██  ', '   ██  ', ' █████ '],
                    'J': ['    ██ ', '    ██ ', '    ██ ', ' ██ ██ ', '  ███  '],
                    'K': [' ██ ██ ', ' ████  ', ' ███   ', ' ████  ', ' ██ ██ '],
                    'L': [' ██    ', ' ██    ', ' ██    ', ' ██    ', ' █████ '],
                    'M': [' ██ ██ ', ' █████ ', ' ██ ██ ', ' ██ ██ ', ' ██ ██ '],
                    'N': [' ██ ██ ', ' █████ ', ' █████ ', ' ██ ██ ', ' ██ ██ '],
                    'O': ['  ███  ', ' ██ ██ ', ' ██ ██ ', ' ██ ██ ', '  ███  '],
                    'P': [' ████  ', ' ██ ██ ', ' ████  ', ' ██    ', ' ██    '],
                    'Q': ['  ███  ', ' ██ ██ ', ' ██ ██ ', ' █████ ', '  ████ '],
                    'R': [' ████  ', ' ██ ██ ', ' ████  ', ' ████  ', ' ██ ██ '],
                    'S': ['  ████ ', ' ██    ', '  ███  ', '    ██ ', ' ████  '],
                    'T': [' █████ ', '   ██  ', '   ██  ', '   ██  ', '   ██  '],
                    'U': [' ██ ██ ', ' ██ ██ ', ' ██ ██ ', ' ██ ██ ', '  ███  '],
                    'V': [' ██ ██ ', ' ██ ██ ', ' ██ ██ ', '  ███  ', '   █   '],
                    'W': [' ██ ██ ', ' ██ ██ ', ' ██ ██ ', ' █████ ', ' ██ ██ '],
                    'X': [' ██ ██ ', '  ███  ', '   █   ', '  ███  ', ' ██ ██ '],
                    'Y': [' ██ ██ ', ' ██ ██ ', '  ███  ', '   ██  ', '   ██  '],
                    'Z': [' █████ ', '    ██ ', '   ██  ', '  ██   ', ' █████ '],
                    '0': ['  ███  ', ' ██ ██ ', ' ██ ██ ', ' ██ ██ ', '  ███  '],
                    '1': ['  ███  ', '   ██  ', '   ██  ', '   ██  ', ' █████ '],
                    '2': [' ████  ', '    ██ ', '  ███  ', ' ██    ', ' █████ '],
                    '3': [' ████  ', '    ██ ', '  ███  ', '    ██ ', ' ████  '],
                    '4': [' ██ ██ ', ' ██ ██ ', ' █████ ', '    ██ ', '    ██ '],
                    '5': [' █████ ', ' ██    ', ' ████  ', '    ██ ', ' ████  '],
                    '6': ['  ███  ', ' ██    ', ' ████  ', ' ██ ██ ', '  ███  '],
                    '7': [' █████ ', '    ██ ', '   ██  ', '  ██   ', '  ██   '],
                    '8': ['  ███  ', ' ██ ██ ', '  ███  ', ' ██ ██ ', '  ███  '],
                    '9': ['  ███  ', ' ██ ██ ', '  ████ ', '    ██ ', '  ███  '],
                    ' ': ['       ', '       ', '       ', '       ', '       '],
                    '?': ['  ███  ', ' ██ ██ ', '   ██  ', '       ', '   ██  '],
                    '!': ['   █   ', '   █   ', '   █   ', '       ', '   █   '],
                    '.': ['       ', '       ', '       ', '       ', '   █   '],
                    '-': ['       ', '       ', ' █████ ', '       ', '       ']
                };

                const upperText = text.toUpperCase();
                const fontHeight = 5;
                let outputLines = Array(fontHeight).fill('');

                for (let i = 0; i < upperText.length; i++) {
                    const char = upperText[i];
                    const charArt = asciiFont[char] || asciiFont['?'];
                    for (let row = 0; row < fontHeight; row++) {
                        outputLines[row] += charArt[row] + '  ';   // extra spacing between letters
                    }
                }

                const banner = outputLines.join('\n');
                return `<pre style="color: var(--accent-color); text-shadow: 0 0 4px var(--accent-color); line-height: 1.2;">${banner}</pre>`;
            },
            'graph': () => {
                if (window._graphActive) {
                    stopGraph();
                    return '🧠 Neural graph paused.';
                } else {
                    startGraph();
                    return '🧠 Neural graph activated. Visualising command history.';
                }
            },
            'brain': (args) => {
                if (args[0] === 'clear') {
                    nodes = [];
                    links = [];
                    saveGraph();
                    if (window._graphActive) { stopGraph(); startGraph(); }
                    return '🧠 Neural pathways purged.';
                }
                if (args[0] === 'layout') {
                    const layouts = ['free', 'circle', 'grid', 'fibonacci'];
                    let target;
                    const arg = args[1];
                    if (arg && /^[1-4]$/.test(arg)) {
                        // direct number (1‑based)
                        target = parseInt(arg) - 1;
                    } else {
                        // cycle forward
                        const currentIdx = layouts.indexOf(graphLayout);
                        target = (currentIdx + 1) % layouts.length;
                    }
                    graphLayout = layouts[target];
                    if (graphLayout === 'free') {
                        nodes.forEach(node => {
                            node.vx = (Math.random() - 0.5) * 2;   // small velocity
                            node.vy = (Math.random() - 0.5) * 2;
                        });
                    }
                    return `🧠 Graph layout switched to <b>${graphLayout.toUpperCase()}</b>.`;
                }
                return `🧠 <b>NEURAL GRAPH COMMANDS</b><br>
        <span style="color:#0f0;">graph</span>  -Toggle the live graph overlay<br>
        <span style="color:#0f0;">brain clear</span>  -Delete all nodes and connections<br>
        <span style="color:#0f0;">brain layout [1-4]</span>  -Freeform(1), Circle(2), Grid(3), Fibonacci(4)<br>
        <span style="color:#0f0;">brain layout</span>  -Cycle to next layout`;
            },
           'slide': (args) => {
                const sub = args[0]?.toLowerCase();

                // No sub-command → toggle slideshow on/off
                if (!sub) {
                    if (window._slideshowActive) {
                        stopSlideshow();
                        return '🖼️ Slideshow stopped.';
                    } else {
                        startSlideshow();
                        return '🖼️ Slideshow started. Use <span style="color:#0f0;">slide next</span> to skip, <span style="color:#0f0;">slide pause</span> to pause.';
                    }
                }

                // Known sub-commands
                if (sub === 'src') {
                    const target = args[1]?.toLowerCase();
                    if (target === 'gallery' || target === 'default') {
                        slideshowSource = galleryImages;
                        return '🖼️ Slideshow source set to <b>gallery</b>.';
                    } else if (target === 'indie' || target === 'independent' || target === 'bg') {
                        slideshowSource = independentBgImages;
                        return '🖼️ Slideshow source set to <b>independent backgrounds</b>.';
                    } else {
                        return '⚠️ Usage: <b>slide src [gallery|indie]</b>';
                    }
                }
                else if (sub === 'next') {
                    if (window._slideshowActive) {
                        advanceSlideshow();
                        return '⏭️ Advanced to next image.';
                    }
                    return 'Slideshow is not running. Type <span style="color:#0f0;">slide</span> to start.';
                }
                else if (sub === 'prev') {
                    if (window._slideshowActive) {
                        previousSlideshow();
                        return '⏮️ Went back to previous image.';
                    }
                    return 'Slideshow is not running. Type <span style="color:#0f0;">slide</span> to start.';
                }
                else if (sub === 'pause') {
                    if (window._slideshowPaused) return 'Slideshow already paused.';
                    window._slideshowPaused = true;
                    return '⏸️ Slideshow paused. Type <span style="color:#0f0;">slide resume</span> to continue.';
                }
                else if (sub === 'resume') {
                    if (!window._slideshowPaused) return 'Slide is not paused.';
                    window._slideshowPaused = false;
                    return '▶️ Slideshow resumed.';
                }
                else if (sub === 'status' || sub === 'info') {
                    const sourceName = (slideshowSource === galleryImages) ? 'Gallery' : 'Independent BG';
                    const state = window._slideshowActive
                        ? (window._slideshowPaused ? '⏸️ Paused' : '▶️ Running')
                        : '⏹️ Stopped';
                    return `🖼️ <b>Slideshow Status:</b> ${state}<br>📂 <b>Source:</b> ${sourceName}`;
                }
                else {
                    // Unknown sub-command
                    return `⚠️ Unknown sub-command: <b>${sub}</b>. Usage: slide [src|next|prev|pause|resume|status]`;
                }
            },
            'flow': async () => {
                const thoughts = [
                    { tag: "PHYSICS_OVERRIDE",   text: "What if gravity worked sideways for an hour?" },
                    { tag: "SENSORY_HACK",       text: "Design a secret language that only uses colours." },
                    { tag: "NEURAL_ARCHIVE",     text: "Imagine a device that records dreams. What does it look like?" },
                    { tag: "TEMPORAL_COMMS",     text: "How would you explain the internet to a medieval monk?" },
                    { tag: "KINETIC_LOGIC",      text: "Invent a new sport that combines chess and parkour." },
                    { tag: "URBAN_FRACTAL",      text: "Describe a city that exists entirely inside a single building." },
                    { tag: "MEMORY_ECONOMICS",   text: "What if memories were traded like currency?" },
                    { tag: "COGNITIVE_NUTRITION",text: "Create a recipe for a dish that grants temporary telepathy." },
                    { tag: "EMOTION_METRICS",    text: "Design a clock that measures happiness instead of time." },
                    { tag: "ELEMENTAL_DIALOGUE", text: "If you could talk to the wind, what would you ask?" },
                    { tag: "HARMONIC_GOVERNANCE",text: "Build a world where music is the only form of law." },
                    { tag: "SHADOW_SYNTAX",      text: "What would happen if everyone's shadow had a personality?" },
                    { tag: "VOID_AESTHETICS",    text: "Write a haiku about a colour that doesn't exist yet." },
                    { tag: "PARADOX_ARCHIVE",    text: "Imagine a library that contains every book never written." },
                    { tag: "FLORA_OBSERVATION",  text: "How would a tree describe a human?" },
                    { tag: "ZEN_PROTOCOL",       text: "Create a holiday that celebrates silence." },
                    { tag: "TRUTH_TOPOGRAPHY",   text: "What if every lie you told turned into a visible tattoo?" },
                    { tag: "EMPATHIC_HARDWARE",  text: "Design a friendship bracelet that transmits emotions." },
                    { tag: "LIGHT_STORAGE",      text: "How would you store a sunset in a bottle?" }
                ];

                const t = thoughts[Math.floor(Math.random() * thoughts.length)];
                const output = document.getElementById('cmd-output');

                // Create the container
                const container = document.createElement('div');
                container.style.borderLeft = "2px solid #ffaa00";
                container.style.paddingLeft = "10px";
                container.style.margin = "10px 0";
                output.appendChild(container);

                // Print the header instantly
                container.innerHTML = `
                    <span style="color: #ffaa00; font-size: 0.8rem; letter-spacing: 1px;">[ EXTRACTING THOUGHT SEED // SECTOR: ${t.tag} ]</span><br>
                    <span id="flow-text-${Date.now()}" style="color: #fff; font-size: 1.1rem; font-style: italic;"></span>
                `;

                const textSpan = container.lastElementChild;

                // Typewriter / thought-forming effect
                for (let i = 0; i < t.text.length; i++) {
                    textSpan.innerHTML += t.text[i];

                    // Use existing audio engine for soft ticks
                    if (typeof playTick === 'function' && i % 2 === 0) playTick();

                    // Randomised typing speed – feels like a human thinking
                    await new Promise(r => setTimeout(r, 30 + Math.random() * 60));

                    // Auto‑scroll
                    output.scrollTop = output.scrollHeight;
                }

                // Final closing statement
                return `<span style="color: #555; font-size: 0.8rem;">// Let the concept compile in your mind. //</span>`;
            },
            'run': () => {
                // Stop other audio sources
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }
                if (window._rpg.active) return 'You are already in an RPG session. Type exit to leave.';
                window._rpg.active = true;
                window._rpg.inventory = [];
                window._rpg.health = 100;
                window._rpg.chapter = chapter1;

                // Start looping RPG ambiance (deeptown → elite → cote)
                stopRpgAudio();  // safety
                startRpgPlaylist();

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
            'play': async (args) => {
                // Show help when no arguments or just "play"
                if (args.length === 0) {
                    return `
<strong style="color: #00f0ff;">🎬 PLAY COMMAND</strong><br>
<span style="color: #888;">Usage:</span><br>
<span style="color: #0f0;">play youtube &lt;id_or_url&gt;</span>  -Embed YouTube player<br>
<span style="color: #0f0;">play audio &lt;url&gt;</span>  -Play direct audio file (MP3, OGG, WAV)<br>
<span style="color: #0f0;">play audio &lt;preset&gt;</span>  -Play a built-in sound<br>
<span style="color: #0f0;">play iptv <url></span> -Play an IPTV stream in the terminal<br>
<br>
<span style="color: #888;">Built-in audio presets (click to fill command):</span><br>
<span style="color: #ff4d00; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio siren')">siren</span>, 
<span style="color: #00d0ff; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio bell')">bell</span>, 
<span style="color: #ffdd00; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio gong')">gong</span>, 
<span style="color: #00a6ff; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio ascension')">ascension</span>, 
<span style="color: #d400ff; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio medit')">medit</span>, 
<span style="color: #00ff4c; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio elite')">elite</span>, 
<span style="color: #ffff00; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio deeptown')">deeptown</span>, 
<span style="color: #bababa; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio wot')">WoT</span>, 
<span style="color: #ff0084; cursor:pointer; text-decoration:underline;" onclick="fillInput('play audio wotsedai')">wotsedai</span><br>
<br>
<span style="color: #888;">Examples:</span><br>
play youtube dQw4w9WgXcQ<br>
play yt url<br>
play audio https://example.com/song.mp3<br>
play audio bell
    `;


                }

                const type = args[0].toLowerCase();

                // ----- YOUTUBE -----
                if (type === 'youtube' || type === 'yt') {
                    const input = args[1];
                    if (!input) return '⚠️ Please provide a YouTube URL or ID.';

                    const containerId = 'yt-player-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                    
                    // 1. Create and append the container HTML immediately
                    const containerHtml = `
                        <div class="yt-video-container" style="margin: 12px 0; border: 1px solid var(--accent-color); border-radius: 8px; overflow: hidden; background: #000; box-shadow: 0 0 15px rgba(0,255,0,0.2); height: 250px; width: 100%;">
                            <div id="${containerId}" style="width: 100%; height: 100%;"></div>
                        </div>
                    `;
                    appendCommandHTML(containerHtml);
                    
                    // 2. Now the container exists in the DOM – create the player
                    const success = await createYouTubePlayer(input, containerId);
                    
                    if (success) {
                        return '<span style="color: #00ffff;">📡 FEED ESTABLISHED</span>';
                    } else {
                        return ''; // errors already shown via appendCommandOutput
                    }
                }

                // ----- AUDIO (preset or URL) -----
                 if (type === 'audio') {
                    // Separate the flag from the rest
                    let audioArgs = args.slice(1);            // everything after "audio"
                    let loop = false;

                    const loopIdx = audioArgs.indexOf('-loop');
                    if (loopIdx !== -1) {
                        loop = true;
                        audioArgs.splice(loopIdx, 1);        // remove the flag
                    }

                    // Determine what to play
                    const first = audioArgs[0] || '';
                    const presetKey = first.toLowerCase();   // case‑insensitive lookup
                    let url;
                    if (audioPresets[presetKey]) {
                        url = audioPresets[presetKey];            // known preset
                    } else {
                        url = audioArgs.join(' ');           // treat remainder as a custom URL
                        if (!url) return '⚠️ Please provide an audio URL or a preset name.<br>type "play" to see how to use it';
                    }

                    // Stop any previously playing audio
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio = null;
                    }

                    currentAudio = new Audio(url);
                    if (loop) currentAudio.loop = true;      // <-- loop flag applied
                    currentAudio.play().catch(e => {
                        appendCommandOutput(`⚠️ Audio playback failed: ${e.message}`, true);
                    });
                    // Display the name as originally typed
                    const displayName = audioPresets[presetKey] ? first : (url.length > 50 ? url.substring(0, 47) + '...' : url);
                    return `<div class="active-transmission">🔊 NEURAL AUDIO STREAM STARTED: ${displayName}${loop ? ' (loop)' : ''}</div>`;

                }

                if (type === 'iptv') {
                    const url = args[1];
                    if (!url) return '⚠️ Please provide an IPTV stream URL.';
                    const containerId = 'iptv-player-' + Date.now();
                    return `
                    <div style="margin:12px 0; border:1px solid var(--accent-color); border-radius:8px; overflow:hidden; background:#000;">
                        <video id="${containerId}" controls autoplay width="100%" style="min-height:200px;">
                            <source src="${url}" type="application/x-mpegURL">
                        </video>
                    </div>`;
                }

                return '⚠️ Unknown type. Use "play youtube" or "play audio".';
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
                
                // Stop global audio (presets + custom URLs)
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    currentAudio = null;
                }

                // Stop homing continuous tone
                if (typeof stopContinuousTone === 'function') {
                    stopContinuousTone();
                }

                // RPG playlist
                if (typeof stopRpgAudio === 'function') {
                    stopRpgAudio();
                }

                // Stop all IPTV video elements – fully stop and remove sources
                document.querySelectorAll('video').forEach(v => {
                    v.pause();
                    // Remove all <source> children
                    v.querySelectorAll('source').forEach(s => s.remove());
                    v.removeAttribute('src');
                    //v.load();   // resets the element, but without src it won't play
                });

                return '🔇 All transmissions silenced.';
            },
            'radio': (args) => {
                // No arguments – show available channels
                if (!args || args.length === 0) {
                    let channelList = '';
                    for (const ch in stations) {
                        channelList += `<span onclick="fillInput('radio ${ch}')" style="cursor:pointer; text-decoration:underline; color:#ffdd00;">${ch}</span>  `;
                    }
                    return `
<strong style="color: #00ffff;">📻 AKASHIC RADIO FREQUENCIES</strong><br>
<span style="color: #888;">Available channels:</span><br>
${channelList}<br>
<br>
<span style="color: #888;">Usage:</span> <span style="color: #00f7ff;">radio &lt;channel&gt;</span><br>
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

                    // 1. Check radio stations
                    for (const ch in stations) {
                        if (src.includes(stations[ch])) {
                            feedName = ch.toUpperCase();
                            break;
                        }
                    }

                    // 2. Check audio presets (local files)
                    if (feedName === src) {
                        for (const preset in audioPresets) {
                            if (src.endsWith(audioPresets[preset])) {
                                feedName = preset.toUpperCase();
                                break;
                            }
                        }
                    }

                    // 3. Fallback: if still a URL, show only the filename
                    if (feedName === src) {
                        const parts = src.split('/');
                        const filename = parts[parts.length - 1] || src;
                        feedName = filename.length > 30 ? filename.substring(0, 27) + '...' : filename;
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
                    'nasa':       { name: 'NASA TV', type: 'youtube', url: '0FBiyFpV__g' },
                    'iss-earth':  { name: 'Earth from Space (ISS)', type: 'youtube', url: 'vytmBNhc9ig' },
                    'science':    { name: 'Science Channel', type: 'youtube', url: 'g0JewZCbRPA' },

                    // Entertainment (embeddable)
                    'lofi':       { name: 'Lofi Girl', type: 'youtube', url: 'jfKfPfyJRdk' },
                    'gumball':    { name: 'Amazing World of Gumball', type: 'youtube', url: 'nIyaCRNwxhU' },

                    'kpop':         { name: 'K-POP 24/7',          type: 'youtube', url: 'tU2bRjRZx20' },
                    'topgear':      { name: 'Top Gear Classic',    type: 'youtube', url: 'Xw2Xu5wKQVw' },
                    'rickandmorty': { name: 'Rick and Morty Live', type: 'youtube', url: 'iiRNq1sxr0U' }
                };

                if (!args || args.length === 0) {
                    let channelList = '';
                    for (const ch in channels) {
                        channelList += `<span onclick="fillInput('tv ${ch}')" style="cursor:pointer; text-decoration:underline; color:#ffdd00;">${ch}</span>  `;
                    }
                    return `
<strong style="color: #00ffff;">📺 AKASHIC VISUAL UPLINK</strong><br>
<span style="color: #888;">Available feeds:</span><br>
${channelList}<br><br>
<span style="color: #00d0ff;">Usage:</span> <span style="color: #0f0;">tv &lt;channel&gt;</span><br>
<span style="color: #888;">Example:</span> tv gumball
                    `;
                }

                const choice = args[0].toLowerCase();
                const channel = channels[choice];
                if (!channel) return `⚠️ Feed "${choice}" not found. Type <span style="color: #0f0;">tv</span> to see channels.`;

                appendCommandOutput(`📡 Tuning visual feed to ${channel.name}...`, false);
                return commands['play'](['youtube', channel.url]);
            },
            'iptv': async (args) => {
                const sub = args[0]?.toLowerCase();
                let page = 1;
                const perPage = 40;

                // channel names/URLs come from a THIRD-PARTY playlist, so clicks are handled by ONE delegated listener
                // that reads data-* attributes — never by inline onclick strings built from that text
                if (!window.__iptvDelegate) {
                    window.__iptvDelegate = true;
                    cmdOutput.addEventListener('click', (e) => { const el = e.target.closest('.iptv-ch'); if (el) playIPTVInTerminal(el.dataset.url, el.dataset.name); });
                }
                let searchTerm = '';

                const loading = document.createElement('div');
                loading.style.color = '#888';
                loading.textContent = '📡 Fetching IPTV channels…';
                cmdOutput.appendChild(loading);
                cmdOutput.scrollTop = cmdOutput.scrollHeight;

                try {
                    let playlistUrl = '';
                    let titleLabel = '';
                    let nextCmdBase = '';
                    let customChannels = []; // for merging later

                    // --- Load custom channels (if available) ---
                    let customMap = {};
                    try {
                        const resp = await fetch('./custom-channels.json');
                        if (resp.ok) customMap = await resp.json();
                    } catch(e) { /* ignore */ }

                    // --- Search (NEW): iptv search <words> [page]  — filters the whole 10k+ channel index by name ---
                    if (sub === 'search' || sub === 's') {
                        const parts = args.slice(1);
                        if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) page = Math.max(1, parseInt(parts.pop()));
                        searchTerm = parts.join(' ').toLowerCase().trim();
                        if (!searchTerm) { loading.remove(); return 'Usage: iptv search &lt;words&gt; [page]<br>Example: iptv search nasa'; }
                        playlistUrl = 'https://iptv-org.github.io/iptv/index.m3u';
                        titleLabel = `SEARCH – ${searchTerm.toUpperCase()}`;
                        nextCmdBase = `iptv search ${searchTerm}`;
                    }
                    // --- Category or Country ---
                    else if (sub === 'cat' || sub === 'category') {
                        const catName = args[1]?.toLowerCase();
                        if (!catName) {
                            loading.remove();
                            return `<b style="color:#0f0;">📂 IPTV Categories</b><br><br>
                            ${categoriesList.map(c => `<span style="color:#0ff; cursor:pointer; text-decoration:underline;" onclick="fillInput('iptv cat ${c}')">${c}</span>`).join(' &nbsp;·&nbsp; ')}
                            <br><br><span style="color:#888;">Click a category or type <b>iptv cat &lt;name&gt;</b></span>`;
                        }
                        page = Math.max(1, parseInt(args[2]) || 1);
                        playlistUrl = `https://iptv-org.github.io/iptv/categories/${catName}.m3u`;
                        titleLabel = `CAT – ${catName.toUpperCase()}`;
                        nextCmdBase = `iptv cat ${catName}`;
                        customChannels = customMap[catName] || [];
                    } else {
                        const country = sub || 'all';
                        page = Math.max(1, parseInt(args[1]) || 1);
                        playlistUrl = country === 'all'
                            ? 'https://iptv-org.github.io/iptv/index.m3u'
                            : `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/${country}.m3u`;
                        titleLabel = country.toUpperCase();
                        nextCmdBase = `iptv ${country}`;
                        customChannels = customMap[country] || [];
                    }

                    // Fetch main playlist (cached for the session: page 2, 3… of the same list no longer re-download several MB)
                    const m3uCache = (EG._m3u = EG._m3u || {});
                    let text = m3uCache[playlistUrl];
                    if (!text) {
                        const resp = await fetch(playlistUrl);
                        if (!resp.ok) {
                            loading.remove();
                            return `⚠️ Playlist not found.`;
                        }
                        text = m3uCache[playlistUrl] = await resp.text();
                    }
                    const lines = text.split('\n');
                    let channels = [];

                    // Parse M3U with safe checks
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('#EXTINF:')) {
                            const name = lines[i].split(',')[1]?.trim() || 'Unknown';
                            const url = lines[i + 1] ? lines[i + 1].trim() : null;
                            if (url && url.startsWith('http')) channels.push({ name, url });
                        }
                    }

                    // Merge custom channels (avoid duplicates by URL)
                    const existingUrls = new Set(channels.map(c => c.url));
                    for (const cust of customChannels) {
                        if (!existingUrls.has(cust.url)) {
                            channels.push(cust);
                        }
                    }

                    if (searchTerm) channels = channels.filter(c => c.name.toLowerCase().includes(searchTerm));

                    loading.remove();
                    if (channels.length === 0) return searchTerm ? `No channels match "${EG.esc(searchTerm)}".` : 'No channels found.';

                    const totalPages = Math.ceil(channels.length / perPage);
                    const start = (page - 1) * perPage;
                    const slice = channels.slice(start, start + perPage);

                    let output = `<b style="color:#0f0;">📺 IPTV – ${EG.esc(titleLabel)}</b> `;
                    output += `<span style="color:#888;">(${channels.length} channels, page ${page}/${totalPages})</span><br><br>`;

                    slice.forEach((ch, i) => {
                        const idx = start + i + 1;
                        output += `<span style="color:#fff;">[${idx}]</span> <span class="iptv-ch" data-url="${EG.esc(ch.url)}" data-name="${EG.esc(ch.name)}" style="color:#0ff; cursor:pointer; text-decoration:underline;">${EG.esc(ch.name)}</span><br>`;
                    });

                    if (page < totalPages) {
                        output += `<br><span style="color:#888;">Type <b style="color:#0f0;">${EG.esc(nextCmdBase)} ${page + 1}</b> for next page.</span>`;
                    }
                    return output;

                } catch (e) {
                    loading.remove();
                    return '⚠️ Could not fetch IPTV playlist. Network error.';
                }
            },
            'ipset': (args) => {
                // personal curated list (HD where possible)
                const channels = [
                    { name: '🌟 Curiosity Now', url: 'https://amg00170-curiositystream-amg00170c3-rakuten-us-2289.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg00170-curiositystreamllcfast-curiositynowrow-rakutenus/cb543d167e6c648e9dd43a60cef046a1f9591fde1d6988693eb5518975d1073edce2a59caa08ff16388f1ede7f0a66413a3e951fda77118fd87eb141453c5728cfffe729a2c05616b7db083429b56a062a866a68ac39437ed0e21f48a238b6720a5aa82a66443d80b846ac725adb80148b61299bce8c37683f03409a5e5afba358b1ebe70847d16da7e74f55902c4de09f43c8821da689d30ec85ed027f8469b93f88c811380d0f30a937f8a91869f430df8fa1bbde51fddf49f7d31996324471051f5d1e2942c19b3378fd8659db1d940ea01c19920fb007ddb52de2780412ff5781235b16480d4d7bd09a64f5db77b2b5785f0b285eb307c9c6be8b6eccf777d94ccd9192dc640d73822349cfc8441ca9355de812a8bb0660a2b80bf71dbcce2cdbfebcd7d952b9c93afd825141a2a4423964dae9f5ade2bf671bc8146720b0317fbda1defaeed731c2e0f8a8955d1533cbcd8808c964e18c2721457ed2f880f5d229c7a3c32b56dca9b3a6d9b2f45d0666ab50b63f23796d21bfca9dfea1128f58f97309841dbf55b82b852d32e563f25bcfd2b5340360df3e674023d7c8308a4e4c3ef730617ffb5aadac54033133607586edfb007112c2311997bbe9d36ab3266eefc2b741517b97e9252/42/1280x720_3329040/index.m3u8' },
                    { name: '🔎 Mystery TV', url: 'https://aenetworks-mysterytv-rakuten.amagi.tv/playlist.m3u8' },
                    { name: '🎬 MovieSphere', url: 'https://moviesphereuk-samsunguk.amagi.tv/720p-vtt/index.m3u8' },
                    { name: '🇨🇳 CGTN', url: 'https://amg00405-rakutentv-cgtn-rakuten-i9tar.amagi.tv/master.m3u8' },
                    { name: '📜 True History', url: 'https://linear-188.frequency.stream/dist/glewedtv/188/hls/master/playlist_1280x720.m3u8' },
                    { name: '🌌 Space Live (by SEN)', url: 'https://880ca9c9341c405f83d8664a18cc7134.mediatailor.us-west-2.amazonaws.com/v1/master/ba62fe743df0fe93366eba3a257d792884136c7f/LINEAR-1224-SPACELIVE-LG-UK/mt/lg-uk/1224/hls/master/playlist.m3u8' },
                    { name: '🍽️ Bon Appétit', url: 'https://bonappetit-samsung.amagi.tv/720p-vtt/index.m3u8' },
                    { name: '📰 France 24 English', url: 'https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_900.m3u8' },
                    { name: '📰 France 24 Français', url: 'https://live.france24.com/hls/live/2037179/F24_FR_HI_HLS/master_5000.m3u8' },
                    { name: '📰 BFM TV', url: 'https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8' },
                    { name: '📺 20 Minutes TV', url: 'https://live-20minutestv.digiteka.com/1961167769/index.m3u8' },
                    { name: '🌍 Africa 24 English', url: 'https://edge20.vedge.infomaniak.com/livecast/ik:africa24english/manifest.m3u8' },
                    { name: '🛠️ 5-Minute Crafts', url: 'https://soul-5mincrafteng-rakuten.amagi.tv/playlist.m3u8' },
                ];

                let html = `<b style="color:#0f0;">📺 MY PERSONAL IPTV CHANNELS</b><br><br>`;
                channels.forEach((ch, i) => {
                    const safeName = ch.name.replace(/'/g, "\\'");
                    html += `<span style="color:#fff;">[${i+1}]</span> <span style="color:#0ff; cursor:pointer; text-decoration:underline;" onclick="playIPTVInTerminal('${ch.url}','${safeName}')">${ch.name}</span>`;
                    html += ` <span style="color:#888;font-size:10px;cursor:pointer;" onclick="navigator.clipboard.writeText('${ch.url}')">📋</span><br>`;
                });
                
                html += `<br><span style="color:#888;">Click a channel name to watch. 📋 copies the stream URL.</span>`;
                return html;
            },
            'remoteview': async (args) => {
                let url = args[0];
                if (!url) return 'Usage: remoteview [url]\nExample: remoteview https://example.com';
                if (!url.startsWith('http')) url = 'https://' + url;
                
                appendCommandOutput(`📡 Remote viewing ${url}...`);
                
                try {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const html = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    // Remove all scripts, styles, SVGs
                    doc.querySelectorAll('script, style, noscript, svg, head').forEach(el => el.remove());
                    
                    const bodyText = doc.body ? doc.body.innerText : '';
                    const cleanText = bodyText.replace(/\s+/g, ' ').trim();
                    
                    if (!cleanText) return '⚠️ No readable text found.';
                    
                    const container = document.createElement('div');
                    container.style.cssText = 'border-left: 3px solid #0f0; padding-left: 10px; margin: 10px 0;';
                    const title = document.createElement('b');
                    title.style.color = '#0f0';
                    title.textContent = `🔍 REMOTE VIEW: ${url}`;
                    const textSpan = document.createElement('span');
                    textSpan.style.color = '#ccc';
                    textSpan.style.fontSize = '0.9rem';
                    textSpan.style.lineHeight = '1.4';
                    textSpan.textContent = cleanText;
                    container.appendChild(title);
                    container.appendChild(document.createElement('br'));
                    container.appendChild(textSpan);
                    return container.outerHTML;
                } catch (err) {
                    return `⚠️ Remote viewing failed: ${err.message}`;
                }
            },
            'portal': (args) => {
                let arg = args[0];
                let isMobile = false;
                let url = null;

                if (arg === '--mobile') {
                    isMobile = true;
                    arg = args[1];
                }

                // Shortcuts
                const shortcuts = {
                    // ===== Miscellaneous =====
                    'elitegdx': 'https://jinkaneki.github.io/EliteGDX/',
                    'famelack': 'https://famelack.com/',
                    'citywalki': 'https://www.citywalki.com/',          // virtual walking tour platform
                    'f1': 'https://f1live.dpdns.org/',
                    'radiogarden': 'https://radio.garden/',

                    // ===== WorldWideView Trafic =====
                    'flightradar24': 'https://www.flightradar24.com/',  // Live air traffic
                    'opensea': 'https://map.openseamap.org/',           // Live ship traffic
                    'earthcam': 'https://www.earthcam.com/',            // Public webcams
                    'windview': 'https://earth.nullschool.net/',        // Global weather & wind patterns
                    'citywalks': 'https://citywalks.live/',             // Virtual tours worldwide

                    // ===== New Satellite Shortcuts =====
                    'azmth': 'https://azmth.space/',                  // Live 3D satellite globe
                    'heavens': 'https://www.heavens-above.com/',      // Satellite predictions & star charts
                    'keeptrack': 'https://app.keeptrack.space/',      // 3D orbital debris tracking
                    // ====================================

                    // ===== ENTERTAINMENT & STREAMING =====
                    'moviesjoy': 'https://flixnet.site/moviesjoy/',   // Movie streaming
                    'hianime': 'https://hianime.ad/home/',            // Anime hub
                    'streamgoblin': 'https://streamgoblin.com/',      // General streaming
                };

                // If a shortcut is provided, resolve it
                if (arg && shortcuts[arg]) {
                    url = shortcuts[arg];
                } else if (arg) {
                    url = arg;
                }

                // If we have a valid URL (either from shortcut or direct input)
                if (url) {
                    if (!url.startsWith('http')) url = 'https://' + url;

                    const frameWidth = isMobile ? '375px' : '100%';
                    const frameHeight = isMobile ? '667px' : '60vh';
                    const portalId = 'portal-' + Date.now();

                    return `
                    <div style="margin: 10px 0; border: 1px solid var(--accent-color); border-radius: 8px; overflow: hidden; background: #000;">
                        <div style="background: #222; padding: 6px 12px; color: #0f0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-family: monospace; font-size: 0.9rem;">🌐 PORTAL: ${url}</span>
                            <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #ffaa00; text-decoration: none; font-size: 12px; font-weight: bold;">[ESCAPE]</a>
                        </div>
                        <div style="display: flex; justify-content: center; background: #111; padding: 5px;">
                            <iframe id="${portalId}" src="${url}" 
                                style="width: ${frameWidth}; height: ${frameHeight}; border: none; background: #fff; max-width: 100%;" 
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-modals"
                                allow="fullscreen">
                            </iframe>
                        </div>
                        <div style="background: #111; padding: 5px; text-align: center; color: #888; font-size: 6px;">
                            If blank, site blocks iframes: use ESCAPE.
                        </div>
                    </div>`;
                }

// No valid argument – show clickable shortcuts list
const shortcutList = Object.keys(shortcuts);
const colors = ['#ff00ff', '#00ffff', '#ffaa00', '#0f0', '#f00', '#ff6600', '#ff0066', '#66ff00', '#00ffcc', '#cc00ff', '#ffff00', '#ff3366'];
let shortcutsHtml = '<div style="margin: 10px 0; display: column; flex-wrap: wrap; gap: 10px;">'; shortcutList.forEach((key, idx) => {const color = colors[idx % colors.length];
shortcutsHtml += `<span style="cursor: pointer; color: ${color}; text-decoration: underline; padding: 2px 8px; border-radius: 12px; background: rgba(0,0,0,0.3);" onclick="fillInput('portal ${key}')">${key}</span>`;
});
shortcutsHtml += '</div>';

return `
<div style="border-left: 3px solid var(--accent-color); padding-left: 10px;">
    <b style="color: var(--accent-color);">🌐 PORTAL COMMAND</b><br>
    <span style="color: #ccc;">Usage: portal [--mobile] &lt;url|shortcut&gt;</span><br>
    <span style="color: #888;">--mobile : Force mobile viewport (375px width)</span><br><br>
    <span style="color: #0f0;">Available shortcuts (click to fill command):</span><br>${shortcutsHtml}<br>
    <span style="color: #888;">Or type a direct URL.</span>
</div>`;
            },
            'fetchpage': async (args) => {
                let url = args[0];
                if (!url) return 'Usage: fetchpage [url]\nFetches and displays all available metadata.';
                if (!url.startsWith('http')) url = 'https://' + url;
                
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                appendCommandOutput(`📡 Fetching metadata from ${url}...`);
                
                try {
                    const response = await fetch(proxyUrl);
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Helper to get meta content by name or property
                    const getMeta = (name, attr = 'name') => {
                        const selector = `meta[${attr}="${name}"]`;
                        return doc.querySelector(selector)?.getAttribute('content') || null;
                    };
                    
                    // Basic
                    const title = doc.querySelector('title')?.innerText || 'No title';
                    const description = getMeta('description') || getMeta('og:description', 'property') || 'No description';
                    const keywords = getMeta('keywords') || 'None';
                    
                    // Open Graph
                    const ogTitle = getMeta('og:title', 'property') || '';
                    const ogImage = getMeta('og:image', 'property') || '';
                    const ogSite = getMeta('og:site_name', 'property') || '';
                    
                    // Twitter
                    const twitterCard = getMeta('twitter:card') || '';
                    const twitterSite = getMeta('twitter:site') || '';
                    
                    // Other useful
                    const author = getMeta('author') || '';
                    const viewport = getMeta('viewport') || '';
                    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || url;
                    const lang = doc.documentElement.lang || 'unknown';
                    
                    // Build output
                    let output = `
<div style="border-left: 3px solid #ffaa00; padding-left: 10px; margin: 10px 0;">
    <b style="color: #ffaa00;">📄 PAGE METADATA: ${url}</b><br>
    <b>🌐 Title:</b> ${title}<br>
    <b>📝 Description:</b> ${description}<br>
    <b>🏷️ Keywords:</b> ${keywords}<br>
    <b>✍️ Author:</b> ${author || 'Not specified'}<br>
    <b>🔗 Canonical:</b> <a href="${canonical}" target="_blank">${canonical}</a><br>
    <b>🌍 Language:</b> ${lang}<br>`;

if (ogTitle) output += `<b>📱 Open Graph Title:</b> ${ogTitle}<br>`;
if (ogSite) output += `<b>🏢 Site Name:</b> ${ogSite}<br>`;
if (ogImage) output += `<b>🖼️ OG Image:</b> <a href="${ogImage}" target="_blank">${ogImage.substring(0, 60)}...</a><br>`;
if (twitterCard) output += `<b>🐦 Twitter Card:</b> ${twitterCard} ${twitterSite ? '(' + twitterSite + ')' : ''}<br>`;
if (viewport) output += `<b>📱 Viewport:</b> ${viewport}<br>`;
                    
                    output += `</div>`;
                    return output;
                    
                } catch (err) {
                    return `⚠️ Fetch failed: ${err.message}`;
                }
            },
            'grabimg': async (args) => {
                let url = args[0];
                if (!url) return 'Usage: grabimg [url]\nExtracts all image URLs from a webpage.\nExample: grabimg https://example.com';
                if (!url.startsWith('http')) url = 'https://' + url;
                
                appendCommandOutput(`📸 Scanning for images on ${url}...`);
                
                try {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const html = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    const resolveUrl = (imgSrc) => {
                        if (!imgSrc) return null;
                        if (imgSrc.startsWith('data:image')) return imgSrc;
                        try {
                            return new URL(imgSrc, url).href;
                        } catch {
                            return null;
                        }
                    };
                    
                    const imgSet = new Set();
                    doc.querySelectorAll('img').forEach(img => {
                        const src = img.getAttribute('src') || img.getAttribute('data-src');
                        const resolved = resolveUrl(src);
                        if (resolved) imgSet.add(resolved);
                    });
                    
                    const images = Array.from(imgSet);
                    if (images.length === 0) return '⚠️ No images found.';
                    
                    const displayLimit = 100;
                    const displayImages = images.slice(0, displayLimit);
                    const hiddenCount = images.length - displayLimit;
                    
                    // Simple flexbox layout – automatically wraps
                    let output = `
<div style="margin: 10px 0; text-align: center; width: 100%;">
    <b style="color:#0f0;">🖼️ GRABIMG: ${url}</b><br>
    <span style="color:#ccc;">${images.length} unique images found.</span><br><br>
    <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; padding: 0;">`;

    displayImages.forEach((imgUrl, i) => {
    output += `
    <div style="display: flex; flex-direction: column; align-items: center; width: 80px;">
    <a href="${imgUrl}" target="_blank" rel="noopener noreferrer" style="display: block; width: 80px; height: 80px; border: 1px solid var(--accent-color); border-radius: 4px; overflow: hidden; background: #111;">
    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" 
    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23aaa%22 dy=%22.3em%22%3E404%3C/text%3E%3C/svg%3E';">
    </a>
    <a href="${imgUrl}" target="_blank" style="color: #0ff; font-size: 10px; margin-top: 4px; text-decoration: none;">Img ${i+1}</a>
</div>`;
                    });
                    
                    output += `</div>`;
                    if (hiddenCount > 0) {
                        output += `<div style="color: #888; margin-top: 8px;">+ ${hiddenCount} more images (limit ${displayLimit} per request).</div>`;
                    }
                    output += `<div style="color: #888; margin-top: 6px;">💡 Tip: Use <span style="color:#0f0;">remoteview</span> or <span style="color:#0f0;">fetchpage</span> to extract the full page text.</div>`;
                    output += `</div>`;
                    
                    return output;
                } catch (err) {
                    return `⚠️ Image scan failed: ${err.message}`;
                }
            },
            'about': () => {
                return `
<div style="border-left: 2px solid #ff00ff; padding: 8px 12px; line-height: 0.7;">
<span style="color: #ff00ff; font-weight: bold; text-shadow: 0 0 5px #ff00ff;">// AKASHIC ORIGIN GENESIS //</span><br>
<span style="color: #ccc;">J_OS began as a simple ambient clock. Its creator, <strong style="color: #fff;">Johan</strong>, wanted a single screen that could tell time, show beauty, and respond like a real operating system.</span><br>
<span style="color: #ccc;">Soon it grew:</span><br>

<span style="color: cyan; font-weight: bold; text-shadow: 0 0 8px #ffd70044;">// THE EVOLUTION //</span><br>
<span style="color: #ccc;">
    <span style="color: #00f0ff;">Cistercian numerals</span> met <span style="color: #ffaa00;">live NASA feeds</span>.<br>
    <span style="color: #0f0;">Images and Tao chapters</span> were woven into neural <span style="color: #ff00ff;">"Intersect" flashes</span>.<br>
    <span style="color: #ff0;">Radio streams</span> and <span style="color: #0ff;">global news feeds</span> became channels on a cybernetic console.<br>
    <span style="color: #ffaa00;">Remote viewing, image grabbing, and metadata fetching</span> transformed the terminal into an <span style="color: #0f0;">intelligence gathering console</span>.<br>
    <span style="color: #0ff;">Live website portals, HLS streams, and IPTV lists</span> turned it into a true media hub.<br>
    <span style="color: #ff88ff;">Chat commands</span>, <span style="color: #0ff;">real-time messaging</span> turned the console into a <span style="color: #0f0;">digital social symposium</span> for the curious and the connected.<br>
</span><br>

<span style="color: #ffd700; font-weight: bold; text-shadow: 0 0 8px #ffd70044;">// THE PHILOSOPHY //</span><br>
<span style="color: #ccc;">
<em style="color: #888;">“For all things serve all things.”</em><br>
    This dashboard is a <strong style="color: #ffd700;">cyber-mystical construct</strong>, a bridge between ancient wisdom (Sephirot, Cistercian monks, Dao, Ascetics) and modern technology (Canvas, Web Audio, HLS).<br><br>
    The <strong style="color: #00f0ff;">Azimuthal Engine</strong> grounds us in the sensory world, tracking the sun and moon.<br>
    The <strong style="color: #ff00ff;">Astrolabe</strong> lifts us to the celestial, mapping the zodiac and planets.<br>
    The <strong style="color: #ffd700;">Torus Field</strong> reminds us that all energy flows in a cosmic donut.<br>
    The <strong style="color: #33ff57;">Tree of Life</strong> offers a map of consciousness, from Kether to Malkuth.<br>
    The <strong style="color: tomato;">Gnosis</strong> was unfolded, unveiling the esoteric anatomy of the dashboard itself.<br>
</span><br>

<span style="color: white; font-weight: bold; text-shadow: 0 0 8px #ffd70044;">// THE MANIFESTO //</span><br>
<span style="color: #ccc;">
    Today, <strong style="color: #fff;">J_OS</strong> is a <strong style="color: #ffd700;">phygital sanctuary</strong>, a hacker's command center, a philosopher's scroll, a mystic's temple and journey, and an artist's canvas.<br><br>
<span style="color: #555;">EliteGDX, Akashic Neural Center</span>
</span><br><br>
<span style="color: #888;"> — Type <span style="color: #0f0;">help</span> to explore.</span>
</div>
                `;
            },
            'login': () => {
                isAuthorized = true;
                return `
                <pre class="login-art" style="color: #00ff00; text-shadow: 0 0 5px #00ff00; text-align: center; display: block; margin: 0 auto;">
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/\\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/    \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/   <span style="color: #fff; text-shadow: 0 0 10px #fff;">◈</span>  \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  /  \\  \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  / <span style="color: #fff; text-shadow: 0 0 10px #fff;">()</span> \\  \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/  /______\\  \\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">/______________\\</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\              /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\            /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\          /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\        /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\      /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\    /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\  /</span>
<span style="color: #00ffff; text-shadow: 0 0 8px #00ffff;">\\/</span>

      ██╗      ██████╗ ███████╗
      ██║     ██╔═══██╗██╔════╝
      ██║     ██║   ██║███████╗
██╗   ██║     ██║   ██║╚════██║
╚██████╔╝████╗╚██████╔╝███████║
 ╚═════╝ ╚═══╝ ╚═════╝ ╚══════╝
<span class="login-status-text" style="color: #00ffff; font-weight: bold; letter-spacing: 0.7px;text-shadow: 0 0 8px #00ffff;">  // AKASHIC ZERO-POINT KRYPTOS N CENTER //</span>  
<span class="login-status-text">> SYNCING PATHWAYS    ....... [STABLE] 
> DECRYPTING RECORDS ....... [VERIFIED]
<span style="font-family: 'Segoe UI'; font-size: 7px; color: rgb(255, 255, 0); white-space: nowrap;">[@ @]<br> -</span>
<span id="login-welcome" style="color: #ffff00; display: block;"></span>
<span style="color: #ff03ff; text-shadow: none; display: block;">Type 'about' for a story behind J_OS<br>Type 'help'  for a list of commands</span>
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
                    let data;
                    try {
                        // 1st choice: dictionaryapi.dev (7-second timeout with AbortController, URL-encoded word)
                        const ctl = new AbortController(); 
                        const to = setTimeout(() => ctl.abort(), 7000);
                        
                        const resp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), { signal: ctl.signal });
                        clearTimeout(to); 
                        
                        if (!resp.ok) throw new Error('HTTP ' + resp.status);
                        data = await resp.json();
                        
                    } catch (e1) {
                        // Fallback: Wiktionary REST API (reliable, CORS-enabled, handles words primary API misses)
                        const resp = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word.toLowerCase()));
                        if (!resp.ok) throw new Error('Not found');
                        
                        // Helper to strip HTML tags returned in Wiktionary definition snippets
                        const strip = (h) => new DOMParser().parseFromString(h, 'text/html').body.textContent.trim();
                        const jsonResp = await resp.json();

                        // Reshape Wiktionary structure so the rest of your rendering code works without changes
                        data = [{ 
                            phonetics: [], 
                            sourceUrls: ['https://en.wiktionary.org/wiki/' + encodeURIComponent(word)],              
                            meanings: (jsonResp.en || []).map(m => ({ 
                                partOfSpeech: m.partOfSpeech, 
                                synonyms: [], 
                                antonyms: [],                
                                definitions: m.definitions.slice(0, 4).map(d => ({ 
                                    definition: strip(d.definition), 
                                    example: d.examples && d.examples[0] ? strip(d.examples[0]) : '' 
                                })) 
                            })) 
                        }];
                    }

                    let output = `<strong style="color: var(--accent-color);">📘 ${escapeHtml(word)}</strong>`;

                    data.forEach((entry, entryIndex) => {
                        if (entryIndex > 0) output += `<br><span style="color: #555;">──────────</span>`;

                        const phonetic = entry.phonetics?.find(p => p.text) || entry.phonetics?.[0];
                        if (phonetic?.text) {
                            output += `<br><span style="color: #888;">/${escapeHtml(phonetic.text)}/</span>`;
                        }

                        entry.meanings.forEach(meaning => {
                            output += `<br><br><strong style="color: #ffaa00;">${escapeHtml(meaning.partOfSpeech)}</strong>`;

                            meaning.definitions.forEach((def, i) => {
                                output += `<br> &nbsp;${i + 1}. ${escapeHtml(def.definition)}`;
                                if (def.example) {
                                    output += `<br><span style="color: #666;"> &nbsp;&nbsp; “${escapeHtml(def.example)}”</span>`;
                                }
                            });

                            if (meaning.synonyms?.length) {
                                const escapedSynonyms = meaning.synonyms.map(s => escapeHtml(s)).join(', ');
                                output += `<br> &nbsp;<span style="color: #0f0;">Synonyms:</span> ${escapedSynonyms}`;
                            }
                            if (meaning.antonyms?.length) {
                                const escapedAntonyms = meaning.antonyms.map(a => escapeHtml(a)).join(', ');
                                output += `<br> &nbsp;<span style="color: #f55;">Antonyms:</span> ${escapedAntonyms}`;
                            }
                        });
                    });

                    if (data[0]?.sourceUrls?.length) {
                        output += `<br><br><span style="color: #555; font-size: 0.7rem;">Source: ${escapeHtml(data[0].sourceUrls[0])}</span>`;
                    }

                    return output;
                } catch (e) {
                    return `Could not define "${escapeHtml(word)}".`;
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

                    // Build safe DOM elements (textContent prevents XSS)
                    const extractDiv = document.createElement('div');
                    extractDiv.style.cssText = 'border-left: 3px solid #3498db; padding-left: 10px; line-height: 1.4;';
                    
                    const title = document.createElement('b');
                    title.style.cssText = 'color: #3498db; font-size: 1.2em;';
                    title.textContent = data.title;
                    
                    const extractText = document.createElement('span');
                    extractText.style.color = '#ccc';
                    extractText.textContent = data.extract;
                    
                    extractDiv.appendChild(title);
                    extractDiv.appendChild(document.createElement('br'));
                    extractDiv.appendChild(extractText);
                    
                    return extractDiv.outerHTML;  // safe HTML from DOM
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
                return `
<pre style="color: #0ff; font-size: 10px;">
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
                return `
<pre style="color: #0f0; font-size: 10px;">
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
"Hack the planet!"
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
<pre style="color: #ff8200; display: inline-block; text-align: center;">
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
                    return `
                    <div style="color: #ff8200; font-family: monospace; line-height: 1.1; text-align: center;">
<pre style="color: #ff8200; display: inline-block; text-align: center;">
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
<pre style="color: #ff8200; display: inline-block; text-align: center;">
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
                    const savedTheme = EG.store.get('elite-color-profile') || 'cyan';
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
            'pingg': async (args) => {
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
                { name: "Navier-Stokes Equation", eq: "ρ(∂v/∂t + v·∇v) = -∇P + μ∇²v + f", desc: "Fluid motion (unsolved for general 3D)." },
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
                { name: "Henderson-Hasselbalch Equation", eq: "pH = pKa + log([A⁻]/[HA])", desc: "Buffer pH calculation." },
                { name: "Michaelis-Menten Equation", eq: "v = (V_max [S]) / (K_m + [S])", desc: "Enzyme kinetics." },
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
    <span onclick="fillInput('case resistor 12v led')" style="color: #fff;">case resistor 12v led</span> <span style="color: #888; cursor:pointer; text-decoration:underline;">→ calc resistor for 12V supply, 2V LED</span><br>
    <span style="color: #fff;">case resistor 9v 3.2v 0.02</span> <span style="color: #888;">→ custom LED (3.2V, 20mA)</span><br><br>
    
    <strong style="color: #0f0;">🎨 Resistor Color Decode</strong><br>
    <span onclick="fillInput('case decode brown black red')" style="color: #fff; cursor:pointer; text-decoration:underline;">case decode brown black red</span> <span style="color: #888;">→ 1kΩ ±5% (default gold)</span><br>
    <span style="color: #fff;">case decode yellow violet orange gold</span> <span style="color: #888;">→ 47kΩ ±5%</span><br><br>
    
    <strong style="color: #0f0;">🔌 Ohm's Law</strong><br>
    <span onclick="fillInput('case ohmslaw V 0.02 1000')" style="color: #fff; cursor:pointer; text-decoration:underline;">case ohmslaw V 0.02 1000</span> <span style="color: #888;">→ V = I × R (20mA × 1kΩ = 20V)</span><br>
    <span onclick="fillInput('case ohmslaw I 5 220')" style="color: #fff; cursor:pointer; text-decoration:underline;">case ohmslaw I 5 220</span> <span style="color: #888;">→ I = V / R (5V / 220Ω = 22.7mA)</span><br>
    <span onclick="fillInput('case ohmslaw R 12 0.5')" style="color: #fff; cursor:pointer; text-decoration:underline;">case ohmslaw R 12 0.5</span> <span style="color: #888;">→ R = V / I (12V / 0.5A = 24Ω)</span><br><br>
    
    <strong style="color: #0f0;">📊 Voltage Divider</strong><br>
    <span onclick="fillInput('case vdivider 5 10000 10000')" style="color: #fff; cursor:pointer; text-decoration:underline;">case vdivider 5 10000 10000</span> <span style="color: #888;">→ 5V with two 10kΩ → 2.5V out</span><br><br>
    
    <strong style="color: #0f0;">🔗 Series / Parallel</strong><br>
    <span onclick="fillInput('case series 100 220 330')" style="color: #fff; cursor:pointer; text-decoration:underline;">case series 100 220 330</span> <span style="color: #888;">→ 650Ω total</span><br>
    <span onclick="fillInput('case parallel 100 100')" style="color: #fff; cursor:pointer; text-decoration:underline;">case parallel 100 100</span> <span style="color: #888;">→ 50Ω total</span><br><br>
    
    <strong style="color: #0f0;">🔋 Capacitor Code</strong><br>
    <span onclick="fillInput('case capacitor 104')" style="color: #fff; cursor:pointer; text-decoration:underline;">case capacitor 104</span> <span style="color: #888;">→ 100nF (0.1µF)</span><br>
    <span onclick="fillInput('case capacitor 472')" style="color: #fff; cursor:pointer; text-decoration:underline;">case capacitor 472</span> <span style="color: #888;">→ 4.7nF</span><br><br>
    
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
                EG.store.clearAll();
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
            stopRpgAudio();
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
                stopRpgAudio();
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
                    stopRpgAudio();
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
            commandHistory.push(EG.maskCmd(rawCmd));   // passwords never stay in memory history
            EG.history.push(rawCmd);                    // persisted history (secret commands excluded)
            
            // Parse command and arguments
            const args = rawCmd.split(' ');
            const main = args[0].toLowerCase();
            const restArgs = args.slice(1);
            
            // Now safe to update neural graph
            addNodeToGraph(main);
            
            // Show the command in output
            appendCommandOutput(`$ ${EG.maskCmd(rawCmd)}`);
            
            // Check if command exists
            // registry first, legacy `commands` object second
            const cmdFunc = EG.resolveCommand(main, commands);
            if (!cmdFunc) {
                EG.unknownCommand(main);   // "Did you mean …?" chips
                return;
            }
            let result;
            
            try {
                // lazy-load hls / mqtt / peerjs / firebase / qrcode / youtube only when this command needs them
                await EG.beforeRun(main, restArgs);
                // execute the command
                result = cmdFunc(restArgs);
                
                // If it's a Promise (async command), show loading and await
                if (result instanceof Promise) {
                    const loadingLine = document.createElement('div');
                    loadingLine.style.color = '#888';
                    loadingLine.textContent = '⏳ Processing...';
                    cmdOutput.appendChild(loadingLine);
                    cmdOutput.scrollTop = cmdOutput.scrollHeight;
                    
                    result = await result;
                    loadingLine.remove();         // remove loading indicator
                }
                
                result = EG.afterRun(main, result);   // third-party text is sanitised (no scripts / on* handlers / javascript: links)
                
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


        // TERMINAL FULLSCREEN TOGGLE (Icons Only)
        (function initTerminalFullscreen() {
            const btn = document.getElementById('terminal-fullscreen-btn');
            const terminal = document.getElementById('command-runner');
            if (!btn || !terminal) return;

            const expandIcon = document.getElementById('term-fs-expand');
            const compressIcon = document.getElementById('term-fs-compress');

            function updateIcons(isFullscreen) {
                if (isFullscreen) {
                    expandIcon.style.display = 'none';
                    compressIcon.style.display = 'block';
                } else {
                    expandIcon.style.display = 'block';
                    compressIcon.style.display = 'none';
                }
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent any parent handlers

                const isTerminalFullscreen = document.fullscreenElement === terminal ||
                                            (document.fullscreenElement && terminal.contains(document.fullscreenElement));

                if (isTerminalFullscreen) {
                    // Exit fullscreen completely 
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(err => console.warn(err));
                    }
                } else {
                    // Request fullscreen on the terminal
                    terminal.requestFullscreen()
                        .then(() => updateIcons())
                        .catch(err => console.warn('Terminal fullscreen error:', err.message));
                }
            });

            

            // Listen for fullscreen changes (Esc key, page fullscreen button, etc.)
            document.addEventListener('fullscreenchange', updateIcons);
            document.addEventListener('webkitfullscreenchange', updateIcons); // Safari support

            // Initial state
            updateIcons();
        })();

        function refreshSlideshowIfActive() {
            if (window._slideshowActive) {
                // quickly re‑draw the current image to restore visibility
                const canvas = document.getElementById('slideshow-canvas');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const sources = slideshowSource;
                const idx = currentSlideIndex > 0 ? currentSlideIndex - 1 : sources.length - 1; // last shown
                const img = new Image();
                img.onload = () => drawImageCover(img, canvas, ctx);
                img.src = sources[idx % sources.length];
            }
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
        let elementsToHide = [
            '.content-blocks', '.controls', '.site-footer', '#command-runner',
            '.action-btn',
            '#quote-widget', '#dynamic-quote-container',   // online quote
            '#xterm-modal', '.hide-controls-toggle-wrapper',
            '.theme-switch-wrapper', '.text-wrapper', '#neofetch-container',
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
            const cosmic = document.getElementById('cosmic-wrapper');
            
            const mode = clockModes[currentModeIndex];
            
            let activeClock = null;
            let activeDisplay = 'flex';

            // Hide all clocks first, then show the active one
            if (analog) analog.style.display = 'none';
            if (digital) digital.style.display = 'none';
            if (cistercian) cistercian.style.display = 'none';
            if (cosmic) cosmic.style.display = 'none';
            document.querySelector('.timepiece-wrapper').classList.remove('cosmic-glass-active');

            // Show the active clock based on current mode
            if (mode === 'classic' || mode === 'glass') {
                if (analog) {
                    analog.style.display = 'flex';
                    if (mode === 'glass') analog.classList.add('zen-mode');
                }
            } else if (mode === 'digital') {
                if (digital) digital.style.display = 'flex';
            } else if (mode === 'cistercian') {
                if (cistercian) cistercian.style.display = 'flex';
            } else if (mode === 'cosmic') {
                if (cosmic) cosmic.style.display = 'flex';
                if (analog) analog.style.display = 'none';
            } else if (mode === 'celestial') {
                // Show analog clock (glass mode) + cosmic overlay
                if (analog) {
                    analog.style.display = 'flex';
                    analog.classList.add('zen-mode');
                }
                if (cosmic) cosmic.style.display = 'flex';
                document.querySelector('.timepiece-wrapper').classList.add('cosmic-glass-active');
            }

            // Store original styles and hide other UI elements (but NOT clocks)
            elementsToHide.forEach(selector => {
                const el = document.querySelector(selector);
                if (el && el !== magicMirrorBtn && el !== mirrorExitBtn) {
                    const computed = getComputedStyle(el);
                    originalStyles.set(selector, {
                        display: el.style.display || computed.display,
                        visibility: el.style.visibility || computed.visibility
                    });
                    el.style.display = 'none';
                    if (computed.visibility === 'hidden') el.style.visibility = 'hidden';
                }
            });


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

            // Hide JOHAN_OS button and neofetch
            document.getElementById('toggle-fetch-btn').parentElement.style.display = 'none';
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

            // Remove mirror-mode class and celestial overlay
            document.body.classList.remove('mirror-mode');
            document.querySelector('.timepiece-wrapper').classList.remove('cosmic-glass-active');

            // Hide exit button and spacer(min-height)
            if (mirrorExitBtn) mirrorExitBtn.style.display = 'none';
            document.getElementById('mirror-spacer').style.display = 'none';

            magicMirrorActive = false;
            magicMirrorBtn.style.display = 'inline-block';
            originalStyles.clear();
            // Hide the exit button and the 1000px spacer
            document.getElementById('mirror-exit-btn').style.display = 'none';
            document.getElementById('mirror-spacer').style.display = 'none';

            // Bring back the JOHAN_OS button
            document.getElementById('toggle-fetch-btn').parentElement.style.display = 'block';
            // Bring back the fastfetch container (MUST be 'flex' to preserve layout!)
            document.getElementById('neofetch-container').style.display = 'flex';
            // After all visibility is restored: refresh astrolab
            if (window.refreshAstrolabe) {
                window.refreshAstrolabe();
            }

            // Restore active clock display after exiting mirror
            const mode = clockModes[currentModeIndex];
            const analog = document.getElementById('analog-clock');
            const digital = document.getElementById('digital-clock');
            const cistercian = document.getElementById('cistercian-wrapper');
            const cosmic = document.getElementById('cosmic-wrapper');

            if (analog) analog.style.display = 'none';
            if (digital) digital.style.display = 'none';
            if (cistercian) cistercian.style.display = 'none';
            if (cosmic) cosmic.style.display = 'none';
            document.querySelector('.timepiece-wrapper').classList.remove('cosmic-glass-active');

            if (mode === 'classic' || mode === 'glass') {
                if (analog) {
                    analog.style.display = 'flex';
                    if (mode === 'glass') analog.classList.add('zen-mode');
                }
            } else if (mode === 'digital') {
                if (digital) digital.style.display = 'flex';
            } else if (mode === 'cistercian') {
                if (cistercian) cistercian.style.display = 'flex';
            } else if (mode === 'cosmic') {
                if (cosmic) cosmic.style.display = 'flex';
                if (analog) analog.style.display = 'none';
            } else if (mode === 'celestial') {
                if (analog) {
                    analog.style.display = 'flex';
                    analog.classList.add('zen-mode');
                }
                if (cosmic) cosmic.style.display = 'flex';
                document.querySelector('.timepiece-wrapper').classList.add('cosmic-glass-active');
            }

            if (window._perfectMirrorActive) {
                const taoWidget = document.getElementById('tao-quote-container');
                const quoteWidget = document.getElementById('online-quote-container');
                if (taoWidget) {
                    taoWidget.style.visibility = window._perfectOriginalTaoVis || '';
                }
                if (quoteWidget) {
                    quoteWidget.style.visibility = window._perfectOriginalQuoteVis || '';
                }
                window._perfectMirrorActive = false;
                window._perfectOriginalTaoVis = '';
                window._perfectOriginalQuoteVis = '';
            }
        }

        // Attach event listeners
        if (magicMirrorBtn) magicMirrorBtn.addEventListener('click', enterMagicMirror);
        if (mirrorExitBtn) mirrorExitBtn.addEventListener('click', exitMagicMirror);

        function enterPerfectMirror() {
            if (magicMirrorActive) return;

            const taoWidget = document.getElementById('tao-quote-container');
            const quoteWidget = document.getElementById('online-quote-container');

            // Store originals and hide with visibility (keeps space)
            if (taoWidget) {
                if (!window._perfectOriginalTaoVis) {
                    window._perfectOriginalTaoVis = taoWidget.style.visibility || '';
                }
                taoWidget.style.visibility = 'hidden';
            }
            if (quoteWidget) {
                if (!window._perfectOriginalQuoteVis) {
                    window._perfectOriginalQuoteVis = quoteWidget.style.visibility || '';
                }
                quoteWidget.style.visibility = 'hidden';
            }

            enterMagicMirror();
            window._perfectMirrorActive = true;
        }



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



        // =========================================================================
        // COSMIC MAZZAROTH WHEEL ENGINE (Glass Mode) – DPI‑SCALED (High‑Quality Retina)
        // =========================================================================
        function initCosmicClock() {
            window._cosmicInit = true;

            const canvas = document.getElementById('cosmic-canvas');
            const ctx = canvas.getContext('2d');
            const timeDisplay = document.getElementById('cosmic-time-display');
            const latInput = document.getElementById('cosmic-lat');
            const lonInput = document.getElementById('cosmic-lon');

            // ---- Zodiac data ----
            const ZODIAC = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
            const ELEMENTS = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water'];
            const ELEMENT_COLORS = {
                Fire: '#ff6666',
                Earth: '#66ff66',
                Air: '#777d80',
                Water: '#0565ff'
            };

            const PLANETS = {
                'Sun':    { sym: '☉', col: '#ffaa00' },
                'Moon':   { sym: '☽', col: '#ececec' },
                'Mercury':{ sym: '☿', col: '#00f0ff' },
                'Venus':  { sym: '♀', col: '#ff00ff' },
                'Mars':   { sym: '♂', col: '#ff3333' },
                'Jupiter':{ sym: '♃', col: '#4aff9e' },
                'Saturn': { sym: '♄', col: '#ffd733' },
                'Uranus': { sym: '♅', col: '#00ced1' },
                'Neptune':{ sym: '♆', col: '#4169e1' },
                'Pluto':  { sym: '♇', col: '#8b4513' }
            };

            // ---- State ----
            let simTime = new Date();
            let isPlaying = true;
            let speedMultiplier = 1;
            let animFrame;
            let lastTimestamp = 0;

            // ---- Helpers (using global EPHEMERIS) ----
            function getJulianDay(date) {
                const year = date.getUTCFullYear();
                const month = date.getUTCMonth() + 1;
                const day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600) / 24;
                let a = Math.floor((14 - month) / 12);
                let y = year + 4800 - a;
                let m = month + 12 * a - 3;
                return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
            }

            function getGMST(jd) {
                const T = (jd - 2451545.0) / 36525.0;
                let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0;
                return ((gmst % 360) + 360) % 360;
            }

            function getPlanetPosition(planet, date) {
                // ---- SUN: Use J2000 real‑time physics ----
                if (planet === 'Sun') {
                    return getSunPosition(date).lon;
                }
                // ---- MOON: Use J2000 real‑time physics ----
                if (planet === 'Moon') {
                    return getMoonPosition(date).lon;
                }
                
                // ---- ALL OTHER PLANETS: Use JSON linear ----
                const days = (date - EPHEMERIS.refDate) / (1000 * 60 * 60 * 24);
                const lon = (window.EG && EG.ephem && EG.ephem.has(planet)) ? EG.ephem.lon(planet, date) : EPHEMERIS.refLon[planet] + EPHEMERIS.dailyMotion[planet] * days;
                return ((lon % 360) + 360) % 360;
            }

            function getACMC(date, lat, lon) {
                const jd = getJulianDay(date);
                const gmstDeg = getGMST(jd);
                let lst = (gmstDeg + lon) % 360;
                if (lst < 0) lst += 360;
                const lstRad = lst * Math.PI / 180;
                const latRad = lat * Math.PI / 180;
                const epsRad = 23.439 * Math.PI / 180;
                let mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad));
                let mcDeg = ((mcRad * 180 / Math.PI) % 360 + 360) % 360;
                let num = Math.cos(lstRad);
                let den = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
                let acRad = Math.atan2(num, den);
                let acDeg = ((acRad * 180 / Math.PI) % 360 + 360) % 360;
                return { ac: acDeg, mc: mcDeg };
            }

            // ---- DRAWING with DPI scaling ----
            function drawCosmicClock(timestamp) {
                // ---- DPI SCALING: match canvas to display size × devicePixelRatio ----
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();

                // 🛑 1. EARLY ABORT: If the canvas is hidden, stop immediately.
                if (rect.width < 60 || rect.height < 60) return;   // was === 0: a canvas mid-transition is tiny but not 0 → negative arc radius
                
                const displayWidth = rect.width;
                const displayHeight = rect.height;

                // Only update the internal drawing buffer, DO NOT apply inline CSS styles
                if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
                    canvas.width = displayWidth * dpr;
                    canvas.height = displayHeight * dpr;

                    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
                    ctx.scale(dpr, dpr);
                }

                if (!timestamp) timestamp = performance.now();
                if (lastTimestamp === 0) lastTimestamp = timestamp;
                const delta = (timestamp - lastTimestamp) / 1000;
                lastTimestamp = timestamp;

                // SHARED CLOCK: this view no longer integrates time itself — it follows EG.sim (so every panel and <astro-controls> agree)
                simTime = EG.sim.date(); isPlaying = EG.sim.playing; speedMultiplier = EG.sim.rate;

                // ---- All measurements use DISPLAY pixels (not canvas pixels) ----
                const cx = displayWidth / 2;
                const cy = displayHeight / 2;
                const rOuter = Math.min(displayWidth, displayHeight) * 0.42;
                const rZodiac = rOuter * 0.88;
                const rPlanets = rOuter * 0.68;
                const rTicks = rOuter * 0.92;

                ctx.clearRect(0, 0, displayWidth, displayHeight);

                const lat = parseFloat(latInput.value) || 29.9792;
                const lon = parseFloat(lonInput.value) || 31.1342;

                timeDisplay.innerText = `[ TIME: ${simTime.toUTCString()} ]`;

                const planetData = {};
                for (const p in PLANETS) {
                    planetData[p] = getPlanetPosition(p, simTime);
                }
                const angles = getACMC(simTime, lat, lon);
                const ac = angles.ac;
                const mc = angles.mc;

                const getAngle = (lonDeg) => Math.PI - (lonDeg * Math.PI / 180);

                // ---- Zodiac segments ----
                for (let i = 0; i < 12; i++) {
                    const startAngle = getAngle(i * 30);
                    const endAngle = getAngle((i + 1) * 30);
                    const elem = ELEMENTS[i];
                    const color = ELEMENT_COLORS[elem];
                    ctx.beginPath();
                    ctx.arc(cx, cy, rZodiac - 5, endAngle, startAngle);
                    ctx.arc(cx, cy, rZodiac - 30, startAngle, endAngle, true);
                    ctx.closePath();
                    ctx.fillStyle = color + '15';
                    ctx.fill();
                }

                // ---- Outer ring ----
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.arc(cx, cy, rOuter, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, rZodiac - 5, 0, 2 * Math.PI);
                ctx.stroke();

                // ---- Degree ticks ----
                for (let i = 0; i < 360; i += 5) {
                    const angle = getAngle(i);
                    const outer = i % 30 === 0 ? rTicks + 8 : (i % 10 === 0 ? rTicks + 4 : rTicks);
                    const inner = rTicks - 4;
                    ctx.beginPath();
                    ctx.moveTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
                    ctx.lineTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
                    ctx.strokeStyle = i % 30 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
                    ctx.lineWidth = i % 30 === 0 ? 2 : 1;
                    ctx.stroke();
                }

                // ---- Cardinal axes ----
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 6]);
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                const a0 = getAngle(0);
                ctx.beginPath();
                ctx.moveTo(cx + (rOuter - 5) * Math.cos(a0), cy + (rOuter - 5) * Math.sin(a0));
                ctx.lineTo(cx - (rOuter - 5) * Math.cos(a0), cy - (rOuter - 5) * Math.sin(a0));
                ctx.stroke();
                const a90 = getAngle(90);
                ctx.beginPath();
                ctx.moveTo(cx + (rOuter - 5) * Math.cos(a90), cy + (rOuter - 5) * Math.sin(a90));
                ctx.lineTo(cx - (rOuter - 5) * Math.cos(a90), cy - (rOuter - 5) * Math.sin(a90));
                ctx.stroke();
                ctx.setLineDash([]);

                // ---- Zodiac signs (with glow) ----
                ctx.font = '24px "Segoe UI Symbol", "Arial Unicode MS", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < 12; i++) {
                    const symAngle = getAngle(i * 30 + 15);
                    const elem = ELEMENTS[i];
                    const color = ELEMENT_COLORS[elem];
                    const pulse = Math.sin(Date.now() / 3000 + i) * 4 + 16; // subtle pulse
                    ctx.shadowColor = color;
                    ctx.shadowBlur = pulse;
                    ctx.fillStyle = color;
                    ctx.fillText(ZODIAC[i], cx + (rZodiac + 3) * Math.cos(symAngle), cy + (rZodiac + 3) * Math.sin(symAngle));
                }
                ctx.shadowBlur = 0;

                // ---- Planets ----
                ctx.font = '20px "Segoe UI Symbol", "Arial Unicode MS", Arial, sans-serif';
                for (const p in planetData) {
                    const lonDeg = planetData[p];
                    const angle = getAngle(lonDeg);

                    ctx.beginPath();
                    ctx.moveTo(cx + 30 * Math.cos(angle), cy + 30 * Math.sin(angle));
                    ctx.lineTo(cx + rPlanets * Math.cos(angle), cy + rPlanets * Math.sin(angle));
                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                    ctx.stroke();

                    ctx.fillStyle = PLANETS[p].col;
                    ctx.shadowColor = PLANETS[p].col;
                    ctx.shadowBlur = 18;
                    ctx.fillText(PLANETS[p].sym, cx + rPlanets * Math.cos(angle), cy + rPlanets * Math.sin(angle));
                }
                ctx.shadowBlur = 0;

                // ---- AC / MC ----
                const acAngle = getAngle(ac);
                const mcAngle = getAngle(mc);

                ctx.lineWidth = 2.5;
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(cx + (rOuter - 10) * Math.cos(acAngle), cy + (rOuter - 10) * Math.sin(acAngle));
                ctx.lineTo(cx - (rOuter - 10) * Math.cos(acAngle), cy - (rOuter - 10) * Math.sin(acAngle));
                ctx.stroke();
                ctx.fillStyle = '#ffaa00';
                ctx.font = '13px monospace';
                ctx.shadowBlur = 12;
                ctx.fillText('AC', cx + (rOuter + 18) * Math.cos(acAngle), cy + (rOuter + 18) * Math.sin(acAngle));

                ctx.strokeStyle = 'rgba(65, 105, 225, 0.6)';
                ctx.shadowColor = '#4169e1';
                ctx.beginPath();
                ctx.moveTo(cx + (rOuter - 10) * Math.cos(mcAngle), cy + (rOuter - 10) * Math.sin(mcAngle));
                ctx.lineTo(cx - (rOuter - 10) * Math.cos(mcAngle), cy - (rOuter - 10) * Math.sin(mcAngle));
                ctx.stroke();
                ctx.fillStyle = '#4169e1';
                ctx.shadowBlur = 10;
                ctx.fillText('MC', cx + (rOuter + 18) * Math.cos(mcAngle), cy + (rOuter + 18) * Math.sin(mcAngle));
                ctx.shadowBlur = 0;

                // ---- Center dot ----
                ctx.beginPath();
                ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(10,10,26,0.6)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // ---- Title ----
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 12px monospace';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🌀', cx, cy - 2);
                ctx.shadowBlur = 0;

                animFrame = EG.next('cosmic-clock', drawCosmicClock, { el: canvas, interval: () => EG.rateInterval(isPlaying, speedMultiplier) });
            }

            // ---- Resize handler ----
            const resizeObserver = new ResizeObserver(() => {
                if (animFrame) EG.cancel(animFrame);
                lastTimestamp = 0;
                drawCosmicClock();
            });
            resizeObserver.observe(canvas);

            window.addEventListener('resize', () => {
                if (animFrame) EG.cancel(animFrame);
                lastTimestamp = 0;
                drawCosmicClock();
            });

            // ---- Controls ----
            document.getElementById('c-play-pause').onclick = (e) => {
                EG.sim.set({ playing: !EG.sim.playing });
                isPlaying = EG.sim.playing;
                e.target.innerText = isPlaying ? "⏸ PAUSE" : "▶ PLAY";
                if (isPlaying) lastTimestamp = 0;
            };
            document.getElementById('c-now').onclick = () => {
                EG.sim.live();
                isPlaying = true;
                document.getElementById('c-play-pause').innerText = "⏸ PAUSE";
                simTime = EG.sim.date();
                lastTimestamp = 0;
            };
            const addTime = (ms) => {
                EG.sim.set({ playing: false }); EG.sim.step(ms);
                isPlaying = false;
                document.getElementById('c-play-pause').innerText = "▶ PLAY";
                simTime = EG.sim.date();
                lastTimestamp = 0;
            };
            document.getElementById('c-next-hr').onclick = () => addTime(3600000);
            document.getElementById('c-prev-hr').onclick = () => addTime(-3600000);
            document.getElementById('c-next-day').onclick = () => addTime(86400000);
            document.getElementById('c-prev-day').onclick = () => addTime(-86400000);
            document.getElementById('c-next-mo').onclick = () => addTime(86400000 * 30);
            document.getElementById('c-prev-mo').onclick = () => addTime(-86400000 * 30);

            const speedBtn = document.getElementById('c-speed');
            const speeds = [1, 60, 600, 1440, 6000, 60000, 600000, 6000000];
            let speedIndex = 0;
            speedBtn.innerText = `⚡1x`;
            speedBtn.onclick = () => {
                speedIndex = (speeds.reduce((b, v, i) => (v <= EG.sim.rate ? i : b), 0) + 1) % speeds.length;   // continue from where the SHARED clock really is, not from a stale index
                speedMultiplier = speeds[speedIndex]; EG.sim.set({ rate: speedMultiplier });
                speedBtn.innerText = `⚡${speedMultiplier}x`;
                lastTimestamp = 0;
            };

            drawCosmicClock();
        }




        // ===== FLAT EARTH TOGGLE =====
        (function initFlatEarthToggle() {
            const toggleBtn = document.getElementById('fe-toggle-btn');
            const section = document.getElementById('flat-earth-section');
            if (!toggleBtn || !section) return;

            let isVisible = false;

            toggleBtn.addEventListener('click', () => {
                isVisible = !isVisible;
                section.classList.toggle('visible', isVisible);
                toggleBtn.textContent = isVisible ? 'CLOSE SECTION' : 'AZIMU PROJECT';
                toggleBtn.style.borderColor = isVisible ? '#ffd700' : '';
                toggleBtn.style.color = isVisible ? '#ffd700' : '';
                toggleBtn.style.boxShadow = isVisible ? '0 0 30px #ffd70033' : '';

                if (isVisible && navigator.vibrate) navigator.vibrate(10);
            });

            console.log('Flat Earth Projection toggle ready.');
        })();

        // =========================================================================
        // === FLAT EARTH PROJECTION – CIRCULAR + STRETCHED (Glass + Dark Hue) ===
        // =========================================================================
        function initFlatEarthClock() {
            const canvas = document.getElementById('fe-canvas');
            const stretchedCanvas = document.getElementById('fe-stretched-canvas');
            if (!canvas || !stretchedCanvas) return;

            const ctx = canvas.getContext('2d');
            const stretchedCtx = stretchedCanvas.getContext('2d');
            
            const timeDisplay = document.getElementById('fe-time-display');
            const latInput = document.getElementById('fe-lat');
            const lonInput = document.getElementById('fe-lon');

            const PLANETS = {
                'Sun':    { sym: '☉', col: '#ffaa00', size: 24 },
                'Moon':   { sym: '☽', col: '#ececec', size: 18 },
                'Mercury':{ sym: '☿', col: '#00f0ff', size: 14 },
                'Venus':  { sym: '♀', col: '#ff00ff', size: 16 },
                'Mars':   { sym: '♂', col: '#ff3333', size: 16 },
                'Jupiter':{ sym: '♃', col: '#4aff9e', size: 20 },
                'Saturn': { sym: '♄', col: '#ffd733', size: 18 }
            };

            const ZODIAC = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
            const ZODIAC_STRETCHED = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];


            // ---- State (shared) ----
            let simTime = new Date();
            let isPlaying = false;
            let speedMultiplier = 1;
            const stretchFactor = 1.7;          // fixed stretch for elliptical version
            let lastTimestamp = 0;
            let animFrame;

            // ---- Helpers ----
            function getJulianDay(date) {
                const year = date.getUTCFullYear();
                const month = date.getUTCMonth() + 1;
                const day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600) / 24;
                let a = Math.floor((14 - month) / 12);
                let y = year + 4800 - a;
                let m = month + 12 * a - 3;
                return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
            }

            function getGMST(jd) {
                const T = (jd - 2451545.0) / 36525.0;
                let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0;
                return ((gmst % 360) + 360) % 360;
            }

            function getPlanetPosition(planet, date) {
                const days = (date - EPHEMERIS.refDate) / (1000 * 60 * 60 * 24);
                const lon = (window.EG && EG.ephem && EG.ephem.has(planet)) ? EG.ephem.lon(planet, date) : EPHEMERIS.refLon[planet] + EPHEMERIS.dailyMotion[planet] * days;
                return ((lon % 360) + 360) % 360;
            }

            function getDeclination(lon) {
                const eps = 23.439 * Math.PI / 180;
                const lonRad = lon * Math.PI / 180;
                const sinDec = Math.sin(lonRad) * Math.sin(eps);
                return Math.asin(sinDec) * 180 / Math.PI;
            }

            function getACMC(date, lat, lon) {
                const jd = getJulianDay(date);
                const gmstDeg = getGMST(jd);
                let lst = (gmstDeg + lon) % 360;
                if (lst < 0) lst += 360;
                const lstRad = lst * Math.PI / 180;
                const latRad = lat * Math.PI / 180;
                const epsRad = 23.439 * Math.PI / 180;
                let mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad));
                let mcDeg = ((mcRad * 180 / Math.PI) % 360 + 360) % 360;
                let num = Math.cos(lstRad);
                let den = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
                let acRad = Math.atan2(num, den);
                let acDeg = ((acRad * 180 / Math.PI) % 360 + 360) % 360;
                return { ac: acDeg, mc: mcDeg };
            }

            // ============================================================
            // 1. CIRCULAR FLAT EARTH (DPI‑scaled)
            // ============================================================
            function drawCircular() {
                const rect = canvas.getBoundingClientRect();
                const displayWidth = rect.width;
                const displayHeight = rect.height;
                if (displayWidth === 0 || displayHeight === 0) return;

                const dpr = window.devicePixelRatio || 1;
                const newWidth = displayWidth * dpr;
                const newHeight = displayHeight * dpr;

                if (canvas.width !== newWidth || canvas.height !== newHeight) {
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    canvas.style.width = displayWidth + 'px';
                    canvas.style.height = displayHeight + 'px';
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.scale(dpr, dpr);
                }

                const cx = displayWidth / 2;
                const cy = displayHeight / 2;
                const rDisc = Math.min(cx, cy) * 0.92;

                ctx.clearRect(0, 0, displayWidth, displayHeight);

                // Background disc
                ctx.beginPath();
                ctx.arc(cx, cy, rDisc, 0, 2 * Math.PI);
                ctx.fillStyle = '#06060c';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                const lat = parseFloat(latInput.value) || 29.9792;
                const lon = parseFloat(lonInput.value) || 31.1342;
                const planetData = {};
                for (const p in PLANETS) {
                    const lonDeg = getPlanetPosition(p, simTime);
                    const dec = getDeclination(lonDeg);
                    const stretch = (90 - dec) / 113.44;
                    const radius = rDisc * 0.92 * stretch;
                    const angle = Math.PI - (lonDeg * Math.PI / 180);
                    planetData[p] = {
                        x: cx + radius * Math.cos(angle),
                        y: cy + radius * Math.sin(angle),
                        lon: lonDeg,
                        dec: dec,
                        stretch: stretch
                    };
                }

                // Tropical rings
                ctx.setLineDash([2, 5]);
                ctx.lineWidth = 1;
                const rCancer = rDisc * 0.92 * ((90 - 23.44) / 113.44);
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.12)';
                ctx.beginPath(); ctx.arc(cx, cy, rCancer, 0, 2*Math.PI); ctx.stroke();
                const rEquator = rDisc * 0.92 * (90 / 113.44);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.beginPath(); ctx.arc(cx, cy, rEquator, 0, 2*Math.PI); ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.12)';
                ctx.beginPath(); ctx.arc(cx, cy, rDisc * 0.92, 0, 2*Math.PI); ctx.stroke();
                ctx.setLineDash([]);
                    

                // ---- Zodiac signs (circular, subtle glow) ----
                const zR = rDisc * 1.03;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < 12; i++) {
                    const angle = Math.PI - (i * 30 * Math.PI / 180);
                    const x = cx + zR * Math.cos(angle);
                    const y = cy + zR * Math.sin(angle);
                    
                    // Stronger glow – colour matching the element
                    const colors = ['#ff6666','#66ff66','#777d80','#0565ff','#ff6666','#66ff66','#777d80','#0565ff','#ff6666','#66ff66','#777d80','#0565ff'];
                    ctx.shadowColor = colors[i];
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = colors[i];
                    ctx.fillText(ZODIAC[i], x, y);
                }
                ctx.shadowBlur = 0; // Reset for other drawings

                // Day/Night spotlight
                const sun = planetData['Sun'];
                if (sun) {
                    const sunX = sun.x;
                    const sunY = sun.y;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, rDisc, 0, 2 * Math.PI);
                    ctx.clip();
                    ctx.fillStyle = 'rgba(3, 3, 12, 0.75)';
                    ctx.fillRect(0, 0, displayWidth, displayHeight);
                    ctx.globalCompositeOperation = 'destination-out';
                    const spotRad = rDisc * 0.85;
                    const grad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, spotRad);
                    grad.addColorStop(0, 'rgba(0,0,0,1)');
                    grad.addColorStop(0.3, 'rgba(0,0,0,0.85)');
                    grad.addColorStop(0.6, 'rgba(0,0,0,0.5)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.beginPath();
                    ctx.arc(sunX, sunY, spotRad, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.restore();
                }

                // Draw planets
                for (const p in planetData) {
                    const d = planetData[p];
                    const planet = PLANETS[p];
                    ctx.shadowColor = planet.col;
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = planet.col;
                    ctx.font = `${planet.size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(planet.sym, d.x, d.y);
                }
                ctx.shadowBlur = 0;

                // AC/MC lines
                const angles = getACMC(simTime, lat, lon);
                const ac = angles.ac;
                const mc = angles.mc;
                const rLine = rDisc * 0.95;
                const acAngle = Math.PI - (ac * Math.PI / 180);
                ctx.beginPath();
                ctx.moveTo(cx + 20 * Math.cos(acAngle), cy + 20 * Math.sin(acAngle));
                ctx.lineTo(cx + rLine * Math.cos(acAngle), cy + rLine * Math.sin(acAngle));
                ctx.strokeStyle = 'rgba(255,200,0,0.4)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#ffaa00';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('AC', cx + (rLine + 15) * Math.cos(acAngle), cy + (rLine + 15) * Math.sin(acAngle));

                const mcAngle = Math.PI - (mc * Math.PI / 180);
                ctx.beginPath();
                ctx.moveTo(cx + 20 * Math.cos(mcAngle), cy + 20 * Math.sin(mcAngle));
                ctx.lineTo(cx + rLine * Math.cos(mcAngle), cy + rLine * Math.sin(mcAngle));
                ctx.strokeStyle = 'rgba(0,255,100,0.4)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#00ff66';
                ctx.fillText('MC', cx + (rLine + 15) * Math.cos(mcAngle), cy + (rLine + 15) * Math.sin(mcAngle));

                // Polaris center
                ctx.beginPath();
                ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // ============================================================
            // 2. STRETCHED FLAT EARTH (Glass + Dark Hue + Outer Ellipse) – DPI‑scaled
            // ============================================================
            function drawStretched() {
                // Get the container size (not the canvas size directly)
                const container = stretchedCanvas.parentElement;
                const rect = container.getBoundingClientRect();
                const displayWidth = rect.width;
                const displayHeight = rect.height;
                if (displayWidth === 0 || displayHeight === 0) return;

                const dpr = window.devicePixelRatio || 1;
                const newWidth = displayWidth * dpr;
                const newHeight = displayHeight * dpr;

                if (stretchedCanvas.width !== newWidth || stretchedCanvas.height !== newHeight) {
                    stretchedCanvas.width = newWidth;
                    stretchedCanvas.height = newHeight;
                    stretchedCanvas.style.width = displayWidth + 'px';
                    stretchedCanvas.style.height = displayHeight + 'px';
                    stretchedCtx.setTransform(1, 0, 0, 1, 0, 0);
                    stretchedCtx.scale(dpr, dpr);
                }

                const cx = displayWidth / 2;
                const cy = displayHeight / 2;
                const baseRadius = Math.min(cx, cy) * 0.92;
                const rx = baseRadius * stretchFactor;
                const ry = baseRadius / stretchFactor;

                stretchedCtx.clearRect(0, 0, displayWidth, displayHeight);

                // ---- DARK HUE BACKGROUND (semi-transparent) ----
                stretchedCtx.fillStyle = 'rgba(6, 6, 12, 0.75)';
                stretchedCtx.fillRect(0, 0, displayWidth, displayHeight);

                // ---- OUTER ELLIPSE (clear, visible) ----
                stretchedCtx.beginPath();
                stretchedCtx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                stretchedCtx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
                stretchedCtx.lineWidth = 2;
                stretchedCtx.stroke();

                // ---- Zodiac signs on ellipse (stretched, strong glow) ----
                const rZodiac = baseRadius * 0.88;
                stretchedCtx.font = '18px Arial';
                stretchedCtx.textAlign = 'center';
                stretchedCtx.textBaseline = 'middle';
                for (let i = 0; i < 12; i++) {
                    const angle = Math.PI - ((i * 30 + 15) * Math.PI / 180);
                    const x = cx + rZodiac * Math.cos(angle) * stretchFactor;
                    const y = cy + rZodiac * Math.sin(angle) / stretchFactor;
                    
                    // Stronger glow – colour matching the element
                    const colors = ['#ff6666','#66ff66','#777d80','#0565ff','#ff6666','#66ff66','#777d80','#0565ff','#ff6666','#66ff66','#777d80','#0565ff'];
                    stretchedCtx.shadowColor = colors[i];
                    stretchedCtx.shadowBlur = 18;
                    stretchedCtx.fillStyle = colors[i];
                    stretchedCtx.fillText(ZODIAC_STRETCHED[i], x, y);
                }
                stretchedCtx.shadowBlur = 0; // Reset

                // ---- Planets on ellipse ----
                const lat = parseFloat(latInput.value) || 29.9792;
                const lon = parseFloat(lonInput.value) || 31.1342;
                const planetData = {};
                for (const p in PLANETS) {
                    const lonDeg = getPlanetPosition(p, simTime);
                    const dec = getDeclination(lonDeg);
                    const stretch = (90 - dec) / 113.44;
                    const radius = baseRadius * 0.92 * stretch;
                    const angle = Math.PI - (lonDeg * Math.PI / 180);
                    planetData[p] = {
                        x: cx + radius * Math.cos(angle) * stretchFactor,
                        y: cy + radius * Math.sin(angle) / stretchFactor,
                        lon: lonDeg,
                        dec: dec,
                        stretch: stretch
                    };
                }

                for (const p in planetData) {
                    const d = planetData[p];
                    const planet = PLANETS[p];
                    stretchedCtx.shadowColor = planet.col;
                    stretchedCtx.shadowBlur = 15;
                    stretchedCtx.fillStyle = planet.col;
                    stretchedCtx.font = `${planet.size}px Arial`;
                    stretchedCtx.textAlign = 'center';
                    stretchedCtx.textBaseline = 'middle';
                    stretchedCtx.fillText(planet.sym, d.x, d.y);
                }
                stretchedCtx.shadowBlur = 0;

                // ---- AC/MC lines (stretched) ----
                const angles = getACMC(simTime, lat, lon);
                const ac = angles.ac;
                const mc = angles.mc;
                const rLine = baseRadius * 0.9;

                // AC (orange)
                const acAngle = Math.PI - (ac * Math.PI / 180);
                const acX1 = cx + rLine * Math.cos(acAngle) * stretchFactor;
                const acY1 = cy + rLine * Math.sin(acAngle) / stretchFactor;
                const acX2 = cx - rLine * Math.cos(acAngle) * stretchFactor;
                const acY2 = cy - rLine * Math.sin(acAngle) / stretchFactor;
                stretchedCtx.beginPath();
                stretchedCtx.moveTo(acX1, acY1);
                stretchedCtx.lineTo(acX2, acY2);
                stretchedCtx.strokeStyle = 'rgba(255,200,0,0.5)';
                stretchedCtx.lineWidth = 2;
                stretchedCtx.setLineDash([3, 5]);
                stretchedCtx.stroke();
                stretchedCtx.setLineDash([]);
                stretchedCtx.fillStyle = '#ffaa00';
                stretchedCtx.font = '12px monospace';
                stretchedCtx.textAlign = 'center';
                stretchedCtx.textBaseline = 'middle';
                stretchedCtx.fillText('AC', acX1 + 15, acY1 + 15);

                // MC (green)
                const mcAngle = Math.PI - (mc * Math.PI / 180);
                const mcX1 = cx + rLine * Math.cos(mcAngle) * stretchFactor;
                const mcY1 = cy + rLine * Math.sin(mcAngle) / stretchFactor;
                const mcX2 = cx - rLine * Math.cos(mcAngle) * stretchFactor;
                const mcY2 = cy - rLine * Math.sin(mcAngle) / stretchFactor;
                stretchedCtx.beginPath();
                stretchedCtx.moveTo(mcX1, mcY1);
                stretchedCtx.lineTo(mcX2, mcY2);
                stretchedCtx.strokeStyle = 'rgba(0,255,100,0.5)';
                stretchedCtx.lineWidth = 2;
                stretchedCtx.setLineDash([3, 5]);
                stretchedCtx.stroke();
                stretchedCtx.setLineDash([]);
                stretchedCtx.fillStyle = '#00ff66';
                stretchedCtx.fillText('MC', mcX1 + 15, mcY1 + 15);

                // ---- Center dot ----
                stretchedCtx.beginPath();
                stretchedCtx.arc(cx, cy, 4, 0, 2 * Math.PI);
                stretchedCtx.fillStyle = '#00ffff';
                stretchedCtx.shadowColor = '#00ffff';
                stretchedCtx.shadowBlur = 12;
                stretchedCtx.fill();
                stretchedCtx.shadowBlur = 0;

                // ---- Label ----
                stretchedCtx.fillStyle = 'rgba(255, 170, 0, 0.3)';
                stretchedCtx.font = '10px monospace';
                stretchedCtx.textAlign = 'center';
                stretchedCtx.textBaseline = 'bottom';
                stretchedCtx.fillText('⬡ STRETCHED PROJECTION', cx, displayHeight - 10);
            }

            // ---- Main Loop ----
            function drawFlatEarth(timestamp) {
                if (!timestamp) timestamp = performance.now();
                if (lastTimestamp === 0) lastTimestamp = timestamp;
                const delta = (timestamp - lastTimestamp) / 1000;
                lastTimestamp = timestamp;

                // SHARED CLOCK: this view no longer integrates time itself — it follows EG.sim (so every panel and <astro-controls> agree)
                simTime = EG.sim.date(); isPlaying = EG.sim.playing; speedMultiplier = EG.sim.rate;

                if (timeDisplay) {
                    timeDisplay.innerText = `[ PROJECTION TIME: ${simTime.toUTCString()} ]`;
                }

                drawCircular();
                drawStretched();

                animFrame = EG.next('flat-earth', drawFlatEarth, { el: canvas, interval: () => EG.rateInterval(isPlaying, speedMultiplier) });
            }

            // ---- Controls ----
            document.getElementById('fe-play-pause').onclick = (e) => {
                EG.sim.set({ playing: !EG.sim.playing });
                isPlaying = EG.sim.playing;
                e.target.innerText = isPlaying ? "⏸ PAUSE" : "▶ PLAY";
                if (isPlaying) lastTimestamp = 0;
            };
            
            document.getElementById('fe-now').onclick = () => {
                EG.sim.live();
                isPlaying = true;
                document.getElementById('fe-play-pause').innerText = "⏸ PAUSE";
                simTime = EG.sim.date();
                lastTimestamp = 0;
            };

            const addTime = (ms) => {
                EG.sim.set({ playing: false }); EG.sim.step(ms);
                isPlaying = false;
                document.getElementById('fe-play-pause').innerText = "▶ PLAY";
                simTime = EG.sim.date();
                lastTimestamp = 0;
            };

            document.getElementById('fe-next-hr').onclick = () => addTime(3600000);
            document.getElementById('fe-prev-hr').onclick = () => addTime(-3600000);
            document.getElementById('fe-next-day').onclick = () => addTime(86400000);
            document.getElementById('fe-prev-day').onclick = () => addTime(-86400000);
            document.getElementById('fe-next-mo').onclick = () => addTime(86400000 * 30);
            document.getElementById('fe-prev-mo').onclick = () => addTime(-86400000 * 30);

            // Speed
            const speedBtn = document.getElementById('fe-speed');
            const speeds = [1, 60, 600, 1440, 6000, 60000, 600000, 6000000];
            let speedIndex = 0;
            speedBtn.onclick = () => {
                speedIndex = (speeds.reduce((b, v, i) => (v <= EG.sim.rate ? i : b), 0) + 1) % speeds.length;   // continue from where the SHARED clock really is, not from a stale index
                speedMultiplier = speeds[speedIndex]; EG.sim.set({ rate: speedMultiplier });
                speedBtn.innerText = `⚡ ${speedMultiplier}x`;
                lastTimestamp = 0;
            };

            drawFlatEarth();
        }

        // (removed a second top-level initFlatEarthClock() — it is already called in DOMContentLoaded and ran two competing 60fps loops)



        // =========================================================================
        // KABBALAH TREE OF LIFE – SVG Canvas Visualization
        // =========================================================================

        document.addEventListener('DOMContentLoaded', function() {
            // Tree of Life interaction
            const treeSVG = document.getElementById('tree-of-life');
            const reflectionTitle = document.getElementById('reflection-title');
            const reflectionText = document.getElementById('reflection-text');

            if (!treeSVG) return;

            // ---- Authentic Kabbalah Teachings ----
            const kabbalahTeachings = {
                kether: {
                    title: "KETHER (Crown)",
                    text: "The infinite light of the Ein Sof. It is the Divine Will, the breath before the word is spoken. Here lies absolute unity, beyond human comprehension and beyond form."
                },
                chokmah: {
                    title: "CHOKHMAH (Wisdom)",
                    text: "The primordial spark of creation. It is the masculine principle of raw, unformed insight, a flash of divine brilliance and the seed from which all existence expands."
                },
                binah: {
                    title: "BINAH (Understanding)",
                    text: "The Palace of Mirrors. The feminine womb of creation that takes the raw spark of Chokhmah and gives it structure, breadth, and depth. It is the origin of time and form."
                },
                daat: {
                    title: "DA'AT (Knowledge)",
                    text: "The hidden sphere. Da'at is not a true Sephirah, but the mystical bridge where Wisdom and Understanding unite. It represents the state of perfect, internalized consciousness."
                },
                chesed: {
                    title: "CHESED (Mercy / Loving-kindness)",
                    text: "The boundless outpouring of divine grace. It is the desire to share, expand, and bestow unconditional love without limit or restriction."
                },
                geburah: {
                    title: "GEBURAH (Severity / Judgment)",
                    text: "The vessel that contains the light. Gevurah is discipline, restriction, and awe. It provides the necessary boundaries so the boundless expansion of Chesed does not overwhelm creation."
                },
                tiphareth: {
                    title: "TIPHARETH (Beauty / Harmony)",
                    text: "The heart of the Tree. Tiferet perfectly balances the mercy of Chesed and the severity of Gevurah, generating compassion. It is the shining sun of the spiritual architecture."
                },
                netzach: {
                    title: "NETZACH (Eternity / Victory)",
                    text: "The relentless drive of nature and emotion. Netzach is endurance, the urge to overcome obstacles, and the passionate energy that pushes divine will into action."
                },
                hod: {
                    title: "HOD (Splendor / Surrender)",
                    text: "The intellect and the mold of form. Hod represents submission to a higher purpose, breaking down the ego to allow the divine light to reflect purely and symmetrically."
                },
                yesod: {
                    title: "YESOD (Foundation)",
                    text: "The astral blueprint. Yesod gathers all the higher energies of the Sephirot and acts as the funnel, translating the spiritual forces into a language the physical world can understand."
                },
                malkuth: {
                    title: "MALKUTH (Kingdom)",
                    text: "The physical realm. Malkuth possesses no light of its own, but receives the culmination of all upper emanations. It is the Shekhinah, the indwelling, manifested presence of the Divine."
                }
            };

            // Use event delegation on the SVG itself
            treeSVG.addEventListener('click', function(e) {
                const target = e.target;
                // Find the nearest circle (the sephirah node)
                const circle = target.closest('circle');
                if (!circle) return;
                const nodeName = circle.getAttribute('data-node');
                if (!nodeName) return;

                // Get the teaching data
                const data = kabbalahTeachings[nodeName];
                if (data) {
                    // Update reflection with the authentic title and text
                    reflectionTitle.textContent = data.title;
                    reflectionText.textContent = data.text;
                } else {
                    reflectionTitle.textContent = nodeName.toUpperCase();
                    reflectionText.textContent = "The wisdom of this sphere awaits your contemplation.";
                }

                // Remove active class from all circles
                document.querySelectorAll('#sephirot-group circle').forEach(c => c.classList.remove('active'));
                circle.classList.add('active');
            });
        });



        // =========================================================================
        // AZIMUTHAL FLAT EARTH ENGINE (DPI scales big)
        // =========================================================================
        (function initAzimuthalEngine() {
            const canvas = document.getElementById('azimuthal-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const timeDisplay = document.getElementById('az-time-display');

            // ---- Store CSS pixel dimensions (for DPI scaling) ----
            let cssWidth = 0;
            let cssHeight = 0;

            // ---- Size canvas to match its CSS display size (with DPI scaling) ----
            function sizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                const displayWidth = rect.width;
                const displayHeight = rect.height;

                // Guard against zero dimensions
                if (displayWidth === 0 || displayHeight === 0) return;

                const dpr = window.devicePixelRatio || 1;
                cssWidth = displayWidth;
                cssHeight = displayHeight;

                // Set canvas internal size (backing store) to DPR-scaled values
                const newWidth = displayWidth * dpr;
                const newHeight = displayHeight * dpr;

                if (canvas.width !== newWidth || canvas.height !== newHeight) {
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    canvas.style.width = displayWidth + 'px';
                    canvas.style.height = displayHeight + 'px';
                    // Reset transform and scale to map CSS pixels to canvas pixels
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.scale(dpr, dpr);
                }
            }

            sizeCanvas();
            window.addEventListener('resize', () => {
                sizeCanvas();
                // Redraw immediately after resize
                if (!isRunning) renderFrame();
                else renderLoop(); // ensures continuous loop updates size
            });

            // ---- Coordinates & radii (relative to CSS display size) ----
            function getRadii() {
                const r = Math.min(cssWidth, cssHeight) * 0.48;
                return {
                    cancer: r * 0.38,
                    equator: r * 0.54,
                    capricorn: r * 0.70,
                    base: r
                };
            }

            // ---- State ----
            let dayOfYear = 172;
            let timeOfDay = 0;
            let year = 2026;
            let isRunning = false;
            let speedMultiplier = 1;
            const speeds = [1, 2, 5, 10, 20, 60, 100];
            let speedIndex = 0;
            let animationId = null;

            // ---- Sync to actual time ----
            function syncToActualTime() {
                const now = new Date();
                // Use UTC to avoid timezone issues
                const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
                const diff = now.getTime() - start.getTime();
                dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
                timeOfDay = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
                year = now.getUTCFullYear();
                updateDisplay();
                renderFrame();
            }

            // ---- Update display ----
            function updateDisplay() {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const month = months[Math.floor((dayOfYear / 365) * 12) % 12];
                const day = Math.floor(dayOfYear % 30) + 1;
                const hours = Math.floor(timeOfDay);
                const totalMinutes = (timeOfDay - hours) * 60;
                const mins = Math.floor(totalMinutes);
                const secs = Math.floor((totalMinutes - mins) * 60);
                // Show GMT explicitly
                timeDisplay.textContent = `📅 ${month} ${day}, ${year} (GMT) | 🕐 ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} | ⚡ ${speedMultiplier}x`;
            }

            // ---- Load map image ----
            const mapImage = new Image();
            mapImage.src = './images/Azimuthal_Equidistant_N90.jpg';
            let mapLoaded = false;
            mapImage.onload = () => {
                mapLoaded = true;
                // Redraw if already running
                renderFrame();
            };
            mapImage.onerror = () => {
                console.warn('⚠️ Map image not found – check path');
            };

            // ---- Render frame (using CSS dimensions) ----
            function renderFrame() {
                // Guard against zero dimensions (avoid canvas corruption)
                if (cssWidth === 0 || cssHeight === 0) return;

                const w = cssWidth;
                const h = cssHeight;
                const cx = w / 2;
                const cy = h / 2;
                const r = getRadii();

                // Clear canvas (transparent -> shows page background)
                ctx.clearRect(0, 0, w, h);

                // Draw the map background
                if (mapLoaded) {
                    ctx.drawImage(mapImage, 0, 0, w, h);
                } else {
                    ctx.fillStyle = '#06060c';
                    ctx.fillRect(0, 0, w, h);
                }

                // =========================================================
                // ---- 1. Draw Reference Rings (Cancer, Equator, Capricorn)
                // =========================================================
                ctx.lineWidth = 1.5;

                // 1. Tropic of Cancer (Inner Ring - Summer Solstice boundary)
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.25)'; // Subtle warm tint
                ctx.beginPath();
                ctx.arc(cx, cy, r.cancer, 0, Math.PI * 2);
                ctx.stroke();

                // 2. The Equator (Middle Ring)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Brighter white
                ctx.setLineDash([4, 4]); // Makes the Equator a dashed line
                ctx.beginPath();
                ctx.arc(cx, cy, r.equator, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]); // Always reset dashes immediately so it doesn't affect the Sun/Moon

                // 3. Tropic of Capricorn (Outer Ring - Winter Solstice boundary)
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)'; // Subtle cool tint
                ctx.beginPath();
                ctx.arc(cx, cy, r.capricorn, 0, Math.PI * 2);
                ctx.stroke();

                // ---- 2. Solar position ----
                const raAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
                const decFactor = Math.cos(((dayOfYear - 172) / 365) * Math.PI * 2);
                const sunDist = r.equator - (decFactor * (r.equator - r.cancer));
                const sunX = cx + sunDist * Math.cos(raAngle);
                const sunY = cy + sunDist * Math.sin(raAngle);

                // =========================================================
                // ---- 3. Sun Ephemeris & Sync (Calculated for Moon offset)
                // =========================================================
                // Reconstruct current simulation time in milliseconds to calculate J2000 epoch days
                const simStartOfYear = new Date(Date.UTC(year, 0, 0)).getTime();
                const simCurrentMs = simStartOfYear + (dayOfYear * 24 * 60 * 60 * 1000) + (timeOfDay * 60 * 60 * 1000);
                const refDateMs = Date.UTC(2000, 0, 1, 12, 0, 0);
                const diffDays = (simCurrentMs - refDateMs) / (1000 * 60 * 60 * 24);

                const meanSunAnomaly = (357.529 + 0.98560028 * diffDays) * Math.PI / 180;
                const sunEclipticLon = (280.459 + 0.98564736 * diffDays + 1.915 * Math.sin(meanSunAnomaly)) * Math.PI / 180;
                const obliquity = 23.439 * Math.PI / 180;

                // Calculate Sun's Right Ascension for synchronization
                let sunRA = Math.atan2(
                    Math.sin(sunEclipticLon) * Math.cos(obliquity),
                    Math.cos(sunEclipticLon)
                );
                if (sunRA < 0) sunRA += 2 * Math.PI;

                // =========================================================
                // ---- 4. Improved Moon Position & Orbit 
                // =========================================================
                // Mean lunar elements (degrees)
                let L = (218.3165 + 13.176396 * diffDays) * Math.PI / 180;
                let M = (134.9634 + 13.064993 * diffDays) * Math.PI / 180;
                let F = (93.2720 + 13.229350 * diffDays) * Math.PI / 180;
                let Omega = (125.044 - 0.052954 * diffDays) * Math.PI / 180;

                let argLat = F - Omega;
                const eclipticLat = 5.145 * Math.PI / 180 * Math.sin(argLat);
                const eclipticLon = L + 6.289 * Math.PI / 180 * Math.sin(M); 

                // Convert to equatorial
                const sinDec = Math.sin(eclipticLat) * Math.cos(obliquity) + 
                               Math.cos(eclipticLat) * Math.sin(obliquity) * Math.sin(eclipticLon);
                const moonDec = Math.asin(sinDec);

                let moonRA = Math.atan2(
                    Math.sin(eclipticLon) * Math.cos(obliquity) - Math.tan(eclipticLat) * Math.sin(obliquity),
                    Math.cos(eclipticLon)
                );
                if (moonRA < 0) moonRA += 2 * Math.PI;

                // Map to azimuthal coordinates with the Safety Clamp
                const decDeg = moonDec * 180 / Math.PI;
                const rawMoonDist = r.equator - (decDeg / 23.44) * (r.equator - r.cancer);
                const minDist = r.cancer * 0.5; // Prevents the Moon from overlapping the absolute center
                const moonDist = Math.max(minDist, rawMoonDist); 

                // Tie the Moon's angle to the Sun's daily rotation (raAngle) 
                // offset by the celestial distance between the Moon and the Sun.
                const moonAngle = raAngle - (moonRA - sunRA); 

                const moonX = cx + moonDist * Math.cos(moonAngle);
                const moonY = cy + moonDist * Math.sin(moonAngle);

                // =========================================================
                // ---- 5. Moon Phase Calculation & Illumination 
                // =========================================================
                let phaseAngle = eclipticLon - sunEclipticLon;
                phaseAngle = ((phaseAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // Normalize 0 to 2PI

                // Calculate illumination (0.0 = New, 1.0 = Full)
                const illumination = (1 - Math.cos(phaseAngle)) / 2;

                // ---- Determine Phase Name ----
                let phaseName = "";
                const phaseDeg = phaseAngle * 180 / Math.PI;
                if (phaseDeg < 10 || phaseDeg > 350) phaseName = "New Moon";
                else if (phaseDeg >= 10 && phaseDeg < 80) phaseName = "Waxing Crescent";
                else if (phaseDeg >= 80 && phaseDeg < 100) phaseName = "First Quarter";
                else if (phaseDeg >= 100 && phaseDeg < 170) phaseName = "Waxing Gibbous";
                else if (phaseDeg >= 170 && phaseDeg < 190) phaseName = "Full Moon";
                else if (phaseDeg >= 190 && phaseDeg < 260) phaseName = "Waning Gibbous";
                else if (phaseDeg >= 260 && phaseDeg < 280) phaseName = "Last Quarter";
                else if (phaseDeg >= 280 && phaseDeg <= 350) phaseName = "Waning Crescent";

                

                
                // ---- 4. Daylight spotlight (dark overlay – dims the Moon when far from Sun) ----
                const grad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, r.base * 1.1);
                grad.addColorStop(0, 'rgba(255, 255, 200, 0.25)');
                grad.addColorStop(0.15, 'rgba(255, 255, 150, 0.08)');
                grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r.base * 1.05, 0, Math.PI * 2);
                ctx.fill();

                // ---- 5. Draw Sun (always bright, on top) ----
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 35;
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // =========================================================
                // ---- 6 Draw Moon with Concentric Ring Effect
                // =========================================================
                const moonRadius = 12;

                ctx.save();
                ctx.translate(moonX, moonY);

                // 1. The Concentric Outer Ring (Merges at Full Moon)
                // Math.pow(illumination, 2) squares the value so it stays subtle 
                // until it approaches Full Moon, where it rapidly maxes out.
                const ringOpacity = Math.pow(illumination, 2); 
                
                ctx.beginPath();
                ctx.arc(0, 0, moonRadius + 3.5, 0, 2 * Math.PI); // Outer circumference diameter
                ctx.fillStyle = `rgba(226, 232, 240, ${ringOpacity})`;
                ctx.fill();

                // 2. Exponential Intensity Glow (Blowout effect)
                const glowIntensity = 0.1 + (0.9 * illumination); 
                const blurRadius = 10 + (40 * Math.pow(illumination, 2));

                ctx.shadowColor = `rgba(255, 255, 255, ${glowIntensity})`;
                ctx.shadowBlur = blurRadius; 

                // 3. Base dark circle (Initial Moon Ball inside)
                ctx.beginPath();
                ctx.arc(0, 0, moonRadius, 0, 2 * Math.PI);
                ctx.fillStyle = '#1a1a1a'; 
                ctx.fill();

                // Turn off main glow for the crisp geometry steps
                ctx.shadowBlur = 0; 

                const isWaxing = phaseAngle < Math.PI;

                // 4. Draw the bright half-circle
                ctx.beginPath();
                ctx.arc(0, 0, moonRadius, isWaxing ? -Math.PI/2 : Math.PI/2, isWaxing ? Math.PI/2 : -Math.PI/2);
                ctx.fillStyle = '#e2e8f0'; 
                ctx.fill();

                // 5. Simple Terminator Line
                const termWidth = moonRadius * Math.abs(Math.cos(phaseAngle));
                const isCrescent = (phaseAngle < Math.PI / 2) || (phaseAngle > 3 * Math.PI / 2);

                ctx.beginPath();
                ctx.ellipse(0, 0, termWidth, moonRadius, 0, 0, Math.PI * 2);

                // Anti-aliasing trick
                ctx.shadowColor = isCrescent ? '#1a1a1a' : '#e2e8f0';
                ctx.shadowBlur = 1.5; 
                ctx.fillStyle = isCrescent ? '#1a1a1a' : '#e2e8f0';
                ctx.fill();

                // 6. Draw Phase Name Label
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(0, 240, 255, 0.7)'; 
                
                const isMobile = cssWidth < 600;
                ctx.font = isMobile ? '7px "VT323", monospace' : '10px "VT323", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                // Pushed down slightly (11 and 8) to clear the new outer ring
                ctx.fillText(phaseName, 0, moonRadius + (isMobile ? 8 : 11)); 

                ctx.restore();

                // ---- 7. AC/MC line ----
                ctx.strokeStyle = 'rgba(255,200,0,0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 8]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + r.base * Math.cos(raAngle), cy + r.base * Math.sin(raAngle));
                ctx.stroke();
                ctx.setLineDash([]);

                // ---- 8. Polaris center ----
                ctx.beginPath();
                ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;

                updateDisplay();
            }

            // ---- Main loop ----
            function renderLoop() {
                if (isRunning) {
                    timeOfDay += 0.01 * speedMultiplier;
                    if (timeOfDay >= 24) {
                        timeOfDay -= 24;
                        dayOfYear = (dayOfYear + 1) % 365;
                        if (dayOfYear === 0) year++;
                    }
                    renderFrame();
                    animationId = EG.next('azimuthal-engine', renderLoop, { el: canvas, interval: 0 });   // speed here is per-frame, so only visibility-gate it
                }
                // ---- Load and draw map image ----
                // (Duplicate code removed – we already load the image once above)
                // If you still want to keep it for some reason, it's redundant.
            }

            // ---- Controls ----
            const playBtn = document.getElementById('az-playpause');
            const syncBtn = document.getElementById('az-sync');
            const speedBtn = document.getElementById('az-speed');
            const dayBtn = document.getElementById('az-day');
            const sixMoBtn = document.getElementById('az-6mo');
            const yearBtn = document.getElementById('az-year');
            const resetBtn = document.getElementById('az-reset');

            playBtn.addEventListener('click', () => {
                isRunning = !isRunning;
                playBtn.textContent = isRunning ? '⏸ Pause' : '▶ Play';
                if (isRunning) {
                    renderLoop();
                } else {
                    if (animationId) EG.cancel(animationId);
                }
            });

            syncBtn.addEventListener('click', syncToActualTime);

            speedBtn.addEventListener('click', () => {
                speedIndex = (speedIndex + 1) % speeds.length;
                speedMultiplier = speeds[speedIndex];
                speedBtn.textContent = `⚡${speedMultiplier}x`;
            });

            dayBtn.addEventListener('click', () => {
                dayOfYear = (dayOfYear + 1) % 365;
                if (dayOfYear === 0) year++;
                renderFrame();
            });

            document.getElementById('az-prev-mo').addEventListener('click', () => {
                dayOfYear = (dayOfYear - 30 + 365) % 365;
                renderFrame();
            });

            document.getElementById('az-next-mo').addEventListener('click', () => {
                dayOfYear = (dayOfYear + 30) % 365;
                renderFrame();
            });

            sixMoBtn.addEventListener('click', () => {
                dayOfYear = (dayOfYear + 180) % 365;
                if (dayOfYear === 0) year++;
                renderFrame();
            });

            yearBtn.addEventListener('click', () => {
                year++;
                renderFrame();
            });

            resetBtn.addEventListener('click', () => {
                if (animationId) EG.cancel(animationId);
                isRunning = false;
                playBtn.textContent = '▶ Play';
                syncToActualTime();
                renderFrame();
            });

            // ---- Start ----
            syncToActualTime();
            renderFrame();
            console.log('Azimuthal Engine loaded.');
        })();

        // ============================================================
        // AZIMUTHAL DROPDOWN TOGGLE
        // ============================================================
        (function initAzimuthalDropdown() {
            const toggleBtn = document.getElementById('azimuthal-toggle-btn');
            const panel = document.getElementById('azimuthal-panel');
            if (!toggleBtn || !panel) return;

            let isVisible = false;
            let isAnimating = false;

            toggleBtn.addEventListener('click', () => {
                if (isAnimating) return;
                isAnimating = true;
                isVisible = !isVisible;

                requestAnimationFrame(() => {
                    panel.classList.toggle('visible', isVisible);
                    toggleBtn.textContent = isVisible ? 'CLOSE ENGINE' : 'AZMUT ENGINE';

                    // ---- Lazy load: initialise the engine when opened for the first time ----
                    if (isVisible && typeof window.initAzimuthalEngine === 'function') {
                        // The engine will guard itself against double initialisation
                        window.initAzimuthalEngine();
                    }

                    setTimeout(() => {
                        isAnimating = false;
                    }, 500);
                });
            });

            // ---- Keyboard shortcut: 'A' for Azimuthal ----
            document.addEventListener('keydown', (e) => {
                if ((e.key === 'a' || e.key === 'A') && document.activeElement?.tagName !== 'INPUT') {
                    e.preventDefault();
                    toggleBtn.click();
                }
            });

            console.log('Azimuthal dropdown ready.');
        })();




        // =====================================================================
        // UNIFIED ASTROLABE ENGINE – Azimuthal + Cosmic (DPI‑scaled)
        // =====================================================================
        (function initAstrolabe() {

            // ---------- Ephemeris (same as before) ----------
            const EPHEMERIS = {
                refDate: new Date(2020, 0, 1).getTime(),
                refLon: {
                    'Sun': 280.0, 'Moon': 180.0, 'Mercury': 180.0, 'Venus': 200.0,
                    'Mars': 120.0, 'Jupiter': 290.0, 'Saturn': 320.0, 'Uranus': 30.0,
                    'Neptune': 340.0, 'Pluto': 260.0
                },
                dailyMotion: {
                    'Sun': 0.9856, 'Moon': 13.176, 'Mercury': 1.383, 'Venus': 1.602,
                    'Mars': 0.524, 'Jupiter': 0.083, 'Saturn': 0.033, 'Uranus': 0.012,
                    'Neptune': 0.006, 'Pluto': 0.004
                }
            };

            // ---------- DOM refs ----------
            const azCanvas = document.getElementById('azimuthal-layer');
            const cosCanvas = document.getElementById('cosmic-layer');
            const azCtx = azCanvas.getContext('2d');
            const cosCtx = cosCanvas.getContext('2d');
            const timeDisplay = document.getElementById('shared-time-display');

            // ---------- Shared state ----------
            let simTime = new Date();
            let isRunning = true;
            let speedMultiplier = 1;
            const speeds = [1, 20, 60, 600, 3600, 36000, 72000, 360000, 720000];
            let speedIndex = 0;

            // Toggles
            let showZodiac = true;
            let showPlanets = true;
            let showACMC = true;
            let showPrecision = true;   // NEW: astrotheme-style precision layer (1° bars, true degrees, de-cluttered glyphs, aspect lines)

            // ---------- Cosmic helpers (same as before) ----------
            const ZODIAC = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
            const ELEMENTS = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water'];
            const ELEMENT_COLORS = { Fire: '#ff6666', Earth: '#66ff66', Air: '#777d80', Water: '#0565ff' };
            const PLANETS = {
                'Sun': { sym: '☉', col: '#ffaa00' },
                'Moon': { sym: '☽', col: '#ececec' },
                'Mercury': { sym: '☿', col: '#00f0ff' },
                'Venus': { sym: '♀', col: '#ff00ff' },
                'Mars': { sym: '♂', col: '#ff3333' },
                'Jupiter': { sym: '♃', col: '#4aff9e' },
                'Saturn': { sym: '♄', col: '#ffd733' },
                'Uranus': { sym: '♅', col: '#00ced1' },
                'Neptune': { sym: '♆', col: '#4169e1' },
                'Pluto': { sym: '♇', col: '#8b4513' }
            };

            function getJulianDay(date) {
                const year = date.getUTCFullYear();
                const month = date.getUTCMonth() + 1;
                const day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600)/24;
                let a = Math.floor((14 - month) / 12);
                let y = year + 4800 - a;
                let m = month + 12 * a - 3;
                return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
            }
            function getGMST(jd) {
                const T = (jd - 2451545.0) / 36525.0;
                let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0;
                return ((gmst % 360) + 360) % 360;
            }
            function getPlanetPosition(planet, date) {
                // ---- SUN: Use J2000 real‑time physics ----
                if (planet === 'Sun') {
                    return getSunPosition(date).lon;
                }
                // ---- MOON: Use J2000 real‑time physics ----
                if (planet === 'Moon') {
                    return getMoonPosition(date).lon;
                }
                
                // ---- ALL OTHER PLANETS: Use JSON linear ----
                const days = (date - EPHEMERIS.refDate) / (1000 * 60 * 60 * 24);
                const lon = (window.EG && EG.ephem && EG.ephem.has(planet)) ? EG.ephem.lon(planet, date) : EPHEMERIS.refLon[planet] + EPHEMERIS.dailyMotion[planet] * days;
                return ((lon % 360) + 360) % 360;
            }
            function getACMC(date, lat, lon) {
                const jd = getJulianDay(date);
                const gmstDeg = getGMST(jd);
                let lst = (gmstDeg + lon) % 360;
                if (lst < 0) lst += 360;
                const lstRad = lst * Math.PI / 180;
                const latRad = lat * Math.PI / 180;
                const epsRad = 23.439 * Math.PI / 180;
                let mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad));
                let mcDeg = ((mcRad * 180 / Math.PI) % 360 + 360) % 360;
                let num = Math.cos(lstRad);
                let den = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
                let acRad = Math.atan2(num, den);
                let acDeg = ((acRad * 180 / Math.PI) % 360 + 360) % 360;
                return { ac: acDeg, mc: mcDeg };
            }

            // ---------- Load map image (for azimuthal) ----------
            const mapImage = new Image();
            mapImage.src = './images/Azimuthal_Equidistant_N90.jpg';
            let mapLoaded = false;
            mapImage.onload = () => { mapLoaded = true; };
            mapImage.onerror = () => { console.warn('⚠️ Map image missing - using fallback'); };

            // ---------- Render functions ----------

            // 1. Azimuthal (DPI scaling)
            function renderAzimuthal() {
                const rect = azCanvas.getBoundingClientRect();
                if (rect.width < 60 || rect.height < 60) return;   // was === 0: a canvas mid-transition is tiny but not 0 → negative arc radius

                const dpr = window.devicePixelRatio || 1;
                const displayWidth = rect.width;
                const displayHeight = rect.height;

                // Set canvas size with DPI scaling
                if (azCanvas.width !== displayWidth * dpr || azCanvas.height !== displayHeight * dpr) {
                    azCanvas.width = displayWidth * dpr;
                    azCanvas.height = displayHeight * dpr;
                    azCanvas.style.width = displayWidth + 'px';
                    azCanvas.style.height = displayHeight + 'px';
                    azCtx.setTransform(1, 0, 0, 1, 0, 0);
                    azCtx.scale(dpr, dpr);
                }

                const w = displayWidth, h = displayHeight;
                const cx = w / 2, cy = h / 2;
                const r = Math.min(w, h) * 0.48;
                const radii = {
                    cancer: r * 0.38,
                    equator: r * 0.55,
                    capricorn: r * 0.72,
                    base: r
                };

                // Clear
                azCtx.clearRect(0, 0, w, h);
                if (mapLoaded) {
                    azCtx.drawImage(mapImage, 0, 0, w, h);
                } else {
                    azCtx.fillStyle = '#06060c';
                    azCtx.fillRect(0, 0, w, h);
                }

                // Compute dayOfYear and timeOfDay from simTime
                const startOfYear = new Date(Date.UTC(simTime.getUTCFullYear(), 0, 0));
                const diff = simTime.getTime() - startOfYear.getTime();
                const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
                const timeOfDay = simTime.getUTCHours() + simTime.getUTCMinutes() / 60 + simTime.getUTCSeconds() / 3600;

                // Rings
                // ---- (Tropic of Cancer, Equator, Tropic of Capricorn) ----
                const ringColors = [
                    { radius: radii.cancer, color: 'rgba(255, 80, 80, 0.25)', label: 'Cancer', dash: null },
                    { radius: radii.equator, color: 'rgba(255, 200, 0, 255)', label: 'Equator', dash: [8, 8] }, // dashed
                    { radius: radii.capricorn, color: 'rgba(0, 240, 255, 0.3)', label: 'Capricorn', dash: null }
                ];

                azCtx.lineWidth = 1.5;
                ringColors.forEach(ring => {
                    azCtx.strokeStyle = ring.color;
                    // Apply dash if defined, otherwise solid
                    if (ring.dash) {
                        azCtx.setLineDash(ring.dash);
                    } else {
                        azCtx.setLineDash([]);
                    }
                    azCtx.beginPath();
                    azCtx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
                    azCtx.stroke();
                });
                // Reset dash after loop
                azCtx.setLineDash([]);

                // Sun
                const raAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
                const decFactor = Math.cos(((dayOfYear - 172) / 365) * Math.PI * 2);
                const sunDist = radii.equator - (decFactor * (radii.equator - radii.cancer));
                const sunX = cx + sunDist * Math.cos(raAngle);
                const sunY = cy + sunDist * Math.sin(raAngle);

                // ---- Sun Ephemeris & Sync (Moved up to calculate Moon offset) ----
                const refDate = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
                const diffDays = (simTime.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);

                const meanSunAnomaly = (357.529 + 0.98560028 * diffDays) * Math.PI / 180;
                const sunEclipticLon = (280.459 + 0.98564736 * diffDays + 1.915 * Math.sin(meanSunAnomaly)) * Math.PI / 180;
                const obliquity = 23.439 * Math.PI / 180;

                // Calculate Sun's Right Ascension for synchronization
                let sunRA = Math.atan2(
                    Math.sin(sunEclipticLon) * Math.cos(obliquity),
                    Math.cos(sunEclipticLon)
                );
                if (sunRA < 0) sunRA += 2 * Math.PI;

                // Moon
                // ---- Improved Moon Position & Orbit ----
                // Mean lunar elements (degrees)
                let L = (218.3165 + 13.176396 * diffDays) * Math.PI / 180;
                let M = (134.9634 + 13.064993 * diffDays) * Math.PI / 180;
                let F = (93.2720 + 13.229350 * diffDays) * Math.PI / 180;
                let Omega = (125.044 - 0.052954 * diffDays) * Math.PI / 180;

                let argLat = F - Omega;
                const eclipticLat = 5.145 * Math.PI / 180 * Math.sin(argLat);
                const eclipticLon = L + 6.289 * Math.PI / 180 * Math.sin(M); 

                // Convert to equatorial
                const sinDec = Math.sin(eclipticLat) * Math.cos(obliquity) + 
                            Math.cos(eclipticLat) * Math.sin(obliquity) * Math.sin(eclipticLon);
                const moonDec = Math.asin(sinDec);

                let moonRA = Math.atan2(
                    Math.sin(eclipticLon) * Math.cos(obliquity) - Math.tan(eclipticLat) * Math.sin(obliquity),
                    Math.cos(eclipticLon)
                );
                if (moonRA < 0) moonRA += 2 * Math.PI;

                // Map to azimuthal coordinates with the Safety Clamp
                const decDeg = moonDec * 180 / Math.PI;
                const rawMoonDist = radii.equator - (decDeg / 23.44) * (radii.equator - radii.cancer);
                const minDist = radii.cancer * 0.5; // Prevents the Moon from overlapping the center
                const moonDist = Math.max(minDist, rawMoonDist); 

                // Tie the Moon's angle to the Sun's daily rotation (raAngle) 
                // offset by the celestial distance between the Moon and the Sun.
                const moonAngle = raAngle - (moonRA - sunRA); 

                const moonX = cx + moonDist * Math.cos(moonAngle);
                const moonY = cy + moonDist * Math.sin(moonAngle);

                // ---- Moon Phase Calculation ----
                let phaseAngle = eclipticLon - sunEclipticLon;
                phaseAngle = ((phaseAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // Normalize 0 to 2PI

                // Calculate illumination (0.0 = New, 1.0 = Full)
                const illumination = (1 - Math.cos(phaseAngle)) / 2;

                // ---- Determine Phase Name ----
                let phaseName = "";
                const phaseDeg = phaseAngle * 180 / Math.PI;
                if (phaseDeg < 10 || phaseDeg > 350) phaseName = "New Moon";
                else if (phaseDeg >= 10 && phaseDeg < 80) phaseName = "Waxing Crescent";
                else if (phaseDeg >= 80 && phaseDeg < 100) phaseName = "First Quarter";
                else if (phaseDeg >= 100 && phaseDeg < 170) phaseName = "Waxing Gibbous";
                else if (phaseDeg >= 170 && phaseDeg < 190) phaseName = "Full Moon";
                else if (phaseDeg >= 190 && phaseDeg < 260) phaseName = "Waning Gibbous";
                else if (phaseDeg >= 260 && phaseDeg < 280) phaseName = "Last Quarter";
                else if (phaseDeg >= 280 && phaseDeg <= 350) phaseName = "Waning Crescent";

                

            

                // Daylight gradient
                const grad = azCtx.createRadialGradient(sunX, sunY, 10, sunX, sunY, radii.base * 1.1);
                grad.addColorStop(0, 'rgba(255,255,200,0.25)');
                grad.addColorStop(0.15, 'rgba(255,255,150,0.08)');
                grad.addColorStop(0.6, 'rgba(0,0,0,0.4)');
                grad.addColorStop(1, 'rgba(0,0,0,0.7)');
                azCtx.fillStyle = grad;
                azCtx.beginPath();
                azCtx.arc(cx, cy, radii.base * 1.05, 0, Math.PI * 2);
                azCtx.fill();

                // Moon
                azCtx.shadowColor = '#fff';
                azCtx.shadowBlur = 20;
                azCtx.fillStyle = '#ddd';
                azCtx.beginPath();
                azCtx.arc(moonX, moonY, 8, 0, Math.PI * 2);
                azCtx.fill();

                // ---- Draw Moon with Geometrically Accurate Phase ----
                const moonRadius = 12;

                azCtx.save();
                azCtx.translate(moonX, moonY);

                // Dynamic Intensity Glow
                const glowIntensity = 0.1 + (0.7 * illumination); // up to 0.8 at full moon
                azCtx.shadowColor = `rgba(255, 255, 255, ${glowIntensity})`;
                azCtx.shadowBlur = 20 * (0.8 + illumination); // up to 36 at full moon
                

                // Base dark circle (Unilluminated side)
                azCtx.beginPath();
                azCtx.arc(0, 0, moonRadius, 0, 2 * Math.PI);
                azCtx.fillStyle = '#1a1a1a'; 
                azCtx.fill();

                // Turn off main glow for the crisp geometry steps
                azCtx.shadowBlur = 0; 

                // Determine if waxing or waning
                const isWaxing = phaseAngle < Math.PI;

                // Draw the bright half-circle
                azCtx.beginPath();
                azCtx.arc(0, 0, moonRadius, isWaxing ? -Math.PI/2 : Math.PI/2, isWaxing ? Math.PI/2 : -Math.PI/2);
                azCtx.fillStyle = '#e2e8f0'; 
                azCtx.fill();

                // Simple Terminator Line (No Tilt)
                const termWidth = moonRadius * Math.abs(Math.cos(phaseAngle));
                const isCrescent = (phaseAngle < Math.PI / 2) || (phaseAngle > 3 * Math.PI / 2);

                azCtx.beginPath();
                // Ellipse signature with 0 rotation: x, y, radiusX, radiusY, rotation, startAngle, endAngle
                azCtx.ellipse(0, 0, termWidth, moonRadius, 0, 0, Math.PI * 2);

                // Anti-aliasing trick
                azCtx.shadowColor = isCrescent ? '#1a1a1a' : '#e2e8f0';
                azCtx.shadowBlur = 1.5; 
                azCtx.fillStyle = isCrescent ? '#1a1a1a' : '#e2e8f0';
                azCtx.fill();

                // Draw Phase Name Label
                // ---- Determine if mobile ----
                const isMobile = window.innerWidth < 600;

                // ---- Draw Phase Name with responsive font ----
                const labelFontSize = isMobile ? 7 : 10;
                const labelOffset = isMobile ? 2 : 8;

                azCtx.shadowBlur = 0;
                azCtx.fillStyle = 'rgba(0, 240, 255, 270)';
                azCtx.font = `${labelFontSize}px "VT323", monospace`;
                azCtx.textAlign = 'center';
                azCtx.textBaseline = 'top';
                azCtx.fillText(phaseName, 0, moonRadius + labelOffset);
                azCtx.shadowBlur = 0;

                azCtx.restore();

                // Sun
                azCtx.shadowColor = '#FFD700';
                azCtx.shadowBlur = 35;
                azCtx.fillStyle = '#FFD700';
                azCtx.beginPath();
                azCtx.arc(sunX, sunY, 14, 0, Math.PI * 2);
                azCtx.fill();
                azCtx.shadowBlur = 0;

                // AC/MC line (using RA as proxy)
                azCtx.strokeStyle = 'rgba(255,200,0,0.15)';
                azCtx.lineWidth = 1;
                azCtx.setLineDash([4, 8]);
                azCtx.beginPath();
                azCtx.moveTo(cx, cy);
                azCtx.lineTo(cx + radii.base * Math.cos(raAngle), cy + radii.base * Math.sin(raAngle));
                azCtx.stroke();
                azCtx.setLineDash([]);

                // Polaris
                azCtx.beginPath();
                azCtx.arc(cx, cy, 4, 0, Math.PI * 2);
                azCtx.fillStyle = '#00ffff';
                azCtx.shadowColor = '#00ffff';
                azCtx.shadowBlur = 12;
                azCtx.fill();
                azCtx.shadowBlur = 0;

                // Update time display (once per frame)
                updateTimeDisplay();
            }

            // 2. Cosmic (DPI‑scaled)
            function renderCosmic() {
                const rect = cosCanvas.getBoundingClientRect();
                if (rect.width < 60 || rect.height < 60) return;   // was === 0: a canvas mid-transition is tiny but not 0 → negative arc radius
                
                const dpr = window.devicePixelRatio || 1;
                const displayWidth = rect.width;
                const displayHeight = rect.height;

                // Set canvas size with DPI scaling
                if (cosCanvas.width !== displayWidth * dpr || cosCanvas.height !== displayHeight * dpr) {
                    cosCanvas.width = displayWidth * dpr;
                    cosCanvas.height = displayHeight * dpr;
                    cosCanvas.style.width = displayWidth + 'px';
                    cosCanvas.style.height = displayHeight + 'px';
                    cosCtx.setTransform(1, 0, 0, 1, 0, 0);
                    cosCtx.scale(dpr, dpr);
                }

                const cx = displayWidth / 2, cy = displayHeight / 2;
                const rOuter = Math.min(displayWidth, displayHeight) * 0.52;
                const rZodiac = rOuter * 0.88;
                const rPlanets = rOuter * 0.76;
                const rTicks = rOuter * 0.94;

                // Clear (transparent)
                cosCtx.clearRect(0, 0, displayWidth, displayHeight);

                // Use fixed lat/lon from inputs (if they exist) – otherwise default Giza
                const latInput = document.getElementById('cosmic-lat');
                const lonInput = document.getElementById('cosmic-lon');
                const lat = latInput ? parseFloat(latInput.value) || 29.9792 : 29.9792;
                const lon = lonInput ? parseFloat(lonInput.value) || 31.1342 : 31.1342;

                const planetData = {};
                for (const p in PLANETS) {
                    planetData[p] = getPlanetPosition(p, simTime);
                }
                const angles = getACMC(simTime, lat, lon);
                const ac = angles.ac;
                const mc = angles.mc;

                const getAngle = (lonDeg) => Math.PI - (lonDeg * Math.PI / 180);

                // ---- Zodiac segments (toggle) ----
                if (showZodiac) {
                    for (let i = 0; i < 12; i++) {
                        const startAngle = getAngle(i * 30);
                        const endAngle = getAngle((i + 1) * 30);
                        const elem = ELEMENTS[i];
                        const color = ELEMENT_COLORS[elem];
                        cosCtx.beginPath();
                        cosCtx.arc(cx, cy, rZodiac - 5, endAngle, startAngle);
                        cosCtx.arc(cx, cy, rZodiac - 30, startAngle, endAngle, true);
                        cosCtx.closePath();
                        cosCtx.fillStyle = color + '15';
                        cosCtx.fill();
                    }
                }

                // Outer rings
                cosCtx.lineWidth = 1.5;
                cosCtx.strokeStyle = 'rgba(255,255,255,0.15)';
                cosCtx.beginPath();
                cosCtx.arc(cx, cy, rOuter, 0, 2 * Math.PI);
                cosCtx.stroke();
                cosCtx.beginPath();
                cosCtx.arc(cx, cy, rZodiac - 5, 0, 2 * Math.PI);
                cosCtx.stroke();

                // Degree ticks
                for (let i = 0; i < 360; i += 5) {
                    const angle = getAngle(i);
                    const outer = i % 30 === 0 ? rTicks + 8 : (i % 10 === 0 ? rTicks + 4 : rTicks);
                    const inner = rTicks - 4;
                    cosCtx.beginPath();
                    cosCtx.moveTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
                    cosCtx.lineTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
                    cosCtx.strokeStyle = i % 30 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
                    cosCtx.lineWidth = i % 30 === 0 ? 2 : 1;
                    cosCtx.stroke();
                }

                // Cardinal axes
                cosCtx.lineWidth = 1;
                cosCtx.setLineDash([4, 6]);
                cosCtx.strokeStyle = 'rgba(255,255,255,0.08)';
                const a0 = getAngle(0);
                cosCtx.beginPath();
                cosCtx.moveTo(cx + (rOuter - 5) * Math.cos(a0), cy + (rOuter - 5) * Math.sin(a0));
                cosCtx.lineTo(cx - (rOuter - 5) * Math.cos(a0), cy - (rOuter - 5) * Math.sin(a0));
                cosCtx.stroke();
                const a90 = getAngle(90);
                cosCtx.beginPath();
                cosCtx.moveTo(cx + (rOuter - 5) * Math.cos(a90), cy + (rOuter - 5) * Math.sin(a90));
                cosCtx.lineTo(cx - (rOuter - 5) * Math.cos(a90), cy - (rOuter - 5) * Math.sin(a90));
                cosCtx.stroke();
                cosCtx.setLineDash([]);

                // ---- Zodiac signs (toggle) ----
                if (showZodiac) {
                    cosCtx.font = '24px "Segoe UI Symbol", "Arial Unicode MS", Arial, sans-serif';
                    cosCtx.textAlign = 'center';
                    cosCtx.textBaseline = 'middle';
                    for (let i = 0; i < 12; i++) {
                        const symAngle = getAngle(i * 30 + 15);
                        const elem = ELEMENTS[i];
                        const color = ELEMENT_COLORS[elem];
                        const pulse = Math.sin(Date.now() / 3000 + i) * 4 + 16;
                        cosCtx.shadowColor = color;
                        cosCtx.shadowBlur = pulse;
                        cosCtx.fillStyle = color;
                        cosCtx.fillText(ZODIAC[i], cx + (rZodiac + 3) * Math.cos(symAngle), cy + (rZodiac + 3) * Math.sin(symAngle));
                    }
                    cosCtx.shadowBlur = 0;
                }

                // ---- PRECISION LAYER (toggle): 1° bars + degree numbers, aspect chords, then (below) de-cluttered glyphs with true degrees ----
                const precisionOn = showPrecision && window.EG && EG.astroDraw && EG.ephem;
                const Rp = rZodiac - 30;                       // ring sits on the inner edge of the zodiac band
                if (precisionOn) {
                    cosCtx.shadowBlur = 0;
                    EG.astroDraw.ring(cosCtx, cx, cy, Rp, getAngle);                       // getAngle = YOUR longitude→canvas-angle mapping
                    if (showPlanets) EG.astroDraw.aspects(cosCtx, cx, cy, Rp, getAngle, simTime);
                }

                // ---- Planets (toggle) ----
                if (showPlanets && precisionOn) {
                    EG.astroDraw.bodies(cosCtx, cx, cy, Rp, getAngle, simTime);            // replaces the plain glyph row while Precision is ON
                } else if (showPlanets) {
                    cosCtx.font = '20px "Segoe UI Symbol", "Arial Unicode MS", Arial, sans-serif';
                    for (const p in planetData) {
                        const lonDeg = planetData[p];
                        const angle = getAngle(lonDeg);
                        cosCtx.beginPath();
                        cosCtx.moveTo(cx + 30 * Math.cos(angle), cy + 30 * Math.sin(angle));
                        cosCtx.lineTo(cx + rPlanets * Math.cos(angle), cy + rPlanets * Math.sin(angle));
                        cosCtx.strokeStyle = 'rgba(255,255,255,0.04)';
                        cosCtx.stroke();
                        cosCtx.fillStyle = PLANETS[p].col;
                        cosCtx.shadowColor = PLANETS[p].col;
                        cosCtx.shadowBlur = 18;
                        cosCtx.fillText(PLANETS[p].sym, cx + rPlanets * Math.cos(angle), cy + rPlanets * Math.sin(angle));
                    }
                    cosCtx.shadowBlur = 0;
                }

                // ---- AC / MC (toggle) ----
                if (showACMC) {
                    const acAngle = getAngle(ac);
                    const mcAngle = getAngle(mc);

                    cosCtx.lineWidth = 2.5;
                    cosCtx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                    cosCtx.shadowColor = '#ffaa00';
                    cosCtx.shadowBlur = 10;
                    cosCtx.beginPath();
                    cosCtx.moveTo(cx + (rOuter - 10) * Math.cos(acAngle), cy + (rOuter - 10) * Math.sin(acAngle));
                    cosCtx.lineTo(cx - (rOuter - 10) * Math.cos(acAngle), cy - (rOuter - 10) * Math.sin(acAngle));
                    cosCtx.stroke();
                    cosCtx.fillStyle = '#ffaa00';
                    cosCtx.font = '13px monospace';
                    cosCtx.shadowBlur = 12;
                    cosCtx.fillText('AC', cx + (rOuter + 18) * Math.cos(acAngle), cy + (rOuter + 18) * Math.sin(acAngle));

                    cosCtx.strokeStyle = 'rgba(65, 105, 225, 0.6)';
                    cosCtx.shadowColor = '#4169e1';
                    cosCtx.beginPath();
                    cosCtx.moveTo(cx + (rOuter - 10) * Math.cos(mcAngle), cy + (rOuter - 10) * Math.sin(mcAngle));
                    cosCtx.lineTo(cx - (rOuter - 10) * Math.cos(mcAngle), cy - (rOuter - 10) * Math.sin(mcAngle));
                    cosCtx.stroke();
                    cosCtx.fillStyle = '#4169e1';
                    cosCtx.shadowBlur = 10;
                    cosCtx.fillText('MC', cx + (rOuter + 18) * Math.cos(mcAngle), cy + (rOuter + 18) * Math.sin(mcAngle));
                    cosCtx.shadowBlur = 0;
                }

                // ---- Glass analog clock overlay (toggle) ----
                if (showClock) {
                    const clockRadius = rOuter * 1.0;   // fit within the cosmic ring
                    const cxClock = cx;
                    const cyClock = cy;

                    // ---- Draw transparent clock face ----
                    cosCtx.save();
                    cosCtx.beginPath();
                    cosCtx.arc(cxClock, cyClock, clockRadius, 0, 2 * Math.PI);
                    cosCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                    cosCtx.fill();
                    cosCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    cosCtx.lineWidth = 1.5;
                    cosCtx.stroke();

                    // ---- Numbers 1–24 (24‑hour clock) ----
                    cosCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    cosCtx.font = `${clockRadius * 0.045}px "Segoe UI", Arial, sans-serif`; // smaller to fit 24
                    cosCtx.textAlign = 'center';
                    cosCtx.textBaseline = 'middle';
                    for (let i = 0; i <= 23; i++) {
                        const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
                        const numRadius = clockRadius * 0.68; // slightly inward
                        const x = cxClock + numRadius * Math.cos(angle);
                        const y = cyClock + numRadius * Math.sin(angle);
                        cosCtx.fillText(i.toString().padStart(2, '0'), x, y);
                    }

                    // ---- Minute ticks (60 marks) ----
                    const tickRadiusOuter = clockRadius * 0.82;
                    const tickRadiusInner = clockRadius * 0.72;
                    for (let i = 0; i < 60; i++) {
                        const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
                        const outer = i % 5 === 0 ? tickRadiusOuter : tickRadiusOuter * 0.97;
                        const inner = i % 5 === 0 ? tickRadiusInner + 4 : tickRadiusInner;
                        cosCtx.beginPath();
                        cosCtx.moveTo(cxClock + outer * Math.cos(angle), cyClock + outer * Math.sin(angle));
                        cosCtx.lineTo(cxClock + inner * Math.cos(angle), cyClock + inner * Math.sin(angle));
                        cosCtx.strokeStyle = i % 5 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
                        cosCtx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
                        cosCtx.stroke();
                    }

                    // ---- Get current time (GMT) from simTime ----
                    const hours24 = simTime.getUTCHours();      // 0–23
                    const minutes = simTime.getUTCMinutes();
                    const seconds = simTime.getUTCSeconds();

                    // ---- Hour hand (24‑hour angle) ----
                    // Each hour = 15° (2π/24), plus minute offset
                    const hourAngle = (hours24 / 24) * 2 * Math.PI + (minutes / 60) * (2 * Math.PI / 24) - Math.PI / 2;
                    const hourLen = clockRadius * 0.45;          // slightly shorter for 24h display
                    cosCtx.beginPath();
                    cosCtx.moveTo(cxClock, cyClock);
                    cosCtx.lineTo(cxClock + hourLen * Math.cos(hourAngle), cyClock + hourLen * Math.sin(hourAngle));
                    cosCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    cosCtx.lineWidth = 4;
                    cosCtx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                    cosCtx.shadowBlur = 8;
                    cosCtx.stroke();

                    // ---- Minute hand ----
                    const minuteAngle = (minutes / 60) * 2 * Math.PI - Math.PI / 2;
                    const minLen = clockRadius * 0.7;
                    cosCtx.beginPath();
                    cosCtx.moveTo(cxClock, cyClock);
                    cosCtx.lineTo(cxClock + minLen * Math.cos(minuteAngle), cyClock + minLen * Math.sin(minuteAngle));
                    cosCtx.strokeStyle = 'rgba(200, 200, 255, 0.8)';
                    cosCtx.lineWidth = 3;
                    cosCtx.shadowBlur = 6;
                    cosCtx.stroke();

                    // ---- Second hand ----
                    const secondAngle = (seconds / 60) * 2 * Math.PI - Math.PI / 2;
                    const secLen = clockRadius * 0.75;
                    cosCtx.beginPath();
                    cosCtx.moveTo(cxClock, cyClock);
                    cosCtx.lineTo(cxClock + secLen * Math.cos(secondAngle), cyClock + secLen * Math.sin(secondAngle));
                    cosCtx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
                    cosCtx.lineWidth = 1.5;
                    cosCtx.shadowColor = 'rgba(255, 0, 0, 0.5)';
                    cosCtx.shadowBlur = 10;
                    cosCtx.stroke();

                    // ---- Center dot ----
                    cosCtx.beginPath();
                    cosCtx.arc(cxClock, cyClock, 6, 0, 2 * Math.PI);
                    cosCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    cosCtx.shadowBlur = 12;
                    cosCtx.fill();

                    cosCtx.restore();
                }

                // Center dot
                cosCtx.beginPath();
                cosCtx.arc(cx, cy, 12, 0, 2 * Math.PI);
                cosCtx.fillStyle = 'rgba(10,10,26,0.6)';
                cosCtx.fill();
                cosCtx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                cosCtx.lineWidth = 1.5;
                cosCtx.stroke();

                // Small icon
                cosCtx.fillStyle = '#FFD700';
                cosCtx.font = 'bold 12px monospace';
                cosCtx.shadowColor = '#FFD700';
                cosCtx.shadowBlur = 8;
                cosCtx.textAlign = 'center';
                cosCtx.textBaseline = 'middle';
                cosCtx.fillText('🌀', cx, cy - 2);
                cosCtx.shadowBlur = 0;
            }

            // ---------- Update time display ----------
            function updateTimeDisplay() {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const month = months[simTime.getUTCMonth()];
                const day = simTime.getUTCDate();
                const year = simTime.getUTCFullYear();
                const hours = String(simTime.getUTCHours()).padStart(2, '0');
                const mins = String(simTime.getUTCMinutes()).padStart(2, '0');
                const secs = String(simTime.getUTCSeconds()).padEnd(2, '0')
                timeDisplay.textContent = `📅 ${day} ${month}, ${year} |🕐 ${hours}:${mins}:${secs} (GMT) | ⚡ ${speedMultiplier}x`;
            }

            // ---------- Main loop ----------
            let lastTimestamp = 0;

            function mainLoop(timestamp) {
                if (!timestamp) timestamp = performance.now();
                if (lastTimestamp === 0) lastTimestamp = timestamp;
                const delta = (timestamp - lastTimestamp) / 1000;
                lastTimestamp = timestamp;

                // SHARED CLOCK: this view no longer integrates time itself — it follows EG.sim (so every panel and <astro-controls> agree)
                simTime = EG.sim.date(); isRunning = EG.sim.playing; speedMultiplier = EG.sim.rate;

                renderAzimuthal();
                renderCosmic();
                EG.next('astrolabe', mainLoop, { el: azCanvas, interval: () => EG.rateInterval(isRunning, speedMultiplier) });
            }

            // ---------- Controls ----------
            const playBtn = document.getElementById('astro-playpause');
            const syncBtn = document.getElementById('astro-sync');
            const speedBtn = document.getElementById('astro-speed');
            const dayBtn = document.getElementById('astro-day');
            const prevMoBtn = document.getElementById('astro-prev-mo');
            const nextMoBtn = document.getElementById('astro-next-mo');
            const sixMoBtn = document.getElementById('astro-6mo');
            const yearBtn = document.getElementById('astro-year');
            const resetBtn = document.getElementById('astro-reset');

            function addTime(ms) {
                EG.sim.set({ playing: false }); EG.sim.step(ms);
                isRunning = false;
                playBtn.textContent = '▶ Play';
                simTime = EG.sim.date();
            }

            playBtn.addEventListener('click', () => {
                EG.sim.set({ playing: !EG.sim.playing });
                isRunning = EG.sim.playing;
                playBtn.textContent = isRunning ? '⏸ Pause' : '▶ Play';
                if (isRunning) lastTimestamp = 0;
            });

            syncBtn.addEventListener('click', () => {
                EG.sim.live();
                isRunning = true;
                playBtn.textContent = '⏸ Pause';
                simTime = EG.sim.date();
                lastTimestamp = 0;
            });

            speedBtn.addEventListener('click', () => {
                speedIndex = (speeds.reduce((b, v, i) => (v <= EG.sim.rate ? i : b), 0) + 1) % speeds.length;   // continue from where the SHARED clock really is, not from a stale index
                speedMultiplier = speeds[speedIndex]; EG.sim.set({ rate: speedMultiplier });
                speedBtn.textContent = `⚡${speedMultiplier}x`;
            });

            dayBtn.addEventListener('click', () => addTime(86400000));
            prevMoBtn.addEventListener('click', () => addTime(-86400000 * 30));
            nextMoBtn.addEventListener('click', () => addTime(86400000 * 30));
            sixMoBtn.addEventListener('click', () => addTime(86400000 * 180));
            yearBtn.addEventListener('click', () => addTime(86400000 * 365));

            resetBtn.addEventListener('click', () => {
                EG.sim.set({ t: Date.now(), rate: 1, playing: false });
                isRunning = false;
                playBtn.textContent = '▶ Play';
                simTime = EG.sim.date();
                speedMultiplier = 1;
                speedIndex = 0;
                speedBtn.textContent = '⚡1x';
                lastTimestamp = 0;
                // Optionally reset lat/lon inputs if they exist
                const latInput = document.getElementById('cosmic-lat');
                const lonInput = document.getElementById('cosmic-lon');
                if (latInput) latInput.value = '29.9792';
                if (lonInput) lonInput.value = '31.1342';
            });

            // Toggle buttons
            document.getElementById('toggle-zodiac').addEventListener('click', function() {
                showZodiac = !showZodiac;
                this.textContent = `Zodiac: ${showZodiac ? 'ON' : 'OFF'}`;
            });
            document.getElementById('toggle-planets').addEventListener('click', function() {
                showPlanets = !showPlanets;
                this.textContent = `Planets: ${showPlanets ? 'ON' : 'OFF'}`;
            });
            document.getElementById('toggle-acmc').addEventListener('click', function() {
                showACMC = !showACMC;
                this.textContent = `AC/MC: ${showACMC ? 'ON' : 'OFF'}`; 
            });

            // ---------- Precision toggle (NEW) ----------
            const precisionBtn = document.getElementById('toggle-precision');
            if (precisionBtn) precisionBtn.addEventListener('click', function() {
                showPrecision = !showPrecision;
                this.textContent = `Precision: ${showPrecision ? 'ON' : 'OFF'}`;
            });

            // ---------- Clock toggle ----------
            let showClock = true;
            document.getElementById('toggle-clock').addEventListener('click', function() {
                showClock = !showClock;
                this.textContent = `Clock: ${showClock ? 'ON' : 'OFF'}`;
            });


            // ---------- Resize handler ----------
            function resizeCanvases() {
                renderAzimuthal();
                renderCosmic();
            }
            
            // ---------- Centralised refresh ----------
            function refreshAstrolabe() {
                // Wait one frame to let the browser finish layout
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { // double RAF for safety
                        resizeCanvases();
                    });
                });
            }
            window.addEventListener('resize', resizeCanvases);


            // ---------- Visibility fix for Mirror Mode ----------
            // ---------- ResizeObserver (primary) ----------
            const astrolabeContainer = document.querySelector('.astrolabe-dashboard');
            if (astrolabeContainer) {
                let resizeTimer = null;
                const resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                            clearTimeout(resizeTimer);
                            resizeTimer = setTimeout(() => {
                                resizeCanvases();
                            }, 20);
                        }
                    }
                });
                resizeObserver.observe(astrolabeContainer);
            }

            // ---------- Mirror exit fallback (just in case) ----------
            const exitMirrorBtn = document.getElementById('mirror-exit-btn');
            if (exitMirrorBtn) {
                exitMirrorBtn.addEventListener('click', () => {
                    refreshAstrolabe(); // RAF handles the delay
                });
            }

            // ---------- Start ----------
            simTime = EG.sim.date();              // honour a shared #t=… link or whatever the shared clock already says
            isRunning = EG.sim.playing;
            playBtn.textContent = isRunning ? '⏸ Pause' : '▶ Play';
            renderAzimuthal();
            renderCosmic();
            requestAnimationFrame(mainLoop);

            console.log('🌀 Unified Astrolabe Engine initialized.');
        })();

        

        // MOON PHASE CALCULATOR 
        function getMoonPhase(date) {
            // Reference: January 6, 2000 at 18:14 UTC was a New Moon
            const refDate = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
            const days = (date.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
            const phase = ((days % 29.53058867) / 29.53058867);
            return phase; // 0 = New, 0.25 = First Quarter, 0.5 = Full, 0.75 = Last Quarter, 1 = New again
        }

        function getMoonPhaseName(phase) {
            if (phase < 0.03 || phase >= 0.97) return '🌑 New Moon';
            if (phase < 0.22) return '🌒 Waxing Crescent';
            if (phase < 0.28) return '🌓 First Quarter';
            if (phase < 0.47) return '🌔 Waxing Gibbous';
            if (phase < 0.53) return '🌕 Full Moon';
            if (phase < 0.72) return '🌖 Waning Gibbous';
            if (phase < 0.78) return '🌗 Last Quarter';
            return '🌘 Waning Crescent';
        }


        // ===== GNOSIS TOGGLE =====
        (function initGnosis() {
            const toggleBtn = document.getElementById('gnosis-toggle-btn');
            const panel = document.getElementById('gnosis-panel');
            if (!toggleBtn || !panel) return;

            let isVisible = false;

            toggleBtn.addEventListener('click', () => {
                isVisible = !isVisible;
                panel.classList.toggle('visible', isVisible);
                toggleBtn.textContent = isVisible ? 'CLOSES' : 'GNOSIS';
                toggleBtn.classList.toggle('active', isVisible);
                toggleBtn.setAttribute('aria-expanded', String(isVisible));

                if (isVisible && navigator.vibrate) {
                    navigator.vibrate(10);
                }
            });

            console.log('Gnosis dropdown ready.');
        })();


        // ============================================================
        // FULLSCREEN TOGGLE (Clutter‑Free Ambient Mode)
        // ============================================================
        function toggleClutterFreeMode() {
            const btn = document.getElementById('fullscreen-btn');
            if (!btn) return;

            const label = btn.querySelector('.fs-label');
            const svg = btn.querySelector('svg');

            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        label.textContent = 'Exit';
                        svg.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>`;
                    })
                    .catch(err => {
                        console.warn('Fullscreen error:', err.message);
                    });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }

        // ---- Listen for fullscreen changes (Esc key, etc.) ----
        document.addEventListener('fullscreenchange', () => {
            const btn = document.getElementById('fullscreen-btn');
            if (!btn) return;

            const label = btn.querySelector('.fs-label');
            const svg = btn.querySelector('svg');

            if (!document.fullscreenElement) {
                label.textContent = '';
                svg.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>`;
            } else {
                label.textContent = '';
                svg.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>`;
            }
        });

        // ---- Attach click event ----
        document.getElementById('fullscreen-btn')?.addEventListener('click', toggleClutterFreeMode);

    
            
        // FIRST-TIME STEP‑BY‑STEP TOUR (auto‑shows on first visit)
        (function initTour() {
            const tourOverlay = document.getElementById('tour-overlay');
            if (!tourOverlay) return;

            // If user has already seen the tour, hide it and exit.
            if (EG.store.get('eliteGDX_tour_seen')) {
                tourOverlay.style.display = 'none';
                return;
            }

            const tourSteps = [
                { title: 'Welcome to EliteGDX', text: 'EliteGDX is an omnipresent ambient, cyber-mystical dashboard with multiple clock faces, a rotating image gallery, and a powerful built-in terminal command runner.' },
                { title: 'Clocks & Timepieces', text: 'Six clock modes: Analog, Glass, Digital, Cistercian, Cosmic, and Celestial. Swipe left/right to cycle through them if on mobile device.' },
                { title: 'Terminal Command Runner', text: 'Click Command Runner to open the J_OS terminal. Type help to see all available commands.' },
                { title: 'Always-On Ambient Display', text: 'The Screen Wake Lock API keeps your display active. Mirror Mode, Hide controls and Clean View let you hide all UI elements for a pure contemplative ambient experience.' }
            ];

            let tourStep = 0;

            function showTourStep(index) {
                document.getElementById('tour-title').textContent = tourSteps[index].title;
                document.getElementById('tour-text').textContent = tourSteps[index].text;
                document.getElementById('tour-step-indicator').textContent = `${index + 1} / ${tourSteps.length}`;
            }

            function finishTour() {
                tourOverlay.style.display = 'none';
                EG.store.set('eliteGDX_tour_seen', 'true');
            }

            // Show the tour
            tourOverlay.style.display = 'block';
            showTourStep(0);

            document.getElementById('tour-next').addEventListener('click', () => {
                if (tourStep < tourSteps.length - 1) {
                    tourStep++;
                    showTourStep(tourStep);
                } else {
                    finishTour();
                }
            });

            document.getElementById('tour-prev').addEventListener('click', () => {
                if (tourStep > 0) {
                    tourStep--;
                    showTourStep(tourStep);
                }
            });

            document.getElementById('tour-skip').addEventListener('click', finishTour);

            console.log('🎯 Step tour initialized.');
        })();


        // GUIDE MODAL (opened by `?` button)
        document.addEventListener('DOMContentLoaded', () => {
            const helpBtn = document.getElementById('help-float-btn');
            const guideOverlay = document.getElementById('guide-overlay');
            if (!helpBtn || !guideOverlay) return;

            // Show the `?` button only if the guide has NOT been shown before
            if (!EG.store.get('eliteGDX_guide_shown')) {
                helpBtn.style.display = 'block';
            }

            // Clicking the `?` button opens the guide modal
            helpBtn.addEventListener('click', () => {
                guideOverlay.style.display = 'block';
            });

            // Global function to close the guide modal
            window.closeGuide = function() {
                guideOverlay.style.display = 'none';
                helpBtn.style.display = 'none';
                EG.store.set('eliteGDX_guide_shown', 'true');
            };
        });

        


        // Confirm before leaving
        /* window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave EliteGDX? Your session will be lost.';
        }); 
        */

        // Automatically update copyright year
        document.getElementById('year').textContent = new Date().getFullYear();

        if (EG.canUseSW()) {   // navigator.serviceWorker throws inside sandboxed iframes
            navigator.serviceWorker.register('./sw.js')
            .then(reg => { console.log('SW registered', reg); EG.watchServiceWorker(reg); })
            .catch(err => console.log('SW failed', err));
        }