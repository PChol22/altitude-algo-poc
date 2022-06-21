import { TableCell, tableHeadClasses } from "@mui/material";

export type TableLine = number[];
export type Table = number[][];
export type TableCell = { i: number, j: number, value?: number, fixed?: boolean };
export type FlatTable = TableCell[];
export type FixedSubTotal = {
  subTotal: number,
  i: number,
  j: number,
  cells: TableCell[]
};
export type Threshold = {
  line: FixedSubTotal,
  delta: number,
  deltaRemainder: number,
};
export type TotalThreshold = {
  delta: number,
  deltaRemainder: number,
};


export const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const equals = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
const positiveModulo = (a: number, b: number) => ((a % b) + b) % b;

// Returns flattened table (i,j,value)[]
const getFlatTable = (table: Table): FlatTable =>
  table
    .flatMap((row, i) => row.flatMap((value, j) => ({ value, i, j })));

// Returns table cells that are editable by the algorithm
const getEditableCells = (flatTable: FlatTable): TableCell[] =>
  flatTable.filter(({ value }) => value === 0);

// Is a cell part of a cells set
const cellsIncludeCell = (cells: TableCell[], cell: TableCell): boolean =>
    cells.filter(({ i, j }) => i === cell.i && j === cell.j).length > 0;

// Returns subtotals fixed by the user, with info on their location (Column : i = -1, Line : j = -1)
// Each subtotal line has cells that belong to it, each cell know its value and status (fixed or free)
const getLinesFixedBySubTotal = (flatTable: FlatTable, subTotalsByLine: TableLine, editableCells: TableCell[], column: boolean): FixedSubTotal[] =>
  subTotalsByLine.map((subTotal, index) => ({
    subTotal,
    i: column ? -1 : index,
    j: column ? index : -1,
    cells: flatTable
      .filter(cell => (column && cell.j === index) || (!column && cell.i === index))
      .map(cell => ({ ...cell, fixed: !cellsIncludeCell(editableCells, cell) }))
  })).filter(({ subTotal }) => subTotal > 0);
  
// Updates subtotals that cannot be changed anymore and their info (cells value and status)
const getUpdatedLinesFixedBySubTotals = (linesFixedBySubtotals: FixedSubTotal[], flatTable: FlatTable, editableCells: TableCell[], threshold: Threshold): FixedSubTotal[] =>
  linesFixedBySubtotals.map(lineFixedBySubtotal => ({
    ...lineFixedBySubtotal,
    cells: flatTable
      .filter(cell => lineFixedBySubtotal.i === -1 ? (lineFixedBySubtotal.j === cell.j) : (lineFixedBySubtotal.i === cell.i))
      .map(cell => ({ ...cell, fixed: !cellsIncludeCell(editableCells, cell) }))
  })).filter(line => line.i !== threshold.line.i || line.j !== threshold.line.j);

// Get free cells from the cells of a subtotal line
const getLineFreeCells = (line: FixedSubTotal): TableCell[] =>
  line.cells.filter(cell => cell.fixed === false);

// Compute updated subtotal of a subtotal line (after cells values have changed)
const computeLineSubtotal = (line: FixedSubTotal): number => line.cells.reduce((p,c) => p + (c.value ?? 0), 0);

// Get next first subtotal line who's subtotal will be reached if we increase free cells value by 'delta'
const getNextSubTotalReached = (linesFixedBySubtotals: FixedSubTotal[]): Threshold =>
  linesFixedBySubtotals
    .map(line => ({
        line,
        delta: getLineFreeCells(line).length > 0 ? (line.subTotal - computeLineSubtotal(line)) / getLineFreeCells(line).length : 0,
        deltaRemainder: getLineFreeCells(line).length > 0 ? (line.subTotal - computeLineSubtotal(line)) % getLineFreeCells(line).length : 0,
    }))
    // length is > 0 by definition (while loop)
    .sort((threshold1, threshold2) => threshold1.delta - threshold2.delta)[0];

// Get table cells that have become fixed after a subtotal has been reached
// length is > 0 by definition (threshold is a member of linesFixedBySubtotals)
const getNewFixedTableCells = (linesFixedBySubtotals: FixedSubTotal[], threshold: Threshold): TableCell[] =>
  linesFixedBySubtotals.filter((line) => line.i === threshold.line.i && line.j === threshold.line.j)[0].cells;

