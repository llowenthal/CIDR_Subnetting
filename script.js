const bitValues = [128, 64, 32, 16, 8, 4, 2, 1];
const rowNames = ["First", "Second", "Third", "Fourth"];

const container = document.getElementById("binaryTableContainer");
const cidrInput = document.getElementById("cidrInput");

function clampCidr(value) {
  const cidr = Number(value);

  if (!Number.isInteger(cidr)) {
    return 0;
  }

  return Math.max(0, Math.min(32, cidr));
}

/*
 * This is the central update function.
 *
 * Whether the CIDR input changes or a bit changes, everything eventually
 * passes through this function.
 */
function setCidr(value) {
  const cidr = clampCidr(value);

  cidrInput.value = cidr;

  updateEditableBits(cidr);
  updateRowSums();
  updateCidrSummaryTable(cidr);
  updateMaximumPossibleAddresses(cidr);
}

function createBinaryTable() {
  const table = document.createElement("table");
  table.id = "binaryTable";
  table.setAttribute("aria-label", "Subnet mask binary table");

  const tbody = document.createElement("tbody");

  // Heading row.
  const headingRow = document.createElement("tr");

  const blankHeading = document.createElement("th");
  blankHeading.scope = "col";
  blankHeading.textContent = "Octet";
  headingRow.appendChild(blankHeading);

  bitValues.forEach((bitValue) => {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.textContent = bitValue;
    headingRow.appendChild(heading);
  });

  const decimalHeading = document.createElement("th");
  decimalHeading.scope = "col";
  decimalHeading.textContent = "Decimal";
  headingRow.appendChild(decimalHeading);

  tbody.appendChild(headingRow);

  // Four octet rows.
  rowNames.forEach((rowName, rowIndex) => {
    const row = document.createElement("tr");
    row.dataset.rowIndex = rowIndex;

    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.textContent = rowName;
    row.appendChild(labelCell);

    bitValues.forEach((bitValue, columnIndex) => {
      const cell = document.createElement("td");

      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.value = "0";
      input.maxLength = 1;
      input.classList.add("bit-input");

      input.dataset.row = rowIndex;
      input.dataset.column = columnIndex;
      input.dataset.bitValue = bitValue;

      // Position among all 32 subnet-mask bits.
      input.dataset.bitIndex = rowIndex * 8 + columnIndex;

      input.setAttribute("aria-label", `${rowName} octet, ${bitValue} bit`);

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

    sumInput.setAttribute("aria-label", `${rowName} octet decimal value`);

    sumCell.appendChild(sumInput);
    row.appendChild(sumCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.replaceChildren(table);
}

/*
 * Called when one of the 32 editable bit inputs changes.
 */
function handleBitInput(event) {
  const changedInput = event.target;

  // Only permit one 0 or 1.
  changedInput.value = changedInput.value.replace(/[^01]/g, "").slice(0, 1);

  if (changedInput.value === "") {
    changedInput.value = "0";
  }

  const changedBitIndex = Number(changedInput.dataset.bitIndex);

  /*
   * A valid subnet mask must contain uninterrupted 1s followed by
   * uninterrupted 0s.
   *
   * Clicking a bit to 1 means the CIDR extends through that bit.
   * Clicking a bit to 0 means the CIDR ends before that bit.
   */
  const newCidr =
    changedInput.value === "1" ? changedBitIndex + 1 : changedBitIndex;

  setCidr(newCidr);
}

/*
 * Update the editable 32-bit table from the CIDR prefix.
 *
 * /10 means bit indexes 0 through 9 are 1 and the remainder are 0.
 */
function updateEditableBits(cidr) {
  const bitInputs = document.querySelectorAll(".bit-input");

  bitInputs.forEach((input) => {
    const bitIndex = Number(input.dataset.bitIndex);
    input.value = bitIndex < cidr ? "1" : "0";
  });
}

function updateRowSums() {
  rowNames.forEach((_, rowIndex) => {
    const rowInputs = document.querySelectorAll(
      `.bit-input[data-row="${rowIndex}"]`,
    );

    let sum = 0;

    rowInputs.forEach((input) => {
      if (input.value === "1") {
        sum += Number(input.dataset.bitValue);
      }
    });

    const sumInput = document.querySelector(
      `.sum-input[data-sum-row="${rowIndex}"]`,
    );

    sumInput.value = sum;
  });
}

/*
 * Update your separate CIDR summary table.
 *
 * Expected element IDs:
 * ones-0 through ones-3
 * binary-0 through binary-3
 * decimal-0 through decimal-3
 */
function updateCidrSummaryTable(cidr) {
  for (let octetIndex = 0; octetIndex < 4; octetIndex++) {
    const bitsBeforeOctet = octetIndex * 8;

    const oneBits = Math.max(0, Math.min(8, cidr - bitsBeforeOctet));

    const binary = "1".repeat(oneBits) + "0".repeat(8 - oneBits);

    const decimal = parseInt(binary, 2);

    const onesElement = document.getElementById(`ones-${octetIndex}`);

    const binaryElement = document.getElementById(`binary-${octetIndex}`);

    const decimalElement = document.getElementById(`decimal-${octetIndex}`);

    if (onesElement) {
      onesElement.textContent = oneBits;
    }

    if (binaryElement) {
      binaryElement.textContent = binary;
    }

    if (decimalElement) {
      decimalElement.textContent = decimal;
    }
  }
}

cidrInput.addEventListener("input", () => {
  setCidr(cidrInput.value);
});

function updateMaximumPossibleAddresses(cidr) {
  const output = document.getElementById("maximum-possible-addresses");

  const hostBits = 32 - cidr;
  const totalAddresses = 2 ** hostBits;

  let usableAddresses;

  if (cidr === 32) {
    // A /32 represents one individual host address.
    usableAddresses = 0;
  } else if (cidr === 31) {
    /*
     * /31 subnets can use both addresses on point-to-point links.
     * Under the older traditional calculation, this would be 0.
     */
    usableAddresses = 0;
  } else {
    // Subtract the network and broadcast addresses.
    usableAddresses = totalAddresses - 2;
  }

  output.innerHTML = `
    <p>
      <strong>Maximum IP addresses:</strong>
      ${totalAddresses.toLocaleString()}
    </p>
    <p>
      <strong>Maximum usable IP addresses:</strong>
      ${usableAddresses.toLocaleString()}
    </p>
  `;
}

createBinaryTable();
setCidr(cidrInput.value);
