document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const mainTextbox = document.getElementById('main-textbox');
  const originalTextbox = document.getElementById('original-textbox');
  const primaryWrapper = document.getElementById('primary-wrapper');
  const primaryBoxLabel = document.getElementById('primary-box-label');
  
  const inputTargetLength = document.getElementById('input-target-length');
  const inputMaxLimit = document.getElementById('input-max-limit');
  
  const btnGenerate = document.getElementById('btn-generate');
  const btnReset = document.getElementById('btn-reset');
  const btnToggleOriginal = document.getElementById('btn-toggle-original');
  const arrowIcon = document.getElementById('arrow-icon');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const originalDrawer = document.getElementById('original-drawer');
  const statsBadge = document.getElementById('stats-badge');
  const statChunks = document.getElementById('stat-chunks');
  const statChars = document.getElementById('stat-chars');

  let rawInputBackup = '';

  // 1. Regex Citation Cleaning Engine
  function cleanCitations(text) {
    return text
      // Cleans [cite 1], [cite 1, 2], [1], [1, 2], [cite 1-3], etc.
      .replace(/\[cite\s*:?\s*\d+(?:\s*[-,\S]\s*\d+)*\]/gi, '')
      .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '')
      .replace(/[ \t]{2,}/g, ' '); // Clean duplicate spaces left behind
  }

  // 2. Format Single Chunk Header
  function formatChunk(index, content) {
    return `[Chunk ${index}]\n\n${content.trim()}`;
  }

  // 3. Paragraph-Boundary Chunking Algorithm
  function splitIntoChunks(text, targetLen, maxLimit) {
    const cleanedText = cleanCitations(text).trim();
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

      // Check if adding this paragraph stays under hard max limit
      if (testChunkString.length <= maxLimit) {
        currentParagraphs.push(trimmedPara);
        
        // If target length reached, seal chunk at natural paragraph break
        const currentContentStr = formatChunk(chunkIndex, currentParagraphs.join('\n\n'));
        if (currentContentStr.length >= targetLen) {
          chunks.push(currentContentStr);
          chunkIndex++;
          currentParagraphs = [];
        }
      } else {
        // Exceeds max limit: finalize existing paragraphs into current chunk
        if (currentParagraphs.length > 0) {
          chunks.push(formatChunk(chunkIndex, currentParagraphs.join('\n\n')));
          chunkIndex++;
          currentParagraphs = [];
        }

        // Edge case: single paragraph exceeding max limit alone
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

    // Finalize trailing paragraphs
    if (currentParagraphs.length > 0) {
      chunks.push(formatChunk(chunkIndex, currentParagraphs.join('\n\n')));
    }

    return chunks;
  }

  // 4. Generate Button Handler
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
      const resultChunks = splitIntoChunks(rawInputBackup, targetLen, maxLimit);
      
      // Clean separation without artificial divider injection
      const formattedOutput = resultChunks.join('\n\n');

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);

      setTimeout(() => {
        loadingOverlay.classList.add('hidden');

        mainTextbox.value = formattedOutput;
        originalTextbox.value = rawInputBackup;

        primaryWrapper.classList.add('success-state');
        primaryBoxLabel.textContent = 'Chunked Markdown Output';

        btnGenerate.classList.add('hidden');
        btnReset.classList.remove('hidden');
        btnToggleOriginal.classList.remove('hidden');

        statChunks.textContent = `${resultChunks.length} Chunks`;
        statChars.textContent = `${formattedOutput.length} Total Chars`;
        statsBadge.classList.remove('hidden');

      }, remainingTime);
    }, 10);
  });

  // 5. Reset Button Handler
  btnReset.addEventListener('click', () => {
    mainTextbox.value = '';
    originalTextbox.value = '';
    rawInputBackup = '';

    primaryWrapper.classList.remove('success-state');
    primaryBoxLabel.textContent = 'Input Markdown Article';

    btnGenerate.classList.remove('hidden');
    btnReset.classList.add('hidden');
    btnToggleOriginal.classList.add('hidden');
    statsBadge.classList.add('hidden');

    originalDrawer.classList.remove('expanded');
    arrowIcon.classList.remove('rotated');
  });

  // 6. Drawer Toggle Handler
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