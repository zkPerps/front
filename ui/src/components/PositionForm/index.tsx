import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, Slider, Typography } from "@mui/material";
import { FC, useState } from "react";

export const FormDialog: FC<{
  onSubmit: (args: { collateral: string; leverage: number; positionType: "s" | "l" }) => void;
}> = ({ onSubmit }) => {
  const [open, setOpen] = React.useState(false);
  const [leverage, setSliderLeverage] = React.useState<number>(1);
  const [collateral, setCollateral] = useState("10");
  const [positionType, setPositionType] = useState<"l" | "s">("l");
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSliderLeverage(newValue as number);
  };
  return (
    <React.Fragment>
      <Button
        color={"secondary"}
        sx={{
          mt: 3,
        }}
        variant="contained"
        onClick={handleClickOpen}
      >
        Open Position
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Open position form</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
            }}
          >
            <Button disabled={positionType === "l"} onClick={() => setPositionType("l")}>
              Long
            </Button>
            <Button disabled={positionType === "s"} onClick={() => setPositionType("s")}>
              Short
            </Button>
          </Box>
          <Typography>Collateral</Typography>
          <TextField
            autoFocus
            margin="dense"
            id="collateral"
            label="Collateral"
            fullWidth
            variant="standard"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setCollateral(event.target.value);
            }}
          />
          <Typography>Leverage {leverage}</Typography>
          <Slider aria-label="Volume" value={leverage} onChange={handleSliderChange} max={100} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              handleClose();
              onSubmit({
                collateral,
                leverage,
                positionType,
              });
            }}
          >
            Open Position
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};
