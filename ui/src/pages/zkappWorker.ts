import { Character, fetchAccount, Field, Mina, PublicKey, UInt64 } from "o1js";
import type { Perpetual, Position } from "../../../contracts/src/Perpetual";
import { serializePosition } from "@/services/localStorageService/utils";
import { getMerkleMapFromMap, SerializableMap, SerializablePosition } from "@/services/localStorageService";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

const state = {
  Perp: null as null | typeof Perpetual,
  Position: null as null | typeof Position,
  zkapp: null as null | Perpetual,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.Network("https://proxy.berkeley.minaexplorer.com/graphql");
    console.log("Berkeley Instance Created");
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { Perpetual, Position } = await import("../../../contracts/build/src/Perpetual.js");
    //@ts-ignore
    state.Perp = Perpetual;
    state.Position = Position;
  },
  compileContract: async (args: {}) => {
    await state.Perp!.compile({});
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Perp!(publicKey);
  },
  // getNum: async (args: {}) => {
  //     const currentNum = await state.zkapp!.num.get();
  //     return JSON.stringify(currentNum.toJSON());
  // },
  getPositionsMap: async () => {
    const currentNum = state.zkapp!.positionsMap.get();
    return JSON.stringify(currentNum.toJSON());
  },
  getCounter: async () => {
    return state.zkapp!.counter.get().toJSON();
  },
  getPositionsMapRoot: async () => {
    return state.zkapp!.positionsMap.get().toJSON();
  },
  getPnl: async (args: {}) => {
    try {
      return state.zkapp!.pnl.get().toJSON();
    } catch (e) {
      return 0;
    }
  },
  getNonce: async (args: {}) => {
    return state.zkapp!.account.nonce.get().toJSON();
  },

  runInitState: async ({ map }: { map: SerializableMap }) => {
    const merkleMap = await getMerkleMapFromMap(map);
    state.transaction = await Mina.transaction(async () => {
      state.zkapp!.initState(merkleMap.getRoot());
    });
  },
  createPositionTransaction: async ({
    leverage,
    type,
    collateral,
    openPrice,
    positionMap,
  }: {
    type: "s" | "l";
    collateral: number;
    leverage: number;
    openPrice: number;
    positionMap: SerializableMap;
  }): Promise<{ positionKey: string; position: SerializablePosition }> => {
    const merkleMap = await getMerkleMapFromMap(positionMap);
    const positionKey = await functions.getCounter().then(Field);
    const salt = Field.random();
    console.log(`Creating position`);
    const position = new state.Position!({
      salt: salt,
      type: Character.fromString(type), // long
      collateral: UInt64.from(collateral), // 10$
      leverage: UInt64.from(leverage), // 2x
      openPrice: UInt64.from(openPrice), // 30k$
    });
    console.log("Setting position to the map");
    merkleMap.set(positionKey, position.hash());

    state.transaction = await Mina.transaction(async () => {
      state.zkapp!.openPosition(merkleMap.getWitness(positionKey), position);
    });
    console.log(`Transaction created`);
    return { positionKey: positionKey.toString(), position: serializePosition(position) };
  },

  closePositionTransaction: async ({
    closePrice,
    positionKey,
    map,
  }: {
    positionKey: string;
    map: SerializableMap;
    closePrice: string;
  }) => {
    const merkleMap = await getMerkleMapFromMap(map);
    const positionKeyField = Field(positionKey);
    const serializablePosition = map.find(el => el.key === positionKey)?.position;
    if (!serializablePosition) throw new Error("Position not found");

    const position = new state.Position!({
      leverage: UInt64.from(serializablePosition.leverage),
      openPrice: UInt64.from(serializablePosition.openPrice),
      salt: Field(serializablePosition.salt),
      type: Character.fromString(serializablePosition.type),
      collateral: UInt64.from(serializablePosition.collateral),
    });
    const closePriceField = UInt64.from(closePrice);
    merkleMap.set(positionKeyField, position.closeHash(closePriceField));

    state.transaction = await Mina.transaction(async () => {
      state.zkapp!.closePosition(merkleMap.getWitness(positionKeyField), positionKeyField, position, closePriceField);
    });
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;
export type WorkerFunctionArgs<T extends WorkerFunctions> = Parameters<(typeof functions)[T]>;
export type WorkerFunctionReturn<T extends WorkerFunctions> = ReturnType<(typeof functions)[T]>;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener("message", async (event: MessageEvent<ZkappWorkerRequest>) => {
    if (functions[event.data.fn]) {
      const returnData = await functions[event.data.fn](event.data.args);
      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  });
}

console.log("Web Worker Successfully Initialized.");
