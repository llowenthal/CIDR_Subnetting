const quizState = {
  mode: null,
  answerCidr: null,
  answered: false
};

const QUIZ_MODES = {
    ONES_FROM_CIDR: "ones-from-cidr",
    CIDR_FROM_MASK: "cidr-from-mask",
    RANDOM: "random"
};

const startRandomQuizButton =
    document.getElementById("startRandomQuiz");

const startRandomQuizButton2 =
    document.getElementById("startRandomQuiz2");    

const startOnesQuizButton =
  document.getElementById("startOnesQuiz");

const startCidrQuizButton =
  document.getElementById("startCidrQuiz");

const quizCard =
  document.getElementById("quizCard");

const quizTitle =
  document.getElementById("quizTitle");

const quizDescription =
  document.getElementById("quizDescription");

const cidrPromptContainer =
  document.getElementById("cidrPromptContainer");

const cidrAnswerContainer =
  document.getElementById("cidrAnswerContainer");

const lockedCidrInput =
  document.getElementById("lockedCidrInput");

const cidrAnswerInput =
  document.getElementById("cidrAnswerInput");

const quizOnesRow =
  document.getElementById("quizOnesRow");

const quizBinaryRow =
  document.getElementById("quizBinaryRow");

const checkAnswerButton =
  document.getElementById("checkAnswerButton");

const newQuestionButton =
  document.getElementById("newQuestionButton");

const quizFeedback =
  document.getElementById("quizFeedback");

const onesInputs = Array.from(
  document.querySelectorAll(".ones-input")
);

/**
 * Generate a random integer from min through max,
 * including both endpoints.
 */
function randomInteger(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

/**
 * Generate any valid CIDR prefix from /0 through /32.
 */
function generateRandomCidr() {
  return randomInteger(0, 32);
}

/**
 * Return the expected one-bit count for one octet.
 *
 * Examples:
 *
 * /4  => [4, 0, 0, 0]
 * /16 => [8, 8, 0, 0]
 * /27 => [8, 8, 8, 3]
 */
function getOneBitsByOctet(cidr) {
  return [0, 1, 2, 3].map((octetIndex) => {
    const bitsBeforeOctet = octetIndex * 8;

    return Math.max(
      0,
      Math.min(8, cidr - bitsBeforeOctet)
    );
  });
}

/**
 * Convert a count of one bits into an 8-bit binary string.
 *
 * 0 => 00000000
 * 3 => 11100000
 * 8 => 11111111
 */
function oneBitsToBinary(oneBits) {
  const validOneBits = clampOneBits(oneBits);

  return (
    "1".repeat(validOneBits) +
    "0".repeat(8 - validOneBits)
  );
}

/**
 * Convert a one-bit count into the corresponding decimal
 * subnet mask octet.
 *
 * 0 => 0
 * 1 => 128
 * 2 => 192
 * 8 => 255
 */
function oneBitsToDecimal(oneBits) {
  return parseInt(oneBitsToBinary(oneBits), 2);
}

/**
 * Guarantee that a one-bit value stays between 0 and 8.
 */
function clampOneBits(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(8, Math.trunc(numericValue))
  );
}

/**
 * Update one binary and decimal table cell using the value
 * currently entered in a One Bits input.
 */
function updateOctetFromOnesInput(octetIndex) {
  const input = onesInputs[octetIndex];
  const binaryCell =
    document.getElementById(`quiz-binary-${octetIndex}`);

  const decimalCell =
    document.getElementById(`quiz-decimal-${octetIndex}`);

  /*
   * While the field is blank, show placeholders rather than
   * immediately forcing the user-entered value to zero.
   */
  if (input.value === "") {
    binaryCell.textContent = "--------";
    decimalCell.textContent = "—";
    return;
  }

  const oneBits = clampOneBits(input.value);

  binaryCell.textContent = oneBitsToBinary(oneBits);
  decimalCell.textContent = oneBitsToDecimal(oneBits);
}

/**
 * Handle typing in a One Bits field.
 *
 * Values below zero become 0.
 * Values above eight become 8.
 * Decimal values are changed to whole numbers.
 */
function handleOneBitsInput(event) {
  const input = event.currentTarget;
  const octetIndex = Number(input.dataset.octet);

  clearInputAnswerStyles();

  if (input.value !== "") {
    const originalValue = Number(input.value);
    const clampedValue = clampOneBits(input.value);

    if (originalValue !== clampedValue) {
      input.value = String(clampedValue);

      showFeedback(
        "Each octet can contain only 0 through 8 one bits. " +
        `The value was changed to ${clampedValue}.`,
        "notice"
      );
    } else {
      clearFeedback();
    }
  }

  updateOctetFromOnesInput(octetIndex);
}

/**
 * Fill the decimal subnet-mask row from a CIDR prefix.
 */
