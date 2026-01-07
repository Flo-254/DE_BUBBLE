// golabale Elemente
const bubble = document.getElementById('bubble');
const bubbleContainer = document.getElementById('bubble-container');

let activeTouches = {};
let maxDistance = 0;

const maxStretch = 0.8; //in Prozent
const vibrationThreshold = 0.1; //in Prozent, ab wann die Vibration beginnt
const flashThreshold = 0.95;//in Prozent, ab wann die Bubble zerbricht
let flashActive = false;

const resistance_exponent = 1.8; //je höher, desto schwerer lässt sich die bubble auseinanderziehen
const max_vibration_duration = 150; //max dauer in millisekunden

const THEMES = [
    { title: "Klima", statement: "Ich brauche keine Verbote.", id: 'klima' },
    { title: "Verkehr", statement: "Das Auto ist Freiheit.", id: 'verkehr' },
    { title: "Ernährung", statement: "Jeder soll essen, was er will.", id: 'ernaehrung' },
    { title: "Konsum", statement: "Wirtschaftswachstum muss sein.", id: 'konsum' },
];

let currentStatementIndex = 0;
let appState = "selection";


//event listner 
document.addEventListener("DOMContentLoaded", () => {
    bubbleContainer.addEventListener("touchstart", handleTouchStart, { passive: false });
    bubbleContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
    bubbleContainer.addEventListener("touchend", handleTouchEnd);
    bubbleContainer.addEventListener("touchcancel", handleTouchEnd);

    loadSelectionScreen();
})

//functions
function loadSelectionScreen() {
    appState = "selection";
    const selectionScreen = document.getElementById("selection-screen");
    selectionScreen.style.display = "flex";
    bubbleContainer.style.display = "none";

    const themeButtons = document.getElementById("theme-buttons");
    themeButtons.innerHTML = ""; //vorherige Buttons entfernen

    THEMES.forEach((theme, index) => {
        const button = document.createElement("button");
        button.textContent = theme.title;
        button.addEventListener("click", () => startBubbleMode(index));
        themeButtons.appendChild(button);
    })
}

function startBubbleMode(index) {
    appState = "bubble";
    currentStatementIndex = index;

    document.getElementById("selection-screen").style.display = "none";
    bubbleContainer.style.display = "flex";

    const bubbleText = document.getElementById("bubble-text");
    bubbleText.textContent = THEMES[index].statement;
}

function handleTouchStart(event) {
    if (event.touches.length !== 2 || flashActive) return; //Anzahl Finger/Flash prüfen

    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        activeTouches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
    }

    const t1 = activeTouches[event.touches[0].identifier];
    const t2 = activeTouches[event.touches[1].identifier];
    maxDistance = Math.hypot(t1.x - t2.x, t1.y - t2.y);

    if (maxDistance === 0) maxDistance = 100; //Wert darf niemals null sein, wenn doch fester Wert von 100px

    event.preventDefault(); //verhindert scrollen oder zoomen
}

function handleTouchMove(event) {
    if (event.touches.length !== 2 || flashActive) return; //Anzahl Finger/Flash prüfen

    const touch0 = event.touches[0]; //aktuelle Koordinaten der Touchpunkte 
    const touch1 = event.touches[1];

    const currentDistance = Math.hypot( //aktuelle Koordinaten berechnen
        touch0.clientX - touch1.clientX,
        touch0.clientY - touch1.clientY
    );

    const distanceDelta = currentDistance - maxDistance; //berechnen wie viel über den Startpunkt hinaus gezogen wurde

    const maxStretchInPixels = bubbleContainer.offsetWidth * maxStretch; //Normalisierung

    let stretchRatio = Math.max(0, distanceDelta / maxStretchInPixels); //0:ungezogen, 1:max.Spannung
    stretchRatio = Math.pow(stretchRatio, resistance_exponent);

    stretchRatio = Math.min(1.0, stretchRatio); //sichert, dass der Wert nicht über 1 geht

    const scaleFactor = 1 + (stretchRatio * 0.2); //Bubble verformen
    const shearAmount = stretchRatio * 25; //Scherung in Grad

    bubble.style.transform = `
    scale(${scaleFactor})
    skewY(${shearAmount}deg)
    skewX(-${shearAmount}deg)`;

    if (stretchRatio >= vibrationThreshold && "vibrate" in navigator) { //haptisches Feedback
        const normalizedRatio = (stretchRatio - vibrationThreshold) / (1 - vibrationThreshold);

        const vibrationDuration = Math.round(normalizedRatio * max_vibration_duration);

        if (vibrationDuration > 0) {
            navigator.vibrate(vibrationDuration);
        } else {
            navigator.vibrate(20);
        }
    }

    if (stretchRatio >= flashThreshold) { //Zerbersten der Bubble
        handleFlash();
    }

    event.preventDefault(); //scrollen und zoom verhindern
}

function handleTouchEnd(event) {
    gsap.to(bubble, {
        scale: 1, //Zurück zur ursprünglichen Skalierung
        skewY: 0, //keine Scherung
        skewX: 0,
        duration: 0.3, //Dauer der Animation
        ease: "power2.out",
    });

    activeTouches = {}; //Liste der aktiven Touches wird "geleert"
    maxDistance = 0; // Anfangsdistanz wird zurückgesetzt 
}

function handleFlash() {
    if (flashActive) return;
    flashActive = true; //weitere touches werden ignoriert

    bubble.classList.add("flash-state"); //visuel, farbliche Veränderung

    gsap.timeline({
        onComplete: resetAfterFlash //wird aufgerufen, sobald die timeline beendet ist
    })

        .to(bubble, {
            scale: 1.5, //schnelle Vergrößerung
            rotation: 360, //kurze Rotation
            duration: 0.1,
            ease: "power3.in",
        })

        .to(bubble, {
            scale: 0, //bubble verschwindet
            duration: 0.2,
            ease: "power1.out",
        })
}

function resetAfterFlash() {
    bubble.classList.remove("flash-state");

    const bubbleText = document.getElementById("bubble-text");
    bubbleText.textContent = "Fertig!";

    gsap.set(bubble, {
        scale: 1,
        skewY: 0,
        skewX: 0,
        clearProps: "transform" //entfernt alle Inline Styles
    })

    flashActive = false; //damit wieder neue Toiches möglich sind

    loadSelectionScreen();
}