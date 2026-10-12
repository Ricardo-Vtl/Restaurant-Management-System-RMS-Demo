export function naturalSort(a: { number: string }, b: { number: string }) {
  const aNum = Number(a.number);
  const bNum = Number(b.number);
  const aIsNum = !Number.isNaN(aNum);
  const bIsNum = !Number.isNaN(bNum);
  if (aIsNum && bIsNum) return aNum - bNum;
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  return a.number.localeCompare(b.number, undefined, { numeric: true });
}
