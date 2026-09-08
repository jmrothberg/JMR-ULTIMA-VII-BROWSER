const GAME_URL = "./game/black-gate.jsdos";

const startButton = document.querySelector("#start");
const fullscreenButton = document.querySelector("#fullscreen");
const gate = document.querySelector("#gate");
const progress = document.querySelector("#progress");
const progressBar = document.querySelector("#progress-bar");
const status = document.querySelector("#status");
const dosElement = document.querySelector("#dos");

let player = null;
let bundleUrl = null;
let command = null;
let touchButton = 0;
let startupTimer;
const mobileControls = document.querySelector("#touch-controls");
const hint = document.querySelector("#game-hint");
const DOS_CONFIG = "[sdl]\nautolock=false\n[dosbox]\nmachine=svga_s3\nmemsize=16\n[render]\nframeskip=0\naspect=false\nscaler=none\n[cpu]\ncore=normal\ncputype=auto\ncycles=fixed 14000\n[mixer]\nrate=44100\nblocksize=1024\nprebuffer=80\n[midi]\nmpu401=intelligent\nmididevice=auto\n[sblaster]\nsbtype=sb16\nsbbase=220\nirq=7\ndma=1\nhdma=5\noplmode=auto\n[dos]\nxms=true\nems=false\numb=true\n[joystick]\njoysticktype=none\n[autoexec]\n@echo off\nmount C .\nC:\nULTIMA7.COM\n";


async function fetchWithProgress(url) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Game download failed (${response.status})`);

  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body || !total) {
    progressBar.style.width = "70%";
    return response.blob();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const percent = Math.min(96, Math.round((received / total) * 100));
    progressBar.style.width = `${percent}%`;
    status.textContent = `Loading Britannia… ${percent}%`;
  }
  return new Blob(chunks, { type: "application/zip" });
}


async function loadGameBundle() {
  // Actions builds provide a single archive; branch-based Pages publishes the parts.
  const assembled = await fetch(GAME_URL, { cache: "no-cache" });
  if (assembled.ok) return assembled.blob();
  if (assembled.status !== 404) {
    throw new Error(`Game download failed (${assembled.status})`);
  }
  const parts = new Array(12);
  let completed = 0;
  for (let offset = 0; offset < parts.length; offset += 3) {
    await Promise.all(Array.from({ length: Math.min(3, parts.length - offset) }, async (_, n) => {
      const index = offset + n;
      const suffix = String(index).padStart(3, "0");
      const response = await fetch(`../game-parts/black-gate.jsdos.part-${suffix}`, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Game part ${index + 1} failed (${response.status}). Please reload and retry.`);
      parts[index] = await response.arrayBuffer();
      completed++;
      progressBar.style.width = `${Math.round(completed / parts.length * 100)}%`;
      status.textContent = `Loading Britannia… ${completed} of ${parts.length} parts`;
    }));
  }
  const bundle = new Blob(parts, { type: "application/zip" });
  if (bundle.size !== 8187956) throw new Error("Game download is incomplete. Please reload and retry.");
  return bundle;
}

async function startGame() {
  startButton.hidden = true;
  progress.hidden = false;
  try {
    if (typeof Dos !== "function") throw new Error("The emulator did not load. Please reload and try again.");
    const bundle = await loadGameBundle();
    progressBar.style.width = "100%";
    status.textContent = "Opening the moongate…";
    if (typeof emulators === "undefined") throw new Error("The emulator library did not load. Reload to retry.");
    emulators.pathPrefix = "https://v8.js-dos.com/latest/emulators/";
    const corrected = await emulators.bundleUpdateConfig(
      new Uint8Array(await bundle.arrayBuffer()),
      { dosboxConf: DOS_CONFIG, jsdosConf: { version: "8" } }
    );
    bundleUrl = URL.createObjectURL(new Blob([corrected], { type: "application/zip" }));

    player = Dos(dosElement, {
      url: bundleUrl,
      backend: "dosbox",
      backendLocked: true,
      workerThread: true,
      autoStart: true,
      autoSave: true,
      noCloud: true,
      theme: "dark",
      renderAspect: "4/3",
      imageRendering: "pixelated",
      mouseCapture: false,
      renderBackend: "canvas",
      offscreenCanvas: false,
      softFullscreen: true,
      fsChanges: { local: true, urlToKey: async () => "jmr-ultima-vii-black-gate-v1" },
      softKeyboardLayout: [
        "1 2 3 4 5 6 7 8 9 0",
        "q w e r t y u i o p",
        "a s d f g h j k l",
        "{shift} z x c v b n m {bksp}",
        "{esc} {space} {enter} {up} {down} {left} {right}"
      ],
      softKeyboardSymbols: [{ "{bksp}": "⌫", "{enter}": "Enter", "{space}": "Space", "{shift}": "Shift", "{esc}": "Esc", "{up}": "↑", "{down}": "↓", "{left}": "←", "{right}": "→" }],
      thinSidebar: true,
      onEvent(event, ci) {
        if (event !== "ci-ready") return;
        command = ci;
        if (tutorial.open) command.pause();
        mobileControls.hidden = false;
        hint.textContent = "Tap to click; double-tap to use. Choose Walk, then hold where you want to go.";
        ci.events().onExit(() => {
          hint.textContent = "The game stopped. Reload to restart.";
        });
        let shown = false;
        ci.events().onFrame((rgb, rgba) => {
          if (shown || !(rgb || rgba)?.some(value => value > 0)) return;
          shown = true;
          clearTimeout(startupTimer);
          gate.classList.add("hidden");
        });
      }
    });

    startupTimer = setTimeout(() => {
      gate.classList.add("hidden");
      hint.textContent = "Startup is taking longer than expected. If the screen stays blank, reload and try again.";
    }, 30000);
    fullscreenButton.disabled = false;
  } catch (error) {
    console.error(error);
    startButton.hidden = false;
    progressBar.style.width = "0";
    status.textContent = error.message || "Unable to start the game.";
  }
}

