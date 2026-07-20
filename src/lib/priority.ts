export const PRIORITY_RULES_VERSION = "SMARTCITAS_PRIORITY_V2";

export const PRIORITY_WEIGHTS = {
  olderAdultAge: 65,
  matureAdultAge: 50,
  olderAdultPoints: 25,
  matureAdultPoints: 12,
  chronicConditionPoints: 25,
  vulnerabilityPoints: 15,
  waitingDayPoints: 2,
  maxWaitingPoints: 40,
  highThreshold: 70,
  mediumThreshold: 35,
} as const;

export type PriorityLevel = "Alta" | "Media" | "Baja";

export type PriorityInput = {
  birthDate?: string | null;
  chronicCondition?: boolean | null;
  vulnerabilityCondition?: boolean | null;
  waitingSince?: string | null;
};

export type PriorityScore = {
  age: number;
  waitingDays: number;
  agePoints: number;
  chronicConditionPoints: number;
  vulnerabilityPoints: number;
  waitingDaysPoints: number;
  totalScore: number;
  priorityLevel: PriorityLevel;
  explanation: string[];
};

export function calculateAge(birthDate?: string | null) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

export function calculateWaitingDays(waitingSince?: string | null) {
  if (!waitingSince) return 0;
  const start = new Date(waitingSince);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));
}

export function getPriorityLevel(points: number): PriorityLevel {
  if (points >= PRIORITY_WEIGHTS.highThreshold) return "Alta";
  if (points >= PRIORITY_WEIGHTS.mediumThreshold) return "Media";
  return "Baja";
}

export function calculatePriorityScore(input: PriorityInput): PriorityScore {
  const age = calculateAge(input.birthDate);
  const waitingDays = calculateWaitingDays(input.waitingSince);
  const agePoints =
    age >= PRIORITY_WEIGHTS.olderAdultAge
      ? PRIORITY_WEIGHTS.olderAdultPoints
      : age >= PRIORITY_WEIGHTS.matureAdultAge
        ? PRIORITY_WEIGHTS.matureAdultPoints
        : 0;
  const chronicConditionPoints = input.chronicCondition
    ? PRIORITY_WEIGHTS.chronicConditionPoints
    : 0;
  const vulnerabilityPoints = input.vulnerabilityCondition
    ? PRIORITY_WEIGHTS.vulnerabilityPoints
    : 0;
  const waitingDaysPoints = Math.min(
    waitingDays * PRIORITY_WEIGHTS.waitingDayPoints,
    PRIORITY_WEIGHTS.maxWaitingPoints,
  );
  const totalScore = agePoints + chronicConditionPoints + vulnerabilityPoints + waitingDaysPoints;

  return {
    age,
    waitingDays,
    agePoints,
    chronicConditionPoints,
    vulnerabilityPoints,
    waitingDaysPoints,
    totalScore,
    priorityLevel: getPriorityLevel(totalScore),
    explanation: [
      `Edad: ${agePoints} puntos`,
      `Condicion cronica: ${chronicConditionPoints} puntos`,
      `Condicion de vulnerabilidad: ${vulnerabilityPoints} puntos`,
      `Tiempo de espera: ${waitingDaysPoints} puntos`,
    ],
  };
}
