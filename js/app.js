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
  ].join(' ');

  const canvasDisplay = document.getElementById('rsvp-canvas');
  const wordDisplay = document.getElementById('rsvp-word');
  const playBtn = document.getElementById('play-btn');
  const speedSlider = document.getElementById('speed-slider');
  const wpmLabel = document.getElementById('wpm-label');
  const readerPanel = (canvasDisplay || wordDisplay)?.closest('.hero-visual');

  if (!playBtn || !speedSlider || !wpmLabel || !readerPanel) return;

  const demoText = (canvasDisplay?.dataset.demoText || wordDisplay?.dataset.demoText || readerPanel.dataset.demoText || defaultDemoText).trim();

  if (canvasDisplay) {
    initializeCanvasReader(canvasDisplay, demoText);
    return;
  }

  if (wordDisplay) {
    initializeDomReader(wordDisplay, demoText);
  }

  function initializeDomReader(display, text) {
    const words = text.split(/\s+/).filter(Boolean);
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
        display.textContent = word;
        display.style.setProperty('--reader-offset', '0px');
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

      display.innerHTML = `
        <span class="reader-before">${before}</span>
        <span class="reader-pivot">${pivot}</span>
        <span class="reader-after">${after}</span>
      `;
      alignPivotToCenter();
    }

    function alignPivotToCenter() {
      const pivot = display.querySelector('.reader-pivot');
      if (!pivot) return;

      display.style.setProperty('--reader-offset', '0px');

      const panelRect = readerPanel.getBoundingClientRect();
      const pivotRect = pivot.getBoundingClientRect();
      const panelCenter = panelRect.left + panelRect.width / 2;
      const pivotCenter = pivotRect.left + pivotRect.width / 2;
      const offset = panelCenter - pivotCenter;

      display.style.setProperty('--reader-offset', `${offset}px`);
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
  }

  function initializeCanvasReader(canvas, text) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const LETTER_RE = /\p{L}/u;
    const MARK_RE = /\p{M}/u;
    const WHITESPACE_RE = /\s/u;
    const ATTACH_TO_PREVIOUS_RE = /^[\p{P}\p{S}]+$/u;
    const OPENING_PUNCT_RE = /^[([{<"']$/u;
    const CLOSING_PUNCT_START_RE = /^[)\]}>.,!?;:'"]/u;
    const TERMINAL_PUNCT_RE = /[.!?]+[)\]}>"']*$/u;
    const STRONG_PUNCT_RE = /[;:]+[)\]}>"']*$/u;
    const COMMA_PUNCT_RE = /[,]+[)\]}>"']*$/u;
    const LATIN_LETTER_RE = /^\p{Script=Latin}$/u;
    const NUMBER_RE = /^\p{N}$/u;
    const PUNCT_OR_SYMBOL_RE = /^[\p{P}\p{S}]$/u;
    const LATIN_NARROW_LETTERS = new Set(['i', 'l', 'I', 'j']);
    const LATIN_SLIM_LETTERS = new Set(['f', 'r', 't']);
    const LATIN_WIDE_LETTERS = new Set(['m', 'w', 'M', 'W']);
    const PAPER_PALETTE = {
      bg: '#11100d',
      word: '#e9dec7',
      orp: '#d97706',
      focalLine: 'rgba(239, 233, 218, 0.20)'
    };

    let currentWpm = Number(speedSlider.value) || 450;
    let isPlaying = true;
    let animationId = null;
    let startTime = performance.now();
    let pausedElapsed = 0;
    let timeline = buildTimeline();

    function tokenizeReadingText(source) {
      const tokens = [];
      let current = '';
      let currentStart = 0;
      let pendingPrefix = '';
      let pendingPrefixStart = 0;

      const emit = (tokenText, start, end) => {
        if (tokenText) tokens.push({ text: tokenText, start, end });
      };

      const flushCurrent = (end) => {
        if (!current) return;
        emit(current, currentStart, end);
        current = '';
      };

      for (let index = 0; index < source.length;) {
        const codePoint = source.codePointAt(index);
        const unit = codePoint && codePoint > 0xffff ? source.slice(index, index + 2) : source[index];
        const nextIndex = index + unit.length;

        if (WHITESPACE_RE.test(unit)) {
          flushCurrent(index);
          if (pendingPrefix) {
            emit(pendingPrefix, pendingPrefixStart, index);
            pendingPrefix = '';
          }
          index = nextIndex;
          continue;
        }

        if (MARK_RE.test(unit)) {
          if (current) {
            current += unit;
          } else if (tokens.length > 0) {
            const previous = tokens[tokens.length - 1];
            previous.text += unit;
            previous.end = nextIndex;
          } else {
            if (!pendingPrefix) pendingPrefixStart = index;
            pendingPrefix += unit;
          }
          index = nextIndex;
          continue;
        }

        if (ATTACH_TO_PREVIOUS_RE.test(unit)) {
          if (current) {
            current += unit;
          } else if (tokens.length > 0 && !OPENING_PUNCT_RE.test(unit)) {
            const previous = tokens[tokens.length - 1];
            previous.text += unit;
            previous.end = nextIndex;
          } else {
            if (!pendingPrefix) pendingPrefixStart = index;
            pendingPrefix += unit;
          }
          index = nextIndex;
          continue;
        }

        if (!current) {
          currentStart = pendingPrefix ? pendingPrefixStart : index;
          current = pendingPrefix + unit;
          pendingPrefix = '';
        } else {
          current += unit;
        }
        index = nextIndex;
      }

      flushCurrent(source.length);
      if (pendingPrefix) emit(pendingPrefix, pendingPrefixStart, source.length);
      return tokens;
    }

    function splitGraphemesWithIndices(value) {
      if (window.Intl?.Segmenter) {
        const segments = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value));
        return segments.map((segment, index) => ({
          segment: segment.segment,
          start: segment.index,
          end: segments[index + 1]?.index ?? value.length
        }));
      }

      const graphemes = [];
      for (let index = 0; index < value.length;) {
        const codePoint = value.codePointAt(index);
        const segment = codePoint && codePoint > 0xffff ? value.slice(index, index + 2) : value[index];
        const nextIndex = index + segment.length;
        if (MARK_RE.test(segment) && graphemes.length > 0) {
          graphemes[graphemes.length - 1].segment += segment;
          graphemes[graphemes.length - 1].end = nextIndex;
        } else {
          graphemes.push({ segment, start: index, end: nextIndex });
        }
        index = nextIndex;
      }
      return graphemes;
    }

    function countGraphemes(value) {
      return splitGraphemesWithIndices(value).length;
    }

    function stripCombiningMarks(value) {
      return value.normalize('NFD').replace(/\p{M}/gu, '');
    }

    function estimateGraphemeVisualWidth(segment) {
      const base = Array.from(stripCombiningMarks(segment)).find((character) => !MARK_RE.test(character));
      if (!base) return 0;

      if (PUNCT_OR_SYMBOL_RE.test(base)) {
        if (/^[.,'`"]$/u.test(base)) return 0.22;
        if (/^[;:|!]$/u.test(base)) return 0.32;
        if (/^[()[\]{}<>]$/u.test(base)) return 0.42;
        return 0.5;
      }

      if (NUMBER_RE.test(base)) return 0.76;

      if (LATIN_LETTER_RE.test(base)) {
        if (LATIN_NARROW_LETTERS.has(base)) return 0.34;
        if (LATIN_SLIM_LETTERS.has(base)) return 0.56;
        if (LATIN_WIDE_LETTERS.has(base)) return 1.28;
        if (base === base.toUpperCase() && base !== base.toLowerCase()) return 1.02;
        return 0.84;
      }

      if (LETTER_RE.test(base)) return 0.92;
      return 0.84;
    }

    function pickVisualCenterGrapheme(graphemes) {
      const candidates = graphemes.filter((item) => LETTER_RE.test(item.segment));
      const targetCandidates = candidates.length > 0 ? candidates : graphemes;
      if (targetCandidates.length === 0) return undefined;

      const candidateSet = new Set(targetCandidates);
      const widths = graphemes.map((item) => estimateGraphemeVisualWidth(item.segment));
      const totalWidth = widths.reduce((sum, width) => sum + width, 0);
      if (totalWidth <= 0) return targetCandidates[Math.floor(targetCandidates.length / 2)];

      const midpoint = totalWidth / 2;
      let cursor = 0;
      let best = targetCandidates[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < graphemes.length; index += 1) {
        const item = graphemes[index];
        const width = widths[index];
        const center = cursor + (width / 2);
        if (candidateSet.has(item)) {
          const distance = Math.abs(center - midpoint);
          if (distance < bestDistance) {
            best = item;
            bestDistance = distance;
          }
        }
        cursor += width;
      }

      return best;
    }

    function getOrpParts(value) {
      const graphemes = splitGraphemesWithIndices(value);
      const target = pickVisualCenterGrapheme(graphemes);
      if (!target) return { before: '', orp: '', after: '' };
      return {
        before: value.slice(0, target.start),
        orp: value.slice(target.start, target.end),
        after: value.slice(target.end)
      };
    }

    function getReadableGlyphCount(item) {
      const letters = Array.from(item).filter((character) => LETTER_RE.test(character) && !MARK_RE.test(character));
      return letters.length || countGraphemes(item);
    }

    function hasTerminalPause(item) {
      return TERMINAL_PUNCT_RE.test(item.trim());
    }

    function hasStrongPause(item) {
      return STRONG_PUNCT_RE.test(item.trim());
    }

    function hasCommaPause(item) {
      return COMMA_PUNCT_RE.test(item.trim());
    }

    function hasInternalWordDash(item) {
      return /\p{L}[-\u2013\u2014]\p{L}/u.test(item);
    }

    function getTextStructure(source) {
      const tokens = tokenizeReadingText(source);
      const paragraphBreakIndices = new Set();

      for (let index = 1; index < tokens.length; index++) {
        const gap = source.slice(tokens[index - 1].end, tokens[index].start);
        if (/\n\s*\n/.test(gap)) paragraphBreakIndices.add(index);
      }

      return {
        words: tokens.map((token) => token.text),
        paragraphBreakIndices
      };
    }

    function getPlaybackDelayMs(item, displayIndex, baseMs, structure) {
      const length = getReadableGlyphCount(item);
      let delay = baseMs * (1.0 + Math.max(0, (length - 4) * 0.08));

      if (hasInternalWordDash(item)) {
        delay *= 1.35;
      }

      if (length >= 12) {
        delay += baseMs * 0.5;
      }

      if (hasTerminalPause(item)) {
        delay += baseMs * 2.5;
      } else if (hasStrongPause(item)) {
        delay += baseMs * 1.5;
      } else if (hasCommaPause(item)) {
        delay += baseMs * 0.75;
      } else {
        const last = item[item.length - 1];
        if (last === '"' || last === "'") {
          delay += baseMs * 0.4;
        }
      }

      if (structure.paragraphBreakIndices.has(displayIndex + 1)) {
        delay += baseMs * 4.0;
      }

      return delay;
    }

    function buildTimeline() {
      const structure = getTextStructure(text);
      const displayItems = structure.words.length ? structure.words : defaultDemoText.split(/\s+/);
      const starts = [];
      const delays = [];
      let cursor = 0;

      for (let index = 0; index < displayItems.length; index += 1) {
        const baseMs = 60000 / currentWpm;
        const delay = getPlaybackDelayMs(displayItems[index], index, baseMs, structure);
        starts.push(cursor);
        delays.push(delay);
        cursor += delay;
      }

      return {
        displayItems,
        starts,
        delays,
        totalMs: Math.max(cursor, 1)
      };
    }

    function findFrameIndex(elapsedMs) {
      const starts = timeline.starts;
      let low = 0;
      let high = starts.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (starts[mid] <= elapsedMs && elapsedMs < starts[mid] + timeline.delays[mid]) {
          return mid;
        }
        if (starts[mid] < elapsedMs) low = mid + 1;
        else high = mid - 1;
      }

      return Math.max(0, Math.min(starts.length - 1, low));
    }

    function roundRect(context, x, y, width, height, radius) {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.lineTo(x + width - radius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + radius);
      context.lineTo(x + width, y + height - radius);
      context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      context.lineTo(x + radius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.closePath();
    }

    function getLogicalCanvasSize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const pixelRatio = window.devicePixelRatio || 1;
      const backingWidth = Math.round(width * pixelRatio);
      const backingHeight = Math.round(height * pixelRatio);

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return { width, height };
    }

    function drawFrame(elapsedMs = 0) {
      const { width, height } = getLogicalCanvasSize();
      const frameIndex = findFrameIndex(elapsedMs);
      const item = timeline.displayItems[frameIndex] || '';
      const { before, orp, after } = getOrpParts(item);
      const maxWordWidth = width - 64;
      const naturalFontSize = width * 0.14;
      const halfBudget = (maxWordWidth / 2) - 4;
      const maxSideChars = Math.max(countGraphemes(before), countGraphemes(after), 1);
      const sideFitFontSize = halfBudget / (maxSideChars * 0.6);
      const fontSize = Math.max(1, Math.min(naturalFontSize, sideFitFontSize));
      const focalGuideHeight = naturalFontSize * 2.04;
      const focalGuideSegmentHeight = naturalFontSize * 0.66;
      const focalGuideWidth = Math.max(1.5, width * 0.0038);

      ctx.save();
      ctx.fillStyle = PAPER_PALETTE.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2, height / 2);

      ctx.fillStyle = PAPER_PALETTE.focalLine;
      const radius = focalGuideWidth / 2;
      roundRect(
        ctx,
        -focalGuideWidth / 2,
        -focalGuideHeight / 2,
        focalGuideWidth,
        focalGuideSegmentHeight,
        radius
      );
      ctx.fill();
      roundRect(
        ctx,
        -focalGuideWidth / 2,
        (focalGuideHeight / 2) - focalGuideSegmentHeight,
        focalGuideWidth,
        focalGuideSegmentHeight,
        radius
      );
      ctx.fill();

      ctx.font = `700 ${fontSize}px Georgia, serif`;
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';

      const orpWidth = ctx.measureText(orp).width;

      ctx.fillStyle = PAPER_PALETTE.word;
      ctx.textAlign = 'right';
      ctx.fillText(before, -orpWidth / 2, 0);
      ctx.textAlign = 'center';
      ctx.fillStyle = PAPER_PALETTE.orp;
      ctx.fillText(orp, 0, 0);
      ctx.textAlign = 'left';
      ctx.fillStyle = PAPER_PALETTE.word;
      ctx.fillText(after, orpWidth / 2, 0);
      ctx.restore();
    }

    function getElapsed(now = performance.now()) {
      if (!isPlaying) return pausedElapsed;
      return (now - startTime) % timeline.totalMs;
    }

    function updatePlayButton() {
      playBtn.textContent = isPlaying ? 'Pause' : 'Play';
    }

    function loop(now) {
      drawFrame(getElapsed(now));
      if (isPlaying) {
        animationId = window.requestAnimationFrame(loop);
      }
    }

    function restartAnimation() {
      window.cancelAnimationFrame(animationId);
      if (isPlaying) {
        animationId = window.requestAnimationFrame(loop);
      } else {
        drawFrame(pausedElapsed);
      }
    }

    speedSlider.addEventListener('input', () => {
      const oldTotal = timeline.totalMs;
      const progress = oldTotal ? getElapsed() / oldTotal : 0;
      currentWpm = Number(speedSlider.value) || 450;
      wpmLabel.textContent = `${currentWpm} WPM`;
      timeline = buildTimeline();
      pausedElapsed = progress * timeline.totalMs;
      startTime = performance.now() - pausedElapsed;
      restartAnimation();
    });

    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      updatePlayButton();

      if (isPlaying) {
        startTime = performance.now() - pausedElapsed;
        restartAnimation();
      } else {
        pausedElapsed = getElapsed();
        window.cancelAnimationFrame(animationId);
        drawFrame(pausedElapsed);
      }
    });

    window.addEventListener('resize', () => drawFrame(getElapsed()));

    currentWpm = Number(speedSlider.value) || 450;
    wpmLabel.textContent = `${currentWpm} WPM`;
    updatePlayButton();
    drawFrame(0);
    restartAnimation();
  }
});
