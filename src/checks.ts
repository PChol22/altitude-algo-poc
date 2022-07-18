import { Table, TableLine } from "./types";
import { sum } from "./utils";

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

export const allChecks = (
  newTable: Table,
  table: Table,
  newSubtotalsByColumn: TableLine,
  subTotalsByColumn: TableLine,
  newSubtotalsByRow: TableLine,
  subTotalsByRow: TableLine,
  total: number
): void => {
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
};
