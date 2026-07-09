const pdfParse = require('pdf-parse');

/**
 * Extracts and parses questions and options from raw Question PDF text
 * @param {string} text 
 * @returns {Array} List of extracted questions with options
 */
const parseQuestionsText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  
  const isQuestionStart = (line) => {
    return /^\d+[\.\)\-\:]\s*/.test(line) || /^Q\d+[\.\)\-\:]\s*/.test(line);
  };
  
  const questionBlocks = [];
  let currentBlock = [];
  
  for (const line of lines) {
    if (isQuestionStart(line)) {
      if (currentBlock.length > 0) {
        questionBlocks.push(currentBlock);
      }
      currentBlock = [line];
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock);
  }
  
  for (const block of questionBlocks) {
    const fullText = block.join(' ');
    
    // Check for option delimiters
    const optARegex = /(?:[^a-zA-Z0-9]|^)(A[\.\)\s]|Option\s+A[\.\-\:]|[\(]A[\)])\s+/i;
    const optBRegex = /(?:[^a-zA-Z0-9]|^)(B[\.\)\s]|Option\s+B[\.\-\:]|[\(]B[\)])\s+/i;
    const optCRegex = /(?:[^a-zA-Z0-9]|^)(C[\.\)\s]|Option\s+C[\.\-\:]|[\(]C[\)])\s+/i;
    const optDRegex = /(?:[^a-zA-Z0-9]|^)(D[\.\)\s]|Option\s+D[\.\-\:]|[\(]D[\)])\s+/i;
    
    const aIndex = fullText.search(optARegex);
    const bIndex = fullText.search(optBRegex);
    const cIndex = fullText.search(optCRegex);
    const dIndex = fullText.search(optDRegex);
    
    let questionText = '';
    let options = ['', '', '', ''];
    
    if (aIndex !== -1 && bIndex !== -1 && cIndex !== -1 && dIndex !== -1 && aIndex < bIndex && bIndex < cIndex && cIndex < dIndex) {
      questionText = fullText.substring(0, aIndex).replace(/^\d+[\.\)\s]*/, '').replace(/^Q\d+[\.\)\s]*/, '').trim();
      
      const rawA = fullText.substring(aIndex, bIndex).trim();
      options[0] = rawA.replace(/^(A[\.\)\s]|Option\s+A[\.\-\:]|[\(]A[\)])\s*/i, '').trim();
      
      const rawB = fullText.substring(bIndex, cIndex).trim();
      options[1] = rawB.replace(/^(B[\.\)\s]|Option\s+B[\.\-\:]|[\(]B[\)])\s*/i, '').trim();
      
      const rawC = fullText.substring(cIndex, dIndex).trim();
      options[2] = rawC.replace(/^(C[\.\)\s]|Option\s+C[\.\-\:]|[\(]C[\)])\s*/i, '').trim();
      
      const rawD = fullText.substring(dIndex).trim();
      options[3] = rawD.replace(/^(D[\.\)\s]|Option\s+D[\.\-\:]|[\(]D[\)])\s*/i, '').trim();
    } else {
      // Fallback line by line parser
      let qText = '';
      let opts = [];
      for (const line of block) {
        if (isQuestionStart(line)) {
          qText = line.replace(/^\d+[\.\)\s]*/, '').replace(/^Q\d+[\.\)\s]*/, '');
        } else if (/^[A-D][\.\)\s]/i.test(line)) {
          opts.push(line.replace(/^[A-D][\.\)\s]*/i, '').trim());
        } else if (/^Option\s+[A-D]/i.test(line)) {
          opts.push(line.replace(/^Option\s+[A-D][\.\-\:]*/i, '').trim());
        } else {
          if (opts.length === 0) {
            qText += ' ' + line;
          } else {
            opts[opts.length - 1] += ' ' + line;
          }
        }
      }
      questionText = qText.trim();
      while (opts.length < 4) {
        opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
      }
      options = opts.slice(0, 4);
    }
    
    if (questionText) {
      questions.push({
        questionText: questionText,
        options: options,
        correctAnswer: 'A', // default value
      });
    }
  }
  
  return questions;
};

/**
 * Extracts answer keys mapped to question indices from Answer Key PDF text
 * @param {string} text 
 * @returns {Object} Mapping of question numbers to correct options
 */
const parseAnswersText = (text) => {
  const answersMap = {};
  
  // 1. Try side-by-side regex matching (e.g. "Q1. A", "1. A", "1 - B")
  const regex = /(?:Q|Question\s*)?(\d+)\s*[\dots\-\:\=\)\(\[\]\s,]*\s*([A-D])\b/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ans = match[2].toUpperCase();
    answersMap[qNum] = ans;
  }
  
  // If we matched a reasonable number of answers (e.g., at least 10), return it
  if (Object.keys(answersMap).length >= 10) {
    return answersMap;
  }
  
  // 2. Tabular/Grid layout parser fallback (handles spaced and spaceless grids)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    let qTokens = [];
    if (/Q\d+/i.test(currentLine)) {
      // Matches spaceless "Q1Q2Q3..." or spaced "Q1 Q2..."
      qTokens = currentLine.match(/Q\d+/gi) || [];
    } else if (/^\d+(?:\s+\d+)*$/.test(currentLine)) {
      // Matches spaced numbers: "1 2 3..."
      qTokens = currentLine.split(/\s+/);
    }
    
    const isQLine = qTokens.length >= 3;
    
    let aTokens = [];
    const cleanedNextLine = nextLine.replace(/\s+/g, '');
    if (/^[A-D]+$/i.test(cleanedNextLine)) {
      if (nextLine.includes(' ')) {
        // Spaced options: "B C B..."
        aTokens = nextLine.split(/\s+/);
      } else {
        // Spaceless options: "BCBBBBCBBB"
        aTokens = nextLine.split('');
      }
    }
    
    const isALine = aTokens.length >= 3;
    
    if (isQLine && isALine) {
      const len = Math.min(qTokens.length, aTokens.length);
      for (let j = 0; j < len; j++) {
        const qNumStr = qTokens[j].replace(/^Q/i, '');
        const qNum = parseInt(qNumStr, 10);
        const ans = aTokens[j].toUpperCase();
        answersMap[qNum] = ans;
      }
      i++; // skip nextLine since we matched and zipped it
    }
  }
  
  return answersMap;
};

/**
 * Main service function to parse Question and Answer PDFs and merge them
 * @param {Buffer} questionsBuffer 
 * @param {Buffer} answersBuffer 
 * @returns {Promise<Array>} List of complete MCQs ready for DB insertion
 */
const parseExamPDFs = async (questionsBuffer, answersBuffer) => {
  try {
    const qPdf = await pdfParse(questionsBuffer);
    const aPdf = await pdfParse(answersBuffer);
    
    console.log('--- Raw Question PDF Text ---');
    console.log(qPdf.text.substring(0, 1000) + '...'); // logs first 1000 chars for preview
    console.log('--- Raw Answer Key PDF Text ---');
    console.log(aPdf.text);
    
    const questions = parseQuestionsText(qPdf.text);
    const answersMap = parseAnswersText(aPdf.text);
    
    console.log('Parsed Answers Map:', answersMap);
    
    // Merge answers into questions
    const mergedQuestions = questions.map((q, idx) => {
      const qNum = idx + 1;
      const correctAns = answersMap[qNum] || 'A'; // default to A if no matching answer key
      return {
        ...q,
        correctAnswer: correctAns,
      };
    });
    
    return mergedQuestions;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF files: ' + error.message);
  }
};

module.exports = {
  parseExamPDFs,
  parseQuestionsText,
  parseAnswersText,
};
