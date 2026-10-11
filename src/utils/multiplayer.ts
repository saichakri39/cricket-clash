/** True only when a submitted pick belongs to the currently active delivery. */
export function isCurrentDelivery(submittedBallNumber: number, legalBalls: number): boolean {
  return Number.isInteger(submittedBallNumber) && submittedBallNumber >= 0 && submittedBallNumber === legalBalls;
}
