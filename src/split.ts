import { allChecks } from "./checks";
import { Table, TableLine } from "./types";

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

  allChecks(
    newTable,
    table,
    newSubtotalsByColumn,
    subTotalsByColumn,
    newSubtotalsByRow,
    subTotalsByRow,
    total
  );

  return {
    newTable,
    newSubtotalsByColumn,
    newSubtotalsByRow,
  };
};
