const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deadline hợp lệ tính từ hôm nay, KHÔNG hardcode ngày.
 *
 * Server đã kiểm deadline ≥ hôm nay + thời gian sản xuất, nên một ngày cố
 * định trong test sẽ tự đỏ khi thời gian thật vượt qua nó.
 */
export const futureDeadline = (daysFromNow = 30): string =>
  `${new Date(Date.now() + daysFromNow * DAY_MS).toISOString().slice(0, 10)}T00:00:00.000Z`;
