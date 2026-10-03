export function metricPointLabel(status: string, score: number): string {
  return status === 'notice' ? '点数にしない' : `${score} 点`;
}
