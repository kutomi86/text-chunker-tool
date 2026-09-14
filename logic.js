// =========================================================================
// PROHIBITED STRINGS CONFIGURATION (DEFAULT HARDCODED ARRAY)
// =========================================================================
const DEFAULT_PROHIBITED_STRINGS = ["---"];

let currentProhibitedStrings = [...DEFAULT_PROHIBITED_STRINGS];
let currentMode = 'chunker'; // 'chunker' | 'cleaner'

// Pre-calculated Cache Storage (Case 2 Engine)
let cachedChunkedOutput = '';
let cachedCleanerOutput = '';
let cachedChunkCount = 0;
let rawInputBackup = '';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const mainTextbox = document.getElementById('main-textbox');
  const highlightLayer = document.getElementById('highlight-layer');
  const editorContainer = document.getElementById('editor-container');
  const originalTextbox = document.getElementById('original-textbox');
  const primaryWrapper = document.getElementById('primary-wrapper');
  const primaryBoxLabel = document.getElementById('primary-box-label');
  
  const modeSwitchBar = document.getElementById('mode-switch-bar');
  const btnModeChunker = document.getElementById('btn-mode-chunker');
  const btnModeCleaner = document.getElementById('btn-mode-cleaner');
  const modeIndicator = document.getElementById('mode-indicator');
  
  const inputTargetLength = document.getElementById('input-target-length');
  const inputMaxLimit = document.getElementById('input-max-limit');
  
  const btnGenerate = document.getElementById('btn-generate');
  const btnReset = document.getElementById('btn-reset');
  const btnToggleOriginal = document.getElementById('btn-toggle-original');
  const arrowIcon = document.getElementById('arrow-icon');
  
  const btnToggleAddProhibited = document.getElementById('btn-toggle-add-prohibited');
  const prohibitedInputRow = document.getElementById('prohibited-input-row');
  const inputProhibitedText = document.getElementById('input-prohibited-text');
  const btnConfirmProhibited = document.getElementById('btn-confirm-prohibited');
  const prohibitedList = document.getElementById('prohibited-list');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const originalDrawer = document.getElementById('original-drawer');
  const statsBadge = document.getElementById('stats-badge');
  const statChunks = document.getElementById('stat-chunks');
  const statChars = document.getElementById('stat-chars');

  // Helper: HTML Escaper to prevent XSS in highlights layer
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 1. Prohibited Text Highlighter & Scroll Synchronizer
  function updateHighlights() {
    const text = mainTextbox.value;
    let escapedText = escapeHtml(text);

    if (currentProhibitedStrings.length > 0) {
      // Sort by length descending to prioritize longer matching phrases first
      const sortedStrings = [...currentProhibitedStrings].sort((a, b) => b.length - a.length);
      const escapedPatterns = sortedStrings
        .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .filter(s => s.length > 0);

      if (escapedPatterns.length > 0) {
        const regex = new RegExp(`(${escapedPatterns.join('|')})`, 'g');
        escapedText = escapedText.replace(regex, '<mark class="prohibited-highlight">$1</mark>');
      }
    }

    // Handle trailing newline rendering in HTML backdrop div
    if (text.endsWith('\n')) {
      escapedText += '<br>&nbsp;';
    }

    highlightLayer.innerHTML = escapedText;
  }

  // Synchronize scrolling between textarea and highlight backdrop
  mainTextbox.addEventListener('scroll', () => {
    highlightLayer.scrollTop = mainTextbox.scrollTop;
    highlightLayer.scrollLeft = mainTextbox.scrollLeft;
  });

  mainTextbox.addEventListener('input', updateHighlights);

  // 2. Mode Switcher & Pure CSS Swipe Animations (Case 2)
  function switchMode(newMode) {
    if (currentMode === newMode || !cachedChunkedOutput) return;

    const isCleaner = newMode === 'cleaner';

    // Apply smooth swipe out animation
    editorContainer.classList.add(isCleaner ? 'slide-out-left' : 'slide-out-right');

    setTimeout(() => {
      currentMode = newMode;

      // Swap displayed text from pre-calculated cache
      mainTextbox.value = isCleaner ? cachedCleanerOutput : cachedChunkedOutput;
      
      // Update Tab active UI & indicator positioning
      btnModeChunker.classList.toggle('active', !isCleaner);
      btnModeCleaner.classList.toggle('active', isCleaner);
      modeIndicator.classList.toggle('cleaner-active', isCleaner);

      primaryBoxLabel.textContent = isCleaner ? 'Cleaned Markdown Output' : 'Chunked Markdown Output';
      statChunks.textContent = isCleaner ? 'Cleaner Mode' : `${cachedChunkCount} Chunks`;
      statChars.textContent = `${mainTextbox.value.length} Total Chars`;

      updateHighlights();

      // Prepare slide in animation
      editorContainer.classList.remove('slide-out-left', 'slide-out-right');
      editorContainer.classList.add(isCleaner ? 'slide-in-right' : 'slide-in-left');

      // Trigger reflow & complete slide in
      void editorContainer.offsetWidth;
      editorContainer.classList.remove('slide-in-right', 'slide-in-left');
    }, 150);
  }

  btnModeChunker.addEventListener('click', () => switchMode('chunker'));
  btnModeCleaner.addEventListener('click', () => switchMode('cleaner'));

  // 3. Prohibited Items UI Manager
  function renderProhibitedList() {
    prohibitedList.innerHTML = '';
    currentProhibitedStrings.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'prohibited-item';
      li.innerHTML = `
        <span class="prohibited-item-content">
          <span>${escapeHtml(item)}</span>
          <button class="btn-remove-item" data-index="${index}" title="Remove item">&times;</button>
        </span>
      `;
      prohibitedList.appendChild(li);
    });

    // Attach deletion handlers to item buttons
    prohibitedList.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        currentProhibitedStrings.splice(idx, 1);
        renderProhibitedList();
        updateHighlights();
      });
    });
  }

  // Toggle prohibited text input field
  btnToggleAddProhibited.addEventListener('click', () => {
    prohibitedInputRow.classList.toggle('hidden');
    if (!prohibitedInputRow.classList.contains('hidden')) {
      inputProhibitedText.focus();
    }
  });

  // Add prohibited item function
  function addProhibitedItem() {
    const val = inputProhibitedText.value.trim();
    if (val && !currentProhibitedStrings.includes(val)) {
      currentProhibitedStrings.push(val);
      renderProhibitedList();
      updateHighlights();
      inputProhibitedText.value = '';
    }
  }

  btnConfirmProhibited.addEventListener('click', addProhibitedItem);
  inputProhibitedText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProhibitedItem();
    }
  });

  // Initial UI Render of hardcoded prohibited list
  renderProhibitedList();

  // 4. Text Sanitization Engine
  function sanitizeMarkdown(text) {
    // A. Clean citations & strip existing chunk headers
    let cleaned = text
      .replace(/\[cite\s*:?\s*\d+(?:\s*[-,\S]\s*\d+)*\]/gi, '')
      .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '')
      .replace(/^\s*\[Chunk\s+\d+\]\s*$/gmi, '')
      .replace(/[ \t]{2,}/g, ' ');

    const lines = cleaned.split('\n');
    const processedLines = [];
    let inCodeBlock = false;
    let codeBlockBuffer = [];

    // B. Code block edge-whitespace trimmer & empty quote remover
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inCodeBlock && /^\s*>\s*$/.test(line)) {
        continue;
      }

      const isCodeBlockFence = /^\s*```/.test(line);

      if (isCodeBlockFence) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          processedLines.push(line);
          codeBlockBuffer = [];
        } else {
          let start = 0;
          while (start < codeBlockBuffer.length && codeBlockBuffer[start].trim() === '') {
            start++;
          }
          let end = codeBlockBuffer.length - 1;
          while (end >= start && codeBlockBuffer[end].trim() === '') {
            end--;
          }

          for (let j = start; j <= end; j++) {
            processedLines.push(codeBlockBuffer[j]);
          }

          processedLines.push(line);
          inCodeBlock = false;
          codeBlockBuffer = [];
        }
      } else {
        if (inCodeBlock) {
          codeBlockBuffer.push(line);
        } else {
          processedLines.push(line);
        }
      }
    }

    if (inCodeBlock) {
      processedLines.push(...codeBlockBuffer);
    }

    // C. Remove empty line immediately below H1, H2, or H3 headings
    const finalLines = [];
    let insideBlock = false;

    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];

      if (/^\s*```/.test(line)) {
        insideBlock = !insideBlock;
      }

      finalLines.push(line);

      if (!insideBlock && /^#{1,3}\s+/.test(line)) {
        if (i + 1 < processedLines.length && processedLines[i + 1].trim() === '') {
          i++;
        }
      }
    }

    const resultText = finalLines.join('\n');
    return resultText.replace(/\n{3,}/g, '\n\n').trim();
  }

  // 5. Format Single Chunk Header
  function formatChunk(index, content) {
    return `[Chunk ${index}]\n\n${content.trim()}`;
  }

  // 6. Paragraph-Boundary Chunking Algorithm
  function splitIntoChunks(text, targetLen, maxLimit) {
    const cleanedText = sanitizeMarkdown(text).trim();
    if (!cleanedText) return [];

    const chunks = [];
    const paragraphs = cleanedText.split(/\n\s*\n/);
    
    let currentParagraphs = [];
    let chunkIndex = 1;

    paragraphs.forEach((paragraph) => {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) return;

      const testContent = [...currentParagraphs, trimmedPara].join('\n\n');
      const testChunkString = formatChunk(chunkIndex, testContent);

      if (testChunkString.length <= maxLimit) {
        currentParagraphs.push(trimmedPara);
        
        const currentContentStr = formatChunk(chunkIndex, currentParagraphs.join('\n\n'));
        if (currentContentStr.length >= targetLen) {
          chunks.push(currentContentStr);
          chunkIndex++;
          currentParagraphs = [];
        }
      } else {
        if (currentParagraphs.length > 0) {
          chunks.push(formatChunk(chunkIndex, currentParagraphs.join('\n\n')));
          chunkIndex++;
          currentParagraphs = [];
        }

        const singleParaChunkStr = formatChunk(chunkIndex, trimmedPara);
        if (singleParaChunkStr.length > maxLimit) {
          const lines = trimmedPara.split('\n');
          let subLines = [];

          lines.forEach((line) => {
            const testSub = [...subLines, line].join('\n');
            if (formatChunk(chunkIndex, testSub).length <= maxLimit) {
              subLines.push(line);
            } else {
              if (subLines.length > 0) {
                chunks.push(formatChunk(chunkIndex, subLines.join('\n')));
                chunkIndex++;
                subLines = [];
              }
              subLines.push(line);
            }
          });

          if (subLines.length > 0) {
            currentParagraphs = [subLines.join('\n')];
          }
        } else {
          currentParagraphs = [trimmedPara];
        }
      }
    });

    if (currentParagraphs.length > 0) {
      chunks.push(formatChunk(chunkIndex, currentParagraphs.join('\n\n')));
    }

    return chunks;
  }

  // 7. Generate Button Handler (Single Pass Dual-Cache Construction)
  btnGenerate.addEventListener('click', () => {
    const inputText = mainTextbox.value.trim();
    if (!inputText) {
      alert('Please paste or type an article first.');
      return;
    }

    const targetLen = parseInt(inputTargetLength.value, 10) || 1750;
    const maxLimit = parseInt(inputMaxLimit.value, 10) || 1900;

    if (targetLen >= maxLimit) {
      alert('Target Chunk Length should be less than Hard Max Limit.');
      return;
    }

    rawInputBackup = mainTextbox.value;
    const startTime = Date.now();

    loadingOverlay.classList.remove('hidden');

    setTimeout(() => {
      // 1. Generate chunked version
      const resultChunks = splitIntoChunks(rawInputBackup, targetLen, maxLimit);
      cachedChunkedOutput = resultChunks.join('\n\n');
      cachedChunkCount = resultChunks.length;

      // 2. Generate cleaner version by stripping [Chunk X] headers from chunks
      cachedCleanerOutput = resultChunks
        .map(chunk => chunk.replace(/^\[Chunk\s+\d+\]\s*/i, '').trim())
        .join('\n\n');

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);

      setTimeout(() => {
        loadingOverlay.classList.add('hidden');

        // Set state to Chunker mode by default
        currentMode = 'chunker';
        mainTextbox.value = cachedChunkedOutput;
        originalTextbox.value = rawInputBackup;
        updateHighlights();

        primaryWrapper.classList.add('success-state');
        primaryBoxLabel.textContent = 'Chunked Markdown Output';

        // Reveal UI elements
        modeSwitchBar.classList.remove('hidden');
        btnModeChunker.classList.add('active');
        btnModeCleaner.classList.remove('active');
        modeIndicator.classList.remove('cleaner-active');

        btnGenerate.classList.add('hidden');
        btnReset.classList.remove('hidden');
        btnToggleOriginal.classList.remove('hidden');

        statChunks.textContent = `${cachedChunkCount} Chunks`;
        statChars.textContent = `${cachedChunkedOutput.length} Total Chars`;
        statsBadge.classList.remove('hidden');

      }, remainingTime);
    }, 10);
  });

  // 8. Reset Button Handler ("Chunk Another")
  btnReset.addEventListener('click', () => {
    mainTextbox.value = '';
    originalTextbox.value = '';
    rawInputBackup = '';
    cachedChunkedOutput = '';
    cachedCleanerOutput = '';
    cachedChunkCount = 0;
    currentMode = 'chunker';

    // Restore prohibited list array state to original hardcoded default
    currentProhibitedStrings = [...DEFAULT_PROHIBITED_STRINGS];
    renderProhibitedList();
    updateHighlights();

    primaryWrapper.classList.remove('success-state');
    primaryBoxLabel.textContent = 'Input Markdown Article';

    modeSwitchBar.classList.add('hidden');
    btnGenerate.classList.remove('hidden');
    btnReset.classList.add('hidden');
    btnToggleOriginal.classList.add('hidden');
    statsBadge.classList.add('hidden');

    originalDrawer.classList.remove('expanded');
    arrowIcon.classList.remove('rotated');
  });

  // 9. Drawer Toggle Handler
  btnToggleOriginal.addEventListener('click', () => {
    const isExpanded = originalDrawer.classList.contains('expanded');
    
    if (isExpanded) {
      originalDrawer.classList.remove('expanded');
      arrowIcon.classList.remove('rotated');
    } else {
      originalDrawer.classList.add('expanded');
      arrowIcon.classList.add('rotated');
    }
  });
});