export type TableLine = number[];
export type Table = number[][];

export const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const equals = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
export const sum = (a: number[]) => a.reduce((p,c) => p+c, 0);
export const valueSum = (a: { value: number }[]) => a.reduce((p,c) => p+c.value, 0);

const isTableNegative = (table: Table): boolean =>
  table.some(row => row.some(value => value < 0));

const checkSubTotals = (subtotalLine: TableLine, originalSubTotalLine: TableLine): boolean => 
  originalSubTotalLine.every((value, index) => value === 0 || subtotalLine[index] === value);

const checkCells = (newTable: Table, oldTable: Table): boolean =>
  oldTable.every((row, i) => row.every((value, j) => value === 0 || value === newTable[i][j]));

const checkSubTotalConsistency = (newTable: Table, subTotalsByColumn: TableLine, subTotalsByRow: TableLine): boolean =>
  subTotalsByRow.every((subtotal, i) => sum(newTable[i]) === subtotal) &&
  subTotalsByColumn.every((subtotal, j) => sum(newTable.map(row => row[j])) === subtotal);

export const split = (table: Table, subTotalsByColumn: TableLine, subTotalsByRow: TableLine, total: number) => {
  
  const missingSubtotalsByColumn = subTotalsByColumn
    .map((value, j) => ({ value, j }))
    .filter(({ value }) => value === 0)
    .map(({ value, j }) => ({ value: value + sum(table.map(row => row[j])), j }));
  const missingSubtotalsByRow = subTotalsByRow
    .map((value, i) => ({ value, i }))
    .filter(({ value }) => value === 0)
    .map(({ value, i }) => ({ value: value + sum(table[i]), i }));

  const remainingSubtotalsByColumn = total - sum(subTotalsByColumn) - valueSum(missingSubtotalsByColumn);
  const remainingSubtotalsByRow = total - sum(subTotalsByRow) - valueSum(missingSubtotalsByRow);

  const subtotalsByColumnDelta = missingSubtotalsByColumn.length > 0 ? Math.floor(remainingSubtotalsByColumn / missingSubtotalsByColumn.length) : 0;
  const subtotalsByColumnRemainder = missingSubtotalsByColumn.length > 0 ? remainingSubtotalsByColumn % missingSubtotalsByColumn.length : 0;
  const subtotalsByRowDelta = missingSubtotalsByRow.length > 0 ? Math.floor(remainingSubtotalsByRow / missingSubtotalsByRow.length) : 0;
  const subtotalsByRowRemainder = missingSubtotalsByRow.length > 0 ? remainingSubtotalsByRow % missingSubtotalsByRow.length : 0;

  const newMissingSubtotalsByColumn = missingSubtotalsByColumn.map(({ value, j }, index) => ({ value: value + subtotalsByColumnDelta + (index < subtotalsByColumnRemainder ? 1 : 0), j }));
  const newMissingSubtotalsByRow = missingSubtotalsByRow.map(({ value, i }, index) => ({ value: value + subtotalsByRowDelta + (index < subtotalsByRowRemainder ? 1 : 0), i }))

  const newSubtotalsByColumn = subTotalsByColumn.map((value, x) => newMissingSubtotalsByColumn.find(({ j }) => j === x)?.value ?? value);
  const newSubtotalsByRow = subTotalsByRow.map((value, y) => newMissingSubtotalsByRow.find(({ i }) => i === y)?.value ?? value);

  const newTable = table.map(row => row.map(value => value));
  
  for (let i = 0; i < newTable.length; i++) {
    for (let j = 0; j < newTable[0].length; j++) {
      const cell = newTable[i][j];
      if (cell > 0) continue;

      const column = newTable.map(row => row[j]);
      const row = newTable[i];
      let fillByColumn = Number.POSITIVE_INFINITY;
      let fillByRow = Number.POSITIVE_INFINITY;

      if (column.every((c, y) => c > 0 || y === i)) {
        fillByColumn = newSubtotalsByColumn[j] -  sum(column);
      }

      if (row.every((c, x) => c > 0 || x === j)) {
        fillByRow = newSubtotalsByRow[i] -  sum(row);
      }

      if (fillByColumn <= fillByRow && fillByColumn < Number.POSITIVE_INFINITY) {
        newTable[i][j] = fillByColumn;
        continue;
      }

      if (fillByRow < Number.POSITIVE_INFINITY) {
        newTable[i][j] = fillByRow;
        continue;
      }

      const remainingInRow = newSubtotalsByRow[i] - sum(row);
      const columSubtotalWithoutFilledCells = newSubtotalsByColumn[j] - sum(column);
      const totalOfRemainingColumSubtotalWithoutFilledCells = 
        sum(newSubtotalsByColumn.filter((_,x) => x >= j)) -
        newTable.reduce((prevTotal, currentRow) => prevTotal + currentRow.reduce((p,c,x) => x >= j ? p + c : p, 0), 0);

      newTable[i][j] = Math.floor(remainingInRow * columSubtotalWithoutFilledCells / totalOfRemainingColumSubtotalWithoutFilledCells);
    }
  }
 
  console.table(newTable);

  if (isTableNegative(newTable)) {
    throw "impossible split, negative values";
  }

  if (!checkSubTotals(newSubtotalsByColumn, subTotalsByColumn) || !checkSubTotals(newSubtotalsByRow, subTotalsByRow)) {
    throw "impossible split, some user-defined subtotals have changed";
  }

  if (!checkCells(newTable, table)) {
    throw "impossible split, some user-defined cells have changed";
  }

  if (!checkSubTotalConsistency(newTable, newSubtotalsByColumn, newSubtotalsByRow)) {
    throw "impossible split, some subtotals values are inconsistent";
  }

  return {
    newTable,
    newSubtotalsByColumn,
    newSubtotalsByRow,
  };
}