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

async function startGame() {
  startButton.hidden = true;
  progress.hidden = false;
  try {
    const bundle = await fetchWithProgress(GAME_URL);
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
