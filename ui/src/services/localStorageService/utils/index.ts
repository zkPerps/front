import { SerializablePosition } from "@/services/localStorageService";
import { Character, Field, UInt64 } from "o1js";
import { Position } from "../../../../../contracts/src/Perpetual";

export const serializePosition = (position: Position): SerializablePosition => {
  return {
    type: position.type.toString(),
    collateral: position.collateral.toString(),
    leverage: position.leverage.toString(),
    openPrice: position.openPrice.toString(),
    salt: position.salt.toString(),
  };
};

export const deserializePosition = async (position: SerializablePosition): Promise<any> => {
  const { Position } = await import("../../../../../contracts/build/src/Perpetual.js");

  return new Position({
    salt: Field(position.salt),
    type: Character.fromString(position.type),
    collateral: UInt64.from(position.collateral),
    leverage: UInt64.from(position.leverage),
    openPrice: UInt64.from(position.openPrice),
  });
};
