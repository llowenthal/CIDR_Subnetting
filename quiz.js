"use strict";

const QUIZ_MODES = Object.freeze({
  ONES_FROM_CIDR: "ones-from-cidr",
  CIDR_FROM_MASK: "cidr-from-mask",
  FULL_FROM_CIDR: "full-from-cidr",
  RANDOM: "random",
});

const QUIZ_CONFIG = {
  [QUIZ_MODES.ONES_FROM_CIDR]: {
    title: "CIDR to One Bits",
    description: "Enter the number of one bits in each octet.",
    showCidrPrompt: true,
    showCidrAnswer: false,
    showOnesRow: true,
    showMaskRow: false,
    showBinaryRow: true,
    showDecimalRow: true,
    showTotalAddresses: false,
  },

  [QUIZ_MODES.CIDR_FROM_MASK]: {
    title: "Subnet Mask to CIDR",
    description: "Enter the CIDR prefix represented by the subnet mask.",
    showCidrPrompt: false,
    showCidrAnswer: true,
    showOnesRow: false,
    showMaskRow: false,
    showBinaryRow: false,
    showDecimalRow: true,
    showTotalAddresses: false,
  },

  [QUIZ_MODES.FULL_FROM_CIDR]: {
    title: "CIDR Full Calculation",
    description:
      "Enter the one-bit counts, subnet mask, and total IP addresses.",
    showCidrPrompt: true,
    showCidrAnswer: false,
    showOnesRow: true,
    showMaskRow: true,
    showBinaryRow: false,
    showDecimalRow: false,
    showTotalAddresses: true,
  },
};

const quizState = {
  selectedMode: null,
  currentQuestionMode: null,
  answerCidr: null,

  // POTENTIALLY UNNECESSARY:
  // This value is assigned after a correct answer, but nothing currently
  // checks it. Remove it unless you plan to lock completed questions,
  // track scores, or prevent repeated submissions.
  answered: false,
};

const elements = {
  quizCard: document.getElementById("quizCard"),
  quizTitle: document.getElementById("quizTitle"),
  quizDescription: document.getElementById("quizDescription"),
  quizFeedback: document.getElementById("quizFeedback"),

  cidrPrompt: document.getElementById("cidrPromptContainer"),
  cidrAnswerContainer: document.getElementById("cidrAnswerContainer"),
  lockedCidrInput: document.getElementById("lockedCidrInput"),
  cidrAnswerInput: document.getElementById("cidrAnswerInput"),

  onesRow: document.getElementById("quizOnesRow"),
  maskRow: document.getElementById("quizMaskAnswerRow"),
  binaryRow: document.getElementById("quizBinaryRow"),
  decimalRow: document.getElementById("quizDecimalRow"),
  fullCidrAnswers: document.getElementById("fullCidrAnswers"),
  totalIpAnswer: document.getElementById("usableIpAnswer"),

  checkButton: document.getElementById("checkAnswerButton"),
  newQuestionButton: document.getElementById("newQuestionButton"),

  modeButtons: {
    [QUIZ_MODES.ONES_FROM_CIDR]: document.getElementById("startOnesQuiz"),

    [QUIZ_MODES.CIDR_FROM_MASK]: document.getElementById("startCidrQuiz"),

    [QUIZ_MODES.FULL_FROM_CIDR]: document.getElementById("startFullCidrQuiz"),
  },

  randomButtons: [
    document.getElementById("startRandomQuiz"),
    document.getElementById("startRandomQuiz2"),
  ],

  onesInputs: [...document.querySelectorAll(".ones-input")],

  maskInputs: [...document.querySelectorAll(".mask-answer-input")],

  binaryCells: Array.from({ length: 4 }, (_, index) =>
    document.getElementById(`quiz-binary-${index}`),
  ),

  decimalCells: Array.from({ length: 4 }, (_, index) =>
    document.getElementById(`quiz-decimal-${index}`),
  ),
};

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomCidr() {
  return randomInteger(0, 32);
}

