import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Button, Tab, Table } from "@mui/material";
import TableBody from "@mui/material/TableBody";
import { FC, useState } from "react";
import { SerializableMap } from "@/services/localStorageService";
import { Tabs } from "@mui/base";
import { SCALING_FACTOR } from "@/constants";

export const PositionsTable: FC<{
  positions: SerializableMap;
  isClosedTable: boolean;
  onClosePosition: (idx: string) => void;
}> = ({ positions, isClosedTable, onClosePosition }) => {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Index</TableCell>
            <TableCell align="right">Type</TableCell>
            <TableCell align="right">Collateral</TableCell>
            <TableCell align="right">Open price</TableCell>
            <TableCell align="right">Leverage</TableCell>
            {isClosedTable ? (
              <TableCell align="right">ClosePrice</TableCell>
            ) : (
              <TableCell align="right">Actions</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {positions.map(({ position, key }) => (
            <TableRow key={key} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
              <TableCell component="th" scope="row">
                {key}
              </TableCell>
              <TableCell align="right">{position.type}</TableCell>
              <TableCell align="right">{position.collateral}</TableCell>
              <TableCell align="right">{Number(position.openPrice) / SCALING_FACTOR}</TableCell>
              <TableCell align="right">{Number(position.leverage) / SCALING_FACTOR}</TableCell>
              {isClosedTable ? (
                <TableCell align="right">{position.closePrice}</TableCell>
              ) : (
                <TableCell align="right">
                  <Button onClick={() => onClosePosition(key)}>Close Position</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}
export const PositionsPanel: FC<{ positions: SerializableMap; onClosePosition: (positionIdx: string) => void }> = ({
  positions,
  onClosePosition,
}) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  console.log(currentTab);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log(newValue);
    setCurrentTab(newValue);
  };
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={currentTab} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Active" onClick={() => handleChange(undefined, 0)} {...a11yProps(0)} />
          <Tab label="Closed" onClick={() => handleChange(undefined, 1)} {...a11yProps(1)} />
        </Tabs>
      </Box>
      {currentTab === 0 && (
        <PositionsTable
          positions={positions.filter(el => el.position.closePrice === undefined)}
          isClosedTable={false}
          onClosePosition={idx => onClosePosition(idx)}
        />
      )}
      {currentTab === 1 && (
        <PositionsTable
          onClosePosition={idx => onClosePosition(idx)}
          positions={positions.filter(el => el.position.closePrice !== undefined)}
          isClosedTable={true}
        />
      )}
    </Box>
  );
};
