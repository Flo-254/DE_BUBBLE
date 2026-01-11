// --- Globale Variablen & Einstellungen ---
const bubble = document.getElementById('bubble');
const bubbleContainer = document.getElementById('bubble-container');
const bubbleText = document.getElementById('bubble-text');

let activeTouches = {};
let maxDistance = 0;
let initialWidth = 0;

// Konfiguration (Anpassbar für das "Gefühl" der Bubble)
const maxStretch = 0.8;
const vibrationThreshold = 0.15;
const flashThreshold = 0.92;
let flashActive = false;

const resistance_exponent = 1.5;
const max_vibration_duration = 150;

// Themen-Daten
const THEMES = [
    { title: "Klima", statement: "Ich brauche keine Verbote.", id: 'klima' },
    { title: "Verkehr", statement: "Das Auto ist Freiheit.", id: 'verkehr' },
    { title: "Ernährung", statement: "Jeder soll essen, was er will.", id: 'ernaehrung' },
    { title: "Konsum", statement: "Wirtschaftswachstum muss sein.", id: 'konsum' },
];

// --- Initialisierung ---
document.addEventListener("DOMContentLoaded", () => {
    // Event Listener für Touch-Interaktion
    if (bubbleContainer) {
        bubbleContainer.addEventListener("touchstart", handleTouchStart, { passive: false });
        bubbleContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
        bubbleContainer.addEventListener("touchend", handleTouchEnd);
        bubbleContainer.addEventListener("touchcancel", handleTouchEnd);
    }

    loadSelectionScreen();
});

// --- Navigation & UI ---
function loadSelectionScreen() {
    flashActive = false;
    const selectionScreen = document.getElementById("selection-screen");
    const themeButtons = document.getElementById("theme-buttons");

    if (selectionScreen) selectionScreen.style.display = "flex";
    if (bubbleContainer) bubbleContainer.style.display = "none";

    if (themeButtons) {
        themeButtons.innerHTML = "";
        THEMES.forEach((theme, index) => {
            const button = document.createElement("button");
            button.className = "theme-btn";
            button.textContent = theme.title;
            button.addEventListener("click", () => startBubbleMode(index));
            themeButtons.appendChild(button);
        });
    }
}

function startBubbleMode(index) {
    const selectionScreen = document.getElementById("selection-screen");

    if (selectionScreen) selectionScreen.style.display = "none";
    if (bubbleContainer) {
        bubbleContainer.style.display = "flex";
        initialWidth = bubbleContainer.offsetWidth;
    }

    if (bubbleText) {
        bubbleText.textContent = THEMES[index].statement;
    }

    // Reset Bubble Styles
    gsap.set(bubble, { scale: 1, rotation: 0, opacity: 1, clearProps: "all" });
}

// --- Touch Logik ---
function handleTouchStart(event) {
    if (event.touches.length !== 2 || flashActive) return;

    // Speichere Start-Positionen
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        activeTouches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
    }

    const t1 = activeTouches[event.touches[0].identifier];
    const t2 = activeTouches[event.touches[1].identifier];

    maxDistance = Math.hypot(t1.x - t2.x, t1.y - t2.y);
    if (maxDistance === 0) maxDistance = 100;

    event.preventDefault();
}

function handleTouchMove(event) {
    if (event.touches.length !== 2 || flashActive || !bubble) return;

    const touch0 = event.touches[0];
    const touch1 = event.touches[1];

    const currentDistance = Math.hypot(
        touch0.clientX - touch1.clientX,
        touch0.clientY - touch1.clientY
    );

    const distanceDelta = currentDistance - maxDistance;
    const maxStretchInPixels = (initialWidth || bubbleContainer.offsetWidth) * maxStretch;

    let stretchRatio = Math.max(0, distanceDelta / maxStretchInPixels);
    stretchRatio = Math.pow(stretchRatio, resistance_exponent);
    stretchRatio = Math.min(1.0, stretchRatio);

    // --- Visuelle Verformung (Figma-Style: Organisch) ---
    const scaleX = 1 + (stretchRatio * 0.3);
    const scaleY = 1 - (stretchRatio * 0.15);
    const rotation = stretchRatio * 15; // Leichte Drehung beim Ziehen

    bubble.style.transform = `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${rotation}deg)`;

    // --- Haptik ---
    if (stretchRatio >= vibrationThreshold && "vibrate" in navigator) {
        const vibrationPower = Math.round(stretchRatio * 30);
        navigator.vibrate(vibrationPower);
    }

    // --- Trigger Zerplatzen ---
    if (stretchRatio >= flashThreshold) {
        handleFlash();
    }

    event.preventDefault();
}

function handleTouchEnd() {
    if (flashActive) return;

    // Sanftes Zurückschnappen
    gsap.to(bubble, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
    });

    activeTouches = {};
}

// --- Animations-Effekte ---
function handleFlash() {
    if (flashActive) return;
    flashActive = true;

    if (bubble) bubble.classList.add("flash-state");
    if ("vibrate" in navigator) navigator.vibrate([50, 30, 100]); // Explosions-Vibration

    const tl = gsap.timeline({ onComplete: resetAfterFlash });

    tl.to(bubble, {
        scale: 1.3,
        duration: 0.1,
        ease: "power2.out"
    })
        .to(bubble, {
            scale: 0,
            opacity: 0,
            duration: 0.2,
            ease: "power3.in"
        });
}

function resetAfterFlash() {
    if (bubble) bubble.classList.remove("flash-state");

    if (bubbleText) {
        bubbleText.textContent = "Bubble verlassen.";
    }

    // Kurze Pause, dann zurück zum Start
    setTimeout(() => {
        loadSelectionScreen();
    }, 1500);
}