function getOneBitsByOctet(cidr) {
  return Array.from({ length: 4 }, (_, octetIndex) => {
    const remainingBits = cidr - octetIndex * 8;
    return Math.max(0, Math.min(8, remainingBits));
  });
}

function clampOneBits(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(8, Math.trunc(number)));
}

function oneBitsToBinary(oneBits) {
  const normalizedBits = clampOneBits(oneBits);

  return "1".repeat(normalizedBits) + "0".repeat(8 - normalizedBits);
}

function oneBitsToDecimal(oneBits) {
  return Number.parseInt(oneBitsToBinary(oneBits), 2);
}

function getTotalAddressCount(cidr) {
  return 2 ** (32 - cidr);
}

// POTENTIALLY UNNECESSARY:
// This quiz currently asks for total addresses, not traditionally usable
// host addresses. Add this function back only if another quiz needs it:
//
// function getUsableAddressCount(cidr) {
//   return cidr >= 31 ? 0 : getTotalAddressCount(cidr) - 2;
// }

function setHidden(element, shouldHide) {
  element.classList.toggle("hidden", shouldHide);
}

function showFeedback(message, type) {
  elements.quizFeedback.textContent = message;
  elements.quizFeedback.className = `quiz-feedback ${type}`;
}

function clearFeedback() {
  elements.quizFeedback.textContent = "";
  elements.quizFeedback.className = "quiz-feedback";
}

function getAllAnswerInputs() {
  return [
    ...elements.onesInputs,
    ...elements.maskInputs,
    elements.cidrAnswerInput,
    elements.totalIpAnswer,
  ];
}

function clearAnswerInputs() {
  getAllAnswerInputs().forEach((input) => {
    input.value = "";
  });
}

function clearAnswerStyles() {
  getAllAnswerInputs().forEach((input) => {
    input.classList.remove("answer-correct", "answer-incorrect");
  });
}

function fillBlankInputsWithZero(inputs) {
  inputs.forEach((input) => {
    if (input.value.trim() === "") {
      input.value = "0";
    }
  });
}

function updateOctetPreview(octetIndex) {
  const input = elements.onesInputs[octetIndex];
  const binaryCell = elements.binaryCells[octetIndex];
  const decimalCell = elements.decimalCells[octetIndex];

  if (input.value === "") {
    binaryCell.textContent = "--------";
    decimalCell.textContent = "—";
    return;
  }

  const oneBits = clampOneBits(input.value);

  binaryCell.textContent = oneBitsToBinary(oneBits);
  decimalCell.textContent = oneBitsToDecimal(oneBits);
}

function resetOctetPreviews() {
  elements.binaryCells.forEach((cell) => {
    cell.textContent = "--------";
  });

  elements.decimalCells.forEach((cell) => {
    cell.textContent = "—";
  });
}

function displaySubnetMask(cidr) {
  const oneBitsByOctet = getOneBitsByOctet(cidr);

  oneBitsByOctet.forEach((oneBits, octetIndex) => {
    elements.binaryCells[octetIndex].textContent = oneBitsToBinary(oneBits);

    elements.decimalCells[octetIndex].textContent = oneBitsToDecimal(oneBits);
  });
}

function setSelectedModeButton(selectedMode) {
  Object.entries(elements.modeButtons).forEach(([mode, button]) => {
    button.classList.toggle("selected-mode", mode === selectedMode);
  });

  // POTENTIALLY UNNECESSARY:
  // The Random Quiz buttons do not receive selected-mode styling.
  // That is fine unless you want Random Quiz to remain visibly selected.
}

function applyQuestionLayout(mode) {
  const config = QUIZ_CONFIG[mode];

  elements.quizTitle.textContent = config.title;
  elements.quizDescription.textContent = config.description;

  setHidden(elements.cidrPrompt, !config.showCidrPrompt);
  setHidden(elements.cidrAnswerContainer, !config.showCidrAnswer);
  setHidden(elements.onesRow, !config.showOnesRow);
  setHidden(elements.maskRow, !config.showMaskRow);
  setHidden(elements.binaryRow, !config.showBinaryRow);
  setHidden(elements.decimalRow, !config.showDecimalRow);
  setHidden(elements.fullCidrAnswers, !config.showTotalAddresses);
}

