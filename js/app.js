document.addEventListener('DOMContentLoaded', () => {
  const demoText = "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'".split(' ');
  
  const wordDisplay = document.getElementById('rsvp-word');
  const progressBar = document.getElementById('rsvp-progress');
  const playBtn = document.getElementById('play-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (!wordDisplay || !progressBar || !playBtn || !resetBtn) return;

  let currentIndex = 0;
  let isPlaying = false;
  let timerId = null;
  const baseWpm = 350;
  const msPerWord = Math.floor(60000 / baseWpm);

  // Helper to find Optimal Recognition Point (ORP)
  function getORPIndex(word length) {
    if (length <= 1) return 0;
    if (length >= 2 && length <= 5) return 1;
    if (length >= 6 && length <= 9) return 2;
    if (length >= 10 && length <= 13) return 3;
    return 4; // for 14+ letter words
  }

  function renderWord(word) {
    if (!word) return;
    const cleanWord = word.replace(/[.,:;'"“”‘’]/g, '');
    const actualLength = cleanWord.length;
    if (actualLength === 0) {
      wordDisplay.innerHTML = word;
      return;
    }

    // Rough approximation to center the pivot visually.
    const pivotIndex = getORPIndex(actualLength);
    
    // We need to map the pivot back to the original word including punctuation
    let charArr = word.split('');
    let letterCount = 0;
    let actualPivot = 0;

    for (let i = 0; i < charArr.length; i++) {
      if (/[a-zA-Z]/.test(charArr[i])) {
        if (letterCount === pivotIndex) {
          actualPivot = i;
          break;
        }
        letterCount++;
      }
    }

    const before = charArr.slice(0, actualPivot).join('');
    const pivot = charArr[actualPivot] || '';
    const after = charArr.slice(actualPivot + 1).join('');

    // To align the pivot center, we could use CSS grid/flex, but simple span coloring is okay
    wordDisplay.innerHTML = `${before}<span class="rsvp-pivot">${pivot}</span>${after}`;
  }

  function step() {
    if (currentIndex >= demoText.length) {
      isPlaying = false;
      updatePlayBtnUI();
      return;
    }

    const currentWord = demoText[currentIndex];
    renderWord(currentWord);
    
    const progressPercent = ((currentIndex + 1) / demoText.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Calculate delay (pause slightly longer on punctuation)
    let currentDelay = msPerWord;
    if (/[.,:;]/.test(currentWord)) {
      currentDelay *= 2;
    }

    currentIndex++;

    if (isPlaying) {
      timerId = setTimeout(step, currentDelay);
    }
  }

  function updatePlayBtnUI() {
    const icon = playBtn.querySelector('svg');
    if (isPlaying) {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />';
    } else {
      // Re-initialize if reached end
      if (currentIndex >= demoText.length) {
        currentIndex = 0;
        progressBar.style.width = `0%`;
      }
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />';
    }
  }

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    updatePlayBtnUI();
    if (isPlaying) {
      step();
    } else {
      clearTimeout(timerId);
    }
  });

  resetBtn.addEventListener('click', () => {
    isPlaying = false;
    clearTimeout(timerId);
    currentIndex = 0;
    progressBar.style.width = `0%`;
    renderWord(demoText[0]);
    updatePlayBtnUI();
  });

  // initial render
  renderWord(demoText[0]);
});
