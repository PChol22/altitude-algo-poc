import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import './App.css';
import { equals, add, split } from './split';

const initialTable = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const initialTotalsRow = [0, 0, 0, 0];
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
    try {
      const { newTable, newSubtotalsByColumn, newSubtotalsByRow } = split(table, totalsRow, totalsCol, total);
      setTable(newTable);
      setTotalsRow(newSubtotalsByColumn);
      setTotalsCol(newSubtotalsByRow);
    } catch (e) {
      console.error(e);
      alert("Impossible Split (or Algo Failed?)");
    }
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
      {consistency ? <Typography color="green" marginY={2}>CONSISTENT ✅</Typography> : <Typography marginY={2} color="red">NOT CONSISTENT ❌</Typography>}
      <Box display="flex" flexDirection="row" gap={1} margin={1}>
        <Button onClick={splitTable} variant="contained">Split</Button>
        <Button variant='outlined' onClick={() => {setTable([...table, new Array(table[0].length).fill(0)]); setTotalsCol([...totalsCol, 0])}}>Add row</Button>
        <Button variant='outlined' onClick={() => {setTable(table.filter((_,i) => i < table.length - 1)); setTotalsCol(totalsCol.filter((_,i) => i < table.length - 1))}} disabled={table.length < 2}>Remove row</Button>
        <Button variant='outlined' onClick={() => {setTable(table.map(row => [...row, 0])); setTotalsRow([...totalsRow, 0])}}>Add column</Button>
        <Button variant='outlined' onClick={() => {setTable(table.map(row => row.filter((_, j) => j < table[0].length - 1))); setTotalsRow(totalsRow.filter((_,j) => j < table[0].length - 1))}} disabled={table[0].length < 2}>Remove column</Button>
        <Button variant='outlined' onClick={() => {setTable(new Array(table.length).fill(new Array(table[0].length).fill(0)))}}>Clean cells</Button>
        <Button variant='outlined' onClick={() => {setTotalsCol(new Array(table.length).fill(0)); setTotalsRow(new Array(table[0].length).fill(0))}}>Clean subtotals</Button>
      </Box>
    </Box>
  );
}

export default App
   