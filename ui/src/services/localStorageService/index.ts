import { Character, Field, MerkleMap, UInt64 } from "o1js";
import { Position } from "../../../../contracts/src/Perpetual";

const positionsMapPointer = "zkApp-positionsMapPointer";
export type SerializablePosition = {
  salt: string;
  type: string;
  collateral: string;
  leverage: string;
  openPrice: string;
  closePrice?: string;
};

export type SerializableMap = Array<{ key: string; position: SerializablePosition }>;
export type PositionsMap = Array<{ key: string; position: Position }>;

const getMap = (): SerializableMap => {
  return JSON.parse(localStorage.getItem(positionsMapPointer) || JSON.stringify([])) as SerializableMap;
};

const setNewPositionToMap = ({ leverage, type, collateral, openPrice, salt }: SerializablePosition, key: string) => {
  const oldMap = getMap();
  const newMap = [
    ...oldMap,
    {
      key,
      position: {
        salt: salt.toString(),
        type: type.toString(),
        openPrice: openPrice.toString(),
        leverage: leverage.toString(),
        collateral: collateral.toString(),
      },
    },
  ];
  localStorage.setItem(positionsMapPointer, JSON.stringify(newMap));
};
const closePosition = (closePrice: string, positionKey: string) => {
  const oldMap = getMap();
  const newMap = oldMap.map(el => {
    if (el.key === positionKey) {
      return {
        ...el,
        position: {
          ...el.position,
          closePrice,
        },
      };
    }
    return el;
  });
  localStorage.setItem(positionsMapPointer, JSON.stringify(newMap));
};
export class LocalStorageService {
  static getMap = () => {
    return getMap();
  };
  static setNewPositionToMap = setNewPositionToMap;
  static closePosition = closePosition;
}
export const getMerkleMapFromMap = async (map: SerializableMap) => {
  const merkleMap = new MerkleMap();
  const { Position } = await import("../../../../contracts/build/src/Perpetual.js");
  map.forEach(({ key, position }) => {
    merkleMap.set(
      Field(key),
      new Position({
        leverage: UInt64.from(position.leverage),
        type: Character.fromString(position.type),
        collateral: UInt64.from(position.collateral),
        openPrice: UInt64.from(position.openPrice),
        salt: Field(position.salt),
      }).hash(),
    );
  });
  return merkleMap;
};
