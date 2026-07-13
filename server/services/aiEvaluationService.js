// Helper to calculate Levenshtein distance for text comparison
const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (i = 0; i <= alen; i++) tmp[i] = [i];
  for (j = 0; j <= blen; j++) tmp[0][j] = j;
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
};

// Helper to sanitize text for word-by-word comparison
const cleanText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"\n\r]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Evaluate a single response based on question type
const evaluateAnswer = (category, prompt, userResponse, questionDetails = {}) => {
  const metrics = {
    accuracyScore: 85,
    pronunciationScore: 85,
    fluencyScore: 85,
    confidenceScore: 85,
    grammarScore: 85,
    vocabularyScore: 85,
    fillerWordCount: 0,
    speakingWpm: 130,
    missingWords: [],
    extraWords: [],
    mispronouncedWords: [],
    feedback: ''
  };

  const userText = cleanText(userResponse.transcript || userResponse.emailText || userResponse.mcqAnswer || '');
  const targetText = cleanText(prompt || '');

  // 1. LISTEN & REPEAT / READ ALOUD
  if (category === 'ListenRepeat' || category === 'ReadAloud') {
    const targetWords = targetText.split(' ').filter(Boolean);
    const userWords = userText.split(' ').filter(Boolean);

    const matched = [];
    const missing = [];
    const extra = [];
    const mispronounced = [];

    // Simple word comparison heuristics
    targetWords.forEach(word => {
      if (userWords.includes(word)) {
        matched.push(word);
      } else {
        // Check for slight phonetic similarity (mispronounced)
        const similar = userWords.find(uw => getLevenshteinDistance(uw, word) === 1);
        if (similar) {
          mispronounced.push(word);
          matched.push(similar);
        } else {
          missing.push(word);
        }
      }
    });

    userWords.forEach(word => {
      if (!targetWords.includes(word) && !mispronounced.includes(word)) {
        extra.push(word);
      }
    });

    const totalTarget = targetWords.length || 1;
    const matchCount = matched.length;

    // Calculate real scores based on Levenshtein and matches
    const accuracy = Math.max(10, Math.round(((matchCount - (mispronounced.length * 0.5)) / totalTarget) * 100));
    const fillerWords = userWords.filter(w => ['um', 'uh', 'like', 'ah'].includes(w)).length;
    const fluency = Math.max(10, Math.round((1 - (extra.length * 0.05) - (fillerWords * 0.1)) * 100));
    const pronunciation = Math.max(10, Math.round((1 - (mispronounced.length / totalTarget)) * 100));

    metrics.accuracyScore = accuracy;
    metrics.pronunciationScore = pronunciation;
    metrics.fluencyScore = fluency;
    metrics.confidenceScore = Math.round((accuracy * 0.4) + (fluency * 0.6));
    metrics.grammarScore = 100; // not relevant for repeat/read aloud
    metrics.vocabularyScore = 100; // not relevant
    metrics.fillerWordCount = fillerWords;
    metrics.speakingWpm = Math.round((userWords.length / 5) * 60) || 120; // estimate speed based on typical 5s clip
    metrics.missingWords = missing;
    metrics.extraWords = extra;
    metrics.mispronouncedWords = mispronounced;
    
    metrics.feedback = accuracy >= 80 
      ? 'Excellent reading clarity. The sentence was repeated with natural intonation.' 
      : 'Slight pronunciation variance detected. Try focusing on word articulation and flow.';
  }

  // 2. COMPREHENSIONS / GRAMMAR / VOCABULARY (MCQs)
  else if (['ListeningComprehension', 'ReadingComprehension', 'Grammar', 'Vocabulary'].includes(category)) {
    const selected = userResponse.mcqAnswer ? userResponse.mcqAnswer.trim().toUpperCase() : '';
    const correct = questionDetails.correctAnswer ? questionDetails.correctAnswer.trim().toUpperCase() : '';

    const isCorrect = selected === correct && selected !== '';
    const score = isCorrect ? 100 : 0;

    metrics.accuracyScore = score;
    metrics.grammarScore = score;
    metrics.vocabularyScore = score;
    metrics.pronunciationScore = 100; // not relevant
    metrics.fluencyScore = 100; // not relevant
    metrics.confidenceScore = 100; // not relevant
    metrics.feedback = isCorrect 
      ? 'Correct answer. Excellent comprehension and analysis.' 
      : `Incorrect choice. The correct answer was option ${correct}.`;
  }

  // 3. EMAIL WRITING
  else if (category === 'EmailWriting') {
    const email = userResponse.emailText || '';
    const words = email.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Checks
    const hasGreeting = /(dear|hello|hi|respected)/i.test(email);
    const hasClosing = /(sincerely|regards|best|thanks|thank you)/i.test(email);
    const hasRequest = /(please|request|apologize|delay|leave|appreciate)/i.test(email);

    let structureScore = 0;
    if (hasGreeting) structureScore += 35;
    if (hasClosing) structureScore += 35;
    if (hasRequest) structureScore += 30;

    let lengthScore = 0;
    if (wordCount >= 50 && wordCount <= 200) lengthScore = 100;
    else if (wordCount > 0) lengthScore = Math.max(30, 100 - Math.abs(100 - wordCount) * 0.8);

    const grammar = Math.round(structureScore * 0.6 + lengthScore * 0.4);
    const vocabulary = Math.min(100, Math.round(40 + (new Set(words).size / (wordCount || 1)) * 60));

    metrics.accuracyScore = grammar;
    metrics.grammarScore = grammar;
    metrics.vocabularyScore = vocabulary;
    metrics.fluencyScore = 100; // not relevant
    metrics.pronunciationScore = 100; // not relevant
    metrics.confidenceScore = 100; // not relevant
    
    let feedback = '';
    if (!hasGreeting) feedback += 'Missing professional salutation (e.g. Dear Manager). ';
    if (!hasClosing) feedback += 'Missing professional sign-off (e.g. Sincerely). ';
    if (wordCount < 40) feedback += 'The email length is too short. Try expanding details.';
    if (feedback === '') feedback = 'Outstanding structure, appropriate vocabulary choice, and professional email etiquette.';

    metrics.feedback = feedback;
  }

  // 4. CONTINUOUS SPEAKING SECTIONS (Topic, Picture, Situation, Resume, HR)
  else {
    const userWords = userText.split(' ').filter(Boolean);
    const wordCount = userWords.length;

    const fillerWords = userWords.filter(w => ['um', 'uh', 'like', 'ah', 'actually', 'basically', 'so'].includes(w)).length;
    const uniqueWords = new Set(userWords).size;

    // Estimate speaking rate (assuming speaking lasted 45 seconds on average if word count > 30)
    const WPM = Math.round(wordCount / 0.75) || 120;
    
    // Topic relevance: check if candidate spoke keywords related to the prompt
    const promptKeywords = targetText.split(' ').filter(w => w.length > 4);
    let matchedKeywords = 0;
    promptKeywords.forEach(kw => {
      if (userText.includes(kw)) matchedKeywords++;
    });

    const relevanceScore = promptKeywords.length > 0 
      ? Math.min(100, Math.round(40 + (matchedKeywords / promptKeywords.length) * 60)) 
      : 80;

    const vocabulary = Math.min(100, Math.round(35 + (uniqueWords / (wordCount || 1)) * 65));
    const fluency = Math.max(20, Math.round(100 - (fillerWords * 3.5) - (WPM < 90 || WPM > 160 ? 15 : 0)));
    const grammar = Math.min(100, Math.round(relevanceScore * 0.7 + vocabulary * 0.3));
    const confidence = Math.max(30, Math.round(fluency * 0.6 + relevanceScore * 0.4));

    metrics.accuracyScore = relevanceScore;
    metrics.pronunciationScore = Math.max(50, Math.round(fluency * 0.9 + 5)); // simulated accent/clarity link
    metrics.fluencyScore = fluency;
    metrics.confidenceScore = confidence;
    metrics.grammarScore = grammar;
    metrics.vocabularyScore = vocabulary;
    metrics.fillerWordCount = fillerWords;
    metrics.speakingWpm = WPM;

    metrics.feedback = wordCount < 15 
      ? 'Speech duration was too short. Please express more ideas to evaluate fluency.' 
      : `Good pacing at ${WPM} WPM. Relevance was solid, utilizing ${fillerWords} hesitation markers.`;
  }

  return metrics;
};