startButton.addEventListener("click", startGame);
fullscreenButton.addEventListener("click", () => {
  document.body.classList.toggle("expanded");
  fullscreenButton.textContent = document.body.classList.contains("expanded") ? "Exit" : "Expand";
});
document.querySelectorAll("[data-game-key]").forEach(button => {
  button.addEventListener("click", () => command?.simulateKeyPress(Number(button.dataset.gameKey)));
});
document.querySelectorAll("[data-touch-button]").forEach(button => {
  button.addEventListener("click", () => {
    touchButton = Number(button.dataset.touchButton);
    document.querySelectorAll("[data-touch-button]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    hint.textContent = touchButton === 1 ? "Hold your finger where you want to walk. Lift to stop." : "Tap to click; double-tap to use or talk. Drag to move an item.";
  });
});
let activeTouch = null;
function releaseTouch() {
  if (activeTouch !== null) command?.sendMouseButton(activeTouch, false);
  activeTouch = null;
}
for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
  dosElement.addEventListener(type, event => {
    if (!command || event.pointerType === "mouse" || event.target.tagName !== "CANVAS") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = event.target.getBoundingClientRect();
    command.sendMouseMotion(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)));
    if (type === "pointerdown") {
      releaseTouch();
      event.target.setPointerCapture(event.pointerId);
      activeTouch = touchButton;
      command.sendMouseButton(activeTouch, true);
    } else if (type === "pointerup" || type === "pointercancel") releaseTouch();
  }, { capture: true, passive: false });
}
window.addEventListener("blur", releaseTouch);
window.addEventListener("beforeunload", () => {
  if (bundleUrl) URL.revokeObjectURL(bundleUrl);
});

const typingForm = document.querySelector("#typing-form");
const tutorial = document.querySelector("#tutorial");
document.querySelector("#open-tutorial").addEventListener("click", () => {
  releaseTouch();
  tutorial.showModal();
  command?.pause();
});
document.querySelector("#close-tutorial").addEventListener("click", () => tutorial.close());
tutorial.addEventListener("close", () => {
  command?.resume();
  document.querySelector("#open-tutorial").focus();
});
for (const type of ["keydown", "keyup", "keypress"]) {
  window.addEventListener(type, event => {
    if (tutorial.open) event.stopImmediatePropagation();
  }, true);
}
const typingInput = document.querySelector("#typing-input");
document.querySelector("#native-keyboard").addEventListener("click", () => {
  typingForm.hidden = false;
  typingInput.focus();
});
document.querySelector("#close-typing").addEventListener("click", () => {
  typingInput.blur();
  typingForm.hidden = true;
});
for (const type of ["keydown", "keyup", "keypress"]) {
  window.addEventListener(type, event => {
    if (event.target !== typingInput) return;
    event.stopImmediatePropagation();
    if (type === "keydown" && event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      typingForm.requestSubmit();
    }
  }, true);
}
typingForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!command || typingForm.dataset.busy) return;
  typingForm.dataset.busy = "true";
  const text = typingInput.value;
  typingInput.value = "";
  try {
    for (const char of text) {
      const upper = /[A-Z]/.test(char);
      const code = char === " " ? 32 : /^[a-zA-Z0-9]$/.test(char) ? char.toUpperCase().charCodeAt(0) : ({".":46,",":44,"'":39,"-":45})[char];
      if (!code) continue;
      if (upper) command.sendKeyEvent(340, true);
      command.sendKeyEvent(code, true);
      await new Promise(resolve => setTimeout(resolve, 35));
      command.sendKeyEvent(code, false);
      if (upper) command.sendKeyEvent(340, false);
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    command.simulateKeyPress(257);
  } finally {
    delete typingForm.dataset.busy;
  }
});
