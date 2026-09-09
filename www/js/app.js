// ============================================================================
// Minify Noise — v1.1
// Brown noise. One control. Nothing else.
// ============================================================================

'use strict';

const STORAGE_KEY = 'minify_noise_state';

let audioCtx    = null;
let brownSource = null;
let gainNode    = null;
let isPlaying   = false;

// ============================================================================
// Audio — procedural brown noise via Web Audio API
// ============================================================================

function buildBrownNoise(ctx) {
    const len = ctx.sampleRate * 10;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    let last  = 0;
    for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        d[i]  = (last + 0.02 * white) / 1.02;
        last  = d[i];
        d[i] *= 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    return src;
}

function initAudio() {
    if (audioCtx) return;
    audioCtx    = new (window.AudioContext || window.webkitAudioContext)();
    gainNode    = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
    brownSource = buildBrownNoise(audioCtx);
    brownSource.connect(gainNode);
    brownSource.start();
}

async function play() {
    initAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    gainNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.4);
    isPlaying = true;
    saveState();
    updateUI();
}

function pause() {
    // Silence via gain only — do NOT suspend audioCtx.
    // Keeping the context alive is what allows background playback.
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.4);
    isPlaying = false;
    saveState();
    updateUI();
}

function toggle() {
    if (isPlaying) pause();
    else play();
}

// ============================================================================
// Background audio — resume AudioContext if browser suspended it
// ============================================================================

document.addEventListener('visibilitychange', function () {
    if (!audioCtx || !isPlaying) return;
    if (document.visibilityState === 'visible' && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
    }
});

window.addEventListener('pageshow', function () {
    if (audioCtx && isPlaying && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
    }
});

window.addEventListener('focus', function () {
    if (audioCtx && isPlaying && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
    }
});

// ============================================================================
// State
// ============================================================================

function saveState() {
    try { localStorage.setItem(STORAGE_KEY, isPlaying ? '1' : '0'); } catch (e) {}
}

function loadState() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return true; }
}

// ============================================================================
// UI
// ============================================================================

const playBtn   = document.getElementById('playBtn');
const playIcon  = document.getElementById('playIcon');
const playLabel = document.getElementById('playLabel');
const container = document.getElementById('playerContainer');

function updateUI() {
    if (isPlaying) {
        playBtn.classList.add('playing');
        playBtn.setAttribute('aria-label', 'Pause');
        playIcon.textContent = '\u23F8';
        playLabel.textContent = 'Playing';
        container.classList.add('playing');
    } else {
        playBtn.classList.remove('playing');
        playBtn.setAttribute('aria-label', 'Play');
        playIcon.textContent = '\u25B6';
        playLabel.textContent = 'Tap to play';
        container.classList.remove('playing');
    }
}

playBtn.addEventListener('click', toggle);

// ============================================================================
// Init
// ============================================================================

updateUI();

// Attempt auto-resume if previously playing.
// Browsers require a user gesture for AudioContext; the catch keeps the UI
// in its correct paused state until the first tap.
if (loadState()) {
    play().catch(function () {
        isPlaying = false;
        updateUI();
    });
}
