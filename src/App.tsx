import { Box, Button, Grid, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import './App.css';
import { equals, add, split } from './split';

const initialTable = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
const initialTotalsRow = [0, 0, 0, 0, 0];
const initialTotalsCol = [0, 0, 0];
const initialTotal = 100000;

function isNumeric(str: string) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(+str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function App() {

  const [table, setTable] = useState(initialTable);
  const [totalsRow, setTotalsRow] = useState(initialTotalsRow);
  const [totalsCol, setTotalsCol] = useState(initialTotalsCol);
  const [total, setTotal] = useState(initialTotal);
  const [consistency, setConsistency] = useState(true);

  const updateTable = (i: number, j: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTable = table.map((row, y) => row.map((cell, x) => y === i && x === j ? +value : cell));
    setTable(newTable);
  };

  const updateTotalsRow = (j: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTotalsRow = totalsRow.map((cell, x) => x === j ? +value : cell);
    setTotalsRow(newTotalsRow);
  };

  const updateTotalsCol = (i: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTotalsCol = totalsCol.map((cell, y) => y === i ? +value : cell);
    setTotalsCol(newTotalsCol);
  };
  
  const updateTotal = (value: string) => {
    if (!isNumeric(value)) return;
    setTotal(+value);
  }

  const checkConsistency = () => {
    const expectedTotalsCol = table.map(row => row.reduce((prv, cur) => prv + cur), 0);
    const expectedTotalsRow = table.reduce((prv, cur) => add(prv, cur), new Array(table[0].length).fill(0));
    const expectedTotal1 = totalsRow.reduce((p,c) => p+c, 0);
    const expectedTotal2 = totalsCol.reduce((p,c) => p+c, 0);
    setConsistency(equals(expectedTotalsCol, totalsCol) &&
                   equals(expectedTotalsRow, totalsRow) &&
                          expectedTotal1 === total &&
                          expectedTotal2 === total);
  }

  useEffect(checkConsistency, [table, totalsCol, totalsRow, total]);

  const splitTable = () => {
    const { newTable, newSubtotalsByColumn, newSubtotalsByRow } = split(table, totalsRow, totalsCol, total);
    setTable(newTable);
    setTotalsRow(newSubtotalsByColumn);
    setTotalsCol(newSubtotalsByRow);
  }

  return (
    <Box>
      <Grid container>
        {table.map((row, i) => (
          <Grid container item key={i}>
            {
              row.map((_, j) => <Grid item key={j}><TextField value={table[i][j]} onChange={(e) => updateTable(i, j, e.target.value)}></TextField></Grid>)
            }
            <Grid item marginLeft={1}><TextField value={totalsCol[i]} onChange={(e) => updateTotalsCol(i, e.target.value)}></TextField></Grid>
          </Grid>
        ))}
        <Grid container item marginTop={1}>
          {
            totalsRow.map((_, j) => <Grid item key={j}><TextField value={totalsRow[j]} onChange={(e) => updateTotalsRow(j, e.target.value)}></TextField></Grid>)
          }
          <Grid item marginLeft={1}><TextField value={total} onChange={(e) => updateTotal(e.target.value)}></TextField></Grid>
        </Grid>
      </Grid>
      <Button onClick={splitTable} variant="outlined">Split</Button>
      {consistency ? <h3>✅</h3> : <h3>❌</h3>}
    </Box>
  );
}

export default App
   