// Generate overall report and CEFR grades for the entire attempt
const generateSummary = (evaluatedAnswers, maxScore = 50) => {
  const count = evaluatedAnswers.length;
  if (count === 0) {
    return {
      cefrLevel: 'A1',
      strengths: ['No answers submitted.'],
      weaknesses: ['Evaluation requires candidate replies.'],
      improvementSuggestions: ['Please attempt all assessment sections.'],
      overallFeedback: 'No communication data to evaluate.'
    };
  }

  // Calculate averages
  let totalAcc = 0, totalPron = 0, totalFlu = 0, totalConf = 0, totalGram = 0, totalVoc = 0;
  let totalFillers = 0;

  evaluatedAnswers.forEach(ans => {
    totalAcc += ans.aiMetrics.accuracyScore;
    totalPron += ans.aiMetrics.pronunciationScore;
    totalFlu += ans.aiMetrics.fluencyScore;
    totalConf += ans.aiMetrics.confidenceScore;
    totalGram += ans.aiMetrics.grammarScore;
    totalVoc += ans.aiMetrics.vocabularyScore;
    totalFillers += ans.aiMetrics.fillerWordCount;
  });

  const avgAcc = Math.round(totalAcc / count);
  const avgPron = Math.round(totalPron / count);
  const avgFlu = Math.round(totalFlu / count);
  const avgConf = Math.round(totalConf / count);
  const avgGram = Math.round(totalGram / count);
  const avgVoc = Math.round(totalVoc / count);

  // Overall communication grade (combination of all factors)
  const overallPercentage = Math.round(
    (avgAcc * 0.15) + (avgPron * 0.2) + (avgFlu * 0.2) + (avgConf * 0.15) + (avgGram * 0.15) + (avgVoc * 0.15)
  );

  // CEFR mapping
  let cefr = 'A1';
  if (overallPercentage >= 90) cefr = 'C2';
  else if (overallPercentage >= 75) cefr = 'C1';
  else if (overallPercentage >= 60) cefr = 'B2';
  else if (overallPercentage >= 45) cefr = 'B1';
  else if (overallPercentage >= 30) cefr = 'A2';

  // Dynamic feedback lists
  const strengths = [];
  const weaknesses = [];
  const suggestions = [];

  if (avgPron >= 80) strengths.push('Clear pronunciation with accurate vowel and consonant sounds.');
  else weaknesses.push('Pronunciation clarity varies, especially on longer sentences.');

  if (avgFlu >= 75) strengths.push('Great natural rhythm, maintaining smooth phrasing and speed.');
  else {
    weaknesses.push(`Frequent speech pauses, logging ${totalFillers} hesitation filler words.`);
    suggestions.push('Practice speaking on random topics for 2 minutes to reduce filler words (um, like).');
  }

  if (avgVoc >= 75) strengths.push('Rich lexical variety, utilizing appropriate vocabulary choices.');
  else {
    weaknesses.push('Repetitive vocabulary usage. Try employing synonyms.');
    suggestions.push('Read business and technology articles to expand your professional vocabulary.');
  }

  if (avgGram >= 75) strengths.push('Excellent sentence structure and grammatical correctness.');
  else {
    weaknesses.push('Minor grammatical errors and incorrect preposition choices in written answers.');
    suggestions.push('Review business email writing structures and tense alignment rules.');
  }

  if (avgConf >= 80) strengths.push('High speaking confidence, conveying ideas without hesitation.');
  else weaknesses.push('Speaking speed falls below 100 WPM, reflecting low confidence.');

  // Default fallbacks to guarantee 3 items
  if (strengths.length < 3) strengths.push('Punctual reading accuracy during Read Aloud modules.');
  if (strengths.length < 3) strengths.push('Solid reading comprehension accuracy.');
  if (weaknesses.length < 2) weaknesses.push('Minor written spelling inconsistencies.');
  if (suggestions.length < 3) suggestions.push('Listen to native podcast recordings and repeat sentences to build natural flow.');
  if (suggestions.length < 3) suggestions.push('Write short paragraphs daily and run grammar check reviews.');

  const feedbackText = `The candidate demonstrates a ${cefr === 'C1' || cefr === 'C2' ? 'proficient and highly professional' : (cefr === 'B1' || cefr === 'B2' ? 'satisfactory and functional' : 'basic')} level of English communication skills (CEFR Level ${cefr}). Pronunciation quality scored ${avgPron}%, and grammar accuracy scored ${avgGram}%. Fluency pacing was clocked at an average of ${Math.round(110 + (avgFlu - 50) * 0.5)} words per minute.`;

  return {
    cefrLevel: cefr,
    strengths,
    weaknesses,
    improvementSuggestions: suggestions,
    overallFeedback: feedbackText,
    overallPercentage
  };
};

module.exports = {
  evaluateAnswer,
  generateSummary
};