function getRandomQuestionMode() {
  const modes = Object.keys(QUIZ_CONFIG);

  return modes[randomInteger(0, modes.length - 1)];
}

function selectQuizMode(mode) {
  quizState.selectedMode = mode;

  setSelectedModeButton(mode);
  elements.quizCard.classList.remove("hidden");

  createNewQuestion();
}

function createNewQuestion() {
  const mode =
    quizState.selectedMode === QUIZ_MODES.RANDOM
      ? getRandomQuestionMode()
      : quizState.selectedMode;

  if (!QUIZ_CONFIG[mode]) {
    return;
  }

  quizState.currentQuestionMode = mode;
  quizState.answerCidr = generateRandomCidr();
  quizState.answered = false;

  clearAnswerInputs();
  clearAnswerStyles();
  clearFeedback();
  applyQuestionLayout(mode);

  elements.lockedCidrInput.value = quizState.answerCidr;

  if (mode === QUIZ_MODES.CIDR_FROM_MASK) {
    displaySubnetMask(quizState.answerCidr);
    elements.cidrAnswerInput.focus();
    return;
  }

  if (mode === QUIZ_MODES.ONES_FROM_CIDR) {
    resetOctetPreviews();
  }

  elements.onesInputs[0].focus();
}

function gradeInputs(inputs, expectedValues, normalizeAnswer = Number) {
  let allCorrect = true;

  inputs.forEach((input, index) => {
    const userAnswer = normalizeAnswer(input.value);
    const isCorrect = userAnswer === expectedValues[index];

    input.classList.toggle("answer-correct", isCorrect);
    input.classList.toggle("answer-incorrect", !isCorrect);

    if (!isCorrect) {
      allCorrect = false;
    }
  });

  return allCorrect;
}

function checkOneBitsAnswer() {
  fillBlankInputsWithZero(elements.onesInputs);

  elements.onesInputs.forEach((_, index) => {
    updateOctetPreview(index);
  });

  const expectedOneBits = getOneBitsByOctet(quizState.answerCidr);

  const allCorrect = gradeInputs(
    elements.onesInputs,
    expectedOneBits,
    clampOneBits,
  );

  if (!allCorrect) {
    showFeedback(
      "Not quite. Red fields are incorrect. " +
        "You can change them and check again.",
      "incorrect",
    );
    return;
  }

  quizState.answered = true;

  const subnetMask = expectedOneBits.map(oneBitsToDecimal).join(".");

  showFeedback(
    `Correct. /${quizState.answerCidr} equals ${subnetMask}.`,
    "correct",
  );
}

function checkCidrAnswer() {
  const rawAnswer = elements.cidrAnswerInput.value.trim();
  const userAnswer = Number(rawAnswer);

  const isValid =
    rawAnswer !== "" &&
    Number.isInteger(userAnswer) &&
    userAnswer >= 0 &&
    userAnswer <= 32;

  elements.cidrAnswerInput.classList.remove(
    "answer-correct",
    "answer-incorrect",
  );

  if (!isValid) {
    elements.cidrAnswerInput.classList.add("answer-incorrect");

    showFeedback(
      "The CIDR prefix must be a whole number from 0 through 32.",
      "incorrect",
    );
    return;
  }

  const isCorrect = userAnswer === quizState.answerCidr;

  elements.cidrAnswerInput.classList.add(
    isCorrect ? "answer-correct" : "answer-incorrect",
  );

  if (!isCorrect) {
    showFeedback(
      `Incorrect. /${userAnswer} does not match this subnet mask.`,
      "incorrect",
    );
    return;
  }

  quizState.answered = true;

  showFeedback(
    `Correct. The subnet mask is /${quizState.answerCidr}.`,
    "correct",
  );
}

