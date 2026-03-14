export const truncateAddress = (address: string, prefixLen = 6, suffixLen = 4): string => {
  if (!address || address.length <= prefixLen + suffixLen + 3) {
    return address;
  }
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
};
