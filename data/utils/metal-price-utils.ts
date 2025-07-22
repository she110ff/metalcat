import { MetalPriceData } from "./types";

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const groupMetalData = (data: MetalPriceData[]): MetalPriceData[][] => {
  return chunkArray(data, 2);
};
