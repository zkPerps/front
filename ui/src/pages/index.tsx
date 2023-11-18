import { useEffect, useState } from "react";
import "./zkappWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field, UInt64, Int64 } from "o1js";
import GradientBG from "../components/GradientBG.js";
import styles from "../styles/Home.module.css";
import { LocalStorageService, SerializableMap } from "@/services/localStorageService";
import BN from "bn.js";
import { Button } from "@mui/material";
import { PositionsPanel, PositionsTable } from "@/components/PositionsTable";

let transactionFee = 0.1;

export default function Home() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    currentPnl: null as null | Int64,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });
  const [positions, setPositions] = useState<SerializableMap>([]);
  const [displayText, setDisplayText] = useState("");
  const [transactionlink, setTransactionLink] = useState("");

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    async function timeout(seconds: number): Promise<void> {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, seconds * 1000);
      });
    }

    (async () => {
      if (!state.hasBeenSetup) {
        setPositions(LocalStorageService.getMap());
        setDisplayText("Loading web worker...");
        console.log("Loading web worker...");
        const zkappWorkerClient = new ZkappWorkerClient();
        await timeout(5);

        setDisplayText("Done loading web worker");
        console.log("Done loading web worker");

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log(`Using key:${publicKey.toBase58()}`);
        setDisplayText(`Using key:${publicKey.toBase58()}`);

        setDisplayText("Checking if fee payer account exists...");
        console.log("Checking if fee payer account exists...");

        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        console.log("Compiling zkApp...");
        setDisplayText("Compiling zkApp...");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");
        setDisplayText("zkApp compiled...");

        const zkappPublicKey = PublicKey.fromBase58("B62qouunvn8LEsZ4TR2Je7SuQMyV7UFWbjLFct5knaevBao52jSQ14n");

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("Getting zkApp state...");
        setDisplayText("Getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const currentNum = await zkappWorkerClient.getCounter();
        const currentPnl = await zkappWorkerClient.getPnl();
        console.log(`Current state in zkApp: ${currentNum.toString()}`);
        setDisplayText("");

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNum,
          currentPnl,
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          setDisplayText("Checking if fee payer account exists...");
          console.log("Checking if fee payer account exists...");
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Send a transaction

  const onOpenPosition = async () => {
    setState({ ...state, creatingTransaction: true });

    setDisplayText("Creating a transaction...");
    console.log("Creating a transaction...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    const { position, positionKey } = await state.zkappWorkerClient!.createPositionTransaction({
      openPrice: 100,
      type: "l",
      collateral: 100,
      leverage: 1,
      positionMap: LocalStorageService.getMap(),
    });
    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log("Requesting send transaction...");
    setDisplayText("Requesting send transaction...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    setDisplayText("Getting transaction JSON...");
    console.log("Getting transaction JSON...");
    console.log(transactionJSON);
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });
    LocalStorageService.setNewPositionToMap(position, positionKey);
    setPositions(LocalStorageService.getMap());
    const transactionLink = `https://berkeley.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
  };

  const onClosePosition = async ({ closePrice, positionKey }: { closePrice: string; positionKey: string }) => {
    setState({ ...state, creatingTransaction: true });
    setDisplayText("Creating a transaction...");
    console.log("Creating a transaction...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkappWorkerClient!.closePositionTransaction({
      map: LocalStorageService.getMap(),
      positionKey,
      closePrice,
    });

    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log("Requesting send transaction...");
    setDisplayText("Requesting send transaction...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    setDisplayText("Getting transaction JSON...");
    console.log("Getting transaction JSON...");
    console.log(transactionJSON);
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });
    LocalStorageService.closePosition(closePrice, positionKey);
    setPositions(LocalStorageService.getMap());
    const transactionLink = `https://berkeley.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
  };

  const onInitZkApp = async () => {
    console.log("Initializing zkApp...");
    setDisplayText("Initializing zkApp...");
    await state.zkappWorkerClient?.runInitState({
      map: LocalStorageService.getMap(),
    });
    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();
    console.log("Requesting send transaction...");
    setDisplayText("Requesting send transaction...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();
    setDisplayText("Getting transaction JSON...");
    console.log("Getting transaction JSON...");
    console.log(transactionJSON);
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });
    console.log("zkApp initialized");

    const transactionLink = `https://berkeley.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);
    setDisplayText("zkApp initialized...");
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentNum = async () => {
    console.log("Getting zkApp state...");
    setDisplayText("Getting zkApp state...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const currentNum = await state.zkappWorkerClient!.getCounter();
    const currentPnl = await state.zkappWorkerClient!.getPnl();
    setState({ ...state, currentNum, currentPnl });
    console.log(`Current state in zkApp: ${currentNum.toString()}`);
    setDisplayText("");
  };

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        Install Auro wallet here
      </a>
    );
    hasWallet = <div>Could not find a wallet. {auroLinkElem}</div>;
  }

  const stepDisplay = transactionlink ? (
    <a href={displayText} target="_blank" rel="noreferrer">
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div className={styles.start} style={{ fontWeight: "bold", fontSize: "1.5rem", paddingBottom: "5rem" }}>
      {stepDisplay}
      {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink = "https://faucet.minaprotocol.com/?address=" + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: "1rem" }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <div style={{ justifyContent: "center", alignItems: "center" }}>
        <div className={styles.center} style={{ padding: 0 }}>
          Current position number is: {state.currentNum!.toString()}
        </div>
        <div className={styles.center} style={{ padding: 0 }}>
          Current PnL is: {state.currentPnl!.toString()}
        </div>
        <button className={styles.card} onClick={onOpenPosition} disabled={state.creatingTransaction}>
          Send Transaction
        </button>
        <button className={styles.card} onClick={onRefreshCurrentNum}>
          Get Latest State
        </button>
      </div>
    );
  }

  let initContent;
  if (state.hasBeenSetup && state.accountExists) {
    initContent = (
      <div style={{ justifyContent: "center", alignItems: "center" }}>
        <div className={styles.center} style={{ padding: 0 }}>
          Zk App is not initialized.
        </div>
        <button className={styles.card} onClick={onInitZkApp} disabled={state.creatingTransaction}>
          Send Init transaction
        </button>
      </div>
    );
  }

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        {state.hasBeenSetup && state.accountExists && <PositionsPanel positions={positions} />}
        <div className={styles.center} style={{ padding: 0 }}>
          {setup}
          {accountDoesNotExist}
          {state.currentNum?.toString() === "0" ? initContent : <div>{mainContent}</div>}
        </div>
      </div>
    </GradientBG>
  );
}