// Get the updated value of the table (Whole number only)
const getUpdatedTable = (oldTable: Table, editableCells: TableCell[], threshold: Threshold | TotalThreshold, subTotalsByColumn: TableLine, subTotalsByRow: TableLine, flatTable: FlatTable, originalFlatTable: FlatTable): Table => {
   let cellsToUpdate = 'line' in threshold ? threshold.line.cells.filter(cell => !cell.fixed).map(cell => ({
    ...cell,
    index: threshold.line.i === -1 ? cell.j : cell.i,
  })) : editableCells;

  let remainderBuffer = 0;
  let totalUpdatedFirst = 0;

  const initalCellsToUpdateNb = cellsToUpdate.length;

  if ('line' in threshold) {
    const cellsToUpdateFirst = cellsToUpdate.filter(({ i }) => subTotalsByRow[i] > 0);
    console.log(cellsToUpdateFirst);
    let availableAmount = subTotalsByColumn[threshold.line.j] - flatTable.reduce((p,c) => c.j === threshold.line.j ? p + (c.value ?? 0) : p, 0)
    for (let cell of cellsToUpdateFirst) {
      const rowTemporaryTotal = flatTable.reduce((p,c) => c.i === cell.i ? p + (c.value ?? 0) : p, 0);
      const delta = subTotalsByRow[cell.i] - rowTemporaryTotal > availableAmount ? availableAmount : subTotalsByRow[cell.i] - rowTemporaryTotal;
      availableAmount -= delta;
      totalUpdatedFirst += delta;
      oldTable = oldTable.map((row, i) => row.map((value, j) => cell.i === i && cell.j === j ? value + delta : value));
    }
    cellsToUpdate = cellsToUpdate.filter(({i,j}) => cellsToUpdateFirst.filter((cell) => cell.i === i && cell.j == j).length === 0);
  }

  const delta = cellsToUpdate.length > 0 ? (threshold.delta * initalCellsToUpdateNb - totalUpdatedFirst) / cellsToUpdate.length : 0;
  const deltaRemainder = cellsToUpdate.length > 0 ? (threshold.delta * initalCellsToUpdateNb - totalUpdatedFirst) % cellsToUpdate.length : 0;
  
  return oldTable.map((row, y) => row.map((cell, x) => {
    const tableCell = { i:y, j:x };
    if (!cellsIncludeCell(cellsToUpdate, tableCell)) return cell;

    const result = cell + Math.floor(delta);
    //if ('line' in threshold && !cellsIncludeCell(threshold.line.cells, tableCell)) return cell;
    remainderBuffer += 1;
    return (remainderBuffer <= deltaRemainder ? result + 1 : result);
  }));
};

// Update table cells that can still be edited by the algorithm
const getUpdatedEditableCells = (editableCells: TableCell[], newFixedTableCells: TableCell[]): TableCell[] =>
  editableCells.filter((cell) => !cellsIncludeCell(newFixedTableCells, cell));

const isTableNegative = (table: Table): boolean =>
getFlatTable(table).some(({ value }) => value === undefined || value < 0);

const checkSubTotals = (subtotalLine: TableLine, originalSubTotalLine: TableLine): boolean => 
    originalSubTotalLine.every((value, index) => value === 0 || subtotalLine[index] === value);
  
export const split = (table: Table, subTotalsByColumn: TableLine, subTotalsByRow: TableLine, total: number) => {
  let tableCopy = table.map(row => row.map(cell => cell));
  let flatTable = getFlatTable(table);
  const originalFlatTable = getFlatTable(tableCopy);
  let editableCells = getEditableCells(flatTable);

  let linesFixedBySubtotals = [
    ...getLinesFixedBySubTotal(flatTable, subTotalsByColumn, editableCells, true),
    ...getLinesFixedBySubTotal(flatTable, subTotalsByRow, editableCells, false),
  ];

  // Theoretically ends (array length is strictly decreasing)
  while (linesFixedBySubtotals.length > 0) {
    
    const nextThreshold = getNextSubTotalReached(linesFixedBySubtotals);

    // TODO : Check if really necessary ?
    if (nextThreshold.delta < 0) throw { msg: "Impossible split" };

    tableCopy = getUpdatedTable(tableCopy, editableCells, nextThreshold, subTotalsByColumn, subTotalsByRow, flatTable, originalFlatTable);

    const newFixedTableCells = getNewFixedTableCells(linesFixedBySubtotals, nextThreshold);

    flatTable = getFlatTable(tableCopy);
    editableCells = getUpdatedEditableCells(editableCells, newFixedTableCells);

    linesFixedBySubtotals = getUpdatedLinesFixedBySubTotals(linesFixedBySubtotals, flatTable, editableCells, nextThreshold);

  }

  // After all subtotal conditions have been verified, we either increase or decrease the last free cells to reach global total
  const newTotal = flatTable.reduce((p,c) => p + (c.value ?? 0), 0);
  
  if (editableCells.length > 0) {
    const totalThreshold = {
        delta: (total - newTotal) / editableCells.length,
        deltaRemainder: positiveModulo(total - newTotal, editableCells.length),
    };
    tableCopy = getUpdatedTable(tableCopy, editableCells, totalThreshold, subTotalsByColumn, subTotalsByRow, flatTable, originalFlatTable);
  } else if (newTotal != total) {
    //throw { msg: "Impossible split" };
  }

  if (isTableNegative(tableCopy)) {
    //throw { msg: "Impossible split" };
  }

  const newSubtotalsByColumn = tableCopy.reduce((prv, cur) => add(prv, cur), new Array(tableCopy[0].length).fill(0));
  const newSubtotalsByRow = tableCopy.map(row => row.reduce((prv, cur) => prv + cur), 0);

  if (!checkSubTotals(newSubtotalsByColumn, subTotalsByColumn) || !checkSubTotals(newSubtotalsByRow, subTotalsByRow)) {
      //throw { msg: "Impossible split" };
  }

  return {
    newTable: tableCopy,
    newSubtotalsByColumn,
    newSubtotalsByRow,
  };
}