function displaySubnetMask(cidr) {
  const expectedOneBits = getOneBitsByOctet(cidr);

  expectedOneBits.forEach((oneBits, octetIndex) => {
    document.getElementById(
      `quiz-binary-${octetIndex}`
    ).textContent = oneBitsToBinary(oneBits);

    document.getElementById(
      `quiz-decimal-${octetIndex}`
    ).textContent = oneBitsToDecimal(oneBits);
  });
}

/**
 * Clear all editable answer fields.
 */
function clearAnswerInputs() {
  onesInputs.forEach((input) => {
    input.value = "";
  });

  cidrAnswerInput.value = "";
}

/**
 * Remove green and red answer highlighting.
 */
function clearInputAnswerStyles() {
  onesInputs.forEach((input) => {
    input.classList.remove(
      "answer-correct",
      "answer-incorrect"
    );
  });

  cidrAnswerInput.classList.remove(
    "answer-correct",
    "answer-incorrect"
  );
}

/**
 * Display a status message.
 */
function showFeedback(message, type) {
  quizFeedback.textContent = message;
  quizFeedback.className = `quiz-feedback ${type}`;
}

/**
 * Remove the current status message.
 */
function clearFeedback() {
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";
}

/**
 * Select one of the two quiz modes.
 */
function selectQuizMode(mode) {
  quizState.currentQuestionMode = mode;

  startOnesQuizButton.classList.toggle(
    "selected-mode",
    mode === QUIZ_MODES.ONES_FROM_CIDR
  );

  startCidrQuizButton.classList.toggle(
    "selected-mode",
    mode === QUIZ_MODES.CIDR_FROM_MASK
  );

  quizCard.classList.remove("hidden");

  if (mode === QUIZ_MODES.ONES_FROM_CIDR) {
    quizTitle.textContent = "CIDR to One Bits";

    quizDescription.textContent =
      "A CIDR prefix will be generated. Enter the number " +
      "of one bits in each octet.";

    cidrPromptContainer.classList.remove("hidden");
    cidrAnswerContainer.classList.add("hidden");

    quizOnesRow.classList.remove("hidden");
    quizBinaryRow.classList.remove("hidden");
  } else {
    quizTitle.textContent = "Subnet Mask to CIDR";

    quizDescription.textContent =
      "A subnet mask will be generated. Enter its CIDR " +
      "prefix length.";

    cidrPromptContainer.classList.add("hidden");
    cidrAnswerContainer.classList.remove("hidden");

    /*
     * The One Bits and Binary rows are hidden for this quiz.
     */
    quizOnesRow.classList.add("hidden");
    quizBinaryRow.classList.add("hidden");
  }

  startRandomQuizButton.classList.toggle(
    "selected-mode",
    mode === QUIZ_MODES.RANDOM
 );

  createNewQuestion();
}

/**
 * Generate a new question for the selected quiz mode.
 */
function createNewQuestion() {

    // If Random mode is selected,
    // decide which quiz to generate.
    let currentMode = quizState.currentQuestionMode;

    if (currentMode === QUIZ_MODES.RANDOM) {
        currentMode =
            Math.random() < 0.5
                ? QUIZ_MODES.ONES_FROM_CIDR
                : QUIZ_MODES.CIDR_FROM_MASK;
    }

    quizState.currentQuestionMode = currentMode;

    if (currentMode === QUIZ_MODES.ONES_FROM_CIDR) {
        quizTitle.textContent = "Random • CIDR → One Bits";

        cidrPromptContainer.classList.remove("hidden");
        cidrAnswerContainer.classList.add("hidden");

        quizOnesRow.classList.remove("hidden");
        quizBinaryRow.classList.remove("hidden");
    }
    else {
        quizTitle.textContent = "Random • Subnet Mask → CIDR";

        cidrPromptContainer.classList.add("hidden");
        cidrAnswerContainer.classList.remove("hidden");

        quizOnesRow.classList.add("hidden");
        quizBinaryRow.classList.add("hidden");
    }

    quizState.answerCidr = generateRandomCidr();
    quizState.answered = false;

    clearAnswerInputs();
    clearInputAnswerStyles();
    clearFeedback();

  if (quizState.currentQuestionMode === QUIZ_MODES.ONES_FROM_CIDR) {
    lockedCidrInput.value = quizState.answerCidr;

    /*
     * Do not reveal the expected mask. The binary and decimal
     * values will appear as the student fills out each field.
     */
    for (let octetIndex = 0; octetIndex < 4; octetIndex++) {
      document.getElementById(
        `quiz-binary-${octetIndex}`
      ).textContent = "--------";

      document.getElementById(
        `quiz-decimal-${octetIndex}`
      ).textContent = "—";
    }

    onesInputs[0].focus();
  } else {
    /*
     * Only the decimal row is visible in this quiz.
     */
    displaySubnetMask(quizState.answerCidr);
    cidrAnswerInput.focus();
  }
}

