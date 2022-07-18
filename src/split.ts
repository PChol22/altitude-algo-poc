export type TableLine = number[];
export type Table = number[][];

export const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const equals = (a: number[], b: number[]) =>
  a.every((v, i) => v === b[i]);
export const sum = (a: number[]) => a.reduce((p, c) => p + c, 0);
export const valueSum = (a: { value: number }[]) =>
  a.reduce((p, c) => p + c.value, 0);

const isTableNegative = (table: Table): boolean =>
  table.some((row) => row.some((value) => value < 0));

const checkSubTotals = (
  subtotalLine: TableLine,
  originalSubTotalLine: TableLine
): boolean =>
  originalSubTotalLine.every(
    (value, index) => value === 0 || subtotalLine[index] === value
  );

const checkCells = (newTable: Table, oldTable: Table): boolean =>
  oldTable.every((row, i) =>
    row.every((value, j) => value === 0 || value === newTable[i][j])
  );

const checkSubTotalConsistency = (
  newTable: Table,
  subTotalsByColumn: TableLine,
  subTotalsByRow: TableLine,
  total: number
): boolean =>
  subTotalsByRow.every((subtotal, i) => sum(newTable[i]) === subtotal) &&
  subTotalsByColumn.every(
    (subtotal, j) => sum(newTable.map((row) => row[j])) === subtotal
  ) &&
  sum(subTotalsByColumn) === total &&
  sum(subTotalsByRow) === total;

export const split = (
  table: Table,
  subTotalsByColumn: TableLine,
  subTotalsByRow: TableLine,
  total: number
) => {
  const newTable = table;
  const newSubtotalsByColumn = subTotalsByColumn;
  const newSubtotalsByRow = subTotalsByRow;

  console.table(newTable);

  if (isTableNegative(newTable)) {
    throw "impossible split, negative values";
  }

  if (
    !checkSubTotals(newSubtotalsByColumn, subTotalsByColumn) ||
    !checkSubTotals(newSubtotalsByRow, subTotalsByRow)
  ) {
    throw "impossible split, some user-defined subtotals have changed";
  }

  if (!checkCells(newTable, table)) {
    throw "impossible split, some user-defined cells have changed";
  }

  if (
    !checkSubTotalConsistency(
      newTable,
      newSubtotalsByColumn,
      newSubtotalsByRow,
      total
    )
  ) {
    throw "impossible split, some subtotals values are inconsistent";
  }

  return {
    newTable,
    newSubtotalsByColumn,
    newSubtotalsByRow,
  };
};
