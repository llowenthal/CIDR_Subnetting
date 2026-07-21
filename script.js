const bitValues = [128, 64, 32, 16, 8, 4, 2, 1];
const rowNames = ["First", "Second", "Third", "Fourth"];

const container = document.getElementById("binaryTableContainer");

let correctButton;

function createBinaryTable() {
  const table = document.createElement("table");
  table.id = "binaryTable";
  table.setAttribute("aria-label", "Subnet mask binary table");

  const tbody = document.createElement("tbody");

  // Create heading row.
  const headingRow = document.createElement("tr");

  const blankHeading = document.createElement("th");
  blankHeading.textContent = "Octet";
  headingRow.appendChild(blankHeading);

  bitValues.forEach((bitValue) => {
    const heading = document.createElement("th");
    heading.textContent = bitValue;
    headingRow.appendChild(heading);
  });

  const decimalHeading = document.createElement("th");
  decimalHeading.textContent = "Decimal";
  headingRow.appendChild(decimalHeading);

  tbody.appendChild(headingRow);

  // Create the four octet rows.
  rowNames.forEach((rowName, rowIndex) => {
    const row = document.createElement("tr");
    row.dataset.rowIndex = rowIndex;

    const labelCell = document.createElement("td");
    labelCell.textContent = rowName;
    row.appendChild(labelCell);

    bitValues.forEach((bitValue, columnIndex) => {
      const cell = document.createElement("td");

      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "number";
      input.value = "0";
      input.maxLength = 1;
      input.classList.add("bit-input");

      input.dataset.row = rowIndex;
      input.dataset.column = columnIndex;
      input.dataset.bitValue = bitValue;

      input.setAttribute(
        "aria-label",
        `${rowName} octet, ${bitValue} bit`
      );

      input.addEventListener("input", handleBitInput);

      cell.appendChild(input);
      row.appendChild(cell);
    });

    const sumCell = document.createElement("td");

    const sumInput = document.createElement("input");
    sumInput.type = "number";
    sumInput.value = "0";
    sumInput.readOnly = true;
    sumInput.classList.add("sum-input");
    sumInput.dataset.sumRow = rowIndex;
    sumInput.setAttribute(
      "aria-label",
      `${rowName} octet decimal value`
    );

    sumCell.appendChild(sumInput);
    row.appendChild(sumCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  
  container.replaceChildren(table);

  updateTable();
}

function handleBitInput(event) {
  const changedInput = event.target;

  // Only allow 0 or 1.
  changedInput.value = changedInput.value
    .replace(/[^01]/g, "")
    .slice(0, 1);

  // Treat an empty input as 0.
  if (changedInput.value === "") {
    changedInput.value = "0";
  }

  const bitInputs = Array.from(
    document.querySelectorAll(".bit-input")
  );

  const changedIndex = bitInputs.indexOf(changedInput);

  if (changedInput.value === "1") {
    // Fill the selected bit and every bit to its left with 1.
    for (let index = 0; index <= changedIndex; index++) {
      bitInputs[index].value = "1";
    }
  } else {
    /*
     * When changing a bit to 0, set every bit to its right to 0.
     * This prevents a pattern such as 11010100.
     */
    for (
      let index = changedIndex;
      index < bitInputs.length;
      index++
    ) {
      bitInputs[index].value = "0";
    }
  }

  updateRowSums();
}

function updateTable() {
  updateRowSums();
}

function updateRowSums() {
  rowNames.forEach((_, rowIndex) => {
    const rowInputs = document.querySelectorAll(
      `.bit-input[data-row="${rowIndex}"]`
    );

    let sum = 0;

    rowInputs.forEach((input) => {
      const bit = input.value === "1" ? 1 : 0;
      const bitValue = Number(input.dataset.bitValue);

      sum += bit * bitValue;
    });

    const sumInput = document.querySelector(
      `.sum-input[data-sum-row="${rowIndex}"]`
    );

    sumInput.value = sum;
  });
}

// TEST
const cidrInput = document.getElementById("cidrInput");

function updateCidrTable() {
  let cidr = Number(cidrInput.value);

  // Keep the CIDR value between 0 and 32.
  if (!Number.isInteger(cidr)) {
    cidr = 0;
  }

  cidr = Math.max(0, Math.min(32, cidr));
  cidrInput.value = cidr;

  for (let octetIndex = 0; octetIndex < 4; octetIndex++) {
    /*
     * Determine how many 1 bits belong in this octet.
     *
     * Examples:
     * /28 -> [8, 8, 8, 4]
     * /20 -> [8, 8, 4, 0]
     * /10 -> [8, 2, 0, 0]
     */
    const bitsBeforeOctet = octetIndex * 8;

    const oneBits = Math.max(
      0,
      Math.min(8, cidr - bitsBeforeOctet)
    );

    const binary =
      "1".repeat(oneBits) +
      "0".repeat(8 - oneBits);

    const decimal = parseInt(binary, 2);

    document.getElementById(
      `ones-${octetIndex}`
    ).textContent = oneBits;

    document.getElementById(
      `binary-${octetIndex}`
    ).textContent = binary;

    document.getElementById(
      `decimal-${octetIndex}`
    ).textContent = decimal;
  }
}

cidrInput.addEventListener("input", updateCidrTable);

// Populate the table using the initial input value.
updateCidrTable();
// TEST

createBinaryTable();



