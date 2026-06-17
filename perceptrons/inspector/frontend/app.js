/* Inspector — frontend logic
 *
 * Flow:
 *  1. User starts camera (or drops a file) for ID card and selfie.
 *  2. User captures a photo (or records a video for liveness).
 *  3. "Verify Identity" is enabled once both captures are ready.
 *  4. POST /verify → display results.
 */

// ── State ──────────────────────────────────────────────────────────
const state = {
  idBlob:      null,   // File | Blob for ID card image
  selfieBlob:  null,   // File | Blob for selfie image or video
  selfieIsVid: false,
  selfieMode:  'photo', // 'photo' | 'video'
  streams:     { id: null, selfie: null },
  recorder:    null,
  recChunks:   [],
};

// ── DOM refs ───────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const vidId       = $('vid-id');
const canvasId    = $('canvas-id');
const overlayId   = $('overlay-id');
const btnCamId    = $('btn-cam-id');
const btnSnapId   = $('btn-snap-id');
const btnRetryId  = $('btn-retry-id');
const fileId      = $('file-id');
const thumbIdWrap = $('thumb-id-wrap');
const thumbIdImg  = $('thumb-id');

const vidSelfie       = $('vid-selfie');
const canvasSelfie    = $('canvas-selfie');
const overlaySelfie   = $('overlay-selfie');
const btnCamSelfie    = $('btn-cam-selfie');
const btnSnapSelfie   = $('btn-snap-selfie');
const btnRecStart     = $('btn-rec-start');
const btnRecStop      = $('btn-rec-stop');
const btnRetrySelfie  = $('btn-retry-selfie');
const fileSelfie      = $('file-selfie');
const thumbSelfieWrap = $('thumb-selfie-wrap');
const thumbSelfieImg  = $('thumb-selfie');
const thumbVideo      = $('thumb-video');
const selfieBadge     = $('selfie-badge');
const recDot          = $('rec-dot');
const modePhoto       = $('mode-photo');
const modeVideo       = $('mode-video');

const btnVerify      = $('btn-verify');
const verifyLabel    = $('verify-label');
const verifySpinner  = $('verify-spinner');
const verifyNote     = $('verify-note');
const resultsEl      = $('results');

// ── Helpers ────────────────────────────────────────────────────────

function stopStream(key) {
  if (state.streams[key]) {
    state.streams[key].getTracks().forEach(t => t.stop());
    state.streams[key] = null;
  }
}

async function startCamera(videoEl, overlayEl, facingMode = 'environment') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    videoEl.srcObject = stream;
    overlayEl.classList.add('hidden');
    return stream;
  } catch (err) {
    overlayEl.querySelector('span').textContent = 'Camera access denied';
    throw err;
  }
}

function captureFrame(videoEl, canvasEl) {
  canvasEl.width  = videoEl.videoWidth  || 640;
  canvasEl.height = videoEl.videoHeight || 480;
  canvasEl.getContext('2d').drawImage(videoEl, 0, 0);
  return new Promise(res => canvasEl.toBlob(res, 'image/jpeg', 0.92));
}

function showThumb(wrapEl, imgEl, videoEl, blob, isVideo) {
  wrapEl.classList.remove('hidden');
  if (isVideo) {
    imgEl.classList.add('hidden');
    videoEl.classList.remove('hidden');
    videoEl.src = URL.createObjectURL(blob);
  } else {
    videoEl.classList.add('hidden');
    imgEl.classList.remove('hidden');
    imgEl.src = URL.createObjectURL(blob);
  }
}

function checkReady() {
  const ready = state.idBlob && state.selfieBlob;
  btnVerify.disabled = !ready;
  verifyNote.textContent = ready
    ? 'Ready — click to run verification'
    : 'Capture both ID card and selfie to continue';
}

// ── ID Card ────────────────────────────────────────────────────────

btnCamId.addEventListener('click', async () => {
  btnCamId.disabled = true;
  const stream = await startCamera(vidId, overlayId, 'environment').catch(() => {
    btnCamId.disabled = false;
  });
  if (!stream) return;
  state.streams.id = stream;
  vidId.classList.remove('hidden');
  canvasId.classList.add('hidden');
  btnSnapId.classList.remove('hidden');
  btnCamId.classList.add('hidden');
});

