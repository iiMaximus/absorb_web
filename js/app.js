document.addEventListener('DOMContentLoaded', () => {
  const defaultDemoText = [
    'Tonight,',
    'a',
    'moonlit',
    'accountant',
    'adjusted',
    'his',
    'velvet',
    'cape.',
    'The',
    'numbers',
    'are',
    'alive,',
    'whispered',
    'June,',
    'and',
    'they',
    'demand',
    'snacks.',
    'A',
    'neon',
    'toaster',
    'blinked',
    'twice,',
    'the',
    'elevator',
    'sighed,',
    'and',
    'everyone',
    'agreed',
    'the',
    'sequel',
    'needed',
    'more',
    'spreadsheets.'
  ];

  const wordDisplay = document.getElementById('rsvp-word');
  const playBtn = document.getElementById('play-btn');
  const speedSlider = document.getElementById('speed-slider');
  const wpmLabel = document.getElementById('wpm-label');
  const readerPanel = wordDisplay?.closest('.hero-visual');

  if (!wordDisplay || !playBtn || !speedSlider || !wpmLabel || !readerPanel) return;

  const customDemoText = wordDisplay.dataset.demoText || readerPanel.dataset.demoText || '';
  const demoText = customDemoText.trim().split(/\s+/).filter(Boolean);
  const words = demoText.length ? demoText : defaultDemoText;

  let currentIndex = 0;
  let isPlaying = true;
  let timerId = null;
  let currentWpm = Number(speedSlider.value) || 450;

  function getORPIndex(length) {
    if (length <= 1) return 0;
    if (length <= 5) return 1;
    if (length <= 9) return 2;
    if (length <= 13) return 3;
    return 4;
  }

  function escapeHTML(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function renderWord(word) {
    const lettersOnly = word.replace(/[^a-zA-Z]/g, '');
    if (!lettersOnly) {
      wordDisplay.textContent = word;
      wordDisplay.style.setProperty('--reader-offset', '0px');
      return;
    }

    const pivotIndex = getORPIndex(lettersOnly.length);
    const characters = word.split('');
    let letterCount = 0;
    let actualPivot = 0;

    for (let index = 0; index < characters.length; index++) {
      if (/[a-zA-Z]/.test(characters[index])) {
        if (letterCount === pivotIndex) {
          actualPivot = index;
          break;
        }
        letterCount++;
      }
    }

    const before = escapeHTML(characters.slice(0, actualPivot).join(''));
    const pivot = escapeHTML(characters[actualPivot] || '');
    const after = escapeHTML(characters.slice(actualPivot + 1).join(''));

    wordDisplay.innerHTML = `
      <span class="reader-before">${before}</span>
      <span class="reader-pivot">${pivot}</span>
      <span class="reader-after">${after}</span>
    `;
    alignPivotToCenter();
  }

  function alignPivotToCenter() {
    const pivot = wordDisplay.querySelector('.reader-pivot');
    if (!pivot) return;

    wordDisplay.style.setProperty('--reader-offset', '0px');

    const panelRect = readerPanel.getBoundingClientRect();
    const pivotRect = pivot.getBoundingClientRect();
    const panelCenter = panelRect.left + panelRect.width / 2;
    const pivotCenter = pivotRect.left + pivotRect.width / 2;
    const offset = panelCenter - pivotCenter;

    wordDisplay.style.setProperty('--reader-offset', `${offset}px`);
  }

  function getDelay(word) {
    const baseDelay = 60000 / currentWpm;
    if (/[.!?]$/.test(word)) return baseDelay * 2.15;
    if (/[,;:]$/.test(word)) return baseDelay * 1.55;
    return baseDelay;
  }

  function updatePlayButton() {
    playBtn.textContent = isPlaying ? 'Pause' : 'Play';
  }

  function scheduleNext(previousWord) {
    window.clearTimeout(timerId);
    if (!isPlaying) return;
    timerId = window.setTimeout(showNextWord, getDelay(previousWord));
  }

  function showNextWord() {
    const word = words[currentIndex];
    renderWord(word);
    currentIndex = (currentIndex + 1) % words.length;
    scheduleNext(word);
  }

  speedSlider.addEventListener('input', () => {
    currentWpm = Number(speedSlider.value) || 450;
    wpmLabel.textContent = `${currentWpm} WPM`;
    scheduleNext(words[Math.max(currentIndex - 1, 0)]);
  });

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    updatePlayButton();
    if (isPlaying) {
      showNextWord();
    } else {
      window.clearTimeout(timerId);
    }
  });

  window.addEventListener('resize', alignPivotToCenter);

  if (document.fonts?.ready) {
    document.fonts.ready.then(alignPivotToCenter);
  }

  renderWord(words[0]);
  currentIndex = 1;
  updatePlayButton();
  scheduleNext(words[0]);
});
