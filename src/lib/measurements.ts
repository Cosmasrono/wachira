export type MeasurementUnit = "cm" | "in";

export const MEASUREMENT_GUIDES: Record<string, string> = {
  Bust: "Wrap the tape around the fullest part of your bust, keeping it level across your back.",
  Chest: "Measure around the fullest part of your chest, under your arms, with your arms relaxed.",
  Waist: "Measure around your natural waist, usually the narrowest point above your belly button.",
  Hips: "Stand with your feet together and measure around the fullest part of your hips and seat.",
  "Shoulder width": "Ask someone to measure across your back from one shoulder tip to the other.",
  "Sleeve length": "With your elbow slightly bent, measure from your shoulder tip to your wrist.",
  "Jacket length": "Measure from the base of your neck at the back to where you want the jacket to end.",
  "Shirt length": "Measure from the base of your neck at the back to your preferred shirt hem.",
  "Top length": "Measure from the top of your shoulder, near your neck, to your preferred hem.",
  "Dress length": "Measure from the top of your shoulder, over the bust, to your preferred dress hem.",
  "Skirt length": "Measure from your natural waist down to your preferred skirt hem.",
  Inseam: "Measure down the inside leg from the crotch to your preferred trouser hem. A well-fitting pair of trousers can help.",
  "Trouser length": "Measure down the outside leg from where your waistband will sit to your preferred hem.",
  Height: "Stand barefoot against a wall and measure from the floor to the top of your head.",
};

export function measurementInCm(value: string, unit: MeasurementUnit): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const cm = Number(value.trim().replace(",", ".")) * (unit === "in" ? 2.54 : 1);
  const rounded = Math.round(cm * 100) / 100;
  return Number.isFinite(cm) && cm > 0 && cm <= 300 && rounded > 0 ? rounded : null;
}
