export enum IvaType {
  NORMAL = 0, // 16%
  EXENTO = 1, // 0%
  REDUCIDO = 2, // 8%
  LUJO = 3, // 24%
}

export const IVA_RATES: Record<IvaType, number> = {
  [IvaType.NORMAL]: 0.16,
  [IvaType.EXENTO]: 0.0,
  [IvaType.REDUCIDO]: 0.08,
  [IvaType.LUJO]: 0.24,
};