/**
 * Grade the CIDR-to-One-Bits quiz.
 */
function checkOneBitsAnswer() {
  const expectedValues =
    getOneBitsByOctet(quizState.answerCidr);

  let allFieldsCompleted = true;
  let allCorrect = true;

  onesInputs.forEach((input, octetIndex) => {
    input.classList.remove(
      "answer-correct",
      "answer-incorrect"
    );

    if (input.value === "") {
      allFieldsCompleted = false;
      allCorrect = false;
      input.classList.add("answer-incorrect");
      return;
    }

    const userValue = clampOneBits(input.value);
    const expectedValue = expectedValues[octetIndex];

    if (userValue === expectedValue) {
      input.classList.add("answer-correct");
    } else {
      allCorrect = false;
      input.classList.add("answer-incorrect");
    }
  });

  if (!allFieldsCompleted) {
    showFeedback(
      "Enter a value for all four octets before checking.",
      "incorrect"
    );

    return;
  }

  if (allCorrect) {
    quizState.answered = true;

    const subnetMask = expectedValues
      .map(oneBitsToDecimal)
      .join(".");

    showFeedback(
      `Correct. /${quizState.answerCidr} equals ${subnetMask}.`,
      "correct"
    );
  } else {
    showFeedback(
      "Not quite. Red fields are incorrect. " +
      "You can change them and check again.",
      "incorrect"
    );
  }
}

/**
 * Grade the subnet-mask-to-CIDR quiz.
 */
function checkCidrAnswer() {
  const rawAnswer = cidrAnswerInput.value.trim();

  cidrAnswerInput.classList.remove(
    "answer-correct",
    "answer-incorrect"
  );

  if (rawAnswer === "") {
    cidrAnswerInput.classList.add("answer-incorrect");

    showFeedback(
      "Enter a CIDR prefix before checking.",
      "incorrect"
    );

    return;
  }

  const userAnswer = Number(rawAnswer);

  if (
    !Number.isInteger(userAnswer) ||
    userAnswer < 0 ||
    userAnswer > 32
  ) {
    cidrAnswerInput.classList.add("answer-incorrect");

    showFeedback(
      "The CIDR prefix must be a whole number from 0 through 32.",
      "incorrect"
    );

    return;
  }

  if (userAnswer === quizState.answerCidr) {
    quizState.answered = true;
    cidrAnswerInput.classList.add("answer-correct");

    showFeedback(
      `Correct. The subnet mask is /${quizState.answerCidr}.`,
      "correct"
    );
  } else {
    cidrAnswerInput.classList.add("answer-incorrect");

    showFeedback(
      `Incorrect. ${userAnswer} does not match this subnet mask.`,
      "incorrect"
    );
  }
}

/**
 * Grade the active quiz.
 */
function checkAnswer() {
  if (quizState.currentQuestionMode === QUIZ_MODES.ONES_FROM_CIDR) {
    checkOneBitsAnswer();
    return;
  }

  if (quizState.currentQuestionMode === QUIZ_MODES.CIDR_FROM_MASK) {
    checkCidrAnswer();
  }
}

/*
 * Configure the four One Bits inputs.
 */
onesInputs.forEach((input, octetIndex) => {
  input.dataset.octet = octetIndex;

  input.addEventListener("input", handleOneBitsInput);

  input.addEventListener("blur", () => {
    /*
     * A blank field remains blank so the grader can identify
     * it as unanswered.
     */
    if (input.value !== "") {
      input.value = String(clampOneBits(input.value));
      updateOctetFromOnesInput(octetIndex);
    }
  });
});

startOnesQuizButton.addEventListener("click", () => {
  selectQuizMode(QUIZ_MODES.ONES_FROM_CIDR);
});

startCidrQuizButton.addEventListener("click", () => {
  selectQuizMode(QUIZ_MODES.CIDR_FROM_MASK);
});

checkAnswerButton.addEventListener("click", checkAnswer);

newQuestionButton.addEventListener("click", createNewQuestion);

startRandomQuizButton.addEventListener("click", () => {
    selectQuizMode(QUIZ_MODES.RANDOM);
});

startRandomQuizButton2.addEventListener("click", () => {
    selectQuizMode(QUIZ_MODES.RANDOM);
});

cidrAnswerInput.addEventListener("input", () => {
  cidrAnswerInput.classList.remove(
    "answer-correct",
    "answer-incorrect"
  );

  clearFeedback();
});

/*
 * Allow Enter to submit either quiz.
 */
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !quizCard.classList.contains("hidden")
  ) {
    event.preventDefault();
    checkAnswer();
  }
});