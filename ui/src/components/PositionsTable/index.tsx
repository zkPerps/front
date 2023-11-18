import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Tab, Table } from "@mui/material";
import TableBody from "@mui/material/TableBody";
import { FC, useState } from "react";
import { SerializableMap } from "@/services/localStorageService";
import { Tabs } from "@mui/base";

export const PositionsTable: FC<{ positions: SerializableMap; isClosedTable: boolean }> = ({
  positions,
  isClosedTable,
}) => {
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
            {isClosedTable && <TableCell align="right">ClosePrice</TableCell>}
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
              <TableCell align="right">{position.openPrice}</TableCell>
              <TableCell align="right">{position.leverage}</TableCell>
              {isClosedTable && <TableCell align="right">{position.closePrice}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export const PositionsPanel: FC<{ positions: SerializableMap }> = ({ positions }) => {
  const [currentTab, setCurrentTab] = useState<"active" | "closed">("active");
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value as any)} aria-label="basic tabs example">
          <Tab label="Active" id={"active"} />
          <Tab label="Item Two" id={"closed"} />
        </Tabs>
      </Box>
      {currentTab === "active" && (
        <PositionsTable
          positions={positions.filter(el => el.position.closePrice === undefined)}
          isClosedTable={false}
        />
      )}
      {currentTab === "closed" && (
        <PositionsTable positions={positions.filter(el => el.position.closePrice !== undefined)} isClosedTable={true} />
      )}
    </Box>
  );
};