btnSnapId.addEventListener('click', async () => {
  const blob = await captureFrame(vidId, canvasId);
  state.idBlob = blob;
  stopStream('id');
  vidId.classList.add('hidden');
  overlayId.classList.add('hidden');
  canvasId.classList.remove('hidden');
  btnSnapId.classList.add('hidden');
  btnRetryId.classList.remove('hidden');
  showThumb(thumbIdWrap, thumbIdImg, null, blob, false);
  checkReady();
});

btnRetryId.addEventListener('click', () => {
  state.idBlob = null;
  canvasId.classList.add('hidden');
  overlayId.classList.remove('hidden');
  btnRetryId.classList.add('hidden');
  btnCamId.classList.remove('hidden');
  btnCamId.disabled = false;
  btnSnapId.classList.add('hidden');
  thumbIdWrap.classList.add('hidden');
  checkReady();
});

fileId.addEventListener('change', () => {
  const file = fileId.files[0];
  if (!file) return;
  state.idBlob = file;
  stopStream('id');
  showThumb(thumbIdWrap, thumbIdImg, null, file, false);
  btnCamId.classList.remove('hidden');
  btnCamId.disabled = false;
  btnSnapId.classList.add('hidden');
  checkReady();
});

// Drag & drop for ID
setupDrop($('drop-id'), fileId, blob => {
  state.idBlob = blob;
  showThumb(thumbIdWrap, thumbIdImg, null, blob, false);
  checkReady();
});

// ── Selfie mode toggle ─────────────────────────────────────────────

function switchSelfieMode(mode) {
  state.selfieMode = mode;
  modePhoto.classList.toggle('active', mode === 'photo');
  modeVideo.classList.toggle('active', mode === 'video');

  // Show/hide appropriate buttons based on camera state
  const cameraOn = !!state.streams.selfie;
  if (cameraOn) {
    btnSnapSelfie.classList.toggle('hidden', mode !== 'photo');
    btnRecStart.classList.toggle('hidden', mode !== 'video');
  }

  // Reset capture if mode changed
  if (state.selfieBlob) retryTriggered();
}

modePhoto.addEventListener('click', () => switchSelfieMode('photo'));
modeVideo.addEventListener('click', () => switchSelfieMode('video'));

// ── Selfie camera ──────────────────────────────────────────────────

btnCamSelfie.addEventListener('click', async () => {
  btnCamSelfie.disabled = true;
  const stream = await startCamera(vidSelfie, overlaySelfie, 'user').catch(() => {
    btnCamSelfie.disabled = false;
  });
  if (!stream) return;
  state.streams.selfie = stream;
  vidSelfie.classList.remove('hidden');
  canvasSelfie.classList.add('hidden');
  btnCamSelfie.classList.add('hidden');

  if (state.selfieMode === 'photo') {
    btnSnapSelfie.classList.remove('hidden');
  } else {
    btnRecStart.classList.remove('hidden');
  }
});

// Photo capture
btnSnapSelfie.addEventListener('click', async () => {
  const blob = await captureFrame(vidSelfie, canvasSelfie);
  state.selfieBlob   = blob;
  state.selfieIsVid  = false;
  stopStream('selfie');
  vidSelfie.classList.add('hidden');
  overlaySelfie.classList.add('hidden');
  canvasSelfie.classList.remove('hidden');
  btnSnapSelfie.classList.add('hidden');
  btnRetrySelfie.classList.remove('hidden');
  selfieBadge.textContent = 'Captured';
  showThumb(thumbSelfieWrap, thumbSelfieImg, thumbVideo, blob, false);
  checkReady();
});

// Video recording
btnRecStart.addEventListener('click', () => {
  state.recChunks = [];
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  state.recorder = new MediaRecorder(state.streams.selfie, { mimeType });
  state.recorder.ondataavailable = e => { if (e.data.size) state.recChunks.push(e.data); };
  state.recorder.onstop = () => {
    const blob = new Blob(state.recChunks, { type: 'video/webm' });
    state.selfieBlob  = blob;
    state.selfieIsVid = true;
    stopStream('selfie');
    vidSelfie.classList.add('hidden');
    overlaySelfie.classList.add('hidden');
    recDot.classList.add('hidden');
    btnRecStop.classList.add('hidden');
    btnRetrySelfie.classList.remove('hidden');
    selfieBadge.textContent = 'Recorded ✓ (liveness)';
    showThumb(thumbSelfieWrap, thumbSelfieImg, thumbVideo, blob, true);
    checkReady();
  };
  state.recorder.start();
  recDot.classList.remove('hidden');
  btnRecStart.classList.add('hidden');
  btnRecStop.classList.remove('hidden');
  btnRecStop.disabled = false;
});

