export interface PredefinedCategory {
  nombre: string;
  emojis: string[];
}

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  { nombre: 'Comida', emojis: ['🍔', '🍲'] },
  { nombre: 'Transporte', emojis: ['🚗', '🚌'] },
  { nombre: 'Entretenimiento', emojis: ['🎬', '🎮'] },
  { nombre: 'Ocio', emojis: ['🎉', '🍻', '✈️'] },
  { nombre: 'Sueldo', emojis: ['💰', '💼', '💵'] },
  { nombre: 'Salud', emojis: ['🏥', '💊', '🩺'] },
  { nombre: 'Servicios', emojis: ['💡', '🔌', '💧'] },
  { nombre: 'Educación', emojis: ['📚', '🎓', '✏️'] },
  { nombre: 'Otros', emojis: ['💸', '🏷️', '📦'] }
];
