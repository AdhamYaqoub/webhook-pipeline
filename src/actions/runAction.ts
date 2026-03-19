import transform from "./transform";
import filter from "./filter";
import enrich from "./enrich";

export const runAction = async (actionType: string, payload: any) => {
  switch (actionType) {
    case "transform":
      return transform(payload);
    case "filter":
      return filter(payload);
    case "enrich":
      return enrich(payload);
    default:
      throw new Error("Unknown action type");
  }
};