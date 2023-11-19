import { fetchAccount, PublicKey, Field, UInt64, Int64, UInt32 } from "o1js";

import type { ZkappWorkerRequest, ZkappWorkerReponse, WorkerFunctions, WorkerFunctionReturn } from "./zkappWorker";
import { WorkerFunctionArgs } from "./zkappWorker";

export default class ZkappWorkerClient {
  // ---------------------------------------------------------------------------------------

  setActiveInstanceToBerkeley() {
    return this._call("setActiveInstanceToBerkeley", {});
  }

  loadContract() {
    return this._call("loadContract", {});
  }

  compileContract() {
    return this._call("compileContract", {});
  }

  fetchAccount({ publicKey }: { publicKey: PublicKey }): ReturnType<typeof fetchAccount> {
    const result = this._call("fetchAccount", {
      publicKey58: publicKey.toBase58(),
    });
    return result as ReturnType<typeof fetchAccount>;
  }

  initZkappInstance(publicKey: PublicKey) {
    return this._call("initZkappInstance", {
      publicKey58: publicKey.toBase58(),
    });
  }

  async getCounter(): Promise<Field> {
    const result = await this._call("getCounter", {});
    return UInt64.fromJSON(result);
  }
  async getMapRoot(): Promise<Field> {
    const result = await this._call("getPositionsMapRoot", {});
    return Field.fromJSON(result);
  }
  async getPnl(): Promise<Int64> {
    const result = await this._call("getPnl", {});
    if (result === 0) {
      return Int64.zero;
    }
    return Int64.fromJSON(result);
  }
  async getNonce(): Promise<UInt32> {
    const result = await this._call("getNonce", {});
    return UInt32.fromJSON(result);
  }
  async runInitState(args: WorkerFunctionArgs<"runInitState">[0]) {
    return await this._call("runInitState", args);
  }
  async createPositionTransaction(
    args: WorkerFunctionArgs<"createPositionTransaction">[0],
  ): Promise<WorkerFunctionReturn<"createPositionTransaction">> {
    return await this._call("createPositionTransaction", args).then(async ({ positionKey, position }) => ({
      positionKey,
      position: position,
    }));
  }

  async closePositionTransaction(args: WorkerFunctionArgs<"closePositionTransaction">[0]) {
    return await this._call("closePositionTransaction", args);
  }

  proveUpdateTransaction() {
    return this._call("proveUpdateTransaction", {});
  }

  async getTransactionJSON() {
    const result = await this._call("getTransactionJSON", {});
    return result;
  }

  // ---------------------------------------------------------------------------------------

  worker: Worker;

  promises: {
    [id: number]: { resolve: (res: any) => void; reject: (err: any) => void };
  };

  nextId: number;

  constructor() {
    this.worker = new Worker(new URL("./zkappWorker.ts", import.meta.url));
    this.promises = {};
    this.nextId = 0;

    this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  _call(fn: WorkerFunctions, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };

      const message: ZkappWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }
}