btnRecStop.addEventListener('click', () => {
  btnRecStop.disabled = true;
  state.recorder?.stop();
});

function retryTriggered() {
  state.selfieBlob = null;
  canvasSelfie.classList.add('hidden');
  overlaySelfie.classList.remove('hidden');
  btnRetrySelfie.classList.add('hidden');
  btnCamSelfie.classList.remove('hidden');
  btnCamSelfie.disabled = false;
  btnSnapSelfie.classList.add('hidden');
  btnRecStart.classList.add('hidden');
  btnRecStop.classList.add('hidden');
  recDot.classList.add('hidden');
  thumbSelfieWrap.classList.add('hidden');
  checkReady();
}

btnRetrySelfie.addEventListener('click', retryTriggered);

fileSelfie.addEventListener('change', () => {
  const file = fileSelfie.files[0];
  if (!file) return;
  state.selfieBlob  = file;
  state.selfieIsVid = file.type.startsWith('video/');
  stopStream('selfie');
  showThumb(thumbSelfieWrap, thumbSelfieImg, thumbVideo, file, state.selfieIsVid);
  selfieBadge.textContent = state.selfieIsVid ? 'Recorded ✓ (liveness)' : 'Captured';
  checkReady();
});

setupDrop($('drop-selfie'), fileSelfie, (blob, isVideo) => {
  state.selfieBlob  = blob;
  state.selfieIsVid = isVideo;
  showThumb(thumbSelfieWrap, thumbSelfieImg, thumbVideo, blob, isVideo);
  checkReady();
});

// ── Drag & drop helper ─────────────────────────────────────────────

function setupDrop(dropEl, inputEl, onFile) {
  dropEl.addEventListener('dragover', e => {
    e.preventDefault();
    dropEl.style.borderColor = 'var(--accent)';
  });
  dropEl.addEventListener('dragleave', () => {
    dropEl.style.borderColor = '';
  });
  dropEl.addEventListener('drop', e => {
    e.preventDefault();
    dropEl.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      inputEl.files = e.dataTransfer.files;
      onFile(file, file.type.startsWith('video/'));
    }
  });
}

// ── Verify ─────────────────────────────────────────────────────────

btnVerify.addEventListener('click', async () => {
  if (!state.idBlob || !state.selfieBlob) return;

  // Loading state
  btnVerify.disabled    = true;
  verifyLabel.textContent = 'Verifying…';
  verifySpinner.classList.remove('hidden');
  resultsEl.classList.add('hidden');

  const form = new FormData();
  form.append('id_image', state.idBlob, 'id_card.jpg');
  const selfieFilename = state.selfieIsVid ? 'selfie.webm' : 'selfie.jpg';
  form.append('selfie', state.selfieBlob, selfieFilename);
  const expectedType = $('expected-id-type').value;
  if (expectedType) form.append('expected_id_type', expectedType);

  try {
    const res  = await fetch('/verify', { method: 'POST', body: form });
    const data = await res.json();

    if (!res.ok) {
      showError(data.detail || `HTTP ${res.status}`);
      return;
    }
    renderResults(data);
  } catch (err) {
    showError(err.message);
  } finally {
    btnVerify.disabled      = false;
    verifyLabel.textContent = 'Verify Identity';
    verifySpinner.classList.add('hidden');
  }
});

// ── Render results ─────────────────────────────────────────────────

