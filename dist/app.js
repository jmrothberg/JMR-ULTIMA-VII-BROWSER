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
    bundleUrl = URL.createObjectURL(bundle);

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
      mouseCapture: true,
      thinSidebar: true
    });

    gate.classList.add("hidden");
    fullscreenButton.disabled = false;
  } catch (error) {
    console.error(error);
    startButton.hidden = false;
    progressBar.style.width = "0";
    status.textContent = error.message || "Unable to start the game.";
  }
}

startButton.addEventListener("click", startGame);
fullscreenButton.addEventListener("click", () => player?.setFullScreen(true));
window.addEventListener("beforeunload", () => {
  if (bundleUrl) URL.revokeObjectURL(bundleUrl);
});