function checkFullCidrAnswer() {
  fillBlankInputsWithZero([
    ...elements.onesInputs,
    ...elements.maskInputs,
    elements.totalIpAnswer,
  ]);

  const expectedOneBits = getOneBitsByOctet(quizState.answerCidr);

  const expectedMask = expectedOneBits.map(oneBitsToDecimal);

  const expectedTotal = getTotalAddressCount(quizState.answerCidr);

  const onesCorrect = gradeInputs(
    elements.onesInputs,
    expectedOneBits,
    clampOneBits,
  );

  const maskCorrect = gradeInputs(elements.maskInputs, expectedMask, Number);

  const userTotal = Number(elements.totalIpAnswer.value);

  const totalCorrect =
    Number.isInteger(userTotal) && userTotal === expectedTotal;

  elements.totalIpAnswer.classList.toggle("answer-correct", totalCorrect);

  elements.totalIpAnswer.classList.toggle("answer-incorrect", !totalCorrect);

  if (!onesCorrect || !maskCorrect || !totalCorrect) {
    showFeedback(
      "Not quite. The incorrect answers are highlighted in red.",
      "incorrect",
    );
    return;
  }

  quizState.answered = true;

  showFeedback(
    `Correct. /${quizState.answerCidr} is ` +
      `${expectedMask.join(".")} with ` +
      `${expectedTotal.toLocaleString()} total IP addresses.`,
    "correct",
  );
}

function checkAnswer() {
  const handlers = {
    [QUIZ_MODES.ONES_FROM_CIDR]: checkOneBitsAnswer,

    [QUIZ_MODES.CIDR_FROM_MASK]: checkCidrAnswer,

    [QUIZ_MODES.FULL_FROM_CIDR]: checkFullCidrAnswer,
  };

  handlers[quizState.currentQuestionMode]?.();
}

function handleOneBitsInput(event) {
  const input = event.currentTarget;
  const octetIndex = Number(input.dataset.octet);

  clearAnswerStyles();

  if (input.value !== "") {
    const originalValue = Number(input.value);
    const clampedValue = clampOneBits(input.value);

    if (originalValue !== clampedValue) {
      input.value = String(clampedValue);

      showFeedback(
        "Each octet can contain only 0 through 8 one bits. " +
          `The value was changed to ${clampedValue}.`,
        "notice",
      );
    } else {
      clearFeedback();
    }
  }

  if (quizState.currentQuestionMode === QUIZ_MODES.ONES_FROM_CIDR) {
    updateOctetPreview(octetIndex);
  }
}

function configureInputs() {
  elements.onesInputs.forEach((input, octetIndex) => {
    input.dataset.octet = String(octetIndex);

    input.addEventListener("input", handleOneBitsInput);

    input.addEventListener("blur", () => {
      if (input.value === "") {
        return;
      }

      input.value = String(clampOneBits(input.value));

      if (quizState.currentQuestionMode === QUIZ_MODES.ONES_FROM_CIDR) {
        updateOctetPreview(octetIndex);
      }
    });
  });

  elements.cidrAnswerInput.addEventListener("input", () => {
    elements.cidrAnswerInput.classList.remove(
      "answer-correct",
      "answer-incorrect",
    );

    clearFeedback();
  });
}

function configureButtons() {
  Object.entries(elements.modeButtons).forEach(([mode, button]) => {
    button.addEventListener("click", () => {
      selectQuizMode(mode);
    });
  });

  elements.randomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectQuizMode(QUIZ_MODES.RANDOM);
    });
  });

  elements.checkButton.addEventListener("click", checkAnswer);

  elements.newQuestionButton.addEventListener("click", createNewQuestion);
}

function initializeQuiz() {
  configureInputs();
  configureButtons();

  document.addEventListener("keydown", (event) => {
    const quizIsHidden = elements.quizCard.classList.contains("hidden");

    if (event.key !== "Enter" || quizIsHidden) {
      return;
    }

    event.preventDefault();
    checkAnswer();
  });
}

initializeQuiz();
