export async function filesHaveMatchingContents(first: Blob, second: Blob) {
  if (first.size !== second.size) {
    return false;
  }

  const [firstBytes, secondBytes] = await Promise.all([
    first.arrayBuffer(),
    second.arrayBuffer(),
  ]);
  const firstView = new Uint8Array(firstBytes);
  const secondView = new Uint8Array(secondBytes);

  return firstView.every((byte, index) => byte === secondView[index]);
}
