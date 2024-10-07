// Create audio context
let audioContext;

// Debounce flag
let isDebouncing = false;

// Volume control (0.0 to 1.0)
let hapticVolume = 0.2; // Increased from 0.1 to 0.3

// Function to initialize audio context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Function to create soft sound
function createSoftSound() {
    initAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(hapticVolume, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Function to set haptic feedback volume
function setHapticVolume(volume) {
    hapticVolume = Math.max(0, Math.min(1, volume));
}

// Function to check if element is interactive
function isInteractiveElement(element) {
    const interactiveElements = [
        'a', 'button', 'input', 'select', 'textarea', 'label',
        '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
        '[role="switch"]', '[role="tab"]', '[role="menuitem"]'
    ];
    return interactiveElements.includes(element.tagName.toLowerCase()) || 
           interactiveElements.some(selector => element.matches(selector)) ||
           element.classList.contains('interactive') ||
           element.getAttribute('tabindex') === '0';
}

// Function to add haptic feedback
function addHapticFeedback(event) {
    if (isDebouncing) return;
    isDebouncing = true;

    let target = event.target;

    // Check if the clicked element or its parent is interactive
    while (target && target !== document.body) {
        if (isInteractiveElement(target)) {
            // Trigger vibration
            if ('vibrate' in navigator) {
                navigator.vibrate(50); // Short vibration, 50ms
            }

            // Play soft sound
            createSoftSound();
            break;
        }
        target = target.parentElement;
    }

    // Reset debounce after a short delay
    setTimeout(() => {
        isDebouncing = false;
    }, 100);
}

// Function to handle input events for sliders and other continuous inputs
function handleInputEvent(event) {
    if (isDebouncing) return;
    isDebouncing = true;

    if (event.target.type === 'range' || event.target.type === 'number') {
        if ('vibrate' in navigator) {
            navigator.vibrate(25); // Even shorter vibration for continuous input
        }
        createSoftSound();
    }

    // Reset debounce after a short delay
    setTimeout(() => {
        isDebouncing = false;
    }, 50); // Shorter delay for continuous inputs
}

function preventCopyPaste(e) {
    e.preventDefault();
    return false;
}

// Function to disable context menu
function disableContextMenu(e) {
    e.preventDefault();
    return false;
}

document.addEventListener('click', addHapticFeedback, { capture: true });
document.addEventListener('touchstart', addHapticFeedback, { capture: true, passive: true });
document.addEventListener('input', handleInputEvent, { passive: true });
document.addEventListener('click', initAudioContext, { once: true });
window.setHapticVolume = setHapticVolume;
document.addEventListener('copy', preventCopyPaste);
document.addEventListener('cut', preventCopyPaste);
document.addEventListener('paste', preventCopyPaste);
document.addEventListener('contextmenu', disableContextMenu);
document.body.style.userSelect = 'none';
document.body.style.webkitUserSelect = 'none';
document.body.style.msUserSelect = 'none';
document.body.style.mozUserSelect = 'none';