function renderResults(d) {
  resultsEl.classList.remove('hidden');
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const isMatch = d.is_match;
  const icon    = $('verdict-icon');
  icon.textContent = isMatch ? '✓' : '✗';
  icon.className   = 'verdict-icon' + (isMatch ? '' : ' fail');
  $('verdict-title').textContent = isMatch ? 'Identity Verified' : 'Match Failed';
  $('verdict-sub').textContent   = isMatch
    ? `Confidence: ${d.confidence}`
    : (d.error ? `Error: ${d.error}` : 'Faces do not match');

  // Score
  const score = d.match_score ?? 0;
  $('res-score').textContent = score !== null ? score.toFixed(3) : '—';
  $('res-score').style.color = scoreColor(score);
  $('score-fill').style.width = `${Math.max(0, Math.min(1, (score + 1) / 2) * 100)}%`;
  $('score-fill').style.background = scoreColor(score);

  // Confidence
  const confColor = { high: 'var(--green)', medium: 'var(--yellow)', low: 'var(--red)' };
  $('res-confidence').textContent  = d.confidence ?? '—';
  $('res-confidence').style.color  = confColor[d.confidence] ?? '';

  // Liveness
  if (d.liveness_passed === null || d.liveness_passed === undefined) {
    $('res-liveness').textContent = 'N/A';
    $('res-liveness').style.color = 'var(--text-muted)';
  } else {
    $('res-liveness').textContent = d.liveness_passed ? 'Passed ✓' : 'Failed ✗';
    $('res-liveness').style.color = d.liveness_passed ? 'var(--green)' : 'var(--red)';
  }

  $('res-id-blur').textContent     = d.id_blur_score    != null ? d.id_blur_score.toFixed(1)    : '—';
  $('res-selfie-blur').textContent = d.selfie_blur_score != null ? d.selfie_blur_score.toFixed(1) : '—';
  $('res-blinks').textContent      = d.liveness_blinks  != null ? d.liveness_blinks              : '—';

  // Anti-spoof live score (selfie)
  if (d.live_score != null) {
    const ls = d.live_score;
    $('res-live-score').textContent = ls.toFixed(3);
    $('res-live-score').style.color = ls >= 0.3 ? 'var(--green)' : 'var(--red)';
  } else {
    $('res-live-score').textContent = '—';
    $('res-live-score').style.color = '';
  }

  // ID document confirmation
  const docEl = $('res-id-document');
  if (d.id_confirmed_as_document === true) {
    const scoreStr = d.id_live_score != null ? ` (score: ${d.id_live_score.toFixed(3)})` : '';
    docEl.textContent = `Yes ✓${scoreStr}`;
    docEl.style.color = 'var(--green)';
  } else if (d.id_confirmed_as_document === false) {
    const scoreStr = d.id_live_score != null ? ` (score: ${d.id_live_score.toFixed(3)})` : '';
    docEl.textContent = `Suspicious ✗${scoreStr}`;
    docEl.style.color = 'var(--red)';
  } else {
    docEl.textContent = '—';
    docEl.style.color = '';
  }

  // ID document type classification
  const typeEl = $('res-id-type');
  if (d.id_type_detected) {
    const confColors = { high: 'var(--green)', medium: 'var(--yellow)', low: 'var(--red)' };
    typeEl.textContent = `${d.id_type_label || d.id_type_detected} (${d.id_type_confidence})`;
    typeEl.style.color = confColors[d.id_type_confidence] ?? '';
  } else {
    typeEl.textContent = 'Unknown';
    typeEl.style.color = 'var(--text-muted)';
  }

  const typeMatchEl = $('res-type-match');
  if (d.id_type_match === true) {
    typeMatchEl.textContent = 'Match ✓';
    typeMatchEl.style.color = 'var(--green)';
  } else if (d.id_type_match === false) {
    typeMatchEl.textContent = 'Mismatch ✗';
    typeMatchEl.style.color = 'var(--red)';
  } else {
    typeMatchEl.textContent = 'N/A';
    typeMatchEl.style.color = 'var(--text-muted)';
  }

  // Spoof banner
  const spoofBanner = $('spoof-banner');
  if (d.spoof_detected) {
    const labels = {
      duplicate_submission: 'The selfie image is identical (or near-identical) to the ID card image.',
      face_spoof_detected:  `Anti-spoof model detected a fake face in the selfie (live score: ${d.live_score != null ? d.live_score.toFixed(3) : 'n/a'}). Possible print or screen replay attack.`,
    };
    $('spoof-reason-text').textContent = labels[d.spoof_reason] || d.spoof_reason || '';
    spoofBanner.classList.remove('hidden');
  } else {
    spoofBanner.classList.add('hidden');
  }

  $('res-raw').textContent = JSON.stringify(d, null, 2);
}

function scoreColor(s) {
  if (s >= 0.45) return 'var(--green)';
  if (s >= 0.30) return 'var(--yellow)';
  return 'var(--red)';
}

function showError(msg) {
  resultsEl.classList.remove('hidden');
  $('verdict-icon').textContent  = '!';
  $('verdict-icon').className    = 'verdict-icon fail';
  $('verdict-title').textContent = 'Request Failed';
  $('verdict-sub').textContent   = msg;
  $('res-raw').textContent       = msg;
}
