/**
 * DE.BUBBLE - Interaktions-Logik
 */

// --- 1. Audio Setup (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    // Browser-Sicherheitscheck: AudioContext aktivieren
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';

    if (type === 'pop') {
        // Tieferer Plopp-Sound
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } else {
        // Kurzer Blubb-Sound für Buttons
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }
}

// --- 2. Globale Variablen & DOM-Elemente ---
const bubble = document.getElementById('bubble');
const bubbleContainer = document.getElementById('bubble-container');
const bubbleText = document.getElementById('bubble-text');
const selectionScreen = document.getElementById('selection-screen');
const themeButtonsContainer = document.getElementById('theme-buttons');

let maxDistance = 0;
let initialWidth = 0;
let flashActive = false;

const THEMES = [
    { title: "Klima", statement: "Ich brauche keine Verbote." },
    { title: "Verkehr", statement: "Das Auto ist Freiheit." },
    { title: "Ernährung", statement: "Jeder soll essen, was er will." },
    { title: "Konsum", statement: "Wirtschaftswachstum muss sein." }
];

// --- 3. Initialisierung ---
document.addEventListener("DOMContentLoaded", () => {
    if (bubbleContainer) {
        // Wichtig: passive: false erlaubt e.preventDefault() für flüssige Touches
        bubbleContainer.addEventListener("touchstart", handleTouchStart, { passive: false });
        bubbleContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
        bubbleContainer.addEventListener("touchend", handleTouchEnd);
        bubbleContainer.addEventListener("touchcancel", handleTouchEnd);
    }
    loadSelectionScreen();
});

// --- 4. Navigation & UI Logik ---
function loadSelectionScreen() {
    flashActive = false;
    if (selectionScreen) selectionScreen.style.display = "flex";
    if (bubbleContainer) bubbleContainer.style.display = "none";

    if (themeButtonsContainer) {
        themeButtonsContainer.innerHTML = ""; // Container leeren
        THEMES.forEach((theme, index) => {
            const btn = document.createElement("button");
            btn.className = "theme-btn";
            btn.textContent = theme.title;
            btn.addEventListener("click", () => {
                playSound('blubb');
                startBubbleMode(index);
            });
            themeButtonsContainer.appendChild(btn);
        });
    }
}

function startBubbleMode(index) {
    if (selectionScreen) selectionScreen.style.display = "none";
    if (bubbleContainer) {
        bubbleContainer.style.display = "flex";
        initialWidth = bubbleContainer.offsetWidth;
    }

    if (bubbleText) {
        bubbleText.textContent = THEMES[index].statement;
        // FIX: Sicherstellen, dass der Text wieder voll sichtbar ist
        gsap.set(bubbleText, { opacity: 1 });
    }

    if (bubble) {
        // FIX: Wir setzen opacity: 1 und löschen alle alten Animations-Reste
        gsap.set(bubble, {
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            clearProps: "all"
        });

        // Plopp-In Effekt beim Erscheinen
        gsap.from(bubble, { scale: 0, duration: 0.6, ease: "back.out(1.7)" });
    }

    maxDistance = 0;
    flashActive = false;
}

// --- 5. Touch & Interaktion ---
function handleTouchStart(e) {
    // Interaktion nur bei genau 2 Fingern
    if (e.touches.length !== 2 || flashActive) return;

    // Start-Abstand zwischen den Fingern berechnen
    maxDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );

    if (maxDistance === 0) maxDistance = 100;
    e.preventDefault();
}

function handleTouchMove(e) {
    if (e.touches.length !== 2 || flashActive || !bubble) return;

    const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );

    // Berechnen, wie stark gezogen wurde (0 bis 1)
    const delta = Math.max(0, currentDist - maxDistance);
    const maxStretchRange = initialWidth * 0.8;
    let ratio = Math.min(1, delta / maxStretchRange);

    // Exponentieller Widerstand für haptisches Gefühl
    ratio = Math.pow(ratio, 1.5);

    // --- Visuelle Verformung ---
    const sX = 1 + (ratio * 0.4); // Dehnen
    const sY = 1 - (ratio * 0.2); // Flach drücken
    const rot = ratio * 12;      // Leichte Neigung

    bubble.style.transform = `scaleX(${sX}) scaleY(${sY}) rotate(${rot}deg)`;

    // --- Feedback ---
    if (ratio > 0.1 && "vibrate" in navigator) {
        navigator.vibrate(ratio * 20);
    }

    // --- Zerplatzen-Check ---
    if (ratio >= 0.95) {
        handleFlash();
    }

    e.preventDefault();
}

function handleTouchEnd() {
    if (flashActive) return;

    // Sanftes Zurückschnappen mit Elastic-Effekt
    gsap.to(bubble, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)"
    });
}

function handleFlash() {
    if (flashActive) return;
    flashActive = true;

    const flashOverlay = document.getElementById('fullscreen-flash');
    playSound('pop');

    // Haptisches Feedback
    if ("vibrate" in navigator) navigator.vibrate([50, 30, 200]);

    // GSAP Timeline für präzises Timing
    const tl = gsap.timeline({
        onComplete: () => {
            // Erst wenn der Flash fast vorbei ist, laden wir den Screen neu
            setTimeout(loadSelectionScreen, 400);
        }
    });

    // 1. Die Bubble "bläht" sich extrem schnell auf
    tl.to(bubble, {
        scale: 1.8,
        duration: 0.1,
        ease: "expo.out"
    });

    // 2. DER BLITZ: Er muss EXAKT jetzt kommen
    // Wir setzen opacity sofort auf 1 (Dauer 0)
    tl.to(flashOverlay, {
        opacity: 1,
        duration: 0.05,
        backgroundColor: "#9d8df1" // Hier dein Figma-Lila
    }, "-=0.05");

    // 3. Bubble unsichtbar machen, während der Blitz alles verdeckt
    tl.set(bubble, { opacity: 0 });
    tl.set(bubbleText, { opacity: 0 });

    // 4. Der lila Blitz blendet langsam aus (Nachleuchten)
    tl.to(flashOverlay, {
        opacity: 0,
        duration: 1.2, // Etwas länger für einen schöneren Effekt
        ease: "power2.inOut"
    });
}