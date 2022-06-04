import { ethers } from "hardhat";

export const parse = (i: string) => {
  return ethers.utils.parseEther(i);
};
