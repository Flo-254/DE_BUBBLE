// Globale Elemente
const bubble = document.getElementById('bubble');
const bubbleContainer = document.getElementById('bubble-container');

let activeTouches = {};
let maxDistance = 0;

const maxStretch = 0.8; // in Prozent
const vibrationThreshold = 0.1; // in Prozent, ab wann die Vibration beginnt
const flashThreshold = 0.95; // in Prozent, ab wann die Bubble zerbricht
let flashActive = false;

const resistance_exponent = 1.8; // je höher, desto schwerer lässt sich die bubble auseinanderziehen
const max_vibration_duration = 150; // max dauer in millisekunden

//Themen
const THEMES = [
    { title: "Klimaaa", statement: "Ich brauche keine Verbote.", id: 'klima' },
    { title: "Verkehr", statement: "Das Auto ist Freiheit.", id: 'verkehr' },
    { title: "Ernährung", statement: "Jeder soll essen, was er will.", id: 'ernaehrung' },
    { title: "Konsum", statement: "Wirtschaftswachstum muss sein.", id: 'konsum' },
];

let currentStatementIndex = 0;
let appState = "selection";


//Event Listener 
document.addEventListener("DOMContentLoaded", () => {
    if (bubbleContainer) {
        bubbleContainer.addEventListener("touchstart", handleTouchStart, { passive: false });
        bubbleContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
        bubbleContainer.addEventListener("touchend", handleTouchEnd);
        bubbleContainer.addEventListener("touchcancel", handleTouchEnd);
    }
    loadSelectionScreen();
});


function loadSelectionScreen() {
    appState = "selection";
    const selectionScreen = document.getElementById("selection-screen");
    const themeButtons = document.getElementById("theme-buttons");

    if (selectionScreen) selectionScreen.style.display = "flex";
    if (bubbleContainer) bubbleContainer.style.display = "none";
    if (themeButtons) {
        themeButtons.innerHTML = ""; // Vorherige Buttons entfernen
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
    appState = "bubble";
    currentStatementIndex = index;

    const selectionScreen = document.getElementById("selection-screen");
    const bubbleText = document.getElementById("bubble-text");

    if (selectionScreen) selectionScreen.style.display = "none";
    if (bubbleContainer) bubbleContainer.style.display = "flex";

    if (bubbleText) {
        bubbleText.textContent = THEMES[index].statement;
    }
}


function handleTouchStart(event) {
    if (event.touches.length !== 2 || flashActive) return;

    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        activeTouches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
    }

    const t1 = activeTouches[event.touches[0].identifier];
    const t2 = activeTouches[event.touches[1].identifier];
    maxDistance = Math.hypot(t1.x - t2.x, t1.y - t2.y);

    if (maxDistance === 0) maxDistance = 100; // Schutz vor Division durch Null

    event.preventDefault(); // Verhindert Scrollen/Zoomen
}


function handleTouchMove(event) {
    if (event.touches.length !== 2 || flashActive) return;

    const touch0 = event.touches[0];
    const touch1 = event.touches[1];

    const currentDistance = Math.hypot(
        touch0.clientX - touch1.clientX,
        touch0.clientY - touch1.clientY
    );

    const distanceDelta = currentDistance - maxDistance;
    const maxStretchInPixels = bubbleContainer.offsetWidth * maxStretch;

    let stretchRatio = Math.max(0, distanceDelta / maxStretchInPixels);
    stretchRatio = Math.pow(stretchRatio, resistance_exponent);
    stretchRatio = Math.min(1.0, stretchRatio);

    // Bubble verformen (Skalierung und Scherung)
    const scaleX = 1 + (stretchRatio * 0.4); // Stärkeres Dehnen in die Breite
    const scaleY = 1 - (stretchRatio * 0.2); // Flacher werden beim Dehnen

    if (bubble) {
        bubble.style.transform = `
        scaleX(${scaleX})
        scaleY(${scaleY})
        rotate(${shearAmount}deg)
    `;
    }

    // Haptisches Feedback (Vibration)
    if (stretchRatio >= vibrationThreshold && "vibrate" in navigator) {
        const normalizedRatio = (stretchRatio - vibrationThreshold) / (1 - vibrationThreshold);
        const vibrationDuration = Math.round(normalizedRatio * max_vibration_duration);

        if (vibrationDuration > 0) {
            navigator.vibrate(vibrationDuration);
        } else {
            navigator.vibrate(20);
        }
    }

    // Prüfen auf Zerbersten
    if (stretchRatio >= flashThreshold) {
        handleFlash();
    }

    event.preventDefault();
}


function handleTouchEnd(event) {
    if (flashActive) return;

    gsap.to(bubble, {
        scale: 1,
        skewY: 0,
        skewX: 0,
        duration: 0.3,
        ease: "power2.out",
    });

    activeTouches = {};
    maxDistance = 0;
}


function handleFlash() {
    if (flashActive) return;
    flashActive = true;

    if (bubble) bubble.classList.add("flash-state");

    gsap.timeline({
        onComplete: resetAfterFlash
    })
        .to(bubble, {
            scale: 1.5,
            rotation: 360,
            duration: 0.1,
            ease: "power3.in",
        })
        .to(bubble, {
            scale: 0,
            duration: 0.2,
            ease: "power1.out",
        });
}


function resetAfterFlash() {
    if (bubble) bubble.classList.remove("flash-state");

    const bubbleText = document.getElementById("bubble-text");
    if (bubbleText) bubbleText.textContent = "Fertig!";

    gsap.set(bubble, {
        scale: 1,
        skewY: 0,
        skewX: 0,
        clearProps: "transform"
    });

    flashActive = false;

    // Nach kurzer Pause zurück zum Auswahlbildschirm
    setTimeout(() => {
        loadSelectionScreen();
    }, 1000);
}